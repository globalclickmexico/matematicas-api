/**
 * ============================================================
 * CursoMATE — Importación masiva de usuarios desde Excel
 * ============================================================
 * Optimizaciones para 500+ usuarios:
 *   ✓ Bulk INSERT  → 3 queries por lote (antes: 3 × N queries)
 *   ✓ Pre-detección de duplicados → cero rollbacks innecesarios
 *   ✓ Lotes en paralelo → configurable con --concurrencia=<n>
 *   ✓ bcrypt en chunks → rounds=8, no satura el event loop
 *
 * Uso:
 *   npm run importar -- --archivo=./usuarios.xlsx
 *   npm run importar -- --archivo=./usuarios.xlsx --dryrun
 *   npm run importar -- --archivo=./usuarios.xlsx --batch=100 --concurrencia=5
 *
 * Opciones:
 *   --archivo=<ruta>       Ruta al archivo Excel (requerido)
 *   --dryrun               Solo valida, no inserta en BD
 *   --batch=<n>            Tamaño de lote      (default: 100)
 *   --concurrencia=<n>     Lotes en paralelo   (default: 5)
 *   --rol=<id>             idRol por defecto   (default: 1)
 *   --ruta=<id>            idRuta por defecto  (default: 1)
 * ============================================================
 */

import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

/* ── Configuración ──────────────────────────────────────── */
/**
 * 8 rounds ≈ 3× más rápido que 10 rounds.
 * Para una contraseña inicial (que el alumno debe cambiar) es más
 * que suficiente; si el alumno cambia su contraseña la app puede
 * re-hashear con más rounds en ese momento.
 */
const BCRYPT_ROUNDS    = 8;
const BATCH_DEFAULT    = 100;
const CONCURR_DEFAULT  = 5;
const HASH_CHUNK_SIZE  = 50; // contraseñas hasheadas en paralelo por chunk

/* ── Tipos ──────────────────────────────────────────────── */
interface FilaExcel {
  nombreCompleto:   string;
  apellidos:        string;
  correo:           string;
  curp?:            string;
  matricula:        string;
  numeroTelefono?:  string | number;
  plantel?:         string;
  fechaExpiracion?: string;
  idRol?:           number;
  idRuta?:          number;
  esConvenio?:      number;
}

interface UsuarioValidado extends FilaExcel {
  fila:              number;
  nombreUsuario:     string;
  contraseniaHash:   string;
  fechaRegistroTs:   number;
  fechaExpiracionTs: number;
}

interface ResultadoImportacion {
  fila:           number;
  matricula:      string;
  nombreCompleto: string;
  nombreUsuario:  string;
  estado:         'ok' | 'error' | 'duplicado';
  mensaje?:       string;
}

/* ── Parsear args de CLI ─────────────────────────────────── */
function getArg(name: string): string | undefined {
  const found = process.argv.find(a => a.startsWith(`--${name}=`));
  return found?.split('=').slice(1).join('=');
}
function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

/* ── Parsear fecha DD/MM/YYYY → Unix timestamp ───────────── */
function parseFecha(str?: string): number | null {
  if (!str || String(str).trim() === '') return null;
  const s = String(str).trim();

  const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    const date = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T00:00:00Z`);
    return isNaN(date.getTime()) ? null : Math.floor(date.getTime() / 1000);
  }

  // Número de serie de Excel (días desde 1900-01-01)
  const serial = Number(s);
  if (!isNaN(serial) && serial > 40000) {
    const date = new Date((serial - 25569) * 86400 * 1000);
    return Math.floor(date.getTime() / 1000);
  }

  return null;
}

function generarUsername(matricula: string): string {
  return matricula.toLowerCase().trim().replace(/\s+/g, '_');
}

function detectarCampoDuplicado(mensaje?: string): string {
  if (!mensaje) return 'campo único';
  if (mensaje.includes('uq_correo'))         return 'correo';
  if (mensaje.includes('uq_matricula'))      return 'matricula';
  if (mensaje.includes('uq_nombre_usuario')) return 'nombreUsuario';
  return 'campo único';
}

/* ── Validar una fila ────────────────────────────────────── */
function validarFila(
  raw: Record<string, unknown>,
  fila: number,
  defaultRol: number,
  defaultRuta: number
): { ok: true; dato: FilaExcel } | { ok: false; error: string } {
  const get = (k: string) => String(raw[k] ?? '').trim();

  const nombreCompleto = get('nombreCompleto');
  const apellidos      = get('apellidos');
  const correo         = get('correo').toLowerCase();
  const matricula      = get('matricula');

  if (!nombreCompleto) return { ok: false, error: 'nombreCompleto es requerido' };
  if (!apellidos)      return { ok: false, error: 'apellidos es requerido' };
  if (!correo)         return { ok: false, error: 'correo es requerido' };
  if (!matricula)      return { ok: false, error: 'matricula es requerida' };

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return { ok: false, error: `correo inválido: ${correo}` };
  }

  const curp = get('curp') || undefined;
  if (curp && curp.length !== 18) {
    return { ok: false, error: `CURP debe tener 18 caracteres (tiene ${curp.length})` };
  }

  return {
    ok: true,
    dato: {
      nombreCompleto,
      apellidos,
      correo,
      curp,
      matricula,
      numeroTelefono:  get('numeroTelefono') || undefined,
      plantel:         get('plantel')        || undefined,
      fechaExpiracion: get('fechaExpiracion') || undefined,
      idRol:      Number(raw['idRol'])      || defaultRol,
      idRuta:     Number(raw['idRuta'])     || defaultRuta,
      esConvenio: Number(raw['esConvenio']) || 0,
    },
  };
}

/* ── Fase 2: Hashear en chunks para no saturar el event loop ─
 *
 *  Promise.all de 500 bcrypt simultáneos bloquea la CPU durante
 *  varios segundos. Procesarlos en chunks de HASH_CHUNK_SIZE
 *  mantiene el event loop vivo y muestra progreso real.
 * ────────────────────────────────────────────────────────── */
async function hashearEnChunks(
  usuarios: UsuarioValidado[]
): Promise<void> {
  const total = usuarios.length;
  let done    = 0;

  for (let i = 0; i < total; i += HASH_CHUNK_SIZE) {
    const chunk = usuarios.slice(i, i + HASH_CHUNK_SIZE);
    const hashes = await Promise.all(
      chunk.map(u => bcrypt.hash(u.matricula, BCRYPT_ROUNDS))
    );
    chunk.forEach((u, j) => { u.contraseniaHash = hashes[j]; });
    done += chunk.length;
    process.stdout.write(`\r    ${done}/${total} contraseñas hasheadas...`);
  }
  process.stdout.write('\n');
}

/* ── Pre-detección de duplicados en la BD ────────────────────
 *
 *  Una sola query antes de insertar evita rollbacks en cascada.
 *  Retorna el Set de matrículas que ya existen.
 * ────────────────────────────────────────────────────────── */
async function detectarDuplicadosEnBD(
  pool: mysql.Pool,
  usuarios: UsuarioValidado[]
): Promise<Set<string>> {
  if (usuarios.length === 0) return new Set();

  const matriculas = usuarios.map(u => u.matricula);
  const correos    = usuarios.map(u => u.correo);

  const conn = await pool.getConnection();
  try {
    const [rows] = await conn.query<any[]>(
      `SELECT matricula
         FROM perfiles
        WHERE matricula IN (?)
           OR correo IN (?)`,
      [matriculas, correos]
    );
    return new Set((rows as any[]).map(r => r.matricula));
  } finally {
    conn.release();
  }
}

/* ── Bulk INSERT de un lote limpio (sin duplicados conocidos) ─
 *
 *  Antes: 3 queries × N usuarios = 3N round-trips por lote.
 *  Ahora: 5 queries fijas por lote (INSERT + SELECT × 2 + INSERT × 2).
 *
 *  Flujo:
 *    1. INSERT INTO perfiles ... VALUES (…),(…),…
 *    2. SELECT idPerfil WHERE matricula IN (…)   ← IDs reales
 *    3. INSERT INTO usuarios ... VALUES (…),(…),…
 *    4. SELECT idUsuario WHERE idPerfil  IN (…)  ← IDs reales
 *    5. INSERT INTO credenciales ... VALUES (…),(…),…
 * ────────────────────────────────────────────────────────── */
async function insertarLoteBulk(
  pool: mysql.Pool,
  usuarios: UsuarioValidado[],
  resultados: ResultadoImportacion[]
): Promise<void> {
  if (usuarios.length === 0) return;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    /* 1. Perfiles ──────────────────────────────────────────── */
    await conn.query(
      `INSERT INTO perfiles
         (nombreCompleto, apellidos, correo, curp, matricula,
          numeroTelefono, fechaRegistro, fechaExpiracion, plantel)
       VALUES ?`,
      [
        usuarios.map(u => [
          u.nombreCompleto,
          u.apellidos,
          u.correo,
          u.curp ?? null,
          u.matricula,
          u.numeroTelefono ? Number(u.numeroTelefono) : null,
          u.fechaRegistroTs,
          u.fechaExpiracionTs,
          u.plantel ?? null,
        ]),
      ]
    );

    /* 2. Recuperar idPerfil ────────────────────────────────── */
    const [perfilRows] = await conn.query<any[]>(
      `SELECT idPerfil, matricula
         FROM perfiles
        WHERE matricula IN (?)`,
      [usuarios.map(u => u.matricula)]
    );
    const perfilMap = new Map<string, number>(
      (perfilRows as any[]).map(r => [r.matricula as string, r.idPerfil as number])
    );

    /* 3. Usuarios ──────────────────────────────────────────── */
    await conn.query(
      `INSERT INTO usuarios (idPerfil, idRol, idRuta, estatus, esConvenio)
       VALUES ?`,
      [
        usuarios.map(u => [
          perfilMap.get(u.matricula),
          u.idRol,
          u.idRuta,
          1,
          u.esConvenio,
        ]),
      ]
    );

    /* 4. Recuperar idUsuario ───────────────────────────────── */
    const idPerfiles = [...perfilMap.values()];
    const [usuarioRows] = await conn.query<any[]>(
      `SELECT idUsuario, idPerfil
         FROM usuarios
        WHERE idPerfil IN (?)`,
      [idPerfiles]
    );
    const usuarioMap = new Map<number, number>(
      (usuarioRows as any[]).map(r => [r.idPerfil as number, r.idUsuario as number])
    );

    /* 5. Credenciales ──────────────────────────────────────── */
    await conn.query(
      `INSERT INTO credenciales
         (idUsuario, estatusCredencial, nombreUsuario, contrasenia)
       VALUES ?`,
      [
        usuarios.map(u => {
          const idPerfil  = perfilMap.get(u.matricula)!;
          const idUsuario = usuarioMap.get(idPerfil)!;
          return [idUsuario, 1, u.nombreUsuario, u.contraseniaHash];
        }),
      ]
    );

    await conn.commit();

    for (const u of usuarios) {
      resultados.push({
        fila:           u.fila,
        matricula:      u.matricula,
        nombreCompleto: `${u.nombreCompleto} ${u.apellidos}`,
        nombreUsuario:  u.nombreUsuario,
        estado: 'ok',
      });
    }

  } catch (err: any) {
    await conn.rollback();
    // Duplicado inesperado (race condition entre workers): reintentar fila a fila
    await insertarFilaAFila(pool, usuarios, resultados);
  } finally {
    conn.release();
  }
}

/* ── Fallback fila a fila (solo si bulk falla) ───────────── */
async function insertarFilaAFila(
  pool: mysql.Pool,
  usuarios: UsuarioValidado[],
  resultados: ResultadoImportacion[]
): Promise<void> {
  for (const u of usuarios) {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();

      const [perfRes] = await conn.query<any>(
        `INSERT INTO perfiles
           (nombreCompleto, apellidos, correo, curp, matricula,
            numeroTelefono, fechaRegistro, fechaExpiracion, plantel)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          u.nombreCompleto, u.apellidos, u.correo,
          u.curp ?? null, u.matricula,
          u.numeroTelefono ? Number(u.numeroTelefono) : null,
          u.fechaRegistroTs, u.fechaExpiracionTs, u.plantel ?? null,
        ]
      );

      const [userRes] = await conn.query<any>(
        `INSERT INTO usuarios (idPerfil, idRol, idRuta, estatus, esConvenio)
         VALUES (?, ?, ?, 1, ?)`,
        [perfRes.insertId, u.idRol, u.idRuta, u.esConvenio]
      );

      await conn.query(
        `INSERT INTO credenciales
           (idUsuario, estatusCredencial, nombreUsuario, contrasenia)
         VALUES (?, 1, ?, ?)`,
        [userRes.insertId, u.nombreUsuario, u.contraseniaHash]
      );

      await conn.commit();

      resultados.push({
        fila:           u.fila,
        matricula:      u.matricula,
        nombreCompleto: `${u.nombreCompleto} ${u.apellidos}`,
        nombreUsuario:  u.nombreUsuario,
        estado: 'ok',
      });

    } catch (err: any) {
      await conn.rollback();
      const isDup = err.code === 'ER_DUP_ENTRY';
      const campo = detectarCampoDuplicado(err.message);

      resultados.push({
        fila:           u.fila,
        matricula:      u.matricula,
        nombreCompleto: `${u.nombreCompleto} ${u.apellidos}`,
        nombreUsuario:  u.nombreUsuario,
        estado:  isDup ? 'duplicado' : 'error',
        mensaje: isDup ? `Duplicado en ${campo}` : err.message,
      });

    } finally {
      conn.release();
    }
  }
}

/* ── Fase 3: Insertar en BD en paralelo ──────────────────────
 *
 *  Patrón "worker pool" en JavaScript:
 *    - `i` es el índice del próximo lote a tomar (compartido entre workers)
 *    - Cada worker toma un lote, lo inserta, y toma el siguiente
 *    - i++ es seguro porque JS es single-threaded en el punto de la asignación
 *    - El while termina cuando no quedan lotes
 *
 *  Esto procesa hasta `concurrencia` lotes simultáneamente sin
 *  necesitar ninguna librería externa (sin p-limit, sin piscina, etc.)
 * ────────────────────────────────────────────────────────── */
async function procesarEnParalelo(
  pool: mysql.Pool,
  lotes: UsuarioValidado[][],
  resultados: ResultadoImportacion[],
  concurrencia: number
): Promise<void> {
  const totalLotes = lotes.length;
  let   idx        = 0;        // próximo lote a procesar
  let   insertados = 0;        // usuarios OK acumulados
  const totalNuevos = lotes.reduce((s, l) => s + l.length, 0);

  async function worker() {
    while (idx < totalLotes) {
      const miIdx = idx++;                 // tomar el siguiente lote
      const lote  = lotes[miIdx];
      const num   = miIdx + 1;

      process.stdout.write(`  [${num}/${totalLotes}] ${lote.length} usuarios...`);

      const antes = resultados.length;
      await insertarLoteBulk(pool, lote, resultados);
      const okEsteLote = resultados.slice(antes).filter(r => r.estado === 'ok').length;

      insertados += okEsteLote;
      process.stdout.write(` ✓  (${insertados}/${totalNuevos} insertados)\n`);
    }
  }

  // Arrancar `concurrencia` workers en paralelo
  const numWorkers = Math.min(concurrencia, totalLotes);
  await Promise.all(Array.from({ length: numWorkers }, worker));
}

/* ── Guardar reporte CSV ─────────────────────────────────── */
function guardarReporte(
  resultados: ResultadoImportacion[],
  archivoOrigen: string
): string {
  const ts     = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const nombre = `reporte-importacion-${ts}.csv`;
  const ruta   = path.join(process.cwd(), nombre);

  const header = 'Fila,Matricula,NombreCompleto,NombreUsuario,Estado,Mensaje\n';
  const filas  = resultados.map(r =>
    [
      r.fila,
      r.matricula,
      `"${r.nombreCompleto}"`,
      r.nombreUsuario,
      r.estado,
      r.mensaje ?? '',
    ].join(',')
  ).join('\n');

  fs.writeFileSync(ruta, header + filas, 'utf8');
  return ruta;
}

/* ── Mostrar resumen final ───────────────────────────────── */
function mostrarResumen(
  resultados: ResultadoImportacion[],
  reportePath: string
) {
  const ok    = resultados.filter(r => r.estado === 'ok').length;
  const dups  = resultados.filter(r => r.estado === 'duplicado').length;
  const errs  = resultados.filter(r => r.estado === 'error').length;
  const total = resultados.length;

  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║               RESUMEN FINAL               ║');
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Total procesados : ${String(total).padEnd(20)}║`);
  console.log(`║  ✓ Importados OK  : ${String(ok).padEnd(20)}║`);
  console.log(`║  ⚠ Duplicados     : ${String(dups).padEnd(20)}║`);
  console.log(`║  ✗ Errores        : ${String(errs).padEnd(20)}║`);
  console.log('╠══════════════════════════════════════════╣');
  console.log(`║  Reporte guardado en:                    ║`);
  console.log(`║  ${path.basename(reportePath).padEnd(40)}║`);
  console.log('╚══════════════════════════════════════════╝\n');

  if (dups > 0) {
    console.log('⚠  Duplicados (ya existían en BD):');
    resultados
      .filter(r => r.estado === 'duplicado')
      .forEach(r => console.log(`   Fila ${r.fila}: ${r.nombreCompleto} — ${r.mensaje}`));
  }

  if (errs > 0) {
    console.log('\n✗  Errores:');
    resultados
      .filter(r => r.estado === 'error')
      .forEach(r => console.log(`   Fila ${r.fila}: ${r.mensaje}`));
  }

  console.log('\n💡  Contraseña inicial de cada usuario = su matrícula');
  console.log('   El alumno deberá cambiarla en su primer acceso.\n');
}

/* ── MAIN ────────────────────────────────────────────────── */
async function main() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  CursoMATE — Importación masiva usuarios ║');
  console.log('╚══════════════════════════════════════════╝\n');

  /* Args */
  const archivoArg   = getArg('archivo');
  const dryRun       = hasFlag('dryrun');
  const batchSize    = Number(getArg('batch'))        || BATCH_DEFAULT;
  const concurrencia = Number(getArg('concurrencia')) || CONCURR_DEFAULT;
  const defaultRol   = Number(getArg('rol'))          || 1;
  const defaultRuta  = Number(getArg('ruta'))         || 1;

  if (!archivoArg) {
    console.error('❌  Debes indicar el archivo: --archivo=./usuarios.xlsx\n');
    process.exit(1);
  }

  const archivoPath = path.resolve(archivoArg);
  if (!fs.existsSync(archivoPath)) {
    console.error(`❌  No se encontró el archivo: ${archivoPath}\n`);
    process.exit(1);
  }

  console.log(`   Lote:         ${batchSize} usuarios`);
  console.log(`   Concurrencia: ${concurrencia} lotes simultáneos`);
  console.log(`   bcrypt:       ${BCRYPT_ROUNDS} rounds`);
  if (dryRun) console.log('\n⚠️  MODO DRY-RUN: No se insertará nada en la BD');
  console.log('');

  /* ── Leer Excel ─────────────────────────────────────────── */
  console.log(`📂  Leyendo: ${archivoPath}`);
  const wb      = XLSX.readFile(archivoPath);
  const ws      = wb.Sheets[wb.SheetNames[0]];
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: '',
    raw:    false,
  });

  console.log(`    Filas encontradas: ${rawData.length}\n`);

  if (rawData.length === 0) {
    console.error('❌  El archivo está vacío o no tiene el formato correcto\n');
    process.exit(1);
  }

  /* ── Fase 1: Validar filas ───────────────────────────────── */
  console.log('🔍  Validando filas...');
  const validos:   UsuarioValidado[]      = [];
  const invalidos: ResultadoImportacion[] = [];
  const ahora  = Math.floor(Date.now() / 1000);
  const unAnio = ahora + 365 * 24 * 3600;

  for (let i = 0; i < rawData.length; i++) {
    const fila      = i + 2;
    const resultado = validarFila(rawData[i], fila, defaultRol, defaultRuta);

    if (!resultado.ok) {
      invalidos.push({
        fila,
        matricula:      String(rawData[i]['matricula']      ?? ''),
        nombreCompleto: String(rawData[i]['nombreCompleto'] ?? ''),
        nombreUsuario:  '',
        estado:  'error',
        mensaje: resultado.error,
      });
      continue;
    }

    const dato  = resultado.dato;
    const expTs = parseFecha(dato.fechaExpiracion);

    validos.push({
      ...dato,
      fila,
      nombreUsuario:     generarUsername(dato.matricula),
      contraseniaHash:   '',
      fechaRegistroTs:   ahora,
      fechaExpiracionTs: expTs ?? unAnio,
    });
  }

  console.log(`    ✓ Válidos:   ${validos.length}`);
  console.log(`    ✗ Inválidos: ${invalidos.length}`);

  if (invalidos.length > 0) {
    console.log('\n  Filas con errores de validación:');
    invalidos.forEach(r => console.log(`    Fila ${r.fila}: ${r.mensaje}`));
  }

  if (validos.length === 0) {
    console.log('\n❌  No hay filas válidas para importar.\n');
    process.exit(1);
  }

  /* ── Fase 2: Hashear contraseñas ─────────────────────────── */
  console.log(`\n🔐  Hasheando ${validos.length} contraseñas (bcrypt ${BCRYPT_ROUNDS} rounds)...`);
  await hashearEnChunks(validos);
  console.log('    ✓ Contraseñas listas');

  /* ── Dry-run: terminar aquí ──────────────────────────────── */
  if (dryRun) {
    const resultados: ResultadoImportacion[] = [...invalidos];
    validos.forEach(u =>
      resultados.push({
        fila:           u.fila,
        matricula:      u.matricula,
        nombreCompleto: `${u.nombreCompleto} ${u.apellidos}`,
        nombreUsuario:  u.nombreUsuario,
        estado:  'ok',
        mensaje: '[DRYRUN]',
      })
    );
    const reporte = guardarReporte(resultados, archivoPath);
    console.log('\n✅  Validación completada (dry-run)');
    mostrarResumen(resultados, reporte);
    return;
  }

  /* ── Conectar al pool ────────────────────────────────────── */
  // connectionLimit = concurrencia + 2 para los SELECTs de deduplicación
  const pool = mysql.createPool({
    host:     process.env.DB_HOST     || '75.102.23.17',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'clickplus_regularizacion',
    password: process.env.DB_PASSWORD || 'Gl0b4lClick@2026',
    database: process.env.DB_NAME     || 'clickplus_matematicas_qa',
    waitForConnections: true,
    connectionLimit: concurrencia + 2,
    queueLimit: 0,
  });

  try {
    /* ── Fase 3a: Detectar duplicados (1 sola query) ─────────── */
    console.log('\n🔎  Verificando duplicados en BD...');
    const duplicadosSet = await detectarDuplicadosEnBD(pool, validos);

    const nuevos:     UsuarioValidado[]      = [];
    const duplicados: ResultadoImportacion[] = [];

    for (const u of validos) {
      if (duplicadosSet.has(u.matricula)) {
        duplicados.push({
          fila:           u.fila,
          matricula:      u.matricula,
          nombreCompleto: `${u.nombreCompleto} ${u.apellidos}`,
          nombreUsuario:  u.nombreUsuario,
          estado:  'duplicado',
          mensaje: 'Ya existe en BD (matrícula o correo)',
        });
      } else {
        nuevos.push(u);
      }
    }

    console.log(`    ✓ Nuevos a insertar : ${nuevos.length}`);
    console.log(`    ⚠ Ya en BD          : ${duplicados.length}`);

    if (nuevos.length === 0) {
      console.log('\n⚠️  Todos los usuarios ya existen en la BD.\n');
      const resultados = [...invalidos, ...duplicados];
      const reporte = guardarReporte(resultados, archivoPath);
      mostrarResumen(resultados, reporte);
      return;
    }

    /* ── Fase 3b: Dividir en lotes e insertar en paralelo ─────── */
    const lotes: UsuarioValidado[][] = [];
    for (let i = 0; i < nuevos.length; i += batchSize) {
      lotes.push(nuevos.slice(i, i + batchSize));
    }

    console.log(
      `\n📦  Insertando ${nuevos.length} usuarios — ` +
      `${lotes.length} lote(s) × ${batchSize} — ` +
      `${concurrencia} en paralelo`
    );

    const resultados: ResultadoImportacion[] = [...invalidos, ...duplicados];
    await procesarEnParalelo(pool, lotes, resultados, concurrencia);

    /* ── Fase 4: Reporte ─────────────────────────────────────── */
    const reporte = guardarReporte(resultados, archivoPath);
    mostrarResumen(resultados, reporte);

  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('\n❌  Error fatal:', err.message ?? err);
  process.exit(1);
});
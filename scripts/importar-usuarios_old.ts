/**
 * ============================================================
 * CursoMATE — Importación masiva de usuarios desde Excel
 * ============================================================
 * Uso:
 *   npm run importar -- --archivo=./usuarios.xlsx
 *   npm run importar -- --archivo=./usuarios.xlsx --dryrun
 *   npm run importar -- --archivo=./usuarios.xlsx --batch=100
 *
 * Opciones:
 *   --archivo=<ruta>   Ruta al archivo Excel (requerido)
 *   --dryrun           Solo valida, no inserta en BD
 *   --batch=<n>        Tamaño de lote (default: 50)
 *   --rol=<id>         idRol por defecto (default: 1 = alumno)
 *   --ruta=<id>        idRuta por defecto (default: 1)
 * ============================================================
 */

import * as XLSX from 'xlsx';
import bcrypt from 'bcryptjs';
import * as fs from 'fs';
import * as path from 'path';
import mysql, { PoolConnection } from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

/* ── Configuración ──────────────────────────────────────── */
const BCRYPT_ROUNDS = 10;
const BATCH_DEFAULT = 50;

/* ── Tipos ──────────────────────────────────────────────── */
interface FilaExcel {
  nombreCompleto:  string;
  apellidos:       string;
  correo:          string;
  curp?:           string;
  matricula:       string;
  numeroTelefono?: string | number;
  plantel?:        string;
  fechaExpiracion?:string;
  idRol?:          number;
  idRuta?:         number;
  esConvenio?:     number;
}

interface UsuarioValidado extends FilaExcel {
  fila: number;
  nombreUsuario: string;
  contraseniaHash: string;
  fechaRegistroTs: number;
  fechaExpiracionTs: number;
}

interface ResultadoImportacion {
  fila: number;
  matricula: string;
  nombreCompleto: string;
  nombreUsuario: string;
  estado: 'ok' | 'error' | 'duplicado';
  mensaje?: string;
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

  // Formato DD/MM/YYYY
  const match = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    const date = new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T00:00:00Z`);
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

/* ── Generar nombreUsuario desde matrícula ───────────────── */
function generarUsername(matricula: string): string {
  return matricula.toLowerCase().trim().replace(/\s+/g, '_');
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

  // Validar formato de correo básico
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
    return { ok: false, error: `correo inválido: ${correo}` };
  }

  // Validar CURP si viene
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
      numeroTelefono: get('numeroTelefono') || undefined,
      plantel:        get('plantel') || undefined,
      fechaExpiracion: get('fechaExpiracion') || undefined,
      idRol:  Number(raw['idRol'])  || defaultRol,
      idRuta: Number(raw['idRuta']) || defaultRuta,
      esConvenio: Number(raw['esConvenio']) || 0,
    },
  };
}

/* ── Insertar un lote en una transacción ─────────────────── */
async function insertarLote(
  conn: PoolConnection,
  usuarios: UsuarioValidado[],
  resultados: ResultadoImportacion[],
  dryRun: boolean
) {
  if (dryRun) {
    // En dryrun solo simulamos éxito
    for (const u of usuarios) {
      resultados.push({
        fila:           u.fila,
        matricula:      u.matricula,
        nombreCompleto: `${u.nombreCompleto} ${u.apellidos}`,
        nombreUsuario:  u.nombreUsuario,
        estado: 'ok',
        mensaje: '[DRYRUN] No se insertó en BD',
      });
    }
    return;
  }

  await conn.beginTransaction();

  try {
    for (const u of usuarios) {
      /* 1. Insertar perfil */
      const [perfRes] = await conn.query<any>(
        `INSERT INTO perfiles
           (nombreCompleto, apellidos, correo, curp, matricula,
            numeroTelefono, fechaRegistro, fechaExpiracion, plantel)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          u.nombreCompleto,
          u.apellidos,
          u.correo,
          u.curp ?? null,
          u.matricula,
          u.numeroTelefono ? Number(u.numeroTelefono) : null,
          u.fechaRegistroTs,
          u.fechaExpiracionTs,
          u.plantel ?? null,
        ]
      );
      const idPerfil = perfRes.insertId;

      /* 2. Insertar usuario */
      const [userRes] = await conn.query<any>(
        `INSERT INTO usuarios (idPerfil, idRol, idRuta, estatus, esConvenio)
         VALUES (?, ?, ?, 1, ?)`,
        [idPerfil, u.idRol, u.idRuta, u.esConvenio]
      );
      const idUsuario = userRes.insertId;

      /* 3. Insertar credencial */
      await conn.query(
        `INSERT INTO credenciales
           (idUsuario, estatusCredencial, nombreUsuario, contrasenia)
         VALUES (?, 1, ?, ?)`,
        [idUsuario, u.nombreUsuario, u.contraseniaHash]
      );

      resultados.push({
        fila:           u.fila,
        matricula:      u.matricula,
        nombreCompleto: `${u.nombreCompleto} ${u.apellidos}`,
        nombreUsuario:  u.nombreUsuario,
        estado: 'ok',
      });
    }

    await conn.commit();
  } catch (err: any) {
    await conn.rollback();

    // Detectar duplicados específicos
    const isDup = err.code === 'ER_DUP_ENTRY';
    const campo = err.message?.includes('uq_correo') ? 'correo'
      : err.message?.includes('uq_matricula') ? 'matricula'
      : err.message?.includes('uq_nombre_usuario') ? 'nombreUsuario'
      : 'campo único';

    // Marcar todo el lote como error (se reintentará fila a fila)
    throw { isDup, campo, original: err };
  }
}

/* ── Insertar un lote fila por fila (fallback) ───────────── */
async function insertarFilaAFila(
  conn: PoolConnection,
  usuarios: UsuarioValidado[],
  resultados: ResultadoImportacion[]
) {
  for (const u of usuarios) {
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
        fila: u.fila, matricula: u.matricula,
        nombreCompleto: `${u.nombreCompleto} ${u.apellidos}`,
        nombreUsuario: u.nombreUsuario, estado: 'ok',
      });
    } catch (err: any) {
      await conn.rollback();
      const isDup = err.code === 'ER_DUP_ENTRY';
      const campo = err.message?.includes('uq_correo') ? 'correo'
        : err.message?.includes('uq_matricula') ? 'matricula'
        : err.message?.includes('uq_nombre_usuario') ? 'nombreUsuario'
        : 'campo desconocido';

      resultados.push({
        fila: u.fila, matricula: u.matricula,
        nombreCompleto: `${u.nombreCompleto} ${u.apellidos}`,
        nombreUsuario: u.nombreUsuario,
        estado: isDup ? 'duplicado' : 'error',
        mensaje: isDup ? `Duplicado en ${campo}` : err.message,
      });
    }
  }
}

/* ── Guardar reporte CSV ─────────────────────────────────── */
function guardarReporte(resultados: ResultadoImportacion[], archivoOrigen: string) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const nombre = `reporte-importacion-${ts}.csv`;
  const ruta = path.join(process.cwd(), nombre);

  const header = 'Fila,Matricula,NombreCompleto,NombreUsuario,Estado,Mensaje\n';
  const filas = resultados.map(r =>
    [r.fila, r.matricula, `"${r.nombreCompleto}"`, r.nombreUsuario, r.estado, r.mensaje ?? ''].join(',')
  ).join('\n');

  fs.writeFileSync(ruta, header + filas, 'utf8');
  return ruta;
}

/* ── MAIN ────────────────────────────────────────────────── */
async function main() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  CursoMATE — Importación masiva usuarios ║');
  console.log('╚══════════════════════════════════════════╝\n');

  /* Args */
  const archivoArg = getArg('archivo');
  const dryRun     = hasFlag('dryrun');
  const batchSize  = Number(getArg('batch')) || BATCH_DEFAULT;
  const defaultRol  = Number(getArg('rol'))  || 1;
  const defaultRuta = Number(getArg('ruta')) || 1;

  if (!archivoArg) {
    console.error('❌  Debes indicar el archivo: --archivo=./usuarios.xlsx\n');
    process.exit(1);
  }

  const archivoPath = path.resolve(archivoArg);
  if (!fs.existsSync(archivoPath)) {
    console.error(`❌  No se encontró el archivo: ${archivoPath}\n`);
    process.exit(1);
  }

  if (dryRun) console.log('⚠️  MODO DRY-RUN: No se insertará nada en la BD\n');

  /* Leer Excel */
  console.log(`📂  Leyendo: ${archivoPath}`);
  const wb    = XLSX.readFile(archivoPath);
  const ws    = wb.Sheets[wb.SheetNames[0]]; // Primera hoja
  const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
    defval: '',
    raw: false,
  });

  console.log(`    Filas encontradas: ${rawData.length}\n`);

  if (rawData.length === 0) {
    console.error('❌  El archivo está vacío o no tiene el formato correcto\n');
    process.exit(1);
  }

  /* ── Fase 1: Validar todas las filas ─────────────────── */
  console.log('🔍  Validando filas...');
  const validos:   UsuarioValidado[]       = [];
  const invalidos: ResultadoImportacion[]  = [];
  const ahora = Math.floor(Date.now() / 1000);
  const unAnio = ahora + 365 * 24 * 3600;

  for (let i = 0; i < rawData.length; i++) {
    const fila = i + 2; // Fila 1 = headers, fila 2 = primer dato
    const resultado = validarFila(rawData[i], fila, defaultRol, defaultRuta);

    if (!resultado.ok) {
      invalidos.push({
        fila,
        matricula:      String(rawData[i]['matricula'] ?? ''),
        nombreCompleto: String(rawData[i]['nombreCompleto'] ?? ''),
        nombreUsuario:  '',
        estado: 'error',
        mensaje: resultado.error,
      });
      continue;
    }

    const dato = resultado.dato;
    const expTs = parseFecha(dato.fechaExpiracion);

    validos.push({
      ...dato,
      fila,
      nombreUsuario:    generarUsername(dato.matricula),
      contraseniaHash:  '', // se rellena abajo
      fechaRegistroTs:  ahora,
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

  /* ── Fase 2: Hashear contraseñas en paralelo ───────────
     Contraseña inicial = matrícula (el alumno debe cambiarla)  */
  console.log(`\n🔐  Hasheando ${validos.length} contraseñas (bcrypt)...`);
  const hashes = await Promise.all(
    validos.map(u => bcrypt.hash(u.matricula, BCRYPT_ROUNDS))
  );
  validos.forEach((u, i) => { u.contraseniaHash = hashes[i]; });
  console.log('    ✓ Contraseñas listas');

  if (dryRun) {
    /* Dry run: simular resultado */
    const resultados: ResultadoImportacion[] = [...invalidos];
    validos.forEach(u => {
      resultados.push({
        fila: u.fila, matricula: u.matricula,
        nombreCompleto: `${u.nombreCompleto} ${u.apellidos}`,
        nombreUsuario: u.nombreUsuario,
        estado: 'ok', mensaje: '[DRYRUN]',
      });
    });
    const reporte = guardarReporte(resultados, archivoPath);
    console.log('\n✅  Validación completada (dry-run)');
    mostrarResumen(resultados, reporte);
    return;
  }

  /* ── Fase 3: Insertar en BD por lotes ──────────────── */
  const pool = mysql.createPool({
    host:     process.env.DB_HOST     || '75.102.23.17',
    port:     Number(process.env.DB_PORT) || 3306,
    user:     process.env.DB_USER     || 'clickplus_regularizacion',
    password: process.env.DB_PASSWORD || 'Gl0b4lClick@2026',
    database: process.env.DB_NAME     || 'clickplus_regularizacion_matematicas',
    waitForConnections: true,
    connectionLimit: 5,
  });

  const resultados: ResultadoImportacion[] = [...invalidos];
  const totalLotes = Math.ceil(validos.length / batchSize);

  console.log(`\n📦  Insertando en BD — ${totalLotes} lote(s) de ${batchSize} usuarios`);

  const conn = await pool.getConnection();

  try {
    for (let i = 0; i < validos.length; i += batchSize) {
      const lote      = validos.slice(i, i + batchSize);
      const numLote   = Math.floor(i / batchSize) + 1;
      const progreso  = `[${numLote}/${totalLotes}]`;

      process.stdout.write(`  ${progreso} Insertando ${lote.length} usuarios...`);

      try {
        await insertarLote(conn, lote, resultados, dryRun);
        process.stdout.write(` ✓\n`);
      } catch (err: any) {
        /* El lote tuvo un conflicto → reintentar fila a fila */
        process.stdout.write(` ⚠ Conflicto detectado, reintentando fila a fila...\n`);
        await insertarFilaAFila(conn, lote, resultados);
        const ok  = resultados.filter(r => lote.some(u => u.fila === r.fila) && r.estado === 'ok').length;
        const err2 = lote.length - ok;
        console.log(`    ${progreso} ${ok} OK, ${err2} con errores`);
      }
    }
  } finally {
    conn.release();
    await pool.end();
  }

  /* ── Fase 4: Reporte ─────────────────────────────────── */
  const reporte = guardarReporte(resultados, archivoPath);
  mostrarResumen(resultados, reporte);
}

function mostrarResumen(resultados: ResultadoImportacion[], reportePath: string) {
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
    resultados.filter(r => r.estado === 'duplicado')
      .forEach(r => console.log(`   Fila ${r.fila}: ${r.nombreCompleto} — ${r.mensaje}`));
  }

  if (errs > 0) {
    console.log('\n✗  Errores:');
    resultados.filter(r => r.estado === 'error')
      .forEach(r => console.log(`   Fila ${r.fila}: ${r.mensaje}`));
  }

  console.log('\n💡  Contraseña inicial de cada usuario = su matrícula');
  console.log('   El alumno deberá cambiarla en su primer acceso.\n');
}

main().catch(err => {
  console.error('\n❌  Error fatal:', err.message ?? err);
  process.exit(1);
});

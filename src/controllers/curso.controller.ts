import { Request, Response } from 'express';
import pool from '../db/connection';
import { ok, notFound, serverError } from '../utils/response';
import { RowDataPacket } from 'mysql2';

/* Base URL donde están alojados los HTMLs/PDFs de las lecciones.
   Las URLs se construyen como: {BASE}/{tipo}/{codigoLeccion}       */
const CONTENIDO_BASE = 'https://globalclickmexico.com/regularizacion-matematicas/matematicas';

function buildUrls(codigoLeccion: string) {
  return {
    introUrl:      `${CONTENIDO_BASE}/${codigoLeccion}`,
    actividadUrl:  `${CONTENIDO_BASE}/${codigoLeccion}/${codigoLeccion}/genially.html`,
    pdfUrl:        `${CONTENIDO_BASE}/${codigoLeccion}/${codigoLeccion}.pdf`,
  };
}
/* ══════════════════════════════════════════════════════════
   GET /api/ejes
 
   Devuelve el árbol del curso con acceso progresivo por eje:
   · Eje 1 nunca completado  → solo eje 1
   · Eje 1 completado        → eje 1 + eje 2
   · Eje 2 completado        → eje 1 + eje 2 + eje 3
 
   Cada sección incluye:
   · Sus lecciones con progreso del alumno
   · Su evaluación de sección (preguntas sin respuesta correcta)
   · El último resultado del alumno en esa evaluación
══════════════════════════════════════════════════════════ */
export async function getEjes(req: Request, res: Response) {
  try {
    const usuarioId = req.usuario!.sub;
 
    /* ── 1. idCurso de la ruta del alumno ─────────────────── */
    const [rutaRows] = await pool.query<RowDataPacket[]>(
      `SELECT ra.idCurso
       FROM rutas_aprendizaje ra
       JOIN usuarios u ON u.idRuta = ra.idRuta
       WHERE u.idUsuario = ?
       LIMIT 1`,
      [usuarioId]
    );
    if (!rutaRows[0]) return notFound(res, 'El usuario no tiene una ruta asignada');
    const idCurso = (rutaRows[0] as any).idCurso;
 
    /* ── 2. Todos los ejes del curso (ordenados) ──────────── */
    const [ejesRows] = await pool.query<RowDataPacket[]>(
      `SELECT idEje, codigoEje, nombre, descripcion, cantidadSecciones
       FROM ejes
       WHERE idCurso = ? AND estatus = 1
       ORDER BY idEje ASC`,
      [idCurso]
    );
    const todosLosEjes = ejesRows as any[];
    if (!todosLosEjes.length) return ok(res, []);
 
    /* ── 3. Secciones realizadas por el alumno ────────────── */
    const [secRealizadasRows] = await pool.query<RowDataPacket[]>(
      `SELECT idSeccion
       FROM secciones_realizadas
       WHERE idUsuario = ? AND idCurso = ?`,
      [usuarioId, idCurso]
    );
    const secRealizadasSet = new Set(
      (secRealizadasRows as any[]).map(s => s.idSeccion)
    );
 
    /* ── 4. Secciones de todos los ejes ───────────────────── */
    const [seccionesRows] = await pool.query<RowDataPacket[]>(
      `SELECT s.idSeccion, s.idEje, s.nombre, s.codigoSeccion,
              s.nivel, s.cantidadLecciones
       FROM secciones s
       JOIN ejes e ON e.idEje = s.idEje
       WHERE e.idCurso = ? AND s.estatus = 1
       ORDER BY s.idSeccion ASC`,
      [idCurso]
    );
    const todasLasSecciones = seccionesRows as any[];
 
    /* ── 5. Determinar qué ejes están completados ─────────── */
    //  Un eje está completo cuando TODAS sus secciones están realizadas
    const ejeCompletadoMap = new Map<number, boolean>();
 
    for (const eje of todosLosEjes) {
      const seccionesDelEje = todasLasSecciones.filter(s => s.idEje === eje.idEje);
      const todasRealizadas = seccionesDelEje.length > 0
        && seccionesDelEje.every(s => secRealizadasSet.has(s.idSeccion));
      ejeCompletadoMap.set(eje.idEje, todasRealizadas);
    }
 
    /* ── 6. Calcular cuántos ejes mostrar (acceso progresivo) */
    //  Regla: mostrar los N primeros ejes donde el último
    //  en completarse desbloquea el siguiente.
    //  Siempre se muestra al menos el primer eje.
    let ejesAMostrar = 1;
    for (let i = 0; i < todosLosEjes.length - 1; i++) {
      if (ejeCompletadoMap.get(todosLosEjes[i].idEje)) {
        ejesAMostrar = i + 2; // desbloquear el siguiente
      }
    }
    const ejesFiltrados = todosLosEjes.slice(0, ejesAMostrar);
    const idEjesFiltrados = ejesFiltrados.map(e => e.idEje);
 
    /* ── 7. Lecciones con progreso ────────────────────────── */
    const [leccionesRows] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT
         l.idLeccion,
         l.idSeccion,
         l.nombre,
         l.codigoLeccion,
         CASE WHEN lv.idLeccion IS NOT NULL THEN 1 ELSE 0 END AS vista
       FROM lecciones l
       JOIN secciones s ON s.idSeccion = l.idSeccion
       LEFT JOIN lecciones_vistas lv
              ON lv.idLeccion = l.idLeccion
             AND lv.idUsuario = ?
             AND lv.idCurso   = ?
       WHERE s.idEje IN (${idEjesFiltrados.join(',')})
       ORDER BY l.idLeccion ASC`,
      [usuarioId, idCurso]
    );
 
    /* ── 8. Total de preguntas por lección ────────────────── */
    const [pregLecRows] = await pool.query<RowDataPacket[]>(
      `SELECT idLeccion, COUNT(*) AS totalPreguntas
       FROM preguntas
       WHERE estatus = 1
       GROUP BY idLeccion`
    );
    const pregLecMap = new Map(
      (pregLecRows as any[]).map(p => [p.idLeccion, Number(p.totalPreguntas)])
    );
 
    /* ── 9. Preguntas de evaluación por sección ───────────── */
    //  Solo trae idPregunta, pregunta, tipoPregunta y opciones
    //  → respuestaCorrecta NUNCA se envía al frontend
    const [pregSecRows] = await pool.query<RowDataPacket[]>(
      `SELECT
         p.idPregunta,
         p.idSeccion,
         p.pregunta,
         p.imagenPregunta,
         p.tipoPregunta,
         p.opcionesRespuesta
       FROM preguntas p
       JOIN secciones s ON s.idSeccion = p.idSeccion
       WHERE s.idEje IN (${idEjesFiltrados.join(',')})
         AND p.estatus = 1
         AND p.idLeccion IS NULL   -- preguntas de sección, no de lección individual
       ORDER BY p.idSeccion, p.idPregunta ASC`,
      []
    );
 
    /* ── 9b. Si en tu BD todas las preguntas tienen idLeccion,
             filtra por sección usando solo idSeccion           */
    //  Fallback: tomar TODAS las preguntas de la sección
    let pregSecFinal = pregSecRows as any[];
    if (!pregSecFinal.length) {
      const [pregSecFallback] = await pool.query<RowDataPacket[]>(
        `SELECT
           p.idPregunta,
           p.idSeccion,
           p.pregunta,
           p.imagenPregunta,
           p.tipoPregunta,
           p.opcionesRespuesta
         FROM preguntas p
         JOIN secciones s ON s.idSeccion = p.idSeccion
         WHERE s.idEje IN (${idEjesFiltrados.join(',')})
           AND p.estatus = 1
         ORDER BY p.idSeccion, p.idPregunta ASC`,
        []
      );
      pregSecFinal = pregSecFallback as any[];
    }
 
    /* ── 10. Último resultado de evaluación por sección ──── */
    const [evalRows] = await pool.query<RowDataPacket[]>(
      `SELECT
         es.idSeccion,
         es.calificacion,
         es.fechaRealizacion,
         CASE WHEN es.calificacion >= 70 THEN 1 ELSE 0 END AS aprobada
       FROM evaluaciones_seccion es
       WHERE es.idUsuario = ?
         AND es.idSeccion IN (
           SELECT s.idSeccion FROM secciones s
           WHERE s.idEje IN (${idEjesFiltrados.join(',')})
         )
       ORDER BY es.fechaRealizacion DESC`,
      [usuarioId]
    );
 
    // Quedarse solo con la evaluación más reciente por sección
    const evalMap = new Map<number, any>();
    for (const ev of evalRows as any[]) {
      if (!evalMap.has(ev.idSeccion)) {
        evalMap.set(ev.idSeccion, {
          calificacion:      ev.calificacion,
          aprobada:          Boolean(ev.aprobada),
          fechaRealizacion:  ev.fechaRealizacion,
        });
      }
    }
 
    /* ── 11. Ensamblar árbol final ────────────────────────── */
    const leccionesEnriquecidas = (leccionesRows as any[]).map(l => ({
      idLeccion:      l.idLeccion,
      idSeccion:      l.idSeccion,
      nombre:         l.nombre,
      codigoLeccion:  l.codigoLeccion,
      ...buildUrls(l.codigoLeccion),
      vista:          Boolean(l.vista),
      totalPreguntas: pregLecMap.get(l.idLeccion) ?? 0,
    }));
 
    const seccionesEnriquecidas = todasLasSecciones
      .filter(s => idEjesFiltrados.includes(s.idEje))
      .map(s => {
        const preguntasSeccion = pregSecFinal
          .filter(p => p.idSeccion === s.idSeccion)
          .map(p => ({
            idPregunta:        p.idPregunta,
            pregunta:          p.pregunta,
            imagenPregunta:    p.imagenPregunta ?? null,
            tipoPregunta:      p.tipoPregunta,
            // Parsear JSON si viene como string
            opciones: Array.isArray(p.opcionesRespuesta)
              ? p.opcionesRespuesta
              : (() => { try { return JSON.parse(p.opcionesRespuesta ?? '[]'); } catch { return []; } })(),
            // respuestaCorrecta ← NUNCA se incluye
          }));
 
        return {
          idSeccion:          s.idSeccion,
          idEje:              s.idEje,
          nombre:             s.nombre,
          codigoSeccion:      s.codigoSeccion,
          nivel:              s.nivel,
          cantidadLecciones:  s.cantidadLecciones,
          realizada:          secRealizadasSet.has(s.idSeccion),
          lecciones:          leccionesEnriquecidas.filter(l => l.idSeccion === s.idSeccion),
          // Evaluación de la sección
          evaluacionSeccion: {
            totalPreguntas: preguntasSeccion.length,
            preguntas:      preguntasSeccion,
            ultimoResultado: evalMap.get(s.idSeccion) ?? null,
          },
        };
      });
 
    const arbol = ejesFiltrados.map((e, idx) => ({
      idEje:             e.idEje,
      codigoEje:         e.codigoEje,
      nombre:            e.nombre,
      descripcion:       e.descripcion,
      cantidadSecciones: e.cantidadSecciones,
      completado:        ejeCompletadoMap.get(e.idEje) ?? false,
      // Indica si este eje está disponible o es "el siguiente por desbloquear"
      disponible:        true,
      secciones:         seccionesEnriquecidas.filter(s => s.idEje === e.idEje),
    }));
 
    /* ── 12. Agregar info de ejes bloqueados (sin contenido) */
    const ejesBloqueados = todosLosEjes.slice(ejesAMostrar).map(e => ({
      idEje:             e.idEje,
      codigoEje:         e.codigoEje,
      nombre:            e.nombre,
      descripcion:       e.descripcion,
      cantidadSecciones: e.cantidadSecciones,
      completado:        false,
      disponible:        false,  // ← bloqueado, el frontend puede mostrarlo dimmed
      secciones:         [],     // sin contenido hasta que se desbloquee
    }));
 
    return ok(res, [...arbol, ...ejesBloqueados]);
  } catch (err) {
    return serverError(res, err);
  }
}

/* ── GET /api/lecciones/:id ─────────────────────────────────
   Detalle de una lección con sus preguntas.
   Las opciones se devuelven SIN la respuesta correcta.        */
export async function getLeccion(req: Request, res: Response) {
  try {
    const idLeccion = Number(req.params.id);
    const usuarioId = req.usuario!.sub;

    if (isNaN(idLeccion)) return notFound(res, 'ID de lección inválido');

    /* Lección + progreso del alumno */
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
         l.idLeccion,
         l.idSeccion,
         l.nombre,
         l.codigoLeccion,
         s.idEje,
         s.nombre        AS nombreSeccion,
         s.codigoSeccion,
         CASE WHEN lv.idLeccion IS NOT NULL THEN 1 ELSE 0 END AS vista
       FROM lecciones l
       JOIN secciones s ON s.idSeccion = l.idSeccion
       LEFT JOIN lecciones_vistas lv
              ON lv.idLeccion = l.idLeccion
             AND lv.idUsuario = ?
       WHERE l.idLeccion = ?
       LIMIT 1`,
      [usuarioId, idLeccion]
    );

    if (!rows[0]) return notFound(res, 'Lección no encontrada');
    const leccion = rows[0] as any;

    /* Preguntas con sus opciones (sin respuestaCorrecta) */
    const [preguntas] = await pool.query<RowDataPacket[]>(
      `SELECT idPregunta, pregunta, imagenPregunta,
              tipoPregunta, opcionesRespuesta
       FROM preguntas
       WHERE idLeccion = ? AND estatus = 1
       ORDER BY idPregunta`,
      [idLeccion]
    );

    /* Parsear el JSON de opciones y omitir la respuesta correcta */
    const evaluacion = (preguntas as any[]).map(p => ({
      idPregunta:        p.idPregunta,
      pregunta:          p.pregunta,
      imagenPregunta:    p.imagenPregunta,
      tipoPregunta:      p.tipoPregunta,
      /* opcionesRespuesta ya viene como objeto JS gracias a mysql2 */
      opciones: Array.isArray(p.opcionesRespuesta)
        ? p.opcionesRespuesta
        : JSON.parse(p.opcionesRespuesta ?? '[]'),
    }));

    return ok(res, {
      idLeccion:      leccion.idLeccion,
      idSeccion:      leccion.idSeccion,
      idEje:          leccion.idEje,
      nombre:         leccion.nombre,
      codigoLeccion:  leccion.codigoLeccion,
      nombreSeccion:  leccion.nombreSeccion,
      codigoSeccion:  leccion.codigoSeccion,
      ...buildUrls(leccion.codigoLeccion),
      vista:          Boolean(leccion.vista),
      evaluacion,
    });
  } catch (err) {
    return serverError(res, err);
  }
}
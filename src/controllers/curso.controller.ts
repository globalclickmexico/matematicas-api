import { Request, Response } from 'express';
import pool from '../db/connection';
import { ok, notFound, serverError } from '../utils/response';
import { RowDataPacket } from 'mysql2';

/* Base URL donde están alojados los HTMLs/PDFs de las lecciones.
   Las URLs se construyen como: {BASE}/{tipo}/{codigoLeccion}       */
const CONTENIDO_BASE = process.env.CONTENIDO_BASE_URL
  ?? 'https://globalclickmexico.com/pruebas/matematicas';

function buildUrls(codigoLeccion: string) {
  return {
    introUrl:      `${CONTENIDO_BASE}/${codigoLeccion}`,
    actividadUrl:  `${CONTENIDO_BASE}/${codigoLeccion}/${codigoLeccion}/genially.html`,
    pdfUrl:        `${CONTENIDO_BASE}/${codigoLeccion}/${codigoLeccion}.pdf`,
  };
}

/* ── GET /api/ejes ──────────────────────────────────────────
   Árbol completo del curso del alumno:
   ejes → secciones → lecciones + progreso del alumno         */
export async function getEjes(req: Request, res: Response) {
  try {
    const usuarioId = req.usuario!.sub;

    /* 1. Obtener el idCurso de la ruta del alumno */
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

    /* 2. Ejes del curso */
    const [ejes] = await pool.query<RowDataPacket[]>(
      `SELECT idEje, codigoEje, nombre, descripcion, cantidadSecciones
       FROM ejes
       WHERE idCurso = ? AND estatus = 1
       ORDER BY idEje`,
      [idCurso]
    );

    /* 3. Secciones */
    const [secciones] = await pool.query<RowDataPacket[]>(
      `SELECT s.idSeccion, s.idEje, s.nombre, s.codigoSeccion,
              s.nivel, s.cantidadLecciones
       FROM secciones s
       JOIN ejes e ON e.idEje = s.idEje
       WHERE e.idCurso = ? AND s.estatus = 1
       ORDER BY s.idSeccion`,
      [idCurso]
    );

    /* 4. Lecciones con progreso del alumno */
    const [lecciones] = await pool.query<RowDataPacket[]>(
      `SELECT
         l.idLeccion,
         l.idSeccion,
         l.nombre,
         l.codigoLeccion,
         CASE WHEN lv.idLeccion IS NOT NULL THEN 1 ELSE 0 END AS vista
       FROM lecciones l
       JOIN secciones s ON s.idSeccion = l.idSeccion
       JOIN ejes      e ON e.idEje     = s.idEje
       LEFT JOIN lecciones_vistas lv
              ON lv.idLeccion = l.idLeccion
             AND lv.idUsuario = ?
             AND lv.idCurso   = ?
       WHERE e.idCurso = ?
       ORDER BY l.idLeccion`,
      [usuarioId, idCurso, idCurso]
    );

    /* 5. Total de preguntas por lección */
    const [preguntaCount] = await pool.query<RowDataPacket[]>(
      `SELECT idLeccion, COUNT(*) AS totalPreguntas
       FROM preguntas
       WHERE estatus = 1
       GROUP BY idLeccion`
    );
    const pregMap = new Map(
      (preguntaCount as any[]).map(p => [p.idLeccion, p.totalPreguntas])
    );

    /* 6. Secciones realizadas por el alumno */
    const [secRealizadas] = await pool.query<RowDataPacket[]>(
      `SELECT idSeccion FROM secciones_realizadas
       WHERE idUsuario = ? AND idCurso = ?`,
      [usuarioId, idCurso]
    );
    const secRealizadasSet = new Set(
      (secRealizadas as any[]).map(s => s.idSeccion)
    );

    /* 7. Ensamblar árbol */
    const leccionesEnriquecidas = (lecciones as any[]).map(l => ({
      idLeccion:      l.idLeccion,
      idSeccion:      l.idSeccion,
      nombre:         l.nombre,
      codigoLeccion:  l.codigoLeccion,
      ...buildUrls(l.codigoLeccion),
      vista:          Boolean(l.vista),
      totalPreguntas: pregMap.get(l.idLeccion) ?? 0,
    }));

    const seccionesEnriquecidas = (secciones as any[]).map(s => ({
      idSeccion:         s.idSeccion,
      idEje:             s.idEje,
      nombre:            s.nombre,
      codigoSeccion:     s.codigoSeccion,
      nivel:             s.nivel,
      cantidadLecciones: s.cantidadLecciones,
      realizada:         secRealizadasSet.has(s.idSeccion),
      lecciones:         leccionesEnriquecidas.filter(l => l.idSeccion === s.idSeccion),
    }));

    const arbol = (ejes as any[]).map(e => ({
      idEje:             e.idEje,
      codigoEje:         e.codigoEje,
      nombre:            e.nombre,
      descripcion:       e.descripcion,
      cantidadSecciones: e.cantidadSecciones,
      secciones:         seccionesEnriquecidas.filter(s => s.idEje === e.idEje),
    }));

    return ok(res, arbol);
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
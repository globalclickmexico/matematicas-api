import { Request, Response } from 'express';
import pool from '../db/connection';
import { ok, fail, notFound, serverError } from '../utils/response';
import { RowDataPacket } from 'mysql2';

/* ── POST /api/evaluaciones/leccion/:idLeccion ──────────────
   Recibe las respuestas del alumno, califica en servidor
   y guarda en evaluaciones_seccion.

   Body: { respuestas: [{ idPregunta: number, opcionId: string }] }
   opcionId es el campo "id" del JSON de opciones: "a","b","c","d"  */
export async function enviarEvaluacion(req: Request, res: Response) {
  try {
    const idLeccion = Number(req.params.idLeccion);
    const usuarioId = req.usuario!.sub;

    if (isNaN(idLeccion)) return fail(res, 'ID de lección inválido');

    const { respuestas } = req.body as {
      respuestas: { idPregunta: number; opcionId: string }[];
    };

    if (!Array.isArray(respuestas) || respuestas.length === 0) {
      return fail(res, 'Se requiere al menos una respuesta');
    }

    /* 1. Obtener preguntas con sus respuestas correctas */
    const [preguntas] = await pool.query<RowDataPacket[]>(
      `SELECT idPregunta, respuestaCorrecta
       FROM preguntas
       WHERE idLeccion = ? AND estatus = 1`,
      [idLeccion]
    );

    if (!(preguntas as any[]).length) {
      return notFound(res, 'No se encontraron preguntas para esta lección');
    }

    /* Mapa: idPregunta → respuestaCorrecta */
    const correctaMap = new Map(
      (preguntas as any[]).map(p => [p.idPregunta, p.respuestaCorrecta])
    );

    /* 2. Calificar */
    let correctas = 0;
    const detalle = respuestas.map(r => {
      const correcta   = correctaMap.get(r.idPregunta);
      const esCorrecta = correcta !== undefined && correcta === r.opcionId;
      if (esCorrecta) correctas++;
      return {
        idPregunta:  r.idPregunta,
        opcionId:    r.opcionId,
        esCorrecta,
        /* solo se expone la correcta después de calificar */
        respuestaCorrecta: correcta ?? null,
      };
    });

    const calificacion = Math.round((correctas / (preguntas as any[]).length) * 100);
    const aprobado     = calificacion >= 70;

    /* 3. Obtener idSeccion e idEje para guardar en evaluaciones_seccion */
    const [contexto] = await pool.query<RowDataPacket[]>(
      `SELECT s.idSeccion, s.idEje, e.idCurso
       FROM lecciones l
       JOIN secciones s ON s.idSeccion = l.idSeccion
       JOIN ejes      e ON e.idEje     = s.idEje
       WHERE l.idLeccion = ?
       LIMIT 1`,
      [idLeccion]
    );

    if (!contexto[0]) return notFound(res, 'Lección no encontrada');
    const { idSeccion, idEje, idCurso } = contexto[0] as any;

    const ahora = Math.floor(Date.now() / 1000);

    /* 4. Guardar en evaluaciones_seccion */
    await pool.query(
      `INSERT INTO evaluaciones_seccion
         (idCurso, idEje, idSeccion, idUsuario, calificacion, fechaRealizacion)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [idCurso, idEje, idSeccion, usuarioId, calificacion, ahora]
    );

    /* 5. Guardar en evaluaciones_leccion (sin idUsuario según el schema) */
    await pool.query(
      `INSERT INTO evaluaciones_leccion
         (idSeccion, idLeccion, calificacion, fechaRealizacion)
       VALUES (?, ?, ?, ?)`,
      [idSeccion, idLeccion, calificacion, ahora]
    );

    /* 6. Si aprobó, marcar la lección como vista (si no lo estaba) */
    if (aprobado) {
      await pool.query(
        `INSERT IGNORE INTO lecciones_vistas
           (idCurso, idLeccion, idUsuario, fechaRealizacion)
         VALUES (?, ?, ?, ?)`,
        [idCurso, idLeccion, usuarioId, ahora]
      );
    }

    return ok(res, {
      calificacion,
      aprobado,
      correctas,
      total:   (preguntas as any[]).length,
      detalle,
    });
  } catch (err) {
    return serverError(res, err);
  }
}

/* ── GET /api/evaluaciones/leccion/:idLeccion/historial ─────
   Historial de evaluaciones del alumno en una lección.
   Usa evaluaciones_seccion filtrado por idUsuario.            */
export async function getHistorial(req: Request, res: Response) {
  try {
    const idLeccion = Number(req.params.idLeccion);
    const usuarioId = req.usuario!.sub;

    if (isNaN(idLeccion)) return fail(res, 'ID de lección inválido');

    /* Obtener idSeccion de la lección */
    const [secRows] = await pool.query<RowDataPacket[]>(
      `SELECT idSeccion FROM lecciones WHERE idLeccion = ? LIMIT 1`,
      [idLeccion]
    );
    if (!secRows[0]) return notFound(res, 'Lección no encontrada');
    const idSeccion = (secRows[0] as any).idSeccion;

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT calificacion, fechaRealizacion,
              CASE WHEN calificacion >= 70 THEN 1 ELSE 0 END AS aprobado
       FROM evaluaciones_seccion
       WHERE idUsuario = ? AND idSeccion = ?
       ORDER BY fechaRealizacion DESC`,
      [usuarioId, idSeccion]
    );

    return ok(res, (rows as any[]).map(r => ({
      calificacion:      r.calificacion,
      aprobado:          Boolean(r.aprobado),
      fechaRealizacion:  r.fechaRealizacion,
    })));
  } catch (err) {
    return serverError(res, err);
  }
}

export async function getPreguntasByIdLeccion(req: Request, res: Response) {
  try {
    const idLeccion = Number(req.params.idLeccion);

    console.log(idLeccion)

    if (isNaN(idLeccion)) return fail(res, 'ID de lección inválido');

    /* Obtener Preguntas de evalacion de la leccion */
    const [secRows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM preguntas WHERE idLeccion = ?`,
      [idLeccion]
    );

    console.log(secRows);

    if (!secRows[0]) return notFound(res, 'Lección no encontrada');
    // const idSeccion = (secRows[0] as any).idSeccion;

    // const [rows] = await pool.query<RowDataPacket[]>(
    //   `SELECT calificacion, fechaRealizacion,
    //           CASE WHEN calificacion >= 70 THEN 1 ELSE 0 END AS aprobado
    //    FROM evaluaciones_seccion
    //    WHERE idUsuario = ? AND idSeccion = ?
    //    ORDER BY fechaRealizacion DESC`,
    //   [usuarioId, idSeccion]
    // );

    return ok(res, secRows);
  } catch (err) {
    return serverError(res, err);
  }
}
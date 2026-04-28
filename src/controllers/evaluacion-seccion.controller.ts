import { Request, Response } from 'express';
import pool from '../db/connection';
import { ok, fail, notFound, serverError } from '../utils/response';
import { RowDataPacket } from 'mysql2';

/* ══════════════════════════════════════════════════════════
   GET /api/evaluaciones/seccion/:idSeccion
   Devuelve la sección con sus preguntas (sin respuesta correcta)
   y el último resultado del alumno si ya la realizó.
══════════════════════════════════════════════════════════ */
export async function getEvaluacionSeccion(req: Request, res: Response) {
  try {
    const idSeccion = Number(req.params.idSeccion);
    const usuarioId = req.usuario!.sub;

    console.log('Entra en el endopoint')

    if (isNaN(idSeccion)) return fail(res, 'ID de sección inválido');

    /* 1. Info de la sección */
    const [secRows] = await pool.query<RowDataPacket[]>(
      `SELECT s.idSeccion, s.nombre, s.codigoSeccion, s.nivel,
              e.idEje, e.nombre AS nombreEje, e.codigoEje,
              e.idCurso
       FROM secciones s
       JOIN ejes e ON e.idEje = s.idEje
       WHERE s.idSeccion = ? AND s.estatus = 1
       LIMIT 1`,
      [idSeccion]
    );
    if (!secRows[0]) return notFound(res, 'Sección no encontrada');
    const sec = secRows[0] as any;

    /* 2. Verificar que el alumno haya completado todas las lecciones */
    const [lecProgRows] = await pool.query<RowDataPacket[]>(
      `SELECT DISTINCT 
         COUNT(l.idLeccion)   AS totalLecciones,
         COUNT(lv.idLeccion)  AS vistas
       FROM lecciones l
       LEFT JOIN lecciones_vistas lv
              ON lv.idLeccion = l.idLeccion
             AND lv.idUsuario = ?
             AND lv.idCurso   = ?
       WHERE l.idSeccion = ?`,
      [usuarioId, sec.idCurso, idSeccion]
    );
    const { totalLecciones, vistas } = (lecProgRows[0] as any) ?? {};
    const seccionHabilitada = Number(totalLecciones) > 0
      && Number(vistas) >= Number(totalLecciones);

    /* 3. Preguntas de la sección — sin respuestaCorrecta */
    const [pregRows] = await pool.query<RowDataPacket[]>(
      `SELECT idPregunta, pregunta, imagenPregunta,
              tipoPregunta, opcionesRespuesta
       FROM preguntas
       WHERE idSeccion = ? AND estatus = 1
       ORDER BY idPregunta ASC`,
      [idSeccion]
    );

    const preguntas = (pregRows as any[]).map((p, i) => ({
      idPregunta:     p.idPregunta,
      numero:         i + 1,
      pregunta:       p.pregunta,
      imagenPregunta: p.imagenPregunta ?? null,
      tipoPregunta:   p.tipoPregunta,
      opciones: Array.isArray(p.opcionesRespuesta)
        ? p.opcionesRespuesta
        : (() => { try { return JSON.parse(p.opcionesRespuesta ?? '[]'); } catch { return []; } })(),
    }));

    /* 4. Último resultado del alumno en esta sección */
    const [evalRows] = await pool.query<RowDataPacket[]>(
      `SELECT calificacion, fechaRealizacion,
              CASE WHEN calificacion >= 70 THEN 1 ELSE 0 END AS aprobada
       FROM evaluaciones_seccion
       WHERE idUsuario = ? AND idSeccion = ?
       ORDER BY fechaRealizacion DESC
       LIMIT 1`,
      [usuarioId, idSeccion]
    );
    const ultimoResultado = evalRows[0]
      ? {
          calificacion:     (evalRows[0] as any).calificacion,
          aprobada:         Boolean((evalRows[0] as any).aprobada),
          fechaRealizacion: (evalRows[0] as any).fechaRealizacion,
        }
      : null;

    return ok(res, {
      seccion: {
        idSeccion:    sec.idSeccion,
        nombre:       sec.nombre,
        codigoSeccion:sec.codigoSeccion,
        nivel:        sec.nivel,
        eje: {
          idEje:     sec.idEje,
          nombre:    sec.nombreEje,
          codigoEje: sec.codigoEje,
        },
      },
      habilitada:     seccionHabilitada,
      totalPreguntas: preguntas.length,
      preguntas,
      ultimoResultado,
    });
  } catch (err) {
    return serverError(res, err);
  }
}

/* ══════════════════════════════════════════════════════════
   POST /api/evaluaciones/seccion/:idSeccion
   Califica las respuestas y SOBREESCRIBE el resultado previo.
   Body: { respuestas: [{ idPregunta: number, opcionId: string }] }
══════════════════════════════════════════════════════════ */
export async function enviarEvaluacionSeccion(req: Request, res: Response) {
  try {
    const idSeccion = Number(req.params.idSeccion);
    const usuarioId = req.usuario!.sub;

    if (isNaN(idSeccion)) return fail(res, 'ID de sección inválido');

    const { respuestas } = req.body as {
      respuestas: { idPregunta: number; opcionId: string }[];
    };
    if (!Array.isArray(respuestas) || !respuestas.length) {
      return fail(res, 'Se requiere al menos una respuesta');
    }

    //todo REFACTORIZAR PARA VALIDAR LAS RESPUESTAS CON EL VALOR, NO CON EL ID EN respuestaCorrecta y recibir el valor, no el id de la opcion.

    console.log(respuestas)

    /* 1. Obtener respuestas correctas (solo en servidor) */
    const [correctasRows] = await pool.query<RowDataPacket[]>(
      `SELECT idPregunta, respuestaCorrecta
       FROM preguntas
       WHERE idSeccion = ? AND estatus = 1`,
      [idSeccion]
    );

    console.log(correctasRows);
    if (!(correctasRows as any[]).length) {
      return notFound(res, 'No hay preguntas para esta sección');
    }

    const correctaMap = new Map(
      (correctasRows as any[]).map(p => [p.idPregunta, p.respuestaCorrecta])
    );

    /* 2. Calificar */
    let correctas = 0;
    const detalle = respuestas.map(r => {
      const esperada   = correctaMap.get(r.idPregunta);
      const esCorrecta = esperada !== undefined && esperada === r.opcionId;
      if (esCorrecta) correctas++;
      return {
        idPregunta:        r.idPregunta,
        opcionId:          r.opcionId,
        esCorrecta,
        respuestaCorrecta: esperada ?? null, // exponer al terminar
      };
    });

    const total        = (correctasRows as any[]).length;
    const calificacion = Math.round((correctas / total) * 100);
    const aprobada     = calificacion >= 70;
    const ahora        = Math.floor(Date.now() / 1000);

    /* 3. Obtener idEje e idCurso */
    const [ctxRows] = await pool.query<RowDataPacket[]>(
      `SELECT s.idEje, e.idCurso
       FROM secciones s
       JOIN ejes e ON e.idEje = s.idEje
       WHERE s.idSeccion = ?
       LIMIT 1`,
      [idSeccion]
    );
    if (!ctxRows[0]) return notFound(res, 'Sección no encontrada');
    const { idEje, idCurso } = ctxRows[0] as any;

    /* 4. SOBREESCRIBIR resultado previo (DELETE + INSERT) */
    const conn = await (pool as any).getConnection();
    try {
      await conn.beginTransaction();

      await conn.query(
        `DELETE FROM evaluaciones_seccion
         WHERE idUsuario = ? AND idSeccion = ?`,
        [usuarioId, idSeccion]
      );

      await conn.query(
        `INSERT INTO evaluaciones_seccion
           (idCurso, idEje, idSeccion, idUsuario, calificacion, fechaRealizacion)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [idCurso, idEje, idSeccion, usuarioId, calificacion, ahora]
      );

      /* 5. Si aprobó y la sección no estaba marcada → marcarla */
      if (aprobada) {
        await conn.query(
          `INSERT IGNORE INTO secciones_realizadas
             (idUsuario, idSeccion, idCurso, fechaRealizado)
           VALUES (?, ?, ?, ?)`,
          [usuarioId, idSeccion, idCurso, ahora]
        );
      }

      await conn.commit();
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }

    return ok(res, {
      calificacion,
      aprobada,
      correctas,
      total,
      detalle,
      mensaje: aprobada
        ? '¡Sección aprobada! Puedes continuar al siguiente contenido.'
        : `Obtuviste ${calificacion}%. Necesitas al menos 70% para avanzar.`,
    });
  } catch (err) {
    return serverError(res, err);
  }
}
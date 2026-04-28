import { Request, Response } from 'express';
import pool from '../db/connection';
import { ok, fail, notFound, serverError } from '../utils/response';
import { RowDataPacket } from 'mysql2';
/* ── POST /api/progreso/leccion/:idLeccion ──────────────────
   Marca una lección como vista y devuelve la siguiente
   lección pendiente del curso para ese alumno.              */
export async function marcarLeccionVista(req: Request, res: Response) {
  try {
    const idLeccion = Number(req.params.idLeccion);
    const usuarioId = req.usuario!.sub;
 
    console.log({ idLeccion, usuarioId });
 
    if (isNaN(idLeccion)) return fail(res, 'ID de lección inválido');
 
    /* 1. Obtener idCurso + orden de la lección actual */
    const [lecRows] = await pool.query<RowDataPacket[]>(
      `SELECT
         e.idCurso,
         l.idSeccion,
         s.idEje,
         l.idLeccion,
         l.nombre       AS nombreLeccion,
         l.codigoLeccion,
         s.nombre       AS nombreSeccion,
         s.codigoSeccion,
         e.nombre       AS nombreEje
       FROM lecciones l
       JOIN secciones s ON s.idSeccion = l.idSeccion
       JOIN ejes      e ON e.idEje     = s.idEje
       WHERE l.idLeccion = ?
       LIMIT 1`,
      [idLeccion]
    );
 
    if (!lecRows[0]) return notFound(res, 'Lección no encontrada');
 
    const actual  = lecRows[0] as any;
    const idCurso = actual.idCurso;
    const ahora   = Math.floor(Date.now() / 1000);
 
    /* 2. Marcar como vista (INSERT IGNORE = no duplica) */
    await pool.query(
      `INSERT IGNORE INTO lecciones_vistas
         (idCurso, idLeccion, idUsuario, fechaRealizacion)
       VALUES (?, ?, ?, ?)`,
      [idCurso, idLeccion, usuarioId, ahora]
    );
 
    /* 3. Verificar si se completó la sección */
    const [secRows] = await pool.query<RowDataPacket[]>(
      `SELECT
         l.idSeccion,
         COUNT(l.idLeccion)  AS totalLecciones,
         COUNT(lv.idLeccion) AS vistas
       FROM lecciones l
       LEFT JOIN lecciones_vistas lv
              ON lv.idLeccion = l.idLeccion
             AND lv.idUsuario = ?
       WHERE l.idSeccion = ?
       GROUP BY l.idSeccion`,
      [usuarioId, actual.idSeccion]
    );
 
    let seccionCompletada = false;
    if (secRows[0]) {
      const { idSeccion, totalLecciones, vistas } = secRows[0] as any;
      if (Number(totalLecciones) === Number(vistas)) {
        await pool.query(
          `INSERT IGNORE INTO secciones_realizadas
             (idUsuario, idSeccion, idCurso, fechaRealizado)
           VALUES (?, ?, ?, ?)`,
          [usuarioId, idSeccion, idCurso, ahora]
        );
        seccionCompletada = true;
      }
    }
 
    /* 4. Buscar la siguiente lección NO vista del curso
          Orden: idEje → idSeccion → idLeccion (todos ascendentes)
          Se excluyen las ya registradas en lecciones_vistas        */
    const [sigRows] = await pool.query<RowDataPacket[]>(
      `SELECT
         l.idLeccion,
         l.nombre         AS nombre,
         l.codigoLeccion,
         s.idSeccion,
         s.nombre         AS nombreSeccion,
         s.codigoSeccion,
         e.idEje,
         e.nombre         AS nombreEje,
         e.codigoEje,
         (SELECT COUNT(*) FROM preguntas p
          WHERE p.idLeccion = l.idLeccion AND p.estatus = 1) AS totalPreguntas
       FROM lecciones l
       JOIN secciones s ON s.idSeccion = l.idSeccion
       JOIN ejes      e ON e.idEje     = s.idEje
       WHERE e.idCurso = ?
         AND e.estatus  = 1
         AND s.estatus  = 1
         AND l.idLeccion NOT IN (
           SELECT lv.idLeccion
           FROM lecciones_vistas lv
           WHERE lv.idUsuario = ?
             AND lv.idCurso   = ?
         )
         /* Que sea posterior a la lección actual en el orden natural */
         AND (
           e.idEje > ?
           OR (e.idEje = ? AND s.idSeccion > ?)
           OR (e.idEje = ? AND s.idSeccion = ? AND l.idLeccion > ?)
         )
       ORDER BY e.idEje ASC, s.idSeccion ASC, l.idLeccion ASC
       LIMIT 1`,
      [
        idCurso,
        usuarioId, idCurso,
        /* condición de orden */
        actual.idEje,
        actual.idEje, actual.idSeccion,
        actual.idEje, actual.idSeccion, idLeccion,
      ]
    );
 
    /* 4b. Si no hay siguiente "hacia adelante", buscar cualquier
           lección pendiente desde el inicio del curso             */
    let siguienteLeccion = sigRows[0] ? (sigRows[0] as any) : null;
 
    if (!siguienteLeccion) {
      const [anyRows] = await pool.query<RowDataPacket[]>(
        `SELECT
           l.idLeccion,
           l.nombre         AS nombre,
           l.codigoLeccion,
           s.idSeccion,
           s.nombre         AS nombreSeccion,
           s.codigoSeccion,
           e.idEje,
           e.nombre         AS nombreEje,
           e.codigoEje,
           (SELECT COUNT(*) FROM preguntas p
            WHERE p.idLeccion = l.idLeccion AND p.estatus = 1) AS totalPreguntas
         FROM lecciones l
         JOIN secciones s ON s.idSeccion = l.idSeccion
         JOIN ejes      e ON e.idEje     = s.idEje
         WHERE e.idCurso = ?
           AND e.estatus  = 1
           AND s.estatus  = 1
           AND l.idLeccion NOT IN (
             SELECT lv.idLeccion
             FROM lecciones_vistas lv
             WHERE lv.idUsuario = ?
               AND lv.idCurso   = ?
           )
           AND l.idLeccion != ?
         ORDER BY e.idEje ASC, s.idSeccion ASC, l.idLeccion ASC
         LIMIT 1`,
        [idCurso, usuarioId, idCurso, idLeccion]
      );
      siguienteLeccion = anyRows[0] ? (anyRows[0] as any) : null;
    }
 
    return ok(res, {
      marcada:          true,
      idLeccion,
      seccionCompletada,
      siguienteLeccion: siguienteLeccion
        ? {
            idLeccion:      siguienteLeccion.idLeccion,
            nombre:         siguienteLeccion.nombre,
            codigoLeccion:  siguienteLeccion.codigoLeccion,
            totalPreguntas: Number(siguienteLeccion.totalPreguntas),
            seccion: {
              idSeccion:     siguienteLeccion.idSeccion,
              nombre:        siguienteLeccion.nombreSeccion,
              codigoSeccion: siguienteLeccion.codigoSeccion,
            },
            eje: {
              idEje:    siguienteLeccion.idEje,
              nombre:   siguienteLeccion.nombreEje,
              codigoEje:siguienteLeccion.codigoEje,
            },
          }
        : null,   // null = curso completado, no quedan lecciones
    });
  } catch (err) {
    return serverError(res, err);
  }
}

/* ── GET /api/progreso ──────────────────────────────────────
   Resumen de progreso del alumno: lecciones vistas,
   secciones completadas y ejes finalizados.                   */
export async function getProgreso(req: Request, res: Response) {
  try {
    const usuarioId = req.usuario!.sub;

    /* Lecciones vistas */
    const [vistas] = await pool.query<RowDataPacket[]>(
      `SELECT idLeccion, idCurso, fechaRealizacion
       FROM lecciones_vistas
       WHERE idUsuario = ?
       ORDER BY fechaRealizacion DESC`,
      [usuarioId]
    );

    /* Secciones realizadas */
    const [secciones] = await pool.query<RowDataPacket[]>(
      `SELECT idSeccion, idCurso, fechaRealizado
       FROM secciones_realizadas
       WHERE idUsuario = ?
       ORDER BY fechaRealizado DESC`,
      [usuarioId]
    );

    /* Ejes finalizados */
    const [ejes] = await pool.query<RowDataPacket[]>(
      `SELECT idEje, promedio, fechaRealizado
       FROM ejes_finalizados
       WHERE idUsuario = ?
       ORDER BY fechaRealizado DESC`,
      [usuarioId]
    );

    /* Cursos finalizados */
    const [cursos] = await pool.query<RowDataPacket[]>(
      `SELECT idCurso, promedio, fechaRealizada
       FROM cursos_finalizados
       WHERE idUsuario = ?
       ORDER BY fechaRealizada DESC`,
      [usuarioId]
    );

    /* Estadísticas generales */
    const totalVistas    = (vistas as any[]).length;
    const totalSecciones = (secciones as any[]).length;

    return ok(res, {
      resumen: {
        leccionesVistas:     totalVistas,
        seccionesRealizadas: totalSecciones,
        ejesFinalizados:     (ejes as any[]).length,
        cursosFinalizados:   (cursos as any[]).length,
      },
      leccionesVistas:     vistas,
      seccionesRealizadas: secciones,
      ejesFinalizados:     ejes,
      cursosFinalizados:   cursos,
    });
  } catch (err) {
    return serverError(res, err);
  }
}

/* ── GET /api/progreso/ultima-leccion ───────────────────────
   Devuelve la última lección vista por el alumno con toda
   su información: lección, sección, eje y URLs de contenido. */
export async function getUltimaLeccion(req: Request, res: Response) {
  try {
    const usuarioId = req.usuario!.sub;
 
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
         l.idLeccion,
         l.nombre            AS nombreLeccion,
         l.codigoLeccion,
         s.idSeccion,
         s.nombre            AS nombreSeccion,
         s.codigoSeccion,
         s.nivel,
         e.idEje,
         e.nombre            AS nombreEje,
         e.codigoEje,
         e.idCurso,
         lv.fechaRealizacion,
         (SELECT COUNT(*) FROM preguntas p
          WHERE p.idLeccion = l.idLeccion
            AND p.estatus = 1)              AS totalPreguntas
       FROM lecciones_vistas lv
       JOIN lecciones l ON l.idLeccion = lv.idLeccion
       JOIN secciones s ON s.idSeccion  = l.idSeccion
       JOIN ejes      e ON e.idEje      = s.idEje
       WHERE lv.idUsuario = ?
       ORDER BY lv.fechaRealizacion DESC
       LIMIT 1`,
      [usuarioId]
    );
 
    if (!rows[0]) {
      /* El alumno no ha visto ninguna lección todavía */
      return ok(res, { ultimaLeccion: null });
    }
 
    const r = rows[0] as any;
 
    const BASE = process.env.CONTENIDO_BASE_URL
      ?? 'https://globalclickmexico.com/pruebas/matematicas';
 
    return ok(res, {
      ultimaLeccion: {
        idLeccion:        r.idLeccion,
        nombre:           r.nombreLeccion,
        codigoLeccion:    r.codigoLeccion,
        totalPreguntas:   Number(r.totalPreguntas),
        fechaVista:       r.fechaRealizacion,
        introUrl:         `${BASE}/${r.codigoLeccion}`,
        actividadUrl:     `${BASE}/${r.codigoLeccion}ACT`,
        pdfUrl:           `${BASE}/${r.codigoLeccion}PDF`,
        seccion: {
          idSeccion:      r.idSeccion,
          nombre:         r.nombreSeccion,
          codigoSeccion:  r.codigoSeccion,
          nivel:          r.nivel,
        },
        eje: {
          idEje:          r.idEje,
          nombre:         r.nombreEje,
          codigoEje:      r.codigoEje,
          idCurso:        r.idCurso,
        },
      },
    });
  } catch (err) {
    return serverError(res, err);
  }
}
 


/* ── GET /api/progreso/siguiente-leccion ───────────────────────
   Devuelve la última lección vista por el alumno con toda
   su información: lección, sección, eje y URLs de contenido. */
export async function getSiguienteLeccion(req: Request, res: Response) {
  try {
    const {idCurso, usuarioId, idEje, idLeccion, idSeccion} = req.body;

    console.log(req.body)
 
     /* 4. Buscar la siguiente lección NO vista del curso
          Orden: idEje → idSeccion → idLeccion (todos ascendentes)
          Se excluyen las ya registradas en lecciones_vistas        */
    const [sigRows] = await pool.query<RowDataPacket[]>(
      `SELECT
         l.idLeccion,
         l.nombre         AS nombre,
         l.codigoLeccion,
         s.idSeccion,
         s.nombre         AS nombreSeccion,
         s.codigoSeccion,
         e.idEje,
         e.nombre         AS nombreEje,
         e.codigoEje,
         (SELECT COUNT(*) FROM preguntas p
          WHERE p.idLeccion = l.idLeccion AND p.estatus = 1) AS totalPreguntas
       FROM lecciones l
       JOIN secciones s ON s.idSeccion = l.idSeccion
       JOIN ejes      e ON e.idEje     = s.idEje
       WHERE e.idCurso = ?
         AND e.estatus  = 1
         AND s.estatus  = 1
         AND l.idLeccion NOT IN (
           SELECT lv.idLeccion
           FROM lecciones_vistas lv
           WHERE lv.idUsuario = ?
             AND lv.idCurso   = ?
         )
         /* Que sea posterior a la lección actual en el orden natural */
         AND (
           e.idEje > ?
           OR (e.idEje = ? AND s.idSeccion > ?)
           OR (e.idEje = ? AND s.idSeccion = ? AND l.idLeccion > ?)
         )
       ORDER BY e.idEje ASC, s.idSeccion ASC, l.idLeccion ASC
       LIMIT 1`,
      [
        idCurso,
        usuarioId, idCurso,
        /* condición de orden */
        idEje,
        idEje, idSeccion,
        idEje, idSeccion, idLeccion,
      ]
    );
 
    /* 4b. Si no hay siguiente "hacia adelante", buscar cualquier
           lección pendiente desde el inicio del curso             */
    let siguienteLeccion = sigRows[0] ? (sigRows[0] as any) : null;
 
    if (!siguienteLeccion) {
      const [anyRows] = await pool.query<RowDataPacket[]>(
        `SELECT
           l.idLeccion,
           l.nombre         AS nombre,
           l.codigoLeccion,
           s.idSeccion,
           s.nombre         AS nombreSeccion,
           s.codigoSeccion,
           e.idEje,
           e.nombre         AS nombreEje,
           e.codigoEje,
           (SELECT COUNT(*) FROM preguntas p
            WHERE p.idLeccion = l.idLeccion AND p.estatus = 1) AS totalPreguntas
         FROM lecciones l
         JOIN secciones s ON s.idSeccion = l.idSeccion
         JOIN ejes      e ON e.idEje     = s.idEje
         WHERE e.idCurso = ?
           AND e.estatus  = 1
           AND s.estatus  = 1
           AND l.idLeccion NOT IN (
             SELECT lv.idLeccion
             FROM lecciones_vistas lv
             WHERE lv.idUsuario = ?
               AND lv.idCurso   = ?
           )
           AND l.idLeccion != ?
         ORDER BY e.idEje ASC, s.idSeccion ASC, l.idLeccion ASC
         LIMIT 1`,
        [idCurso, usuarioId, idCurso, idLeccion]
      );
      siguienteLeccion = anyRows[0] ? (anyRows[0] as any) : null;
    }

    console.log(siguienteLeccion);
 
    return ok(res, {
      siguienteLeccion
    });
  } catch (err) {
    return serverError(res, err);
  }
}
 
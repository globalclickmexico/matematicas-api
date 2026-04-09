import { Request, Response } from 'express';
import pool from '../db/connection';
import { ok, fail, notFound, serverError } from '../utils/response';
import { RowDataPacket } from 'mysql2';

/* ── POST /api/progreso/leccion/:idLeccion ──────────────────
   Registra que el alumno vio una lección.
   Inserta en lecciones_vistas (si no existe ya).              */
export async function marcarLeccionVista(req: Request, res: Response) {
  try {
    const idLeccion = Number(req.params.idLeccion);
    const usuarioId = req.usuario!.sub;

    if (isNaN(idLeccion)) return fail(res, 'ID de lección inválido');

    /* Obtener idCurso de la lección */
    const [lecRows] = await pool.query<RowDataPacket[]>(
      `SELECT e.idCurso
       FROM lecciones l
       JOIN secciones s ON s.idSeccion = l.idSeccion
       JOIN ejes      e ON e.idEje     = s.idEje
       WHERE l.idLeccion = ?
       LIMIT 1`,
      [idLeccion]
    );
    if (!lecRows[0]) return notFound(res, 'Lección no encontrada');
    const idCurso = (lecRows[0] as any).idCurso;

    const ahora = Math.floor(Date.now() / 1000);

    /* Insertar solo si no existe */
    await pool.query(
      `INSERT IGNORE INTO lecciones_vistas
         (idCurso, idLeccion, idUsuario, fechaRealizacion)
       VALUES (?, ?, ?, ?)`,
      [idCurso, idLeccion, usuarioId, ahora]
    );

    /* Verificar si todas las lecciones de la sección están vistas
       para marcar la sección como realizada automáticamente       */
    const [secRows] = await pool.query<RowDataPacket[]>(
      `SELECT l.idSeccion,
              COUNT(l.idLeccion)                                   AS totalLecciones,
              COUNT(lv.idLeccion)                                  AS vistas
       FROM lecciones l
       LEFT JOIN lecciones_vistas lv
              ON lv.idLeccion = l.idLeccion
             AND lv.idUsuario = ?
       WHERE l.idSeccion = (
         SELECT idSeccion FROM lecciones WHERE idLeccion = ?
       )
       GROUP BY l.idSeccion`,
      [usuarioId, idLeccion]
    );

    let seccionCompletada = false;
    if (secRows[0]) {
      const { idSeccion, totalLecciones, vistas } = secRows[0] as any;
      if (totalLecciones === vistas) {
        await pool.query(
          `INSERT IGNORE INTO secciones_realizadas
             (idUsuario, idSeccion, idCurso, fechaRealizado)
           VALUES (?, ?, ?, ?)`,
          [usuarioId, idSeccion, idCurso, ahora]
        );
        seccionCompletada = true;
      }
    }

    return ok(res, { marcada: true, idLeccion, seccionCompletada });
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
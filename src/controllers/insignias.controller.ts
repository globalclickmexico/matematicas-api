import { Request, Response } from 'express';
import pool from '../db/connection';
import { ok, fail, serverError } from '../utils/response';
import { RowDataPacket } from 'mysql2';

/* ══════════════════════════════════════════════════════════
   POST /api/insignias/validar

   Evalúa si el alumno ganó una insignia al terminar una lección.
   Se llama desde el frontend cuando el alumno completa la lección.

   Body: { codigoLeccion: string, idSeccion: number }

   Lógica:
   1. Buscar si la sección tiene insignia(s) asociada
   2. Verificar si el alumno ya la tiene
   3. Verificar si completó TODAS las lecciones de esa sección
   4. Si todo OK → insertar en insignias_obtenidas y devolver la insignia
══════════════════════════════════════════════════════════ */
export async function validarInsignia(req: Request, res: Response) {
  try {
    const usuarioId = req.usuario!.sub;
    const { codigoLeccion, idSeccion } = req.body as {
      codigoLeccion: string;
      idSeccion:     number;
    };

    console.log(usuarioId);
    console.log({codigoLeccion, idSeccion});

    if (!codigoLeccion || !idSeccion) {
      return fail(res, 'Se requiere codigoLeccion e idSeccion');
    }

    /* 1. Buscar insignias asociadas a esta sección */
    const [insigniasRows] = await pool.query<RowDataPacket[]>(
      `SELECT idInsignia, nombre, descripcion, valor
       FROM insignias
       WHERE idSeccion = ?`,
      [idSeccion]
    );

    console.log(insigniasRows);

    if (!(insigniasRows as any[]).length) {
      /* La sección no tiene insignia asociada — responder sin error */
      return ok(res, { ganada: false, insignia: null, motivo: 'sin_insignia' });
    }

    /* 2. Para cada insignia de la sección, verificar si ya la tiene */
    const ahora = Math.floor(Date.now() / 1000);
    const nuevas = [];

    for (const ins of insigniasRows as any[]) {

      /* ¿Ya la tiene? */
      const [yaObtRows] = await pool.query<RowDataPacket[]>(
        `SELECT idInsignia FROM insignias_obtenidas
         WHERE idInsignia = ? AND idUsuario = ?
         LIMIT 1`,
        [ins.idInsignia, usuarioId]
      );
      if ((yaObtRows as any[]).length) continue; /* ya tiene esta, saltar */

      console.log(yaObtRows);

      /* 3. Verificar si completó TODAS las lecciones de la sección */
      const [leccionesRows] = await pool.query<RowDataPacket[]>(
        `SELECT
           COUNT(l.idLeccion)                    AS totalLecciones,
           COUNT(lv.idLeccion)                   AS leccionesVistas
         FROM lecciones l
         LEFT JOIN lecciones_vistas lv
                ON lv.idLeccion = l.idLeccion
               AND lv.idUsuario = ?
         WHERE l.idSeccion = ?`,
        [usuarioId, idSeccion]
      );

      const { totalLecciones, leccionesVistas } = (leccionesRows[0] as any);

      console.log({totalLecciones, leccionesVistas});

      if (Number(totalLecciones) === 0 || Number(leccionesVistas) < Number(totalLecciones)) {
        /* Aún le faltan lecciones */
        continue;
      }

      /* 4. ¡Condiciones cumplidas! Guardar la insignia */
      await pool.query(
        `INSERT INTO insignias_obtenidas (idInsignia, idUsuario, fechaObtenida)
         VALUES (?, ?, ?)`,
        [ins.idInsignia, usuarioId, ahora]
      );

      nuevas.push({
        idInsignia:    ins.idInsignia,
        nombre:        ins.nombre,
        descripcion:   ins.descripcion,
        valor:         ins.valor,
        idSeccion,
        obtenida:      true,
        fechaObtenida: ahora,
      });
    }

    console.log("Nuevas insignias: " , nuevas.length);

    if (nuevas.length > 0) {
      return ok(res, {
        ganada:    true,
        insignias: nuevas,          /* array por si hay más de una por sección */
        motivo:    'seccion_completada',
      });
    }

    return ok(res, { ganada: false, insignia: null, motivo: 'condiciones_incompletas' });

  } catch (err) {
    return serverError(res, err);
  }
}

/* ══════════════════════════════════════════════════════════
   GET /api/insignias

   Devuelve TODAS las insignias del curso con su estado
   (obtenida o no) para el alumno autenticado.
   Usado por el componente Logros.
══════════════════════════════════════════════════════════ */
export async function getInsignias(req: Request, res: Response) {
  try {
    const usuarioId = req.usuario!.sub;

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
         i.idInsignia,
         i.nombre,
         i.descripcion,
         i.idSeccion,
         i.valor,
         CASE WHEN io.idInsignia IS NOT NULL THEN 1 ELSE 0 END AS obtenida,
         io.fechaObtenida
       FROM insignias i
       LEFT JOIN insignias_obtenidas io
              ON io.idInsignia = i.idInsignia
             AND io.idUsuario  = ?
       ORDER BY i.idInsignia`,
      [usuarioId]
    );

    return ok(res, (rows as any[]).map(r => ({
      idInsignia:    r.idInsignia,
      nombre:        r.nombre,
      descripcion:   r.descripcion,
      idSeccion:     r.idSeccion,
      valor:         r.valor,
      obtenida:      Boolean(r.obtenida),
      fechaObtenida: r.fechaObtenida ?? null,
    })));

  } catch (err) {
    return serverError(res, err);
  }
}
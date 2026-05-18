import { Request, Response } from 'express';
import pool from '../db/connection';
import { ok, fail, notFound, serverError } from '../utils/response';
import { RowDataPacket } from 'mysql2';

/* ══════════════════════════════════════════════════════════
   GET /api/diagnostico
   Devuelve:
   - Si el alumno ya tiene ruta personalizada → bloqueado
   - Si no → devuelve las preguntas del diagnóstico
     (se toman N preguntas aleatorias por eje, sin respuesta correcta)
══════════════════════════════════════════════════════════ */
export async function getDiagnostico(req: Request, res: Response) {
  try {
    const usuarioId = req.usuario!.sub;

    /* 1. Verificar si ya tiene ruta personalizada asignada */
    const [rutaRows] = await pool.query<RowDataPacket[]>(
      `SELECT ra.idRuta, ra.nombre, ra.lecciones, u.idRuta AS idRutaUsuario
       FROM usuarios u
       JOIN rutas_aprendizaje ra ON ra.idRuta = u.idRuta
       WHERE u.idUsuario = ?
       LIMIT 1`,
      [usuarioId]
    );

    if (rutaRows[0]) {
      const ruta = rutaRows[0] as any;
      /* Si la ruta tiene nombre que indica que es personalizada, bloquear */
      const esPersonalizada = ruta.nombre?.startsWith('RUTA_DIAGNOSTICO_');
      if (esPersonalizada) {
        return ok(res, {
          bloqueado:       true,
          motivo:          'El diagnóstico ya fue realizado y se asignó una ruta personalizada.',
          rutaAsignada:    ruta.nombre,
          lecciones:       typeof ruta.lecciones === 'string'
                            ? JSON.parse(ruta.lecciones)
                            : ruta.lecciones,
        });
      }
    }

    /* 2. Obtener idCurso del alumno */
    const [cursoRows] = await pool.query<RowDataPacket[]>(
      `SELECT ra.idCurso
       FROM rutas_aprendizaje ra
       JOIN usuarios u ON u.idRuta = ra.idRuta
       WHERE u.idUsuario = ?
       LIMIT 1`,
      [usuarioId]
    );
    if (!cursoRows[0]) return notFound(res, 'El usuario no tiene curso asignado');
    const idCurso = (cursoRows[0] as any).idCurso;

    /* 3. Obtener todos los ejes del curso */
    const [ejesRows] = await pool.query<RowDataPacket[]>(
      `SELECT idEje, nombre, codigoEje
       FROM ejes
       WHERE idCurso = ? AND estatus = 1
       ORDER BY idEje ASC`,
      [idCurso]
    );
    const ejes = ejesRows as any[];

    /* 4. Para cada eje, tomar preguntas aleatorias (5 por eje)
          Mezcladas con RAND() directamente en MySQL               */
    const PREGUNTAS_POR_EJE = 5;
    const preguntasPorEje: any[] = [];

    for (const eje of ejes) {
      const [pregRows] = await pool.query<RowDataPacket[]>(
        `SELECT
           p.idPregunta,
           p.idSeccion,
           p.idLeccion,
           p.pregunta,
           p.imagenPregunta,
           p.tipoPregunta,
           p.opcionesRespuesta
         FROM preguntas p
         JOIN secciones s ON s.idSeccion = p.idSeccion
         WHERE s.idEje = ? AND p.estatus = 1
         ORDER BY RAND()
         LIMIT ?`,
        [eje.idEje, PREGUNTAS_POR_EJE]
      );

      console.log(pregRows)

      const preguntas = (pregRows as any[]).map(p => ({
        idPregunta:     p.idPregunta,
        idSeccion:      p.idSeccion,
        idLeccion:      p.idLeccion,
        pregunta:       p.pregunta,
        imagenPregunta: p.imagenPregunta ?? null,
        tipoPregunta:   p.tipoPregunta,
        opciones: Array.isArray(p.opcionesRespuesta)
          ? p.opcionesRespuesta
          : (() => { try { return JSON.parse(p.opcionesRespuesta ?? '[]'); } catch { return []; } })(),
        /* respuestaCorrecta ← NUNCA se envía */
        eje: { idEje: eje.idEje, nombre: eje.nombre, codigoEje: eje.codigoEje },
      }));
      preguntasPorEje.push(...preguntas);
    }

    return ok(res, {
      bloqueado:      false,
      idCurso,
      totalPreguntas: preguntasPorEje.length,
      preguntas:      preguntasPorEje,
    });
  } catch (err) {
    return serverError(res, err);
  }
}

/* ══════════════════════════════════════════════════════════
   POST /api/diagnostico
   Recibe las respuestas, califica por eje, genera la ruta
   personalizada y la asigna al alumno.

   Body: { respuestas: [{ idPregunta, idSeccion, idLeccion, idEje, opcionId }] }
══════════════════════════════════════════════════════════ */
export async function enviarDiagnostico(req: Request, res: Response) {
  try {
    const usuarioId = req.usuario!.sub;

    /* 1. Verificar que no haya hecho el diagnóstico ya */
    const [rutaCheck] = await pool.query<RowDataPacket[]>(
      `SELECT ra.nombre
       FROM usuarios u
       JOIN rutas_aprendizaje ra ON ra.idRuta = u.idRuta
       WHERE u.idUsuario = ?
       LIMIT 1`,
      [usuarioId]
    );
    if ((rutaCheck[0] as any)?.nombre?.startsWith('RUTA_DIAGNOSTICO_')) {
      return fail(res, 'El diagnóstico ya fue realizado. No puedes repetirlo.', 409);
    }

    const { respuestas } = req.body as {
      respuestas: {
        idPregunta: number;
        idSeccion:  number;
        idLeccion:  number;
        idEje:      number;
        opcionId:   string;
      }[];
    };
    if (!Array.isArray(respuestas) || !respuestas.length) {
      return fail(res, 'Se requieren las respuestas del diagnóstico');
    }

    /* 2. Obtener respuestas correctas de todas las preguntas respondidas */
    const idPreguntas = respuestas.map(r => r.idPregunta);
    const [correctasRows] = await pool.query<RowDataPacket[]>(
      `SELECT idPregunta, respuestaCorrecta, idSeccion, idLeccion
       FROM preguntas
       WHERE idPregunta IN (${idPreguntas.join(',')})`,
      []
    );
    const correctaMap = new Map(
      (correctasRows as any[]).map(p => [p.idPregunta, p.respuestaCorrecta])
    );

    /* 3. Calificar y agrupar fallos por eje */
    interface EjeStats {
      total:    number;
      fallos:   number;
      secciones:Set<number>;
      lecciones:Set<number>;
    }
    const ejeStats = new Map<number, EjeStats>();

    for (const r of respuestas) {
      const correcta   = correctaMap.get(r.idPregunta);
      const esCorrecta = correcta !== undefined && correcta === r.opcionId;

      if (!ejeStats.has(r.idEje)) {
        ejeStats.set(r.idEje, { total: 0, fallos: 0, secciones: new Set(), lecciones: new Set() });
      }
      const stats = ejeStats.get(r.idEje)!;
      stats.total++;
      if (!esCorrecta) {
        stats.fallos++;
        stats.secciones.add(r.idSeccion);
        stats.lecciones.add(r.idLeccion);
      }
    }

    /* 4. Obtener info de lecciones para construir la ruta */
    const [todasLecciones] = await pool.query<RowDataPacket[]>(
      `SELECT
         l.idLeccion,
         l.nombre,
         l.codigoLeccion,
         l.idSeccion,
         s.idEje
       FROM lecciones l
       JOIN secciones s ON s.idSeccion = l.idSeccion
       JOIN ejes      e ON e.idEje     = s.idEje
       WHERE e.estatus = 1
       ORDER BY s.idEje, l.idSeccion, l.idLeccion`,
      []
    );
    const lecciones = todasLecciones as any[];

    /* ── Algoritmo de asignación ──────────────────────────
       Por cada eje, según % de fallos:
       · 0 fallos          → no incluir lecciones del eje
       · 1-49% de fallos   → solo las lecciones de secciones donde falló
       · ≥ 50% de fallos   → todas las lecciones del eje (refuerzo completo)
    ─────────────────────────────────────────────────────── */
    const leccionesRuta: { nombre: string; codigoLeccion: string; idLeccion: number }[] = [];
    const resumenEjes:   any[] = [];

    for (const [idEje, stats] of ejeStats.entries()) {
      const pctFallos = stats.total > 0 ? (stats.fallos / stats.total) * 100 : 0;

      resumenEjes.push({
        idEje,
        total:      stats.total,
        fallos:     stats.fallos,
        pctFallos:  Math.round(pctFallos),
        estrategia: pctFallos === 0    ? 'sin_refuerzo'
                  : pctFallos < 50    ? 'refuerzo_parcial'
                  :                     'refuerzo_completo',
      });

      if (pctFallos === 0) continue; // sin fallos → no se agrega nada

      const leccionesDelEje = lecciones.filter(l => l.idEje === idEje);

      if (pctFallos >= 50) {
        /* Refuerzo completo — todas las lecciones del eje */
        for (const l of leccionesDelEje) {
          if (!leccionesRuta.some(x => x.codigoLeccion === l.codigoLeccion)) {
            leccionesRuta.push({ nombre: l.nombre, codigoLeccion: l.codigoLeccion, idLeccion: l.idLeccion });
          }
        }
      } else {
        /* Refuerzo parcial — solo lecciones de las secciones donde falló */
        const seccionesFallidas = stats.secciones;
        for (const l of leccionesDelEje) {
          if (seccionesFallidas.has(l.idSeccion)) {
            if (!leccionesRuta.some(x => x.codigoLeccion === l.codigoLeccion)) {
              leccionesRuta.push({ nombre: l.nombre, codigoLeccion: l.codigoLeccion, idLeccion: l.idLeccion });
            }
          }
        }
      }
    }

    /* 5. Obtener idCurso */
    const [cursoRows] = await pool.query<RowDataPacket[]>(
      `SELECT ra.idCurso
       FROM rutas_aprendizaje ra
       JOIN usuarios u ON u.idRuta = ra.idRuta
       WHERE u.idUsuario = ?
       LIMIT 1`,
      [usuarioId]
    );
    const idCurso = (cursoRows[0] as any)?.idCurso ?? 1;

    /* 6. Calcular calificación global */
    const totalPreguntas  = respuestas.length;
    const totalCorrectas  = respuestas.filter(r => correctaMap.get(r.idPregunta) === r.opcionId).length;
    const calificacionGlobal = Math.round((totalCorrectas / totalPreguntas) * 100);

    /* 7. Crear la ruta en BD y asignarla al alumno */
    const conn = await (pool as any).getConnection();
    try {
      await conn.beginTransaction();

      const nombreRuta = `RUTA_DIAGNOSTICO_U${usuarioId}_${Date.now()}`;

      /* Si no hay lecciones a reforzar (excelente resultado) →
         crear ruta vacía indicando dominio completo            */
      const [rutaResult] = await conn.query(
        `INSERT INTO rutas_aprendizaje (idCurso, nombre, descripcion, lecciones, estatus)
         VALUES (?, ?, ?, ?, 1)`,
        [
          idCurso,
          nombreRuta,
          `Ruta personalizada generada por diagnóstico. Calificación: ${calificacionGlobal}%`,
          JSON.stringify(leccionesRuta),
        ]
      );
      const idRutaNueva = (rutaResult as any).insertId;

      /* Asignar la nueva ruta al usuario */
      await conn.query(
        `UPDATE usuarios SET idRuta = ? WHERE idUsuario = ?`,
        [idRutaNueva, usuarioId]
      );

      await conn.commit();

      return ok(res, {
        calificacionGlobal,
        totalPreguntas,
        totalCorrectas,
        resumenEjes,
        rutaGenerada: {
          idRuta:          idRutaNueva,
          nombre:          nombreRuta,
          totalLecciones:  leccionesRuta.length,
          lecciones:       leccionesRuta,
        },
        mensaje: leccionesRuta.length === 0
          ? '¡Excelente! Dominas todos los temas. Se te asignó una ruta de refuerzo mínimo.'
          : `Se generó tu ruta personalizada con ${leccionesRuta.length} lección(es) para reforzar.`,
      });
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  } catch (err) {
    return serverError(res, err);
  }
}
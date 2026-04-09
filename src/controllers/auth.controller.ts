import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import pool from '../db/connection';
import { signToken } from '../utils/jwt';
import { ok, fail, serverError, unauthorized } from '../utils/response';
import { RowDataPacket } from 'mysql2';

/* ── POST /api/auth/login ───────────────────────────────────
   Acepta login por nombreUsuario  O  por correo.
   JOIN: credenciales → usuarios → perfiles → roles           */
export async function login(req: Request, res: Response) {
  try {
    const { nombreUsuario, correo, contrasenia } = req.body as {
      nombreUsuario?: string;
      correo?:        string;
      contrasenia:    string;
    };

    /* Debe venir nombreUsuario O correo, y siempre contrasenia */
    if ((!nombreUsuario && !correo) || !contrasenia) {
      return fail(res, 'Se requiere (nombreUsuario o correo) y contrasenia');
    }

    /* Construir condición según qué campo llega */
    const campo = nombreUsuario?.includes("@") ? 'p.correo' : 'c.nombreUsuario';
    const valor = (nombreUsuario ?? correo!).trim().toLowerCase();

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
         c.idCredencial,
         c.contrasenia,
         c.nombreUsuario,
         c.estatusCredencial,
         u.idUsuario,
         u.idRol,
         u.idRuta,
         u.estatus        AS usuarioActivo,
         u.esConvenio,
         p.nombreCompleto,
         p.apellidos,
         p.correo,
         p.matricula,
         p.plantel,
         p.fechaExpiracion,
         r.nombre         AS nombreRol
       FROM credenciales c
       JOIN usuarios u ON u.idUsuario = c.idUsuario
       JOIN perfiles  p ON p.idPerfil  = u.idPerfil
       JOIN roles     r ON r.idRol     = u.idRol
       WHERE LOWER(${campo}) = ?
       LIMIT 1`,
      [valor]
    );

    const row = rows[0];

    /* Usuario no existe */
    if (!row) return unauthorized(res, 'Credenciales incorrectas');

    /* Cuenta desactivada */
    if (!row.usuarioActivo || !row.estatusCredencial) {
      return unauthorized(res, 'Cuenta desactivada. Contacta al administrador');
    }

    /* Cuenta expirada */
    const ahora = Math.floor(Date.now() / 1000);
    if (row.fechaExpiracion && row.fechaExpiracion < ahora) {
      return unauthorized(res, 'Tu acceso ha expirado. Contacta al administrador');
    }

    /* Verificar contraseña */
    const match = await bcrypt.compare(contrasenia, row.contrasenia);
    if (!match) return unauthorized(res, 'Credenciales incorrectas');

    /* Generar JWT */
    const token = signToken({
      sub:           row.idUsuario,
      correo:        row.correo,
      nombreUsuario: row.nombreUsuario,
      rol:           row.nombreRol,
    });

    return ok(res, {
      token,
      usuario: {
        idUsuario:      row.idUsuario,
        nombreCompleto: row.nombreCompleto,
        apellidos:      row.apellidos,
        correo:         row.correo,
        matricula:      row.matricula,
        plantel:        row.plantel,
        nombreUsuario:  row.nombreUsuario,
        rol:            row.nombreRol,
        esConvenio:     Boolean(row.esConvenio),
      },
    });
  } catch (err) {
    return serverError(res, err);
  }
}

/* ── GET /api/auth/me ───────────────────────────────────────
   Devuelve el perfil completo del usuario autenticado        */
export async function me(req: Request, res: Response) {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT
         u.idUsuario,
         u.idRol,
         u.idRuta,
         u.estatus,
         u.esConvenio,
         p.idPerfil,
         p.nombreCompleto,
         p.apellidos,
         p.correo,
         p.curp,
         p.matricula,
         p.numeroTelefono,
         p.plantel,
         p.fechaRegistro,
         p.fechaExpiracion,
         c.nombreUsuario,
         r.nombre  AS nombreRol,
         ra.nombre AS nombreRuta
       FROM usuarios u
       JOIN perfiles         p  ON p.idPerfil  = u.idPerfil
       JOIN credenciales     c  ON c.idUsuario  = u.idUsuario
       JOIN roles            r  ON r.idRol      = u.idRol
       JOIN rutas_aprendizaje ra ON ra.idRuta   = u.idRuta
       WHERE u.idUsuario = ? AND u.estatus = 1
       LIMIT 1`,
      [req.usuario!.sub]
    );

    if (!rows[0]) return unauthorized(res, 'Usuario no encontrado');

    const u = rows[0];
    return ok(res, {
      idUsuario:      u.idUsuario,
      nombreCompleto: u.nombreCompleto,
      apellidos:      u.apellidos,
      correo:         u.correo,
      curp:           u.curp,
      matricula:      u.matricula,
      numeroTelefono: u.numeroTelefono,
      plantel:        u.plantel,
      nombreUsuario:  u.nombreUsuario,
      rol:            u.nombreRol,
      ruta:           u.nombreRuta,
      esConvenio:     Boolean(u.esConvenio),
      fechaExpiracion: u.fechaExpiracion,
    });
  } catch (err) {
    return serverError(res, err);
  }
}
import { Response } from 'express';

export function ok<T>(res: Response, data: T, statusCode = 200) {
  return res.status(statusCode).json({ ok: true, data });
}

export function created<T>(res: Response, data: T) {
  return ok(res, data, 201);
}

export function fail(res: Response, message: string, statusCode = 400) {
  return res.status(statusCode).json({ ok: false, message });
}

export function notFound(res: Response, message = 'Recurso no encontrado') {
  return fail(res, message, 404);
}

export function unauthorized(res: Response, message = 'No autorizado') {
  return fail(res, message, 401);
}

export function forbidden(res: Response, message = 'Acceso denegado') {
  return fail(res, message, 403);
}

export function serverError(res: Response, err: unknown) {
  const msg = err instanceof Error ? err.message : 'Error interno del servidor';
  console.error('[ERROR]', err);
  return fail(res, msg, 500);
}

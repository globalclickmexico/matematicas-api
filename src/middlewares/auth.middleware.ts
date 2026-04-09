import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { unauthorized, forbidden } from '../utils/response';

/* Verifica que el token JWT sea válido */
export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return unauthorized(res, 'Token no proporcionado');
  }
  const token = header.slice(7);
  try {
    req.usuario = verifyToken(token);
    return next();
  } catch {
    return unauthorized(res, 'Token inválido o expirado');
  }
}

/* Verifica que el usuario tenga alguno de los roles indicados */
export function requireRol(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      return forbidden(res, `Se requiere rol: ${roles.join(' o ')}`);
    }
    return next();
  };
}

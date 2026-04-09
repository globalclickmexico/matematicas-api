import jwt from 'jsonwebtoken';
import { JwtPayload } from '../types';

const SECRET      = process.env.JWT_SECRET     || 'dev_secret_inseguro';
const EXPIRES_IN  = process.env.JWT_EXPIRES_IN || '7d';

export function signToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN } as jwt.SignOptions);
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, SECRET) as unknown as JwtPayload;
}

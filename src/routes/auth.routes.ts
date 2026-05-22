import { Router } from 'express';
import { login, me, recuperarCredenciales, resetPassword } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router: Router = Router();

// POST /api/auth/login
router.post('/login', login);

// GET  /api/auth/me
router.get('/me', authMiddleware, me);

// POST /api/auth/recuperar-credenciales
router.post('/recuperar-credenciales', recuperarCredenciales);

// POST /api/auth/reset-password
router.post('/reset-password', resetPassword);

export default router;

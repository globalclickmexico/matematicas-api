import { Router } from 'express';
import { login, me } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router: Router = Router();

// POST /api/auth/login
router.post('/login', login);

// GET  /api/auth/me
router.get('/me', authMiddleware, me);

export default router;

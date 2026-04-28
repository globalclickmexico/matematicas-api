import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { getInsignias, validarInsignia } from '../controllers/insignias.controller';

const router: Router = Router();

// GET  /api/insignias                     — recuperar las insignias del perfil
router.get('/',                            authMiddleware, getInsignias);

// POST /api/insignias/validar  — valida y registra en caso de no estar
router.post('/validar',             authMiddleware, validarInsignia);

export default router;
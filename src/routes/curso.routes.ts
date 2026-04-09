import { Router } from 'express';
import { getEjes, getLeccion } from '../controllers/curso.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router: Router = Router();

// GET /api/ejes  — árbol completo del curso con progreso
router.get('/',     authMiddleware, getEjes);

// GET /api/lecciones/:id  — detalle de una lección
router.get('/:id',  authMiddleware, getLeccion);

export default router;

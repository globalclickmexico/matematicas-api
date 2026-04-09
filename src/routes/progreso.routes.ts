import { Router } from 'express';
import { marcarLeccionVista, getProgreso } from '../controllers/progreso.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router: Router = Router();

// GET  /api/progreso                     — resumen de progreso del alumno
router.get('/',                            authMiddleware, getProgreso);

// POST /api/progreso/leccion/:idLeccion  — marcar lección como vista
router.post('/leccion/:idLeccion',         authMiddleware, marcarLeccionVista);

export default router;
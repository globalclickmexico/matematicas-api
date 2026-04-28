import { Router } from 'express';
import { marcarLeccionVista, getProgreso, getUltimaLeccion, getSiguienteLeccion } from '../controllers/progreso.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router: Router = Router();

// GET  /api/progreso                     — resumen de progreso del alumno
router.get('/',                            authMiddleware, getProgreso);

// GET  /api/progreso/ultima-leccion        — última lección vista
router.get('/ultima-leccion',      authMiddleware, getUltimaLeccion);

// GET  /api/progreso/siguiente-leccion        — siguiente leccion a ver
router.post('/siguiente-leccion',      authMiddleware, getSiguienteLeccion);

// POST /api/progreso/leccion/:idLeccion  — marcar lección como vista
router.post('/leccion/:idLeccion',         authMiddleware, marcarLeccionVista);

export default router;
import { Router } from 'express';
import { enviarEvaluacion, getHistorial, getPreguntasByIdLeccion } from '../controllers/evaluacion.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router: Router = Router();

// POST /api/evaluaciones/leccion/:idLeccion             — enviar y calificar
router.post('/leccion/:idLeccion',          authMiddleware, enviarEvaluacion);

// GET  /api/evaluaciones/leccion/:idLeccion/historial   — historial del alumno
router.get('/leccion/:idLeccion/historial', authMiddleware, getHistorial);

router.get('/leccion/:idLeccion', authMiddleware, getPreguntasByIdLeccion);

export default router;
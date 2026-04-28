import { Router } from 'express';

import { authMiddleware } from '../middlewares/auth.middleware';
import { enviarEvaluacionSeccion, getEvaluacionSeccion } from '../controllers/evaluacion-seccion.controller';

const router: Router = Router();


// GET  /api/evaluaciones/seccion/:idSeccion  — preguntas + último resultado
router.get('/:idSeccion',  authMiddleware, getEvaluacionSeccion);

// POST /api/evaluaciones/seccion/:idSeccion  — calificar y guardar (sobreescribe)
router.post('/:idSeccion', authMiddleware, enviarEvaluacionSeccion);

export default router;
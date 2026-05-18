import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { enviarDiagnostico, getDiagnostico } from '../controllers/diagnostico.controller';

const router :Router = Router();

// GET  /api/diagnostico  — obtener preguntas (o saber si ya está bloqueado)
router.get('/',  authMiddleware, getDiagnostico);

// POST /api/diagnostico  — enviar respuestas, generar y asignar ruta
router.post('/', authMiddleware, enviarDiagnostico);

export default router;
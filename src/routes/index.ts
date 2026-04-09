import { Router } from 'express';
import authRoutes      from './auth.routes';
import cursoRoutes     from './curso.routes';
import progresoRoutes  from './progreso.routes';
import evaluacionRoutes from './evaluacion.routes';

const router: Router = Router();

router.use('/auth',        authRoutes);
router.use('/ejes',        cursoRoutes);
router.use('/lecciones',   cursoRoutes);
router.use('/progreso',    progresoRoutes);
router.use('/evaluaciones', evaluacionRoutes);

/* Health check */
router.get('/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));

export default router;

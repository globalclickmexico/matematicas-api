import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { testConnection } from './db/connection';
import routes from './routes';

dotenv.config();

const app: any  = express();
const PORT = Number(process.env.PORT) || 4000;

/* ── Seguridad ──────────────────────────────────────────────── */
app.use(helmet());

/* ── CORS ───────────────────────────────────────────────────── */
app.use(cors({
  origin:      '*',
  credentials: false,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

/* ── Body parsing ───────────────────────────────────────────── */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ── Logger ─────────────────────────────────────────────────── */
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
}

/* ── Rutas ──────────────────────────────────────────────────── */
app.use('/api', routes);

/* ── 404 ────────────────────────────────────────────────────── */
app.use((_req: Request, res: Response, _next: NextFunction) => {
  res.status(404).json({ ok: false, message: 'Ruta no encontrada' });
});

/* ── Error handler global ───────────────────────────────────── */
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[UNHANDLED]', err);
  res.status(500).json({ ok: false, message: 'Error interno del servidor' });
});

/* ── Arrancar ───────────────────────────────────────────────── */
async function main() {
  await testConnection();
  app.listen(PORT, () => {
    console.log(`\n🚀 CursoMATE API corriendo en http://localhost:${PORT}`);
    console.log(`   Entorno : ${process.env.NODE_ENV ?? 'development'}`);
    console.log(`   Base URL: http://localhost:${PORT}/api\n`);
  });
}

main().catch((err) => {
  console.error('Error al iniciar la API:', err);
  process.exit(1);
});

export default app;

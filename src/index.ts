import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import positionRoutes from './routes/position';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT ?? 3333;

// ─── Middlewares de segurança ──────────────────────────────────────────────────
app.use(helmet());
app.use(express.json());

// Rate limit — protege o consolidador de abusos internos
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 120,            // 120 req/min por IP
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Muitas requisições. Tente novamente.' } },
});
app.use(limiter);

// ─── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    institutions: ['BTG', 'XP'],
  });
});

// ─── Rotas ─────────────────────────────────────────────────────────────────────
app.use('/api/v1/position', positionRoutes);

// ─── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Rota não encontrada' } });
});

// ─── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`🚀 Financial Consolidator rodando na porta ${PORT}`);
  logger.info(`📊 Instituições disponíveis: BTG Pactual, XP Investimentos`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;

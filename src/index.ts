import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import positionRoutes from './routes/position';
import agoraRoutes from './routes/agora';
import avenueRoutes from './routes/avenue'; // 1. IMPORTAR A ROTA DA AVENUE
import { logger } from './utils/logger';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT ?? 3333;

// ─── Middlewares de segurança ──────────────────────────────────────────────────
app.use(helmet());
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Muitas requisições. Tente novamente.' } },
});
app.use(limiter);

// ─── Health check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    institutions: ['BTG', 'XP', 'AGORA', 'AVENUE'], // Adicionado Avenue ao Health Check
  });
});

// ─── Auth: segredo compartilhado com as edge functions do Supabase ──────────────
// Tudo abaixo (as rotas /api/v1) exige o header x-api-key. O /health acima fica livre.
const CONSOLIDATOR_SECRET = process.env.CONSOLIDATOR_SECRET;
if (!CONSOLIDATOR_SECRET) {
  logger.warn('⚠️  CONSOLIDATOR_SECRET não configurado — canal SEM proteção (defina a env var).');
}
app.use((req, res, next) => {
  if (!CONSOLIDATOR_SECRET) return next(); // tolerante durante a transição (sem env)
  if (req.get('x-api-key') !== CONSOLIDATOR_SECRET) {
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Unauthorized' } });
  }
  next();
});

// ─── Rotas ─────────────────────────────────────────────────────────────────────
app.use('/api/v1/position', positionRoutes);
app.use('/api/v1/agora', agoraRoutes);
app.use('/api/v1/avenue', avenueRoutes); // 2. PENDURAR A ROTA COM O PREFIXO DA API

// ─── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Rota não encontrada' } });
});

// ─── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`🚀 Financial Consolidator rodando na porta ${PORT}`);
  logger.info(`📊 Instituições disponíveis: BTG Pactual, XP Investimentos, Ágora, Avenue`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
});

export default app;
import { Router, Request, Response, NextFunction } from 'express';
import { getAvenueActiveClients } from '../connectors/avenue/activeClients';
import { getAvenueAuc } from '../connectors/avenue/auc';
import { getAvenueCashBalance } from '../connectors/avenue/cashBalance';
import { ConsolidatorError } from '../types';
import { logger } from '../utils/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Avenue Routes
// Base: /avenue
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();

// Helpers
function getDateParam(req: Request): string {
  // Aceita ?date=YYYY-MM-DD ou usa hoje como default
  const raw = req.query.date as string | undefined;
  if (raw) return raw;
  return new Date().toISOString().split('T')[0];
}

function handleError(err: any, res: Response) {
  if (err instanceof ConsolidatorError) {
    logger.warn(`Avenue route error [${err.code}]: ${err.message}`);
    return res.status(err.statusCode).json({ error: err.code, message: err.message, institution: err.institution });
  }
  logger.error('Avenue route unexpected error', err);
  return res.status(502).json({ error: 'AVENUE_UNEXPECTED_ERROR', message: 'Erro inesperado na integração Avenue' });
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /avenue/active-clients?date=YYYY-MM-DD
// Lista de clientes ativos/inativos na data informada
// ─────────────────────────────────────────────────────────────────────────────
router.get('/active-clients', async (req: Request, res: Response) => {
  try {
    const date = getDateParam(req);
    const data = await getAvenueActiveClients(date);
    return res.json({ source: 'AVENUE', date, count: data.length, data });
  } catch (err) {
    return handleError(err, res);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /avenue/auc?date=YYYY-MM-DD
// Custódia (Assets Under Custody) por produto e cliente na data informada
// ─────────────────────────────────────────────────────────────────────────────
router.get('/auc', async (req: Request, res: Response) => {
  try {
    const date = getDateParam(req);
    const data = await getAvenueAuc(date);
    return res.json({ source: 'AVENUE', date, count: data.length, data });
  } catch (err) {
    return handleError(err, res);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /avenue/cash-balance?date=YYYY-MM-DD
// Saldo em caixa por conta (banking USD, EUR, Clearing, Brasil) na data informada
// ─────────────────────────────────────────────────────────────────────────────
router.get('/cash-balance', async (req: Request, res: Response) => {
  try {
    const date = getDateParam(req);
    const data = await getAvenueCashBalance(date);
    return res.json({ source: 'AVENUE', date, count: data.length, data });
  } catch (err) {
    return handleError(err, res);
  }
});

export default router;

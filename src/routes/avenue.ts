import { Router, Request, Response } from 'express';
import { getAvenueAuc } from '../connectors/avenue/auc';
import { ConsolidatorError } from '../types';
import { logger } from '../utils/logger';
import { parseCpfCnpj } from '../utils/validation';

// ─────────────────────────────────────────────────────────────────────────────
// Avenue Routes
// Base: /avenue
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function getDateParam(req: Request): string {
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
// GET /avenue/auc?date=YYYY-MM-DD&cpf=XXX
// Custódia por produto e cliente na data informada
// ?cpf é opcional — se informado, filtra apenas os ativos daquele cliente
// ─────────────────────────────────────────────────────────────────────────────
router.get('/auc', async (req: Request, res: Response) => {
  try {
    const date = getDateParam(req);
    const cpfRaw = req.query.cpf as string | undefined;
    const cpf = cpfRaw ? parseCpfCnpj(cpfRaw, 'cpf') : undefined;
    const data = await getAvenueAuc(date, cpf);
    return res.json({ source: 'AVENUE', date, cpf: cpf ?? null, count: data.length, data });
  } catch (err) {
    return handleError(err, res);
  }
});

export default router;

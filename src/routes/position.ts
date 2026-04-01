import { Router, Request, Response } from 'express';
import {
  getPositionByInstitution,
  getConsolidatedPosition,
} from '../services/positionService';
import { cacheService } from '../cache';
import { ApiResponse, Institution, ConsolidatorError } from '../types';
import { logger } from '../utils/logger';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/position/btg/:accountNumber
// Posição de uma conta no BTG Pactual
// ─────────────────────────────────────────────────────────────────────────────
router.get('/btg/:accountNumber', async (req: Request, res: Response) => {
  const { accountNumber } = req.params;

  try {
    const data = await getPositionByInstitution('BTG', accountNumber);
    const response: ApiResponse<typeof data> = {
      success: true,
      data,
      meta: { fetchedAt: new Date().toISOString() },
    };
    return res.json(response);
  } catch (err) {
    return handleError(err, res, 'BTG');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/position/xp/:accountNumber
// Posição de uma conta na XP Investimentos
// ─────────────────────────────────────────────────────────────────────────────
router.get('/xp/:accountNumber', async (req: Request, res: Response) => {
  const { accountNumber } = req.params;

  try {
    const data = await getPositionByInstitution('XP', accountNumber);
    const response: ApiResponse<typeof data> = {
      success: true,
      data,
      meta: { fetchedAt: new Date().toISOString() },
    };
    return res.json(response);
  } catch (err) {
    return handleError(err, res, 'XP');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/position/consolidated/:accountNumber
// Posição consolidada de múltiplas instituições
// Query param: ?institutions=BTG,XP (padrão: todas)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/consolidated/:accountNumber', async (req: Request, res: Response) => {
  const { accountNumber } = req.params;
  const institutionsParam = req.query.institutions as string | undefined;

  const institutions: Institution[] = institutionsParam
    ? (institutionsParam.split(',').map((i) => i.trim().toUpperCase()) as Institution[])
    : ['BTG', 'XP'];

  try {
    const data = await getConsolidatedPosition(accountNumber, institutions);
    const response: ApiResponse<typeof data> = {
      success: true,
      data,
      meta: { fetchedAt: new Date().toISOString() },
    };
    return res.json(response);
  } catch (err) {
    return handleError(err, res);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/v1/position/cache
// Limpa o cache manualmente (útil para forçar atualização)
// ─────────────────────────────────────────────────────────────────────────────
router.delete('/cache', (_req: Request, res: Response) => {
  cacheService.flush();
  logger.info('Cache limpo manualmente via API');
  return res.json({ success: true, message: 'Cache limpo com sucesso' });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/position/cache/stats
// ─────────────────────────────────────────────────────────────────────────────
router.get('/cache/stats', (_req: Request, res: Response) => {
  return res.json({ success: true, data: cacheService.stats() });
});

// ── Error handler ─────────────────────────────────────────────────────────────

function handleError(err: unknown, res: Response, institution?: Institution) {
  if (err instanceof ConsolidatorError) {
    logger.warn(`ConsolidatorError: ${err.code} — ${err.message}`);
    const response: ApiResponse<null> = {
      success: false,
      error: { code: err.code, message: err.message, institution: err.institution ?? institution },
    };
    return res.status(err.statusCode).json(response);
  }

  logger.error('Erro inesperado', { err });
  const response: ApiResponse<null> = {
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor' },
  };
  return res.status(500).json(response);
}

export default router;

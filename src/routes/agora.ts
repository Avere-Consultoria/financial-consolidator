import { Router, Request, Response } from 'express';
import {
  getAgoraConsolidatedPosition,
  getAgoraSummary,
  getAgoraListSummaryLessPrev,
} from '../connectors/agora/consolidatedPosition';
import { ApiResponse, ConsolidatorError } from '../types';
import { logger } from '../utils/logger';

const router = Router();

function handleError(res: Response, err: unknown) {
  if (err instanceof ConsolidatorError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, institution: err.institution },
    });
  }
  logger.error('Ágora: erro inesperado', { err });
  return res.status(500).json({
    success: false,
    error: { code: 'AGORA_UNKNOWN_ERROR', message: 'Erro inesperado na integração Ágora' },
  });
}

// GET /api/v1/agora/position/:cpfCnpj/:accountCode
// Posição consolidada completa (listsummary)
router.get('/position/:cpfCnpj/:accountCode', async (req: Request, res: Response) => {
  try {
    const { cpfCnpj, accountCode } = req.params;
    const data = await getAgoraConsolidatedPosition(cpfCnpj, accountCode);
    res.json({ success: true, data, meta: { fetchedAt: new Date().toISOString() } });
  } catch (err) { handleError(res, err); }
});

// GET /api/v1/agora/position/:cpfCnpj/:accountCode/summary
// Posição agrupada por classe de ativo
router.get('/position/:cpfCnpj/:accountCode/summary', async (req: Request, res: Response) => {
  try {
    const { cpfCnpj, accountCode } = req.params;
    const data = await getAgoraSummary(cpfCnpj, accountCode);
    res.json({ success: true, data, meta: { fetchedAt: new Date().toISOString() } });
  } catch (err) { handleError(res, err); }
});

// GET /api/v1/agora/position/:cpfCnpj/:accountCode/less-prev
// Posição consolidada sem dados projetados
router.get('/position/:cpfCnpj/:accountCode/less-prev', async (req: Request, res: Response) => {
  try {
    const { cpfCnpj, accountCode } = req.params;
    const data = await getAgoraListSummaryLessPrev(cpfCnpj, accountCode);
    res.json({ success: true, data, meta: { fetchedAt: new Date().toISOString() } });
  } catch (err) { handleError(res, err); }
});

export default router;
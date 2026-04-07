import { Router, Request, Response } from 'express';
import axios from 'axios';
import {
  getAgoraConsolidatedPosition,
  getAgoraSummary,
  getAgoraListSummaryLessPrev,
} from '../connectors/agora/consolidatedPosition';
import { getAgoraBaseUrl, getAgoraHeaders, getAgoraHttpsAgent } from '../connectors/agora/auth';
import { ConsolidatorError } from '../types';
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
router.get('/position/:cpfCnpj/:accountCode', async (req: Request, res: Response) => {
  try {
    const { cpfCnpj, accountCode } = req.params;
    const data = await getAgoraConsolidatedPosition(cpfCnpj, accountCode);
    res.json({ success: true, data, meta: { fetchedAt: new Date().toISOString() } });
  } catch (err) { handleError(res, err); }
});

// GET /api/v1/agora/position/:cpfCnpj/:accountCode/summary
router.get('/position/:cpfCnpj/:accountCode/summary', async (req: Request, res: Response) => {
  try {
    const { cpfCnpj, accountCode } = req.params;
    const data = await getAgoraSummary(cpfCnpj, accountCode);
    res.json({ success: true, data, meta: { fetchedAt: new Date().toISOString() } });
  } catch (err) { handleError(res, err); }
});

// GET /api/v1/agora/position/:cpfCnpj/:accountCode/less-prev
router.get('/position/:cpfCnpj/:accountCode/less-prev', async (req: Request, res: Response) => {
  try {
    const { cpfCnpj, accountCode } = req.params;
    const data = await getAgoraListSummaryLessPrev(cpfCnpj, accountCode);
    res.json({ success: true, data, meta: { fetchedAt: new Date().toISOString() } });
  } catch (err) { handleError(res, err); }
});

// GET /api/v1/agora/debug/:cpfCnpj/:accountCode
// Rota temporária — ver response raw da Ágora
router.get('/debug/:cpfCnpj/:accountCode', async (req: Request, res: Response) => {
  try {
    const { cpfCnpj, accountCode } = req.params;
    const headers = await getAgoraHeaders();
    const { data } = await axios.post(
      `${getAgoraBaseUrl()}/managers-portfolio-mgmt/v1/listsummary/${cpfCnpj}/${accountCode}`,
      {},
      { headers, httpsAgent: getAgoraHttpsAgent() }
    );
    res.json({ success: true, raw: data });
  } catch (err: any) {
    res.json({ success: false, error: err?.response?.data ?? err.message });
  }
});

export default router;
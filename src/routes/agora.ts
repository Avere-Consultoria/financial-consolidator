import { Router, Request, Response } from 'express';
import {
  getAgoraSummary,
  getAgoraListSummaryLessPrev,
} from '../connectors/agora/consolidatedPosition';
import { ConsolidatorError } from '../types';
import { logger } from '../utils/logger';
import { getInvestorCode } from '../connectors/agora/investor';
import { parseCpfCnpj } from '../utils/validation';

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

// GET /api/v1/agora/position/:cpfCnpj/:accountCode/summary
router.get('/position/:cpfCnpj/:accountCode/summary', async (req: Request, res: Response) => {
  try {
    const { cpfCnpj, accountCode } = req.params;
    const cleanCpf = parseCpfCnpj(cpfCnpj, 'cpfCnpj');
    const cleanAccount = accountCode.replace(/\D/g, '');
    const data = await getAgoraSummary(cleanCpf, cleanAccount);
    res.json({ success: true, data, meta: { fetchedAt: new Date().toISOString() } });
  } catch (err) { handleError(res, err); }
});

// GET /api/v1/agora/position/:cpfCnpj/:accountCode/less-prev
router.get('/position/:cpfCnpj/:accountCode/less-prev', async (req: Request, res: Response) => {
  try {
    const { cpfCnpj, accountCode } = req.params;
    const cleanCpf = parseCpfCnpj(cpfCnpj, 'cpfCnpj');
    const cleanAccount = accountCode.replace(/\D/g, '');
    const data = await getAgoraListSummaryLessPrev(cleanCpf, cleanAccount);
    res.json({ success: true, data, meta: { fetchedAt: new Date().toISOString() } });
  } catch (err) { handleError(res, err); }
});

// GET /api/v1/agora/investor/:cpfCnpj
router.get('/investor/:cpfCnpj', async (req: Request, res: Response) => {
  try {
    const { cpfCnpj } = req.params;
    const cleanCpf = parseCpfCnpj(cpfCnpj, 'cpfCnpj');
    const data = await getInvestorCode(cleanCpf);
    res.json({ success: true, data, meta: { fetchedAt: new Date().toISOString() } });
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
import { Router, Request, Response } from 'express';
import {
  getAgoraDetailedPosition,
  getDetailedEquities,
  getDetailedFixedIncome,
  getDetailedTreasuryDirect,
  getDetailedFunds,
  getDetailedCoe,
  getDetailedOptions,
  getDetailedFutures,
  getDetailedBtc,
  getDetailedTerm,
} from '../connectors/agora/detailedPosition';
import { ApiResponse, ConsolidatorError } from '../types';
import { logger } from '../utils/logger';

const router = Router();

function handleError(res: Response, err: unknown) {
  if (err instanceof ConsolidatorError) {
    res.status(err.statusCode).json({
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

// ─── Posição completa (todas as classes em paralelo) ──────────────────────────
// GET /api/v1/agora/position/:cpfCnpj/:accountCode
router.get('/position/:cpfCnpj/:accountCode', async (req: Request, res: Response) => {
  try {
    const { cpfCnpj, accountCode } = req.params;
    const data = await getAgoraDetailedPosition(cpfCnpj, accountCode);
    res.json({
      success: true,
      data,
      meta: { fetchedAt: new Date().toISOString() },
    });
  } catch (err) { handleError(res, err); }
});

// ─── Por classe de ativo ──────────────────────────────────────────────────────
// GET /api/v1/agora/position/:cpfCnpj/:accountCode/equities
router.get('/position/:cpfCnpj/:accountCode/equities', async (req: Request, res: Response) => {
  try {
    const { cpfCnpj, accountCode } = req.params;
    const data = await getDetailedEquities(cpfCnpj, accountCode);
    res.json({ success: true, data, meta: { fetchedAt: new Date().toISOString() } });
  } catch (err) { handleError(res, err); }
});

// GET /api/v1/agora/position/:cpfCnpj/:accountCode/fixed-income
router.get('/position/:cpfCnpj/:accountCode/fixed-income', async (req: Request, res: Response) => {
  try {
    const { cpfCnpj, accountCode } = req.params;
    const data = await getDetailedFixedIncome(cpfCnpj, accountCode);
    res.json({ success: true, data, meta: { fetchedAt: new Date().toISOString() } });
  } catch (err) { handleError(res, err); }
});

// GET /api/v1/agora/position/:cpfCnpj/:accountCode/treasury
router.get('/position/:cpfCnpj/:accountCode/treasury', async (req: Request, res: Response) => {
  try {
    const { cpfCnpj, accountCode } = req.params;
    const data = await getDetailedTreasuryDirect(cpfCnpj, accountCode);
    res.json({ success: true, data, meta: { fetchedAt: new Date().toISOString() } });
  } catch (err) { handleError(res, err); }
});

// GET /api/v1/agora/position/:cpfCnpj/:accountCode/funds
router.get('/position/:cpfCnpj/:accountCode/funds', async (req: Request, res: Response) => {
  try {
    const { cpfCnpj, accountCode } = req.params;
    const data = await getDetailedFunds(cpfCnpj, accountCode);
    res.json({ success: true, data, meta: { fetchedAt: new Date().toISOString() } });
  } catch (err) { handleError(res, err); }
});

// GET /api/v1/agora/position/:cpfCnpj/:accountCode/coe
router.get('/position/:cpfCnpj/:accountCode/coe', async (req: Request, res: Response) => {
  try {
    const { cpfCnpj, accountCode } = req.params;
    const data = await getDetailedCoe(cpfCnpj, accountCode);
    res.json({ success: true, data, meta: { fetchedAt: new Date().toISOString() } });
  } catch (err) { handleError(res, err); }
});

// GET /api/v1/agora/position/:cpfCnpj/:accountCode/options
router.get('/position/:cpfCnpj/:accountCode/options', async (req: Request, res: Response) => {
  try {
    const { cpfCnpj, accountCode } = req.params;
    const data = await getDetailedOptions(cpfCnpj, accountCode);
    res.json({ success: true, data, meta: { fetchedAt: new Date().toISOString() } });
  } catch (err) { handleError(res, err); }
});

// GET /api/v1/agora/position/:cpfCnpj/:accountCode/futures
router.get('/position/:cpfCnpj/:accountCode/futures', async (req: Request, res: Response) => {
  try {
    const { cpfCnpj, accountCode } = req.params;
    const data = await getDetailedFutures(cpfCnpj, accountCode);
    res.json({ success: true, data, meta: { fetchedAt: new Date().toISOString() } });
  } catch (err) { handleError(res, err); }
});

// GET /api/v1/agora/position/:cpfCnpj/:accountCode/btc
router.get('/position/:cpfCnpj/:accountCode/btc', async (req: Request, res: Response) => {
  try {
    const { cpfCnpj, accountCode } = req.params;
    const data = await getDetailedBtc(cpfCnpj, accountCode);
    res.json({ success: true, data, meta: { fetchedAt: new Date().toISOString() } });
  } catch (err) { handleError(res, err); }
});

// GET /api/v1/agora/position/:cpfCnpj/:accountCode/term
router.get('/position/:cpfCnpj/:accountCode/term', async (req: Request, res: Response) => {
  try {
    const { cpfCnpj, accountCode } = req.params;
    const data = await getDetailedTerm(cpfCnpj, accountCode);
    res.json({ success: true, data, meta: { fetchedAt: new Date().toISOString() } });
  } catch (err) { handleError(res, err); }
});

export default router;
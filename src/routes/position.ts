import { Router, Request, Response } from 'express';
import {
  getPositionByInstitution,
  getConsolidatedPosition,
} from '../services/positionService';
import { cacheService } from '../cache';
import { ApiResponse, Institution, ConsolidatorError } from '../types';
import { logger } from '../utils/logger';
import { getAgoraDetailedPosition } from '../connectors/agora/detailedPosition';
import { getAvenuePosition } from '../connectors/avenue/position';
import { parseCpfCnpj } from '../utils/validation';
import axios from 'axios';
import { getXpToken, getXpBaseUrl, getXpHttpsAgent } from '../connectors/xp/auth';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// TEMP DEBUG — JSON cru da XP (consolidated-positions). Protegido pelo x-api-key
// global. Roda do IP fixo do Railway. REMOVER após mapear a estrutura.
//   GET /api/v1/position/debug/xp-raw/:acc   (header x-api-key)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/debug/xp-raw/:acc', async (req: Request, res: Response) => {
  try {
    const token = await getXpToken();
    const r = await axios.get(
      `${getXpBaseUrl()}/data-access/api/v1/consolidated-positions/customer/${req.params.acc}`,
      {
        httpsAgent: getXpHttpsAgent(),
        timeout: 45_000,
        headers: {
          'Ocp-Apim-Subscription-Key': process.env.XP_SUBSCRIPTION_KEY,
          Authorization: `Bearer ${token}`,
          'User-Agent': 'XPparceiro/AvereConsultoria',
          Accept: '*/*',
          'Content-Type': 'application/json',
        },
      },
    );
    return res.json(r.data);            // JSON cru, sem mapear
  } catch (e: any) {
    return res.status(e?.response?.status ?? 500).json({
      message: e?.message,
      xpData: e?.response?.data ?? null,
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// TEMP DEBUG — endpoints ESTÁTICOS da XP (sem cold-start), p/ avaliar troca.
// Todos protegidos pelo x-api-key global e rodando do IP fixo do Railway.
// JSON cru, sem mapear. REMOVER após decidir a migração.
// ─────────────────────────────────────────────────────────────────────────────

const XP_HEADERS = (token: string) => ({
  'Ocp-Apim-Subscription-Key': process.env.XP_SUBSCRIPTION_KEY,
  Authorization: `Bearer ${token}`,
  'User-Agent': 'XPparceiro/AvereConsultoria',
  Accept: '*/*',
  'Content-Type': 'application/json',
});
const ymd = (d: Date) => d.toISOString().slice(0, 10);
const XP_V2_PRODUCT_TYPES = ['Coe', 'Treasury', 'Cash', 'Stock', 'TradedFunds', 'Repo', 'FixedIncome', 'PensionFunds', 'Fund'];

// Posição V2 (ESTÁTICA, D-3) por conta. Mesmo modelo por-conta do atual, sem recálculo.
//   GET /api/v1/position/debug/xp-v2/:acc?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
router.get('/debug/xp-v2/:acc', async (req: Request, res: Response) => {
  try {
    const hoje = new Date();
    const endDate   = (req.query.endDate   as string) || ymd(hoje);
    const startDate = (req.query.startDate as string) || ymd(new Date(hoje.getTime() - 7 * 86_400_000));
    const qs = new URLSearchParams({ startDate, endDate });
    for (const pt of XP_V2_PRODUCT_TYPES) qs.append('productTypes', pt);

    const token = await getXpToken();
    const r = await axios.get(
      `${getXpBaseUrl()}/data-access/api/v2/positions/customers/${req.params.acc}?${qs.toString()}`,
      { httpsAgent: getXpHttpsAgent(), timeout: 45_000, headers: XP_HEADERS(token) },
    );
    return res.json(r.data);
  } catch (e: any) {
    return res.status(e?.response?.status ?? 500).json({ message: e?.message, xpData: e?.response?.data ?? null });
  }
});

// Custódia / AUC (D-1, LOTE: todas as contas do escritório de uma vez). Star-schema OData.
//   GET /api/v1/position/debug/xp-auc?date=YYYY-MM-DD&top=10000
router.get('/debug/xp-auc', async (req: Request, res: Response) => {
  try {
    const dia  = (req.query.date as string) || ymd(new Date(Date.now() - 86_400_000)); // D-1
    const prox = ymd(new Date(new Date(`${dia}T00:00:00Z`).getTime() + 86_400_000));
    const qs = new URLSearchParams({
      $filter: `(dimTimeCode ge ${dia}T00:00:00Z and dimTimeCode lt ${prox}T00:00:00Z)`,
      $top: (req.query.top as string) || '10000',
    });

    const token = await getXpToken();
    const r = await axios.get(
      `${getXpBaseUrl()}/data-access/api/v1/auc?${qs.toString()}`,
      { httpsAgent: getXpHttpsAgent(), timeout: 60_000, headers: XP_HEADERS(token) },
    );
    return res.json(r.data);
  } catch (e: any) {
    return res.status(e?.response?.status ?? 500).json({ message: e?.message, xpData: e?.response?.data ?? null });
  }
});

// Positivador (D-1, LOTE, nível CLASSE/comercial — net por classe, captação, suitability).
//   GET /api/v1/position/debug/xp-positivador?positionDate=YYYY-MM-DD&top=10000
router.get('/debug/xp-positivador', async (req: Request, res: Response) => {
  try {
    const positionDate = (req.query.positionDate as string) || ymd(new Date(Date.now() - 86_400_000));
    const qs = new URLSearchParams({
      $filter: `positionDate eq ${positionDate}T00:00:00Z`,
      $top: (req.query.top as string) || '10000',
    });

    const token = await getXpToken();
    const r = await axios.get(
      `${getXpBaseUrl()}/data-access/api/v1/positivador?${qs.toString()}`,
      { httpsAgent: getXpHttpsAgent(), timeout: 60_000, headers: XP_HEADERS(token) },
    );
    return res.json(r.data);
  } catch (e: any) {
    return res.status(e?.response?.status ?? 500).json({ message: e?.message, xpData: e?.response?.data ?? null });
  }
});

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
// GET /api/v1/position/agora/:cpfCnpj/:accountCode
// Posição de uma conta na Ágora (Bradesco)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/agora/:cpfCnpj/:accountCode', async (req: Request, res: Response) => {
  const { cpfCnpj, accountCode } = req.params;
  let cleanCpf: string;
  try {
    cleanCpf = parseCpfCnpj(cpfCnpj, 'cpfCnpj');
  } catch (err) {
    return handleError(err, res, 'AGORA');
  }
  const cleanAccount = accountCode.replace(/\D/g, '');

  try {
    const data = await getAgoraDetailedPosition(cleanCpf, cleanAccount);
    const response: ApiResponse<typeof data> = {
      success: true,
      data,
      meta: { fetchedAt: new Date().toISOString() },
    };
    return res.json(response);
  } catch (err) {
    return handleError(err, res, 'AGORA');
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/v1/position/avenue/:cpf
// Posição de um cliente na Avenue (D-4)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/avenue/:cpf', async (req: Request, res: Response) => {
  const { cpf } = req.params;
  let cleanCpf: string;
  try {
    cleanCpf = parseCpfCnpj(cpf, 'cpf');
  } catch (err) {
    return handleError(err, res, 'AVENUE');
  }

  try {
    const data = await getAvenuePosition(cleanCpf);
    const response: ApiResponse<typeof data> = {
      success: true,
      data,
      meta: { fetchedAt: new Date().toISOString() },
    };
    return res.json(response);
  } catch (err) {
    return handleError(err, res, 'AVENUE');
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
  const cpfRaw = req.query.cpf as string | undefined;

  const institutions: Institution[] = institutionsParam
    ? (institutionsParam.split(',').map((i) => i.trim().toUpperCase()) as Institution[])
    : ['BTG', 'XP'];

  let cpf: string | undefined;
  if (cpfRaw) {
    try {
      cpf = parseCpfCnpj(cpfRaw, 'cpf');
    } catch (err) {
      return handleError(err, res);
    }
  }

  try {
    const data = await getConsolidatedPosition(accountNumber, institutions, cpf);
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

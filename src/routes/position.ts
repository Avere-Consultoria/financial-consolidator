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

import axios from 'axios';
import { logger } from '../../utils/logger';
import { ConsolidatorError } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Avenue Auth — Looker API Key Login
// POST https://avenueanalytics.cloud.looker.com/api/4.0/login
// Body: x-www-form-urlencoded { client_id, client_secret }
// Validade: ~1 hora (3599s)
// ─────────────────────────────────────────────────────────────────────────────

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

const BASE_URL = 'https://avenueanalytics.cloud.looker.com/api/4.0';

export async function getAvenueToken(): Promise<string> {
  const now = Date.now();

  // Reutiliza token se ainda válido (com 60s de margem)
  if (tokenCache && now < tokenCache.expiresAt - 60_000) {
    logger.debug('Avenue: reutilizando token em cache');
    return tokenCache.token;
  }

  const clientId = process.env.AVENUE_CLIENT_ID;
  const clientSecret = process.env.AVENUE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new ConsolidatorError(
      'AVENUE_MISSING_CONFIG',
      'Credenciais Avenue não configuradas no .env',
      'AVENUE',
      500
    );
  }

  try {
    logger.info('Avenue: gerando novo token...');

    const response = await axios.post(
      `${BASE_URL}/login`,
      new URLSearchParams({ client_id: clientId, client_secret: clientSecret }),
      {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }
    );

    const token = response.data?.access_token as string;

    if (!token) {
      throw new ConsolidatorError(
        'AVENUE_TOKEN_EMPTY',
        'Token não retornado pela Avenue',
        'AVENUE',
        502
      );
    }

    // Token Avenue dura ~1 hora (3599s)
    tokenCache = {
      token,
      expiresAt: now + 3_599_000,
    };

    logger.info('Avenue: token gerado com sucesso');
    return token;
  } catch (err: any) {
    if (err instanceof ConsolidatorError) throw err;

    logger.error('Avenue: erro ao gerar token', {
      status: err?.response?.status,
      data: err?.response?.data,
    });

    throw new ConsolidatorError(
      'AVENUE_AUTH_ERROR',
      `Falha na autenticação Avenue: ${err?.response?.data?.message ?? err.message}`,
      'AVENUE',
      err?.response?.status ?? 502
    );
  }
}

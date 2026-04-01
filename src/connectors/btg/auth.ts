import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';
import { ConsolidatorError } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// BTG Auth — OAuth2 Client Credentials
// POST https://api.btgpactual.com/iaas-auth/api/v1/authorization/oauth2/accesstoken
// Token codificado em Base64: base64(client_id:client_secret)
// Validade: 15 minutos
// ─────────────────────────────────────────────────────────────────────────────

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

export async function getBtgToken(): Promise<string> {
  const now = Date.now();

  // Reutiliza token se ainda válido (com 60s de margem)
  if (tokenCache && now < tokenCache.expiresAt - 60_000) {
    logger.debug('BTG: reutilizando token em cache');
    return tokenCache.token;
  }

  const clientId = process.env.BTG_CLIENT_ID;
  const clientSecret = process.env.BTG_CLIENT_SECRET;
  const baseUrl = process.env.BTG_AUTH_BASE_URL;

  if (!clientId || !clientSecret || !baseUrl) {
    throw new ConsolidatorError(
      'BTG_MISSING_CONFIG',
      'Credenciais BTG não configuradas no .env',
      'BTG',
      500
    );
  }

  const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    logger.info('BTG: gerando novo token OAuth2...');

    const response = await axios.post(
      `${baseUrl}/api/v1/authorization/oauth2/accesstoken`,
      new URLSearchParams({ grant_type: 'client_credentials' }),
      {
        headers: {
          Authorization: `Basic ${encoded}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-id-partner-request': uuidv4(),
        },
      }
    );

    const token = response.headers['access_token'] as string;

    if (!token) {
      throw new ConsolidatorError(
        'BTG_TOKEN_EMPTY',
        'Token não retornado pelo BTG',
        'BTG',
        502
      );
    }

    // Token BTG dura 15 minutos (900s)
    tokenCache = {
      token,
      expiresAt: now + 900_000,
    };

    logger.info('BTG: token gerado com sucesso');
    return token;
  } catch (err: any) {
    if (err instanceof ConsolidatorError) throw err;

    logger.error('BTG: erro ao gerar token', { status: err?.response?.status, data: err?.response?.data });

    throw new ConsolidatorError(
      'BTG_AUTH_ERROR',
      `Falha na autenticação BTG: ${err?.response?.data?.message ?? err.message}`,
      'BTG',
      err?.response?.status ?? 502
    );
  }
}

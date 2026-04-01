import axios from 'axios';
import * as fs from 'fs';
import * as https from 'https';
import { logger } from '../../utils/logger';
import { ConsolidatorError } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// XP Auth — OAuth2 Client Credentials via Azure AD + mTLS
// POST https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token
// Token válido por 1 hora (3600s)
// ─────────────────────────────────────────────────────────────────────────────

const TENANT_ID = 'cf56e405-d2b0-4266-b210-aa04636b6161';
const TOKEN_URL = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

function getXpScope(): string {
  const env = process.env.XP_ENVIRONMENT ?? 'prd';
  return env === 'prd'
    ? 'api://proxy-cmp112188-prd/.default'
    : 'api://proxy-cmp112188-hml/.default';
}

export function getXpBaseUrl(): string {
  const env = process.env.XP_ENVIRONMENT ?? 'prd';
  return env === 'prd'
    ? 'https://matls-api.xpi.com.br'
    : 'https://matls-api-hml.xpi.com.br';
}

export function getXpHttpsAgent(): https.Agent {
  const certPath = process.env.XP_CERT_PATH;
  const keyPath = process.env.XP_KEY_PATH;

  if (!certPath || !keyPath) {
    throw new ConsolidatorError(
      'XP_MISSING_CERT',
      'Caminhos de certificado XP não configurados (XP_CERT_PATH, XP_KEY_PATH)',
      'XP',
      500
    );
  }

  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    throw new ConsolidatorError(
      'XP_CERT_NOT_FOUND',
      `Certificado ou chave XP não encontrados: ${certPath} / ${keyPath}`,
      'XP',
      500
    );
  }

  return new https.Agent({
    cert: fs.readFileSync(certPath),
    key: fs.readFileSync(keyPath),
  });
}

export async function getXpToken(): Promise<string> {
  const now = Date.now();

  // Reutiliza token se ainda válido (com 60s de margem)
  if (tokenCache && now < tokenCache.expiresAt - 60_000) {
    logger.debug('XP: reutilizando token em cache');
    return tokenCache.token;
  }

  const clientId = process.env.XP_CLIENT_ID;
  const clientSecret = process.env.XP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new ConsolidatorError(
      'XP_MISSING_CONFIG',
      'Credenciais XP não configuradas no .env',
      'XP',
      500
    );
  }

  try {
    logger.info('XP: gerando novo token OAuth2 via Azure AD...');

    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      scope: getXpScope(),
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await axios.post(TOKEN_URL, params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    const { access_token, expires_in } = response.data;

    tokenCache = {
      token: access_token,
      expiresAt: now + expires_in * 1000,
    };

    logger.info('XP: token gerado com sucesso');
    return access_token;
  } catch (err: any) {
    logger.error('XP: erro ao gerar token', { status: err?.response?.status, data: err?.response?.data });

    throw new ConsolidatorError(
      'XP_AUTH_ERROR',
      `Falha na autenticação XP: ${err?.response?.data?.error_description ?? err.message}`,
      'XP',
      err?.response?.status ?? 502
    );
  }
}

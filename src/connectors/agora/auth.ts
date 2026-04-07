import axios from 'axios';
import * as fs from 'fs';
import * as https from 'https';
import { logger } from '../../utils/logger';
import { ConsolidatorError } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Ágora Auth — OAuth2 Client Credentials + mTLS (Bradesco AXWAY)
// Token válido por 1 hora — NÃO gerar um token por requisição
// ─────────────────────────────────────────────────────────────────────────────

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;

export function getAgoraBaseUrl(): string {
  return process.env.AGORA_ENVIRONMENT === 'production'
    ? 'https://openapi.bradesco.com.br'
    : 'https://openapisandbox.prebanco.com.br';
}

export function getAgoraHttpsAgent(): https.Agent {
  const certPath = process.env.AGORA_CERT_PATH;
  const keyPath  = process.env.AGORA_KEY_PATH;

  if (!certPath || !keyPath) {
    throw new ConsolidatorError(
      'AGORA_MISSING_CERT',
      'Caminhos de certificado Ágora não configurados (AGORA_CERT_PATH, AGORA_KEY_PATH)',
      'AGORA', 500
    );
  }
  if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    throw new ConsolidatorError(
      'AGORA_CERT_NOT_FOUND',
      `Certificado ou chave não encontrados: ${certPath} / ${keyPath}`,
      'AGORA', 500
    );
  }

  return new https.Agent({
    cert: fs.readFileSync(certPath),
    key:  fs.readFileSync(keyPath),
    // Sandbox usa certificado autoassinado
    rejectUnauthorized: process.env.AGORA_ENVIRONMENT === 'production',
  });
}

export async function getAgoraToken(): Promise<string> {
  const now = Date.now();

  // Reutiliza token se ainda válido (com 60s de margem)
  if (tokenCache && now < tokenCache.expiresAt - 60_000) {
    logger.debug('Ágora: reutilizando token em cache');
    return tokenCache.token;
  }

  const clientId     = process.env.AGORA_CLIENT_ID;
  const clientSecret = process.env.AGORA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new ConsolidatorError(
      'AGORA_MISSING_CONFIG',
      'Credenciais Ágora não configuradas (AGORA_CLIENT_ID, AGORA_CLIENT_SECRET)',
      'AGORA', 500
    );
  }

  try {
    logger.info('Ágora: gerando novo token OAuth2...');

    const params = new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     clientId,
      client_secret: clientSecret,
    });

    const { data } = await axios.post(
      `${getAgoraBaseUrl()}/auth/server-mtls/v2/token`,
      params.toString(),
      {
        headers:    { 'Content-Type': 'application/x-www-form-urlencoded' },
        httpsAgent: getAgoraHttpsAgent(),
      }
    );

    tokenCache = {
      token:     data.access_token,
      expiresAt: now + (data.expires_in ?? 3600) * 1000,
    };

    logger.info('Ágora: token gerado com sucesso');
    return data.access_token;

  } catch (err: any) {
    logger.error('Ágora: erro ao gerar token', {
      status: err?.response?.status,
      data:   err?.response?.data,
    });
    throw new ConsolidatorError(
      'AGORA_AUTH_ERROR',
      `Falha na autenticação Ágora: ${err?.response?.data?.error_description ?? err.message}`,
      'AGORA',
      err?.response?.status ?? 502
    );
  }
}

// Headers obrigatórios em todas as chamadas AXWAY
export async function getAgoraHeaders(): Promise<Record<string, string>> {
  const token   = await getAgoraToken();
  const cpfcnpj = process.env.AGORA_CPFCNPJ_CHAVE;

  if (!cpfcnpj) {
    throw new ConsolidatorError(
      'AGORA_MISSING_CPFCNPJ',
      'AGORA_CPFCNPJ_CHAVE não configurado (formato: cnpj.chave_seguranca)',
      'AGORA', 500
    );
  }

  return {
    Authorization: `Bearer ${token}`,
    cpfcnpj,
    'Content-Type': 'application/json',
  };
}
import axios from 'axios';
import * as https from 'https';
import { logger } from '../../utils/logger';
import { ConsolidatorError } from '../../types';
import { loadCert } from '../../utils/certLoader';

// ─────────────────────────────────────────────────────────────────────────────
// Ágora Auth — OAuth2 Client Credentials + mTLS (Bradesco AXWAY)
// Token válido por 1 hora — NÃO gerar um token por requisição
// ─────────────────────────────────────────────────────────────────────────────

interface TokenCache {
  token: string;
  expiresAt: number;
}

let tokenCache: TokenCache | null = null;
// Gate: se já há uma busca em voo, todos os chamadores aguardam a mesma promise
let tokenPromise: Promise<string> | null = null;

export function getAgoraBaseUrl(): string {
  return process.env.AGORA_ENVIRONMENT === 'production'
    ? 'https://openapi.bradesco.com.br'
    : 'https://openapisandbox.prebanco.com.br';
}

export function getAgoraHttpsAgent(): https.Agent {
  try {
    // Fail-safe: verificação de TLS LIGADA por padrão. Só desliga com opt-in
    // EXPLÍCITO (AGORA_TLS_INSECURE=true) e NUNCA em produção — assim um env
    // ausente/typo não desativa a validação da cadeia no agente que transporta
    // o client_secret + bearer. Para o sandbox com CA própria, prefira fornecer
    // AGORA_CA_BASE64 a desligar a verificação. Mesmo padrão do XP (#39).
    const insecure = process.env.AGORA_TLS_INSECURE === 'true'
      && process.env.NODE_ENV !== 'production';
    const ca = (process.env.AGORA_CA_BASE64 || process.env.AGORA_CA_PATH)
      ? loadCert('AGORA_CA_BASE64', 'AGORA_CA_PATH')
      : undefined;
    return new https.Agent({
      cert: loadCert('AGORA_CERT_BASE64', 'AGORA_CERT_PATH'),
      key:  loadCert('AGORA_KEY_BASE64',  'AGORA_KEY_PATH'),
      ...(ca ? { ca } : {}),
      rejectUnauthorized: !insecure,
    });
  } catch (err: any) {
    throw new ConsolidatorError(
      'AGORA_CERT_ERROR',
      `Certificado Ágora: ${err.message}`,
      'AGORA', 500
    );
  }
}

export async function getAgoraToken(): Promise<string> {
  const now = Date.now();

  if (tokenCache && now < tokenCache.expiresAt - 60_000) {
    logger.debug('Ágora: reutilizando token em cache');
    return tokenCache.token;
  }

  // Evita race condition: se já há uma busca de token em voo, reutiliza a mesma promise
  if (tokenPromise) {
    logger.debug('Ágora: aguardando token já em busca...');
    return tokenPromise;
  }

  tokenPromise = _fetchNewToken().finally(() => {
    tokenPromise = null;
  });

  return tokenPromise;
}

async function _fetchNewToken(): Promise<string> {
  const now = Date.now();

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
    // Não despeja err.response.data (corpo cru da corretora) nos logs do Railway.
    logger.error('Ágora: erro ao gerar token', {
      status: err?.response?.status,
      erro:   err?.response?.data?.error_description ?? err?.message,
    });
    throw new ConsolidatorError(
      'AGORA_AUTH_ERROR',
      `Falha na autenticação Ágora: ${err?.response?.data?.error_description ?? err.message}`,
      'AGORA',
      err?.response?.status ?? 502
    );
  }
}

export async function getAgoraHeaders(): Promise<Record<string, string>> {
  const token = await getAgoraToken();
  const cpfcnpj = process.env.AGORA_CPFCNPJ_CHAVE;

  return {
    Authorization: `Bearer ${token}`,
    'Accept': 'application/json',
    ...(cpfcnpj && { cpfcnpj }),
  };
}
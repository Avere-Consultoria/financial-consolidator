import axios from 'axios';
import { getXpToken, getXpBaseUrl, getXpHttpsAgent } from './auth';
import { UnifiedPosition, UnifiedAsset, AssetClass, ConsolidatorError } from '../../types';
import { logger } from '../../utils/logger';

// ─────────────────────────────────────────────────────────────────────────────
// XP Data Access — Posição Consolidada
// GET /data-access/api/v1/consolidated-position
// Requer: Authorization Bearer + Ocp-Apim-Subscription-Key + mTLS
// ─────────────────────────────────────────────────────────────────────────────

export async function getXpPosition(accountNumber: string): Promise<UnifiedPosition> {
  const token = await getXpToken();
  const agent = getXpHttpsAgent();
  const baseUrl = getXpBaseUrl();
  const subscriptionKey = process.env.XP_SUBSCRIPTION_KEY;

  if (!subscriptionKey) {
    throw new ConsolidatorError('XP_MISSING_SUBSCRIPTION_KEY', 'XP_SUBSCRIPTION_KEY não configurada', 'XP', 500);
  }

  try {
    logger.info(`XP: buscando posição consolidada da conta ${accountNumber}`);

    // ── Posição Consolidada ──────────────────────────────────────────────────
    const response = await axios.get(
      `${baseUrl}/data-access/api/v1/consolidated-position`,
      {
        httpsAgent: agent,
        headers: {
          'Ocp-Apim-Subscription-Key': subscriptionKey,
          Authorization: `Bearer ${token}`,
          Accept: '*/*',
        },
        params: {
          $filter: `(dimAccountCode eq '${accountNumber}')`,
          $top: 50000,
        },
      }
    );

    const rawItems: any[] = response.data?.value ?? response.data ?? [];
    return mapXpPosition(rawItems, accountNumber);
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;

    logger.error('XP: erro ao buscar posição', { accountNumber, status, data });

    if (status === 401) {
      throw new ConsolidatorError('XP_UNAUTHORIZED', 'Token XP inválido ou expirado', 'XP', 401);
    }
    if (status === 429) {
      throw new ConsolidatorError('XP_RATE_LIMIT', 'Rate limit XP excedido', 'XP', 429);
    }

    throw new ConsolidatorError(
      'XP_POSITION_ERROR',
      `Erro ao buscar posição XP: ${data?.message ?? err.message}`,
      'XP',
      status ?? 502
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapper: XP ConsolidatedPosition → UnifiedPosition
// ─────────────────────────────────────────────────────────────────────────────

function mapXpPosition(rawItems: any[], accountNumber: string): UnifiedPosition {
  const assets: UnifiedAsset[] = [];
  let totalAmount = 0;
  let positionDate = new Date().toISOString();

  for (const item of rawItems) {
    if (item.positionDate) positionDate = item.positionDate;

    const grossValue = parseFloat(item.financialValue ?? item.grossValue ?? item.balance ?? '0');
    totalAmount += grossValue;

    const assetClass = mapXpAssetClass(item.productType ?? item.assetType ?? '');

    assets.push({
      assetClass,
      name: item.productName ?? item.assetName ?? item.description ?? 'Ativo XP',
      ticker: item.ticker ?? item.symbol,
      securityCode: item.productCode ?? item.assetCode,
      quantity: parseFloat(item.quantity ?? item.shares ?? '0'),
      marketPrice: parseFloat(item.unitPrice ?? item.lastPrice ?? '0'),
      grossValue,
      netValue: parseFloat(item.netValue ?? item.financialValue ?? grossValue.toString()),
      incomeTax: parseFloat(item.incomeTax ?? '0'),
      maturityDate: item.maturityDate,
      benchMark: item.indexer ?? item.benchmark,
      extra: {
        advisor: item.dimAdvisorCode,
        office: item.officeCode,
        productCategory: item.productCategory,
        productType: item.productType,
      },
    });
  }

  return {
    institution: 'XP',
    accountNumber,
    positionDate,
    totalAmount,
    currency: 'BRL',
    assets,
    rawMeta: {
      source: 'XP Data Access API v1',
      fetchedAt: new Date().toISOString(),
    },
  };
}

function mapXpAssetClass(productType: string): AssetClass {
  const type = productType.toLowerCase();

  if (type.includes('renda fixa') || type.includes('fixed') || type.includes('cdb') || type.includes('lci') || type.includes('lca') || type.includes('tesouro')) {
    return 'FIXED_INCOME';
  }
  if (type.includes('fundo') || type.includes('fund') || type.includes('fi ')) {
    return 'INVESTMENT_FUND';
  }
  if (type.includes('acao') || type.includes('ação') || type.includes('equit') || type.includes('bdr') || type.includes('fii')) {
    return 'EQUITIES';
  }
  if (type.includes('previdencia') || type.includes('previdência') || type.includes('pgbl') || type.includes('vgbl')) {
    return 'PENSION';
  }
  if (type.includes('crypto') || type.includes('cripto') || type.includes('bitcoin')) {
    return 'CRYPTO';
  }
  if (type.includes('derivativ') || type.includes('opcao') || type.includes('opção') || type.includes('swap') || type.includes('futuro')) {
    return 'DERIVATIVE';
  }
  if (type.includes('commodity') || type.includes('ouro')) {
    return 'COMMODITY';
  }
  if (type.includes('caixa') || type.includes('conta') || type.includes('cash')) {
    return 'CASH';
  }

  return 'OTHER';
}

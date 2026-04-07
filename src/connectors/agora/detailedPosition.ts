import axios from 'axios';
import { logger } from '../../utils/logger';
import { UnifiedPosition, UnifiedAsset, AssetClass, ConsolidatorError } from '../../types';
import { getAgoraBaseUrl, getAgoraHeaders, getAgoraHttpsAgent } from './auth';

// ─────────────────────────────────────────────────────────────────────────────
// Ágora — Posição Detalhada (item a item por classe de ativo)
// Endpoints GET com Bearer Token no header
// TPS limite: 20 requisições/segundo
// ─────────────────────────────────────────────────────────────────────────────

async function agoraGet(path: string): Promise<any> {
  const url = `${getAgoraBaseUrl()}${path}`;
  const headers = await getAgoraHeaders();

  const { data } = await axios.get(url, {
    headers,
    httpsAgent: getAgoraHttpsAgent(),
  });
  return data;
}

// ─── Mappers — converte resposta da Ágora para UnifiedAsset ──────────────────

function mapEquities(items: any[]): UnifiedAsset[] {
  return (items ?? []).map((p) => ({
    assetClass: 'EQUITIES' as AssetClass,
    name: p.instrumentName ?? p.symbol,
    ticker: p.symbol,
    quantity: p.quantity,
    marketPrice: p.lastPrice,
    grossValue: p.currentValue ?? 0,
    costPrice: p.valueOrigin,
    extra: {
      source: p.source,
      securityType: p.secutiryType,
      companyName: p.companyName,
      availableQuantity: p.availableQuantity,
      blockedQuantity: p.blockedQuantity,
      averagePrice: p.averagePrice,
      valueAppreciation: p.valueAppreciation,
      percentAppreciation: p.percentAppreciation,
    },
  }));
}

function mapFixedIncome(items: any[]): UnifiedAsset[] {
  return (items ?? []).map((p) => ({
    assetClass: 'FIXED_INCOME' as AssetClass,
    name: p.bondName,
    securityCode: p.cetipSelicCode,
    quantity: p.bondQuantity,
    grossValue: p.grossValue ?? 0,
    netValue: p.netValue,
    costPrice: p.appliedValue,
    acquisitionDate: p.applicationDate,
    maturityDate: p.maturityDate,
    isLiquidity: p.dailyLiquidity,
    extra: {
      bondType: p.bondType,
      issuerName: p.issuerName,
      indexerPercentage: p.indexerPercentage,
      valueAppreciation: p.valueAppreciation,
      percentAppreciation: p.percentAppreciation,
      sourceCode: p.sourceCode,
    },
  }));
}

function mapTreasuryDirect(items: any[]): UnifiedAsset[] {
  return (items ?? []).map((p) => ({
    assetClass: 'FIXED_INCOME' as AssetClass,
    name: p.bondName,
    quantity: p.bondQuantity,
    grossValue: p.positionValue ?? p.vlGross ?? 0,
    costPrice: p.vlAplicLic ?? p.vlOrig,
    maturityDate: String(p.maturityDate ?? p.dtVencto),
    benchMark: p.index,
    extra: {
      bondType: p.bondType,
      marketType: p.marketType,
      purchasePrice: p.purchasePrice,
      vlPriceSell: p.vlPriceSell,
      vlAppreciation: p.vlAppreciation,
      percAppreciation: p.percAppreciation,
      guaranteeQuantity: p.guaranteeQuantity,
    },
  }));
}

function mapFunds(items: any[]): UnifiedAsset[] {
  return (items ?? []).map((p) => ({
    assetClass: 'INVESTMENT_FUND' as AssetClass,
    name: p.fund,
    securityCode: p.cnpj,
    quantity: p.quotesQuantity,
    marketPrice: p.quotesValue,
    grossValue: p.grossPosition ?? 0,
    netValue: p.netPosition,
    costPrice: p.aplicatedValue ?? p.vlInvest,
    extra: {
      sourceCode: p.sourceCode,
      referenceDate: p.referenceDate,
      iofValue: p.iofValue,
      irValue: p.irValue,
      status: p.status,
      openForApplication: p.openForApplication,
      openForRescue: p.openForRescue,
      vlApprec: p.vlApprec,
      pcApprec: p.pcApprec,
    },
  }));
}

function mapCoe(items: any[]): UnifiedAsset[] {
  return (items ?? []).map((p) => ({
    assetClass: 'OTHER' as AssetClass,
    name: p.coeName,
    grossValue: p.grossValue ?? 0,
    netValue: p.liqValue,
    costPrice: p.operationValue,
    maturityDate: p.maturityDate,
    extra: {
      coeId: p.coeId,
      issuerName: p.issuerName,
      ratingCode: p.ratingCode,
      status: p.status,
      lackTime: p.lackTime,
      pcVariation: p.pcVariation,
    },
  }));
}

function mapOptions(items: any[]): UnifiedAsset[] {
  return (items ?? []).map((p) => ({
    assetClass: 'DERIVATIVE' as AssetClass,
    name: p.instrumentName ?? p.symbol,
    ticker: p.symbol,
    quantity: p.quantity,
    marketPrice: p.lastPrice,
    grossValue: p.totalPrice ?? 0,
    costPrice: p.valueOrigin,
    maturityDate: p.maturityDate,
    extra: {
      stockType: p.stockType,
      exercisePrice: p.exercisePrice,
      averagePrice: p.averagePrice,
      valueAppreciation: p.valueAppreciation,
      percentAppreciation: p.percentAppreciation,
    },
  }));
}

function mapFutures(items: any[]): UnifiedAsset[] {
  return (items ?? []).map((p) => ({
    assetClass: 'DERIVATIVE' as AssetClass,
    name: p.companyName ?? p.tickerCode,
    ticker: p.tickerCode,
    quantity: p.actualPosition,
    grossValue: p.adjustValue ?? 0,
    maturityDate: p.maturityDate,
    extra: {
      buyQuantity: p.buyQuantity,
      sellQuantity: p.sellQuantity,
      currentPriceValue: p.currentPriceValue,
      totalNotional: p.totalNotional,
    },
  }));
}

function mapBtc(items: any[]): UnifiedAsset[] {
  return (items ?? []).map((p) => ({
    assetClass: 'EQUITIES' as AssetClass,
    name: p.instrumentName ?? p.symbol,
    ticker: p.symbol,
    quantity: p.quantity,
    marketPrice: p.lastPrice,
    grossValue: p.currentValue ?? 0,
    maturityDate: p.maturityDate,
    extra: {
      side: p.side,
      tax: p.tax,
      openDate: p.openDate,
      contractPrice: p.contractPrice,
      contractValue: p.contractValue,
      vlLiq: p.vlLiq,
    },
  }));
}

function mapTerm(items: any[]): UnifiedAsset[] {
  return (items ?? []).map((p) => ({
    assetClass: 'DERIVATIVE' as AssetClass,
    name: p.symbol,
    ticker: p.symbol,
    quantity: Number(p.availableQuantity ?? 0),
    marketPrice: p.lastPrice,
    grossValue: p.currentValue ?? 0,
    maturityDate: p.maturityDate,
    extra: {
      price: p.price,
      contractValue: p.contractValue,
      result: p.result,
      percentage: p.percentage,
      currentAssetPrice: p.currentAssetPrice,
    },
  }));
}

// ─── Funções públicas por classe de ativo ────────────────────────────────────

export async function getDetailedEquities(cpfCnpj: string, accountCode: string): Promise<UnifiedAsset[]> {
  try {
    logger.info(`Ágora: buscando ações para conta ${accountCode}`);
    const data = await agoraGet(`/consolidatedposition/equities/${cpfCnpj}/${accountCode}`);
    return mapEquities(Array.isArray(data) ? data : data?.positions ?? [data]);
  } catch (err: any) {
    throw new ConsolidatorError('AGORA_EQUITIES_ERROR', `Erro ao buscar ações: ${err?.response?.data?.message ?? err.message}`, 'AGORA', err?.response?.status ?? 502);
  }
}

export async function getDetailedFixedIncome(cpfCnpj: string, accountCode: string): Promise<UnifiedAsset[]> {
  try {
    logger.info(`Ágora: buscando renda fixa para conta ${accountCode}`);
    const data = await agoraGet(`/detailedposition/fixedIncome/${cpfCnpj}/${accountCode}`);
    return mapFixedIncome(Array.isArray(data) ? data : [data]);
  } catch (err: any) {
    throw new ConsolidatorError('AGORA_FIXED_INCOME_ERROR', `Erro ao buscar renda fixa: ${err?.response?.data?.message ?? err.message}`, 'AGORA', err?.response?.status ?? 502);
  }
}

export async function getDetailedTreasuryDirect(cpfCnpj: string, accountCode: string): Promise<UnifiedAsset[]> {
  try {
    logger.info(`Ágora: buscando tesouro direto para conta ${accountCode}`);
    const data = await agoraGet(`/consolidatedposition/treasuryDirect/${cpfCnpj}/${accountCode}`);
    return mapTreasuryDirect(Array.isArray(data) ? data : [data]);
  } catch (err: any) {
    throw new ConsolidatorError('AGORA_TREASURY_ERROR', `Erro ao buscar tesouro direto: ${err?.response?.data?.message ?? err.message}`, 'AGORA', err?.response?.status ?? 502);
  }
}

export async function getDetailedFunds(cpfCnpj: string, accountCode: string): Promise<UnifiedAsset[]> {
  try {
    logger.info(`Ágora: buscando fundos para conta ${accountCode}`);
    const data = await agoraGet(`/consolidatedposition/funds/${cpfCnpj}/${accountCode}`);
    return mapFunds(Array.isArray(data) ? data : [data]);
  } catch (err: any) {
    throw new ConsolidatorError('AGORA_FUNDS_ERROR', `Erro ao buscar fundos: ${err?.response?.data?.message ?? err.message}`, 'AGORA', err?.response?.status ?? 502);
  }
}

export async function getDetailedCoe(cpfCnpj: string, accountCode: string): Promise<UnifiedAsset[]> {
  try {
    const data = await agoraGet(`/consolidatedposition/coe/${cpfCnpj}/${accountCode}`);
    return mapCoe(Array.isArray(data) ? data : [data]);
  } catch (err: any) {
    throw new ConsolidatorError('AGORA_COE_ERROR', `Erro ao buscar COE: ${err?.response?.data?.message ?? err.message}`, 'AGORA', err?.response?.status ?? 502);
  }
}

export async function getDetailedOptions(cpfCnpj: string, accountCode: string): Promise<UnifiedAsset[]> {
  try {
    const data = await agoraGet(`/consolidatedposition/option/${cpfCnpj}/${accountCode}`);
    return mapOptions(Array.isArray(data) ? data : [data]);
  } catch (err: any) {
    throw new ConsolidatorError('AGORA_OPTIONS_ERROR', `Erro ao buscar opções: ${err?.response?.data?.message ?? err.message}`, 'AGORA', err?.response?.status ?? 502);
  }
}

export async function getDetailedFutures(cpfCnpj: string, accountCode: string): Promise<UnifiedAsset[]> {
  try {
    const data = await agoraGet(`/consolidatedposition/futures/${cpfCnpj}/${accountCode}`);
    return mapFutures(Array.isArray(data) ? data : [data]);
  } catch (err: any) {
    throw new ConsolidatorError('AGORA_FUTURES_ERROR', `Erro ao buscar futuros: ${err?.response?.data?.message ?? err.message}`, 'AGORA', err?.response?.status ?? 502);
  }
}

export async function getDetailedBtc(cpfCnpj: string, accountCode: string): Promise<UnifiedAsset[]> {
  try {
    const data = await agoraGet(`/consolidatedposition/btc/${cpfCnpj}/${accountCode}`);
    return mapBtc(Array.isArray(data) ? data : [data]);
  } catch (err: any) {
    throw new ConsolidatorError('AGORA_BTC_ERROR', `Erro ao buscar BTC/aluguel: ${err?.response?.data?.message ?? err.message}`, 'AGORA', err?.response?.status ?? 502);
  }
}

export async function getDetailedTerm(cpfCnpj: string, accountCode: string): Promise<UnifiedAsset[]> {
  try {
    const data = await agoraGet(`/consolidatedposition/term/${cpfCnpj}/${accountCode}`);
    return mapTerm(Array.isArray(data) ? data : [data]);
  } catch (err: any) {
    throw new ConsolidatorError('AGORA_TERM_ERROR', `Erro ao buscar termo: ${err?.response?.data?.message ?? err.message}`, 'AGORA', err?.response?.status ?? 502);
  }
}

// ─── Posição completa — busca todas as classes e consolida ───────────────────

export async function getAgoraDetailedPosition(
  cpfCnpj: string,
  accountCode: string
): Promise<UnifiedPosition> {
  logger.info(`Ágora: buscando posição detalhada completa para conta ${accountCode}`);

  // Busca em paralelo, tolerando falhas individuais por classe
  const results = await Promise.allSettled([
    getDetailedEquities(cpfCnpj, accountCode),
    getDetailedFixedIncome(cpfCnpj, accountCode),
    getDetailedTreasuryDirect(cpfCnpj, accountCode),
    getDetailedFunds(cpfCnpj, accountCode),
    getDetailedCoe(cpfCnpj, accountCode),
    getDetailedOptions(cpfCnpj, accountCode),
    getDetailedFutures(cpfCnpj, accountCode),
    getDetailedBtc(cpfCnpj, accountCode),
    getDetailedTerm(cpfCnpj, accountCode),
  ]);

  const assets: UnifiedAsset[] = [];
  const errors: string[] = [];

  results.forEach((result, i) => {
    const labels = ['equities','fixedIncome','treasuryDirect','funds','coe','options','futures','btc','term'];
    if (result.status === 'fulfilled') {
      assets.push(...result.value);
    } else {
      logger.warn(`Ágora: falha ao buscar ${labels[i]}`, { reason: result.reason?.message });
      errors.push(labels[i]);
    }
  });

  const totalAmount = assets.reduce((sum, a) => sum + (a.grossValue ?? 0), 0);

  return {
    institution: 'AGORA',
    accountNumber: accountCode,
    positionDate: new Date().toISOString(),
    totalAmount,
    currency: 'BRL',
    assets,
    rawMeta: {
      source: 'agora/detailedposition',
      fetchedAt: new Date().toISOString(),
      ...(errors.length > 0 && { partialErrors: errors } as any),
    },
  };
}
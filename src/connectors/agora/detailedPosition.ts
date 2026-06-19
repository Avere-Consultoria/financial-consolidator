import axios from 'axios';
import { logger } from '../../utils/logger';
import { maskDoc, maskUrl } from '../../utils/mask';
import {
  UnifiedPosition,
  UnifiedAsset,
  AssetClass,
  ConsolidatorError,
  AgoraEquityExtra,
  AgoraFixedIncomeExtra,
  AgoraTreasuryExtra,
  AgoraFundExtra,
  AgoraCoeExtra,
  AgoraOptionExtra,
  AgoraFutureExtra,
  AgoraBtcExtra,
  AgoraTermExtra,
  AgoraPensionExtra,
} from '../../types';
import { getAgoraBaseUrl, getAgoraHeaders, getAgoraHttpsAgent } from './auth';

// ─────────────────────────────────────────────────────────────────────────────
// Ágora — Posição Detalhada (item a item por classe de ativo)
// Base path: /managers-position-mgmt/v1  (diferente do portfolio-mgmt!)
// Endpoints GET com Bearer Token no header
// TPS limite: 20 requisições/segundo
// ─────────────────────────────────────────────────────────────────────────────

const BASE_PATH = '/managers-position-mgmt/v1';

async function agoraGet(path: string): Promise<any> {
  const url = `${getAgoraBaseUrl()}${BASE_PATH}${path}`;
  const headers = await getAgoraHeaders();

  const { data } = await axios.get(url, {
    headers,
    httpsAgent: getAgoraHttpsAgent(),
  });
  return data;
}

// ─── Extração de envelope — cada endpoint da Ágora envolve o array numa chave diferente ──
//
// Exemplos observados:
//   equities      → { consolidatedPosition: [...], statusCode: 200, errors: [] }
//   funds         → { funds: [...] }
//   fixedIncome   → { fixedIncomes: [...] }  ou array direto
//   treasuryDirect→ { treasuryDirect: [...] }
//
// Estratégia: tenta chaves conhecidas em ordem; cai no "primeiro array do objeto" como fallback.
function extractArray(data: any, ...preferredKeys: string[]): any[] {
  if (Array.isArray(data)) return data;
  for (const key of preferredKeys) {
    if (Array.isArray(data?.[key])) return data[key];
  }
  // Fallback genérico: primeiro valor que for array dentro do objeto
  if (data && typeof data === 'object') {
    for (const val of Object.values(data)) {
      if (Array.isArray(val)) return val as any[];
    }
  }
  return [];
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
    } satisfies AgoraEquityExtra,
  }));
}

function mapFixedIncome(items: any[]): UnifiedAsset[] {
  return (items ?? []).map((p) => ({
    assetClass: 'FIXED_INCOME' as AssetClass,
    name: p.bondName,
    securityCode: p.cetipSelicCode,
    quantity: p.bondQuantity,
    marketPrice: p.bondUnitValue,             // preço unitário atual
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
      // Taxa e precificação
      bondRate: p.bondRate,
      preTaxPercentage: p.preTaxPercentage,
      bondUnitValue: p.bondUnitValue,
      purchaseBondUnitValue: p.purchaseBondUnitValue,
      // Impostos
      bondTaxValue: p.bondTaxValue,
      iofTaxValue: p.iofTaxValue,
      bondTaxPercentage: p.bondTaxPercentage,
      bondTaxDescription: p.bondTaxDescription,
      // Outros
      redeemType: p.redeemType,
      guaranteeQuantity: p.guaranteeQuantity,
      referenceDate: p.referenceDate,
    } satisfies AgoraFixedIncomeExtra,
  }));
}

function mapTreasuryDirect(items: any[]): UnifiedAsset[] {
  return (items ?? []).map((p) => ({
    assetClass: 'FIXED_INCOME' as AssetClass,
    name: p.bondName,
    quantity: p.bondQuantity,
    grossValue: p.positionValue ?? p.vlGross ?? 0,
    costPrice: p.vlAplicLic ?? p.vlOrig,
    maturityDate: p.maturityDate != null ? String(p.maturityDate) : (p.dtVencto != null ? String(p.dtVencto) : undefined),
    benchMark: p.index,
    extra: {
      bondType: p.bondType,
      marketType: p.marketType,
      purchasePrice: p.purchasePrice,
      vlPriceSell: p.vlPriceSell,
      vlAppreciation: p.vlAppreciation,
      percAppreciation: p.percAppreciation,
      guaranteeQuantity: p.guaranteeQuantity,
      acquisitions: p._acquisitions ?? [],   // histórico de aplicações TD (detailedposition)
    } satisfies AgoraTreasuryExtra,
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
      rentability: p.rentability != null ? parseFloat(p.rentability) : undefined,
      vlUp: p.vlUp ?? undefined,
      vlApprec: p.vlApprec,
      pcApprec: p.pcApprec,
      acquisitions: p._acquisitions ?? [],   // histórico de aplicações (detailedposition)
    } satisfies AgoraFundExtra,
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
    } satisfies AgoraCoeExtra,
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
    } satisfies AgoraOptionExtra,
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
    } satisfies AgoraFutureExtra,
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
    } satisfies AgoraBtcExtra,
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
    } satisfies AgoraTermExtra,
  }));
}

// saleDate vem como inteiro DDMMYYYY (ex: 20062024 → "2024-06-20")
function parsePensionDate(ddmmyyyy: number | string | undefined): string | undefined {
  if (!ddmmyyyy) return undefined;
  const s = String(ddmmyyyy).padStart(8, '0');
  if (s.length !== 8) return undefined;
  return `${s.slice(4, 8)}-${s.slice(2, 4)}-${s.slice(0, 2)}`;
}

function mapPension(items: any[]): UnifiedAsset[] {
  return (items ?? []).map((p) => {
    const fundType = p.typePlan === 1 ? 'PGBL' : p.typePlan === 2 ? 'VGBL' : (p.planName ?? '').split(' ')[0];
    const taxRegime = p.regime === 'R' ? 'Regressivo' : p.regime === 'P' ? 'Progressivo' : p.regime;

    return {
      assetClass: 'PENSION' as AssetClass,
      name: p.planName ?? 'Previdência',
      securityCode: String(p.planCod ?? ''),
      grossValue: p.valueCurrentBalance ?? 0,
      netValue: p.totalValueAvailable ?? p.valueCurrentBalance ?? 0,
      acquisitionDate: parsePensionDate(p.saleDate),
      extra: {
        fundType,
        planCod: String(p.planCod ?? ''),
        proposedNumber: p.proposedNumber,
        descriptionFund: p.descriptionFund,
        taxRegime,
        typePlan: p.typePlan,
        totalValueAvailable: p.totalValueAvailable,
        currentBalanceDate: parsePensionDate(p.currentBalanceDate),
        nameParticipant: p.nameParticipant,
      } satisfies AgoraPensionExtra,
    };
  });
}

// ─── Fetchers de RAW por classe (sem mapear) ─────────────────────────────────
// Buscam o cru de cada endpoint da Ágora. Usados tanto pela posição viva quanto
// pelo arquivo (posicao_raw) → o bundle cru é o que permite o replay sem corretora.

async function fetchRawEquities(cpfCnpj: string, accountCode: string): Promise<any[]> {
  try {
    logger.info(`Ágora: buscando ações para conta ${accountCode}`);
    const data = await agoraGet(`/consolidatedposition/equities/${cpfCnpj}/${accountCode}`);
    return extractArray(data, 'consolidatedPosition', 'positions', 'equities');
  } catch (err: any) {
    throw new ConsolidatorError('AGORA_EQUITIES_ERROR', `Erro ao buscar ações: ${err?.response?.data?.message ?? err.message}`, 'AGORA', err?.response?.status ?? 502);
  }
}

async function fetchRawFixedIncome(cpfCnpj: string, accountCode: string): Promise<any[]> {
  try {
    logger.info(`Ágora: buscando renda fixa para conta ${accountCode}`);
    const data = await agoraGet(`/detailedposition/fixedIncome/${cpfCnpj}/${accountCode}`);
    return extractArray(data, 'fixedIncomes', 'fixedIncome', 'bonds');
  } catch (err: any) {
    throw new ConsolidatorError('AGORA_FIXED_INCOME_ERROR', `Erro ao buscar renda fixa: ${err?.response?.data?.message ?? err.message}`, 'AGORA', err?.response?.status ?? 502);
  }
}

async function fetchRawTreasuryDirect(cpfCnpj: string, accountCode: string): Promise<any[]> {
  try {
    logger.info(`Ágora: buscando tesouro direto para conta ${accountCode}`);
    const data = await agoraGet(`/consolidatedposition/treasuryDirect/${cpfCnpj}/${accountCode}`);
    const items = extractArray(data, 'treasuryDirect', 'treasuryDirects', 'bonds');

    // Enriquece cada TD com o histórico de aplicações via /detailedposition/treasuryDirect
    return await Promise.all(items.map(async (item) => {
      if (!item.bondType || !item.maturityDate) return { ...item, _acquisitions: [] };
      try {
        const detail = await agoraGet(
          `/detailedposition/treasuryDirect/${cpfCnpj}/${accountCode}/${encodeURIComponent(item.bondType)}/${item.maturityDate}`
        );
        const acquisitions = extractArray(detail, 'detailedPosition');
        return { ...item, _acquisitions: acquisitions };
      } catch (err: any) {
        logger.warn(`Ágora: falha detailed TD ${item.bondType}/${item.maturityDate}`, { reason: err?.message });
        return { ...item, _acquisitions: [] };
      }
    }));
  } catch (err: any) {
    throw new ConsolidatorError('AGORA_TREASURY_ERROR', `Erro ao buscar tesouro direto: ${err?.response?.data?.message ?? err.message}`, 'AGORA', err?.response?.status ?? 502);
  }
}

async function fetchRawFunds(cpfCnpj: string, accountCode: string): Promise<any[]> {
  try {
    logger.info(`Ágora: buscando fundos para conta ${accountCode}`);
    const data = await agoraGet(`/consolidatedposition/funds/${cpfCnpj}/${accountCode}`);
    const items = extractArray(data, 'funds', 'investmentFunds');

    // Enriquece cada fundo com o histórico de aplicações via /detailedposition/funds
    return await Promise.all(items.map(async (item) => {
      if (item.sourceCode == null) return { ...item, _acquisitions: [] };
      try {
        const detail = await agoraGet(
          `/detailedposition/funds/${cpfCnpj}/${accountCode}/${item.sourceCode}`
        );
        const acquisitions = extractArray(detail, 'detailedFunds');
        return { ...item, _acquisitions: acquisitions };
      } catch (err: any) {
        logger.warn(`Ágora: falha detailed Funds sourceCode=${item.sourceCode}`, { reason: err?.message });
        return { ...item, _acquisitions: [] };
      }
    }));
  } catch (err: any) {
    throw new ConsolidatorError('AGORA_FUNDS_ERROR', `Erro ao buscar fundos: ${err?.response?.data?.message ?? err.message}`, 'AGORA', err?.response?.status ?? 502);
  }
}

async function fetchRawCoe(cpfCnpj: string, accountCode: string): Promise<any[]> {
  try {
    const data = await agoraGet(`/consolidatedposition/coe/${cpfCnpj}/${accountCode}`);
    return extractArray(data, 'coe', 'coes');
  } catch (err: any) {
    throw new ConsolidatorError('AGORA_COE_ERROR', `Erro ao buscar COE: ${err?.response?.data?.message ?? err.message}`, 'AGORA', err?.response?.status ?? 502);
  }
}

async function fetchRawOptions(cpfCnpj: string, accountCode: string): Promise<any[]> {
  try {
    const data = await agoraGet(`/consolidatedposition/option/${cpfCnpj}/${accountCode}`);
    return extractArray(data, 'options', 'option');
  } catch (err: any) {
    throw new ConsolidatorError('AGORA_OPTIONS_ERROR', `Erro ao buscar opções: ${err?.response?.data?.message ?? err.message}`, 'AGORA', err?.response?.status ?? 502);
  }
}

async function fetchRawFutures(cpfCnpj: string, accountCode: string): Promise<any[]> {
  try {
    const data = await agoraGet(`/consolidatedposition/futures/${cpfCnpj}/${accountCode}`);
    return extractArray(data, 'futures', 'future');
  } catch (err: any) {
    throw new ConsolidatorError('AGORA_FUTURES_ERROR', `Erro ao buscar futuros: ${err?.response?.data?.message ?? err.message}`, 'AGORA', err?.response?.status ?? 502);
  }
}

async function fetchRawBtc(cpfCnpj: string, accountCode: string): Promise<any[]> {
  try {
    const data = await agoraGet(`/consolidatedposition/btc/${cpfCnpj}/${accountCode}`);
    return extractArray(data, 'btc', 'btcPositions');
  } catch (err: any) {
    throw new ConsolidatorError('AGORA_BTC_ERROR', `Erro ao buscar BTC/aluguel: ${err?.response?.data?.message ?? err.message}`, 'AGORA', err?.response?.status ?? 502);
  }
}

async function fetchRawTerm(cpfCnpj: string, accountCode: string): Promise<any[]> {
  try {
    const data = await agoraGet(`/consolidatedposition/term/${cpfCnpj}/${accountCode}`);
    return extractArray(data, 'term', 'terms');
  } catch (err: any) {
    throw new ConsolidatorError('AGORA_TERM_ERROR', `Erro ao buscar termo: ${err?.response?.data?.message ?? err.message}`, 'AGORA', err?.response?.status ?? 502);
  }
}

// Previdência: endpoint diferente — só CPF, sem accountCode
async function fetchRawPension(cpfCnpj: string): Promise<any[]> {
  try {
    logger.info(`Ágora: buscando previdência para CPF ${maskDoc(cpfCnpj)}`);
    const data = await agoraGet(`/consolidatedposition/pension/${cpfCnpj}`);
    return extractArray(data, 'proposals', 'pension', 'plans');
  } catch (err: any) {
    throw new ConsolidatorError('AGORA_PENSION_ERROR', `Erro ao buscar previdência: ${err?.response?.data?.message ?? err.message}`, 'AGORA', err?.response?.status ?? 502);
  }
}

// Bundle de raw por classe (multi-call) — é o que arquivamos em posicao_raw e o
// que o /transform recebe para re-mapear sem nova chamada à Ágora.
export interface AgoraRawBundle {
  equities: any[]; fixedIncome: any[]; treasuryDirect: any[]; funds: any[]; coe: any[];
  options: any[]; futures: any[]; btc: any[]; term: any[]; pension: any[];
}

async function fetchAgoraBundle(cpfCnpj: string, accountCode: string): Promise<{ bundle: AgoraRawBundle; errors: string[] }> {
  const tarefas: [keyof AgoraRawBundle, () => Promise<any[]>][] = [
    ['equities',       () => fetchRawEquities(cpfCnpj, accountCode)],
    ['fixedIncome',    () => fetchRawFixedIncome(cpfCnpj, accountCode)],
    ['treasuryDirect', () => fetchRawTreasuryDirect(cpfCnpj, accountCode)],
    ['funds',          () => fetchRawFunds(cpfCnpj, accountCode)],
    ['coe',            () => fetchRawCoe(cpfCnpj, accountCode)],
    ['options',        () => fetchRawOptions(cpfCnpj, accountCode)],
    ['futures',        () => fetchRawFutures(cpfCnpj, accountCode)],
    ['btc',            () => fetchRawBtc(cpfCnpj, accountCode)],
    ['term',           () => fetchRawTerm(cpfCnpj, accountCode)],
    ['pension',        () => fetchRawPension(cpfCnpj)],
  ];
  const results = await Promise.allSettled(tarefas.map(([, fn]) => fn()));
  const bundle = {
    equities: [], fixedIncome: [], treasuryDirect: [], funds: [], coe: [],
    options: [], futures: [], btc: [], term: [], pension: [],
  } as AgoraRawBundle;
  const errors: string[] = [];
  results.forEach((r, i) => {
    const key = tarefas[i][0];
    if (r.status === 'fulfilled') bundle[key] = r.value;
    else { errors.push(key); logger.warn(`Ágora: falha ao buscar ${key}`, { reason: (r.reason as any)?.message }); }
  });
  return { bundle, errors };
}

// Último dia útil (D-1, pulando fim de semana). Feriados não tratados — aproximação
// p/ a data de referência da custódia Bradesco quando a API não a expõe.
function ultimoDiaUtilISO(): string {
  const d = new Date();
  do { d.setDate(d.getDate() - 1); } while (d.getDay() === 0 || d.getDay() === 6);
  return d.toISOString().slice(0, 10);
}

// Parse defensivo do referenceDate da Ágora (formato incerto) → 'YYYY-MM-DD' ou null.
function parseRefDateAgora(v: any): string | null {
  if (v == null || v === '') return null;
  const t = new Date(String(v));
  return isNaN(t.getTime()) ? null : t.toISOString().slice(0, 10);
}

// ─── Mapeia um bundle de raw → UnifiedPosition (puro, sem I/O) ────────────────
// Usado pela posição viva e pelo /transform (replay do raw arquivado, sem corretora).
export function mapAgoraBundle(bundle: AgoraRawBundle, accountCode: string): UnifiedPosition {
  const assets: UnifiedAsset[] = [
    ...mapEquities(bundle?.equities ?? []),
    ...mapFixedIncome(bundle?.fixedIncome ?? []),
    ...mapTreasuryDirect(bundle?.treasuryDirect ?? []),
    ...mapFunds(bundle?.funds ?? []),
    ...mapCoe(bundle?.coe ?? []),
    ...mapOptions(bundle?.options ?? []),
    ...mapFutures(bundle?.futures ?? []),
    ...mapBtc(bundle?.btc ?? []),
    ...mapTerm(bundle?.term ?? []),
    ...mapPension(bundle?.pension ?? []),
  ];

  const totalAmount = assets.reduce((sum, a) => sum + (a.grossValue ?? 0), 0);

  // Data real da posição: a Ágora não expõe uma data de posição confiável (os
  // campos de data são do ATIVO). Usa o referenceDate dos itens se vier parseável;
  // senão, último dia útil (custódia Bradesco liquida em D-1). Nunca carimba hoje.
  const refs = assets
    .map(a => parseRefDateAgora((a.extra as any)?.referenceDate))
    .filter((d): d is string => !!d)
    .sort();
  const positionDate = refs.length ? refs[refs.length - 1] : ultimoDiaUtilISO();

  return {
    institution: 'AGORA',
    accountNumber: accountCode,
    positionDate,
    totalAmount,
    currency: 'BRL',
    assets,
    rawMeta: { source: 'agora/detailedposition', fetchedAt: new Date().toISOString() },
  };
}

// ─── Posição completa — busca todas as classes (raw bundle) e consolida ──────
export async function getAgoraDetailedPosition(
  cpfCnpj: string,
  accountCode: string
): Promise<UnifiedPosition> {
  logger.info(`Ágora: buscando posição detalhada completa para conta ${accountCode}`);

  const { bundle, errors } = await fetchAgoraBundle(cpfCnpj, accountCode);
  const pos = mapAgoraBundle(bundle, accountCode);
  if (errors.length > 0) (pos.rawMeta as any).partialErrors = errors;
  pos.rawPayload = bundle;        // arquivo cru → posicao_raw → replay via /transform
  return pos;
}
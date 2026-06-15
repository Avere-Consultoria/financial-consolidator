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
      `${baseUrl}/data-access/api/v1/consolidated-positions/customer/${accountNumber}`,
      {
        httpsAgent: agent,
        timeout: 45_000,   // falha clara em vez de pendurar até o 504 do gateway
        headers: {
          'Ocp-Apim-Subscription-Key': subscriptionKey,
          Authorization: `Bearer ${token}`,
          // XP devolve 403 sem o User-Agent de parceiro (bloqueia o default do axios).
          'User-Agent': 'XPparceiro/AvereConsultoria',
          Accept: '*/*',
          'Content-Type': 'application/json',
        },
        // endpoint é por cliente (customerCode no path) — não usa $filter/$top de OData
      }
    );

    const data = response.data ?? {};
    logarEstruturaXP(data);   // estrutura (só nomes de campos, sem valores) p/ ajustar o mapper
    return mapXpPosition(data, accountNumber);
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;

    logger.error('XP: erro ao buscar posição', { accountNumber, status, data });

    if (status === 401) {
      // Distingue bloqueio de IP (CDN devolve HTML) de token inválido
      const isIpBlock = typeof data === 'string' && data.includes('Acesso Bloqueado');
      const msg = isIpBlock
        ? 'IP bloqueado pelo CDN da XP — solicite liberação em bloqueio-cdn@xpi.com.br'
        : 'Token XP inválido ou expirado';
      throw new ConsolidatorError('XP_UNAUTHORIZED', msg, 'XP', 401);
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
//
// A resposta é um OBJETO com arrays por classe (acoes, fundos, rendaFixa,
// tesouroDireto, previdencia, coe, opcoes, ...), não uma lista. Mapeamos cada
// array conhecido para a assetClass e extraímos valor/nome com fallbacks (os
// nomes exatos dos campos variam — o logarEstruturaXP ajuda a confirmar).
// ─────────────────────────────────────────────────────────────────────────────

const XP_ARRAY_CLASSE: Record<string, AssetClass> = {
  acoes: 'EQUITIES', acoesEListados: 'EQUITIES', rendaVariavel: 'EQUITIES',
  fundos: 'INVESTMENT_FUND', fundosInvestimento: 'INVESTMENT_FUND',
  rendaFixa: 'FIXED_INCOME', tesouroDireto: 'FIXED_INCOME',
  previdencia: 'PENSION',
  coe: 'OTHER',
  opcoes: 'DERIVATIVE', termos: 'DERIVATIVE', bmf: 'DERIVATIVE', futuros: 'DERIVATIVE',
  ouro: 'COMMODITY',
  alugueis: 'EQUITIES',
  saldoConta: 'CASH', contaCorrente: 'CASH', caixa: 'CASH',
};

const num = (...vs: any[]): number => {
  for (const v of vs) { const n = parseFloat(v); if (!isNaN(n)) return n; }
  return 0;
};
const str = (...vs: any[]): string | undefined => {
  for (const v of vs) if (v != null && String(v).trim() !== '') return String(v);
  return undefined;
};

// Coleta arrays de objetos em QUALQUER nível (a XP aninha tudo em posicaoDetalhada)
function coletarArrays(obj: any, achados: Record<string, any[]> = {}, prof = 0): Record<string, any[]> {
  if (!obj || typeof obj !== 'object' || prof > 6) return achados;
  for (const [k, v] of Object.entries(obj)) {
    if (Array.isArray(v)) {
      if (v.length && typeof v[0] === 'object') achados[k] = (achados[k] ?? []).concat(v as any[]);
    } else if (v && typeof v === 'object') {
      coletarArrays(v, achados, prof + 1);
    }
  }
  return achados;
}

function mapXpPosition(data: any, accountNumber: string): UnifiedPosition {
  const assets: UnifiedAsset[] = [];
  const positionDate = str(data.positionDate, data.dataPosicao, data.referenceDate, data.atualizeEm) ?? new Date().toISOString();

  const grupos = coletarArrays(data);
  for (const [chave, valor] of Object.entries(grupos)) {
    const assetClass = XP_ARRAY_CLASSE[chave] ?? 'OTHER';
    for (const item of valor as any[]) {
      const grossValue = num(item.grossValue, item.valorBruto, item.financialValue, item.valorMercado,
                              item.marketValue, item.valorLiquido, item.netValue, item.value, item.amount, item.saldo);
      assets.push({
        assetClass,
        name: str(item.productName, item.nome, item.name, item.ativo, item.descricao, item.ticker, item.symbol) ?? `XP ${chave}`,
        ticker: str(item.ticker, item.symbol, item.codigo, item.codigoNegociacao),
        securityCode: str(item.productCode, item.codigoProduto, item.isin),
        quantity: num(item.quantity, item.quantidade, item.qtd, item.shares),
        marketPrice: num(item.unitPrice, item.precoUnitario, item.precoMercado, item.lastPrice),
        grossValue,
        netValue: num(item.netValue, item.valorLiquido) || grossValue,
        incomeTax: num(item.incomeTax, item.ir, item.imposto),
        maturityDate: str(item.maturityDate, item.vencimento, item.dataVencimento),
        benchMark: str(item.indexer, item.indexador, item.benchmark),
        extra: { grupoXp: chave },
      });
    }
  }

  const totalAmount = num(data.patrimonioTotal, data.totalAmount, data.patrimonio, data.equity, data.totalEquity)
    || assets.reduce((s, a) => s + (a.grossValue ?? 0), 0);

  return {
    institution: 'XP',
    accountNumber,
    positionDate,
    totalAmount,
    currency: 'BRL',
    assets,
    rawMeta: { source: 'XP Data Access API v1', fetchedAt: new Date().toISOString() },
  };
}

// Loga só a ESTRUTURA (chaves de topo + nomes de campos do 1º item de cada array),
// sem valores — para confirmar os nomes reais e afinar o mapper sem vazar PII.
function logarEstruturaXP(data: any): void {
  try {
    const grupos = coletarArrays(data);
    const arrays: Record<string, { len: number; campos: string[] }> = {};
    for (const [k, v] of Object.entries(grupos)) {
      arrays[k] = { len: v.length, campos: v[0] ? Object.keys(v[0]) : [] };
    }
    logger.info('XP: estrutura da resposta', {
      topo: Object.keys(data ?? {}),
      dadoAtualizado: data?.dadoAtualizado,   // flag de prontidão (assíncrono)
      atualizeEm: data?.atualizeEm,
      arrays,                                  // arrays achados em QUALQUER nível + campos
    });
  } catch { /* diagnóstico best-effort */ }
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

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
    // A XP é assíncrona: a 1ª chamada dispara o cálculo (dadoAtualizado=false).
    // Em vez de devolver erro na hora, fazemos polling por até ~90s para que o
    // clique manual "só funcione". No sync agendado, a posição já chega pronta
    // (o tique anterior esquentou), então normalmente nem entra no loop.
    const buscar = async () => (await axios.get(
      `${baseUrl}/data-access/api/v1/consolidated-positions/customer/${accountNumber}`,
      {
        httpsAgent: agent,
        timeout: 45_000,
        headers: {
          'Ocp-Apim-Subscription-Key': subscriptionKey,
          Authorization: `Bearer ${token}`,
          'User-Agent': 'XPparceiro/AvereConsultoria',
          Accept: '*/*',
          'Content-Type': 'application/json',
        },
      },
    )).data ?? {};

    const MAX_TENTATIVAS = 6;
    const ESPERA_MS = 15_000;
    let data: any = {};
    for (let i = 0; i < MAX_TENTATIVAS; i++) {
      data = await buscar();
      if (data?.dadoAtualizado !== false) break;   // pronta (true ou sem flag)
      if (i < MAX_TENTATIVAS - 1) {
        logger.info(`XP: posição ainda preparando (tentativa ${i + 1}), aguardando…`);
        await new Promise((r) => setTimeout(r, ESPERA_MS));
      }
    }

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

// "D+59 (Dias Corridos)" → 59
const parseDplus = (s?: string): number => {
  const m = /D\+(\d+)/i.exec(s ?? '');
  return m ? parseInt(m[1], 10) : 0;
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

// Estrutura real: data.posicaoDetalhada.{financeiro, fundos, rendaFixa, tesouroDireto,
// previdencia, coe, acoes, ...}. Cada classe é { nome, itens:[], saldo, ... }.
// O patrimônio total é posicaoDetalhada.patrimonioTotal e fecha com a soma dos saldos.
function mapXpPosition(data: any, accountNumber: string): UnifiedPosition {
  // A XP é assíncrona: a 1ª chamada prepara, a 2ª entrega. Não grava posição vazia.
  if (data?.dadoAtualizado === false) {
    throw new ConsolidatorError('XP_DATA_PENDING',
      'Posição XP ainda sendo preparada pela XP — sincronize novamente em instantes', 'XP', 425);
  }

  const pd = data?.posicaoDetalhada ?? {};
  const assets: UnifiedAsset[] = [];
  const positionDate = str(pd?.financeiro?.dataPosicaoD0, pd?.dataAtualizacao) ?? new Date().toISOString();

  // 1. Caixa / disponível
  const disp = num(pd?.financeiro?.valorTotal, pd?.valorDisponivel);
  if (disp) assets.push({ assetClass: 'CASH', name: 'Disponível', grossValue: disp, netValue: disp, extra: { grupoXp: 'financeiro' } });

  // 2. Fundos
  for (const it of (pd?.fundos?.itens ?? [])) {
    assets.push({
      assetClass: 'INVESTMENT_FUND',
      name: it.nomeFundo ?? 'Fundo XP',
      quantity: num(it.quantidadeCotas),
      marketPrice: num(it.valorCota),
      grossValue: num(it.valorBruto, it.valorAtual),
      netValue: num(it.valorLiquido),
      incomeTax: num(it.valorImpostoRenda),
      extra: {
        cnpj: it.cnpj,
        fundLiquidity: parseDplus(it.periodoCotizacaoResgate) + parseDplus(it.periodoLiquidacaoResgate),
        grupoXp: 'fundos',
      },
    });
  }

  // 3. Renda Fixa + Tesouro Direto (mesma forma de item)
  for (const grp of ['rendaFixa', 'tesouroDireto']) {
    for (const it of (pd?.[grp]?.itens ?? [])) {
      assets.push({
        assetClass: 'FIXED_INCOME',
        name: str(it.nickName, it.nomeAtivo) ?? 'Título XP',
        ticker: str(it.codigoCetipSelic),
        quantity: num(it.quantidadeTotal, it.quantidadeDisponivel),
        marketPrice: num(it.precoUnitario),
        grossValue: num(it.valorFinanceiroBruto),
        netValue: num(it.valorFinanceiroLiquido),
        incomeTax: num(it.valorIr),
        maturityDate: str(it.dataVencimento),
        benchMark: str(it.nomeIndexador),
        indexRate: str(it.taxaCompleta),
        isLiquidity: it.indicadorTipoLiquidez === 'N',
        extra: {
          issuer: it.nomeEmissor,
          subTipo: it.categoria,                 // DEB/CRA/CRI/LF/CDB/NTN-B/LFT/LTN/CDCA
          issuerType: it.tipoDeAtivo,            // PRIVADO/PUBLICO
          rating: it.descricaoRatingAgencia,
          cetipCode: it.codigoCetipSelic,
          grupoXp: grp,
        },
      });
    }
  }

  // 4. Previdência
  for (const it of (pd?.previdencia?.itens ?? [])) {
    assets.push({
      assetClass: 'PENSION',
      name: str(it.nomePlano, it.nomeFundo) ?? 'Previdência XP',
      grossValue: num(it.valorReservaAcumulada),
      netValue: num(it.valorReservaAcumulada),
      extra: { cnpj: it.cnpj, subTipo: it.tipoPlano, manager: it.nomeSeguradora, grupoXp: 'previdencia' },
    });
  }

  // 5. COE
  for (const it of (pd?.coe?.itens ?? [])) {
    assets.push({
      assetClass: 'OTHER',
      name: it.nomeAtivo ?? 'COE XP',
      grossValue: num(it.valorFinanceiroBruto),
      netValue: num(it.valorFinanceiroLiquido),
      incomeTax: num(it.valorIr),
      maturityDate: str(it.dataVencimento),
      extra: { issuer: it.nomeEmissor, subTipo: 'COE', grupoXp: 'coe' },
    });
  }

  // 6. Ações / FII (vazio neste cliente, mas mapeia se vier)
  for (const it of (pd?.acoes?.itens ?? [])) {
    assets.push({
      assetClass: 'EQUITIES',
      name: str(it.nomeAtivo, it.ticker) ?? 'Ação XP',
      ticker: str(it.codigoNegociacao, it.ticker),
      quantity: num(it.quantidadeTotal, it.quantidade),
      marketPrice: num(it.precoUnitario, it.precoMercado),
      grossValue: num(it.valorFinanceiroBruto, it.valorBruto, it.valorMercado),
      netValue: num(it.valorFinanceiroLiquido, it.valorLiquido),
      extra: { grupoXp: 'acoes' },
    });
  }

  // 7. Proventos de RF (a receber) — entra para o total bater com o patrimonioTotal
  const prov = num(pd?.provisaoEventoRendaFixa?.saldo);
  if (prov) assets.push({ assetClass: 'OTHER', name: 'Proventos de Renda Fixa', grossValue: prov, netValue: prov, extra: { grupoXp: 'proventos' } });

  const totalAmount = num(pd?.patrimonioTotal) || assets.reduce((s, a) => s + (a.grossValue ?? 0), 0);

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

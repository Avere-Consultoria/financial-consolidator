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
    // Chamada ÚNICA. A XP é assíncrona (dadoAtualizado=false enquanto prepara),
    // e cada chamada empurra o horário de prontidão — então NÃO se faz polling
    // (martelar reseta o cronômetro da XP). Se vier pendente, mapXpPosition
    // devolve um erro claro; o sync agendado tenta de novo no próximo tique.
    const response = await axios.get(
      `${baseUrl}/data-access/api/v1/consolidated-positions/customer/${accountNumber}`,
      {
        httpsAgent: agent,
        // XP é assíncrona: no cold-start ela segura a conexão computando a posição
        // por até ~1 min antes de responder. 90s dá margem pra completar na 1ª chamada.
        timeout: 90_000,
        headers: {
          'Ocp-Apim-Subscription-Key': subscriptionKey,
          Authorization: `Bearer ${token}`,
          'User-Agent': 'XPparceiro/AvereConsultoria',
          Accept: '*/*',
          'Content-Type': 'application/json',
        },
      },
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
export function mapXpPosition(data: any, accountNumber: string): UnifiedPosition {
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
        raw: it,
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
          raw: it,
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
      extra: { cnpj: it.cnpj, subTipo: it.tipoPlano, manager: it.nomeSeguradora, grupoXp: 'previdencia', raw: it },
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
      extra: { issuer: it.nomeEmissor, subTipo: 'COE', grupoXp: 'coe', raw: it },
    });
  }

  // 6. Ações — a XP usa codigoAtivo/nomeEmpresaEmitente/valorAtual/precoUnitarioAtual.
  // Ações dentro de estruturada vêm com valorAtual 0 (some no filtro de zero, sem duplicar).
  for (const it of (pd?.acoes?.itens ?? [])) {
    assets.push({
      assetClass: 'EQUITIES',
      name: str(it.nomeEmpresaEmitente, it.codigoAtivo) ?? 'Ação XP',
      ticker: str(it.codigoAtivo),
      quantity: num(it.quantidadeTotalAbertura, it.quantidadeAbertura),
      marketPrice: num(it.precoUnitarioAtual),
      grossValue: num(it.valorAtual),
      netValue: num(it.valorAtual),
      extra: { grupoXp: 'acoes', raw: it },
    });
  }

  // 6.1 Fundos Imobiliários (FII/FIAgro listados) — seção própria na XP, mesma forma das ações.
  for (const it of (pd?.fundosImobiliarios?.itens ?? [])) {
    assets.push({
      assetClass: 'EQUITIES',
      name: str(it.nomeEmpresaEmitente, it.codigoAtivo) ?? 'FII XP',
      ticker: str(it.codigoAtivo),
      quantity: num(it.quantidadeTotalAtual, it.quantidadeAbertura),
      marketPrice: num(it.precoUnitarioAtual),
      grossValue: num(it.valorAtual),
      netValue: num(it.valorAtual),
      extra: { grupoXp: 'fundosImobiliarios', isFii: true, raw: it },
    });
  }

  // 6.5. Produtos Estruturados (COLLAR, etc.) — cada estrutura = 1 ativo (valor = saldo).
  // A ação-base vem com saldo 0 em `acoes` e some no filtro de zero (não duplica).
  for (const it of (pd?.produtosEstruturados?.itens ?? [])) {
    assets.push({
      assetClass: 'OTHER',
      name: str(it.nomeEstrutura, it.tipoEstrutura) ?? 'Estruturada',
      ticker: str(it.ativo),
      grossValue: num(it.saldo, it.custo),
      netValue: num(it.saldoLiquido, it.saldo, it.custo),
      maturityDate: str(it.dataEncerramento),
      extra: { subTipo: 'ESTRUTURADA', issuer: it.tipoEstrutura, grupoXp: 'estruturados', raw: it },
    });
  }

  // 7. Proventos de RF (a receber) — entra para o total bater com o patrimonioTotal
  const prov = num(pd?.provisaoEventoRendaFixa?.saldo);
  if (prov) assets.push({ assetClass: 'OTHER', name: 'Proventos de Renda Fixa', grossValue: prov, netValue: prov, extra: { grupoXp: 'proventos' } });

  const totalAmount = num(pd?.patrimonioTotal) || assets.reduce((s, a) => s + (a.grossValue ?? 0), 0);

  // "Em preparação" só vale quando a XP não devolveu posição ALGUMA. Quando
  // dadoAtualizado:false vem ACOMPANHADO da posição (último cálculo válido enquanto a
  // XP recalcula), usamos esses dados — descartá-los era o bug que travava a sync.
  if (assets.length === 0 && totalAmount === 0 && data?.dadoAtualizado === false) {
    const quando = data?.atualizeEm
      ? ` (prevista para ~${new Date(data.atualizeEm).toLocaleTimeString('pt-BR')})` : '';
    throw new ConsolidatorError('XP_DATA_PENDING',
      `Posição XP em preparação pela XP${quando} — aguarde ~1 min e sincronize de novo`, 'XP', 425);
  }

  return {
    institution: 'XP',
    accountNumber,
    positionDate,
    totalAmount,
    currency: 'BRL',
    assets,
    rawMeta: { source: 'XP Data Access API v1', fetchedAt: new Date().toISOString() },
    rawPayload: data,
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

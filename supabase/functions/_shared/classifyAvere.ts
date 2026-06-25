import { parseDataFlexivel } from './dates.ts'

// ─────────────────────────────────────────────────────────────────────────────
// AVERE Default Classification — v3 "classificação por certeza"
//
// Princípio (decisão de gestão, 2026-06-11): só classificamos automaticamente
// com lastro em dado imutável (assetClass, indexador, flag da API ou mapa
// curado por identificador). NOME nunca decide classe. Sem certeza → null
// ("A classificar") e o ativo entra na fila de revisão do Master.
//
// O mapa curado (tabela mapa_classificacao: CNPJ/ticker/ISIN/código → classe)
// é consultado em canonico.ts ANTES desta função valer como fallback.
//
// Mudanças v2 → v3:
//   • INVESTMENT_FUND não vira mais 'Multimercado' por padrão → null
//   • PENSION não vira mais 'Multimercado' → null (Master decide)
//   • RF sem indexador identificável não cai mais em 'Pós-fixado' → null
//   • DERIVATIVE sem marca de COE não cai mais em 'Alternativos' → null
//   • EQUITIES com ticker de fundo listado (final 11) → null (FII? ETF? mapa decide)
//   • default final não é mais 'Alternativos' → null
//
// TODO-3 (mantido): Avenue sem benchmark da API; bonds → Intl RF Prefixado
//         (grosso, sem CNPJ BR para resolver via mapa; Master ajusta exceções).
// ─────────────────────────────────────────────────────────────────────────────

export type ClasseAvere =
  | 'RF - Pós-fixado'
  | 'RF - Inflação'
  | 'RF - Prefixado'
  | 'Multimercado'
  | 'FII-FIAgro'
  | 'Renda Variável'
  | 'COE'
  | 'Estruturada'
  | 'Alternativos'
  | 'Internacional - Pós-fixado'
  | 'Internacional - RF - Inflação'
  | 'Internacional - RF - Prefixado'
  | 'Internacional - Multimercado'
  | 'Internacional - Renda Variável'
  | 'Caixa'
  | 'Conta Corrente'

export interface ClassifyInput {
  assetClass:   string
  institution:  string
  maturityDate?: string | null   // ativo tem vencimento definido?
  isLiquidity?:  boolean         // ativo tem resgate diário?
  benchMark?:    string | null   // 'CDI', 'IPCA+', 'PRE', etc.
  indexRate?:    string | null   // '100%CDI', '95%CDI', etc.
  bondType?:     string | null   // 'LFT', 'NTN-B', 'CDB', 'LCI' (Ágora)
  subTipo?:      string | null   // prefixo do ticker após parsearTicker (BTG)
  name?:         string | null
  isFII?:        boolean
  productType?:  string | null   // Avenue: 'Stocks', 'Bonds', 'Balance', etc.
}

export function classifyAvere(p: ClassifyInput): ClasseAvere | null {
  const { assetClass, institution } = p
  const bench    = `${p.benchMark ?? ''} ${p.indexRate ?? ''}`.toUpperCase().trim()
  const bondType = `${p.bondType ?? ''} ${p.subTipo ?? ''}`.toUpperCase().trim()
  const name     = (p.name ?? '').toUpperCase()
  const prodType = (p.productType ?? '').toUpperCase()
  const ticker   = (p.subTipo ?? '').toUpperCase().trim()

  // ── Avenue — tudo é Internacional ──────────────────────────────────────────
  if (institution === 'AVENUE') {
    if (assetClass === 'CASH' || prodType.includes('BALANCE')) return 'Conta Corrente'
    if (assetClass === 'CRYPTO')                               return 'Alternativos'
    if (assetClass === 'INVESTMENT_FUND' || prodType.includes('FUNDS')) return 'Internacional - Multimercado'
    if (assetClass === 'FIXED_INCOME'    || prodType.includes('BONDS')) {
      // [TODO-3] Todos bonds internacionais = RF Prefixado por falta de benchmark
      return 'Internacional - RF - Prefixado'
    }
    return 'Internacional - Renda Variável'
  }

  // COE pode chegar como DERIVATIVE (BTG) ou OTHER (XP) — o rótulo (subtipo/nome) decide.
  if (bondType.includes('COE') || /\bCOE\b/.test(name)) return 'COE'

  // Produto Estruturado (COLLAR, etc.) — a XP entrega em produtosEstruturados; o
  // conector mapeia como OTHER com subtipo ESTRUTURADA.
  if (bondType.includes('ESTRUTURAD')) return 'Estruturada'

  // ── Doméstico (BTG / Ágora / XP) ──────────────────────────────────────────
  if (assetClass === 'CASH')      return 'Conta Corrente'
  if (assetClass === 'CRYPTO')    return 'Alternativos'
  if (assetClass === 'COMMODITY') return 'Alternativos'

  if (assetClass === 'EQUITIES') {
    // Ticker B3 final 11/11B = fundo listado (FII? FIAgro? ETF?) — só o mapa
    // curado distingue; sem mapa, fica para revisão.
    if (/11B?$/.test(ticker)) return null
    return 'Renda Variável'
  }

  // Previdência: composição interna varia (RF/MM/ações) — Master decide. [R1]
  if (assetClass === 'PENSION') return null

  if (assetClass === 'DERIVATIVE') {
    // 'COE' como token é rótulo explícito de produto estruturado (não é
    // heurística de nome livre); os códigos CETIP de COE estão no mapa.
    if (bondType.includes('COE') || /\bCOE\b/.test(name)) return 'COE'
    return null
  }

  // Fundos: classe vem do mapa curado por CNPJ (canonico.ts). Aqui só a flag
  // explícita da API conta; nome NÃO decide. Sem certeza → revisão.
  if (assetClass === 'INVESTMENT_FUND') {
    if (p.isFII === true) return 'FII-FIAgro'
    return null
  }

  // ── Renda Fixa — certeza vem do INDEXADOR (dado imutável da API) ──────────
  if (assetClass === 'FIXED_INCOME') {

    // Liquidez diária sem vencimento = caixa (conta remunerada etc.)
    if (p.isLiquidity && !p.maturityDate) return 'Caixa'
    if (!p.maturityDate) return 'Caixa'

    // Indexador explícito (aceita variações: a XP manda "IPC-A" com hífen)
    if (/IPCA|IPC-A|IGP|INPC/.test(bench))           return 'RF - Inflação'
    if (/\bPR[EÉ]\b|PREFIXAD/.test(bench))           return 'RF - Prefixado'
    if (/CDI|SELIC|\bDI\b/.test(bench))              return 'RF - Pós-fixado'

    // Tipo do título como segunda fonte (Ágora bondType / BTG subTipo)
    if (/NTN-B/.test(bondType))                      return 'RF - Inflação'
    if (/\bLTN\b|NTN-F/.test(bondType))              return 'RF - Prefixado'
    if (/\bLFT\b/.test(bondType))                    return 'RF - Pós-fixado'

    // Taxa fixa pura, sem indexador → prefixado. Cobre os dois formatos:
    //   XP    → "+13,50%"          (vírgula, prefixo +)
    //   Ágora → "14.0% a.a."       (ponto, sufixo "a.a."/"ao ano")
    // Uma taxa nominal isolada (sem CDI/IPCA/SELIC/TR/dólar) é renda fixa prefixada.
    if (/^\+?\s*\d+([.,]\d+)?\s*%(\s*a\.?\s*a\.?|\s*ao\s*ano)?$/i.test(bench)) return 'RF - Prefixado'

    // Sem indexador nem taxa identificável → revisão
    return null
  }

  return null
}

// ─────────────────────────────────────────────────────────────────────────────
// suggestLiquidezAvere
// Retorna o D+ sugerido para dicionario_ativos.liquidez_avere (string | null)
// null = sem dado automático → master preenche manualmente
// ─────────────────────────────────────────────────────────────────────────────

export function suggestLiquidezAvere(p: {
  assetClass:     string
  institution:    string
  maturityDate?:  string | null
  isLiquidity?:   boolean
  fundLiquidity?: number | string | null  // D+ reportado pela API do fundo (ex: BTG FundLiquidity)
}): string | null {
  const { assetClass } = p

  // ── Ativos com convenção clara ─────────────────────────────────────────────
  if (assetClass === 'CASH')     return '0'
  if (assetClass === 'EQUITIES') return '2'   // D+2 padrão liquidação bolsa
  if (assetClass === 'CRYPTO')   return '1'   // D+1 convenção

  // ── Previdência: produto vitalício, sem vencimento definido ────────────────
  // Master preenche manualmente com base no planejamento do cliente
  if (assetClass === 'PENSION')  return null

  // ── Renda Fixa: calcula dias até o vencimento ──────────────────────────────
  if (assetClass === 'FIXED_INCOME') {
    if (p.isLiquidity) return '0'
    const t = parseDataFlexivel(p.maturityDate)
    if (t == null) return null   // data ausente/inválida → master preenche
    const days = Math.ceil((t - Date.now()) / 86_400_000)
    return String(Math.max(0, days))
  }

  // ── Fundos: usa dado real da API quando disponível ─────────────────────────
  if (assetClass === 'INVESTMENT_FUND') {
    // 1. Preferência: D+ informado pela API (ex: BTG FundLiquidity = 61)
    if (p.fundLiquidity != null && p.fundLiquidity !== '') {
      return String(p.fundLiquidity)
    }
    // 2. Flag de liquidez diária (Ágora/XP) → D+1
    if (p.isLiquidity) return '1'
    // 3. Sem dados → master preenche
    return null
  }

  // ── Demais classes (DERIVATIVE, COMMODITY, OTHER) → master preenche ────────
  return null
}

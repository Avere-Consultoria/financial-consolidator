// ─────────────────────────────────────────────────────────────────────────────
// AVERE Default Classification — v2
// Lógica: vencimento vs liquidez → benchmark → assetClass
//
// ⚠️  DECISÕES PENDENTES — debater com o Master antes de alterar
//
// TODO-1  LFT / Tesouro Selic
//         Tem maturityDate mas na prática funciona como caixa diário.
//         Atualmente entra como RF-Pós-fixado (tem vencimento → segue a árvore RF).
//         Para mudar para Caixa, descomente a linha marcada com [TODO-1] abaixo.
//
// TODO-2  CDB / LCI / LCA com isLiquidity = true
//         Tem vencimento E flag de liquidez diária ao mesmo tempo.
//         Atualmente: isLiquidity=true → Caixa (liquidez vence o vencimento).
//         Para manter sempre como RF independente da liquidez,
//         remova a linha marcada com [TODO-2] abaixo.
//
// TODO-3  Avenue — bonds internacionais
//         Sem dados de benchmark da API; todos entram como RF Prefixado.
//         Para diferenciar floating/inflation seria preciso dados extras.
//         Por ora o master ajusta manualmente os casos excepcionais.
// ─────────────────────────────────────────────────────────────────────────────

export type ClasseAvere =
  | 'RF - Pós-fixado'
  | 'RF - Inflação'
  | 'RF - Prefixado'
  | 'Multimercado'
  | 'FII-FIAgro'
  | 'Renda Variável'
  | 'COE'
  | 'Alternativos'
  | 'Internacional - Pós-fixado'
  | 'Internacional - RF Inflação'
  | 'Internacional - RF Prefixado'
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

export function classifyAvere(p: ClassifyInput): ClasseAvere {
  const { assetClass, institution } = p
  const bench    = `${p.benchMark ?? ''} ${p.indexRate ?? ''}`.toUpperCase().trim()
  const bondType = `${p.bondType ?? ''} ${p.subTipo ?? ''}`.toUpperCase().trim()
  const name     = (p.name ?? '').toUpperCase()
  const prodType = (p.productType ?? '').toUpperCase()

  // ── Avenue — tudo é Internacional ──────────────────────────────────────────
  if (institution === 'AVENUE') {
    if (assetClass === 'CASH' || prodType.includes('BALANCE')) return 'Conta Corrente'
    if (assetClass === 'CRYPTO')                               return 'Alternativos'
    if (assetClass === 'INVESTMENT_FUND' || prodType.includes('FUNDS')) return 'Internacional - Multimercado'
    if (assetClass === 'FIXED_INCOME'    || prodType.includes('BONDS')) {
      // [TODO-3] Todos bonds internacionais = RF Prefixado por falta de benchmark
      return 'Internacional - RF Prefixado'
    }
    return 'Internacional - Renda Variável'
  }

  // ── Doméstico (BTG / Ágora / XP) ──────────────────────────────────────────
  if (assetClass === 'CASH')      return 'Conta Corrente'
  if (assetClass === 'CRYPTO')    return 'Alternativos'
  if (assetClass === 'COMMODITY') return 'Alternativos'
  if (assetClass === 'EQUITIES')  return 'Renda Variável'
  if (assetClass === 'PENSION')   return 'Multimercado'

  if (assetClass === 'DERIVATIVE') {
    if (bondType.includes('COE') || name.includes('COE')) return 'COE'
    return 'Alternativos'
  }

  if (assetClass === 'INVESTMENT_FUND') {
    if (p.isFII === true) return 'FII-FIAgro'
    if (
      name.includes('FII')          ||
      name.includes('FIAGRO')       ||
      name.includes('FI-AGRO')      ||
      name.includes('IMOBILIÁRIO')  ||
      name.includes('IMOBILIARIO')
    ) return 'FII-FIAgro'
    return 'Multimercado'
  }

  // ── Renda Fixa — árvore principal: vencimento vs liquidez ─────────────────
  if (assetClass === 'FIXED_INCOME') {

    // [TODO-1] LFT → descomentar para classificar como Caixa em vez de RF
    // if (/\bLFT\b/.test(bondType) || name.includes('TESOURO SELIC')) return 'Caixa'

    // [TODO-2] isLiquidity → Caixa (liquidez diária vence o vencimento)
    // Para manter sempre como RF, remova a linha abaixo:
    if (p.isLiquidity && !p.maturityDate) return 'Caixa'

    // Sem data de vencimento = ativo em aberto (ex: conta remunerada) → Caixa
    if (!p.maturityDate) return 'Caixa'

    // ── Tem vencimento → sub-classificar pelo benchmark ────────────────────
    if (/IPCA|IGP|INPC/.test(bench))               return 'RF - Inflação'
    if (/\bPRE\b|PREFIXADO/.test(bench))            return 'RF - Prefixado'

    // Tipo do título como segunda fonte (Ágora bondType / BTG subTipo)
    if (/NTN-B/.test(bondType))                    return 'RF - Inflação'
    if (/\bLTN\b|NTN-F/.test(bondType))            return 'RF - Prefixado'
    // [TODO-1] LFT inline — descomentar se quiser Caixa:
    // if (/\bLFT\b/.test(bondType))               return 'Caixa'

    // CDI/DI/SELIC ou sem benchmark → padrão pós-fixado
    return 'RF - Pós-fixado'
  }

  return 'Alternativos'
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
    if (p.isLiquidity || !p.maturityDate) return '0'
    const days = Math.ceil(
      (new Date(p.maturityDate).getTime() - Date.now()) / 86_400_000
    )
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

// ─────────────────────────────────────────────────────────────────────────────
// Tipos compartilhados entre Edge Functions
// ─────────────────────────────────────────────────────────────────────────────

export type Institution = 'BTG' | 'XP' | 'AVENUE' | 'AGORA'

export type AssetClass =
  | 'FIXED_INCOME'
  | 'INVESTMENT_FUND'
  | 'EQUITIES'
  | 'PENSION'
  | 'CRYPTO'
  | 'DERIVATIVE'
  | 'COMMODITY'
  | 'CASH'
  | 'OTHER'

/**
 * Shape unificado retornado pelo Consolidador (Railway) para BTG/XP/Ágora.
 * Campos do `extra` variam por instituição — manter como Record para flexibilidade.
 */
export interface UnifiedAsset {
  assetClass: string
  ticker?: string | null
  name?: string | null
  securityCode?: string | null
  grossValue?: number | null
  netValue?: number | null
  marketPrice?: number | null
  quantity?: number | null
  incomeTax?: number | null
  maturityDate?: string | null
  benchMark?: string | null
  indexRate?: string | null
  isLiquidity?: boolean
  extra?: Record<string, any>
}

/** Linha pronta para `upsert` em `dicionario_ativos`. */
export interface DicionarioRow {
  codigo_identificador: string
  tipo_identificador: 'ISIN' | 'TICKER' | 'CNPJ' | 'CUSIP'
  nome_ativo: string
  benchmark: string | null
  instituicao_origem: Institution
  classe_original: string
  data_vencimento: string | null
  classe_avere: string
  liquidez_avere: string | null
  vencimento_api_original: string | null
  liquidez_api_original: string | null
  emissor_original?: string | null
}

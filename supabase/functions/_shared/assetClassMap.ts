// ─────────────────────────────────────────────────────────────────────────────
// Mapas canônicos de assetClass → label / sub-tipo padrão
// Usado por BTG, XP e Ágora. Avenue mantém override local (labels em USD).
// ─────────────────────────────────────────────────────────────────────────────

const TIPO_LABEL: Record<string, string> = {
  FIXED_INCOME:    'Renda Fixa',
  INVESTMENT_FUND: 'Fundos de Investimento',
  EQUITIES:        'Renda Variável',
  PENSION:         'Previdência',
  CRYPTO:          'Criptomoedas',
  DERIVATIVE:      'Derivativos',
  COMMODITY:       'Commodities',
  CASH:            'Conta Corrente',
  OTHER:           'Outros',
}

const SUBTIPO_PADRAO: Record<string, string> = {
  INVESTMENT_FUND: 'FUNDO',
  EQUITIES:        'AÇÃO',
  PENSION:         'PREV',
  CRYPTO:          'CRYPTO',
  DERIVATIVE:      'DERIV',
  COMMODITY:       'COMOD',
  CASH:            'CC',
}

export function mapTipoLabel(assetClass: string): string {
  return TIPO_LABEL[assetClass] ?? assetClass
}

export function mapSubTipoPadrao(assetClass: string): string {
  return SUBTIPO_PADRAO[assetClass] ?? ''
}

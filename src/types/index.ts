// ─────────────────────────────────────────────────────────────────────────────
// Tipos Unificados — Financial Consolidator
// Modelo normalizado independente da instituição de origem
// ─────────────────────────────────────────────────────────────────────────────

export type Institution = 'BTG' | 'XP' | 'AGORA'| 'AVENUE';

export type AssetClass =
  | 'FIXED_INCOME'
  | 'EQUITIES'
  | 'INVESTMENT_FUND'
  | 'PENSION'
  | 'CRYPTO'
  | 'DERIVATIVE'
  | 'COMMODITY'
  | 'CASH'
  | 'OTHER';

// ─── Posição Unificada ────────────────────────────────────────────────────────

export interface UnifiedPosition {
  institution: Institution;
  accountNumber: string;
  positionDate: string;          // ISO 8601
  totalAmount: number;
  currency: string;              // sempre BRL por ora
  assets: UnifiedAsset[];
  rawMeta?: {
    source: string;
    fetchedAt: string;
  };
}

export interface UnifiedAsset {
  assetClass: AssetClass;
  name: string;
  ticker?: string;
  securityCode?: string;
  quantity?: number;
  marketPrice?: number;
  grossValue: number;
  netValue?: number;
  incomeTax?: number;
  costPrice?: number;
  acquisitionDate?: string;
  maturityDate?: string;
  benchMark?: string;
  indexRate?: string;
  isLiquidity?: boolean;
  extra?: Record<string, unknown>; // campos adicionais específicos da instituição
}

// ─── Posição Consolidada (multi-instituição) ──────────────────────────────────

export interface ConsolidatedPosition {
  accountNumber: string;
  consolidatedAt: string;
  totalAmount: number;
  currency: string;
  byInstitution: {
    institution: Institution;
    totalAmount: number;
    positionDate: string;
  }[];
  byAssetClass: {
    assetClass: AssetClass;
    totalAmount: number;
    percentage: number;
  }[];
  positions: UnifiedPosition[];
}

// ─── Respostas da API ─────────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    institution?: Institution;
  };
  meta?: {
    cachedAt?: string;
    fetchedAt: string;
  };
}

// ─── Ágora — Extras tipados por classe de ativo ──────────────────────────────

export interface AgoraEquityExtra {
  source?: string;
  securityType?: string;
  companyName?: string;
  availableQuantity?: number;
  blockedQuantity?: number;
  averagePrice?: number;
  valueAppreciation?: number;
  percentAppreciation?: number;
}

export interface AgoraFixedIncomeExtra {
  bondType?: string;
  issuerName?: string;
  indexerPercentage?: number;
  valueAppreciation?: number;
  percentAppreciation?: number;
  sourceCode?: string;
}

export interface AgoraTreasuryExtra {
  bondType?: string;
  marketType?: string;
  purchasePrice?: number;
  vlPriceSell?: number;
  vlAppreciation?: number;
  percAppreciation?: number;
  guaranteeQuantity?: number;
}

export interface AgoraFundExtra {
  sourceCode?: string;
  referenceDate?: string;
  iofValue?: number;
  irValue?: number;
  status?: string;
  openForApplication?: boolean;
  openForRescue?: boolean;
  vlApprec?: number;
  pcApprec?: number;
}

export interface AgoraCoeExtra {
  coeId?: string;
  issuerName?: string;
  ratingCode?: string;
  status?: string;
  lackTime?: number;
  pcVariation?: number;
}

export interface AgoraOptionExtra {
  stockType?: string;
  exercisePrice?: number;
  averagePrice?: number;
  valueAppreciation?: number;
  percentAppreciation?: number;
}

export interface AgoraFutureExtra {
  buyQuantity?: number;
  sellQuantity?: number;
  currentPriceValue?: number;
  totalNotional?: number;
}

export interface AgoraBtcExtra {
  side?: string;
  tax?: number;
  openDate?: string;
  contractPrice?: number;
  contractValue?: number;
  vlLiq?: number;
}

export interface AgoraTermExtra {
  price?: number;
  contractValue?: number;
  result?: number;
  percentage?: number;
  currentAssetPrice?: number;
}

// ─── Avenue — Extras e tipos por view ────────────────────────────────────────

export interface AvenueAucExtra {
  currencyOriginal: 'USD';
  grossValueUsd: number;
  officeName: string;
}

export interface AvenueAccountInsight {
  date: string;
  clientCpf: string;
  clientName: string;
  categoria: string;   // ex: "Risco", "Oportunidade", "Diversificação"
  insight: string;     // texto descritivo do insight
  prioridade: string;  // ex: "Alta", "Média", "Baixa"
  moeda: string;       // "BRL" ou "USD"
  valor: number;       // valor financeiro associado ao insight
}

// ─── Erros ────────────────────────────────────────────────────────────────────

export class ConsolidatorError extends Error {
  constructor(
    public code: string,
    message: string,
    public institution?: Institution,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'ConsolidatorError';
  }
}

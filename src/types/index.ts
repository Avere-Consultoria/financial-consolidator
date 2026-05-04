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

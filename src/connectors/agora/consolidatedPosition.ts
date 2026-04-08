import axios from 'axios';
import { logger } from '../../utils/logger';
import { UnifiedPosition, UnifiedAsset, AssetClass, ConsolidatorError } from '../../types';
import { getAgoraBaseUrl, getAgoraHeaders, getAgoraHttpsAgent } from './auth';

// ─────────────────────────────────────────────────────────────────────────────
// Ágora — Posição Consolidada
// Sandbox: POST /managers-portfolio-mgmt/v1/{endpoint}
// Produção: GET  /api/managers-portfolio-mgmt/v1/portfolio/{endpoint}
// ─────────────────────────────────────────────────────────────────────────────

const isProduction = () => process.env.AGORA_ENVIRONMENT === 'production';

function getBasePath(): string {
  return '/managers-portfolio-mgmt/v1';
}

function mapInstrumentType(code: string): AssetClass {
  const map: Record<string, AssetClass> = {
    RV:   'EQUITIES',
    TPV:  'FIXED_INCOME',
    TPB:  'FIXED_INCOME',
    FUN:  'INVESTMENT_FUND',
    COE:  'OTHER',
    OCP:  'DERIVATIVE',
    OUR:  'COMMODITY',
    TERM: 'DERIVATIVE',
    CC:   'CASH',
    GAR:  'OTHER',
    PVD:  'PENSION',
  };
  return map[code] ?? 'OTHER';
}

async function agoraRequest(path: string): Promise<any> {
  const url = `${getAgoraBaseUrl()}${path}`;
  const headers = await getAgoraHeaders();
  const agent = getAgoraHttpsAgent();

  if (isProduction()) {
    const { data } = await axios.get(url, {
      headers,
      httpsAgent: agent,
    });
    return data;
  } else {
    const { data } = await axios.post(url, {}, {
      headers,
      httpsAgent: agent,
    });
    return data;
  }
}

// ─── List Summary — patrimônio + distribuição por instrumento ─────────────────
export async function getAgoraConsolidatedPosition(
  cpfCnpj: string,
  accountCode: string
): Promise<UnifiedPosition> {
  try {
    logger.info(`Ágora: buscando posição consolidada para conta ${accountCode}`);

    const data = await agoraRequest(
      `${getBasePath()}/listsummary/${cpfCnpj}/${accountCode}`
    );

    // Sandbox retorna "allocation", produção retorna "result.products"
    const allocation = data?.allocation ?? {};
    const products = data?.result?.products ?? {};

    const classMap: Record<string, AssetClass> = {
      // sandbox keys
      equity:           'EQUITIES',
      fixedIncome:      'FIXED_INCOME',
      multimarket:      'INVESTMENT_FUND',
      collateral:       'OTHER',
      derivatives:      'DERIVATIVE',
      stockLending:     'EQUITIES',
      projectedBalance: 'CASH',
    };

    let assets: UnifiedAsset[] = [];

    if (Object.keys(allocation).length > 0) {
      // Sandbox
      assets = Object.entries(allocation).map(([key, p]: any) => ({
        assetClass: classMap[key] ?? 'OTHER',
        name: p.description ?? key,
        grossValue: p.grossPatrimony ?? 0,
        extra: { code: p.code, percentage: p.percentage },
      }));
    } else if (Object.keys(products).length > 0) {
      // Produção
      const rawProducts = Array.isArray(products) ? products : Object.values(products);
      assets = rawProducts.map((p: any) => ({
        assetClass: mapInstrumentType(p.instrumentType),
        name: p.description ?? p.instrumentType,
        grossValue: p.grossPatrimony ?? 0,
        netValue: p.liquidPatrimony ?? undefined,
        costPrice: p.purchaseTotal ?? undefined,
        extra: {
          instrumentType: p.instrumentType,
          percentagePatrimony: p.percentagePatrimony,
          valueAppreciation: p.valueAppreciation,
          percentAppreciation: p.percentAppreciation,
        },
      }));
    }

    return {
      institution: 'AGORA',
      accountNumber: accountCode,
      positionDate: data?.referenceDate ?? new Date().toISOString(),
      totalAmount: data?.totalGrossPatrimony ?? data?.valuePatrimonyTotalGross ?? 0,
      currency: 'BRL',
      assets,
      rawMeta: {
        source: 'agora/listsummary',
        fetchedAt: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    logger.error('Ágora: erro detalhado', {
      status: err?.response?.status,
      data: JSON.stringify(err?.response?.data),
      message: err?.message,
    });
    throw new ConsolidatorError(
      'AGORA_CONSOLIDATED_ERROR',
      `Erro ao buscar posição consolidada Ágora: ${JSON.stringify(err?.response?.data) ?? err.message}`,
      'AGORA',
      err?.response?.status ?? 502
    );
  }
}

// ─── Summary — posição agrupada por classe ────────────────────────────────────
export async function getAgoraSummary(
  cpfCnpj: string,
  accountCode: string
): Promise<any> {
  try {
    logger.info(`Ágora: buscando summary para conta ${accountCode}`);
    return await agoraRequest(
      `${getBasePath()}/summary/${cpfCnpj}/${accountCode}`
    );
  } catch (err: any) {
    throw new ConsolidatorError(
      'AGORA_SUMMARY_ERROR',
      `Erro ao buscar summary Ágora: ${err?.response?.data?.message ?? err.message}`,
      'AGORA',
      err?.response?.status ?? 502
    );
  }
}

// ─── List Summary Less Prev — sem dados projetados ────────────────────────────
export async function getAgoraListSummaryLessPrev(
  cpfCnpj: string,
  accountCode: string
): Promise<any> {
  try {
    return await agoraRequest(
      `${getBasePath()}/listsummaryLessPrev/${cpfCnpj}/${accountCode}`
    );
  } catch (err: any) {
    throw new ConsolidatorError(
      'AGORA_LIST_SUMMARY_LESS_PREV_ERROR',
      `Erro ao buscar listsummaryLessPrev Ágora: ${err?.response?.data?.message ?? err.message}`,
      'AGORA',
      err?.response?.status ?? 502
    );
  }
}
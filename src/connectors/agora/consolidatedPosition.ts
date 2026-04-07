import axios from 'axios';
import { logger } from '../../utils/logger';
import { UnifiedPosition, UnifiedAsset, AssetClass, ConsolidatorError } from '../../types';
import { getAgoraBaseUrl, getAgoraHeaders, getAgoraHttpsAgent } from './auth';

// ─────────────────────────────────────────────────────────────────────────────
// Ágora — Posição Consolidada (visão por tipo de instrumento)
// Todos os endpoints usam POST
// ─────────────────────────────────────────────────────────────────────────────

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

async function agoraPost(path: string): Promise<any> {
  const url = `${getAgoraBaseUrl()}${path}`;
  const headers = await getAgoraHeaders();
  const { data } = await axios.post(url, {}, {
    headers,
    httpsAgent: getAgoraHttpsAgent(),
  });
  return data;
}

// ─── List Summary — patrimônio + distribuição por instrumento ─────────────────
export async function getAgoraConsolidatedPosition(
  cpfCnpj: string,
  accountCode: string
): Promise<UnifiedPosition> {
  try {
    logger.info(`Ágora: buscando posição consolidada para conta ${accountCode}`);

    const data = await agoraPost(
      `/managers-portfolio-mgmt/v1/listsummary/${cpfCnpj}/${accountCode}`
    );

    // Ágora retorna "allocation" com objetos por classe
    const allocation = data?.allocation ?? {};

    const classMap: Record<string, AssetClass> = {
      equity:           'EQUITIES',
      fixedIncome:      'FIXED_INCOME',
      multimarket:      'INVESTMENT_FUND',
      collateral:       'OTHER',
      derivatives:      'DERIVATIVE',
      stockLending:     'EQUITIES',
      projectedBalance: 'CASH',
    };

    const assets: UnifiedAsset[] = Object.entries(allocation).map(([key, p]: any) => ({
      assetClass: classMap[key] ?? 'OTHER',
      name: p.description ?? key,
      grossValue: p.grossPatrimony ?? 0,
      extra: {
        code: p.code,
        percentage: p.percentage,
      },
    }));

    return {
      institution: 'AGORA',
      accountNumber: accountCode,
      positionDate: data?.referenceDate ?? new Date().toISOString(),
      totalAmount: data?.totalGrossPatrimony ?? 0,
      currency: 'BRL',
      assets,
      rawMeta: {
        source: 'agora/listsummary',
        fetchedAt: new Date().toISOString(),
      },
    };
  } catch (err: any) {
    throw new ConsolidatorError(
      'AGORA_CONSOLIDATED_ERROR',
      `Erro ao buscar posição consolidada Ágora: ${err?.response?.data?.message ?? err.message}`,
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
    return await agoraPost(
      `/managers-portfolio-mgmt/v1/summary/${cpfCnpj}/${accountCode}`
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
    return await agoraPost(
      `/managers-portfolio-mgmt/v1/listsummaryLessPrev/${cpfCnpj}/${accountCode}`
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
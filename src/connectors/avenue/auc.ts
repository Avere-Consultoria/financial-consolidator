import axios from 'axios';
import { getAvenueToken } from './auth';
import { ConsolidatorError } from '../../types';
import { logger } from '../../utils/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Avenue — AUC (Assets Under Custody)
// POST /api/4.0/queries/run/json
// Custódia somada por produto, ativo, cliente e data
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = 'https://avenueanalytics.cloud.looker.com/api/4.0';

export interface AvenueAucEntry {
  date: string;
  clientCpf: string;
  clientName: string;
  clientEmail: string;
  foreignFinderName: string;
  foreignFinderEmail: string;
  foreignFinderCode: string;
  officeCnpj: string;
  officeName: string;
  productType: string;
  productCusip: string;
  productName: string;
  productSymbol: string;
  aucBrl: number;
  aucUsd: number;
  quantity: number;
  maturityDate: string | null;
  isin: string | null;
}

export async function getAvenueAuc(date: string): Promise<AvenueAucEntry[]> {
  const token = await getAvenueToken();

  try {
    logger.info(`Avenue: buscando AUC para ${date}`);

    const response = await axios.post(
      `${BASE_URL}/queries/run/json`,
      {
        model: 'avenue_b2b_office_api',
        view: 'auc',
        fields: [
          'auc.date',
          'auc.client_cpf',
          'auc.client_email',
          'auc.client_name',
          'auc.foreign_finder_email',
          'auc.foreign_finder_name',
          'auc.foreign_finder_code',
          'auc.office_cnpj',
          'auc.office_name',
          'auc.product_type',
          'auc.product_cusip',
          'auc.product_name',
          'auc.product_symbol',
          'auc.auc_brl',
          'auc.auc_usd',
          'auc.quantity',
          'auc.maturity_date',
          'auc.isin',
        ],
        filters: { 'auc.date': date },
        limit: -1,
      },
      {
        headers: { Authorization: `token ${token}` },
      }
    );

    return (response.data ?? []).map(mapAucEntry);
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;

    logger.error('Avenue: erro ao buscar AUC', { date, status, data });

    if (status === 401) {
      throw new ConsolidatorError('AVENUE_UNAUTHORIZED', 'Token Avenue inválido ou expirado', 'AVENUE', 401);
    }

    throw new ConsolidatorError(
      'AVENUE_AUC_ERROR',
      `Erro ao buscar AUC Avenue: ${data?.message ?? err.message}`,
      'AVENUE',
      status ?? 502
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapper: Looker row → AvenueAucEntry
// ─────────────────────────────────────────────────────────────────────────────

function mapAucEntry(row: any): AvenueAucEntry {
  return {
    date: row['auc.date'] ?? '',
    clientCpf: row['auc.client_cpf'] ?? '',
    clientName: row['auc.client_name'] ?? '',
    clientEmail: row['auc.client_email'] ?? '',
    foreignFinderName: row['auc.foreign_finder_name'] ?? '',
    foreignFinderEmail: row['auc.foreign_finder_email'] ?? '',
    foreignFinderCode: row['auc.foreign_finder_code'] ?? '',
    officeCnpj: row['auc.office_cnpj'] ?? '',
    officeName: row['auc.office_name'] ?? '',
    productType: row['auc.product_type'] ?? '',
    productCusip: row['auc.product_cusip'] ?? '',
    productName: row['auc.product_name'] ?? '',
    productSymbol: row['auc.product_symbol'] ?? '',
    aucBrl: parseFloat(row['auc.auc_brl'] ?? '0'),
    aucUsd: parseFloat(row['auc.auc_usd'] ?? '0'),
    quantity: parseFloat(row['auc.quantity'] ?? '0'),
    maturityDate: row['auc.maturity_date'] ?? null,
    isin: row['auc.isin'] ?? null,
  };
}

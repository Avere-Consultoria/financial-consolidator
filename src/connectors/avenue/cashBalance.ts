import axios from 'axios';
import { getAvenueToken } from './auth';
import { ConsolidatorError } from '../../types';
import { logger } from '../../utils/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Avenue — Cash Balance
// POST /api/4.0/queries/run/json
// Posição em caixa por cliente — banking USD, EUR, Clearing e Brasil
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = 'https://avenueanalytics.cloud.looker.com/api/4.0';

export interface AvenueCashBalance {
  date: string;
  clientCpf: string;
  clientName: string;
  clientEmail: string;
  foreignFinderName: string;
  foreignFinderEmail: string;
  foreignFinderCode: string;
  officeCnpj: string;
  officeName: string;
  productCusip: string;
  productName: string;   // ex: "banking Dólar", "banking Euro", "Clearing", "Brasil"
  balanceBrl: number;
  balanceUsd: number;
}

export async function getAvenueCashBalance(date: string): Promise<AvenueCashBalance[]> {
  const token = await getAvenueToken();

  try {
    logger.info(`Avenue: buscando cash balance para ${date}`);

    const response = await axios.post(
      `${BASE_URL}/queries/run/json`,
      {
        model: 'avenue_b2b_office_api',
        view: 'cash_balance',
        fields: [
          'cash_balance.date',
          'cash_balance.client_cpf',
          'cash_balance.client_email',
          'cash_balance.client_name',
          'cash_balance.foreign_finder_email',
          'cash_balance.foreign_finder_name',
          'cash_balance.foreign_finder_code',
          'cash_balance.office_cnpj',
          'cash_balance.office_name',
          'cash_balance.product_cusip',
          'cash_balance.product_name',
          'cash_balance.balance_brl',
          'cash_balance.balance_usd',
        ],
        filters: { 'cash_balance.date': date },
        limit: -1,
      },
      {
        headers: { Authorization: `token ${token}` },
      }
    );

    return (response.data ?? []).map(mapCashBalance);
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;

    logger.error('Avenue: erro ao buscar cash balance', { date, status, data });

    if (status === 401) {
      throw new ConsolidatorError('AVENUE_UNAUTHORIZED', 'Token Avenue inválido ou expirado', 'AVENUE', 401);
    }

    throw new ConsolidatorError(
      'AVENUE_CASH_BALANCE_ERROR',
      `Erro ao buscar cash balance Avenue: ${data?.message ?? err.message}`,
      'AVENUE',
      status ?? 502
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapper: Looker row → AvenueCashBalance
// ─────────────────────────────────────────────────────────────────────────────

function mapCashBalance(row: any): AvenueCashBalance {
  return {
    date: row['cash_balance.date'] ?? '',
    clientCpf: row['cash_balance.client_cpf'] ?? '',
    clientName: row['cash_balance.client_name'] ?? '',
    clientEmail: row['cash_balance.client_email'] ?? '',
    foreignFinderName: row['cash_balance.foreign_finder_name'] ?? '',
    foreignFinderEmail: row['cash_balance.foreign_finder_email'] ?? '',
    foreignFinderCode: row['cash_balance.foreign_finder_code'] ?? '',
    officeCnpj: row['cash_balance.office_cnpj'] ?? '',
    officeName: row['cash_balance.office_name'] ?? '',
    productCusip: row['cash_balance.product_cusip'] ?? '',
    productName: row['cash_balance.product_name'] ?? '',
    balanceBrl: parseFloat(row['cash_balance.balance_brl'] ?? '0'),
    balanceUsd: parseFloat(row['cash_balance.balance_usd'] ?? '0'),
  };
}

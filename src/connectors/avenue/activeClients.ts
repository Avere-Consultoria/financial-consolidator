import axios from 'axios';
import { getAvenueToken } from './auth';
import { ConsolidatorError } from '../../types';
import { logger } from '../../utils/logger';

// ─────────────────────────────────────────────────────────────────────────────
// Avenue — Active Clients
// POST /api/4.0/queries/run/json
// Lista diária completa de clientes com flag ativo/inativo
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = 'https://avenueanalytics.cloud.looker.com/api/4.0';

export interface AvenueActiveClient {
  date: string;
  clientCpf: string;
  clientName: string;
  clientEmail: string;
  foreignFinderName: string;
  foreignFinderEmail: string;
  foreignFinderCode: string;
  officeCnpj: string;
  officeName: string;
  totalInvested: number;
  aucBrl: number;
  aucUsd: number;
  active: boolean;
  customerType: string;
  suitability: string | null;
  birthdayDate: string | null;
  accountCreatedDate: string | null;
  maritalStatus: string | null;
  apexAccountNumber: string | null;
  jobTitle: string | null;
  connectBrokerDate: string | null;
}

export async function getAvenueActiveClients(date: string): Promise<AvenueActiveClient[]> {
  const token = await getAvenueToken();

  try {
    logger.info(`Avenue: buscando active clients para ${date}`);

    const response = await axios.post(
      `${BASE_URL}/queries/run/json`,
      {
        model: 'avenue_b2b_office_api',
        view: 'active_clients',
        fields: [
          'active_clients.date',
          'active_clients.client_cpf',
          'active_clients.client_email',
          'active_clients.client_name',
          'active_clients.foreign_finder_email',
          'active_clients.foreign_finder_name',
          'active_clients.foreign_finder_code',
          'active_clients.office_cnpj',
          'active_clients.office_name',
          'active_clients.total_invested',
          'active_clients.auc_brl',
          'active_clients.auc_usd',
          'active_clients.active',
          'active_clients.customer_type',
          'active_clients.suitability',
          'active_clients.birthday_date',
          'active_clients.account_created_date',
          'active_clients.marital_status',
          'active_clients.apex_account_number',
          'active_clients.job_title',
          'active_clients.connect_broker_date',
        ],
        filters: { 'active_clients.date': date },
        limit: -1,
      },
      {
        headers: { Authorization: `token ${token}` },
      }
    );

    return (response.data ?? []).map(mapActiveClient);
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;

    logger.error('Avenue: erro ao buscar active clients', { date, status, data });

    if (status === 401) {
      throw new ConsolidatorError('AVENUE_UNAUTHORIZED', 'Token Avenue inválido ou expirado', 'AVENUE', 401);
    }

    throw new ConsolidatorError(
      'AVENUE_ACTIVE_CLIENTS_ERROR',
      `Erro ao buscar active clients Avenue: ${data?.message ?? err.message}`,
      'AVENUE',
      status ?? 502
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapper: Looker row → AvenueActiveClient
// ─────────────────────────────────────────────────────────────────────────────

function mapActiveClient(row: any): AvenueActiveClient {
  return {
    date: row['active_clients.date'] ?? '',
    clientCpf: row['active_clients.client_cpf'] ?? '',
    clientName: row['active_clients.client_name'] ?? '',
    clientEmail: row['active_clients.client_email'] ?? '',
    foreignFinderName: row['active_clients.foreign_finder_name'] ?? '',
    foreignFinderEmail: row['active_clients.foreign_finder_email'] ?? '',
    foreignFinderCode: row['active_clients.foreign_finder_code'] ?? '',
    officeCnpj: row['active_clients.office_cnpj'] ?? '',
    officeName: row['active_clients.office_name'] ?? '',
    totalInvested: parseFloat(row['active_clients.total_invested'] ?? '0'),
    aucBrl: parseFloat(row['active_clients.auc_brl'] ?? '0'),
    aucUsd: parseFloat(row['active_clients.auc_usd'] ?? '0'),
    active: row['active_clients.active'] === 1 || row['active_clients.active'] === true,
    customerType: row['active_clients.customer_type'] ?? '',
    suitability: row['active_clients.suitability'] ?? null,
    birthdayDate: row['active_clients.birthday_date'] ?? null,
    accountCreatedDate: row['active_clients.account_created_date'] ?? null,
    maritalStatus: row['active_clients.marital_status'] ?? null,
    apexAccountNumber: row['active_clients.apex_account_number'] ?? null,
    jobTitle: row['active_clients.job_title'] ?? null,
    connectBrokerDate: row['active_clients.connect_broker_date'] ?? null,
  };
}

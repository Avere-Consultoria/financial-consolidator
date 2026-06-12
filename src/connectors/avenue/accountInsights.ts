import axios from 'axios';
import { getAvenueToken } from './auth';
import { ConsolidatorError } from '../../types';
import { AvenueAccountInsight } from '../../types';
import { logger } from '../../utils/logger';
import { maskDoc, maskUrl } from '../../utils/mask';

// ─────────────────────────────────────────────────────────────────────────────
// Avenue — Account Insights
// POST /api/4.0/queries/run/json  |  view: account_insights
// Insights analíticos por conta — equivalente ao painel Extranet da Avenue
// Cada registro = 1 insight com categoria, prioridade e valor financeiro
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = 'https://avenueanalytics.cloud.looker.com/api/4.0';

export async function getAvenueAccountInsights(
  date: string,
  cpf?: string
): Promise<AvenueAccountInsight[]> {
  const token = await getAvenueToken();

  const filters: Record<string, string> = { 'account_insights.date': date };
  if (cpf) filters['account_insights.client_cpf'] = cpf;

  try {
    logger.info(`Avenue: buscando account insights para ${date}${cpf ? ` | CPF: ${maskDoc(cpf)}` : ''}`);

    const response = await axios.post(
      `${BASE_URL}/queries/run/json`,
      {
        model: 'avenue_b2b_office_api',
        view: 'account_insights',
        fields: [
          'account_insights.date',
          'account_insights.client_cpf',
          'account_insights.client_name',
          'account_insights.foreign_finder_name',
          'account_insights.foreign_finder_code',
          'account_insights.office_name',
          'account_insights.categoria',
          'account_insights.insight',
          'account_insights.prioridade',
          'account_insights.moeda',
          'account_insights.valor',
        ],
        filters,
        limit: -1,
      },
      {
        headers: { Authorization: `token ${token}` },
      }
    );

    return (response.data ?? []).map(mapInsightEntry);
  } catch (err: any) {
    const status = err?.response?.status;
    const data = err?.response?.data;

    logger.error('Avenue: erro ao buscar account insights', { date, cpf: maskDoc(cpf), status, data });

    if (status === 401) {
      throw new ConsolidatorError('AVENUE_UNAUTHORIZED', 'Token Avenue inválido ou expirado', 'AVENUE', 401);
    }

    throw new ConsolidatorError(
      'AVENUE_INSIGHTS_ERROR',
      `Erro ao buscar account insights Avenue: ${data?.message ?? err.message}`,
      'AVENUE',
      status ?? 502
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Mapper: Looker row → AvenueAccountInsight
// ─────────────────────────────────────────────────────────────────────────────

function mapInsightEntry(row: any): AvenueAccountInsight {
  return {
    date:       row['account_insights.date']          ?? '',
    clientCpf:  row['account_insights.client_cpf']    ?? '',
    clientName: row['account_insights.client_name']   ?? '',
    categoria:  row['account_insights.categoria']     ?? '',
    insight:    row['account_insights.insight']       ?? '',
    prioridade: row['account_insights.prioridade']    ?? '',
    moeda:      row['account_insights.moeda']         ?? '',
    valor:      parseFloat(row['account_insights.valor'] ?? '0'),
  };
}

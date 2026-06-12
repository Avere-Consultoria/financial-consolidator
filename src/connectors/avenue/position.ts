// src/connectors/avenue/position.ts

import { UnifiedPosition } from '../../types';
import { mapAvenueToUnifiedPosition } from './mapper';
import { getAvenueAuc } from './auc';
import { logger } from '../../utils/logger';
import { maskDoc, maskUrl } from '../../utils/mask';

export async function getAvenuePosition(accountNumber: string): Promise<UnifiedPosition> {
  logger.info(`Buscando posições da Avenue para CPF/Código: ${maskDoc(accountNumber)}`);

  const dateObj = new Date();
  dateObj.setDate(dateObj.getDate() - 4);
  const targetDate = dateObj.toISOString().split('T')[0];

  try {
    const data = await getAvenueAuc(targetDate, accountNumber);

    logger.info(`Sucesso ao buscar Avenue. Encontrados ${data.length} ativos.`);

    return mapAvenueToUnifiedPosition(accountNumber, data, targetDate);
  } catch (error: any) {
    logger.error(`Falha fatal no getAvenuePosition: ${error.message}`);
    throw error;
  }
}
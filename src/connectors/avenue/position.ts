// src/connectors/avenue/position.ts

import { UnifiedPosition } from '../../types';
import { mapAvenueToUnifiedPosition } from './mapper';
import { getAvenueAuc } from './auc';
import { logger } from '../../utils/logger';
import { maskDoc, maskUrl } from '../../utils/mask';

export async function getAvenuePosition(accountNumber: string): Promise<UnifiedPosition> {
  logger.info(`Buscando posições da Avenue para CPF/Código: ${maskDoc(accountNumber)}`);

  try {
    // A AUC da Avenue serve D-1 (comprovado). Tenta D-1 e recua até achar um dia
    // ÚTIL com dado (fim de semana/feriado vêm vazios). targetDate = data REAL.
    let data: any[] = [];
    let targetDate = '';
    for (let back = 1; back <= 5; back++) {
      const d = new Date();
      d.setDate(d.getDate() - back);
      targetDate = d.toISOString().split('T')[0];
      data = await getAvenueAuc(targetDate, accountNumber);
      if (Array.isArray(data) && data.length > 0) break;
    }

    logger.info(`Sucesso ao buscar Avenue (ref ${targetDate}). Encontrados ${data?.length ?? 0} ativos.`);

    const pos = mapAvenueToUnifiedPosition(accountNumber, data, targetDate);
    pos.rawPayload = { items: data, targetDate };   // arquivo p/ replay (mapper precisa do targetDate)
    return pos;
  } catch (error: any) {
    logger.error(`Falha fatal no getAvenuePosition: ${error.message}`);
    throw error;
  }
}
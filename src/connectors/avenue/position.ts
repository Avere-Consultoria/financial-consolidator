// src/connectors/avenue/position.ts

import { UnifiedPosition } from '../../types';
import { mapAvenueToUnifiedPosition } from './mapper';
import { logger } from '../../utils/logger';

export async function getAvenuePosition(accountNumber: string): Promise<UnifiedPosition> {
  logger.info(`Buscando posições da Avenue para CPF/Código: ${accountNumber}`);

  const baseUrl = process.env.VITE_RAILWAY_URL || 'https://financial-consolidator-production.up.railway.app';
  
  const dateObj = new Date();
  dateObj.setDate(dateObj.getDate() - 4);
  const targetDate = dateObj.toISOString().split('T')[0];

  const fetchUrl = `${baseUrl}/api/v1/avenue/auc?date=${targetDate}&cpf=${accountNumber}`;

  try {
    const response = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
       throw new Error(`Erro na API Avenue (Railway): Status ${response.status}`);
    }

    // 🔥 A CORREÇÃO ESTÁ AQUI: Tipando o retorno desconhecido do fetch
    const rawData = (await response.json()) as { 
      error?: string; 
      message?: string; 
      data?: any[];
    };

    if (rawData.error) {
       throw new Error(`Erro retornado pela Avenue: ${rawData.message || rawData.error}`);
    }

    const avenueDataArray = Array.isArray(rawData.data) ? rawData.data : [];

    logger.info(`Sucesso ao buscar Avenue. Encontrados ${avenueDataArray.length} ativos.`);

    return mapAvenueToUnifiedPosition(accountNumber, avenueDataArray, targetDate);

  } catch (error: any) {
    logger.error(`Falha fatal no getAvenuePosition: ${error.message}`);
    throw error; 
  }
}
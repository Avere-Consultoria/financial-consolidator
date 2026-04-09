import axios from 'axios';
import { getAgoraHeaders, getAgoraHttpsAgent } from './auth';
import { logger } from '../../utils/logger';
import { ConsolidatorError } from '../../types';

export async function getInvestorCode(cpfCnpj: string) {
  // Define a base URL (Produção ou Sandbox)
  const baseUrl = process.env.AGORA_ENVIRONMENT === 'production'
    ? 'https://openapi.bradesco.com.br'
    : 'https://openapisandbox.prebanco.com.br';

  // Monta a URL exata conforme o Swagger da imagem
  const url = `${baseUrl}/managers-cust-access-info/v1/searchcblc/${cpfCnpj}`;
  const headers = await getAgoraHeaders();
  const agent = getAgoraHttpsAgent();

  try {
    logger.info(`Ágora: Buscando código CBLC para o CPF/CNPJ ${cpfCnpj}`);
    
    // Passamos a configuração inteira no Axios, OMITINDO a propriedade 'data'
    const { data } = await axios({
  method: 'post',
  url: url,
  httpsAgent: agent,
  headers: {
    Authorization: headers.Authorization,
    'Accept': 'application/json',
    'Content-Length': '0' // <- Adicione esta linha
  }
});
    return data;
  } catch (err: any) {
    logger.error('Ágora: erro ao buscar código do investidor', {
      status: err?.response?.status,
      data: JSON.stringify(err?.response?.data),
    });
    
    throw new ConsolidatorError(
      'AGORA_INVESTOR_CODE_ERROR',
      `Erro ao buscar CBLC: ${JSON.stringify(err?.response?.data) ?? err.message}`,
      'AGORA',
      err?.response?.status ?? 502
    );
  }
}
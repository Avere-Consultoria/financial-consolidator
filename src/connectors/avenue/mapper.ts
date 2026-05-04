import { UnifiedPosition, UnifiedAsset, AssetClass } from '../../types';

// O "De-Para" Sênior: Protege o sistema contra tipos inesperados da corretora
function classificarAvenueParaAvere(productType: string): AssetClass {
  const mapa: Record<string, AssetClass> = {
    'Balance US Banking': 'CASH',
    'Balance US Clearing': 'CASH',
    'Funds': 'INVESTMENT_FUND',
    'Stocks': 'EQUITIES',
    'Bonds': 'FIXED_INCOME',
    'ETFs': 'EQUITIES', // Na maioria das metodologias, ETF compõe Renda Variável
    'Crypto': 'CRYPTO',
  };
  
  return mapa[productType] || 'OTHER';
}

export function mapAvenueToUnifiedPosition(
  accountNumber: string,
  avenueData: any[], // O array 'data' que vem da API
  positionDate?: string
): UnifiedPosition {
  
  let totalAmount = 0;

  const assets: UnifiedAsset[] = avenueData.map((item) => {
    const grossValue = Number(item.aucBrl) || 0;
    totalAmount += grossValue;

    // Calculamos o preço de mercado na mão se a quantidade existir
    const marketPrice = item.quantity && item.quantity > 0 
      ? grossValue / Number(item.quantity) 
      : undefined;

    return {
      assetClass: classificarAvenueParaAvere(item.productType),
      name: item.productName || 'Saldo Avenue',
      ticker: item.productSymbol || undefined,
      securityCode: item.productCusip || item.isin || undefined,
      quantity: Number(item.quantity) || 0,
      grossValue: grossValue,
      netValue: grossValue, // Assumimos que o AUC já reflete o líquido na ausência de impostos discriminados
      marketPrice: marketPrice,
      maturityDate: item.maturityDate || undefined,
      isLiquidity: item.productType.includes('Balance'),
      // O 'extra' é perfeito para salvar o saldo em USD sem poluir o tipo principal
      extra: {
        currencyOriginal: 'USD',
        grossValueUsd: Number(item.aucUsd) || 0,
        officeName: item.officeName
      }
    };
  });

  return {
    institution: 'AVENUE',
    accountNumber: accountNumber,
    positionDate: positionDate || new Date().toISOString(),
    totalAmount: totalAmount,
    currency: 'BRL', // A consolidação do seu sistema roda em BRL
    assets: assets,
    rawMeta: {
      source: 'Avenue Looker API',
      fetchedAt: new Date().toISOString()
    }
  };
}
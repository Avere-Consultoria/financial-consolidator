// ─────────────────────────────────────────────────────────────────────────────
// Resolução de canônico (Avenue) — fonte ÚNICA usada pelo sync (get-avenue-position)
// e pelo reprocesso (reprocessar-canonicos). A Avenue resolve direto do ITEM cru
// (linha AUC), com a classificação inline — por isso o reprocesso da Avenue itera
// os itens guardados (não passa pelo /transform). NÃO escreve snapshot.
// ─────────────────────────────────────────────────────────────────────────────

import { classifyAvere, suggestLiquidezAvere } from './classifyAvere.ts'
import {
  resolverOuCriarCanonico,
  detectarIsFii,
  type Identificador,
  type CanonicoSugerido,
} from './canonico.ts'
import { normalizarSubTipo } from './normalizarSubTipo.ts'
import { toDateOnly } from './dates.ts'
import { extrairDetalhes } from './detalhes.ts'

export function classificarProductType(type: string): string {
  if (type.includes('Balance')) return 'CASH'
  if (type.includes('Bonds'))   return 'FIXED_INCOME'
  if (type.includes('Funds'))   return 'INVESTMENT_FUND'
  if (type.includes('Stocks') || type.includes('ETF') || type.includes('UCIT')) return 'EQUITIES'
  if (type.includes('Crypto'))  return 'CRYPTO'
  return 'OTHER'
}

export function mapTipoLabelAvenue(assetClass: string): string {
  const map: Record<string, string> = {
    FIXED_INCOME:    'Renda Fixa',
    INVESTMENT_FUND: 'Fundos',
    EQUITIES:        'Renda Variável',
    CASH:            'Caixa (USD)',
    CRYPTO:          'Criptomoedas',
    OTHER:           'Outros',
  }
  return map[assetClass] ?? assetClass
}

export function coletarIdentificadoresAvenue(item: any): Identificador[] {
  const ids: Identificador[] = []
  if (item.isin)          ids.push({ tipo: 'ISIN',   codigo: item.isin })
  if (item.productCusip)  ids.push({ tipo: 'CUSIP',  codigo: item.productCusip })
  if (item.productSymbol) ids.push({ tipo: 'TICKER', codigo: item.productSymbol })
  return ids
}

export async function resolverCanonicoAvenue(supabase: any, item: any): Promise<string | null> {
  const lookup = coletarIdentificadoresAvenue(item)
  const principal = lookup[0]
  if (!principal) return null

  const productType = item.productType || ''
  const assetClass  = classificarProductType(productType)
  const isBalance   = productType.includes('Balance')

  const sugestao: CanonicoSugerido = {
    nome_canonico:      item.productName || item.productSymbol || 'Ativo Avenue',
    classe_avere: classifyAvere({
      assetClass,
      institution:  'AVENUE',
      productType:  productType || null,
      name:         item.productName  ?? null,
      maturityDate: item.maturityDate ?? null,
      isLiquidity:  isBalance,
    }),
    liquidez_avere: suggestLiquidezAvere({
      assetClass,
      institution:  'AVENUE',
      maturityDate: item.maturityDate ?? null,
      isLiquidity:  isBalance,
    }),
    data_vencimento:    toDateOnly(item.maturityDate),
    taxa_canonica:      null,
    taxa_formatada:     null,
    benchmark_canonico: null,
    sub_tipo_canonico:  normalizarSubTipo(productType),
    is_fii:             detectarIsFii(item.productName),
    is_coe:             false,
  }

  return await resolverOuCriarCanonico(
    supabase,
    lookup,
    sugestao,
    {
      instituicao_origem:      'AVENUE',
      identificador_principal: principal,
      nome_ativo:              item.productName || item.productSymbol || '',
      emissor_original:        item.productName || null,
      classe_original:         mapTipoLabelAvenue(assetClass),
      liquidez_api_original:   isBalance ? '0' : null,
      vencimento_api_original: toDateOnly(item.maturityDate),
      index_rate:              null,
    },
    item,                                                       // cru (linha AUC) → dicionario
    extrairDetalhes('AVENUE', sugestao.sub_tipo_canonico, item),
  )
}

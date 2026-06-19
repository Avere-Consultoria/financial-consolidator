// ─────────────────────────────────────────────────────────────────────────────
// Resolução de canônico (Ágora) — fonte ÚNICA usada pelo sync (get-agora-position)
// e pelo reprocesso (reprocessar-canonicos). Resolve/atualiza o canônico a partir
// de um UnifiedAsset; NÃO escreve snapshot. O `extra` da Ágora já é o cru genérico.
// ─────────────────────────────────────────────────────────────────────────────

import {
  resolverOuCriarCanonico,
  sugerirCanonicoComClassificacao,
  type Identificador,
} from './canonico.ts'
import { normalizarSubTipo } from './normalizarSubTipo.ts'
import { mapTipoLabel, mapSubTipoPadrao } from './assetClassMap.ts'
import { toDateOnly } from './dates.ts'
import { extrairDetalhes } from './detalhes.ts'
import type { UnifiedAsset } from './types.ts'

export function resolverSubTipoAgora(a: UnifiedAsset): string {
  return a.extra?.bondType || a.extra?.securityType || mapSubTipoPadrao(a.assetClass) || ''
}

export function coletarIdentificadoresAgora(a: UnifiedAsset): Identificador[] {
  const ids: Identificador[] = []
  if (a.securityCode)      ids.push({ tipo: 'ISIN',   codigo: a.securityCode })
  if (a.extra?.cnpj)       ids.push({ tipo: 'CNPJ',   codigo: a.extra.cnpj })
  if (a.ticker)            ids.push({ tipo: 'TICKER', codigo: a.ticker })

  // Tesouro Direto: chave composta bondType + vencimento
  if (a.extra?.bondType && a.maturityDate) {
    const composto = `${a.extra.bondType}-${toDateOnly(a.maturityDate)}`
    ids.push({ tipo: 'TICKER', codigo: composto })
  }

  return ids
}

export async function resolverCanonicoAgora(supabase: any, a: UnifiedAsset): Promise<string | null> {
  const lookup = coletarIdentificadoresAgora(a)
  const principal = lookup[0]
  if (!principal) return null

  const subTipoNormalizado = normalizarSubTipo(resolverSubTipoAgora(a))

  return await resolverOuCriarCanonico(
    supabase,
    lookup,
    sugerirCanonicoComClassificacao(a, 'AGORA', { sub_tipo_canonico: subTipoNormalizado }),
    {
      instituicao_origem:      'AGORA',
      identificador_principal: principal,
      nome_ativo:              a.name || '',
      emissor_original:        a.extra?.issuerName ?? a.extra?.companyName ?? a.name ?? null,
      classe_original:         mapTipoLabel(a.assetClass),
      liquidez_api_original:   a.isLiquidity ? '0' : null,
      vencimento_api_original: toDateOnly(a.maturityDate),
      index_rate:              a.indexRate ?? null,
    },
    a.extra ?? null,                                       // o extra da Ágora já é o cru genérico
    extrairDetalhes('AGORA', subTipoNormalizado, a.extra),
  )
}

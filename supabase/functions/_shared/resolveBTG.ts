// ─────────────────────────────────────────────────────────────────────────────
// Resolução de canônico (BTG) — fonte ÚNICA usada pelo sync (get-btg-position) e
// pelo reprocesso (reprocessar-canonicos). Resolve/atualiza o canônico a partir
// de um UnifiedAsset; NÃO escreve snapshot. Mantê-la aqui evita que a lógica de
// override/identificadores divirja entre sync e reprocesso.
// Prioridade: ISIN > CETIP (como ISIN) > CNPJ > TICKER > security_code (como TICKER).
// ─────────────────────────────────────────────────────────────────────────────

import {
  resolverOuCriarCanonico,
  sugerirCanonicoComClassificacao,
  type Identificador,
} from './canonico.ts'
import { normalizarSubTipo } from './normalizarSubTipo.ts'
import { padronizarTaxa } from './indexador.ts'
import { mapTipoLabel, mapSubTipoPadrao } from './assetClassMap.ts'
import { toDateOnly } from './dates.ts'
import { extrairDetalhes } from './detalhes.ts'
import type { UnifiedAsset } from './types.ts'

// BTG codifica o subtipo no ticker como "PREFIXO-CODIGO" (ex.: "CDB-12345").
export function parsearTicker(ticker: string, assetClass: string): { subTipo: string; codigo: string } {
  if (!ticker) return { subTipo: mapSubTipoPadrao(assetClass), codigo: '' }
  const match = ticker.match(/^([A-Z]+)-(.+)$/)
  if (match) return { subTipo: match[1], codigo: match[2] }
  return { subTipo: ticker, codigo: '' }
}

// Subtipo do BTG. O `parsearTicker` só entende o formato RF "PREFIXO-CODIGO"; pra
// ação/FII/ETF (ticker sem hífen) ele devolveria o TICKER como subtipo (lixo). Aqui:
//  - extra.subTipo explícito (CAIXA do CDIE, COE) tem prioridade;
//  - EQUITIES → FII (se marcado) senão AÇÃO (ETF/BDR caem em AÇÃO — decisão atual);
//  - DERIVATIVE → OPÇÃO;
//  - RF e demais → prefixo do ticker.
export function resolverSubTipoBTG(a: UnifiedAsset): string {
  if (a.extra?.subTipo) return String(a.extra.subTipo).toUpperCase().trim()
  if (a.assetClass === 'EQUITIES') {
    return (a.extra?.isFII === true || a.extra?.isFII === 'true') ? 'FII' : 'AÇÃO'
  }
  if (a.assetClass === 'DERIVATIVE') return 'OPÇÃO'
  return parsearTicker(a.ticker ?? '', a.assetClass).subTipo
}

export function coletarIdentificadoresBTG(a: UnifiedAsset): Identificador[] {
  const ids: Identificador[] = []
  if (a.extra?.isin)        ids.push({ tipo: 'ISIN',   codigo: a.extra.isin })
  if (a.extra?.cetipCode)   ids.push({ tipo: 'ISIN',   codigo: a.extra.cetipCode })
  if (a.extra?.cnpj)        ids.push({ tipo: 'CNPJ',   codigo: a.extra.cnpj })
  if (a.ticker)             ids.push({ tipo: 'TICKER', codigo: a.ticker })
  if (a.securityCode)       ids.push({ tipo: 'TICKER', codigo: a.securityCode })
  return ids
}

export async function resolverCanonicoBTG(supabase: any, a: UnifiedAsset): Promise<string | null> {
  const lookup: Identificador[] = coletarIdentificadoresBTG(a)
  const principal = lookup[0]
  if (!principal) return null

  const subTipoNormalizado = normalizarSubTipo(resolverSubTipoBTG(a))

  const indexRate = padronizarTaxa(a.indexRate)
  const override: Record<string, any> = { sub_tipo_canonico: subTipoNormalizado }
  if (indexRate) { override.taxa_canonica = indexRate; override.taxa_formatada = indexRate }

  return await resolverOuCriarCanonico(
    supabase,
    lookup,
    sugerirCanonicoComClassificacao(a, 'BTG', override),
    {
      instituicao_origem:      'BTG',
      identificador_principal: principal,
      nome_ativo:              a.name || '',
      emissor_original:        a.extra?.issuer ?? null,
      classe_original:         mapTipoLabel(a.assetClass),
      liquidez_api_original:   a.extra?.fundLiquidity != null && a.extra?.fundLiquidity !== ''
                                 ? String(a.extra.fundLiquidity)
                                 : (a.isLiquidity ? '0' : null),
      vencimento_api_original: toDateOnly(a.maturityDate),
      index_rate:              a.indexRate ?? null,
    },
    a.extra?.raw ?? null,
    extrairDetalhes('BTG', subTipoNormalizado, a.extra?.raw),
  )
}

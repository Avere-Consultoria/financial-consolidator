// ─────────────────────────────────────────────────────────────────────────────
// Resolução de canônico (XP) — fonte ÚNICA usada pelo sync (get-xp-position) e
// pelo reprocesso (reprocessar-canonicos). Resolve/atualiza o canônico a partir
// de um UnifiedAsset; NÃO escreve snapshot. Mantê-la aqui evita que a lógica de
// override/identificadores/detalhes divirja entre sync e reprocesso.
// Prioridade de identificador: ISIN > CNPJ > security_code/codigo_ativo > TICKER.
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

export function coletarIdentificadoresXP(a: UnifiedAsset): Identificador[] {
  // Previdência: o CNPJ do fundo é COMPARTILHADO entre planos (VGBL e PGBL do mesmo
  // fundo). O CNPJ puro faria os dois colidirem no MESMO canônico (nome de um, plano
  // de outro). Chaveia por CNPJ + tipo de plano p/ separá-los.
  if (a.assetClass === 'PENSION' && a.extra?.cnpj) {
    const plano = a.extra?.subTipo ? String(a.extra.subTipo).toUpperCase().trim() : ''
    return [{ tipo: 'TICKER', codigo: plano ? `${a.extra.cnpj}-${plano}` : String(a.extra.cnpj) }]
  }
  const ids: Identificador[] = []
  if (a.extra?.isin)   ids.push({ tipo: 'ISIN',   codigo: a.extra.isin })
  if (a.extra?.cnpj)   ids.push({ tipo: 'CNPJ',   codigo: a.extra.cnpj })
  if (a.securityCode)  ids.push({ tipo: 'TICKER', codigo: a.securityCode })
  if (a.ticker)        ids.push({ tipo: 'TICKER', codigo: a.ticker })
  return ids
}

export function resolverSubTipoXP(a: UnifiedAsset): string {
  // A XP entrega a categoria pronta (CDB/DEB/CRA/CRI/LF/NTN-B/LFT/LTN/CDCA/COE)
  // em extra.subTipo — é a fonte mais confiável. normalizarSubTipo padroniza depois.
  if (a.extra?.subTipo) return String(a.extra.subTipo).toUpperCase().trim()

  const type = (a.extra?.productType ?? a.extra?.productCategory ?? '').toLowerCase()
  if (!type) return mapSubTipoPadrao(a.assetClass)
  if (type.includes('cdb'))                                       return 'CDB'
  if (type.includes('lci'))                                       return 'LCI'
  if (type.includes('lca'))                                       return 'LCA'
  if (type.includes('cra'))                                       return 'CRA'
  if (type.includes('cri'))                                       return 'CRI'
  if (type.includes('debenture') || type.includes('debênture'))   return 'DEB'
  if (type.includes('tesouro'))                                   return 'TD'
  if (type.includes('fii'))                                       return 'FII'
  if (type.includes('fundo') || type.includes('fund'))            return 'FUNDO'
  return mapSubTipoPadrao(a.assetClass)
}

export async function resolverCanonicoXP(supabase: any, a: UnifiedAsset): Promise<string | null> {
  const lookup: Identificador[] = coletarIdentificadoresXP(a)
  const principal = lookup[0]
  if (!principal) return null

  const subTipoNormalizado = normalizarSubTipo(resolverSubTipoXP(a))

  // A XP entrega a taxa já formatada em taxaCompleta (vem em a.indexRate p/ RF),
  // ex.: "IPC-A +7,55%" / "126,00% CDI". Usa direto como taxa (override),
  // padronizando o indexador (IPC-A → IPCA) e o espaçamento p/ casar com o Master.
  const indexRate = padronizarTaxa(a.indexRate)
  const override: Record<string, any> = { sub_tipo_canonico: subTipoNormalizado }
  if (indexRate) { override.taxa_canonica = indexRate; override.taxa_formatada = indexRate }

  return await resolverOuCriarCanonico(
    supabase,
    lookup,
    sugerirCanonicoComClassificacao(a, 'XP', override),
    {
      instituicao_origem:      'XP',
      identificador_principal: principal,
      nome_ativo:              a.name || '',
      emissor_original:        a.name || null,
      classe_original:         mapTipoLabel(a.assetClass),
      liquidez_api_original:   a.isLiquidity ? '0' : null,
      vencimento_api_original: toDateOnly(a.maturityDate),
      index_rate:              a.indexRate ?? null,
    },
    a.extra?.raw ?? null,                                       // cru genérico → dicionario_ativos
    extrairDetalhes('XP', subTipoNormalizado, a.extra?.raw),    // detalhes → semeia biblioteca
  )
}

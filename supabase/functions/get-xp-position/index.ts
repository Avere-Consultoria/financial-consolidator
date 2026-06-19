import { createServiceClient } from '../_shared/supabaseClient.ts'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { validarAuth, validarOwnershipCliente, ehChamadaSistema, type AuthContext } from '../_shared/auth.ts'
import { toDateOnly, ontemISO } from '../_shared/dates.ts'
import { extrairDetalhes } from '../_shared/detalhes.ts'
import { normalizarIndexador, padronizarTaxa } from '../_shared/indexador.ts'
import { mapTipoLabel, mapSubTipoPadrao } from '../_shared/assetClassMap.ts'
import { fetchConsolidator, ConsolidatorError } from '../_shared/consolidator.ts'
import {
  resolverOuCriarCanonico,
  sugerirCanonicoComClassificacao,
  type Identificador,
} from '../_shared/canonico.ts'
import { normalizarSubTipo } from '../_shared/normalizarSubTipo.ts'
import { resolverContaPorId, resolverContaPorCodigo, marcarSync } from '../_shared/contas.ts'
import type { UnifiedAsset } from '../_shared/types.ts'

// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: get-xp-position
// Deploy: supabase functions deploy get-xp-position --no-verify-jwt
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // ── Auth ────────────────────────────────────────────────────────────
    const sistema = await ehChamadaSistema(req)
    let ctx: AuthContext | null = null
    if (!sistema) {
      const authResult = await validarAuth(req)
      if ('error' in authResult) return authResult.error
      ctx = authResult.ctx
    }

    const supabase = createServiceClient()

    const url = new URL(req.url)
    let accountNumber = url.searchParams.get('account')
    let contaId: string | null = null

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}))
      accountNumber = accountNumber ?? body.account
      contaId = body.contaId ?? null
    }

    // ── Resolve a CONTA (por contaId ou pelo nº da conta) + autorização ──
    const conta = contaId
      ? await resolverContaPorId(supabase, contaId)
      : (accountNumber ? await resolverContaPorCodigo(supabase, 'XP', accountNumber) : null)
    if (!conta) return errorResponse('Conta XP não encontrada (informe account ou contaId)', 404)

    const clientId = conta.cliente_id
    accountNumber = conta.codigo
    if (!accountNumber) return errorResponse('Conta XP sem número cadastrado', 400)

    if (!sistema) {
      const ownerError = await validarOwnershipCliente(ctx!, clientId)
      if (ownerError) return ownerError
    }

    console.log('Buscando posição XP…')

    // 90s: a XP no cold-start segura a conexão computando; o default (30s) cortava antes.
    const consolidatorJson = await fetchConsolidator(`/api/v1/position/xp/${accountNumber}`, { timeoutMs: 90_000 })
    const position = consolidatorJson?.data
    if (!position) return errorResponse('Nenhum dado retornado pelo consolidador XP', 502)

    const assets: UnifiedAsset[] = position.assets ?? []

    // D0 construída na hora → representa o fechamento de ontem. Data canônica = sync − 1.
    const dataReferencia    = ontemISO()
    const dataSincronizacao = new Date().toISOString()

    // ── Resolver canônico por ativo, sequencial ──────────────────────────
    const parsedBruto: ParsedXP[] = []
    for (const asset of assets) {
      const ativoCanonicoId = await resolverCanonicoXP(supabase, asset)
      parsedBruto.push(parseAtivo(asset, ativoCanonicoId))
    }

    // Dedup defensivo pela MESMA chave do índice único (snapshot_id + nome +
    // valor_bruto + codigo_ativo + isin). A XP às vezes repete a mesma linha; sem
    // isto o batch insert INTEIRO falha na constraint e a conta fica com snapshot
    // mas SEM ativos (patrimônio na rosca, tabela vazia). Recalcula totais no
    // conjunto já limpo, pra o patrimônio não contar a duplicata.
    const vistos = new Set<string>()
    const parsed: ParsedXP[] = []
    for (const p of parsedBruto) {
      const d = p.dbRow
      const chave = `${d.nome}|${d.valor_bruto}|${d.codigo_ativo ?? ''}|${d.isin ?? ''}`
      if (vistos.has(chave)) continue
      vistos.add(chave)
      parsed.push(p)
    }

    const totais = calcularTotais(parsed)

    if (clientId) {
      const { data: snapshot, error: snapError } = await supabase
        .from('posicao_xp_snapshots')
        .upsert({
          cliente_id:               clientId,
          conta_id:                 conta.id,
          data_referencia:          dataReferencia,
          data_sincronizacao:       dataSincronizacao,
          patrimonio_total:         totais.patrimonio_total,
          patrimonio_total_liquido: totais.patrimonio_total_liquido,
          valor_disponivel:         totais.saldo_cc,
          saldo_acoes:              totais.saldo_rv,
          saldo_fundos:             totais.saldo_fundos,
          saldo_renda_fixa:         totais.saldo_rf,
          saldo_tesouro_direto:     totais.saldo_td,
          saldo_previdencia:        totais.saldo_prev,
          saldo_coe:                totais.saldo_coe,
          saldo_fii:                totais.saldo_fii,
          saldo_outros:             totais.saldo_outros,
          is_month_end:             false,
          source:                   'XP_DATA_ACCESS_V1',
          dado_atualizado:          true,
        }, { onConflict: 'cliente_id,conta_id,data_referencia' })
        .select('id')
        .single()

      if (snapError || !snapshot) {
        console.error('Erro ao salvar snapshot XP:', snapError?.message)
      } else {
        await supabase.from('posicao_xp_ativos').delete().eq('snapshot_id', snapshot.id)

        if (parsed.length > 0) {
          const bulk = parsed.map(({ dbRow }) => ({ snapshot_id: snapshot.id, ...dbRow }))
          const { error: insError } = await supabase.from('posicao_xp_ativos').insert(bulk)
          if (insError) {
            // Não engole: snapshot sem ativos deixa a Home meia-boca silenciosamente.
            console.error('Erro ao salvar ativos XP:', insError.message)
            throw new ConsolidatorError(`Falha ao salvar ativos XP: ${insError.message}`, 500)
          }
          console.log(`${parsed.length} ativos XP persistidos`)
        }
      }
    } else {
      console.warn('clientId não informado — snapshot não salvo')
    }

    const alocacao = [
      { classe: 'Conta Corrente',         valor: totais.saldo_cc      },
      { classe: 'Renda Fixa',             valor: totais.saldo_rf      },
      { classe: 'Tesouro Direto',         valor: totais.saldo_td      },
      { classe: 'Fundos de Investimento', valor: totais.saldo_fundos  },
      { classe: 'Renda Variável',         valor: totais.saldo_rv      },
      { classe: 'FII',                    valor: totais.saldo_fii     },
      { classe: 'Previdência',            valor: totais.saldo_prev    },
      { classe: 'COE',                    valor: totais.saldo_coe     },
      { classe: 'Outros',                 valor: totais.saldo_outros  },
    ].filter(a => a.valor > 0)

    await marcarSync(supabase, conta.id, 'ok')

    return jsonResponse({
      patrimonioTotal:        totais.patrimonio_total,
      patrimonioTotalLiquido: totais.patrimonio_total_liquido,
      dataReferencia,
      alocacao,
      ativos: parsed.map(({ frontRow }) => frontRow),
    })

  } catch (err: unknown) {
    if (err instanceof ConsolidatorError) {
      console.error('Erro no consolidador XP:', err.message)
      return errorResponse(err.message, err.status)
    }
    console.error('Erro na Edge Function XP:', (err as Error)?.message)
    return errorResponse('Erro interno', 500)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Resolução de canônico (XP)
// Prioridade: ISIN > CNPJ > security_code/codigo_ativo > TICKER
// ─────────────────────────────────────────────────────────────────────────────

async function resolverCanonicoXP(supabase: any, a: UnifiedAsset): Promise<string | null> {
  const lookup: Identificador[] = coletarIdentificadoresXP(a)
  const principal = lookup[0]
  if (!principal) return null

  const subTipoNormalizado = normalizarSubTipo(resolverSubTipo(a))

  // A XP entrega a taxa já formatada em taxaCompleta (vem em a.indexRate p/ RF),
  // ex.: "IPC-A +7,55%" / "126,00% CDI". Usa direto como taxa (override),
  // normalizando o indexador (IPC-A → IPCA) p/ casar com o select do Master.
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

function coletarIdentificadoresXP(a: UnifiedAsset): Identificador[] {
  const ids: Identificador[] = []
  if (a.extra?.isin)   ids.push({ tipo: 'ISIN',   codigo: a.extra.isin })
  if (a.extra?.cnpj)   ids.push({ tipo: 'CNPJ',   codigo: a.extra.cnpj })
  if (a.securityCode)  ids.push({ tipo: 'TICKER', codigo: a.securityCode })
  if (a.ticker)        ids.push({ tipo: 'TICKER', codigo: a.ticker })
  return ids
}

// ─────────────────────────────────────────────────────────────────────────────
// parseAtivo
// ─────────────────────────────────────────────────────────────────────────────

interface ParsedXP {
  dbRow: any
  frontRow: any
  assetClass: string
  grossValue: number
  netValue: number
  subTipo: string
  isFii: boolean
  isTesouro: boolean
  isCoe: boolean
}

function parseAtivo(a: UnifiedAsset, ativoCanonicoId: string | null): ParsedXP {
  const tipoLabel = mapTipoLabel(a.assetClass)
  const subTipoRaw = resolverSubTipo(a)
  const subTipo    = normalizarSubTipo(subTipoRaw) ?? subTipoRaw
  const upperName = (a.name ?? '').toUpperCase()
  const isFii     = !!a.extra?.isFII || upperName.includes('FII')
  const isTesouro = upperName.includes('TESOURO')
  const isCoe     = a.assetClass === 'DERIVATIVE' && upperName.includes('COE')
  const gross     = a.grossValue ?? 0
  const net       = a.netValue ?? gross

  const dbRow = {
    ativo_canonico_id:   ativoCanonicoId,
    asset_class:         a.assetClass,
    tipo:                tipoLabel,
    sub_tipo:            subTipo || null,
    nome:                a.name || 'Sem nome',
    ticker:              a.ticker || null,
    isin:                a.extra?.isin || null,
    codigo_ativo:        a.securityCode || a.ticker || null,
    emissor:             a.name || null,
    cnpj:                a.extra?.cnpj || null,
    quantidade:          a.quantity ?? null,
    preco_unitario:      a.marketPrice ?? null,
    valor_bruto:         gross,
    valor_liquido:       net,
    valor_imposto_renda: a.incomeTax ?? null,
    benchmark:           normalizarIndexador(a.benchMark),
    indexador:           normalizarIndexador(a.benchMark),
    rentabilidade:       padronizarTaxa(a.indexRate),   // taxaCompleta ("IPC-A +3,51%") — a Home formata daqui
    data_vencimento:     toDateOnly(a.maturityDate),
    is_liquidity:        a.isLiquidity ?? false,
    is_isento_ir:        a.extra?.taxFree ?? false,
  }

  const frontRow = {
    tipo:         tipoLabel,
    subTipo:      subTipo || null,
    emissor:      a.name  || null,
    ticker:       a.ticker || null,
    quantidade:   a.quantity    ?? null,
    valorBruto:   gross,
    valorLiquido: net,
    ir:           a.incomeTax   ?? null,
    benchmark:    normalizarIndexador(a.benchMark),
    vencimento:   a.maturityDate || null,
    isLiquidity:  a.isLiquidity  ?? false,
    extra: {
      productType:     a.extra?.productType     || null,
      productCategory: a.extra?.productCategory || null,
      advisor:         a.extra?.advisor         || null,
      office:          a.extra?.office          || null,
    },
  }

  return { dbRow, frontRow, assetClass: a.assetClass, grossValue: gross, netValue: net, subTipo, isFii, isTesouro, isCoe }
}

// ─────────────────────────────────────────────────────────────────────────────
// Totais
// ─────────────────────────────────────────────────────────────────────────────

function calcularTotais(parsed: ParsedXP[]) {
  const t = {
    patrimonio_total: 0, patrimonio_total_liquido: 0,
    saldo_cc: 0, saldo_rf: 0, saldo_td: 0, saldo_rv: 0, saldo_fii: 0,
    saldo_fundos: 0, saldo_prev: 0, saldo_coe: 0, saldo_cripto: 0, saldo_outros: 0,
  }

  for (const p of parsed) {
    t.patrimonio_total         += p.grossValue
    t.patrimonio_total_liquido += p.netValue

    switch (p.assetClass) {
      case 'CASH':            t.saldo_cc += p.grossValue; break
      case 'FIXED_INCOME':
        t.saldo_rf += p.grossValue
        if (p.isTesouro) t.saldo_td += p.grossValue
        break
      case 'EQUITIES':
        if (p.isFii) t.saldo_fii += p.grossValue
        else         t.saldo_rv  += p.grossValue
        break
      case 'INVESTMENT_FUND': t.saldo_fundos += p.grossValue; break
      case 'PENSION':         t.saldo_prev   += p.grossValue; break
      case 'CRYPTO':          t.saldo_cripto += p.grossValue; break
      case 'DERIVATIVE':
        if (p.isCoe) t.saldo_coe    += p.grossValue
        else         t.saldo_outros += p.grossValue
        break
      default: t.saldo_outros += p.grossValue
    }
  }
  return t
}

function resolverSubTipo(a: UnifiedAsset): string {
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
  if (type.includes('fundo') || type.includes('fund'))            return 'FI'
  return mapSubTipoPadrao(a.assetClass)
}

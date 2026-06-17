import { classifyAvere, suggestLiquidezAvere } from '../_shared/classifyAvere.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { validarAuth, validarOwnershipCliente, ehChamadaSistema, type AuthContext } from '../_shared/auth.ts'
import { toDateOnly } from '../_shared/dates.ts'
import { fetchConsolidator, ConsolidatorError } from '../_shared/consolidator.ts'
import {
  resolverOuCriarCanonico,
  detectarIsFii,
  type Identificador,
  type CanonicoSugerido,
} from '../_shared/canonico.ts'
import { normalizarSubTipo } from '../_shared/normalizarSubTipo.ts'
import { resolverContaPorId, resolverContaPrimaria, marcarSync } from '../_shared/contas.ts'

// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: get-avenue-position
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders, status: 200 })

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

    const { clientId, contaId } = await req.json().catch(() => ({}))
    if (!clientId && !contaId) return errorResponse('clientId ou contaId é obrigatório', 400)

    // Resolve a CONTA Avenue (por contaId ou conta primária do cliente)
    const conta = contaId
      ? await resolverContaPorId(supabase, contaId)
      : await resolverContaPrimaria(supabase, 'AVENUE', clientId)
    if (!conta) return errorResponse('Conta Avenue não encontrada', 404)
    if (!conta.codigo) return errorResponse('Código Avenue não encontrado', 404)

    if (!sistema) {
      const ownerError = await validarOwnershipCliente(ctx!, conta.cliente_id)
      if (ownerError) return ownerError
    }

    // Avenue atrasa ~2 dias úteis (pipeline analítico Looker). Trava em D-2 (BRT) com
    // rede: se vier vazio, recua até achar dado e carimba a data REAL encontrada —
    // nunca rotula uma data mais nova do que a Avenue de fato tem (evitaria divergência).
    const dataSincronizacao = new Date().toISOString()
    const brtAgora = new Date(Date.now() - 3 * 60 * 60 * 1000)
    let targetDate = ''
    let aucData: any[] = []
    for (let i = 2; i <= 6; i++) {
      const d = new Date(brtAgora)
      d.setUTCDate(d.getUTCDate() - i)
      const tentativa = d.toISOString().split('T')[0]
      const rawJson = await fetchConsolidator(
        `/api/v1/avenue/auc?date=${tentativa}&cpf=${conta.codigo}`,
        { method: 'GET' }
      )
      const rows: any[] = Array.isArray(rawJson?.data) ? rawJson.data : []
      if (rows.length > 0) { targetDate = tentativa; aucData = rows; break }
    }
    if (!targetDate) {
      // Sem dado em D-2..D-6: carimba D-2 vazio (não quebra o consolidado).
      const d = new Date(brtAgora); d.setUTCDate(d.getUTCDate() - 2)
      targetDate = d.toISOString().split('T')[0]
    }

    console.log(`Processando ${aucData.length} ativos Avenue (ref ${targetDate})`)

    // Resolver canônico por ativo (sequencial)
    const parsedBruto = []
    for (const item of aucData) {
      const ativoCanonicoId = await resolverCanonicoAvenue(supabase, item)
      parsedBruto.push(parseAtivoAvenue(item, ativoCanonicoId))
    }

    // Dedup defensivo pela MESMA chave do índice único posicao_avenue_ativos_unq.
    // Sem isto, uma linha repetida derruba o batch insert e a conta fica com snapshot
    // mas SEM ativos. Recalcula totais no conjunto limpo p/ não contar a duplicata.
    const vistos = new Set<string>()
    const parsed = []
    for (const p of parsedBruto) {
      const d = p.dbRow
      const k = `${d.nome ?? ''}|${d.isin ?? ''}|${d.cusip ?? ''}|${d.ticker ?? ''}|${d.sub_tipo ?? ''}|${d.maturity_date ?? ''}|${d.valor_bruto_brl}`
      if (vistos.has(k)) continue
      vistos.add(k); parsed.push(p)
    }

    const totais = calcularTotais(parsed)

    const { data: snapshot, error: snapError } = await supabase
      .from('posicao_avenue_snapshots')
      .upsert({
        cliente_id:         conta.cliente_id,
        conta_id:           conta.id,
        data_referencia:    targetDate,
        data_sincronizacao: dataSincronizacao,
        patrimonio_total:   totais.patrimonio_total,
        patrimonio_usd:     totais.patrimonio_usd,
        saldo_caixa:        totais.saldo_caixa,
        saldo_rf:           totais.saldo_rf,
        saldo_rv:           totais.saldo_rv,
        saldo_fundos:       totais.saldo_fundos,
        saldo_cripto:       totais.saldo_cripto,
        saldo_outros:       totais.saldo_outros,
        source:             'AVENUE_CONSOLIDATOR_V1',
      }, { onConflict: 'cliente_id,conta_id,data_referencia' })
      .select('id')
      .single()

    if (snapError || !snapshot) {
      console.error('Erro snapshot Avenue:', snapError?.message)
      return errorResponse('Falha ao salvar snapshot', 500)
    }

    await supabase.from('posicao_avenue_ativos').delete().eq('snapshot_id', snapshot.id)

    if (parsed.length > 0) {
      const bulkAtivos = parsed.map(({ dbRow }) => ({ snapshot_id: snapshot.id, ...dbRow }))
      const { error: insError } = await supabase.from('posicao_avenue_ativos').insert(bulkAtivos)
      if (insError) {
        // Não engole: snapshot sem ativos deixa a Home meia-boca silenciosamente.
        console.error('Erro ao salvar ativos Avenue:', insError.message)
        throw new ConsolidatorError(`Falha ao salvar ativos Avenue: ${insError.message}`, 500)
      }
    }

    await marcarSync(supabase, conta.id, 'ok')

    return jsonResponse({
      patrimonioTotal:    totais.patrimonio_total,
      patrimonioTotalUsd: totais.patrimonio_usd,
      dataReferencia:     targetDate,
      alocacao: [
        { classe: 'Caixa (USD)',    valor: totais.saldo_caixa  },
        { classe: 'Renda Variável', valor: totais.saldo_rv     },
        { classe: 'Renda Fixa',     valor: totais.saldo_rf     },
        { classe: 'Fundos',         valor: totais.saldo_fundos },
        { classe: 'Criptomoedas',   valor: totais.saldo_cripto },
        { classe: 'Outros',         valor: totais.saldo_outros },
      ].filter(a => a.valor > 0),
      ativos: parsed.map(p => p.frontRow),
    })

  } catch (err: unknown) {
    if (err instanceof ConsolidatorError) {
      console.error('Erro no consolidador Avenue:', err.message)
      return errorResponse(err.message, err.status)
    }
    console.error('Erro na Edge Function Avenue:', (err as Error)?.message)
    return errorResponse('Erro interno', 500)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Resolução de canônico (Avenue)
// Prioridade: ISIN > CUSIP > TICKER (productSymbol)
// ─────────────────────────────────────────────────────────────────────────────

async function resolverCanonicoAvenue(supabase: any, item: any): Promise<string | null> {
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
  )
}

function coletarIdentificadoresAvenue(item: any): Identificador[] {
  const ids: Identificador[] = []
  if (item.isin)          ids.push({ tipo: 'ISIN',   codigo: item.isin })
  if (item.productCusip)  ids.push({ tipo: 'CUSIP',  codigo: item.productCusip })
  if (item.productSymbol) ids.push({ tipo: 'TICKER', codigo: item.productSymbol })
  return ids
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function mapTipoLabelAvenue(assetClass: string): string {
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

function parseAtivoAvenue(item: any, ativoCanonicoId: string | null) {
  const productType = item.productType || ''
  const assetClass  = classificarProductType(productType)
  const tipoLabel   = mapTipoLabelAvenue(assetClass)
  const isLiquidity = productType.includes('Balance')

  const dbRow = {
    ativo_canonico_id: ativoCanonicoId,
    asset_class:       assetClass,
    tipo:              tipoLabel,
    product_type:      productType,
    nome:              item.productName   || null,
    ticker:            item.productSymbol || null,
    quantidade:        item.quantity      ?? null,
    valor_bruto_brl:   item.aucBrl        ?? 0,
    valor_bruto_usd:   item.aucUsd        ?? 0,
    maturity_date:     item.maturityDate  || null,
    is_liquidity:      isLiquidity,
    office_name:       item.officeName    || null,
  }

  const frontRow = {
    tipo:         tipoLabel,
    subTipo:      productType,
    emissor:      item.productName   || null,
    ticker:       item.productSymbol || null,
    quantidade:   item.quantity      ?? null,
    valorBruto:   item.aucBrl        ?? 0,
    valorLiquido: item.aucBrl        ?? 0,
    valorUsd:     item.aucUsd        ?? 0,
    vencimento:   item.maturityDate  || null,
    isLiquidity,
    extra: { assetType: productType, currency: 'USD' },
  }

  return { dbRow, frontRow }
}

function calcularTotais(parsed: { dbRow: any }[]) {
  const t = {
    patrimonio_total: 0, patrimonio_usd: 0,
    saldo_caixa: 0, saldo_rf: 0, saldo_rv: 0,
    saldo_fundos: 0, saldo_cripto: 0, saldo_outros: 0,
  }

  for (const { dbRow } of parsed) {
    const brl = dbRow.valor_bruto_brl
    t.patrimonio_total += brl
    t.patrimonio_usd   += dbRow.valor_bruto_usd

    switch (dbRow.asset_class) {
      case 'CASH':            t.saldo_caixa  += brl; break
      case 'FIXED_INCOME':    t.saldo_rf     += brl; break
      case 'EQUITIES':        t.saldo_rv     += brl; break
      case 'INVESTMENT_FUND': t.saldo_fundos += brl; break
      case 'CRYPTO':          t.saldo_cripto += brl; break
      default:                t.saldo_outros += brl
    }
  }
  return t
}

function classificarProductType(type: string): string {
  if (type.includes('Balance')) return 'CASH'
  if (type.includes('Bonds'))   return 'FIXED_INCOME'
  if (type.includes('Funds'))   return 'INVESTMENT_FUND'
  if (type.includes('Stocks') || type.includes('ETF') || type.includes('UCIT')) return 'EQUITIES'
  if (type.includes('Crypto'))  return 'CRYPTO'
  return 'OTHER'
}

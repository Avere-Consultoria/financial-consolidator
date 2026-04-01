import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: get-consolidated-position
// Retorna posição consolidada BTG + XP para um cliente
// ─────────────────────────────────────────────────────────────────────────────

const CONSOLIDATOR_URL = Deno.env.get('CONSOLIDATOR_URL') ?? 'http://localhost:3333'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return errorResponse('Authorization header obrigatório', 401)

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return errorResponse('Não autorizado', 401)

    // Pegar cliente_id do body ou query
    const url = new URL(req.url)
    let clienteId = url.searchParams.get('cliente_id')
    let institutions = url.searchParams.get('institutions') ?? 'BTG,XP'

    if (!clienteId && req.method === 'POST') {
      const body = await req.json()
      clienteId = body.cliente_id
      institutions = body.institutions ?? institutions
    }

    if (!clienteId) return errorResponse('Parâmetro "cliente_id" é obrigatório', 400)

    // Buscar dados do cliente (códigos BTG e XP)
    const { data: cliente, error: clienteError } = await supabase
      .from('clientes')
      .select('id, nome, codigo_btg, codigo_xp')
      .eq('id', clienteId)
      .single()

    if (clienteError || !cliente) return errorResponse('Cliente não encontrado', 404)

    // Buscar posições em paralelo nas instituições solicitadas
    const instList = institutions.split(',').map((i: string) => i.trim().toUpperCase())
    const promises: Promise<any>[] = []

    if (instList.includes('BTG') && cliente.codigo_btg) {
      promises.push(
        fetch(`${CONSOLIDATOR_URL}/api/v1/position/btg/${cliente.codigo_btg}`)
          .then(r => r.json())
          .then(r => ({ institution: 'BTG', ...r }))
          .catch(e => ({ institution: 'BTG', success: false, error: { message: e.message } }))
      )
    }

    if (instList.includes('XP') && cliente.codigo_xp) {
      promises.push(
        fetch(`${CONSOLIDATOR_URL}/api/v1/position/xp/${cliente.codigo_xp}`)
          .then(r => r.json())
          .then(r => ({ institution: 'XP', ...r }))
          .catch(e => ({ institution: 'XP', success: false, error: { message: e.message } }))
      )
    }

    const results = await Promise.allSettled(promises)

    // Montar resposta consolidada
    const positions: any[] = []
    const errors: any[] = []

    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.success) {
        positions.push(result.value.data)
      } else {
        const val = result.status === 'fulfilled' ? result.value : { institution: 'UNKNOWN', error: result.reason }
        errors.push({ institution: val.institution, message: val.error?.message })
      }
    }

    // Calcular totais consolidados
    const totalAmount = positions.reduce((sum, p) => sum + (p.totalAmount ?? 0), 0)

    // Agrupar por classe de ativo
    const byAssetClass: Record<string, number> = {}
    for (const pos of positions) {
      for (const asset of pos.assets ?? []) {
        byAssetClass[asset.assetClass] = (byAssetClass[asset.assetClass] ?? 0) + (asset.grossValue ?? 0)
      }
    }

    const byAssetClassArr = Object.entries(byAssetClass)
      .map(([assetClass, amount]) => ({
        assetClass,
        totalAmount: amount,
        percentage: totalAmount > 0 ? parseFloat(((amount / totalAmount) * 100).toFixed(2)) : 0,
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)

    const consolidated = {
      clienteId,
      clienteNome: cliente.nome,
      consolidatedAt: new Date().toISOString(),
      totalAmount,
      currency: 'BRL',
      byInstitution: positions.map(p => ({
        institution: p.institution,
        totalAmount: p.totalAmount ?? 0,
        positionDate: p.positionDate,
      })),
      byAssetClass: byAssetClassArr,
      positions,
      errors: errors.length > 0 ? errors : undefined,
    }

    return new Response(
      JSON.stringify({ success: true, data: consolidated }),
      { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('Erro na Edge Function get-consolidated-position:', err)
    return errorResponse(err.message ?? 'Erro interno', 500)
  }
})

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
}

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: { message } }),
    { status, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
  )
}

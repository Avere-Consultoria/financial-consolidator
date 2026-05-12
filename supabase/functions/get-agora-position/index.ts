import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    // IMPORTANTE: Usando SERVICE_ROLE_KEY para ter poder total de escrita
    const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!, 
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )
    
    const { cpfCnpj, accountCode, clientId } = await req.json()
    const CONSOLIDATOR_URL = Deno.env.get('CONSOLIDATOR_URL')
    
    const response = await fetch(`${CONSOLIDATOR_URL}/api/v1/position/agora/${cpfCnpj}/${accountCode}`)
    const payload = await response.json()
    const data = payload.data || payload

    if (!data.totalAmount) throw new Error("Railway não retornou patrimônio.")

    const targetDate = new Date().toISOString().split('T')[0]

    // TENTATIVA DE GRAVAÇÃO COM LOG DE ERRO EXPLÍCITO
    const { data: snapshot, error: snapError } = await supabase
      .from('posicao_agora_snapshots')
      .upsert({
        cliente_id: clientId,
        data_referencia: targetDate,
        patrimonio_total: data.totalAmount,
        saldo_rf: data.assets?.filter((a:any) => a.assetClass === 'FIXED_INCOME').reduce((s:number, a:any) => s + (a.grossValue || 0), 0) || 0,
        saldo_rv: data.assets?.filter((a:any) => a.assetClass === 'EQUITIES').reduce((s:number, a:any) => s + (a.grossValue || 0), 0) || 0,
        saldo_fundos: data.assets?.filter((a:any) => a.assetClass === 'INVESTMENT_FUND').reduce((s:number, a:any) => s + (a.grossValue || 0), 0) || 0,
        saldo_caixa: data.assets?.filter((a:any) => a.assetClass === 'CASH').reduce((s:number, a:any) => s + (a.grossValue || 0), 0) || 0,
        source: 'AGORA_API'
      }, { onConflict: 'cliente_id,data_referencia' })
      .select().single()

    if (snapError) {
        console.error("ERRO SUPABASE SNAPSHOT:", snapError)
        throw new Error(`Erro ao salvar no banco: ${snapError.message}`)
    }

    // Se salvou o snapshot, salva os ativos
    if (data.assets) {
        const ativos = data.assets.map((a: any) => ({
            snapshot_id: snapshot.id,
            tipo: a.assetClass,
            sub_tipo: a.extra?.instrumentType || a.assetClass,
            emissor: a.name || 'Ágora',
            ticker: a.extra?.instrumentType || a.name,
            valor_bruto: a.grossValue,
            quantidade: 1
        }))
        await supabase.from('posicao_agora_ativos').delete().eq('snapshot_id', snapshot.id)
        const { error: ativosError } = await supabase.from('posicao_agora_ativos').insert(ativos)
        if (ativosError) console.error("ERRO ATIVOS:", ativosError)
    }

    return new Response(JSON.stringify({ success: true, data }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
        status: 400, 
        headers: corsHeaders 
    })
  }
})
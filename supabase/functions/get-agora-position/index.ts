// ARQUIVO: get-agora-position/index.ts (Supabase Edge Function)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { cpfCnpj, accountCode, clientId } = await req.json()

    // 1. Chama o seu backend na Railway (URL do Consolidador)
    const CONSOLIDATOR_URL = Deno.env.get('CONSOLIDATOR_URL')
    const url = `${CONSOLIDATOR_URL}/api/v1/agora/listsummary/${cpfCnpj}/${accountCode}`
    
    console.log(`🔗 Chamando Railway: ${url}`)
    const response = await fetch(url)
    const payload = await response.json()

    // 2. Extrai os dados que o seu mapeador da Railway gerou
    const data = payload.data || payload // Depende de como seu Express envelopa a resposta
    if (!data || !data.totalAmount) {
        throw new Error("Resposta da Railway inválida ou vazia.")
    }

    const targetDate = new Date().toISOString().split('T')[0]

    // 3. Salva o Snapshot
    console.log(`💾 Salvando Snapshot de R$ ${data.totalAmount}...`)
    const { data: snapshot, error: snapError } = await supabase
      .from('posicao_agora_snapshots')
      .upsert({
        cliente_id: clientId,
        data_referencia: targetDate,
        patrimonio_total: data.totalAmount,
        
        // Mapeia os saldos usando a lista de assets (se disponíveis)
        saldo_rf: data.assets?.filter((a:any) => a.assetClass === 'FIXED_INCOME').reduce((sum:number, a:any) => sum + (a.grossValue || 0), 0) || 0,
        saldo_rv: data.assets?.filter((a:any) => a.assetClass === 'EQUITIES').reduce((sum:number, a:any) => sum + (a.grossValue || 0), 0) || 0,
        saldo_fundos: data.assets?.filter((a:any) => a.assetClass === 'INVESTMENT_FUND').reduce((sum:number, a:any) => sum + (a.grossValue || 0), 0) || 0,
        saldo_outros: data.assets?.filter((a:any) => ['OTHER', 'PENSION'].includes(a.assetClass)).reduce((sum:number, a:any) => sum + (a.grossValue || 0), 0) || 0,
        saldo_caixa: data.assets?.filter((a:any) => a.assetClass === 'CASH').reduce((sum:number, a:any) => sum + (a.grossValue || 0), 0) || 0,
        
        source: 'AGORA_API'
      }, { onConflict: 'cliente_id,data_referencia' })
      .select('id').single()

    if (snapError) throw snapError

    // 4. Salva os Ativos Individuais
    if (data.assets && data.assets.length > 0) {
        const ativosParaSalvar = data.assets.map((a: any) => ({
            snapshot_id: snapshot.id,
            tipo: a.assetClass,
            sub_tipo: a.extra?.instrumentType || a.assetClass,
            emissor: a.name || 'Ágora',
            ticker: a.extra?.instrumentType || a.name,
            valor_bruto: a.grossValue,
            valor_liquido: a.netValue || a.grossValue,
            quantidade: 1 // A Ágora no listsummary costuma não enviar qtd, apenas saldo
        }))

        await supabase.from('posicao_agora_ativos').delete().eq('snapshot_id', snapshot.id)
        const { error: insError } = await supabase.from('posicao_agora_ativos').insert(ativosParaSalvar)
        if (insError) throw insError
    }

    console.log(`✅ Tudo salvo!`)
    return new Response(JSON.stringify({ success: true, total: data.totalAmount }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (err: any) {
    console.error("🔥 Erro na Edge Function:", err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 400, headers: corsHeaders })
  }
})
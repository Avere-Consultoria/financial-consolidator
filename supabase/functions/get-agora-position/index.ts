import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: get-agora-position
// Deploy: supabase functions deploy get-agora-position --no-verify-jwt
// ─────────────────────────────────────────────────────────────────────────────

const CONSOLIDATOR_URL = Deno.env.get('CONSOLIDATOR_URL') ?? 'http://localhost:3333';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // ── Pegar parâmetros ───────────────────────────────────────────────────
    const url = new URL(req.url);
    let cpfCnpj     = url.searchParams.get('cpf');
    let accountCode = url.searchParams.get('cblc');
    let clientId    = url.searchParams.get('clientId');

    if (req.method === 'POST') {
      const body  = await req.json();
      cpfCnpj     = cpfCnpj     ?? body.cpfCnpj;
      accountCode = accountCode ?? body.accountCode;
      clientId    = clientId    ?? body.clientId;
    }

    // ── Se não tiver CPF/CBLC direto, busca pelo clientId ─────────────────
    if ((!cpfCnpj || !accountCode) && clientId) {
      const { data: cliente } = await supabase
        .from('clientes')
        .select('cpf, codigo_agora')
        .eq('id', clientId)
        .single();

      if (!cliente?.cpf || !cliente?.codigo_agora) {
        return errorResponse('Cliente não possui CPF ou CBLC da Ágora cadastrado', 400);
      }

      cpfCnpj     = cliente.cpf;
      accountCode = cliente.codigo_agora;
    }

    if (!cpfCnpj || !accountCode) {
      return errorResponse('Parâmetros cpfCnpj e accountCode são obrigatórios', 400);
    }

    // ── Chamar o consolidador Railway ──────────────────────────────────────
    console.log(`Buscando posição Ágora — CPF ${cpfCnpj} / CBLC ${accountCode}...`);

    const consolidatorRes = await fetch(
      `${CONSOLIDATOR_URL}/api/v1/agora/position/${cpfCnpj}/${accountCode}`,
      { headers: { 'Content-Type': 'application/json' } }
    );

    if (!consolidatorRes.ok) {
      const err = await consolidatorRes.json();
      return errorResponse(err?.error?.message ?? 'Erro no consolidador', consolidatorRes.status);
    }

    const { data: position } = await consolidatorRes.json();
    if (!position) return errorResponse('Nenhum dado retornado pelo consolidador', 502);

    const assets: any[] = position.assets ?? [];
    const today = new Date().toISOString().split('T')[0];

    // ── Calcular totais ────────────────────────────────────────────────────
    const totais = calcularTotais(assets);

    // ── Alocação para o front ──────────────────────────────────────────────
    const alocacao = [
      { classe: 'Ações/FIIs/ETFs/BDRs',     valor: totais.saldo_rv,          percentual: calcPct(totais.saldo_rv, totais.patrimonio_total) },
      { classe: 'Renda Fixa',                valor: totais.saldo_rf,          percentual: calcPct(totais.saldo_rf, totais.patrimonio_total) },
      { classe: 'Fundos de Investimento',    valor: totais.saldo_fundos,      percentual: calcPct(totais.saldo_fundos, totais.patrimonio_total) },
      { classe: 'Previdência Privada',       valor: totais.saldo_prev,        percentual: calcPct(totais.saldo_prev, totais.patrimonio_total) },
      { classe: 'COE',                       valor: totais.saldo_coe,         percentual: calcPct(totais.saldo_coe, totais.patrimonio_total) },
      { classe: 'Derivativos',               valor: totais.saldo_derivativos, percentual: calcPct(totais.saldo_derivativos, totais.patrimonio_total) },
      { classe: 'Conta Corrente / Projetado',valor: totais.saldo_cc,          percentual: calcPct(totais.saldo_cc, totais.patrimonio_total) },
      { classe: 'Outros',                    valor: totais.saldo_outros,      percentual: calcPct(totais.saldo_outros, totais.patrimonio_total) },
    ].filter(a => a.valor > 0);

    // ── Persistir no Supabase ──────────────────────────────────────────────
    const { data: cliente } = await supabase
      .from('clientes')
      .select('id')
      .eq('cpf', cpfCnpj)
      .single();

    if (cliente) {
      const { data: snapshot, error: snapError } = await supabase
        .from('posicao_agora_snapshots')
        .upsert({
          cliente_id:        cliente.id,
          data_referencia:   today,
          patrimonio_total:  totais.patrimonio_total,
          saldo_rv:          totais.saldo_rv,
          saldo_rf:          totais.saldo_rf,
          saldo_fundos:      totais.saldo_fundos,
          saldo_prev:        totais.saldo_prev,
          saldo_cc:          totais.saldo_cc,
          saldo_coe:         totais.saldo_coe,
          saldo_derivativos: totais.saldo_derivativos,
          saldo_outros:      totais.saldo_outros,
          source:            'AGORA_CONSOLIDATED_V1',
        }, { onConflict: 'cliente_id,data_referencia' })
        .select('id')
        .single();

      if (snapError || !snapshot) {
        console.error('Erro ao salvar snapshot:', snapError?.message);
      } else {
        console.log(`Snapshot salvo — R$ ${totais.patrimonio_total.toFixed(2)}`);

        await supabase.from('posicao_agora_ativos').delete().eq('snapshot_id', snapshot.id);

        if (assets.length > 0) {
          const bulk = assets.map((a: any) => ({
            snapshot_id:           snapshot.id,
            asset_class:           a.assetClass,
            tipo:                  a.name,
            instrument_type:       a.extra?.instrumentType ?? null,
            valor_bruto:           a.grossValue ?? 0,
            valor_liquido:         a.netValue ?? null,
            custo:                 a.costPrice ?? null,
            percentual_patrimonio: a.extra?.percentagePatrimony ?? null,
            valorizacao_reais:     a.extra?.valueAppreciation ?? null,
            valorizacao_pct:       a.extra?.percentAppreciation ?? null,
          }));

          const { error: ativosError } = await supabase.from('posicao_agora_ativos').insert(bulk);
          if (ativosError) console.error('Erro ao salvar ativos:', ativosError.message);
          else console.log(`${bulk.length} ativos persistidos`);
        }
      }
    } else {
      console.warn(`Cliente não encontrado para CPF ${cpfCnpj}`);
    }

    // ── Retornar ao front ──────────────────────────────────────────────────
    const ativos = assets.map((a: any) => ({
      tipo:                 a.name,
      assetClass:           a.assetClass,
      instrumentType:       a.extra?.instrumentType ?? null,
      valorBruto:           a.grossValue ?? 0,
      valorLiquido:         a.netValue ?? null,
      custo:                a.costPrice ?? null,
      percentualPatrimonio: a.extra?.percentagePatrimony ?? null,
      valorizacaoReais:     a.extra?.valueAppreciation ?? null,
      valorizacaoPct:       a.extra?.percentAppreciation ?? null,
    }));

    return new Response(
      JSON.stringify({ patrimonioTotal: totais.patrimonio_total, dataReferencia: today, cpfCnpj, accountCode, alocacao, ativos }),
      { headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    console.error('Erro na Edge Function:', err.message);
    return errorResponse(err.message ?? 'Erro interno', 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function calcularTotais(assets: any[]) {
  const sum = (cls: string) =>
    assets.filter(a => a.assetClass === cls).reduce((s, a) => s + (a.grossValue ?? 0), 0);

  return {
    patrimonio_total:  assets.reduce((s, a) => s + (a.grossValue ?? 0), 0),
    saldo_rv:          sum('EQUITIES'),
    saldo_rf:          sum('FIXED_INCOME'),
    saldo_fundos:      sum('INVESTMENT_FUND'),
    saldo_prev:        sum('PENSION'),
    saldo_cc:          sum('CASH'),
    saldo_coe:         assets.filter(a => a.extra?.instrumentType === 'COE').reduce((s, a) => s + (a.grossValue ?? 0), 0),
    saldo_derivativos: sum('DERIVATIVE'),
    saldo_outros:      assets
      .filter(a => !['EQUITIES','FIXED_INCOME','INVESTMENT_FUND','PENSION','CASH','DERIVATIVE','OTHER'].includes(a.assetClass))
      .reduce((s, a) => s + (a.grossValue ?? 0), 0),
  };
}

function calcPct(valor: number, total: number): number {
  if (!total || !valor) return 0;
  return parseFloat(((valor / total) * 100).toFixed(2));
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

function errorResponse(message: string, status: number) {
  return new Response(
    JSON.stringify({ success: false, error: { message } }),
    { status, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } }
  );
}
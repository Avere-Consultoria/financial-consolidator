// ─────────────────────────────────────────────────────────────────────────────
// Resolução de contas (cliente_contas) para o sync das corretoras.
//   - Reverso (XP/BTG): nº da conta → conta única (instituicao_id, codigo).
//   - Forward (Avenue/Ágora): cliente → conta primária da instituição.
//   - Por id: quando o caller já manda contaId (multi-conta explícito).
// Instituição de API identificada pelo CÓDIGO estável: 'BTG' | 'XP' | 'AVENUE' | 'AGORA'
// (instituicoes.codigo). O nome fica livre para edição no cadastro.
// ─────────────────────────────────────────────────────────────────────────────

export interface ContaResolvida {
    id: string;
    cliente_id: string;
    codigo: string | null;
    documento: string | null;
}

// Carimba o estado de sincronização da conta (best-effort; nunca quebra o sync).
export async function marcarSync(supabase: any, contaId: string, status: 'ok' | 'erro', erro: string | null = null): Promise<void> {
    try {
        await supabase.from('cliente_contas')
            .update({ ultima_sync: new Date().toISOString(), ultimo_status: status, ultimo_erro: erro })
            .eq('id', contaId);
    } catch (_e) { /* não interrompe o fluxo principal */ }
}

export async function resolverContaPorId(supabase: any, contaId: string): Promise<ContaResolvida | null> {
    const { data } = await supabase
        .from('cliente_contas')
        .select('id, cliente_id, codigo, documento')
        .eq('id', contaId)
        .maybeSingle();
    return data ?? null;
}

// Reverso: o número da conta identifica unicamente a conta na instituição (por código).
export async function resolverContaPorCodigo(supabase: any, codigoInst: string, codigo: string): Promise<ContaResolvida | null> {
    const { data } = await supabase
        .from('cliente_contas')
        .select('id, cliente_id, codigo, documento, instituicoes!inner(codigo)')
        .eq('codigo', codigo)
        .eq('instituicoes.codigo', codigoInst)
        .maybeSingle();
    if (!data) return null;
    return { id: data.id, cliente_id: data.cliente_id, codigo: data.codigo, documento: data.documento };
}

// Forward: conta primária (menor ordem) do cliente na instituição (por código).
export async function resolverContaPrimaria(supabase: any, codigoInst: string, clienteId: string): Promise<ContaResolvida | null> {
    const { data } = await supabase
        .from('cliente_contas')
        .select('id, cliente_id, codigo, documento, ordem, instituicoes!inner(codigo)')
        .eq('cliente_id', clienteId)
        .eq('instituicoes.codigo', codigoInst)
        .order('ordem', { ascending: true })
        .limit(1)
        .maybeSingle();
    if (!data) return null;
    return { id: data.id, cliente_id: data.cliente_id, codigo: data.codigo, documento: data.documento };
}

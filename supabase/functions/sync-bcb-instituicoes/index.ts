// Sincroniza instituições do BCB e enriquece os conglomerados FGC com:
//   • porte (segmentação Sr = S1–S5)  — fonte IF.data Cadastro
//   • CNPJ do líder                    — fonte Instituições em Funcionamento
// Ponte: FGC (nome completo) ↔ BCB (nome completo) → CNPJ → Sr
//
// APIs OData públicas (sem auth):
//   Instituicoes_em_funcionamento: SedesBancoComMultCE | SedesSociedades | SedesCooperativas
//   IFDATA: IfDataCadastro(AnoMes=...)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validarAuth, exigirMaster } from '../_shared/auth.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ODATA_INST = 'https://olinda.bcb.gov.br/olinda/servico/Instituicoes_em_funcionamento/versao/v1/odata';
const ODATA_IFDATA = 'https://olinda.bcb.gov.br/olinda/servico/IFDATA/versao/v1/odata';

const RECURSOS: { resource: string; fonte: string }[] = [
    { resource: 'SedesBancoComMultCE', fonte: 'BANCO' },
    { resource: 'SedesSociedades',     fonte: 'SOCIEDADE' },
    { resource: 'SedesCooperativas',   fonte: 'COOPERATIVA' },
];

// ── Normalização de nome para match ─────────────────────────────────────────
// Inclui boilerplate de SCFI/sociedade que aparece idêntico em centenas de nomes
// (sem isso, "ATRIA ... CRÉDITO FINANCIAMENTO INVESTIMENTO" casaria com qualquer outra SCFI).
// Mantém propositalmente "banco" e "brasil" (são discriminantes em muitos casos).
const STOPWORDS = new Set([
    's', 'sa', 'as', 'sas', 'ltda', 'me', 'eireli', 'cia',
    'de', 'do', 'da', 'dos', 'das', 'e', 'em', 'no', 'na',
    'credito', 'financiamento', 'investimento', 'investimentos',
    'sociedade', 'multiplo', 'multipla',
]);
function normalize(s: string): string {
    return (s || '')
        .toUpperCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')   // remove acentos
        .replace(/[^A-Z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function tokenSet(s: string): Set<string> {
    return new Set(normalize(s).split(' ').filter(t => t.length >= 2 && !STOPWORDS.has(t.toLowerCase())));
}
function similarity(a: string, b: string): number {
    const ta = tokenSet(a), tb = tokenSet(b);
    if (ta.size === 0 || tb.size === 0) return 0;
    let inter = 0;
    for (const t of ta) if (tb.has(t)) inter++;
    return inter / Math.max(ta.size, tb.size);   // Jaccard-ish (penaliza tokens extras)
}

// ── Fetch OData paginado (segue @odata.nextLink) ─────────────────────────────
async function fetchODataAll(url: string): Promise<any[]> {
    const out: any[] = [];
    let next: string | null = url;
    let guard = 0;
    while (next && guard < 50) {
        const resp = await fetch(next, { headers: { Accept: 'application/json' } });
        if (!resp.ok) throw new Error(`OData ${resp.status} em ${next.slice(0, 120)}`);
        const json = await resp.json();
        if (Array.isArray(json.value)) out.push(...json.value);
        next = json['@odata.nextLink'] ?? null;
        guard++;
    }
    return out;
}

// ── Candidatos de AnoMes (trimestres) p/ IF.data, do mais recente ao mais antigo ──
function candidatosAnoMes(): number[] {
    const now = new Date();
    let y = now.getFullYear();
    let m = now.getMonth() + 1;
    // arredonda p/ baixo ao fim de trimestre (3,6,9,12)
    const qEnd = [3, 6, 9, 12];
    let qm = 12, qy = y;
    for (let i = qEnd.length - 1; i >= 0; i--) {
        if (m >= qEnd[i]) { qm = qEnd[i]; qy = y; break; }
        if (i === 0) { qm = 12; qy = y - 1; }
    }
    const out: number[] = [];
    for (let k = 0; k < 8; k++) {
        out.push(qy * 100 + qm);
        qm -= 3;
        if (qm <= 0) { qm += 12; qy -= 1; }
    }
    return out;
}

// ── Busca IF.data Cadastro na data-base mais recente disponível ──────────────
async function fetchIfDataCadastro(): Promise<{ anomes: number; rows: any[] }> {
    for (const anomes of candidatosAnoMes()) {
        const url = `${ODATA_IFDATA}/IfDataCadastro(AnoMes=@AnoMes)?@AnoMes=${anomes}`
            + `&$select=CodInst,NomeInstituicao,Sr,Tcb,CodConglomeradoPrudencial,CnpjInstituicaoLider,Situacao`
            + `&$format=json`;
        try {
            const rows = await fetchODataAll(url);
            if (rows.length > 0) return { anomes, rows };
        } catch (_) { /* tenta trimestre anterior */ }
    }
    return { anomes: 0, rows: [] };
}

interface BcbInst {
    cnpj: string;
    nome_instituicao: string;
    nome_normalizado: string;
    segmento: string | null;
    fonte: string;
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    const authResult = await validarAuth(req);
    if ('error' in authResult) return authResult.error;
    const masterError = exigirMaster(authResult.ctx);
    if (masterError) return masterError;

    // debug mode (?debug=1 ou body {debug:true}) → não grava, devolve estatísticas
    let debug = new URL(req.url).searchParams.get('debug') === '1';
    try { const b = await req.clone().json(); if (b?.debug) debug = true; } catch { /* */ }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: logRow } = await supabase.from('bcb_sync_log').insert([{ status: 'running' }]).select().single();
    const logId = logRow?.id as string | undefined;
    const setLog = async (patch: Record<string, unknown>) => {
        if (logId) await supabase.from('bcb_sync_log').update(patch).eq('id', logId);
    };

    try {
        // 1. Instituições em Funcionamento (3 recursos, em paralelo)
        const listas = await Promise.all(
            RECURSOS.map(async ({ resource, fonte }) => {
                const rows = await fetchODataAll(`${ODATA_INST}/${resource}?$format=json`);
                return rows.map((r: any): BcbInst => ({
                    cnpj: String(r.CNPJ ?? '').trim(),
                    nome_instituicao: String(r.NOME_INSTITUICAO ?? '').trim(),
                    nome_normalizado: normalize(r.NOME_INSTITUICAO ?? ''),
                    segmento: r.SEGMENTO ?? null,
                    fonte,
                }));
            })
        );
        const bcbInst: BcbInst[] = listas.flat().filter(i => i.cnpj && i.nome_instituicao);

        // 2. IF.data Cadastro → mapa CNPJ-líder → Sr  (+ CNPJ próprio → Sr quando CodInst é CNPJ)
        const { anomes, rows: ifRows } = await fetchIfDataCadastro();
        const srPorCnpjLider = new Map<string, string>();
        const tcbPorCnpjLider = new Map<string, string>();
        const conglomPorCnpjLider = new Map<string, string>();
        for (const r of ifRows) {
            const cnpjLider = String(r.CnpjInstituicaoLider ?? '').trim();
            const sr = r.Sr ? String(r.Sr).trim() : null;
            if (cnpjLider && sr && !srPorCnpjLider.has(cnpjLider)) {
                srPorCnpjLider.set(cnpjLider, sr);
                if (r.Tcb) tcbPorCnpjLider.set(cnpjLider, String(r.Tcb).trim());
                if (r.CodConglomeradoPrudencial) conglomPorCnpjLider.set(cnpjLider, String(r.CodConglomeradoPrudencial).trim());
            }
        }

        // 3. Monta registros do espelho BCB (em memória; escrita só após o debug).
        const nowIso = new Date().toISOString();
        // dedup por cnpj (UNIQUE)
        const porCnpj = new Map<string, BcbInst>();
        for (const i of bcbInst) if (!porCnpj.has(i.cnpj)) porCnpj.set(i.cnpj, i);
        const registrosBcb = Array.from(porCnpj.values()).map(i => ({
            cnpj: i.cnpj,
            nome_instituicao: i.nome_instituicao,
            nome_normalizado: i.nome_normalizado,
            segmento: i.segmento,
            sr: srPorCnpjLider.get(i.cnpj) ?? null,
            cnpj_lider: i.cnpj,   // assume próprio; refinável se necessário
            tcb: tcbPorCnpjLider.get(i.cnpj) ?? null,
            cod_conglomerado_prudencial: conglomPorCnpjLider.get(i.cnpj) ?? null,
            fonte: i.fonte,
            last_seen_at: nowIso,
        }));

        // Índice de match: nome_normalizado → BcbInst (prioriza bancos)
        const idxExato = new Map<string, BcbInst>();
        for (const i of bcbInst) {
            const cur = idxExato.get(i.nome_normalizado);
            if (!cur || (i.fonte === 'BANCO' && cur.fonte !== 'BANCO')) idxExato.set(i.nome_normalizado, i);
        }
        function matchNome(nome: string): { inst: BcbInst; score: number } | null {
            const norm = normalize(nome);
            const exato = idxExato.get(norm);
            if (exato) return { inst: exato, score: 1 };
            let best: { inst: BcbInst; score: number } | null = null;
            for (const i of bcbInst) {
                const s = similarity(nome, i.nome_instituicao);
                if (s >= 0.6 && (!best || s > best.score)) best = { inst: i, score: s };
            }
            return best;
        }

        // Porte do conglomerado FGC: tenta o líder; se o CNPJ dele não for líder-prudencial
        // no BCB (caso subsidiária), procura o Sr entre os CNPJs das instituições-membro.
        function buscaPorteConglomerado(nomeLider: string, nomesMembros: string[]):
            { cnpjLider: string | null; porte: string | null; score: number; via: string } {
            const mLider = matchNome(nomeLider);
            const cnpjLider = mLider?.inst.cnpj ?? null;
            if (cnpjLider && srPorCnpjLider.has(cnpjLider)) {
                return { cnpjLider, porte: srPorCnpjLider.get(cnpjLider)!, score: mLider!.score, via: 'LIDER' };
            }
            // fallback: membros
            for (const nm of nomesMembros) {
                const mm = matchNome(nm);
                const sr = mm ? srPorCnpjLider.get(mm.inst.cnpj) : undefined;
                if (sr) return { cnpjLider, porte: sr, score: mLider?.score ?? mm!.score, via: 'MEMBRO' };
            }
            return { cnpjLider, porte: null, score: mLider?.score ?? 0, via: cnpjLider ? 'LIDER_SEM_SR' : 'SEM_MATCH' };
        }

        // Carrega conglomerados + membros (agrupados) — usado tanto no debug quanto no run real.
        const { data: todosCong } = await supabase
            .from('dicionario_conglomerados')
            .select('id, nome_lider, porte_origem')
            .order('nome_lider');
        const { data: todasInst } = await supabase
            .from('instituicoes_fgc')
            .select('id, conglomerado_id, nome_instituicao');
        const membrosPorCong = new Map<string, string[]>();
        for (const i of (todasInst ?? [])) {
            const arr = membrosPorCong.get(i.conglomerado_id) ?? [];
            arr.push(i.nome_instituicao);
            membrosPorCong.set(i.conglomerado_id, arr);
        }

        if (debug) {
            await setLog({ status: 'success', finished_at: new Date().toISOString(), anomes_ifdata: String(anomes), total_bcb_inst: registrosBcb.length });
            const amostra = (todosCong ?? []).slice(0, 15).map((c: any) => {
                const r = buscaPorteConglomerado(c.nome_lider, membrosPorCong.get(c.id) ?? []);
                return { fgc: c.nome_lider, cnpj: r.cnpjLider, porte: r.porte, score: r.score, via: r.via };
            });
            const comPorte = (todosCong ?? []).filter((c: any) =>
                buscaPorteConglomerado(c.nome_lider, membrosPorCong.get(c.id) ?? []).porte
            ).length;
            return new Response(JSON.stringify({
                anomes, total_bcb_inst: registrosBcb.length,
                total_ifdata_rows: ifRows.length,
                lideres_com_sr: srPorCnpjLider.size,
                total_conglomerados: (todosCong ?? []).length,
                conglom_com_porte_previsto: comPorte,
                amostra_match: amostra,
            }, null, 2), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // 3b. Persiste espelho BCB (bulk).
        await supabase.from('bcb_instituicoes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
        for (let k = 0; k < registrosBcb.length; k += 500) {
            const { error } = await supabase.from('bcb_instituicoes').insert(registrosBcb.slice(k, k + 500));
            if (error) throw new Error(`Insert bcb_instituicoes (${k}): ${error.message}`);
        }

        // 4. Enriquece conglomerados FGC (porte + cnpj). Respeita porte_origem='MANUAL'.
        let conglomComPorte = 0;
        const updatesCong: Promise<any>[] = [];
        for (const c of (todosCong ?? [])) {
            const r = buscaPorteConglomerado(c.nome_lider, membrosPorCong.get(c.id) ?? []);
            if (!r.cnpjLider && !r.porte) continue;
            const patch: Record<string, unknown> = {};
            if (r.cnpjLider) patch.cnpj = r.cnpjLider;
            if (r.porte && c.porte_origem !== 'MANUAL') {
                patch.porte = r.porte;
                patch.porte_origem = 'AUTO_BCB';
                conglomComPorte++;
            }
            if (Object.keys(patch).length === 0) continue;
            updatesCong.push(supabase.from('dicionario_conglomerados').update(patch).eq('id', c.id));
            if (updatesCong.length >= 30) { await Promise.all(updatesCong.splice(0)); }
        }
        await Promise.all(updatesCong);

        // 5. Enriquece instituições FGC com CNPJ (alimenta auto-classify futuro)
        let instComCnpj = 0;
        const updatesInst: Promise<any>[] = [];
        for (const inst of (todasInst ?? [])) {
            const m = matchNome(inst.nome_instituicao);
            if (!m) continue;
            instComCnpj++;
            updatesInst.push(
                supabase.from('instituicoes_fgc')
                    .update({ cnpj: m.inst.cnpj, bcb_match_score: m.score })
                    .eq('id', inst.id)
            );
            if (updatesInst.length >= 30) { await Promise.all(updatesInst.splice(0)); }
        }
        await Promise.all(updatesInst);

        await setLog({
            status: 'success',
            finished_at: new Date().toISOString(),
            anomes_ifdata: String(anomes),
            total_bcb_inst: registrosBcb.length,
            conglom_com_porte: conglomComPorte,
            inst_com_cnpj: instComCnpj,
        });

        return new Response(JSON.stringify({
            success: true,
            anomes,
            total_bcb_inst: registrosBcb.length,
            conglom_com_porte: conglomComPorte,
            inst_com_cnpj: instComCnpj,
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await setLog({ status: 'error', finished_at: new Date().toISOString(), erro: msg });
        return new Response(JSON.stringify({ error: msg }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});

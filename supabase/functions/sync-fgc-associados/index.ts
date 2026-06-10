// Sincroniza conglomerados e instituições do FGC via API pública do Power BI.
// Endpoint público (sem auth real): wabi-brazil-south-b com X-PowerBI-ResourceKey fixo.
// Estrutura DSR retornada parseada conforme groupings com Subtotal:1 (pai/filho).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { validarAuth, exigirMaster } from '../_shared/auth.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const FGC_ENDPOINT = 'https://wabi-brazil-south-b-primary-api.analysis.windows.net/public/reports/querydata?synchronous=true';
const FGC_RESOURCE_KEY = '12025ef2-63d5-4128-907c-ca85ea259b52';
const FGC_DATASET_ID = '91b7f73f-817a-4bb6-af6f-46a3bbea7d21';
const FGC_REPORT_ID = 'c6a47fab-c4c0-4e25-a867-33f5eb376aed';
const FGC_VISUAL_ID = 'd86330d038e0971ec1b4';

const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

function buildPayload(letra: string) {
    return {
        version: '1.0.0',
        queries: [{
            Query: {
                Commands: [{
                    SemanticQueryDataShapeCommand: {
                        Query: {
                            Version: 2,
                            From: [
                                { Name: 'c', Entity: 'Consulta1', Type: 0 },
                                { Name: 'p', Entity: 'Planilha1', Type: 0 },
                            ],
                            Select: [
                                { Column: { Expression: { SourceRef: { Source: 'c' } }, Property: 'NOMEINSTITUICAOLIDER' }, Name: 'Consulta1.NOMEINSTITUICAOLIDER' },
                                { Column: { Expression: { SourceRef: { Source: 'c' } }, Property: 'NOMEINSTITUICAO' },       Name: 'Consulta1.NOMEINSTITUICAO' },
                                { Aggregation: { Expression: { Column: { Expression: { SourceRef: { Source: 'p' } }, Property: 'Link' } }, Function: 3 }, Name: 'Min(Planilha1.Link)' },
                                { Measure: { Expression: { SourceRef: { Source: 'p' } }, Property: 'Título' }, Name: 'Planilha1.Título' },
                            ],
                            Where: [{
                                Condition: {
                                    In: {
                                        Expressions: [{ Column: { Expression: { SourceRef: { Source: 'c' } }, Property: 'Primeiros caracteres' } }],
                                        Values: [[{ Literal: { Value: `'${letra}'` } }]],
                                    },
                                },
                            }],
                            OrderBy: [{
                                Direction: 1,
                                Expression: { Column: { Expression: { SourceRef: { Source: 'c' } }, Property: 'NOMEINSTITUICAOLIDER' } },
                            }],
                        },
                        Binding: {
                            // Hierarquia: nível 1 = LIDER (conglomerado pai), nível 2 = INSTITUICAO (filho) + link
                            Primary: {
                                Groupings: [
                                    { Projections: [0],    Subtotal: 1 },
                                    { Projections: [1, 2] },
                                ],
                            },
                            Projections: [3],
                            DataReduction: { DataVolume: 3, Primary: { Window: { Count: 5000 } } },
                            Version: 1,
                        },
                        ExecutionMetricsKind: 1,
                    },
                }],
            },
            QueryId: '',
            ApplicationContext: {
                DatasetId: FGC_DATASET_ID,
                Sources: [{ ReportId: FGC_REPORT_ID, VisualId: FGC_VISUAL_ID }],
            },
        }],
        cancelQueries: [],
        modelId: 3627629,
    };
}

async function fetchLetra(letra: string): Promise<Array<{ lider: string; instituicao: string; link?: string }>> {
    const resp = await fetch(FGC_ENDPOINT, {
        method: 'POST',
        headers: {
            'Accept': 'application/json, text/plain, */*',
            'Content-Type': 'application/json;charset=UTF-8',
            'Origin': 'https://app.powerbi.com',
            'Referer': 'https://app.powerbi.com/',
            'X-PowerBI-ResourceKey': FGC_RESOURCE_KEY,
            'ActivityId': crypto.randomUUID(),
            'RequestId': crypto.randomUUID(),
        },
        body: JSON.stringify(buildPayload(letra)),
    });

    if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`Letra ${letra}: HTTP ${resp.status} — ${txt.slice(0, 300)}`);
    }
    const json = await resp.json();
    return parseDSR(json);
}

// Parser DSR hierárquico (2 níveis) — estrutura observada:
//   dsr.DS[0].PH[1].DM1 = linhas dos LIDERES (G0 literal)
//     cada lider tem M: [{ DM2: [filhos] }]
//     filho.C = [idx_instituicao (em D0), idx_link (em D1)] usando ValueDicts
//     filho.R = bitmask repeat-from-previous-sibling
//   dsr.DS[0].ValueDicts = { D0: [nomes_instituicoes], D1: [links] }
function parseDSR(json: any): Array<{ lider: string; instituicao: string; link?: string }> {
    const out: Array<{ lider: string; instituicao: string; link?: string }> = [];
    try {
        const ds = json?.results?.[0]?.result?.data?.dsr?.DS?.[0];
        if (!ds) return out;

        const dicts: Record<string, string[]> = ds.ValueDicts ?? {};
        const phList: any[] = Array.isArray(ds.PH) ? ds.PH : [];
        const phLider = phList.find(p => Array.isArray(p?.DM1));
        const liderRows: any[] = phLider?.DM1 ?? [];

        const cleanLink = (l?: string) =>
            l && l !== 'https://' && l !== 'http://' && l.trim() !== '' ? l.trim() : undefined;

        // Detecta schema do nível filho a partir da primeira linha DM2 que tenha "S"
        // Mapeia índice de coluna em C → nome do dict (D0, D1, ...)
        let childColDicts: (string | undefined)[] = [];
        for (const lr of liderRows) {
            const dm2: any[] = lr?.M?.[0]?.DM2 ?? [];
            const schema = dm2.find(r => Array.isArray(r?.S));
            if (schema) {
                childColDicts = schema.S.map((s: any) => s.DN);
                break;
            }
        }
        const idxInst = childColDicts.findIndex(d => d === 'D0');
        const idxLink = childColDicts.findIndex(d => d === 'D1');

        for (const lr of liderRows) {
            const lider = typeof lr?.G0 === 'string' ? lr.G0.trim() : undefined;
            if (!lider) continue;

            const dm2: any[] = lr?.M?.[0]?.DM2 ?? [];
            const lastVals: (string | undefined)[] = new Array(childColDicts.length).fill(undefined);
            let emitiu = false;

            for (const child of dm2) {
                const c: any[] = child.C ?? [];
                const repeatMask: number = child.R ?? 0;
                const omitMask:   number = child.Ø ?? 0;

                const valoresResolvidos: (string | undefined)[] = new Array(childColDicts.length);
                let cIdx = 0;
                for (let col = 0; col < childColDicts.length; col++) {
                    const isOmit   = (omitMask   >> col) & 1;
                    const isRepeat = (repeatMask >> col) & 1;
                    if (isOmit) {
                        valoresResolvidos[col] = undefined;
                    } else if (isRepeat) {
                        valoresResolvidos[col] = lastVals[col];
                    } else {
                        const raw = c[cIdx];
                        const dictName = childColDicts[col];
                        if (dictName && typeof raw === 'number' && Array.isArray(dicts[dictName])) {
                            valoresResolvidos[col] = dicts[dictName][raw];
                        } else if (typeof raw === 'string') {
                            valoresResolvidos[col] = raw;
                        } else if (raw != null) {
                            valoresResolvidos[col] = String(raw);
                        }
                        cIdx++;
                    }
                    if (valoresResolvidos[col] !== undefined) lastVals[col] = valoresResolvidos[col];
                }

                const inst = idxInst >= 0 ? valoresResolvidos[idxInst] : undefined;
                const link = idxLink >= 0 ? valoresResolvidos[idxLink] : undefined;

                if (!inst || inst.trim() === '') continue;
                if (inst.trim().toLowerCase() === 'total') continue;

                out.push({ lider, instituicao: inst.trim(), link: cleanLink(link) });
                emitiu = true;
            }

            // Lider sem filhos → registra ele mesmo como instituicao (mantém o conglomerado no DB)
            if (!emitiu) {
                out.push({ lider, instituicao: lider, link: undefined });
            }
        }
    } catch (e) {
        console.error('parseDSR error:', e);
    }
    return out;
}

Deno.serve(async (req: Request) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

    const authResult = await validarAuth(req);
    if ('error' in authResult) return authResult.error;
    const masterError = exigirMaster(authResult.ctx);
    if (masterError) return masterError;

    // ── Modo DEBUG: devolve JSON cru de UMA letra para inspecionar estrutura DSR ──
    const url = new URL(req.url);
    const debugLetra = url.searchParams.get('debug');
    let bodyDebugLetra: string | undefined;
    try {
        const body = await req.clone().json();
        if (body?.debug) bodyDebugLetra = String(body.debug);
    } catch { /* sem body, ok */ }
    const letraDebug = debugLetra ?? bodyDebugLetra;
    if (letraDebug) {
        const letra = letraDebug.toUpperCase().slice(0, 1);
        const resp = await fetch(FGC_ENDPOINT, {
            method: 'POST',
            headers: {
                'Accept': 'application/json, text/plain, */*',
                'Content-Type': 'application/json;charset=UTF-8',
                'Origin': 'https://app.powerbi.com',
                'Referer': 'https://app.powerbi.com/',
                'X-PowerBI-ResourceKey': FGC_RESOURCE_KEY,
                'ActivityId': crypto.randomUUID(),
                'RequestId': crypto.randomUUID(),
            },
            body: JSON.stringify(buildPayload(letra)),
        });
        const json = await resp.json();
        const parsed = parseDSR(json);
        return new Response(JSON.stringify({
            letra,
            httpStatus: resp.status,
            parsedCount: parsed.length,
            parsedSample: parsed.slice(0, 5),
            rawJson: json,
        }, null, 2), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Cria log
    const { data: logRow } = await supabase.from('fgc_sync_log').insert([{ status: 'running' }]).select().single();
    const logId = logRow?.id as string | undefined;

    const setLog = async (patch: Record<string, unknown>) => {
        if (!logId) return;
        await supabase.from('fgc_sync_log').update(patch).eq('id', logId);
    };

    try {
        // 1. Fetch das 26 letras em paralelo (a API do Power BI é rápida; ~1-3s total)
        const fetchResults = await Promise.all(
            LETRAS.map(async letra => ({ letra, linhas: await fetchLetra(letra) }))
        );

        // 2. Junta tudo e deduplica em memória
        type Linha = { letra: string; lider: string; instituicao: string; link?: string };
        const todasLinhas: Linha[] = [];
        const lideresSet = new Set<string>();
        for (const { letra, linhas } of fetchResults) {
            for (const l of linhas) {
                lideresSet.add(l.lider);
                todasLinhas.push({ letra, ...l });
            }
        }

        // 3. Limpa instituições antigas (mantém conglomerados p/ preservar FKs)
        await supabase.from('instituicoes_fgc').delete().neq('id', '00000000-0000-0000-0000-000000000000');

        // 4. Bulk upsert dos conglomerados (1 round-trip)
        const lideresArr = Array.from(lideresSet);
        const { error: errBulkC } = await supabase
            .from('dicionario_conglomerados')
            .upsert(lideresArr.map(nome_lider => ({ nome_lider })), { onConflict: 'nome_lider', ignoreDuplicates: true });
        if (errBulkC) throw new Error(`Bulk upsert conglomerados: ${errBulkC.message}`);

        // 5. Busca os IDs em 1 round-trip
        const { data: conglomData, error: errSel } = await supabase
            .from('dicionario_conglomerados')
            .select('id, nome_lider')
            .in('nome_lider', lideresArr);
        if (errSel) throw new Error(`Select conglomerados: ${errSel.message}`);
        const idPorLider = new Map<string, string>();
        (conglomData ?? []).forEach((c: any) => idPorLider.set(c.nome_lider, c.id));

        // 6. Bulk insert das instituições em lotes de 500
        const nowIso = new Date().toISOString();
        const registros = todasLinhas
            .map(l => {
                const cid = idPorLider.get(l.lider);
                if (!cid) return null;
                return {
                    conglomerado_id:  cid,
                    nome_instituicao: l.instituicao,
                    link_fgc:         l.link ?? null,
                    primeira_letra:   l.letra,
                    last_seen_at:     nowIso,
                };
            })
            .filter((x): x is NonNullable<typeof x> => x !== null);

        // Dedup interna (mesmo par lider+instituicao pode aparecer 2x quando a mesma instituicao
        // é membro de 2 conglomerados — manter; mas dentro do mesmo conglomerado, deduplica)
        const dedup = new Map<string, typeof registros[0]>();
        for (const r of registros) {
            dedup.set(`${r.conglomerado_id}|${r.nome_instituicao}`, r);
        }
        const registrosUnicos = Array.from(dedup.values());

        for (let i = 0; i < registrosUnicos.length; i += 500) {
            const batch = registrosUnicos.slice(i, i + 500);
            const { error: errB } = await supabase.from('instituicoes_fgc').insert(batch);
            if (errB) throw new Error(`Insert lote instituicoes (${i}): ${errB.message}`);
        }

        await setLog({
            status: 'success',
            finished_at: new Date().toISOString(),
            total_letras: LETRAS.length,
            total_conglomerados: lideresArr.length,
            total_instituicoes: registrosUnicos.length,
        });

        return new Response(JSON.stringify({
            success: true,
            conglomerados: lideresArr.length,
            instituicoes: registrosUnicos.length,
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await setLog({ status: 'error', finished_at: new Date().toISOString(), erro: msg });
        return new Response(JSON.stringify({ error: msg }), {
            status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
});

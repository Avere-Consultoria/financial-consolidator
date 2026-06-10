import { createServiceClient } from '../_shared/supabaseClient.ts'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { validarAuth, exigirMaster } from '../_shared/auth.ts'
import {
    criarResolver, SUBTIPOS_BANCARIO_FGC, SUBTIPOS_CREDITO_PRIVADO,
} from '../_shared/matchRisco.ts'

// ─────────────────────────────────────────────────────────────────────────────
// classificar-riscos
// Resolve e PERSISTE o risco do ativo canônico nos 2 mundos:
//   • Bancário (CDB/LCI/LF…) → conglomerado_id (FGC)
//   • Privado (DEB/CRA/CRI…) → emissor_id
// Casa pelo emissor bruto (nome/CNPJ vindo das corretoras, em dicionario_ativos).
// Respeita classificação manual existente (não sobrescreve quem já tem risco).
//
// body opcional: { force: true } → reclassifica até os que já têm risco.
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    const authResult = await validarAuth(req)
    if ('error' in authResult) return authResult.error
    const masterError = exigirMaster(authResult.ctx)
    if (masterError) return masterError

    let force = false
    try { const b = await req.clone().json(); force = b?.force === true } catch { /* */ }

    const supabase = createServiceClient()

    try {
        const [canonRes, dicRes, emiRes, fgcRes, congRes, aliasRes] = await Promise.all([
            supabase.from('ativos_canonicos').select('id, sub_tipo_canonico, emissor_id, conglomerado_id'),
            supabase.from('dicionario_ativos').select('ativo_canonico_id, emissor_original, codigo_identificador, tipo_identificador'),
            supabase.from('dicionario_emissores').select('id, nome_fantasia, cnpj_raiz'),
            supabase.from('instituicoes_fgc').select('conglomerado_id, nome_instituicao, cnpj'),
            supabase.from('dicionario_conglomerados').select('id, nome_lider'),
            supabase.from('emissor_aliases').select('emissor_id, alias'),
        ])
        for (const r of [canonRes, dicRes, emiRes, fgcRes, congRes, aliasRes]) {
            if (r.error) throw new Error(r.error.message)
        }

        const resolver = criarResolver(emiRes.data ?? [], fgcRes.data ?? [], congRes.data ?? [], aliasRes.data ?? [])

        // Emissor bruto (nome + cnpj) por canônico, a partir de dicionario_ativos
        const nomePorCanon = new Map<string, string>()
        const cnpjPorCanon = new Map<string, string>()
        for (const d of (dicRes.data ?? [])) {
            const cid = d.ativo_canonico_id
            if (!cid) continue
            if (d.emissor_original && !nomePorCanon.has(cid)) nomePorCanon.set(cid, d.emissor_original)
            if (d.tipo_identificador === 'CNPJ' && d.codigo_identificador && !cnpjPorCanon.has(cid)) {
                cnpjPorCanon.set(cid, d.codigo_identificador)
            }
        }

        const updatesEmissor: { id: string; emissor_id: string }[] = []
        const updatesConglom: { id: string; conglomerado_id: string }[] = []
        let semMatch = 0

        for (const c of (canonRes.data ?? [])) {
            if (!force && (c.emissor_id || c.conglomerado_id)) continue   // respeita manual/existente
            const st = (c.sub_tipo_canonico ?? '').toUpperCase().trim()
            const nome = nomePorCanon.get(c.id) ?? ''
            const cnpj = cnpjPorCanon.get(c.id) ?? null
            if (!nome && !cnpj) { semMatch++; continue }

            if (SUBTIPOS_BANCARIO_FGC.has(st)) {
                const cong = resolver.resolveConglomerado(nome, cnpj)
                if (cong) updatesConglom.push({ id: c.id, conglomerado_id: cong })
                else semMatch++
            } else if (SUBTIPOS_CREDITO_PRIVADO.has(st)) {
                const emi = resolver.resolveEmissor(nome, cnpj)
                if (emi) updatesEmissor.push({ id: c.id, emissor_id: emi })
                else semMatch++
            }
            // demais sub-tipos (RV, fundos, TD…) não entram em nenhum mundo de crédito
        }

        // Persiste em lotes
        const aplicar = async (rows: any[], campo: 'emissor_id' | 'conglomerado_id') => {
            for (let i = 0; i < rows.length; i += 30) {
                await Promise.all(rows.slice(i, i + 30).map(r =>
                    supabase.from('ativos_canonicos').update({ [campo]: r[campo] }).eq('id', r.id)
                ))
            }
        }
        await aplicar(updatesEmissor, 'emissor_id')
        await aplicar(updatesConglom, 'conglomerado_id')

        return jsonResponse({
            ok: true,
            total_canonicos: (canonRes.data ?? []).length,
            classificados_emissor: updatesEmissor.length,
            classificados_conglomerado: updatesConglom.length,
            sem_match: semMatch,
        })
    } catch (err) {
        console.error('classificar-riscos:', (err as Error)?.message)
        return errorResponse(`Erro: ${(err as Error)?.message}`, 500)
    }
})

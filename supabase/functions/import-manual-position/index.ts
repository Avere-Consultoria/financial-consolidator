import { createServiceClient } from '../_shared/supabaseClient.ts'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { toDateOnly } from '../_shared/dates.ts'
import { mapTipoLabel } from '../_shared/assetClassMap.ts'
import { resolverOuCriarCanonico, sugerirCanonicoComClassificacao, type Identificador } from '../_shared/canonico.ts'
import { normalizarSubTipo } from '../_shared/normalizarSubTipo.ts'

// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: import-manual-position
//
// Ingestão semiautomática (PDF → JSON pelo agente de IA). Máquina-pra-máquina:
// o agente faz POST com header `x-import-key` e o corpo { snapshot, ativos }.
// Pluga no MESMO pipeline canônico das APIs.
//
// Deploy SEM verificação de JWT (o agente não tem JWT de usuário):
//   supabase functions deploy import-manual-position --no-verify-jwt
// A autenticação real é o segredo x-import-key (env MANUAL_IMPORT_KEY).
// ─────────────────────────────────────────────────────────────────────────────

interface ManualAtivo {
  asset_class?: string
  sub_tipo?: string
  emissor?: string
  emissor_nome?: string
  emissor_cnpj?: string
  ticker?: string
  isin?: string
  valor_bruto?: number
  valor_liquido?: number
  quantidade?: number
  preco_mercado?: number
  maturity_date?: string
  data_vencimento?: string
  issue_date?: string
  data_aplicacao?: string
  benchmark?: string
  rentabilidade?: number
  yield_avg?: number
}

const SUBTIPOS_TESOURO = new Set(['NTN-B', 'NTNB', 'NTN-F', 'NTNF', 'NTN-C', 'NTNC', 'LTN', 'LFT'])

// Comparação em tempo constante (anti timing-attack): compara digests SHA-256,
// que têm tamanho fixo — não vaza tamanho nem ponto de divergência do segredo.
async function segredoConfere(provided: string, expected: string): Promise<boolean> {
  const enc = new TextEncoder()
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(provided)),
    crypto.subtle.digest('SHA-256', enc.encode(expected)),
  ])
  const va = new Uint8Array(a), vb = new Uint8Array(b)
  let diff = 0
  for (let i = 0; i < va.length; i++) diff |= va[i] ^ vb[i]
  return diff === 0
}

function nomeEmissor(a: ManualAtivo): string {
  return (a.emissor_nome ?? a.emissor ?? '').trim()
}

function coletarIdentificadores(a: ManualAtivo): Identificador[] {
  const ids: Identificador[] = []
  const isFundo = (a.asset_class ?? '').toUpperCase() === 'INVESTMENT_FUND'

  // ISIN e ticker identificam o ATIVO (únicos por papel) — prioridade
  if (a.isin)   ids.push({ tipo: 'ISIN',   codigo: String(a.isin).trim() })
  if (a.ticker) ids.push({ tipo: 'TICKER', codigo: String(a.ticker).trim() })

  // CNPJ só identifica o ATIVO quando é FUNDO (o CNPJ é do próprio fundo).
  // Para debênture/COE/ação o CNPJ é do EMISSOR (compartilhado entre vários
  // papéis) → NÃO serve como identidade do ativo, senão colariam no mesmo canônico.
  if (isFundo && a.emissor_cnpj) ids.push({ tipo: 'CNPJ', codigo: String(a.emissor_cnpj).replace(/\D/g, '') })

  // Tesouro Direto: chave composta sub_tipo + vencimento (igual Ágora)
  const st = (a.sub_tipo ?? '').toUpperCase().trim()
  const venc = toDateOnly(a.maturity_date ?? a.data_vencimento)
  if (SUBTIPOS_TESOURO.has(st) && venc) {
    ids.push({ tipo: 'TICKER', codigo: `${st}-${venc}` })
  }
  return ids
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  // ── Auth do agente: segredo compartilhado (comparação em tempo constante) ──
  const expected = Deno.env.get('MANUAL_IMPORT_KEY')
  const provided = req.headers.get('x-import-key') ?? ''
  if (!expected || !(await segredoConfere(provided, expected))) {
    return errorResponse('Não autorizado (x-import-key inválido).', 401)
  }

  try {
    const body = await req.json().catch(() => null)
    const snapshot = body?.snapshot
    const ativos: ManualAtivo[] = Array.isArray(body?.ativos) ? body.ativos : []
    const envioId: string | null = body?.envio_id ?? body?.snapshot?.envio_id ?? null   // ecoado pela IA p/ fechar o loop

    if (!snapshot?.cliente_cod_avere || !snapshot?.instituicao || !snapshot?.data_referencia) {
      return errorResponse('snapshot precisa de cliente_cod_avere, instituicao e data_referencia.', 400)
    }

    const supabase = createServiceClient()
    const instituicao = String(snapshot.instituicao).trim()
    const dataReferencia = toDateOnly(snapshot.data_referencia)
    if (!dataReferencia) return errorResponse('data_referencia inválida.', 400)

    // ── Resolve cliente por codigo_avere ───────────────────────────────────
    const { data: cliente } = await supabase
      .from('clientes')
      .select('id')
      .eq('codigo_avere', String(snapshot.cliente_cod_avere).trim())
      .maybeSingle()

    if (!cliente) {
      return errorResponse(`Cliente não encontrado para codigo_avere "${snapshot.cliente_cod_avere}".`, 404)
    }

    // ── Resolve canônico por ativo (mesmo pipeline das APIs) ───────────────
    const erros: string[] = []
    let canonicosResolvidos = 0
    const ativoCanonicoIds: (string | null)[] = []

    for (const a of ativos) {
      try {
        const unified = {
          assetClass:   a.asset_class ?? 'OTHER',
          name:         nomeEmissor(a) || a.ticker || null,
          ticker:       a.ticker ?? null,
          securityCode: a.isin ?? null,
          grossValue:   a.valor_bruto ?? null,
          netValue:     a.valor_liquido ?? a.valor_bruto ?? null,
          marketPrice:  a.preco_mercado ?? null,
          quantity:     a.quantidade ?? null,
          maturityDate: a.maturity_date ?? a.data_vencimento ?? null,
          benchMark:    a.benchmark ?? null,
          isLiquidity:  false,
          extra: {
            cnpj:       a.emissor_cnpj ?? null,
            bondType:   a.sub_tipo ?? null,
            issuerName: nomeEmissor(a) || null,
          },
        }
        const ids = coletarIdentificadores(a)
        const subTipoNorm = normalizarSubTipo(a.sub_tipo ?? '')

        let canonicoId: string | null = null
        if (ids.length > 0) {
          // Entrada manual = fonte de menor confiança: LÊ o global (vincula a um
          // canônico que já exista), mas NUNCA escreve nele. Sem match → fica local
          // (canônico nulo). Promover ao global é ação humana. Ver
          // docs/posicao-manual-politica.md.
          canonicoId = await resolverOuCriarCanonico(
            supabase,
            ids,
            sugerirCanonicoComClassificacao(unified, instituicao as any, { sub_tipo_canonico: subTipoNorm }),
            {
              instituicao_origem:      instituicao as any,
              identificador_principal: ids[0],
              nome_ativo:              unified.name ?? '',
              emissor_original:        nomeEmissor(a) || null,
              classe_original:         mapTipoLabel(unified.assetClass),
              liquidez_api_original:   null,
              vencimento_api_original: toDateOnly(unified.maturityDate),
              index_rate:              a.benchmark ?? null,
            },
            undefined,
            null,
            { naoEscreverGlobal: true },
          )
        }
        if (canonicoId) canonicosResolvidos++
        ativoCanonicoIds.push(canonicoId)
      } catch (e) {
        erros.push(`Ativo "${nomeEmissor(a) || a.ticker || '?'}": ${(e as Error).message}`)
        ativoCanonicoIds.push(null)
      }
    }

    // ── Resolve a CONTA (multi-conta): por codigo_conta, senão a primária ──
    let contaId: string | null = null
    const { data: instRow } = await supabase
      .from('instituicoes').select('id').eq('nome', instituicao).maybeSingle()
    if (instRow?.id) {
      let q = supabase
        .from('cliente_contas').select('id, ordem')
        .eq('cliente_id', cliente.id).eq('instituicao_id', instRow.id)
      if (snapshot.codigo_conta != null && String(snapshot.codigo_conta).trim() !== '') {
        q = q.eq('codigo', String(snapshot.codigo_conta).trim())
      }
      const { data: contaRows } = await q.order('ordem', { ascending: true }).limit(1)
      contaId = contaRows?.[0]?.id ?? null
    }

    // ── Upsert snapshot (cliente + conta + data) ───────────────────────────
    const { data: snap, error: snapErr } = await supabase
      .from('posicao_manual_snapshots')
      .upsert({
        cliente_id:         cliente.id,
        conta_id:           contaId,
        instituicao:        instituicao,
        data_referencia:    dataReferencia,
        data_sincronizacao: new Date().toISOString(),
        patrimonio_total:   snapshot.patrimonio_total ?? null,
        saldo_cc:           snapshot.saldo_cc ?? null,
        saldo_rf:           snapshot.saldo_rf ?? null,
        saldo_fundos:       snapshot.saldo_fundos ?? null,
        saldo_rv:           snapshot.saldo_rv ?? null,
        saldo_prev:         snapshot.saldo_prev ?? null,
        saldo_cripto:       snapshot.saldo_cripto ?? null,
        saldo_outros:       snapshot.saldo_outros ?? null,
        is_month_end:       snapshot.is_month_end ?? false,
        source:             snapshot.source ?? 'PDF_MANUAL',
      }, { onConflict: 'cliente_id,conta_id,data_referencia' })
      .select('id')
      .single()

    if (snapErr || !snap) {
      return errorResponse(`Falha ao salvar snapshot: ${snapErr?.message}`, 500)
    }

    // ── Substitui ativos do snapshot — com TRAVA contra sobrescrita (#46c) ──
    // Linhas que o master editou (editado_em != null) são FIXADAS: o re-import não
    // as apaga e não as duplica. Se a IA reextrai classificação diferente de uma
    // linha fixada, marcamos conflito_reimport (a edição vence, mas o selo avisa).
    const { data: editadasRaw } = await supabase
      .from('posicao_manual_ativos')
      .select('id, asset_class, tipo, sub_tipo, emissor, cnpj, ticker, isin, benchmark, data_vencimento')
      .eq('snapshot_id', snap.id)
      .not('editado_em', 'is', null)
    const fixadas = editadasRaw ?? []

    // Casa um ativo a uma linha fixada por QUALQUER chave em comum: cada identidade
    // (ISIN, ticker, CNPJ-se-fundo) + a assinatura (sub_tipo + nome normalizado).
    // Casar por interseção, e não só pela chave de maior prioridade, evita que uma
    // edição que ENRIQUECEU a identidade (ex.: master adicionou o ISIN que faltava)
    // deixe a IA recriar um gêmeo por não bater a chave principal.
    const norm = (s?: string | null) =>
      (s ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase().replace(/\s+/g, ' ').trim()
    const ehFundo = (r: any) =>
      norm(r.asset_class).includes('FUND') || norm(r.tipo).includes('FUND') || norm(r.sub_tipo) === 'FUNDO'
    const chaves = (r: any): string[] => {
      const ks: string[] = []
      const isin = norm(r.isin);   if (isin) ks.push(`I:${isin}`)
      const tk   = norm(r.ticker); if (tk)   ks.push(`T:${tk}`)
      const cnpj = (r.cnpj ?? '').replace(/\D/g, ''); if (cnpj && ehFundo(r)) ks.push(`C:${cnpj}`)
      const sig = `N:${norm(r.sub_tipo)}|${norm(r.emissor)}`
      if (sig !== 'N:|') ks.push(sig)
      return ks
    }
    const difere = (a: string | null, b: string | null) => norm(a) !== norm(b)
    const classificacaoDifere = (fix: any, ai: any) =>
      difere(fix.tipo, ai.tipo) || difere(fix.sub_tipo, ai.sub_tipo) || difere(fix.emissor, ai.emissor) ||
      difere(fix.benchmark, ai.benchmark) ||
      (toDateOnly(fix.data_vencimento) ?? '') !== (toDateOnly(ai.data_vencimento) ?? '')
    // Índice chave → linha fixada. Casa por interseção de chaves no momento do match.
    const indiceFixadas = new Map<string, any>()
    for (const fix of fixadas) for (const k of chaves(fix)) indiceFixadas.set(k, fix)

    // Apaga só as NÃO editadas; as fixadas permanecem.
    await supabase.from('posicao_manual_ativos').delete().eq('snapshot_id', snap.id).is('editado_em', null)

    let ativosInseridos = 0
    const conflitos: { id: string; dados: any }[] = []
    if (ativos.length > 0) {
      const rows: any[] = []
      ativos.forEach((a, i) => {
        const row = {
          snapshot_id:       snap.id,
          ativo_canonico_id: ativoCanonicoIds[i],
          asset_class:       a.asset_class ?? null,
          tipo:              mapTipoLabel(a.asset_class ?? 'OTHER'),
          sub_tipo:          normalizarSubTipo(a.sub_tipo ?? ''),
          emissor:           nomeEmissor(a) || a.ticker || null,
          cnpj:              a.emissor_cnpj ? String(a.emissor_cnpj).replace(/\D/g, '') : null,
          ticker:            a.ticker ?? null,
          isin:              a.isin ?? null,
          valor_bruto:       a.valor_bruto ?? null,
          valor_liquido:     a.valor_liquido ?? a.valor_bruto ?? null,
          quantidade:        a.quantidade ?? null,
          preco_mercado:     a.preco_mercado ?? null,
          data_vencimento:   toDateOnly(a.maturity_date ?? a.data_vencimento),
          data_aplicacao:    toDateOnly(a.issue_date ?? a.data_aplicacao),
          benchmark:         a.benchmark ?? null,
          rentabilidade:     a.rentabilidade ?? null,
          yield_avg:         a.yield_avg ?? null,
        }
        let fix: any = null
        for (const k of chaves(row)) { const m = indiceFixadas.get(k); if (m) { fix = m; break } }
        if (fix) {
          // Colisão com uma linha fixada: a edição do master vence (não reinsere).
          if (classificacaoDifere(fix, row)) {
            conflitos.push({
              id: fix.id,
              dados: {
                tipo: row.tipo, sub_tipo: row.sub_tipo, emissor: row.emissor,
                benchmark: row.benchmark, data_vencimento: row.data_vencimento,
                detectado_em: new Date().toISOString(),
              },
            })
          }
          return
        }
        rows.push(row)
      })

      if (rows.length > 0) {
        const { error: ativosErr } = await supabase.from('posicao_manual_ativos').insert(rows)
        if (ativosErr) return errorResponse(`Falha ao salvar ativos: ${ativosErr.message}`, 500)
        ativosInseridos = rows.length
      }
    }

    // Carimba o selo de conflito nas linhas fixadas que divergiram da reextração.
    for (const c of conflitos) {
      await supabase.from('posicao_manual_ativos')
        .update({ conflito_reimport: true, conflito_dados: c.dados })
        .eq('id', c.id)
    }

    // ── Auto-registra a instituição (cor padrão, ajustável depois) ─────────
    const { data: instExiste } = await supabase
      .from('instituicoes')
      .select('id')
      .ilike('nome', instituicao)
      .maybeSingle()
    if (!instExiste) {
      await supabase.from('instituicoes').insert({ nome: instituicao, cor_primaria: '#64748B', tipo: 'MANUAL' })
    }

    // Fecha o loop de auditoria: marca o envio como processado (se a IA ecoou o envio_id).
    if (envioId) {
      await supabase.from('envio_pdf_manual')
        .update({ status: 'processado', processado_em: new Date().toISOString(), snapshot_id: snap.id })
        .eq('id', envioId)
    }

    return jsonResponse({
      ok: true,
      instituicao,
      data_referencia: dataReferencia,
      snapshot_id: snap.id,
      envio_id: envioId,
      ativos_inseridos: ativosInseridos,
      canonicos_resolvidos: canonicosResolvidos,
      erros,
    })

  } catch (err) {
    console.error('Erro import-manual-position:', (err as Error)?.message)
    return errorResponse(`Erro interno: ${(err as Error)?.message}`, 500)
  }
})

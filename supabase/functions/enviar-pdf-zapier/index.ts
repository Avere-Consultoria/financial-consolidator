import { createServiceClient } from '../_shared/supabaseClient.ts'
import { corsHeaders, errorResponse, jsonResponse } from '../_shared/cors.ts'
import { validarAuth, validarOwnershipCliente } from '../_shared/auth.ts'

// ─────────────────────────────────────────────────────────────────────────────
// Edge Function: enviar-pdf-zapier
// Deploy: supabase functions deploy enviar-pdf-zapier --no-verify-jwt
//
// Proxy seguro do envio de PDF manual → webhook do Zapier. O front manda só o
// arquivo (base64) + clienteId/contaId/data_referencia; AQUI validamos o login e
// a posse do cliente, buscamos os dados CONFIÁVEIS no banco (cliente, consultor,
// instituição) e repassamos ao Zapier em multipart. A URL do webhook é um secret
// (nunca vai pro front). Cada envio é registrado em envio_pdf_manual (auditoria).
// ─────────────────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authResult = await validarAuth(req)
    if ('error' in authResult) return authResult.error
    const ctx = authResult.ctx

    const body = await req.json().catch(() => ({}))
    const clienteId: string | null = body.clienteId ?? null
    const contaId: string | null = body.contaId ?? null
    const dataReferencia: string | null = body.dataReferencia ?? null   // 'YYYY-MM-DD'
    // arquivos: [{ base64, nome, tipo }] — aceita também o formato antigo de 1 arquivo.
    const arquivosIn: any[] = Array.isArray(body.arquivos) && body.arquivos.length
      ? body.arquivos
      : (body.fileBase64 ? [{ base64: body.fileBase64, nome: body.fileName || 'documento.pdf', tipo: 'application/pdf' }] : [])

    if (!clienteId || !contaId || !dataReferencia || arquivosIn.length === 0) {
      return errorResponse('Faltam campos: clienteId, contaId, dataReferencia, arquivos', 400)
    }

    // Posse do cliente (consultor responsável ou master).
    const ownerError = await validarOwnershipCliente(ctx, clienteId)
    if (ownerError) return ownerError

    const supabase = createServiceClient()

    // Dados CONFIÁVEIS do cliente + consultor (do banco, não do que o front mandou).
    const { data: cliente } = await supabase
      .from('clientes')
      .select('id, nome, codigo_avere, documento, consultor_id')
      .eq('id', clienteId)
      .maybeSingle()
    if (!cliente) return errorResponse('Cliente não encontrado', 404)

    const { data: consultor } = cliente.consultor_id
      ? await supabase.from('consultores').select('nome').eq('id', cliente.consultor_id).maybeSingle()
      : { data: null }

    // Conta + instituição: precisa ser do cliente E do tipo MANUAL (não-API).
    const { data: conta } = await supabase
      .from('cliente_contas')
      .select('id, cliente_id, instituicoes!inner(nome, tipo)')
      .eq('id', contaId)
      .maybeSingle()
    if (!conta || conta.cliente_id !== clienteId) {
      return errorResponse('Conta não pertence a este cliente', 403)
    }
    const inst = (conta as any).instituicoes
    if (!inst || String(inst.tipo).toUpperCase() !== 'MANUAL') {
      return errorResponse('Só é permitido enviar PDF para instituições MANUAIS (não-API)', 400)
    }

    // Decodifica TODOS os arquivos (aceita data URL ou base64 puro).
    const arquivos: { bytes: Uint8Array; nome: string; tipo: string }[] = []
    for (const a of arquivosIn) {
      const raw = String(a?.base64 ?? '').replace(/^data:.*;base64,/, '')
      if (!raw) continue
      let bytes: Uint8Array
      try {
        bytes = Uint8Array.from(atob(raw), c => c.charCodeAt(0))
      } catch {
        return errorResponse('Arquivo (base64) inválido', 400)
      }
      arquivos.push({ bytes, nome: a?.nome || 'documento', tipo: a?.tipo || 'application/octet-stream' })
    }
    if (arquivos.length === 0) return errorResponse('Nenhum arquivo válido', 400)

    const webhook = Deno.env.get('ZAPIER_PDF_WEBHOOK_URL')
    if (!webhook) return errorResponse('ZAPIER_PDF_WEBHOOK_URL não configurado (secret)', 500)

    // Registra o envio ANTES — pra mandar o envio_id ao Zapier; a IA ecoa de volta no
    // import-manual-position e fechamos o loop (enviado → processado).
    const { data: log } = await supabase.from('envio_pdf_manual').insert({
      cliente_id:      clienteId,
      conta_id:        contaId,
      instituicao:     inst.nome ?? null,
      data_referencia: dataReferencia,
      consultor_id:    cliente.consultor_id ?? null,
      enviado_por:     ctx.userId,
      arquivo_nome:    arquivos.map(a => a.nome).join('; '),
      arquivo_bytes:   arquivos.reduce((s, a) => s + a.bytes.length, 0),
      status:          'enviado',
    }).select('id').single()
    const envioId: string | null = log?.id ?? null

    // Multipart: TODOS os arquivos sob o MESMO campo 'arquivos' (repetido) → o Zapier
    // expõe como ARRAY nativo, que ele itera sem gambiarra (recomendação do master).
    // Cada blob já carrega o nome do arquivo.
    // UM POST por arquivo: cada arquivo vira um disparo separado do webhook (o Zapier
    // recebe N eventos, cada um com 1 arquivo no campo 'arquivo' — sem array/loop lá).
    // Todos compartilham o envio_id; arquivo_indice/arquivo_qtd deixam a IA reagrupar.
    const meta: Record<string, string> = {
      ...(envioId ? { envio_id: envioId } : {}),         // ← a IA devolve isto no import
      codigo_avere:    cliente.codigo_avere ?? '',
      nome_cliente:    cliente.nome ?? '',
      documento:       cliente.documento ?? '',
      consultor:       (consultor as any)?.nome ?? '',
      instituicao:     inst.nome ?? '',
      data_referencia: dataReferencia,
      arquivo_qtd:     String(arquivos.length),
    }

    let status = 'enviado'
    let detalhe: string | null = null
    for (let i = 0; i < arquivos.length; i++) {
      const a = arquivos[i]
      const fd = new FormData()
      fd.append('arquivo', new Blob([a.bytes], { type: a.tipo }), a.nome)
      fd.append('arquivo_nome',   a.nome)
      fd.append('arquivo_indice', String(i + 1))         // 1..N
      for (const [k, v] of Object.entries(meta)) fd.append(k, v)
      try {
        const r = await fetch(webhook, { method: 'POST', body: fd })
        if (!r.ok) {
          status = 'erro'
          detalhe = `Zapier respondeu ${r.status} no arquivo ${i + 1}/${arquivos.length}: ${(await r.text().catch(() => '')).slice(0, 200)}`
          break
        }
      } catch (e) {
        status = 'erro'
        detalhe = `Falha ao chamar o Zapier no arquivo ${i + 1}/${arquivos.length}: ${(e as Error)?.message}`
        break
      }
    }

    // Falhou no Zapier → marca o envio como erro.
    if (status === 'erro' && envioId) {
      await supabase.from('envio_pdf_manual').update({ status, detalhe }).eq('id', envioId)
    }

    if (status === 'erro') return errorResponse(detalhe ?? 'Falha ao enviar ao Zapier', 502)
    return jsonResponse({ ok: true, envio_id: envioId, instituicao: inst.nome, data_referencia: dataReferencia })

  } catch (err) {
    console.error('Erro em enviar-pdf-zapier:', (err as Error)?.message)
    return errorResponse('Erro interno', 500)
  }
})

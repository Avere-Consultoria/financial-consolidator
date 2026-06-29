-- ═══════════════════════════════════════════════════════════════════════════
-- #51 — Excluir um envio manual (ação GATED do master).
--
-- envio_pdf_manual é tabela de auditoria (RLS só de SELECT p/ authenticated), então
-- a exclusão passa por este RPC SECURITY DEFINER + is_master(). Hard-delete.
--
-- Dois alvos distintos: o REGISTRO do envio (limpa o histórico) e a POSIÇÃO que ele
-- importou (snapshot + ativos → some da carteira do cliente). O botão é adaptativo:
--   • envio órfão (sem posição) → remove só o registro;
--   • envio com posição → remove o registro e, se pedido, a posição.
--
-- Guarda-corpos (no servidor, não confia no front):
--   • Snapshot COMPARTILHADO (outro envio na mesma chave) → a posição é PRESERVADA
--     (senão derrubaria o que o outro envio alimentou); só o registro é removido.
--   • Ativos PROMOVIDOS ao global → o canônico em ativos_canonicos PERMANECE (o
--     delete só cascateia posicao_manual_ativos; o FK p/ o canônico é SET NULL).
--   • dry_run devolve o raio de impacto (ativos, valor, editados, promovidos,
--     compartilhado, afeta_home) p/ a confirmação na tela.
--
-- Seguro p/ fechamento: nenhuma tabela de mês fechado referencia o snapshot vivo
-- (o fechamento carimba cópias dos campos). As únicas FKs ao snapshot são
-- envio_pdf_manual.snapshot_id (SET NULL) e posicao_manual_ativos (CASCADE).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION excluir_envio_manual(
    p_envio_id        uuid,
    p_remover_posicao boolean DEFAULT false,
    p_dry_run         boolean DEFAULT false
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_envio        envio_pdf_manual%ROWTYPE;
    v_snap_id      uuid;
    v_ativos       int     := 0;
    v_valor        numeric := 0;
    v_editados     int     := 0;
    v_promovidos   int     := 0;
    v_outros       int     := 0;
    v_compart      boolean := false;
    v_afeta_home   boolean := false;
    v_max_ref      date;
    v_pos_removida boolean := false;
BEGIN
    IF NOT public.is_master() THEN
        RAISE EXCEPTION 'Apenas o master pode excluir envios manuais';
    END IF;

    SELECT * INTO v_envio FROM envio_pdf_manual WHERE id = p_envio_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Envio não encontrado'; END IF;

    -- Resolve o snapshot: ponteiro direto; senão pela chave de negócio (o loop de
    -- auditoria nem sempre fecha, então snapshot_id costuma ser nulo).
    v_snap_id := v_envio.snapshot_id;
    IF v_snap_id IS NULL THEN
        SELECT id INTO v_snap_id FROM posicao_manual_snapshots
        WHERE cliente_id = v_envio.cliente_id
          AND instituicao = v_envio.instituicao
          AND data_referencia = v_envio.data_referencia
          AND conta_id IS NOT DISTINCT FROM v_envio.conta_id
        ORDER BY data_sincronizacao DESC NULLS LAST
        LIMIT 1;
    END IF;

    IF v_snap_id IS NOT NULL THEN
        SELECT count(*), COALESCE(sum(valor_bruto), 0),
               count(*) FILTER (WHERE editado_em IS NOT NULL),
               count(*) FILTER (WHERE ativo_canonico_id IS NOT NULL)
          INTO v_ativos, v_valor, v_editados, v_promovidos
        FROM posicao_manual_ativos WHERE snapshot_id = v_snap_id;

        -- Compartilhado: outro envio (≠ este) na mesma chave de negócio.
        SELECT count(*) INTO v_outros FROM envio_pdf_manual
        WHERE id <> p_envio_id
          AND cliente_id = v_envio.cliente_id
          AND instituicao = v_envio.instituicao
          AND data_referencia = v_envio.data_referencia
          AND conta_id IS NOT DISTINCT FROM v_envio.conta_id;
        v_compart := v_outros > 0;

        -- Afeta a Home: é o snapshot mais recente daquela conta/instituição?
        SELECT max(data_referencia) INTO v_max_ref FROM posicao_manual_snapshots
        WHERE cliente_id = v_envio.cliente_id
          AND ( (v_envio.conta_id IS NOT NULL AND conta_id = v_envio.conta_id)
             OR (v_envio.conta_id IS NULL AND instituicao = v_envio.instituicao) );
        v_afeta_home := (v_max_ref = v_envio.data_referencia);
    END IF;

    IF p_dry_run THEN
        RETURN jsonb_build_object(
            'dry_run',       true,
            'tem_posicao',   v_snap_id IS NOT NULL,
            'snapshot_id',   v_snap_id,
            'ativos',        v_ativos,
            'valor_total',   v_valor,
            'editados',      v_editados,
            'promovidos',    v_promovidos,
            'compartilhado', v_compart,
            'afeta_home',    v_afeta_home
        );
    END IF;

    -- Execução real: remove a posição só se pedido E não compartilhada.
    IF p_remover_posicao AND v_snap_id IS NOT NULL AND NOT v_compart THEN
        DELETE FROM posicao_manual_snapshots WHERE id = v_snap_id;  -- cascateia ativos
        v_pos_removida := true;
    END IF;

    DELETE FROM envio_pdf_manual WHERE id = p_envio_id;

    RETURN jsonb_build_object(
        'sucesso',                  true,
        'envio_excluido',           true,
        'posicao_removida',         v_pos_removida,
        'snapshot_id',              v_snap_id,
        'ativos_removidos',         CASE WHEN v_pos_removida THEN v_ativos ELSE 0 END,
        'compartilhado_preservado', (p_remover_posicao AND v_compart)
    );
END $$;

GRANT EXECUTE ON FUNCTION excluir_envio_manual(uuid, boolean, boolean) TO authenticated;

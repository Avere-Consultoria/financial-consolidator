-- ═══════════════════════════════════════════════════════════════════════════
-- Código estável para as instituições de API (BTG/XP/AVENUE/AGORA).
--
-- Hoje o app (Home) e o sync (_shared/contas.ts) identificam a instituição de
-- API pelo NOME (regex / ilike '%btg%'). Isso amarra o nome — renomear para algo
-- sem a palavra-chave quebraria a resolução de contas do multi-conta.
--
-- Esta coluna `codigo` passa a ser a chave estável: o nome fica 100% livre para
-- edição em Gestão Master, e tanto o front quanto as edge functions casam por
-- código. Instituições MANUAIS ficam com codigo NULL (continuam por nome).
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE instituicoes ADD COLUMN IF NOT EXISTS codigo text;

-- Backfill das 4 instituições de API a partir do nome atual.
UPDATE instituicoes SET codigo = 'BTG'    WHERE codigo IS NULL AND nome ILIKE '%btg%'    AND (tipo = 'API' OR tipo IS NULL);
UPDATE instituicoes SET codigo = 'XP'     WHERE codigo IS NULL AND nome ILIKE '%xp%'     AND (tipo = 'API' OR tipo IS NULL);
UPDATE instituicoes SET codigo = 'AVENUE' WHERE codigo IS NULL AND nome ILIKE '%avenue%' AND (tipo = 'API' OR tipo IS NULL);
UPDATE instituicoes SET codigo = 'AGORA'  WHERE codigo IS NULL AND nome ILIKE '%gora%'   AND (tipo = 'API' OR tipo IS NULL);

-- Um código não pode se repetir (mas vários manuais podem ter codigo NULL).
CREATE UNIQUE INDEX IF NOT EXISTS uq_instituicoes_codigo ON instituicoes (codigo) WHERE codigo IS NOT NULL;

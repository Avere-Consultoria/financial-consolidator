# Runbook — Implantação da Classificação por Certeza

> Ordem importa: passos 1–2 (estrutura + mapa) **antes** do deploy (6).
> Todo UPDATE tem `AND origem_classificacao IS DISTINCT FROM 'manual'` → reprocessar nunca atropela o master.
> Tudo idempotente (pode rodar de novo).

---

## 0. Rede de segurança (backup)
```sql
CREATE TABLE backup_ativos_canonicos_20260621 AS SELECT * FROM ativos_canonicos;
SELECT count(*) FROM backup_ativos_canonicos_20260621;   -- anote o número
```

**Rollback de qualquer passo de dados:**
```sql
UPDATE ativos_canonicos a
   SET classe_avere = b.classe_avere,
       origem_classificacao = b.origem_classificacao
  FROM backup_ativos_canonicos_20260621 b
 WHERE a.id = b.id;
```

---

## 1. Migration (estrutura)
Rodar: `supabase/migrations/20260621000000_classificacao_certeza.sql`

```sql
SELECT count(*) FROM mapa_classificacao;                                  -- 0
SELECT column_name FROM information_schema.columns
 WHERE table_name='ativos_canonicos' AND column_name='origem_classificacao';  -- 1 linha
```

---

## 2. Carga do mapa curado (Base_2)
Rodar: `scripts/out/carga_mapa_classificacao.sql`

```sql
SELECT count(*) FROM mapa_classificacao;                                  -- 917
SELECT tipo_chave, count(*) FROM mapa_classificacao GROUP BY 1 ORDER BY 2 DESC;
```
Rollback isolado: `TRUNCATE mapa_classificacao;`

---

## 3. Aplicar classes (154 correções)
**Foto ANTES:**
```sql
SELECT classe_avere, count(*) FROM ativos_canonicos GROUP BY 1 ORDER BY 2 DESC;
```
Rodar: `scripts/out/aplicar_classes_canonicos.sql`

**Confere DEPOIS:**
```sql
SELECT count(*) FROM ativos_canonicos WHERE origem_classificacao='mapa';  -- ~154
-- FIIs que estavam como Renda Variável:
SELECT count(*) FROM ativos_canonicos WHERE classe_avere='FII-FIAgro' AND origem_classificacao='mapa';
```

---

## 4. Faxina (66 chutes "Multimercado" → vazio)
Rodar: `scripts/out/faxina_classificacao.sql`

```sql
SELECT count(*) FROM ativos_canonicos WHERE classe_avere IS NULL;         -- subiu ~66
```

---

## 5. Frontend (consolidador)
Build/deploy do `consolidador` (mudança do DrawerCanonico: carimba `origem='manual'` ao editar).

Teste: editar uma classe à mão no Master Ativos →
```sql
SELECT classe_avere, origem_classificacao FROM ativos_canonicos
 WHERE id = '<id_que_voce_editou>';                                       -- origem = 'manual'
```

---

## 6. Redeploy das Edge Functions
```
supabase functions deploy get-btg-position    --no-verify-jwt
supabase functions deploy get-xp-position      --no-verify-jwt
supabase functions deploy get-avenue-position  --no-verify-jwt
supabase functions deploy get-agora-position   --no-verify-jwt
supabase functions deploy import-manual-position --no-verify-jwt
-- de carona (estavam pendentes da Fase 1c):
supabase functions deploy classificar-riscos       --no-verify-jwt
supabase functions deploy sync-fgc-associados      --no-verify-jwt
supabase functions deploy sync-bcb-instituicoes    --no-verify-jwt
```

**Smoke test (prova tudo):** sincroniza UM cliente com fundo novo e confere que fundo sem cobertura entra VAZIO (não "Multimercado"):
```sql
SELECT nome_canonico, classe_avere, origem_classificacao
  FROM ativos_canonicos ORDER BY criado_em DESC LIMIT 10;
```

---

## 7. Revisão (no sistema)
Master Ativos → filtro **"A classificar"**: os ~66 + estruturados (FII/FIDC/FIP) aparecem aqui pro time classificar com critério.

---

## Checklist rápido
- [ ] 0. backup criado
- [ ] 1. migration ok (tabela + coluna)
- [ ] 2. mapa = 917
- [ ] 3. aplicar = ~154 'mapa'
- [ ] 4. faxina = pendentes +66
- [ ] 5. frontend buildado (origem='manual' funciona)
- [ ] 6. 8 functions deployadas + smoke test
- [ ] 7. fila "A classificar" povoada

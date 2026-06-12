# Formato EXATO das saídas SQL

Dois arquivos, sempre nesta ordem de execução. Ambos idempotentes (rodar 2× não duplica
nem corrompe). Escapar aspas simples duplicando (`''`).

## 1. carga_mapa_cvm.sql — alimenta o mapa curado

Um INSERT por fundo APROVADO. `chave` = CNPJ com 14 dígitos (sem máscara).

```sql
-- Curadoria CVM de <data> — <N> fundos aprovados pelo curador
INSERT INTO mapa_classificacao (chave, tipo_chave, classe_avere, fonte)
VALUES
  ('57832914000136', 'CNPJ', 'RF - Pós-fixado', 'CVM_REVISADO'),
  ('57027655000170', 'CNPJ', 'RF - Pós-fixado', 'CVM_REVISADO')
ON CONFLICT (chave) DO UPDATE SET
  classe_avere = EXCLUDED.classe_avere,
  fonte        = EXCLUDED.fonte;
```

Por quê: o mapa vale para sempre — o mesmo fundo na carteira de outro cliente
já entra classificado. `fonte='CVM_REVISADO'` é a trilha de auditoria
(distingue do Base_2 original).

## 2. aplicar_pendentes_cvm.sql — corrige os canônicos da fila

Um UPDATE por ativo aprovado, **por id** (determinístico, auditável linha a linha).
SEMPRE com a guarda de `manual`:

```sql
-- <nome do fundo>: (vazio) -> RF - Pós-fixado [aprovado pelo curador]
UPDATE ativos_canonicos
   SET classe_avere = 'RF - Pós-fixado',
       origem_classificacao = 'mapa'
 WHERE id = 'b9adb3b0-8a55-4456-845a-3de5d0841ac4'
   AND origem_classificacao IS DISTINCT FROM 'manual';
```

### Liquidez (opcional, junto no mesmo arquivo)

Só quando o curador aprovar o enriquecimento de liquidez — e SÓ onde está vazia:

```sql
UPDATE ativos_canonicos
   SET liquidez_avere = '31'
 WHERE id = 'b9adb3b0-8a55-4456-845a-3de5d0841ac4'
   AND liquidez_avere IS NULL;
```

## Regras invioláveis

1. **Só entra o que o curador aprovou explicitamente** — sugestão não aprovada não vira SQL.
2. **`origem_classificacao = 'manual'` é intocável** — a guarda `IS DISTINCT FROM 'manual'`
   aparece em TODO update de classe.
3. **Liquidez nunca sobrescreve** — só `WHERE liquidez_avere IS NULL`.
4. Comentário SQL (`--`) com o nome do fundo acima de cada UPDATE — auditoria humana do arquivo.
5. Instruir o curador: rodar no SQL editor do Supabase, **carga primeiro, aplicar depois**,
   e conferir com:
   ```sql
   SELECT count(*) FROM ativos_canonicos WHERE classe_avere IS NULL;  -- caiu N?
   SELECT count(*) FROM mapa_classificacao WHERE fonte = 'CVM_REVISADO';
   ```

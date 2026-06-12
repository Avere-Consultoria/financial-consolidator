---
name: curadoria-ativos
description: Curadoria de classificação de ativos do Consolidador da Avere Partners. Cruza os ativos pendentes ("A classificar") com os Dados Abertos da CVM (cad_fi + extrato_fi), monta uma comparação visual com sugestão de classe Avere + nível de confiança + liquidez + gestor, conduz a revisão conversacional com o curador e gera os SQLs idempotentes no formato exato que o sistema consome (mapa_classificacao com fonte='CVM_REVISADO'). Use sempre que o usuário mencionar: classificar pendentes, fila de classificação, ativos a classificar, curadoria de ativos, cruzar com a CVM, classificar fundos, enriquecer fundos, mapa de classificação, CVM cad_fi, sugestão de classe, ou enviar um CSV exportado da fila de pendentes do consolidador — mesmo que não cite a skill explicitamente.
---

# Curadoria de Ativos — fila "A classificar" × CVM

Skill do ritual de curadoria do Consolidador Avere. O princípio inegociável do sistema:
**nada é classificado por chute** — classe só entra com lastro (identificador imutável ou
revisão humana). Esta skill acelera a revisão humana, nunca a substitui.

## Fluxo (5 passos)

### 1. Receber a fila de pendentes

O curador envia um CSV exportado do Supabase. Se ele não tiver o export, forneça a query:

```sql
SELECT ac.id AS ativo_canonico_id, ac.nome_canonico,
       d.codigo_identificador AS cnpj
FROM ativos_canonicos ac
JOIN dicionario_ativos d ON d.ativo_canonico_id = ac.id
WHERE ac.classe_avere IS NULL AND d.tipo_identificador = 'CNPJ'
GROUP BY ac.id, ac.nome_canonico, d.codigo_identificador;
```

Colunas mínimas esperadas: `ativo_canonico_id`, `nome_canonico`, `cnpj`
(aceite variações de nome de coluna — normalize antes de rodar o script).
Pendentes **sem CNPJ** (ETFs, COEs, ações) ficam fora deste fluxo: liste-os ao final
como "fora do escopo CVM — revisar no Master Ativos".

### 2. Cruzar com a CVM

Execute `scripts/cruzar_cvm.py`:

```bash
python scripts/cruzar_cvm.py --pendentes <csv_do_curador> --out-dir <pasta_de_trabalho>
```

O script baixa (com cache local) o `cad_fi.csv` e o `extrato_fi.csv` dos Dados Abertos
da CVM, cruza por CNPJ e gera `comparativo_cvm.csv` com: situação do fundo, categoria
ANBIMA, **sugestão de classe Avere + confiança** (regras em `references/de-para-anbima.md`),
liquidez D+ (conversão + pagamento), gestor, taxas e flag de crédito privado.

### 3. Apresentar a comparação VISUAL

Monte uma tabela HTML (ou a melhor visualização disponível no ambiente) — nunca despeje
o CSV cru. Uma linha por fundo, nesta ordem de colunas:

| # | Fundo (sistema) | CVM: categoria ANBIMA | Sugestão classe Avere | Confiança | Liquidez D+ | Gestor | Sinais |
|---|---|---|---|---|---|---|---|

Regras de apresentação:
- **Confiança alta** = verde; **média** = amarelo; **sem sugestão/não encontrado** = vermelho.
- Coluna "Sinais": crédito privado ✓, fundo CANCELADO ⚠️ (provável posição zerada/erro),
  não encontrado na CVM ⚠️.
- Agrupe por confiança (alta primeiro) e numere as linhas — o curador vai responder por número.

### 4. Revisão conversacional

Pergunte ao curador, de forma direta:
- "Aprova as sugestões de confiança **alta** em bloco? (ex.: 'aprovo 1–12')"
- "Para as **médias**, confirme uma a uma ou ajuste (ex.: '13 ok, 14 muda para RF - Inflação')"
- "As **vermelhas** ficam pendentes para o Master Ativos, certo?"

Aceite ajustes livres. Classes válidas são SOMENTE as 15 oficiais (lista exata em
`references/de-para-anbima.md`) — se o curador escrever uma variação, confirme a oficial.
Nada vira SQL sem aprovação explícita.

### 5. Gerar as saídas

Com as decisões fechadas, gere DOIS arquivos SQL seguindo À RISCA os templates de
`references/saida-sql.md` (leia antes de gerar):

1. `carga_mapa_cvm.sql` — INSERT no `mapa_classificacao` com `fonte='CVM_REVISADO'`
   (só os aprovados; idempotente).
2. `aplicar_pendentes_cvm.sql` — UPDATE dos `ativos_canonicos` por id, com
   `origem_classificacao='mapa'` e guarda `IS DISTINCT FROM 'manual'`.

E um resumo final: N aprovados, N ajustados, N deixados pendentes, N fora do escopo —
com instrução de rodar os SQLs no SQL editor do Supabase (carga primeiro, aplicar depois).

## Por que as regras são assim

- **fonte='CVM_REVISADO'**: distingue no banco o que passou por revisão humana via CVM
  do que veio do Base_2 original — trilha de auditoria.
- **Nunca tocar `origem_classificacao='manual'`**: o ajuste fino do master é soberano;
  reprocessamentos em massa não podem atropelá-lo.
- **Liquidez pode ser sugerida junto, mas só preenche onde está vazia** — é enriquecimento,
  não correção.
- **O mapa vale para sempre**: o fundo aprovado hoje classifica automaticamente o mesmo
  fundo quando aparecer na carteira de qualquer outro cliente.

## Arquivos de referência

| Arquivo | Quando ler |
|---|---|
| `references/de-para-anbima.md` | Antes de apresentar sugestões (passo 3) e ao validar ajustes do curador (passo 4) |
| `references/saida-sql.md` | Antes de gerar os SQLs (passo 5) — templates exatos |
| `scripts/cruzar_cvm.py` | Executar no passo 2; ler só se precisar depurar |

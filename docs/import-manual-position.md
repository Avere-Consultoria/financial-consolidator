# Contrato — `import-manual-position` (retorno do PDF manual → sistema)

Edge function que recebe a posição **já tratada** (PDF/Excel/imagem → JSON pela IA/operador) e
a pluga no **mesmo pipeline canônico** das corretoras (BTG/XP/Ágora/Avenue). O dado manual
passa a aparecer na Home, no Master Ativos, reaproveita curadoria, FGC, liquidez por subtipo, etc.

> Fluxo completo: consultor sobe arquivos na Home → edge `enviar-pdf-zapier` → **Zapier** →
> **IA/operador** trata → **POST aqui** com o JSON → grava em `posicao_manual_*`.

---

## Endpoint

```
POST https://dhiqbfldihyjbrgbfveq.supabase.co/functions/v1/import-manual-position
Content-Type: application/json
x-import-key: <MANUAL_IMPORT_KEY>      ← segredo M2M (NÃO é JWT de usuário)
```

- Autenticação é **só** o header `x-import-key` (comparado em tempo constante com o secret
  `MANUAL_IMPORT_KEY`). Sem JWT — é máquina-pra-máquina.
- Em caso de chave inválida/ausente → `401`.

---

## Corpo da requisição

```jsonc
{
  "envio_id": "uuid-do-envio",           // opcional — ECOAR o valor que chegou do Zapier (campo `envio_id`)
                                         //            p/ fechar o loop (marca o envio como 'processado')
  "snapshot": {
    "cliente_cod_avere": "230263",       // OBRIGATÓRIO — resolve o cliente (clientes.codigo_avere)
    "instituicao":       "Itaú",         // OBRIGATÓRIO — nome da instituição manual (criada se não existir)
    "data_referencia":   "2026-06-30",   // OBRIGATÓRIO — o FECHAMENTO (último dia do mês)
    "codigo_conta":      "12345",        // opcional — multi-conta; sem isso usa a conta primária da instituição
    "patrimonio_total":  123456.78,      // opcional
    "saldo_cc":          0,              // opcionais (totais por classe, p/ os cards/gráficos)
    "saldo_rf":          0,
    "saldo_fundos":      0,
    "saldo_rv":          0,
    "saldo_prev":        0,
    "saldo_cripto":      0,
    "saldo_outros":      0,
    "is_month_end":      true,           // opcional (default false)
    "source":            "PDF_MANUAL"    // opcional (default "PDF_MANUAL")
  },
  "ativos": [
    {
      "asset_class":   "FIXED_INCOME",   // ver enum abaixo
      "sub_tipo":      "CDB",            // ver lista abaixo
      "emissor_nome":  "Banco XPTO S.A.",
      "emissor_cnpj":  "00000000000000", // ver "Identidade" abaixo
      "ticker":        null,
      "isin":          "BRXXXXXXXXXX",
      "valor_bruto":   10000.00,
      "valor_liquido": 9800.00,
      "quantidade":    1,
      "preco_mercado": 10000.00,
      "maturity_date": "2028-01-15",     // ou "data_vencimento"
      "data_aplicacao":"2024-01-15",     // ou "issue_date"
      "benchmark":     "CDI",
      "rentabilidade": null,
      "yield_avg":     null
    }
  ]
}
```

### `snapshot` — campos
| Campo | Obrig. | Notas |
|---|---|---|
| `cliente_cod_avere` | ✅ | Tem que existir em `clientes.codigo_avere`; senão `404`. |
| `instituicao` | ✅ | Nome livre. Se não existir em `instituicoes`, é **criada** com `tipo='MANUAL'`. |
| `data_referencia` | ✅ | **Último dia do mês** que o extrato representa (ex.: junho → `2026-06-30`). É a chave do fechamento. |
| `codigo_conta` | — | Para clientes com **mais de uma conta** na mesma instituição. Sem isso, usa a primária. |
| `patrimonio_total`, `saldo_*` | — | Totais por classe (alimentam cards/gráficos). |
| `is_month_end`, `source` | — | Metadados. |

### `ativos[]` — campos
| Campo | Notas |
|---|---|
| `asset_class` | Enum (abaixo). Define a classe-base. |
| `sub_tipo` | Sigla do papel (abaixo). Normalizado internamente. |
| `emissor_nome` (ou `emissor`) | Nome do emissor/papel. |
| `emissor_cnpj` | CNPJ. **Identidade só quando FUNDO** (ver abaixo). |
| `ticker`, `isin` | Identificadores do papel. |
| `valor_bruto`, `valor_liquido` | Se faltar `valor_liquido`, usa o bruto. |
| `quantidade`, `preco_mercado` | — |
| `maturity_date` / `data_vencimento` | Vencimento. |
| `issue_date` / `data_aplicacao` | Aplicação/emissão. |
| `benchmark` | Ex.: `CDI`, `IPCA`. |
| `rentabilidade`, `yield_avg` | Numéricos opcionais. |

---

## Enums

### `asset_class`
`FIXED_INCOME` · `INVESTMENT_FUND` · `EQUITIES` · `PENSION` · `CRYPTO` · `DERIVATIVE` · `COMMODITY` · `CASH` · `OTHER`

### `sub_tipo` (sigla; normalizado internamente)
- **Renda Fixa**: `CDB`, `LCI`, `LCA`, `CRA`, `CRI`, `DEB`, `CDCA`, `LF`, `LFT`, `LTN`,
  `NTN-B`/`NTNB`, `NTN-F`/`NTNF`, `NTN-C`/`NTNC`, `LCD`, `RDB`, `LIG`, `COMPROMISSADA`
- **Fundos**: `FUNDO` (ou `FI`)
- **Renda Variável**: `AÇÃO`, `ETF`, `FII`
- **Outros**: `COE`, `ESTRUTURADA`, `CAIXA`
- Subtipo não-mapeado passa cru (fica visível pra mapear depois) — prefira os acima.

---

## Identidade do ativo (como ele vira "o mesmo" canônico)

A edge resolve o canônico por identificadores, nesta prioridade — **mande os melhores que tiver**:

1. **ISIN** (`isin`) — melhor identificador de papel.
2. **TICKER** (`ticker`).
3. **CNPJ** (`emissor_cnpj`) — **só conta como identidade quando `asset_class = INVESTMENT_FUND`**
   (o CNPJ é do próprio fundo). Para CDB/DEB/CRI/ação o CNPJ é do **emissor** (compartilhado entre
   vários papéis) → **não** é usado como identidade.
4. **Tesouro Direto**: chave composta `sub_tipo + vencimento` (ex.: `NTNB-2035-05-15`) quando
   `sub_tipo ∈ {NTN-B, NTNB, NTN-F, NTNF, NTN-C, NTNC, LTN, LFT}` e há `maturity_date`.

> ⚠️ Se um ativo **não tiver nenhum identificador** (ex.: CDB sem ISIN/ticker), ele é **inserido
> mesmo assim**, mas **sem canônico** (fica sem classe/taxa padronizada até alguém classificar).
> Para RF privada, extraia o **ISIN** do extrato sempre que possível.

---

## Comportamento

- **Upsert por (`cliente`, `conta`, `data_referencia`)**: reenviar o mesmo trio **substitui** o
  snapshot e **troca todos os ativos** dele (idempotente — pode reprocessar à vontade).
- Cada ativo passa por `resolverOuCriarCanonico` (mesma classificação/taxa das APIs).
- A instituição é **auto-criada** (tipo `MANUAL`) na primeira vez.

---

## Resposta

```jsonc
{
  "ok": true,
  "instituicao": "Itaú",
  "data_referencia": "2026-06-30",
  "snapshot_id": "uuid",
  "ativos_inseridos": 12,
  "canonicos_resolvidos": 11,    // quantos linkaram a um canônico
  "erros": []                    // mensagens por ativo que falhou (não aborta o lote)
}
```

Erros de validação: `400` (faltou campo do snapshot / data inválida), `401` (chave), `404`
(cliente não encontrado), `500` (falha ao gravar).

---

## Observações

- **Previdência**: o sistema trata previdência como externa/NULL; pode enviar `asset_class=PENSION`,
  mas a classificação fina fica por conta da curadoria externa.
- **Datas** em `YYYY-MM-DD`. `data_referencia` é sempre o **último dia do mês** (casa com a data que
  o envio do consultor manda e com a visão de fechamento).
- O dado manual entra no **mesmo modelo canônico** → reprocessável, curável no Master, com FGC e
  liquidez por subtipo aplicáveis.

### Loop de auditoria (`envio_id`)
Quando o consultor envia os arquivos, a edge `enviar-pdf-zapier` registra o envio em
`envio_pdf_manual` (status `enviado`) e manda um campo **`envio_id`** no payload do Zapier.
Se a IA **ecoar esse `envio_id`** de volta neste import, o envio é marcado como **`processado`**
(com `processado_em` e `snapshot_id`). Assim dá pra auditar ponta-a-ponta: enviado → processado.
É opcional — sem o `envio_id`, o import funciona igual, só não fecha o rastro.

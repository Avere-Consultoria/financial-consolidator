# Biblioteca de Ativos — COE (schema CONGELADO)

> **COE** (Certificado de Operações Estruturadas). Tratado SEPARADO de "Estruturada"
> (operação com legs/ações). Camadas padrão (cru → curado → resolvido).

## Classe
- **COE → classe `COE` automática** (o `classifyAvere` já detecta COE por subtipo/nome).
  Não precisa de Master.

## Chave
- **Código COE/CETIP**. `tipo_chave='CODIGO'`.

## Colunas de `biblioteca_ativos`
| Coluna | Origem |
|---|---|
| `chave` / `tipo_chave='CODIGO'` | XP `codigoAtivo` · BTG `CetipCode` · Ágora `cetipSelicCode` |
| `sub_tipo` | `'COE'` |
| `nome_ref` | XP `nomeAtivo` · Ágora `coeName` · BTG `FantasyName`/`Ticker` |
| `emissor_ref` | XP `nomeEmissor` · BTG `Issuer` · Ágora `issuerName` |
| `data_vencimento` | XP `dataVencimento` · BTG `MaturityDate` · Ágora `maturityDate` |
| `classe_avere` | `'COE'` (auto) |

## `detalhes` jsonb (COE)
```jsonc
{
  "estrategia": "Call \"Best of\"",        // Ágora cdStrategy
  "indice_subjacente": "Índice S&P 500",   // Ágora nmIndex · BTG ReferenceIndexName
  "descricao": "Ganho ilimitado na valorização… Retorno Mínimo Garantido de 50%…", // Ágora description
  "capital_protegido": true,               // ✏️ CURADORIA (parse da descrição / boletim)
  "rating": { "nota": "AAA", "agencia": "FITCH" }, // Ágora ratingCode · XP rating
  "carencia": "2025-08-01",                // Ágora lackTime · XP dataCarencia
  "data_emissao": "2022-10-28",            // BTG IssueDate
  "status": "Liquidado",                   // Ágora dsStatus/status
  "documentos": {                          // Ágora — paths internos dos PDFs
    "die": "/data-keynes/…/documents_coe/…",
    "boletim": "/data-keynes/…/BROKERAGE_NOTE/…"
  }
}
```

## Posição — NÃO entra (snapshot)
valor da operação/aplicado · bruto/líquido · `valueUpdated`/`valueAppreciation` · IR · quantidade.

## Riqueza por fonte (COE)
- **Ágora = a melhor**: `cdStrategy`, `nmIndex`, `description` completa, `ratingCode`, `lackTime`,
  e até os **paths dos documentos** (DIE/boletim).
- **XP**: rating (nota+agência), carência, e a **estratégia embutida no nome** (`nomeAtivo`).
- **BTG**: pobre — `FantasyName` (código), `Issuer`, `ReferenceIndexName` (PRE). Sem estratégia/descrição.

## Referência — nomes de campo por fonte (COE)
- **XP** (`coe.itens[]`): `nomeAtivo, nomeEmissor, dataVencimento, dataCarencia, codigoAtivo,
  descricaoRatingAgencia, nomeAgenciaRating, categoria='COE'`.
- **BTG** (`FixedIncomeStructuredNote[]`): `Issuer, IssueDate, MaturityDate, ReferenceIndexName,
  FantasyName, Ticker, CetipCode, SecurityCode, AccountingGroupCode='COE'`.
- **Ágora** (`consolidatedPosition[]`): `coeName, issuerName, ratingCode, description, maturityDate,
  lackTime, cdStrategy, nmIndex, status/dsStatus, cetipSelicCode, pathDie, pathBrokerageNote`.

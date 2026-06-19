# Biblioteca de Ativos — Renda Fixa (schema CONGELADO)

> Contrato do subtipo **Renda Fixa** para a biblioteca rica (`biblioteca_ativos`).
> Vale para: CDB · LCI · LCA · CRA · CRI · DEB · CDCA · LF · LFT · LTN · NTN-B · NTN-F · LCD.
>
> Princípio: **capturar tudo que é genérico** (intrínseco ao ativo, igual pra qualquer
> detentor, estável no tempo). Mesmo que só uma fonte entregue um campo, capturamos.
> Cortamos depois o que for inútil. **Posição** (qtd/valor/PU/IR/datas do cliente) NÃO entra.

## Camadas
1. **Cru por fonte** → `dicionario_ativos.dados_brutos` (jsonb): dump integral do item da API
   (genérico), por instituição. É o "lado a lado" pra auditar.
2. **Curado (união)** → `biblioteca_ativos`: colunas comuns + `detalhes` jsonb. É o que a Home usa.
3. **Resolvido** → `ativos_canonicos` (descartável, derivado da biblioteca + API).

## Chave
- **RF** indexa por **código CETIP/SELIC** (normalizado: dígitos; senão upper/trim).
- `ISIN` é guardado como campo (ref. cruzada / ANBIMA futura), **não** é a chave.

## Colunas de `biblioteca_ativos` usadas por RF
| Coluna | Origem sugerida (precedência) |
|---|---|
| `chave` / `tipo_chave='CODIGO'` | código CETIP/SELIC |
| `sub_tipo` | XP `categoria` · BTG `AccountingGroupCode` · Ágora `bondType`→normalizado |
| `nome_ref` | XP `nickName` · BTG `Ticker` · Ágora `bondName` |
| `emissor_ref` | XP `nomeEmissor` · BTG `Issuer` · Ágora `issuerName` |
| `benchmark` | XP `nomeIndexador` · BTG `ReferenceIndexName` · Ágora (do `bondRate`) |
| `taxa_formatada` | XP `taxaCompleta` · BTG `IndexYieldRate` · Ágora `bondRate` |
| `liquidez` | XP `indicadorTipoLiquidez`+`tipoLiquidez` · BTG `IsLiquidity` · Ágora `dailyLiquidity` |
| `data_vencimento` | XP `dataVencimento` · BTG `MaturityDate` · Ágora `maturityDate` |
| `isin` *(nova coluna)* | BTG `ISIN` (únicas que entregam) |

## `detalhes` jsonb (RF) — shape + mapeamento por fonte
```jsonc
{
  "percentual_indexador": 100,        // XP percentualDoIndexador · BTG ReferenceIndexValue · Ágora indexerPercentage
  "spread": 6.71,                     // XP taxa · BTG Yield · Ágora preTaxPercentage
  "tipo_ativo": "PRIVADO",            // XP tipoDeAtivo · BTG IssuerType
  "data_emissao": "2022-06-23",       // BTG IssueDate
  "carencia": "2029-09-25",           // XP dataCarencia
  "periodicidade_juros": "Semestral", // XP descricaoJuros
  "rating": { "nota": "AAA", "agencia": "Fitch" }, // XP descricaoRatingAgencia + nomeAgenciaRating
  "isento_ir": true,                  // BTG TaxFree · Ágora bondTaxDescription="Isento" · XP deriv. subtipo
  "fgc": false,                       // CURADORIA (deriv. subtipo: CDB/LCI/LCA=sim; CRA/CRI/DEB=não)
  "inadimplencia": false,             // BTG Default
  "custodiante": "CETIP",             // XP custodiante
  "projecao_inflacao": "Projeção Anbima", // BTG Projection
  "lag_indexacao": "M-1",             // BTG Lag
  "resgate_antecipado": null,         // BTG DebtEarlyTerminationSchedules · Ágora redeemType
  "compromissada": false,             // BTG IsRepo
  "ticker": "CDB222QGGZM"             // XP codigoAtivo · BTG Ticker
}
```
> Campos ausentes na fonte de origem ficam fora (sem problema). A precedência de preenchimento
> é **manual > biblioteca(curada) > derivado(API)**; o `dados_brutos` guarda o cru de cada fonte.

## Posição — NÃO entra na biblioteca (fica no snapshot)
quantidade · PU/preço · valor bruto/líquido · IR R$ · **data de aplicação** · custo ·
`valueAppreciation`/rendimento · alíquota IR atual · `Acquisitions[]` (lotes).

## Curadoria (✏️ — API não entrega de forma confiável)
- `fgc` (deriva do subtipo, mas confirmável)
- `rating` quando a fonte de origem não trouxe (ex.: veio da Ágora, que não manda rating)
- setor/segmento do emissor (vive em `dicionario_emissores`, linkado por `emissor_ref`)

## Referência — nomes de campo por fonte (RF)
- **XP** (`rendaFixa.itens[]`): `categoria, nomeEmissor, nomeIndexador, percentualDoIndexador,
  taxa, taxaCompleta, dataVencimento, dataCarencia, tipoDeAtivo, descricaoRatingAgencia,
  nomeAgenciaRating, custodiante, descricaoJuros, indicadorTipoLiquidez, tipoLiquidez, codigoCetipSelic`.
- **BTG** (`FixedIncome[]`): `AccountingGroupCode, Issuer, IssueDate, Ticker, ReferenceIndexName,
  ReferenceIndexValue, IndexYieldRate, Yield, MaturityDate, CetipCode, SelicCode, ISIN, TaxFree,
  IssuerType, Projection, Lag, Default, IsRepo, IsLiquidity, DebtEarlyTerminationSchedules`.
- **Ágora** (`response[]`): `bondType, issuerName, maturityDate, bondRate, preTaxPercentage,
  indexerPercentage, redeemType, bondTaxDescription, dailyLiquidity, cetipSelicCode`.
- **Avenue**: RF americana (CUSIP) — mapear quando entrarmos no lado US.

# Biblioteca de Ativos — Fundos (schema CONGELADO)

> Subtipo **Fundos** (FI/FIC/FIM/FIRF/FIDC/FIP/FII-fechado) na `biblioteca_ativos`.
> Mesmas camadas do RF: cru por fonte (`dicionario_ativos.dados_brutos`) → curado
> (`biblioteca_ativos`) → resolvido (`ativos_canonicos`).

## Decisão-chave: classe é do MASTER
- **`classe_avere` NÃO é derivada automaticamente** para fundos. Nasce vazia ("A classificar")
  e o **Master** define (vira `origem='manual'`).
- `TipoCvm` (BTG) é guardado **só como dica** pro Master — NÃO é gatilho de classe.

## Chave
- **Fundos** indexam por **CNPJ** (normalizado, 14 dígitos). `tipo_chave='CNPJ'`.

## Colunas de `biblioteca_ativos` usadas por Fundos
| Coluna | Origem |
|---|---|
| `chave` / `tipo_chave='CNPJ'` | CNPJ |
| `sub_tipo` | `'FUNDO'` (genérico; Master pode refinar) |
| `nome_ref` | XP `nomeFundo` · BTG `FundName` · Ágora `fund` |
| `benchmark` | BTG `BenchMark` (única fonte) |
| `liquidez` | BTG `FundLiquidity` (já é o total) · XP soma `periodoCotizacao`+`periodoLiquidacao` |
| `classe_avere` | **vazia** → Master |
| `emissor_ref` | — (fundos usam gestor, em `detalhes`) |

## `detalhes` jsonb (Fundos)
```jsonc
{
  "gestor": "SPARTA ADMINISTRADORA DE RECURSOS LTDA", // BTG ManagerName
  "tipo_cvm": 2,                 // BTG TipoCvm — DICA p/ o Master (2=RF,4/6=MM,10=FIDC/CrPr,12=FIP,13=FII)
  "entidade": "C",              // BTG EntityType (C=fundo, S=classe/subclasse)
  "cod_interno": "3842212",     // XP securityCode · BTG SecurityCode · Ágora sourceCode
  "relacionado": {              // BTG estrutura classe/subclasse (RCVM 175)
    "security_code_class": "17947075",
    "cge_class": "63982227"
  },
  "aberto_aplicacao": true,     // Ágora openForApplication
  "aberto_resgate": true,       // Ágora openForRescue
  "liquidez_janelas": { "cotizacao": "D+30 (Dias Corridos)", "liquidacao": "D+1 (Dias Úteis)" } // XP (cru das duas janelas)
}
```

## Liquidez — duas formas, mesmo resultado
- **BTG** `FundLiquidity` já vem como **total em dias** (cotização + liquidação).
  Conferido: Occam=31 (D+30+D+1) · Sparta=91 (D+90+D+1) · Solis=60 (D+59+D+1).
- **XP** manda as duas janelas separadas → **somar**.
- **Ágora** não manda liquidez de fundo.

## Posição — NÃO entra (snapshot)
valor da cota (`quotesValue`/`ShareValue`/`valorCota` — muda todo dia) · qtd cotas ·
bruto/líquido · IR · rentabilidade/`vlApprec` · valor aplicado · `Acquisition[]` (lotes).

## Riqueza por fonte (fundos)
- **BTG = a melhor fonte**: gestor, benchmark, `TipoCvm`, `EntityType`, liquidez (total),
  estrutura classe/subclasse. É o seed de curadoria mais forte.
- **XP**: CNPJ + nome + janelas de liquidez (cotização/liquidação).
- **Ágora**: pobre — só CNPJ, nome e flags de aberto. Resto é posição.

## Referência — nomes de campo por fonte (Fundos)
- **XP** (`fundos.itens[]`): `nomeFundo, cnpj, periodoCotizacaoResgate, periodoLiquidacaoResgate`.
- **BTG** (`InvestmentFund[].Fund`): `FundName, FundCNPJCode, ManagerName, BenchMark, FundLiquidity,
  TipoCvm, EntityType, SecurityCode, RelatedSecurityCodeClass, RelatedClassCGECode`.
- **Ágora** (`funds[]`): `fund, cnpj, openForApplication, openForRescue, sourceCode`.

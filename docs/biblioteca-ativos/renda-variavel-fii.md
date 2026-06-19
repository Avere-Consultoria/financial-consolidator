# Biblioteca de Ativos — Renda Variável / FII (schema CONGELADO)

> Subtipos **AÇÃO · ETF · FII (listado)** — todos vivem no bloco de equities das APIs.
> Camadas: cru (`dicionario_ativos.dados_brutos`) → curado (`biblioteca_ativos`) → resolvido (`ativos_canonicos`).

## Classe (parte auto, parte Master)
- **Ações ON/PN** → classe **Renda Variável** automática (certeza).
- **FII / ETF / UNT (ticker terminado em 11)** → **Master classifica** (ticker-11 é ambíguo: FII vs ETF vs UNIT).
  O `is_fii` (BTG) e o `tipo_papel` ajudam o Master a resolver rápido.

## Chave
- **Ticker** (símbolo B3). `tipo_chave='TICKER'`. `ISIN` = ref. cruzada.

## Colunas de `biblioteca_ativos`
| Coluna | Origem |
|---|---|
| `chave` / `tipo_chave='TICKER'` | ticker |
| `sub_tipo` | AÇÃO / ETF / FII (refinado pelo `tipo_papel`/`is_fii`) |
| `nome_ref` | XP `nomeEmpresaEmitente` · BTG `Description` · Ágora `instrumentName` |
| `emissor_ref` | BTG `Issuer`/`IssuerCge` · XP `nomeEmpresaEmitente` |
| `setor_ref` | BTG `SectorCode`+`SectorDescription` (única fonte) |
| `isin` | BTG `ISINCode` (única fonte) |
| `classe_avere` | ON/PN → RV auto · ticker-11 → vazia (Master) |

## `detalhes` jsonb (RV/FII)
```jsonc
{
  "tipo_papel": "COTAS",   // BTG EquityTypeDescription (ON/PN/UNT/COTAS/DR) · Ágora secutiryType
  "is_fii": true,          // BTG IsFII (fonte-verdade) · XP via seção fundosImobiliarios
  "mercado": "BOV",        // Ágora source
  "fator_cotacao": "1"     // BTG QuotingFactor
}
```

## Posição — NÃO entra (snapshot)
quantidade · **preço médio** (custo do cliente) · **último preço** (mercado, diário) ·
valor atual · `valueAppreciation` · bloqueado/garantia.

## Riqueza por fonte
- **BTG = melhor**: `IsFII` (verdade), **setor B3**, ISIN, `EquityTypeDescription`, fator de cotação.
- **XP**: ticker + nome; a seção `fundosImobiliarios` já marca FII.
- **Ágora**: ticker + nome + `secutiryType` + mercado. Sem setor/ISIN/FII.

## Referência — nomes de campo por fonte
- **XP**: `acoes[]` e `fundosImobiliarios[]` → `codigoAtivo, nomeEmpresaEmitente`.
- **BTG** (`Equities.StockPositions[]`): `Ticker, Description, ISINCode, SecurityCode, SectorCode,
  SectorDescription, IsFII, EquityTypeDescription, Issuer, IssuerCge, QuotingFactor`.
- **Ágora** (`consolidatedPosition[]`): `symbol, instrumentName, secutiryType, source, companyName`.

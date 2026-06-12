# De-para: CLASSE_ANBIMA (CVM) → Classe Avere

## As 15 classes oficiais Avere (únicas aceitas — grafia exata)

1. `RF - Pós-fixado`
2. `RF - Inflação`
3. `RF - Prefixado`
4. `Multimercado`
5. `FII-FIAgro`
6. `Renda Variável`
7. `COE`
8. `Alternativos`
9. `Internacional - Pós-fixado`
10. `Internacional - RF - Inflação`
11. `Internacional - RF - Prefixado`
12. `Internacional - Multimercado`
13. `Internacional - Renda Variável`
14. `Caixa`
15. `Conta Corrente`

Se o curador escrever variação ("RF pós", "multi", "inter RV"), confirme a grafia
oficial antes de gerar SQL.

## Regras de sugestão (mesmas do script)

| CLASSE_ANBIMA contém | Sugestão | Confiança | Por quê |
|---|---|---|---|
| AÇÕES … | Renda Variável | **alta** | inequívoco |
| MULTIMERCADOS … (sem "exterior") | Multimercado | **alta** | inequívoco |
| MULTIMERCADOS … INVESTIMENTO NO EXTERIOR | Internacional - Multimercado | media | depende do % exterior real |
| RENDA FIXA SIMPLES / SOBERANO | RF - Pós-fixado | **alta** | Selic/soberano = pós por definição |
| RENDA FIXA … ÍNDICES / INDEXADO / IPCA | RF - Inflação | media | direção certa; confirmar benchmark |
| RENDA FIXA … DÍVIDA EXTERNA | Internacional - Pós-fixado | media | |
| RENDA FIXA … (demais) | RF - Pós-fixado | media | maioria dos fundos RF brasileiros é pós (CDI), mas há prefixados — curador confirma |
| CAMBIAL | Internacional - Renda Variável | media | discutível; casa decide |
| (vazio / FIDC / FIP / cripto / previdência) | — sem sugestão — | — | sem lastro: fica pendente |

## Sinais que mudam a leitura (mostrar na tabela)

- **`SIT` = CANCELADA**: fundo encerrado — a posição no sistema pode ser resíduo;
  vale conferir antes de classificar.
- **`ATIVO_CRED_PRIV` = S**: fundo compra crédito privado — não muda a classe, mas é
  informação de risco que o curador gosta de ver.
- **Liquidez D+** = `QT_DIA_CONVERSAO_COTA` + `QT_DIA_PAGTO_RESGATE` (atenção ao
  `TP_DIA_PAGTO_RESGATE`: dias ÚTEIS vs CORRIDOS).

## O que NUNCA fazer

- Sugerir classe por **nome** do fundo (princípio da casa: nome engana).
- Promover sugestão `media` a aprovada sem o OK explícito do curador.
- Inventar uma 16ª classe ou aceitar grafia divergente.

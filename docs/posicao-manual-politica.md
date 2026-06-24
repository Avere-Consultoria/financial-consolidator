# Política de entradas manuais — promoção com portões

Como o sistema trata posição vinda de **import manual** (PDF/Excel/imagem → IA → JSON →
`import-manual-position`). A fonte manual é a de **menor confiança** do sistema, então ela é
**não-destrutiva por construção**: pode aparecer pro cliente e *ler* o global, mas **nunca**
escreve sozinha na biblioteca/canônico global.

> Princípio: dado raso entra na visão do cliente, mas só vira "verdade global" quando um humano
> (master/consultor) confirma que há dados suficientes. **Promoção ao global é sempre manual,
> nunca automática.**

---

## As 3 camadas

### Camada 1 — Local (ilha)
**Quando:** falta identificador forte **ou** faltam os dados-gerais-por-classe completos.

- Vive **só** na linha de posição do cliente (`posicao_manual_ativos`).
- Aparece na **visão consolidada** com os dados rasos que a IA extraiu.
- Marcada **"manual / não verificado"** (origem `PDF_MANUAL`).
- **NÃO** toca `ativos_canonicos`, `biblioteca_ativos` nem `dicionario_ativos`.
- É autocontida: a Home renderiza pelos campos da própria linha (já tolera canônico nulo).

### Camada 2 — Vinculado (lê o global, não escreve)
**Quando:** tem **identificador forte e inequívoco** que casa com um canônico já existente.

- A posição **aponta** pro canônico rico e **herda** classe, taxa, benchmark, liquidez, vencimento.
- O **global manda**: o manual contribui só com **valor / quantidade / data**.
- **NUNCA** sobrescreve/rebaixa campo do canônico (sem `AUTO-CURA` destrutiva para origem manual).

### Camada 3 — Promover ao global
**Quando:** identificador forte **+** dados completos por classe **+** confirmação humana.

- Só o **master/consultor** promove, na fila de enriquecimento. **Nunca automático.**
- Aí sim semeia `biblioteca_ativos` / `ativos_canonicos` (vira referência reusável).

---

## Os dois portões

### Portão de *match* — "identificador forte e inequívoco"
| Identificador | Vale? | Observação |
|---|---|---|
| ISIN | ✅ | Único por papel. |
| CNPJ | ✅ **só p/ fundo** | O CNPJ é do próprio fundo (`INVESTMENT_FUND`). |
| Ticker | ✅ | Ação / FII / ETF listados. |
| Tesouro `sub_tipo + vencimento` | ✅ | Único no Tesouro Direto. (Ideal: derivar o ISIN p/ casar limpo com a API.) |
| CNPJ de emissor de CDB / debênture | ❌ | Compartilhado entre vários papéis → ambíguo. |
| Nome só | ❌ | Nunca. |

### Portão de *promoção* — "dados completos por classe"
"Completo" = preencheu os **campos obrigatórios do `bibliotecaSchema`** daquela classe.
Reaproveita o schema que já existe — não se inventa definição nova.

---

## O que muda no código

- `resolverOuCriarCanonico` passa a receber a **origem** (`PDF_MANUAL`). Para origem manual:
  - **Sem identificador forte** → retorna sem criar nada (Camada 1; posição fica local).
  - **Com identificador forte que casa** → **vincula** ao canônico existente, **sem** rodar o
    patch de `AUTO-CURA` (read-only sobre o global) → Camada 2.
  - **Nunca cria nem semeia** biblioteca/canônico automaticamente (Camada 3 é humana).
- `posicao_manual_ativos` carrega os campos rasos de exibição (nome, sub_tipo, classe, taxa
  display, vencimento, valor) p/ a Camada 1 renderizar sem canônico.
- Origem `PDF_MANUAL` carimbada na posição → badge "manual / não verificado" na UI.

---

## Fila de enriquecimento + mapa de alias + confirmação no fechamento

A Camada 3 (promover) e a durabilidade do enriquecimento se apoiam em três peças.

### Fila de enriquecimento (balcão, não portão)
- Aba nova no **Master Ativos** — "Pendências manuais".
- Fonte: `posicao_manual_ativos WHERE ativo_canonico_id IS NULL` (as ilhas da Camada 1),
  **deduplicada por assinatura** — o mesmo ativo raso aparece em N linhas; o master age **uma vez**
  e propaga.
- A ilha é um **estado de repouso válido**: a fila não cobra nem bloqueia cada ativo. É onde o
  master vai **quando quer** enriquecer.
- Duas ações:
  - **(A) Vincular** a um canônico existente (busca na biblioteca rica) → as linhas viram Camada 2.
  - **(B) Promover** (preenche os obrigatórios do `bibliotecaSchema` da classe + identificador real)
    → cria canônico novo e semeia a biblioteca. **Sempre humano.**
- **Quem:** começa só master; consultor depois.

### Mapa de alias (a memória — evita refazer todo mês)
Espelha o `mapa_classificacao`. Sem ele, um ativo de identidade fraca (fundo sem CNPJ, CDB sem
ISIN) volta pra Camada 1 a **cada** import e o master refaz o trabalho pra sempre.

- **Chave (assinatura):** `instituição + sub_tipo + nome normalizado` (per-instituição — o mesmo
  nome em bancos diferentes pode divergir).
- **Valor:** `ativo_canonico_id`.
- Gravado quando o master **vincula/promove** (ação humana confirmada).
- O resolver manual ganha um passo: se **não** casar por identificador forte, **consulta o alias
  por assinatura** → religa sozinho (Camada 2). É curadoria (último recurso, vetado por humano),
  não automatismo cego.

### Confirmação do consultor no fechamento (vigiado, sem furo)
A assinatura é por nome, e nome engana ("MAXI CRED" vs "MAXI CRED II", produto renomeado). Então
o religamento automático **não é cego** — precisa de um humano afirmando a continuidade. Mora no
**fechamento do mês** (ritual que o consultor já faz), não numa tela solta:

1. Import roda e **já vincula** pelo mapa (posição correta e visível na hora), marcada
   **"auto-vinculado · a confirmar"**.
2. No **fechamento**, lista os manuais religados: *"confirme que são os mesmos do mês passado"*.
3. Consultor dá **OK em lote** (ou inspeciona um a um) → vira **"confirmado · [consultor] · data"**
   (rastro de auditoria).
4. **O mês não fecha** com manual pendente de confirmação.
5. **Rejeição** ("não é o mesmo") → o ativo cai pra Camada 1 → o consultor vincula no certo → o
   **mapa se corrige** dali pra frente.

O "chato" só acontece **quando algo muda**: mês normal é um clique de "confirmar todos"; mês em que
o banco trocou o produto, o consultor pega o erro na hora. (Otimização possível: alias já confirmado
e idêntico entra como "auto-confirmado" sem ação; só exige clique quando é novo ou mudou.)

---

## Por que isso fecha os riscos
- **Downgrade cross-client:** impossível — manual nunca escreve campo-base global.
- **Gêmeo duplicado na biblioteca:** sem auto-escrita, não nasce twin raso.
- **Genéricos poluindo:** viram ilha local explícita e honesta, com caminho de saída (Camada 3).

Ver também: [import-manual-position.md](import-manual-position.md) (contrato do retorno).

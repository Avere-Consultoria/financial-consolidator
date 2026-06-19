import { classifyAvere, suggestLiquidezAvere } from './classifyAvere.ts'
import { normalizarSubTipo } from './normalizarSubTipo.ts'
import { formatarTaxa } from './formatarTaxa.ts'
import { normalizarIndexador, padronizarTaxa } from './indexador.ts'
import type { Institution } from './types.ts'

// ─────────────────────────────────────────────────────────────────────────────
// Resolução de ativo canônico
//
// Cada posição que entra no sistema precisa apontar para um `ativo_canonico_id`.
// Esse módulo faz três coisas em sequência:
//   1. Procura no dicionario_ativos por QUALQUER um dos identificadores
//      (ISIN, CNPJ, ticker, etc.). Se achar, reusa o canônico.
//   2. Se não achou, cria um novo `ativos_canonicos` com classificação
//      automática preliminar (Master refina depois).
//   3. Garante que existe uma linha em `dicionario_ativos` para a visão
//      institucional (instituicao_origem + codigo_identificador + tipo).
// ─────────────────────────────────────────────────────────────────────────────

export type TipoIdentificador = 'ISIN' | 'CNPJ' | 'TICKER' | 'CUSIP'

export interface Identificador {
  tipo:   TipoIdentificador
  codigo: string
}

/**
 * Dados curados sugeridos quando criamos um canônico novo.
 * O Master pode ajustar tudo depois — esses valores são "first draft".
 */
export interface CanonicoSugerido {
  nome_canonico:      string
  classe_avere:       string | null
  liquidez_avere:     string | null
  data_vencimento:    string | null
  taxa_canonica:      string | null
  taxa_formatada:     string | null
  benchmark_canonico: string | null
  sub_tipo_canonico:  string | null
  is_fii:             boolean
  is_coe:             boolean
}

/**
 * Visão institucional de um ativo — o que aparece em uma linha do
 * dicionario_ativos. Cada instituição preserva seus próprios "originais".
 */
export interface VisaoInstitucional {
  instituicao_origem:        Institution
  identificador_principal:   Identificador          // chave que indexa essa instituição
  nome_ativo:                string
  emissor_original:          string | null
  classe_original:           string | null
  liquidez_api_original:     string | null
  vencimento_api_original:   string | null
  index_rate:                string | null
}

/**
 * Procura ou cria o ativo canônico e garante a linha do dicionário institucional.
 * Retorna o `ativo_canonico_id` que deve ser usado em `posicao_*_ativos`.
 *
 * Em caso de erro, retorna null — o caller decide se quer gravar a posição
 * sem o link (vai ficar pendente para o Master resolver).
 */
export async function resolverOuCriarCanonico(
  supabase: any,
  identificadoresParaLookup: Identificador[],
  sugestao: CanonicoSugerido,
  visao: VisaoInstitucional,
  dadosBrutos?: any,                            // payload cru (genérico) da API → dicionario_ativos
  detalhesApi?: Record<string, any> | null,     // detalhes extraídos → semeia biblioteca_ativos
): Promise<string | null> {

  // ── 0. Sem identificadores → impossível resolver ────────────────────────
  if (identificadoresParaLookup.length === 0) return null

  const codigos = identificadoresParaLookup.map(i => i.codigo).filter(Boolean)
  if (codigos.length === 0) return null

  // ── 1. Procura canônico existente por qualquer identificador ────────────
  const { data: candidatos, error: errSearch } = await supabase
    .from('dicionario_ativos')
    .select('ativo_canonico_id')
    .in('codigo_identificador', codigos)
    .limit(1)

  if (errSearch) {
    console.error('canonico/search erro:', errSearch.message)
    return null
  }

  let ativoCanonicoId: string | null = candidatos?.[0]?.ativo_canonico_id ?? null

  // Biblioteca rica: identificador imutável → dados-base curados (vencem o derivado).
  // CNPJ normalizado para 14 dígitos; demais chaves em maiúsculas.
  const chaves = codigos.map((c) => {
    const digitos = String(c).replace(/\D/g, '')
    return digitos.length === 14 ? digitos : String(c).toUpperCase().trim()
  })
  const { data: hitBib } = await supabase
    .from('biblioteca_ativos')
    .select('chave, detalhes, classe_avere, benchmark, liquidez, taxa_formatada, sub_tipo')
    .in('chave', chaves)
    .limit(1)
  const bib = hitBib?.[0] ?? null

  // Precedência campo a campo: biblioteca curada > derivado da API.
  // A classe define a origem; o 'manual' do Master é preservado na auto-cura.
  const classeBib: string | null = bib?.classe_avere ?? null
  const classeFinal    = classeBib ?? sugestao.classe_avere
  const origemFinal    = classeBib ? 'biblioteca' : (classeFinal ? 'auto' : null)
  const benchmarkFinal = bib?.benchmark      ?? sugestao.benchmark_canonico
  const liquidezFinal  = bib?.liquidez       ?? sugestao.liquidez_avere
  const taxaFmtFinal   = bib?.taxa_formatada ?? sugestao.taxa_formatada
  const taxaCanonFinal = bib?.taxa_formatada ?? sugestao.taxa_canonica
  // Normaliza o subtipo da biblioteca também — um valor legado (ex.: 'FI') vira o
  // token padrão ('FUNDO') no reprocesso, sem precisar truncar a biblioteca.
  const subTipoFinal   = normalizarSubTipo(bib?.sub_tipo) ?? sugestao.sub_tipo_canonico

  // ── 2. Não achou → cria canônico novo ──────────────────────────────────
  if (!ativoCanonicoId) {
    const { data: novo, error: errCreate } = await supabase
      .from('ativos_canonicos')
      .insert({
        nome_canonico:        sugestao.nome_canonico,
        classe_avere:         classeFinal,
        origem_classificacao: origemFinal,
        liquidez_avere:       liquidezFinal,
        data_vencimento:      sugestao.data_vencimento,
        taxa_canonica:        taxaCanonFinal,
        taxa_formatada:       taxaFmtFinal,
        benchmark_canonico:   benchmarkFinal,
        sub_tipo_canonico:    subTipoFinal,
        is_fii:               sugestao.is_fii,
        is_coe:               sugestao.is_coe,
      })
      .select('id')
      .single()

    if (errCreate || !novo) {
      console.error('canonico/create erro:', errCreate?.message)
      return null
    }
    ativoCanonicoId = novo.id
  } else {
    // ── 2b. Já existe → AUTO-CURA. Reaplica a referência atual (biblioteca > API)
    //        em todos os campos-base. A CLASSE só NÃO é tocada quando a origem é
    //        'manual' (Master fixou à mão); 'biblioteca'/'mapa'/'auto'/null recomputam.
    const { data: atual } = await supabase
      .from('ativos_canonicos')
      .select('origem_classificacao, liquidez_avere')
      .eq('id', ativoCanonicoId)
      .maybeSingle()
    const origemAtual: string | null = atual?.origem_classificacao ?? null

    const patch: Record<string, any> = { is_fii: sugestao.is_fii, is_coe: sugestao.is_coe }
    if (subTipoFinal)   patch.sub_tipo_canonico  = subTipoFinal
    if (taxaCanonFinal) patch.taxa_canonica      = taxaCanonFinal
    if (taxaFmtFinal)   patch.taxa_formatada     = taxaFmtFinal
    if (benchmarkFinal) patch.benchmark_canonico = benchmarkFinal
    // Liquidez: preenche só quando está VAZIA — não sobrescreve o que o Master ajustou.
    if ((atual?.liquidez_avere == null || atual?.liquidez_avere === '')
        && liquidezFinal != null && liquidezFinal !== '')
      patch.liquidez_avere = liquidezFinal
    // Base (classe etc.) recomputa sempre, EXCETO quando o Master fixou à mão ('manual').
    // Inclui 'mapa'/'biblioteca'/'auto'/null → reaplica a referência atual (idempotente).
    if (origemAtual !== 'manual') {
      patch.classe_avere = classeFinal
      patch.origem_classificacao = origemFinal
    }
    await supabase.from('ativos_canonicos').update(patch).eq('id', ativoCanonicoId)
  }

  // ── 3. Garante linha do dicionario_ativos para essa visão institucional ─
  const { error: errUpsert } = await supabase
    .from('dicionario_ativos')
    .upsert({
      instituicao_origem:        visao.instituicao_origem,
      codigo_identificador:      visao.identificador_principal.codigo,
      tipo_identificador:        visao.identificador_principal.tipo,
      nome_ativo:                visao.nome_ativo,
      emissor_original:          visao.emissor_original,
      classe_original:           visao.classe_original,
      liquidez_api_original:     visao.liquidez_api_original,
      vencimento_api_original:   visao.vencimento_api_original,
      index_rate:                visao.index_rate,
      taxa_formatada:            sugestao.taxa_formatada,
      dados_brutos:              dadosBrutos ?? null,     // cru genérico da fonte
      ativo_canonico_id:         ativoCanonicoId,
    }, {
      onConflict: 'instituicao_origem,codigo_identificador,tipo_identificador',
      ignoreDuplicates: false,    // atualiza a visão se ela já existir
    })

  if (errUpsert) {
    console.error('canonico/upsert dicionario erro:', errUpsert.message)
    // mesmo com erro no dicionário, retorna o canônico pra não bloquear posição
  }

  // ── 4. Semeia a biblioteca com os detalhes da API — auto-preenchimento do editor.
  //       Só quando ainda NÃO há detalhes (não pisa na curadoria do Master).
  if (detalhesApi && Object.keys(detalhesApi).length > 0) {
    const jaTemDetalhes = bib?.detalhes && Object.keys(bib.detalhes).length > 0
    if (!jaTemDetalhes) {
      const chaveBib = bib?.chave ?? chaves[0]
      await supabase.from('biblioteca_ativos').upsert({
        chave:    chaveBib,
        sub_tipo: sugestao.sub_tipo_canonico ?? null,
        nome_ref: sugestao.nome_canonico ?? null,
        detalhes: detalhesApi,
      }, { onConflict: 'chave' })
    }
  }

  return ativoCanonicoId
}


// ─────────────────────────────────────────────────────────────────────────────
// Helpers de detecção (usados pelos Edge Functions ao montar sugestão)
// ─────────────────────────────────────────────────────────────────────────────

const REGEX_FII = /\b(FII|FIAGRO|FI-?AGRO|IMOBILI[ÁA]RIO)\b/i

export function detectarIsFii(nome: string | null | undefined, hint?: boolean): boolean {
  if (hint === true) return true
  if (!nome) return false
  return REGEX_FII.test(nome)
}

export function detectarIsCoe(nome: string | null | undefined, subTipo: string | null | undefined): boolean {
  if (subTipo && /COE/i.test(subTipo)) return true
  if (nome && /\bCOE\b/i.test(nome)) return true
  return false
}


// ─────────────────────────────────────────────────────────────────────────────
// Wrapper: aplica classificação Avere preliminar para criar canônico novo
// ─────────────────────────────────────────────────────────────────────────────

export function sugerirCanonicoComClassificacao(
  asset: any,
  institution: Institution,
  override?: Partial<CanonicoSugerido>,
): CanonicoSugerido {
  const isFiiApi = asset.extra?.isFII === true || asset.extra?.isFII === 'true'
  const isFii = detectarIsFii(asset.name, isFiiApi)
  const isCoe = detectarIsCoe(asset.name, asset.extra?.productType ?? asset.extra?.bondType)

  // Normaliza a grafia do indexador na entrada (ex.: XP grava "IPC-A" → "IPCA"),
  // num único ponto, para que select do Master e taxa de saída fiquem padronizados.
  const benchMark = normalizarIndexador(asset.benchMark)
  const indexRate = normalizarIndexador(asset.indexRate)
  const bondRate  = normalizarIndexador(asset.extra?.bondRate)

  // Classificação só aceita a flag explícita da API — nome não decide classe
  // (princípio "classificação por certeza"; o is_fii por nome segue só como
  // metadado de exibição).
  const classe = classifyAvere({
    assetClass:   asset.assetClass,
    institution,
    maturityDate: asset.maturityDate ?? null,
    isLiquidity:  asset.isLiquidity  ?? false,
    benchMark:    benchMark          ?? bondRate ?? null,
    indexRate:    indexRate          ?? null,
    bondType:     asset.extra?.bondType ?? null,
    subTipo:      asset.extra?.subTipo ?? null,   // XP entrega o tipo do título em extra.subTipo (LFT/NTN-B/CDB…)
    name:         asset.name         ?? null,
    isFII:        isFiiApi,
    productType:  asset.extra?.productType ?? null,
  })

  const liquidez = suggestLiquidezAvere({
    assetClass:    asset.assetClass,
    institution,
    maturityDate:  asset.maturityDate         ?? null,
    isLiquidity:   asset.isLiquidity          ?? false,
    fundLiquidity: asset.extra?.fundLiquidity ?? null,
  })

  // Taxa pronta p/ exibição (TAXA + CUPOM), igual à Home. Best-effort: usa os
  // campos padrão do UnifiedAsset; onde não há cupom, cai no índice (sem regressão).
  const rentabilidade = indexRate ?? benchMark ?? bondRate ?? null
  const taxaFormatada = formatarTaxa(
    rentabilidade,
    benchMark ?? indexRate ?? null,
    asset.extra?.yieldAvg ?? null,
  ) ?? (benchMark ?? indexRate ?? bondRate ?? null)

  return {
    nome_canonico:      asset.name || 'Ativo sem nome',
    classe_avere:       classe ?? null,
    liquidez_avere:     liquidez ?? null,
    data_vencimento:    asset.maturityDate ? String(asset.maturityDate).split('T')[0] : null,
    taxa_canonica:      padronizarTaxa(benchMark ?? bondRate ?? null),
    taxa_formatada:     padronizarTaxa(taxaFormatada),
    benchmark_canonico: benchMark ?? indexRate ?? null,
    sub_tipo_canonico:  null,
    is_fii:             isFii,
    is_coe:             isCoe,
    ...override,
  }
}

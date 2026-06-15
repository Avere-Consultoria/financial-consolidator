import { classifyAvere, suggestLiquidezAvere } from './classifyAvere.ts'
import { normalizarSubTipo } from './normalizarSubTipo.ts'
import { formatarTaxa } from './formatarTaxa.ts'
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

  // Mapa curado: identificador imutável → classe com certeza.
  // CNPJ normalizado para 14 dígitos; demais chaves em maiúsculas.
  const chaves = codigos.map((c) => {
    const digitos = String(c).replace(/\D/g, '')
    return digitos.length === 14 ? digitos : String(c).toUpperCase().trim()
  })
  const { data: hitMapa } = await supabase
    .from('mapa_classificacao')
    .select('classe_avere')
    .in('chave', chaves)
    .limit(1)
  const classeMapa: string | null = hitMapa?.[0]?.classe_avere ?? null
  const classeFinal = classeMapa ?? sugestao.classe_avere
  const origemFinal = classeMapa ? 'mapa' : (classeFinal ? 'auto' : null)

  // ── 2. Não achou → cria canônico novo ──────────────────────────────────
  if (!ativoCanonicoId) {
    const { data: novo, error: errCreate } = await supabase
      .from('ativos_canonicos')
      .insert({
        nome_canonico:        sugestao.nome_canonico,
        classe_avere:         classeFinal,
        origem_classificacao: origemFinal,
        liquidez_avere:       sugestao.liquidez_avere,
        data_vencimento:      sugestao.data_vencimento,
        taxa_canonica:        sugestao.taxa_canonica,
        taxa_formatada:       sugestao.taxa_formatada,
        benchmark_canonico:   sugestao.benchmark_canonico,
        sub_tipo_canonico:    sugestao.sub_tipo_canonico,
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
    // ── 2b. Já existe → AUTO-CURA. Dados derivados da API (subtipo/taxa/
    //        benchmark/flags) são sempre atualizados (nunca editados à mão).
    //        A CLASSE só é recomputada quando a origem é 'auto'/vazia — preserva
    //        o que o Master ajustou ('manual') e o mapa curado ('mapa').
    const { data: atual } = await supabase
      .from('ativos_canonicos')
      .select('origem_classificacao')
      .eq('id', ativoCanonicoId)
      .maybeSingle()
    const origemAtual: string | null = atual?.origem_classificacao ?? null

    const patch: Record<string, any> = { is_fii: sugestao.is_fii, is_coe: sugestao.is_coe }
    if (sugestao.sub_tipo_canonico)  patch.sub_tipo_canonico  = sugestao.sub_tipo_canonico
    if (sugestao.taxa_canonica)      patch.taxa_canonica      = sugestao.taxa_canonica
    if (sugestao.taxa_formatada)     patch.taxa_formatada     = sugestao.taxa_formatada
    if (sugestao.benchmark_canonico) patch.benchmark_canonico = sugestao.benchmark_canonico
    if (origemAtual === null || origemAtual === 'auto') {
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
      ativo_canonico_id:         ativoCanonicoId,
    }, {
      onConflict: 'instituicao_origem,codigo_identificador,tipo_identificador',
      ignoreDuplicates: false,    // atualiza a visão se ela já existir
    })

  if (errUpsert) {
    console.error('canonico/upsert dicionario erro:', errUpsert.message)
    // mesmo com erro no dicionário, retorna o canônico pra não bloquear posição
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

  // Classificação só aceita a flag explícita da API — nome não decide classe
  // (princípio "classificação por certeza"; o is_fii por nome segue só como
  // metadado de exibição).
  const classe = classifyAvere({
    assetClass:   asset.assetClass,
    institution,
    maturityDate: asset.maturityDate ?? null,
    isLiquidity:  asset.isLiquidity  ?? false,
    benchMark:    asset.benchMark    ?? asset.extra?.bondRate ?? null,
    indexRate:    asset.indexRate    ?? null,
    bondType:     asset.extra?.bondType ?? null,
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
  const rentabilidade = asset.indexRate ?? asset.benchMark ?? asset.extra?.bondRate ?? null
  const taxaFormatada = formatarTaxa(
    rentabilidade,
    asset.benchMark ?? asset.indexRate ?? null,
    asset.extra?.yieldAvg ?? null,
  ) ?? (asset.benchMark ?? asset.indexRate ?? asset.extra?.bondRate ?? null)

  return {
    nome_canonico:      asset.name || 'Ativo sem nome',
    classe_avere:       classe ?? null,
    liquidez_avere:     liquidez ?? null,
    data_vencimento:    asset.maturityDate ? String(asset.maturityDate).split('T')[0] : null,
    taxa_canonica:      asset.benchMark ?? asset.extra?.bondRate ?? null,
    taxa_formatada:     taxaFormatada,
    benchmark_canonico: asset.benchMark ?? asset.indexRate ?? null,
    sub_tipo_canonico:  null,
    is_fii:             isFii,
    is_coe:             isCoe,
    ...override,
  }
}

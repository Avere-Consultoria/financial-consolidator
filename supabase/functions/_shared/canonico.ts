import { classifyAvere, suggestLiquidezAvere } from './classifyAvere.ts'
import { normalizarSubTipo } from './normalizarSubTipo.ts'
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

  // ── 2. Não achou → cria canônico novo ──────────────────────────────────
  if (!ativoCanonicoId) {
    const { data: novo, error: errCreate } = await supabase
      .from('ativos_canonicos')
      .insert({
        nome_canonico:      sugestao.nome_canonico,
        classe_avere:       sugestao.classe_avere,
        liquidez_avere:     sugestao.liquidez_avere,
        data_vencimento:    sugestao.data_vencimento,
        taxa_canonica:      sugestao.taxa_canonica,
        benchmark_canonico: sugestao.benchmark_canonico,
        sub_tipo_canonico:  sugestao.sub_tipo_canonico,
        is_fii:             sugestao.is_fii,
        is_coe:             sugestao.is_coe,
      })
      .select('id')
      .single()

    if (errCreate || !novo) {
      console.error('canonico/create erro:', errCreate?.message)
      return null
    }
    ativoCanonicoId = novo.id
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
  const isFii = detectarIsFii(asset.name, asset.extra?.isFII === true || asset.extra?.isFII === 'true')
  const isCoe = detectarIsCoe(asset.name, asset.extra?.productType ?? asset.extra?.bondType)

  const classe = classifyAvere({
    assetClass:   asset.assetClass,
    institution,
    maturityDate: asset.maturityDate ?? null,
    isLiquidity:  asset.isLiquidity  ?? false,
    benchMark:    asset.benchMark    ?? asset.extra?.bondRate ?? null,
    indexRate:    asset.indexRate    ?? null,
    bondType:     asset.extra?.bondType ?? null,
    name:         asset.name         ?? null,
    isFII:        isFii,
    productType:  asset.extra?.productType ?? null,
  })

  const liquidez = suggestLiquidezAvere({
    assetClass:    asset.assetClass,
    institution,
    maturityDate:  asset.maturityDate         ?? null,
    isLiquidity:   asset.isLiquidity          ?? false,
    fundLiquidity: asset.extra?.fundLiquidity ?? null,
  })

  return {
    nome_canonico:      asset.name || 'Ativo sem nome',
    classe_avere:       classe ?? null,
    liquidez_avere:     liquidez ?? null,
    data_vencimento:    asset.maturityDate ? String(asset.maturityDate).split('T')[0] : null,
    taxa_canonica:      asset.benchMark ?? asset.extra?.bondRate ?? null,
    benchmark_canonico: asset.benchMark ?? asset.indexRate ?? null,
    sub_tipo_canonico:  null,
    is_fii:             isFii,
    is_coe:             isCoe,
    ...override,
  }
}

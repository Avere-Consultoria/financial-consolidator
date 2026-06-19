// ─────────────────────────────────────────────────────────────────────────────
// Extrai os campos genéricos (detalhes) do item CRU da API → biblioteca_ativos.detalhes.
// Por fonte e por grupo de subtipo, conforme docs/biblioteca-ativos/*.md.
// É o que faz os campos do editor nascerem PRÉ-PREENCHIDOS (em vez de vazios).
// ─────────────────────────────────────────────────────────────────────────────

type Grupo = 'RF' | 'FUNDO' | 'RV' | 'COE'

const SUBTIPO_GRUPO: Record<string, Grupo> = {
  CDB: 'RF', LCI: 'RF', LCA: 'RF', CRA: 'RF', CRI: 'RF', DEB: 'RF', 'DEBÊNTURE': 'RF',
  CDCA: 'RF', LF: 'RF', LFT: 'RF', LTN: 'RF', 'NTN-B': 'RF', 'NTN-F': 'RF', NTNB: 'RF',
  NTNF: 'RF', LCD: 'RF', RDB: 'RF', LIG: 'RF',
  FUNDO: 'FUNDO', FI: 'FUNDO',
  'AÇÃO': 'RV', ACAO: 'RV', ETF: 'RV', FII: 'RV',
  COE: 'COE',
}

// ── helpers ──────────────────────────────────────────────────────────────────
const soData = (v: any) => (v ? String(v).split('T')[0] : null)
const juntar = (...vs: any[]) => vs.filter(Boolean).join(' · ') || null
const num    = (v: any) => (v === null || v === undefined || v === '' ? null : Number(v))
const boolStr = (v: any) => (v === true || v === 'true' ? true : v === false || v === 'false' ? false : null)
const parsePctIndex = (s: any) => {           // "102.5% CDI" → 102.5 ; "PRE" → null
  if (!s) return null
  const m = String(s).match(/(\d+(?:[.,]\d+)?)\s*%/)
  return m ? Number(m[1].replace(',', '.')) : null
}
const mapTipoAtivo = (t: any) => {
  const s = String(t || '').toUpperCase()
  if (s.includes('PUBL')) return 'Público'
  if (s.includes('PRIV') || s.includes('CREDIT') || s.includes('FUNDED')) return 'Privado'
  return t || null
}
const limpar = (o: Record<string, any>): Record<string, any> => {
  const r: Record<string, any> = {}
  for (const [k, v] of Object.entries(o)) if (v !== null && v !== undefined && v !== '') r[k] = v
  return r
}

// ── mapas por fonte × grupo (lêem o item CRU) ────────────────────────────────
const MAPAS: Record<string, Partial<Record<Grupo, (it: any) => Record<string, any>>>> = {
  XP: {
    RF: (it) => ({
      percentual_indexador: it.percentualDoIndexador,
      spread:               it.taxa,
      tipo_ativo:           mapTipoAtivo(it.tipoDeAtivo),
      rating:               juntar(it.descricaoRatingAgencia, it.nomeAgenciaRating),
      custodiante:          it.custodiante,
      periodicidade_juros:  it.descricaoJuros,
      carencia:             soData(it.dataCarencia),
    }),
    FUNDO: (it) => ({
      periodo_cotizacao:  it.periodoCotizacaoResgate,
      periodo_liquidacao: it.periodoLiquidacaoResgate,
    }),
    COE: (it) => ({
      rating:   juntar(it.descricaoRatingAgencia, it.nomeAgenciaRating),
      carencia: soData(it.dataCarencia),
    }),
  },
  BTG: {
    RF: (it) => ({
      percentual_indexador: parsePctIndex(it.ReferenceIndexValue),
      spread:               num(it.Yield),
      tipo_ativo:           mapTipoAtivo(it.IssuerType),
      isento_ir:            boolStr(it.TaxFree),
      projecao_inflacao:    it.Projection,
      lag_indexacao:        it.Lag,
      inadimplencia:        boolStr(it.Default),
      compromissada:        boolStr(it.IsRepo),
      data_emissao:         soData(it.IssueDate),
    }),
    FUNDO: (it) => {
      const f = it.Fund ?? it
      return {
        gestor:   f.ManagerName,
        tipo_cvm: num(f.TipoCvm),
        entidade: f.EntityType === 'C' ? 'Fundo (C)' : f.EntityType === 'S' ? 'Classe/Subclasse (S)' : null,
      }
    },
    RV: (it) => ({
      setor:         it.SectorDescription,
      tipo_papel:    it.EquityTypeDescription,
      fator_cotacao: it.QuotingFactor,
    }),
    COE: (it) => ({
      indice_subjacente: it.ReferenceIndexName,
    }),
  },
  AGORA: {
    RF: (it) => ({
      percentual_indexador: it.indexerPercentage,
      spread:               it.preTaxPercentage,
      isento_ir:            /isento/i.test(String(it.bondTaxDescription || '')) ? true : null,
      resgate_antecipado:   it.redeemType || null,
    }),
    FUNDO: (it) => ({
      aberto_aplicacao: boolStr(it.openForApplication),
      aberto_resgate:   boolStr(it.openForRescue),
    }),
    RV: (it) => ({
      tipo_papel: it.secutiryType,
      mercado:    it.source,
    }),
    COE: (it) => ({
      estrategia:        it.cdStrategy,
      indice_subjacente: it.nmIndex,
      descricao:         it.description,
      status:            it.dsStatus || it.status,
      carencia:          soData(it.lackTime),
    }),
  },
}

export function extrairDetalhes(
  institution: string,
  subTipo: string | null | undefined,
  raw: any,
): Record<string, any> {
  if (!raw) return {}
  const grupo = SUBTIPO_GRUPO[(subTipo || '').toUpperCase().trim()]
  const fn = grupo ? MAPAS[institution]?.[grupo] : undefined
  return fn ? limpar(fn(raw)) : {}
}

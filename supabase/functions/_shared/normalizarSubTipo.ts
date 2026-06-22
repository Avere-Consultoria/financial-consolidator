// ─────────────────────────────────────────────────────────────────────────────
// Normalização de sub_tipo para siglas padrão (BTG-style)
//
// Cada instituição retorna o "sub_tipo" de forma diferente:
//   BTG    → siglas curtas: "NTN-B", "CRA", "LF", "CDB"
//   XP     → similar a BTG (geralmente sigla)
//   Avenue → productType próprio ("Bonds", "Stocks")
//   Ágora  → nome descritivo: "CERTIFICADO DE DEPOSITO BANCARIO"
//
// Este helper traduz o nome longo para sigla. Entradas não mapeadas
// passam direto (preservam o original — fica visível pra mapear depois).
// ─────────────────────────────────────────────────────────────────────────────

const MAPA: Record<string, string> = {
  // ── Renda fixa privada ────────────────────────────────────────────────────
  'CERTIFICADO DE DEPOSITO BANCARIO':         'CDB',
  'CERTIFICADO DE DEPÓSITO BANCÁRIO':         'CDB',
  'CDB':                                      'CDB',

  'LETRA FINANCEIRA':                         'LF',
  'LETRA FINANCEIRA SUBORDINADA':             'LF',
  'LFSN':                                     'LF',
  'LFSC':                                     'LF',
  'LF':                                       'LF',

  'LETRA DE CREDITO IMOBILIARIO':             'LCI',
  'LETRA DE CRÉDITO IMOBILIÁRIO':             'LCI',
  'LCI':                                      'LCI',

  'LETRA DE CREDITO DO AGRONEGOCIO':          'LCA',
  'LETRA DE CRÉDITO DO AGRONEGÓCIO':          'LCA',
  'LETRA DE CREDITO AGRICOLA':                'LCA',
  'LETRA DE CRÉDITO AGRÍCOLA':                'LCA',
  'LCA PRE':                                  'LCA',
  'LCA':                                      'LCA',

  'LETRA DE CREDITO DO DESENVOLVIMENTO':      'LCD',
  'LETRA DE CRÉDITO DO DESENVOLVIMENTO':      'LCD',
  'LCD':                                      'LCD',

  'LETRA IMOBILIARIA GARANTIDA':              'LIG',
  'LETRA IMOBILIÁRIA GARANTIDA':              'LIG',
  'LIG':                                      'LIG',

  'CERTIFICADO DE RECEBIVEIS DO AGRONEGOCIO': 'CRA',
  'CERTIFICADO DE RECEBÍVEIS DO AGRONEGÓCIO': 'CRA',
  'CRA':                                      'CRA',

  'CERTIFICADO DE RECEBIVEIS IMOBILIARIOS':   'CRI',
  'CERTIFICADO DE RECEBÍVEIS IMOBILIÁRIOS':   'CRI',
  'CRI':                                      'CRI',

  'DEBENTURE':                                'DEB',
  'DEBÊNTURE':                                'DEB',
  'DEBENTURES':                               'DEB',
  'DEBÊNTURES':                               'DEB',
  'DEB':                                      'DEB',

  // ── Tesouro Direto ────────────────────────────────────────────────────────
  'NTN-B':                                    'NTNB',
  'NTN-B PRINC':                              'NTNB',
  'NTNB PRINC':                               'NTNB',
  'NTN-B PRINCIPAL':                          'NTNB',
  'NTN-B COM JUROS SEMESTRAL':                'NTNB',
  'NTNB':                                     'NTNB',

  'NTN-F':                                    'NTNF',
  'NTN-F COM JUROS SEMESTRAL':                'NTNF',
  'NTNF':                                     'NTNF',

  'NTN-C':                                    'NTNC',
  'NTNC':                                     'NTNC',

  'LTN':                                      'LTN',
  'TESOURO PREFIXADO':                        'LTN',

  'LFT':                                      'LFT',
  'TESOURO SELIC':                            'LFT',

  'TESOURO IPCA':                             'NTNB',
  'TESOURO IPCA+':                            'NTNB',

  // ── Variações com qualificador embutido ───────────────────────────────────
  'CRA PREFIXADO':                            'CRA',
  'CRA POS-FIXADO':                           'CRA',
  'CRA PÓS-FIXADO':                           'CRA',
  'CRI PREFIXADO':                            'CRI',
  'OPERACAO COMPROMISSADA':                   'COMPROMISSADA',
  'OPERAÇÃO COMPROMISSADA':                   'COMPROMISSADA',
  'COMPROMISSADA':                            'COMPROMISSADA',

  // ── Fundos: token padrão do sistema é FUNDO (FI/VIS/FND são aliases) ───────
  'FI':                                       'FUNDO',
  'VIS':                                      'FUNDO',   // Ágora (ex.: "FI BRAD BINC")
  'FND':                                      'FUNDO',   // XP (ex.: "FND CONSIGNADO INSS")
  'FUNDO':                                    'FUNDO',
}

/**
 * Normaliza sub_tipo para sigla padrão.
 * Retorna o input original se não estiver mapeado (para facilitar identificação).
 */
export function normalizarSubTipo(raw: string | null | undefined): string | null {
  if (!raw) return null
  const key = raw.trim().toUpperCase()
  if (!key) return null
  // Compromissadas vêm com o lastro embutido no código (ex.: "Comp*CRI-12F0036335")
  // — o que importa como família é ser compromissada, não o lastro.
  if (key.startsWith('COMP*')) return 'COMPROMISSADA'
  return MAPA[key] ?? raw.trim()
}

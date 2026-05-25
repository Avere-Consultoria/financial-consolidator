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
  'LF':                                       'LF',

  'LETRA DE CREDITO IMOBILIARIO':             'LCI',
  'LETRA DE CRÉDITO IMOBILIÁRIO':             'LCI',
  'LCI':                                      'LCI',

  'LETRA DE CREDITO DO AGRONEGOCIO':          'LCA',
  'LETRA DE CRÉDITO DO AGRONEGÓCIO':          'LCA',
  'LCA':                                      'LCA',

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
}

/**
 * Normaliza sub_tipo para sigla padrão.
 * Retorna o input original se não estiver mapeado (para facilitar identificação).
 */
export function normalizarSubTipo(raw: string | null | undefined): string | null {
  if (!raw) return null
  const key = raw.trim().toUpperCase()
  if (!key) return null
  return MAPA[key] ?? raw.trim()
}

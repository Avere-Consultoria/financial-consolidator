// ─────────────────────────────────────────────────────────────────────────────
// Helpers de data — interpretam vários formatos que os connectors entregam
//
// Formatos aceitos pelos parsers:
//   - ISO "YYYY-MM-DD" ou "YYYY-MM-DDTHH:mm:ss..."
//   - "YYYYMMDD" (Ágora ocasionalmente)
//   - "DD/MM/YYYY" (BR)
//   - Number (timestamp em ms ou Date)
// ─────────────────────────────────────────────────────────────────────────────

/** Timestamp em ms a partir de input em vários formatos. null se inválido. */
export function parseDataFlexivel(input: string | number | Date | null | undefined): number | null {
  if (input == null || input === '') return null

  if (input instanceof Date) {
    const t = input.getTime()
    return isNaN(t) ? null : t
  }

  if (typeof input === 'number') {
    const t = new Date(input).getTime()
    return isNaN(t) ? null : t
  }

  const s = String(input).trim()
  if (!s) return null

  // ISO "YYYY-MM-DD" ou "YYYY-MM-DDTHH:mm:ss..."
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const t = new Date(s).getTime()
    return isNaN(t) ? null : t
  }

  // "YYYYMMDD" (8 dígitos sem separador)
  if (/^\d{8}$/.test(s)) {
    const iso = `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`
    const t = new Date(iso).getTime()
    return isNaN(t) ? null : t
  }

  // "DD/MM/YYYY" (BR)
  const brMatch = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (brMatch) {
    const iso = `${brMatch[3]}-${brMatch[2]}-${brMatch[1]}`
    const t = new Date(iso).getTime()
    return isNaN(t) ? null : t
  }

  // Fallback: parse direto (cobre "01 Jan 2027" etc.)
  const t = new Date(s).getTime()
  return isNaN(t) ? null : t
}

/** Converte input em "YYYY-MM-DD". Retorna null se inválido. */
export function toDateOnly(input: string | number | Date | null | undefined): string | null {
  const t = parseDataFlexivel(input)
  if (t == null) return null
  return new Date(t).toISOString().split('T')[0]
}

/** Hoje em "YYYY-MM-DD" (UTC). */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

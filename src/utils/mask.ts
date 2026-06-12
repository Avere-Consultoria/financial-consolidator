// ─────────────────────────────────────────────────────────────────────────────
// mask — mascaramento de PII para logs (LGPD).
// Identificadores nunca vão inteiros pro log: primeiros 3 + últimos 2 dígitos.
// Ex.: 12345678901 → "123******01" | conta 4587 → "45**"
// ─────────────────────────────────────────────────────────────────────────────

export function maskDoc(valor: string | null | undefined): string {
  const v = String(valor ?? '').replace(/\D/g, '');
  if (!v) return '(vazio)';
  if (v.length <= 4) return v[0] + '*'.repeat(v.length - 1);
  return v.slice(0, 3) + '*'.repeat(v.length - 5) + v.slice(-2);
}

// Mascara documentos que aparecem dentro de uma URL (path/query)
export function maskUrl(url: string): string {
  return url.replace(/\d{8,14}/g, (m) => maskDoc(m));
}

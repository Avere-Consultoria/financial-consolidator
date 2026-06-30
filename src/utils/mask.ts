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

// Extrai uma mensagem CURTA e segura de um err.response.data p/ log.
// Nunca devolve o corpo cru: se for objeto, pega só um campo de mensagem
// conhecido; se for string/HTML (pode conter conteúdo sensível), não loga.
export function safeErrData(data: unknown): string | undefined {
  if (data == null) return undefined;
  if (typeof data === 'object') {
    const d = data as Record<string, any>;
    const msg = d.message ?? d.error_description ?? d.error ?? d.mensagem;
    return typeof msg === 'string' ? msg.slice(0, 200) : undefined;
  }
  return undefined;
}

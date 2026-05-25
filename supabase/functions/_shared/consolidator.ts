// ─────────────────────────────────────────────────────────────────────────────
// Wrapper para chamadas ao Consolidador (Railway)
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_TIMEOUT_MS = 30_000

export function getConsolidatorUrl(): string {
  return Deno.env.get('CONSOLIDATOR_URL') ?? 'http://localhost:3333'
}

export class ConsolidatorError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/**
 * Chama o Consolidador com timeout e tratamento de erro padronizados.
 * - Retorna o JSON parseado em caso de sucesso.
 * - Lança ConsolidatorError com status apropriado em falha (502 default, 504 timeout).
 */
export async function fetchConsolidator(
  path: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<any> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init
  const url = `${getConsolidatorUrl()}${path}`

  let res: Response
  try {
    res = await fetch(url, {
      ...rest,
      headers: { 'Content-Type': 'application/json', ...(rest.headers ?? {}) },
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (err: unknown) {
    const isAbort = err instanceof DOMException && err.name === 'TimeoutError'
    throw new ConsolidatorError(
      isAbort ? 'Tempo esgotado ao chamar o Consolidador' : 'Falha de rede ao chamar o Consolidador',
      isAbort ? 504 : 502
    )
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new ConsolidatorError(
      body?.error?.message ?? `Erro no Consolidador: status ${res.status}`,
      res.status
    )
  }

  return await res.json()
}

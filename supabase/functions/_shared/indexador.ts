// ─────────────────────────────────────────────────────────────────────────────
// Normalização de grafia do indexador para o token canônico do sistema (o que o
// select do Master usa: IPCA, IGP-M, CDI, SELIC, PRÉ, TR, DÓLAR).
// Ex.: a XP grava "IPC-A"; nós usamos "IPCA". Aplicado na ingestão (resolver
// canônico) para que select e taxa de saída fiquem padronizados.
// Acrescentar um alias = uma linha aqui.
// ─────────────────────────────────────────────────────────────────────────────

const ALIASES: [RegExp, string][] = [
  [/\bIPC-A\b/gi, 'IPCA'],                       // XP grava com hífen
  [/\bIGP[\s.-]?M\b/gi, 'IGP-M'],                // "IGPM" / "IGP M" → "IGP-M" (não toca IGP-DI)
  [/\bPR[EÉ](?:[\s.-]?FIXAD[OA])?\b/gi, 'PRÉ'],  // PRE / PREFIXADO / PRÉ-FIXADO → PRÉ
  [/\bD[OÓ]LAR\b/gi, 'DÓLAR'],                   // "DOLAR" → "DÓLAR"
];

export function normalizarIndexador(raw: string | null | undefined): string | null {
  if (raw == null) return null;
  let s = String(raw);
  for (const [re, canon] of ALIASES) s = s.replace(re, canon);
  return s.trim() || null;
}

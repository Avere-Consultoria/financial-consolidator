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

// Padroniza a STRING de taxa vinda pré-formatada da API para o MESMO formato do
// Master (derivarTaxa): índice normalizado, espaço ao redor do "+", e taxa pura
// (prefixada, sem indexador) como "Y% a.a.". Sem isto, a Home mostrava a grafia
// crua da API ("IPCA +6,95%") e a curadoria mostrava "IPCA + 6,95%".
//   "IPC-A +6,95%" → "IPCA + 6,95%"
//   "+13,50%"      → "13,50% a.a."
//   "126,00% CDI"  → "126,00% CDI"  (inalterado)
export function padronizarTaxa(raw: string | null | undefined): string | null {
  const s = normalizarIndexador(raw);
  if (!s) return s;
  const pura = s.match(/^\+?\s*(\d+(?:[.,]\d+)?)\s*%(?:\s*a\.?\s*a\.?)?$/i);
  if (pura) return `${pura[1]}% a.a.`;
  return s.replace(/\s*\+\s*/g, ' + ');
}

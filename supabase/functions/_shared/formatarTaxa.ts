// ─────────────────────────────────────────────────────────────────────────────
// Taxa (padrão bancário BR) — port Deno do utilitário do frontend.
// Mantido idêntico ao src/utils/formatters.ts para que canônico e Home mostrem
// EXATAMENTE a mesma taxa (TAXA + CUPOM).
//   "100% IPCA" + 5,89% cupom → "IPCA + 5,89% a.a."
//   "110% CDI"  + 2% cupom   → "110% CDI + 2,00% a.a."
//   "PRE"       + 11,28%     → "11,28% a.a."
//   "CDI"       + 2%         → "CDI + 2,00% a.a."
// ─────────────────────────────────────────────────────────────────────────────
export function formatarTaxa(
    rentabilidade: string | null | undefined,
    benchmark: string | null | undefined,
    yieldAvg: string | number | null | undefined,
): string | null {
    const ya = (yieldAvg !== null && yieldAvg !== undefined && yieldAvg !== '')
        ? parseFloat(String(yieldAvg)) : null;
    const cupom = (ya !== null && !isNaN(ya) && ya > 0)
        ? `${ya.toFixed(2).replace('.', ',')}% a.a.` : null;
    const rent = rentabilidade?.trim() || null;

    if (rent) {
        const m = rent.match(/^(\d+(?:[.,]\d+)?)\s*%\s*(.+)$/);
        if (m) {
            const pct100 = parseFloat(m[1].replace(',', '.'));
            const indexNm = m[2].trim();
            if (Math.abs(pct100 - 100) < 0.01) {
                return cupom ? `${indexNm} + ${cupom}` : indexNm;
            }
            return cupom ? `${pct100}% ${indexNm} + ${cupom}` : `${pct100}% ${indexNm}`;
        }
        if (rent.includes('+')) return rent;
        if (rent === 'PRE' || !benchmark) return cupom ?? null;
        return cupom ? `${rent} + ${cupom}` : rent;
    }

    const bm = benchmark?.trim() || null;
    if (bm && cupom) return `${bm} + ${cupom}`;
    if (!bm && cupom) return cupom;
    return bm ?? null;
}

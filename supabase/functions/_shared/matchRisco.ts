// ─────────────────────────────────────────────────────────────────────────────
// Classificação de risco (2 mundos) por matching de nome/CNPJ.
//   • Bancário (FGC)  → conglomerado_id  (instituicoes_fgc + líderes)
//   • Crédito privado → emissor_id       (dicionario_emissores)
// Reutilizável pelo classificador e por conectores (pós-sync).
// ─────────────────────────────────────────────────────────────────────────────

export const SUBTIPOS_BANCARIO_FGC = new Set(['CDB', 'LCI', 'LCA', 'LF', 'LIG', 'RDB', 'LH', 'LC', 'LCD', 'DPGE', 'RDC']);
export const SUBTIPOS_CREDITO_PRIVADO = new Set(['DEB', 'CRA', 'CRI', 'FIDC', 'NP', 'NC', 'CCB', 'CCI']);

const STOPWORDS = new Set([
    's', 'sa', 'as', 'sas', 'ltda', 'me', 'eireli', 'cia', 'de', 'do', 'da', 'dos', 'das',
    'e', 'em', 'no', 'na', 'credito', 'financiamento', 'investimento', 'investimentos',
    'sociedade', 'multiplo', 'multipla', 'banco', 'bco',
]);

export function normalizeNome(s: string): string {
    return (s || '').toUpperCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^A-Z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
function tokens(s: string): Set<string> {
    return new Set(normalizeNome(s).split(' ').filter(t => t.length >= 2 && !STOPWORDS.has(t.toLowerCase())));
}
function similaridade(a: string, b: string): number {
    const ta = tokens(a), tb = tokens(b);
    if (ta.size === 0 || tb.size === 0) return 0;
    let inter = 0;
    for (const t of ta) if (tb.has(t)) inter++;
    return inter / Math.min(ta.size, tb.size);
}
export function cnpjRaiz(v: string | null | undefined): string {
    return (v ?? '').replace(/\D/g, '').slice(0, 8);
}

export interface EmissorCat { id: string; nome_fantasia: string; cnpj_raiz: string | null; }
export interface InstFgcCat { conglomerado_id: string; nome_instituicao: string; cnpj: string | null; }
export interface ConglomCat { id: string; nome_lider: string; }

export interface ResolverRisco {
    resolveEmissor(nome: string, cnpj?: string | null): string | null;
    resolveConglomerado(nome: string, cnpj?: string | null): string | null;
}

export function criarResolver(
    emissores: EmissorCat[],
    instituicoesFgc: InstFgcCat[],
    conglomerados: ConglomCat[],
    aliasesEmissor: { emissor_id: string; alias: string }[] = [],
): ResolverRisco {
    // ── Emissor (privado) ──
    const emiPorCnpj = new Map<string, string>();
    const emiPorNome = new Map<string, string>();
    const emiBusca: { norm: string; id: string }[] = [];
    const addEmissorNome = (nome: string, id: string) => {
        const norm = normalizeNome(nome);
        if (!norm) return;
        if (!emiPorNome.has(norm)) emiPorNome.set(norm, id);
        emiBusca.push({ norm, id });
    };
    emissores.forEach(e => {
        const raiz = cnpjRaiz(e.cnpj_raiz);
        if (raiz) emiPorCnpj.set(raiz, e.id);
        addEmissorNome(e.nome_fantasia, e.id);
    });
    // nomes alternativos (aliases) registrados pelo master
    aliasesEmissor.forEach(a => addEmissorNome(a.alias, a.emissor_id));

    // ── Conglomerado (bancário) ── inclui nomes de membros E líderes
    const congPorCnpj = new Map<string, string>();
    const congPorNome = new Map<string, string>();
    const congBusca: { norm: string; id: string }[] = [];
    const addCong = (nome: string, id: string) => {
        const norm = normalizeNome(nome);
        if (!norm) return;
        if (!congPorNome.has(norm)) congPorNome.set(norm, id);
        congBusca.push({ norm, id });
    };
    instituicoesFgc.forEach(i => {
        const raiz = cnpjRaiz(i.cnpj);
        if (raiz) congPorCnpj.set(raiz, i.conglomerado_id);
        addCong(i.nome_instituicao, i.conglomerado_id);
    });
    conglomerados.forEach(c => addCong(c.nome_lider, c.id));

    const fuzzyBest = (nome: string, lista: { norm: string; id: string }[]): string | null => {
        const norm = normalizeNome(nome);
        let best: string | null = null, score = 0;
        for (const c of lista) {
            const s = similaridade(norm, c.norm);
            if (s >= 0.6 && s > score) { score = s; best = c.id; }
        }
        return best;
    };

    return {
        resolveEmissor(nome, cnpj) {
            const raiz = cnpjRaiz(cnpj);
            if (raiz && emiPorCnpj.has(raiz)) return emiPorCnpj.get(raiz)!;
            const norm = normalizeNome(nome);
            if (norm && emiPorNome.has(norm)) return emiPorNome.get(norm)!;
            return fuzzyBest(nome, emiBusca);
        },
        resolveConglomerado(nome, cnpj) {
            const raiz = cnpjRaiz(cnpj);
            if (raiz && congPorCnpj.has(raiz)) return congPorCnpj.get(raiz)!;
            const norm = normalizeNome(nome);
            if (norm && congPorNome.has(norm)) return congPorNome.get(norm)!;
            return fuzzyBest(nome, congBusca);
        },
    };
}

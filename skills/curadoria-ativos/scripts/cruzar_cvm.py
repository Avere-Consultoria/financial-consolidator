# -*- coding: utf-8 -*-
"""
cruzar_cvm.py — Cruza ativos pendentes do Consolidador Avere com a CVM.

Uso:
    python cruzar_cvm.py --pendentes pendentes.csv [--out-dir .] [--cache-dir .cache_cvm]

Entrada (CSV, separador ; ou , — detectado): colunas ativo_canonico_id,
nome_canonico, cnpj (nomes flexíveis: aceita id/canonico_id, nome, cnpj/identificador).

Saída: <out-dir>/comparativo_cvm.csv com sugestão de classe Avere + confiança,
liquidez D+, gestor, taxas, flag crédito privado e situação do fundo.
"""
import argparse
import csv
import os
import re
import sys
import urllib.request

URLS = {
    "cad_fi.csv":     "https://dados.cvm.gov.br/dados/FI/CAD/DADOS/cad_fi.csv",
    "extrato_fi.csv": "https://dados.cvm.gov.br/dados/FI/DOC/EXTRATO/DADOS/extrato_fi.csv",
}

def so_digitos(s):
    return re.sub(r"\D", "", str(s or ""))

def baixar(cache_dir):
    os.makedirs(cache_dir, exist_ok=True)
    paths = {}
    for nome, url in URLS.items():
        p = os.path.join(cache_dir, nome)
        if not os.path.exists(p) or os.path.getsize(p) < 1_000_000:
            print(f"baixando {url} ...", flush=True)
            urllib.request.urlretrieve(url, p)
        paths[nome] = p
    return paths

# ── De-para CLASSE_ANBIMA -> (classe Avere, confianca) ───────────────────────
# alta  = mapeamento inequivoco | media = direcao certa, curador confirma
# None  = sem sugestao (FIDC/FIP/cripto/etc.) -> revisao manual
def depara_anbima(classe_anbima):
    c = (classe_anbima or "").strip().upper()
    if not c:
        return None, None
    if "AÇÕES" in c or "ACOES" in c:
        return "Renda Variável", "alta"
    if c.startswith("MULTIMERCADO"):
        if "EXTERIOR" in c:
            return "Internacional - Multimercado", "media"
        return "Multimercado", "alta"
    if "CAMBIAL" in c:
        return "Internacional - Renda Variável", "media"
    if c.startswith("RENDA FIXA"):
        if any(t in c for t in ("INFLA", "ÍNDICE", "INDICE", "IPCA", "INDEXADO")):
            return "RF - Inflação", "media"
        if "DÍVIDA EXTERNA" in c or "DIVIDA EXTERNA" in c:
            return "Internacional - Pós-fixado", "media"
        if "SIMPLES" in c or "SOBERANO" in c:
            return "RF - Pós-fixado", "alta"
        return "RF - Pós-fixado", "media"
    return None, None

def liquidez_dplus(conv, pgto):
    """D+ p/ receber o dinheiro = conversao da cota + pagamento do resgate."""
    def num(v):
        v = str(v or "").strip().replace(",", ".")
        if not v:
            return None
        try:
            return int(float(v))
        except ValueError:
            return None
    c, p = num(conv), num(pgto)
    if c is None and p is None:
        return ""
    return str((c or 0) + (p or 0))

def carregar_cvm(path, cnpj_col, preferir_ativo=False):
    """Indexa por CNPJ (14 dígitos). Se houver duplicata, prefere fundo ativo."""
    idx = {}
    with open(path, encoding="latin-1") as f:
        for row in csv.DictReader(f, delimiter=";"):
            k = so_digitos(row.get(cnpj_col))
            if len(k) != 14:
                continue
            if k not in idx:
                idx[k] = row
            elif preferir_ativo:
                atual = (idx[k].get("SIT") or "").upper()
                novo = (row.get("SIT") or "").upper()
                if "NORMAL" in novo and "NORMAL" not in atual:
                    idx[k] = row
    return idx

def ler_pendentes(path):
    """Lê o CSV do curador com nomes de coluna flexíveis e separador detectado."""
    with open(path, encoding="utf-8-sig", newline="") as f:
        amostra = f.read(4096)
        f.seek(0)
        delim = ";" if amostra.count(";") >= amostra.count(",") else ","
        rows = list(csv.DictReader(f, delimiter=delim))
    if not rows:
        sys.exit("CSV de pendentes vazio.")

    def achar(candidatos):
        for c in rows[0].keys():
            slug = re.sub(r"[^a-z]", "", c.lower())
            if slug in candidatos:
                return c
        return None

    col_id   = achar({"ativocanonicoid", "canonicoid", "id"})
    col_nome = achar({"nomecanonico", "nome", "nomesistema", "ativo"})
    col_cnpj = achar({"cnpj", "codigoidentificador", "identificador"})
    if not col_id or not col_cnpj:
        sys.exit(f"Colunas não encontradas. Esperado id+cnpj; achei: {list(rows[0].keys())}")
    return [{
        "ativo_canonico_id": r[col_id],
        "nome_canonico": (r.get(col_nome) or "").strip() if col_nome else "",
        "cnpj": so_digitos(r[col_cnpj]),
    } for r in rows if so_digitos(r.get(col_cnpj)) ]

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pendentes", required=True)
    ap.add_argument("--out-dir", default=".")
    ap.add_argument("--cache-dir", default=".cache_cvm")
    args = ap.parse_args()

    pendentes = ler_pendentes(args.pendentes)
    paths = baixar(args.cache_dir)
    cad   = carregar_cvm(paths["cad_fi.csv"], "CNPJ_FUNDO", preferir_ativo=True)
    extr  = carregar_cvm(paths["extrato_fi.csv"], "CNPJ_FUNDO_CLASSE")

    os.makedirs(args.out_dir, exist_ok=True)
    out_path = os.path.join(args.out_dir, "comparativo_cvm.csv")
    campos = ["n", "ativo_canonico_id", "nome_sistema", "cnpj", "encontrado",
              "situacao", "classe_anbima_cvm", "sugestao_classe_avere", "confianca",
              "liquidez_dplus", "tipo_dias", "gestor", "taxa_adm", "taxa_perf",
              "credito_privado", "aplic_min"]
    stats = {"alta": 0, "media": 0, "sem_sugestao": 0, "nao_encontrado": 0}

    with open(out_path, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=campos, delimiter=";")
        w.writeheader()
        for i, p in enumerate(sorted(pendentes, key=lambda x: x["nome_canonico"]), 1):
            c, e = cad.get(p["cnpj"]), extr.get(p["cnpj"])
            if not c and not e:
                stats["nao_encontrado"] += 1
                w.writerow({"n": i, "ativo_canonico_id": p["ativo_canonico_id"],
                            "nome_sistema": p["nome_canonico"], "cnpj": p["cnpj"],
                            "encontrado": "NAO"})
                continue
            classe_anbima = (e or {}).get("CLASSE_ANBIMA") or (c or {}).get("CLASSE_ANBIMA") or ""
            sug, conf = depara_anbima(classe_anbima)
            stats["alta" if conf == "alta" else "media" if conf == "media" else "sem_sugestao"] += 1
            w.writerow({
                "n": i,
                "ativo_canonico_id": p["ativo_canonico_id"],
                "nome_sistema": p["nome_canonico"],
                "cnpj": p["cnpj"],
                "encontrado": "SIM",
                "situacao": (c or {}).get("SIT", ""),
                "classe_anbima_cvm": classe_anbima,
                "sugestao_classe_avere": sug or "",
                "confianca": conf or "",
                "liquidez_dplus": liquidez_dplus((e or {}).get("QT_DIA_CONVERSAO_COTA"),
                                                 (e or {}).get("QT_DIA_PAGTO_RESGATE")),
                "tipo_dias": (e or {}).get("TP_DIA_PAGTO_RESGATE", ""),
                "gestor": (c or {}).get("GESTOR", ""),
                "taxa_adm": (c or {}).get("TAXA_ADM") or (e or {}).get("TAXA_ADM", ""),
                "taxa_perf": (c or {}).get("TAXA_PERFM") or (e or {}).get("TAXA_PERFM", ""),
                "credito_privado": (e or {}).get("ATIVO_CRED_PRIV", ""),
                "aplic_min": (e or {}).get("APLIC_MIN", ""),
            })

    print(f"pendentes processados: {len(pendentes)}")
    print(f"  sugestao ALTA:    {stats['alta']}")
    print(f"  sugestao MEDIA:   {stats['media']}")
    print(f"  sem sugestao:     {stats['sem_sugestao']} (FIDC/FIP/etc. -> manual)")
    print(f"  nao encontrados:  {stats['nao_encontrado']}")
    print(f"saida: {out_path}")

if __name__ == "__main__":
    main()

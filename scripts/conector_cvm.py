# -*- coding: utf-8 -*-
"""
conector_cvm.py — Enriquece nossos fundos com os Dados Abertos da CVM.

Casa por CNPJ (cad_fi + extrato_fi, Latin-1) e produz:
  out/reconciliacao_fundos_cvm.csv  — por fundo: classe atual x sugestao CVM,
        liquidez (D+ conversao/pagamento), gestor, taxa, situacao
  out/enriquecer_liquidez_cvm.sql   — preenche liquidez_avere SO onde esta null
        (enriquecimento conservador; classe fica para revisao do Master)

Fonte de fundos do sistema: export de ativos canonicos (linhas com CNPJ).
NADA de classe e gravado automaticamente — CLASSE_ANBIMA vira apenas SUGESTAO.
"""
import csv, glob, os, re, sys, urllib.request

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
os.makedirs(OUT, exist_ok=True)
CACHE = "/tmp"
CAD    = os.path.join(CACHE, "cad_fi.csv")
EXTR   = os.path.join(CACHE, "extrato_fi.csv")
URLS = {
    CAD:  "https://dados.cvm.gov.br/dados/FI/CAD/DADOS/cad_fi.csv",
    EXTR: "https://dados.cvm.gov.br/dados/FI/DOC/EXTRATO/DADOS/extrato_fi.csv",
}
EXPORT_GLOB = r"C:\Users\luiz_\Downloads\Supabase Snippet Lista de ativos can*nicos*1*.csv"

def baixar():
    for path, url in URLS.items():
        if not os.path.exists(path) or os.path.getsize(path) < 1_000_000:
            print(f"baixando {url} ...")
            urllib.request.urlretrieve(url, path)

def so_digitos(s): return re.sub(r"\D", "", str(s or ""))

# ── De-para CLASSE_ANBIMA -> (classe Avere, confianca) ───────────────────────
# alta  = mapeamento inequivoco
# media = direcao certa, sub a confirmar (ex.: RF sem indexador explicito)
def depara_anbima(classe_anbima):
    c = (classe_anbima or "").strip().upper()
    if not c:
        return None, None
    if c.startswith("AÇÕES") or c.startswith("ACOES") or "AÇÕES" in c:
        return "Renda Variável", "alta"
    if c.startswith("MULTIMERCADO"):
        if "EXTERIOR" in c:
            return "Internacional - Multimercado", "media"
        return "Multimercado", "alta"
    if "CAMBIAL" in c:
        return "Internacional - Renda Variável", "media"
    if c.startswith("RENDA FIXA") or c.startswith("RENDA FIXA"):
        if "INFLA" in c or "ÍNDICE" in c or "INDICE" in c or "IPCA" in c or "INDEXADO" in c:
            return "RF - Inflação", "media"
        if "DÍVIDA EXTERNA" in c or "DIVIDA EXTERNA" in c:
            return "Internacional - Pós-fixado", "media"
        return "RF - Pós-fixado", "media"
    return None, None   # FIDC/FIP/FII/cripto/etc. -> revisao manual, sem chute

def liquidez_dplus(conv, pgto):
    """D+ aproximado para receber o dinheiro = conversao + pagamento (dias)."""
    try:
        c = int(float(str(conv).replace(",", "."))) if str(conv).strip() != "" else None
        p = int(float(str(pgto).replace(",", "."))) if str(pgto).strip() != "" else None
    except ValueError:
        return None
    if c is None and p is None:
        return None
    return str((c or 0) + (p or 0))

# ── 1. Indexar CVM por CNPJ ──────────────────────────────────────────────────
baixar()
def carregar(path, cnpj_col):
    idx = {}
    with open(path, encoding="latin-1") as f:
        for row in csv.DictReader(f, delimiter=";"):
            k = so_digitos(row.get(cnpj_col))
            if len(k) == 14 and k not in idx:
                idx[k] = row
    return idx

cad   = carregar(CAD,  "CNPJ_FUNDO")
extr  = carregar(EXTR, "CNPJ_FUNDO_CLASSE")
print(f"CVM cad_fi: {len(cad)} | extrato_fi: {len(extr)}")

# ── 2. Ler fundos do sistema (linhas com CNPJ) ───────────────────────────────
export = glob.glob(EXPORT_GLOB)
if not export:
    print("ERRO: export de canonicos nao encontrado em Downloads.")
    sys.exit(1)
for enc in ("utf-8-sig", "latin-1"):
    try:
        nossos = list(csv.DictReader(open(export[0], encoding=enc)))
        break
    except UnicodeDecodeError:
        continue

fundos = []
for r in nossos:
    if "CNPJ" not in (r.get("tipos_id") or ""):
        continue
    m = re.search(r"\d{14}", r.get("identificadores") or "")
    if m:
        fundos.append((m.group(0), r))

# ── 3. Reconciliar / enriquecer ──────────────────────────────────────────────
recon, sql_liq = [], []
achou = semcvm = 0
for cnpj, r in fundos:
    c, e = cad.get(cnpj), extr.get(cnpj)
    if not c and not e:
        semcvm += 1
        recon.append({"cnpj": cnpj, "nome_sistema": r.get("nome_canonico"),
                      "classe_atual": r.get("classe_avere"), "status_cvm": "NAO_ENCONTRADO",
                      "classe_anbima": "", "sugestao_classe": "", "confianca": "",
                      "liquidez_atual": r.get("liquidez_avere"), "cvm_conversao": "",
                      "cvm_pagto_resgate": "", "cvm_tipo_dia": "", "liquidez_sugerida": "",
                      "gestor": "", "taxa_adm": "", "situacao": "", "ativo_canonico_id": r.get("ativo_canonico_id")})
        continue
    achou += 1
    classe_anbima = (e or {}).get("CLASSE_ANBIMA") or (c or {}).get("CLASSE_ANBIMA") or ""
    sug, conf = depara_anbima(classe_anbima)
    conv = (e or {}).get("QT_DIA_CONVERSAO_COTA", "")
    pgto = (e or {}).get("QT_DIA_PAGTO_RESGATE", "")
    liq_sug = liquidez_dplus(conv, pgto)
    liq_atual = (r.get("liquidez_avere") or "").strip()
    if liq_sug is not None and liq_atual in ("", "null", "None"):
        sql_liq.append((r.get("ativo_canonico_id"), liq_sug, r.get("nome_canonico")))
    recon.append({
        "cnpj": cnpj, "nome_sistema": r.get("nome_canonico"),
        "classe_atual": r.get("classe_avere"),
        "status_cvm": "OK",
        "classe_anbima": classe_anbima,
        "sugestao_classe": sug or "", "confianca": conf or "",
        "liquidez_atual": liq_atual,
        "cvm_conversao": conv, "cvm_pagto_resgate": pgto,
        "cvm_tipo_dia": (e or {}).get("TP_DIA_PAGTO_RESGATE", ""),
        "liquidez_sugerida": liq_sug or "",
        "gestor": (c or {}).get("GESTOR", ""),
        "taxa_adm": (c or {}).get("TAXA_ADM", ""),
        "situacao": (c or {}).get("SIT", ""),
        "ativo_canonico_id": r.get("ativo_canonico_id"),
    })

# ── 4. Gravar ────────────────────────────────────────────────────────────────
cols = ["cnpj","nome_sistema","status_cvm","situacao","classe_atual","classe_anbima",
        "sugestao_classe","confianca","liquidez_atual","cvm_conversao","cvm_pagto_resgate",
        "cvm_tipo_dia","liquidez_sugerida","gestor","taxa_adm","ativo_canonico_id"]
p = os.path.join(OUT, "reconciliacao_fundos_cvm.csv")
with open(p, "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=cols, delimiter=";", extrasaction="ignore")
    w.writeheader()
    w.writerows(sorted(recon, key=lambda x: (x["status_cvm"], x["sugestao_classe"], x["nome_sistema"] or "")))

with open(os.path.join(OUT, "enriquecer_liquidez_cvm.sql"), "w", encoding="utf-8") as f:
    f.write("-- Enriquece liquidez_avere a partir do extrato CVM (conversao + pagamento)\n")
    f.write("-- SO preenche onde hoje esta vazio; nunca sobrescreve liquidez ja definida.\n")
    f.write(f"-- {len(sql_liq)} fundos | revise reconciliacao_fundos_cvm.csv antes.\n\n")
    for aid, liq, nome in sorted(sql_liq, key=lambda x: x[2] or ""):
        f.write(f"-- {nome}\n")
        f.write(f"UPDATE ativos_canonicos SET liquidez_avere = '{liq}' "
                f"WHERE id = '{aid}' AND (liquidez_avere IS NULL OR liquidez_avere = '');\n")

# ── 5. Resumo ────────────────────────────────────────────────────────────────
from collections import Counter
print(f"\nfundos do sistema (CNPJ): {len(fundos)}")
print(f"  encontrados na CVM:     {achou}")
print(f"  NAO encontrados:        {semcvm}")
conf = Counter(r["confianca"] for r in recon if r["status_cvm"]=="OK" and r["sugestao_classe"])
print(f"  sugestoes de classe:    {sum(conf.values())} (confianca: {dict(conf)})")
print(f"  sem sugestao (revisar): {achou - sum(conf.values())}")
print(f"  liquidez a preencher:   {len(sql_liq)}")
# divergencias classe atual x sugestao
div = [r for r in recon if r["status_cvm"]=="OK" and r["sugestao_classe"]
       and (r["classe_atual"] or "").strip() not in ("", "null")
       and r["sugestao_classe"] != (r["classe_atual"] or "").strip()]
print(f"\n  divergencias (atual x CVM): {len(div)}  (amostra:)")
for r in div[:12]:
    print(f"    {(r['nome_sistema'] or '')[:42]:<42} {r['classe_atual']!r} x {r['sugestao_classe']!r} [{r['confianca']}] <- {r['classe_anbima'][:30]}")

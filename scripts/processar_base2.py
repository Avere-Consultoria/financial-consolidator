# -*- coding: utf-8 -*-
"""
processar_base2.py — Limpa e particiona o Base_2.xlsx (mapa curado CNPJ -> classe Avere)
e reconcilia com os ativos canonicos do sistema.

Saidas em scripts/out/:
  base2_autoritativo.csv        — CNPJ -> classe (fundos/COE/RV/etc.) — fonte da verdade
  base2_conferencia_rf.csv      — CNPJ -> classe RF (pos/inflacao/pre) — camada de conferencia
  base2_sujas.csv               — linhas com valor invalido na coluna de classe (corrigir na origem)
  base2_ambiguos.csv            — mesmo CNPJ com classes diferentes (decidir na revisao)
  base2_chaves_nome.csv         — chave nao e CNPJ (nome/descricao) — nao casavel automaticamente
  reconciliacao_base2_sistema.csv — fundos do sistema x Base_2 (concorda/diverge/sem cobertura)
"""
import csv
import glob
import os
import re
import sys
import unicodedata
from collections import defaultdict
from datetime import datetime

import openpyxl

BASE2 = r"C:\Users\luiz_\Downloads\Base_2.xlsx"
EXPORT_GLOB = r"C:\Users\luiz_\Downloads\Supabase Snippet Lista de ativos can*nicos*1*.csv"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
os.makedirs(OUT, exist_ok=True)

# ── Classes oficiais do sistema (15) ─────────────────────────────────────────
CLASSES_SISTEMA = [
    "RF - Pós-fixado", "RF - Inflação", "RF - Prefixado",
    "Multimercado", "FII-FIAgro", "Renda Variável", "COE", "Alternativos",
    "Internacional - Pós-fixado", "Internacional - RF - Inflação",
    "Internacional - RF - Prefixado", "Internacional - Multimercado",
    "Internacional - Renda Variável", "Caixa", "Conta Corrente",
]
CLASSES_RF = {"RF - Pós-fixado", "RF - Inflação", "RF - Prefixado"}

def slug(s: str) -> str:
    s = unicodedata.normalize("NFKD", str(s))
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^a-z0-9]+", "", s.lower())

SLUG2CLASSE = {slug(c): c for c in CLASSES_SISTEMA}
# variantes conhecidas do arquivo -> classe oficial
SLUG2CLASSE[slug("Internacional - RF - Pós-fixado")] = "Internacional - Pós-fixado"

def normalizar_classe(v):
    """Retorna (classe_oficial | None, motivo_sujeira | None)."""
    if v is None:
        return None, "classe vazia"
    if isinstance(v, datetime):
        return None, f"data na coluna de classe ({v.date().isoformat()})"
    t = str(v).strip()
    if not t:
        return None, "classe vazia"
    c = SLUG2CLASSE.get(slug(t))
    if c:
        return c, None
    if re.match(r"^D\+\d+$", t, re.I):
        return None, f"parece liquidez, nao classe ({t})"
    if re.match(r"^\d{4}-\d{2}-\d{2}", t):
        return None, f"data na coluna de classe ({t})"
    return None, f"valor nao reconhecido ({t})"

def extrair_cnpj(chave):
    """Retorna (cnpj14 | None, sufixo | None). Aceita mascara e sufixos tipo _senior2."""
    t = str(chave).strip()
    sufixo = None
    m = re.match(r"^(.*?)_([A-Za-z0-9]+)$", t)
    if m and re.search(r"\d", m.group(1)):
        t, sufixo = m.group(1), m.group(2)
    digitos = re.sub(r"\D", "", t)
    # exige que a chave seja "essencialmente" um CNPJ (nao um nome longo com numeros)
    so_estrutura = re.sub(r"[\d./\-\s]", "", t)
    if len(digitos) == 14 and len(so_estrutura) == 0:
        return digitos, sufixo
    return None, None

def tipo_chave(chave):
    """Classifica a chave: ISIN | TICKER | CODIGO | NOME (CNPJ tratado a parte)."""
    k = str(chave).strip().upper().rstrip("_")
    if re.match(r"^[A-Z]{2}[A-Z0-9]{9}\d$", k):
        return "ISIN", k
    if re.match(r"^[A-Z0-9]{4}\d{1,2}[A-Z]?$", k) and not k.isdigit() and len(k) <= 7:
        return "TICKER", k
    if re.match(r"^[A-Z0-9]{6,12}$", k) and re.search(r"\d", k) and " " not in k:
        return "CODIGO", k
    return "NOME", k

# ── 1. Ler Base_2 ────────────────────────────────────────────────────────────
wb = openpyxl.load_workbook(BASE2, read_only=True, data_only=True)
ws = wb.active

linhas = []          # (chave_original, cnpj14, sufixo, classe, motivo_sujeira)
for r in ws.iter_rows(min_row=2, values_only=True):
    chave = r[0]
    if chave is None or str(chave).strip() == "":
        continue
    classe, motivo = normalizar_classe(r[2])
    cnpj, sufixo = extrair_cnpj(chave)
    linhas.append((str(chave).strip(), cnpj, sufixo, classe, motivo))

sujas        = [l for l in linhas if l[4]]
validas      = [l for l in linhas if not l[4]]
chaves_nome  = [l for l in validas if l[1] is None]
com_cnpj     = [l for l in validas if l[1] is not None]

# ── 2. Ambiguidade: mesmo CNPJ (sem sufixo) com classes distintas ────────────
por_cnpj = defaultdict(set)
for chave, cnpj, sufixo, classe, _ in com_cnpj:
    if sufixo is None:
        por_cnpj[cnpj].add(classe)
ambiguos_cnpjs = {c for c, cls in por_cnpj.items() if len(cls) > 1}

ambiguos   = [l for l in com_cnpj if l[1] in ambiguos_cnpjs and l[2] is None]
resolvidos = [l for l in com_cnpj if not (l[1] in ambiguos_cnpjs and l[2] is None)]

# dedup: mesmo cnpj+sufixo+classe repetido vira 1 linha
dedup = {}
for chave, cnpj, sufixo, classe, _ in resolvidos:
    dedup[(cnpj, sufixo or "", classe)] = chave
mapa = [(cnpj, suf, classe, chave) for (cnpj, suf, classe), chave in sorted(dedup.items())]

autoritativo   = [m for m in mapa if m[2] not in CLASSES_RF]
conferencia_rf = [m for m in mapa if m[2] in CLASSES_RF]

# ── 3. Reconciliacao com os ativos canonicos do sistema ─────────────────────
classe_por_cnpj = {}
for cnpj, suf, classe, chave in mapa:
    if suf == "":           # so CNPJ puro casa automaticamente
        classe_por_cnpj[cnpj] = classe

# mapas por tipo de chave (alem do CNPJ): ISIN, TICKER, CODIGO, NOME (slug exato)
classe_por_chave = {"ISIN": {}, "TICKER": {}, "CODIGO": {}, "NOME": {}}
for chave, classe in [(l[0], l[3]) for l in chaves_nome]:
    t, k = tipo_chave(chave)
    classe_por_chave[t][slug(k) if t == "NOME" else k] = (classe, chave)

recon = []
export_files = glob.glob(EXPORT_GLOB)
if export_files:
    for tent in ("utf-8-sig", "latin-1"):
        try:
            rows = list(csv.DictReader(open(export_files[0], encoding=tent)))
            break
        except UnicodeDecodeError:
            continue
    for row in rows:
        idents = (row.get("identificadores") or "").upper()
        ticker = (row.get("sub_tipo_canonico") or "").strip().upper()
        nome   = row.get("nome_canonico") or ""
        classe_sis = (row.get("classe_avere") or "").strip()
        classe_sis_oficial = SLUG2CLASSE.get(slug(classe_sis), classe_sis)

        b2, casado_por = None, ""
        cnpjs = re.findall(r"\d{14}", idents) if "CNPJ" in (row.get("tipos_id") or "") else []
        if cnpjs and cnpjs[0] in classe_por_cnpj:
            b2, casado_por = classe_por_cnpj[cnpjs[0]], "CNPJ"
        if b2 is None:
            for isin in re.findall(r"[A-Z]{2}[A-Z0-9]{9}\d", idents):
                if isin in classe_por_chave["ISIN"]:
                    b2, casado_por = classe_por_chave["ISIN"][isin][0], "ISIN"
                    break
        if b2 is None and ticker:
            for t in ("TICKER", "CODIGO"):
                if ticker in classe_por_chave[t]:
                    b2, casado_por = classe_por_chave[t][ticker][0], t
                    break
        if b2 is None and idents:
            for t in ("CODIGO", "TICKER"):
                for ident in re.split(r"[|,;\s]+", idents):
                    if ident and ident in classe_por_chave[t]:
                        b2, casado_por = classe_por_chave[t][ident][0], t
                        break
                if b2 is not None:
                    break
        # nome: match exato por slug — vira SUGESTAO, nunca autoritativo
        sugestao_nome = ""
        if b2 is None:
            hit = classe_por_chave["NOME"].get(slug(nome))
            if hit:
                sugestao_nome = hit[0]

        if b2 is None:
            status = "SUGESTAO_POR_NOME" if sugestao_nome else "SEM_COBERTURA_BASE2"
        elif slug(b2) == slug(classe_sis_oficial):
            status = "CONCORDA"
        else:
            status = "DIVERGE"
        recon.append({
            "identificador": cnpjs[0] if cnpjs else (row.get("identificadores") or "")[:20],
            "casado_por": casado_por or ("NOME" if sugestao_nome else ""),
            "tipo_id": row.get("tipos_id") or "",
            "nome_sistema": nome,
            "classe_sistema": classe_sis_oficial,
            "classe_base2": b2 or sugestao_nome or "",
            "status": status,
            "ativo_canonico_id": row.get("ativo_canonico_id"),
        })

# ── 4. Gravar saidas ─────────────────────────────────────────────────────────
def w(nome, header, rows):
    p = os.path.join(OUT, nome)
    with open(p, "w", newline="", encoding="utf-8-sig") as f:
        cw = csv.writer(f, delimiter=";")
        cw.writerow(header)
        cw.writerows(rows)
    return p

w("base2_autoritativo.csv",  ["cnpj", "sufixo", "classe_avere", "chave_original"], autoritativo)
w("base2_conferencia_rf.csv",["cnpj", "sufixo", "classe_avere", "chave_original"], conferencia_rf)
w("base2_sujas.csv",         ["chave_original", "motivo"], [(l[0], l[4]) for l in sujas])
w("base2_ambiguos.csv",      ["cnpj", "chave_original", "classe_avere"], [(l[1], l[0], l[3]) for l in sorted(ambiguos, key=lambda x: x[1])])
w("base2_chaves_nome.csv",   ["chave_original", "classe_avere"], [(l[0], l[3]) for l in chaves_nome])
if recon:
    p = os.path.join(OUT, "reconciliacao_base2_sistema.csv")
    with open(p, "w", newline="", encoding="utf-8-sig") as f:
        cw = csv.DictWriter(f, fieldnames=list(recon[0].keys()), delimiter=";")
        cw.writeheader()
        cw.writerows(sorted(recon, key=lambda r: (r["status"], r["nome_sistema"] or "")))

# ── 4b. Gerar SQLs de implantação ────────────────────────────────────────────
# Decisões do Master (2026-06-11):
#   R1: PENSION sem mapa fica vazio (tratado no classifyAvere)
#   R2: faxina retroativa — Multimercado (auto) sem cobertura -> NULL
#   R3: desempate 09215250000113 -> RF - Pós-fixado
DESEMPATES = {"09215250000113": "RF - Pós-fixado"}

def sql_q(s):
    return "'" + str(s).replace("'", "''") + "'"

# entradas do mapa: CNPJs limpos + chaves duras (ISIN/TICKER/CODIGO)
mapa_sql = {}      # chave -> (tipo, classe)
conflitos = []
for cnpj, suf, classe, chave in mapa:
    if suf == "":
        mapa_sql[cnpj] = ("CNPJ", classe)
for cnpj, cls in DESEMPATES.items():
    mapa_sql[cnpj] = ("CNPJ", cls)
for chave, classe in [(l[0], l[3]) for l in chaves_nome]:
    t, k = tipo_chave(chave)
    if t == "NOME":
        continue
    if k in mapa_sql and mapa_sql[k][1] != classe:
        conflitos.append((k, mapa_sql[k][1], classe))
        continue                       # mantém a primeira; conflito vai pro relatorio
    mapa_sql[k] = (t, classe)

with open(os.path.join(OUT, "carga_mapa_classificacao.sql"), "w", encoding="utf-8") as f:
    f.write("-- Carga do mapa curado de classificação (Base_2) — idempotente\n")
    f.write(f"-- {len(mapa_sql)} chaves | gerado por processar_base2.py\n\n")
    f.write("INSERT INTO mapa_classificacao (chave, tipo_chave, classe_avere) VALUES\n")
    vals = [f"  ({sql_q(k)}, {sql_q(t)}, {sql_q(c)})" for k, (t, c) in sorted(mapa_sql.items())]
    f.write(",\n".join(vals))
    f.write("\nON CONFLICT (chave) DO UPDATE SET\n")
    f.write("  tipo_chave = EXCLUDED.tipo_chave,\n  classe_avere = EXCLUDED.classe_avere;\n")

# correções nos canônicos atuais (por id — determinístico e auditável)
if recon:
    with open(os.path.join(OUT, "aplicar_classes_canonicos.sql"), "w", encoding="utf-8") as f:
        f.write("-- Aplica o mapa curado nos ativos canônicos existentes.\n")
        f.write("-- DIVERGE: corrige classe | CONCORDA: só carimba a origem.\n")
        f.write("-- Nunca toca em linhas marcadas como 'manual'.\n\n")
        for r in sorted(recon, key=lambda x: (x["status"], x["nome_sistema"] or "")):
            if r["status"] == "DIVERGE":
                f.write(f"-- {r['nome_sistema']}: {r['classe_sistema']} -> {r['classe_base2']}\n")
                f.write(
                    f"UPDATE ativos_canonicos SET classe_avere = {sql_q(r['classe_base2'])}, "
                    f"origem_classificacao = 'mapa' WHERE id = {sql_q(r['ativo_canonico_id'])} "
                    f"AND origem_classificacao IS DISTINCT FROM 'manual';\n"
                )
            elif r["status"] == "CONCORDA":
                f.write(
                    f"UPDATE ativos_canonicos SET origem_classificacao = 'mapa' "
                    f"WHERE id = {sql_q(r['ativo_canonico_id'])} "
                    f"AND origem_classificacao IS DISTINCT FROM 'manual';\n"
                )

    # faxina R2: fundos (tipo CNPJ) hoje 'Multimercado' sem cobertura -> vazio
    faxina = [r for r in recon
              if r["status"] in ("SEM_COBERTURA_BASE2", "SUGESTAO_POR_NOME")
              and "CNPJ" in r["tipo_id"]
              and slug(r["classe_sistema"]) == slug("Multimercado")]
    with open(os.path.join(OUT, "faxina_classificacao.sql"), "w", encoding="utf-8") as f:
        f.write("-- Faxina (decisão R2): fundos carimbados 'Multimercado' pelo chute do\n")
        f.write("-- auto-classificador e SEM cobertura do mapa voltam a vazio (A classificar).\n")
        f.write(f"-- {len(faxina)} ativos | nunca toca em 'manual'.\n\n")
        for r in sorted(faxina, key=lambda x: x["nome_sistema"] or ""):
            f.write(f"-- {r['nome_sistema']}\n")
            f.write(
                f"UPDATE ativos_canonicos SET classe_avere = NULL, origem_classificacao = NULL "
                f"WHERE id = {sql_q(r['ativo_canonico_id'])} "
                f"AND origem_classificacao IS DISTINCT FROM 'manual';\n"
            )

# ── 5. Resumo (ASCII para o console Windows) ─────────────────────────────────
def n(x): return len(x)
print("===== BASE_2 =====")
print(f"linhas lidas:            {n(linhas)}")
print(f"  sujas (corrigir):      {n(sujas)}")
print(f"  chave por NOME:        {n(chaves_nome)}")
print(f"  ambiguas (decidir):    {n(ambiguos)} ({len(ambiguos_cnpjs)} CNPJs)")
print(f"  mapa limpo (dedup):    {n(mapa)}")
print(f"    -> autoritativo:     {n(autoritativo)}")
print(f"    -> conferencia RF:   {n(conferencia_rf)}")
if recon:
    from collections import Counter
    c = Counter(r["status"] for r in recon)
    cp = Counter(r["casado_por"] for r in recon if r["casado_por"])
    print("===== RECONCILIACAO (939 ativos do sistema x Base_2) =====")
    print(f"ativos no sistema: {len(recon)}")
    for k in ("CONCORDA", "DIVERGE", "SUGESTAO_POR_NOME", "SEM_COBERTURA_BASE2"):
        print(f"  {k}: {c.get(k, 0)}")
    print(f"  casamentos por tipo: {dict(cp)}")
    div = [r for r in recon if r["status"] == "DIVERGE"]
    pares = Counter((r["classe_sistema"], r["classe_base2"]) for r in div)
    print("----- divergencias por par (sistema -> Base_2) -----")
    for (a, b), qtd in pares.most_common():
        print(f"  {qtd:4d}  {a} -> {b}")
    print("===== SQLS GERADOS =====")
    print(f"  carga_mapa_classificacao.sql:  {len(mapa_sql)} chaves")
    print(f"  aplicar_classes_canonicos.sql: {sum(1 for r in recon if r['status'] in ('DIVERGE','CONCORDA'))} updates")
    faxina_n = sum(1 for r in recon if r['status'] in ('SEM_COBERTURA_BASE2','SUGESTAO_POR_NOME') and 'CNPJ' in r['tipo_id'] and slug(r['classe_sistema'])==slug('Multimercado'))
    print(f"  faxina_classificacao.sql:      {faxina_n} ativos -> NULL")
    if conflitos:
        print(f"  CONFLITOS de chave no Base_2 (mantida a 1a): {len(conflitos)}")
        for k, a, b in conflitos[:10]:
            print(f"    {k}: {a} x {b}")

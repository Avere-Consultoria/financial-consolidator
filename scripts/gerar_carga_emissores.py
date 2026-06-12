# -*- coding: utf-8 -*-
"""
gerar_carga_emissores.py — Carga do crédito privado em dicionario_emissores.

A partir do arquivo curado (emissores_classificados.csv) + o mapa ativo->emissor
(ativos_emissor_map.csv), gera:

  out/carga_emissores.sql        — idempotente:
     1) INSERT dos emissores que ainda nao existem (dedup por nome, cnpj_raiz=null)
     2) UPDATE setor_id/setor pela "Lei" (setores) — vale p/ novos E p/ os 11 atuais
     3) INSERT emissor_aliases (variacoes) — motor casa ativos futuros sozinho
     4) UPDATE ativos_canonicos.emissor_id (link determinístico por canonico_id)
  out/reconciliacao_emissores.csv — emissor, setor_lei, n_aliases, n_ativos, ja_existe?

Bancos NAO entram aqui — resolvem via FGC (conglomerado_id), ja 298 linkados.
"""
import csv, os, re, unicodedata
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
CURADO = os.path.join(OUT, "emissores_classificados.csv")
MAPA   = os.path.join(OUT, "ativos_emissor_map.csv")

# Lei: setores canônicos (seed da migration 20260604). Nome -> usado no subquery.
SETORES_LEI = {
    "Energia Elétrica","Saneamento","Infraestrutura & Transporte","Financeiro",
    "Imobiliário","Agronegócio","Varejo & Consumo","Telecomunicações","Saúde",
    "Papel & Celulose","Petróleo & Gás","Indústria","Educação","Tecnologia","Outros",
}
# Os 11 emissores que ja existem no banco (query de introspecção)
EXISTENTES = [
    "1 - Teste novo","Autopista Litoral Sul S.A.","BR Foods","Echoenergia Participações S.A.",
    "Grupo Light","Klabin","Light Serviços de Eletricidade S.A.","Raizen","Rumo S.A.",
    "São Salvador Alimentos","XP XYZ",
]

def norm(s):
    s = unicodedata.normalize("NFD", str(s or "")).encode("ascii","ignore").decode().upper()
    s = re.sub(r"\b(S\.?A\.?|LTDA|PARTICIPACOES|S/A|ME|EIRELI|CIA)\b", " ", s)
    return re.sub(r"[^A-Z0-9]+", " ", s).strip()

EXIST_NORM = {norm(e): e for e in EXISTENTES}

def q(s):  # escapa pra SQL
    return "'" + str(s).replace("'", "''") + "'"

# ── Ler curado + mapa ────────────────────────────────────────────────────────
curados = list(csv.DictReader(open(CURADO, encoding="utf-8-sig")))
mapa    = list(csv.DictReader(open(MAPA,   encoding="utf-8-sig")))

ativos_por_emissor = defaultdict(list)
for m in mapa:
    ativos_por_emissor[m["emissor_curado"]].append(m["ativo_canonico_id"])

linhas_sql, recon = [], []
setor_invalido = []

linhas_sql.append("-- Carga crédito privado em dicionario_emissores (idempotente).")
linhas_sql.append("-- cnpj_raiz fica null (crédito casa por nome/alias). Bancos = FGC, fora daqui.\n")

linhas_sql.append("-- ── 1+2. Emissores: insere se novo, e alinha setor_id pela Lei ──")
for e in curados:
    nome = e["emissor_curado"].strip()
    setor = e["setor_provisorio"].strip()
    if setor not in SETORES_LEI:
        setor_invalido.append((nome, setor))
        setor = "Outros"
    nf = q(nome)
    setor_sub = f"(SELECT id FROM setores WHERE nome = {q(setor)})"
    # 1) insere quando ainda nao existe (dedup por nome normalizado, ci)
    linhas_sql.append(
        f"INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)\n"
        f"  SELECT {nf}, {q(setor)}, {setor_sub}\n"
        f"  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores\n"
        f"    WHERE lower(btrim(nome_fantasia)) = lower(btrim({nf})));"
    )
    # 2) garante setor_id/setor corretos (cobre os 11 ja existentes tambem)
    linhas_sql.append(
        f"UPDATE dicionario_emissores SET setor_id = {setor_sub}, setor = {q(setor)}\n"
        f"  WHERE lower(btrim(nome_fantasia)) = lower(btrim({nf}))\n"
        f"    AND setor_id IS DISTINCT FROM {setor_sub};"
    )
    ja = norm(nome) in EXIST_NORM
    n_ativos = len(ativos_por_emissor.get(nome, []))
    variacoes = [v.strip() for v in (e.get("variacoes_brutas") or "").split(";") if v.strip()]
    recon.append({"emissor": nome, "setor_lei": setor, "revisar": e.get("revisar"),
                  "n_aliases": len(variacoes), "n_ativos": n_ativos,
                  "ja_existe_no_banco": "SIM" if ja else ""})

# ── 3. Aliases ───────────────────────────────────────────────────────────────
linhas_sql.append("\n-- ── 3. Aliases (variações que as APIs usam) ──")
for e in curados:
    nome = e["emissor_curado"].strip()
    nf = q(nome)
    emissor_sub = (f"(SELECT id FROM dicionario_emissores "
                   f"WHERE lower(btrim(nome_fantasia)) = lower(btrim({nf})) LIMIT 1)")
    variacoes = {v.strip() for v in (e.get("variacoes_brutas") or "").split(";") if v.strip()}
    for v in sorted(variacoes):
        if norm(v) == norm(nome):
            continue
        linhas_sql.append(
            f"INSERT INTO emissor_aliases (emissor_id, alias) SELECT {emissor_sub}, {q(v)}\n"
            f"  WHERE NOT EXISTS (SELECT 1 FROM emissor_aliases a WHERE a.emissor_id = {emissor_sub} "
            f"AND lower(btrim(a.alias)) = lower(btrim({q(v)})));"
        )

# ── 4. Link dos ativos atuais (determinístico por canonico_id) ──────────────
linhas_sql.append("\n-- ── 4. Linka ativos_canonicos.emissor_id (só onde está vazio) ──")
n_links = 0
for m in mapa:
    nome = m["emissor_curado"].strip()
    nf = q(nome)
    emissor_sub = (f"(SELECT id FROM dicionario_emissores "
                   f"WHERE lower(btrim(nome_fantasia)) = lower(btrim({nf})) LIMIT 1)")
    linhas_sql.append(
        f"UPDATE ativos_canonicos SET emissor_id = {emissor_sub}\n"
        f"  WHERE id = {q(m['ativo_canonico_id'])} AND emissor_id IS NULL;"
    )
    n_links += 1

# ── Gravar ───────────────────────────────────────────────────────────────────
with open(os.path.join(OUT, "carga_emissores.sql"), "w", encoding="utf-8") as f:
    f.write("\n".join(linhas_sql) + "\n")

with open(os.path.join(OUT, "reconciliacao_emissores.csv"), "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=["emissor","setor_lei","revisar","n_aliases","n_ativos","ja_existe_no_banco"], delimiter=";")
    w.writeheader()
    w.writerows(sorted(recon, key=lambda r: (-r["n_ativos"], r["emissor"])))

# ── Resumo ───────────────────────────────────────────────────────────────────
ja = sum(1 for r in recon if r["ja_existe_no_banco"])
rev = sum(1 for r in recon if r["revisar"] == "SIM")
print(f"emissores curados:      {len(curados)}")
print(f"  ja existem no banco:  {ja} (alinhar setor)")
print(f"  novos a inserir:      {len(curados)-ja}")
print(f"  marcados 'Outros':    {rev}")
print(f"links ativo->emissor:   {n_links}")
print(f"setores fora da Lei -> Outros: {len(setor_invalido)} {setor_invalido[:5]}")
print("\nArquivos: out/carga_emissores.sql  +  out/reconciliacao_emissores.csv")

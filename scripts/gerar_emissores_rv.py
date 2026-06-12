# -*- coding: utf-8 -*-
"""
gerar_emissores_rv.py — Opção B: emissor-empresa para Renda Variável / FIIs listados.

Regras:
  • Ação      -> empresa (concentração consolidada com o crédito: VALE3 + deb Vale)
  • FII/FIAgro listado -> gestora (setor Imobiliário / Agronegócio)
  • ETF/BDR de índice  -> SEM emissor (diversificado); BDR de empresa única -> empresa
  • Fundos 'FI' por CNPJ ficam FORA (fila/manual)

Saídas:
  out/proposta_emissores_rv.csv  — ticker, empresa, setor, confiança (REVISAR ANTES)
  out/carga_emissores_rv.sql     — idempotente; só preenche emissor_id vazio
"""
import csv, glob, os
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
EXPORT_GLOB = r"C:\Users\luiz_\Downloads\Supabase Snippet Lista de ativos can*nicos*1*.csv"

# raiz (4 chars) -> (empresa/gestora, setor Lei, confianca)  | None = ETF (sem emissor)
MAPA = {
    # ── Ações: a própria empresa ─────────────────────────────────────────────
    "ALOS": ("Allos", "Imobiliário", "alta"),
    "BBAS": ("Banco do Brasil", "Financeiro", "alta"),
    "BBDC": ("Bradesco", "Financeiro", "alta"),
    "BBSE": ("BB Seguridade", "Financeiro", "alta"),
    "BHIA": ("Casas Bahia", "Varejo & Consumo", "alta"),
    "BPAC": ("BTG Pactual", "Financeiro", "alta"),
    "CMIN": ("CSN Mineração", "Indústria", "alta"),
    "CPFE": ("CPFL Energia", "Energia Elétrica", "alta"),
    "CSAN": ("Cosan", "Petróleo & Gás", "media"),
    "CSUD": ("CSU Digital", "Tecnologia", "alta"),
    "CXSE": ("Caixa Seguridade", "Financeiro", "alta"),
    "CYRE": ("Cyrela", "Imobiliário", "alta"),
    "EGIE": ("Engie Brasil", "Energia Elétrica", "alta"),
    "EMBJ": ("Embraer", "Indústria", "alta"),
    "ENGI": ("Energisa", "Energia Elétrica", "alta"),
    "FLRY": ("Fleury", "Saúde", "alta"),
    "INBR": ("Banco Inter", "Financeiro", "alta"),          # BDR de empresa única
    "ITSA": ("Itaúsa", "Financeiro", "alta"),
    "ITUB": ("Itaú Unibanco", "Financeiro", "alta"),
    "LAVV": ("Lavvi", "Imobiliário", "alta"),
    "LOGG": ("Log Commercial Properties", "Imobiliário", "alta"),
    "LREN": ("Lojas Renner", "Varejo & Consumo", "alta"),
    "MILS": ("Mills", "Indústria", "media"),
    "MOTV": ("Motiva", "Infraestrutura & Transporte", "alta"),
    "MRVE": ("MRV", "Imobiliário", "alta"),
    "PETR": ("Petrobras", "Petróleo & Gás", "alta"),
    "PRIO": ("Prio", "Petróleo & Gás", "alta"),
    "RADL": ("RaiaDrogasil", "Varejo & Consumo", "media"),
    "RAIZ": ("Raizen", "Agronegócio", "media"),             # já existe no banco (consolida)
    "SANB": ("Santander Brasil", "Financeiro", "alta"),
    "SAPR": ("Sanepar", "Saneamento", "alta"),
    "SHUL": ("Schulz", "Indústria", "alta"),
    "SMFT": ("Smart Fit", "Saúde", "media"),
    "SUZB": ("Suzano", "Papel & Celulose", "alta"),
    "TAEE": ("Taesa", "Energia Elétrica", "alta"),
    "TOTS": ("Totvs", "Tecnologia", "alta"),
    "VALE": ("Vale", "Indústria", "alta"),
    "VIVA": ("Vivara", "Varejo & Consumo", "alta"),
    "VLID": ("Valid", "Tecnologia", "media"),
    "WEGE": ("WEG", "Indústria", "alta"),
    # ── FIIs listados: gestora ───────────────────────────────────────────────
    "ALZR": ("Alianza Gestão", "Imobiliário", "media"),
    "BPML": ("BTG Pactual", "Imobiliário", "alta"),
    "BRCO": ("Bresco", "Imobiliário", "media"),
    "BRCR": ("BTG Pactual", "Imobiliário", "media"),
    "BTAG": ("BTG Pactual", "Agronegócio", "alta"),
    "BTCI": ("BTG Pactual", "Imobiliário", "alta"),
    "BTHF": ("BTG Pactual", "Imobiliário", "alta"),
    "BTLG": ("BTG Pactual", "Imobiliário", "alta"),
    "CNES": ("FII Cenesp", "Imobiliário", "media"),
    "CPLG": ("FII CPLG", "Imobiliário", "media"),
    "CPTI": ("Capitânia", "Infraestrutura & Transporte", "media"),
    "CPTS": ("Capitânia", "Imobiliário", "media"),
    "DEVA": ("Devant", "Imobiliário", "media"),
    "EXES": ("Exes", "Imobiliário", "media"),
    "FGAA": ("FG/A", "Agronegócio", "media"),
    "GARE": ("Guardian", "Imobiliário", "media"),
    "GGRC": ("GGR", "Imobiliário", "media"),
    "GTWR": ("Green Towers", "Imobiliário", "media"),
    "GZIT": ("Gazit", "Imobiliário", "media"),
    "HFOF": ("Hedge Investments", "Imobiliário", "media"),
    "HGBS": ("Hedge Investments", "Imobiliário", "media"),
    "HGLG": ("Pátria", "Imobiliário", "media"),
    "HGRU": ("Pátria", "Imobiliário", "media"),
    "HSML": ("HSI", "Imobiliário", "media"),
    "JSAF": ("J Safra", "Imobiliário", "media"),
    "KFOF": ("Kinea", "Imobiliário", "alta"),
    "KNCR": ("Kinea", "Imobiliário", "alta"),
    "KNHY": ("Kinea", "Imobiliário", "alta"),
    "KNIP": ("Kinea", "Imobiliário", "alta"),
    "KNUQ": ("Kinea", "Imobiliário", "alta"),
    "MCCI": ("Mauá Capital", "Imobiliário", "media"),
    "MCRE": ("Mauá Capital", "Imobiliário", "media"),
    "MXRF": ("XP Asset", "Imobiliário", "media"),
    "PATL": ("VBI", "Imobiliário", "media"),
    "PCIP": ("Pátria", "Imobiliário", "media"),
    "PLAG": ("FII PLAG", "Imobiliário", "media"),
    "PMLL": ("Pátria", "Imobiliário", "media"),
    "PVBI": ("VBI", "Imobiliário", "media"),
    "RBRL": ("RBR Asset", "Imobiliário", "media"),
    "RBRR": ("RBR Asset", "Imobiliário", "media"),
    "RBRX": ("RBR Asset", "Imobiliário", "media"),
    "RBRY": ("RBR Asset", "Imobiliário", "media"),
    "RBVA": ("Rio Bravo", "Imobiliário", "media"),
    "RECR": ("REC Gestão", "Imobiliário", "media"),
    "RZAK": ("Riza", "Imobiliário", "media"),
    "RZAT": ("Riza", "Imobiliário", "media"),
    "RZTR": ("Riza", "Imobiliário", "media"),
    "SNAG": ("Suno", "Agronegócio", "media"),
    "SNCI": ("Suno", "Imobiliário", "media"),
    "TEPP": ("Tellus", "Imobiliário", "media"),
    "TGAR": ("TG Core", "Imobiliário", "media"),
    "TRXF": ("TRX", "Imobiliário", "media"),
    "VGHF": ("Valora", "Imobiliário", "media"),
    "VILG": ("Vinci Partners", "Imobiliário", "media"),
    "VISC": ("Vinci Partners", "Imobiliário", "media"),
    "XPML": ("XP Asset", "Imobiliário", "media"),
    "AZIN": ("AZ Quest", "Infraestrutura & Transporte", "media"),
}
# ETFs / BDRs de índice — diversificados, SEM emissor
ETFS = {
    "ALUG","ARGE","AURO","B5P2","BDRI","BEST","BGNO","BGOV","BIXC","BIZD","BNDX",
    "BODB","BODI","BOVA","BURA","CDII","CHIP","DIVD","DOLA","FIND","GOLD","HASH",
    "HODL","HYBR","IDKA","IMAB","IRFM","IVVB","IWMI","JOGO","JURO","LFTB","LFTS",
    "QQQI","SMAC","SMAL","SPXI","USDB","WEB3","WRLD",
}

def q(s): return "'" + str(s).replace("'", "''") + "'"
def raiz(t): return (t or "").upper().strip()[:4]

# ── Ler ativos RV/FII (ticker) do sistema ────────────────────────────────────
export = glob.glob(EXPORT_GLOB)[0]
for enc in ("utf-8-sig", "latin-1"):
    try:
        rows = list(csv.DictReader(open(export, encoding=enc))); break
    except UnicodeDecodeError:
        continue

alvo = [r for r in rows
        if (r.get("classe_avere") or "") in ("Renda Variável", "Renda Variável", "FII-FIAgro")
        and (r.get("sub_tipo_canonico") or "").strip() not in ("", "FI", "null")]

proposta, sem_mapa = [], []
ativos_por_empresa = defaultdict(list)
for r in alvo:
    t = (r["sub_tipo_canonico"] or "").strip().upper()
    rz = raiz(t)
    if rz in ETFS:
        proposta.append({"ticker": t, "tipo": "ETF", "aplicar": "NAO - ETF sem emissor",
                         "empresa": "", "setor": "", "confianca": "",
                         "nome_sistema": r["nome_canonico"],
                         "ativo_canonico_id": r["ativo_canonico_id"]})
        continue
    hit = MAPA.get(rz)
    if not hit:
        sem_mapa.append((t, r["nome_canonico"]))
        proposta.append({"ticker": t, "tipo": "SEM_MAPA", "aplicar": "NAO - master revisa",
                         "empresa": "", "setor": "", "confianca": "",
                         "nome_sistema": r["nome_canonico"],
                         "ativo_canonico_id": r["ativo_canonico_id"]})
        continue
    empresa, setor, conf = hit
    tipo = "ACAO" if not t.endswith(("11", "11B", "12", "15")) or rz in ("BPAC","ENGI","SANB","SAPR","TAEE") else "FII"
    # Regra da casa: só ALTA confiança entra automático; média fica pro master
    # (empresa/setor seguem no CSV apenas como sugestão de referência).
    aplicar = conf == "alta"
    proposta.append({"ticker": t, "tipo": tipo,
                     "aplicar": "SIM" if aplicar else "NAO - master revisa",
                     "empresa": empresa, "setor": setor, "confianca": conf,
                     "nome_sistema": r["nome_canonico"],
                     "ativo_canonico_id": r["ativo_canonico_id"]})
    if aplicar:
        ativos_por_empresa[(empresa, setor)].append(r["ativo_canonico_id"])

# ── CSV de revisão ───────────────────────────────────────────────────────────
with open(os.path.join(OUT, "proposta_emissores_rv.csv"), "w", newline="", encoding="utf-8-sig") as f:
    w = csv.DictWriter(f, fieldnames=["ticker","tipo","aplicar","empresa","setor","confianca","nome_sistema","ativo_canonico_id"], delimiter=";")
    w.writeheader()
    w.writerows(sorted(proposta, key=lambda x: (x["tipo"], x["empresa"], x["ticker"])))

# ── SQL ──────────────────────────────────────────────────────────────────────
L = ["-- Opção B: emissor-empresa para RV/FIIs listados (idempotente).",
     "-- SÓ ALTA CONFIANÇA — média/sem mapa fica vazia pro Master (regra da casa).",
     "-- ETFs ficam sem emissor (diversificados). Só preenche emissor_id vazio.\n"]
empresas = sorted({(e, s) for (e, s) in ativos_por_empresa})
L.append("-- ── 1. Emissores-empresa (insere se novo + alinha setor pela Lei) ──")
for empresa, setor in empresas:
    nf, st = q(empresa), q(setor)
    sub = f"(SELECT id FROM setores WHERE nome = {st})"
    L.append(f"INSERT INTO dicionario_emissores (nome_fantasia, setor, setor_id)\n"
             f"  SELECT {nf}, {st}, {sub}\n"
             f"  WHERE NOT EXISTS (SELECT 1 FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim({nf})));")
    L.append(f"UPDATE dicionario_emissores SET setor_id = COALESCE(setor_id, {sub})\n"
             f"  WHERE lower(btrim(nome_fantasia)) = lower(btrim({nf}));")
L.append("\n-- ── 2. Linka os ativos (por id, só onde emissor_id está vazio) ──")
n_links = 0
for (empresa, setor), ids in sorted(ativos_por_empresa.items()):
    sub = f"(SELECT id FROM dicionario_emissores WHERE lower(btrim(nome_fantasia)) = lower(btrim({q(empresa)})) LIMIT 1)"
    for aid in ids:
        L.append(f"UPDATE ativos_canonicos SET emissor_id = {sub} WHERE id = {q(aid)} AND emissor_id IS NULL;")
        n_links += 1
with open(os.path.join(OUT, "carga_emissores_rv.sql"), "w", encoding="utf-8") as f:
    f.write("\n".join(L) + "\n")

# ── Resumo ───────────────────────────────────────────────────────────────────
from collections import Counter
tipos = Counter(p["tipo"] for p in proposta)
aplica = Counter(p["aplicar"] for p in proposta)
print(f"ativos RV/FII (ticker): {len(proposta)}")
print(f"  por tipo: {dict(tipos)}")
print(f"  aplicar:  {dict(aplica)}")
print(f"  empresas/gestoras no SQL (so ALTA): {len(empresas)}")
print(f"  links a gravar (so ALTA): {n_links}")
if sem_mapa:
    print(f"  SEM MAPA ({len(sem_mapa)}):")
    for t, n in sem_mapa: print(f"    {t:8} {n[:45]}")
print("\nArquivos: out/proposta_emissores_rv.csv + out/carga_emissores_rv.sql")

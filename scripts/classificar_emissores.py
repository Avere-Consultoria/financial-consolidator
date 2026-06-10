# -*- coding: utf-8 -*-
"""Normaliza emissores de crédito privado, atribui setor (provisório, dos 15) + segmento granular.
Saídas: emissores_classificados.csv (revisão dos gestores) e ativos_emissor_map.csv (p/ reimport)."""
import csv, collections, glob, os, unicodedata

SRC = max(glob.glob(r"C:\Users\luiz_\Downloads\*ativos can*nicos*1*.csv"), key=os.path.getmtime)
OUT = os.path.join(os.path.dirname(__file__), "out"); os.makedirs(OUT, exist_ok=True)
CP = {'DEB', 'CRA', 'CRI', 'FIDC', 'NP', 'NC', 'CCB', 'CCI', 'DEBENTURE'}

def vazio(v): return v is None or str(v).strip() in ("", "null", "NULL")
def norm(s): return ' '.join(unicodedata.normalize('NFD', s or '').encode('ascii', 'ignore').decode().upper().split())
def lastro(bruto):
    if '|' in bruto:
        parts = [p.strip() for p in bruto.split('|')]
        ns = [p for p in parts if not any(t in norm(p) for t in ('SECURITIZ', 'VIRGO', 'RB CAPITAL'))]
        return ns[0] if ns else parts[0]
    return bruto

# (substrings normalizados, curado, setor15, segmento_granular). Ordem: específico → genérico.
MAP = [
    (["MINERVA"], "Minerva", "Agronegócio", "Proteína animal"),
    (["MARFRIG"], "Marfrig", "Agronegócio", "Proteína animal"),
    (["SEARA"], "Seara", "Agronegócio", "Proteína animal"),
    (["BRF", "BR FOODS"], "BRF", "Agronegócio", "Proteína animal"),
    (["JBS"], "JBS", "Agronegócio", "Proteína animal"),
    (["CAMIL"], "Camil", "Agronegócio", "Alimentos"),
    (["M. DIAS BRANCO", "DIAS BRANCO"], "M. Dias Branco", "Agronegócio", "Alimentos"),
    (["CARAMURU"], "Caramuru", "Agronegócio", "Grãos & Óleos"),
    (["OLFAR"], "Olfar", "Agronegócio", "Biodiesel & Grãos"),
    (["ADECOAGRO"], "Adecoagro", "Agronegócio", "Açúcar & Álcool"),
    (["SLC AGRICOLA"], "SLC Agrícola", "Agronegócio", "Grãos"),
    (["SAO MARTINHO"], "São Martinho", "Agronegócio", "Açúcar & Álcool"),
    (["JALLES MACHADO"], "Jalles Machado", "Agronegócio", "Açúcar & Álcool"),
    (["VALE DO TIJUCO"], "Vale do Tijuco", "Agronegócio", "Açúcar & Álcool"),
    (["ACP BIOENERGIA"], "ACP Bioenergia", "Agronegócio", "Bioenergia"),
    (["FS BIO", "FS AGRISOLUTIONS", "FS FLORESTAL", "FS BIOENERGIA"], "FS", "Agronegócio", "Etanol de milho & Bioenergia"),
    (["3TENTOS"], "3tentos", "Agronegócio", "Insumos & Grãos"),
    (["BOA SAFRA"], "Boa Safra", "Agronegócio", "Sementes"),
    (["LAR COOPERATIVA"], "Lar Cooperativa", "Agronegócio", "Cooperativa"),
    (["GENERAL OSORIO", "COOP. AGRICOLA"], "Coop. General Osório", "Agronegócio", "Cooperativa"),
    (["JF CITRUS"], "JF Citrus", "Agronegócio", "Citrus & Suco"),
    (["RIO AMAMBAI"], "Rio Amambai", "Agronegócio", "Açúcar & Álcool"),
    (["PATENSE"], "Patense", "Agronegócio", "Rações"),
    (["AGRION"], "Agrion", "Agronegócio", "Insumos"),
    (["CARAMURU"], "Caramuru", "Agronegócio", "Grãos & Óleos"),
    (["BTG COMMODITIES", "BTG PACTUAL COMMODITIES", "ENGELHART"], "BTG Commodities", "Agronegócio", "Trading de commodities"),
    # Siderurgia / Mineração
    (["SIDERURGICA NACIONAL", "CSN MINERACAO"], "CSN", "Indústria", "Siderurgia & Mineração"),
    (["VALE S.A", "VALE SA"], "Vale", "Indústria", "Mineração"),
    (["VICUNHA"], "Vicunha", "Indústria", "Têxtil"),
    (["EUCATEX"], "Eucatex", "Indústria", "Painéis de madeira"),
    (["STELLANTIS"], "Stellantis", "Indústria", "Automotivo"),
    # Papel & Celulose
    (["KLABIN"], "Klabin", "Papel & Celulose", "Papel & Celulose"),
    (["IRANI"], "Irani", "Papel & Celulose", "Papel & Celulose"),
    (["ELDORADO"], "Eldorado", "Papel & Celulose", "Celulose"),
    # Petróleo & Gás
    (["PETROBRAS", "PETROLEO BRASILEIRO"], "Petrobras", "Petróleo & Gás", "Integrada O&G"),
    (["PRIO"], "PRIO", "Petróleo & Gás", "Exploração & Produção"),
    (["BRAVA ENERGIA"], "Brava Energia", "Petróleo & Gás", "Exploração & Produção"),
    (["ORIGEM ENERGIA"], "Origem Energia", "Petróleo & Gás", "Gás natural"),
    (["IPIRANGA"], "Ipiranga", "Petróleo & Gás", "Distribuição de combustíveis"),
    (["RAIZEN"], "Raízen", "Petróleo & Gás", "Sucroenergético & Combustíveis"),
    # Energia Elétrica
    (["LIGHT SERVICOS"], "Light", "Energia Elétrica", "Distribuição"),
    (["NEOENERGIA"], "Neoenergia", "Energia Elétrica", "Distribuição"),
    (["ELEKTRO"], "Elektro", "Energia Elétrica", "Distribuição"),
    (["EQUATORIAL TRANSMISSORA"], "Equatorial Transmissão", "Energia Elétrica", "Transmissão"),
    (["TRANSMISSORA ALIANCA"], "Taesa", "Energia Elétrica", "Transmissão"),
    (["MATA DE SANTA GENEBRA", "SERRA DE IBIAPABA"], "Transmissoras (SPE)", "Energia Elétrica", "Transmissão"),
    (["ENEVA"], "Eneva", "Energia Elétrica", "Geração térmica"),
    (["CESP", "COMPANHIA ENERGETICA DE SAO PAULO"], "CESP", "Energia Elétrica", "Geração"),
    (["ENERGETICA SINOP"], "Energética Sinop", "Energia Elétrica", "Geração"),
    (["NORTE ENERGIA"], "Norte Energia", "Energia Elétrica", "Geração hidrelétrica"),
    (["ELETROBRAS", "CENTRAIS ELETRICAS BRASILEIRAS"], "Eletrobras", "Energia Elétrica", "Geração & Transmissão"),
    (["PAMPA SUL", "UTE GNA", "GNA I"], "Termelétricas (SPE)", "Energia Elétrica", "Geração térmica"),
    (["FORGREEN", "BRASOL"], "Solar (geração distribuída)", "Energia Elétrica", "Solar / GD"),
    # Saneamento
    (["AGUAS DO RIO", "AGUAS DO SERTAO", "AGUAS DE ITAPEMA", "IGUA RIO", "EQUIPAV SANEAMENTO"], "Saneamento (SPEs)", "Saneamento", "Concessão de saneamento"),
    # Infraestrutura & Transporte
    (["RUMO"], "Rumo", "Infraestrutura & Transporte", "Ferrovia"),
    (["SIMPAR"], "Simpar", "Infraestrutura & Transporte", "Holding logística"),
    (["JSL"], "JSL", "Infraestrutura & Transporte", "Logística rodoviária"),
    (["VAMOS"], "Vamos", "Infraestrutura & Transporte", "Locação de caminhões"),
    (["MOVIDA"], "Movida", "Infraestrutura & Transporte", "Locação de veículos"),
    (["LOCALIZA"], "Localiza", "Infraestrutura & Transporte", "Locação de veículos"),
    (["UNIDAS"], "Unidas", "Infraestrutura & Transporte", "Locação de veículos"),
    (["ESTAPAR"], "Estapar", "Infraestrutura & Transporte", "Estacionamentos"),
    (["ARTERIS"], "Arteris", "Infraestrutura & Transporte", "Rodovias"),
    (["ROTA DAS BANDEIRAS", "VIA BRASIL BR 163", "ROTA DAS"], "Concessionárias de rodovia", "Infraestrutura & Transporte", "Rodovias"),
    # Imobiliário
    (["ALLOS"], "Allos", "Imobiliário", "Shoppings"),
    (["BR PROPERTIES"], "BR Properties", "Imobiliário", "Lajes corporativas"),
    (["MRV"], "MRV", "Imobiliário", "Incorporação"),
    (["CURY"], "Cury", "Imobiliário", "Incorporação"),
    (["TENDA"], "Tenda", "Imobiliário", "Incorporação"),
    (["EVEN"], "Even", "Imobiliário", "Incorporação"),
    (["MITRE"], "Mitre", "Imobiliário", "Incorporação"),
    (["MOURA DUBEUX"], "Moura Dubeux", "Imobiliário", "Incorporação"),
    (["URBA"], "Urba", "Imobiliário", "Loteamento"),
    (["BAIT INCORPORADORA", "BRASIL TERRENOS"], "Incorporadoras (diversas)", "Imobiliário", "Incorporação"),
    (["TERRACAP"], "Terracap", "Imobiliário", "Desenvolvimento de terras"),
    # Varejo & Consumo
    (["ASSAI"], "Assaí", "Varejo & Consumo", "Atacarejo"),
    (["GPA", "COMPANHIA BRASILEIRA DE DISTRIBUICAO"], "GPA", "Varejo & Consumo", "Supermercados"),
    (["MAGAZINE LUIZA"], "Magazine Luiza", "Varejo & Consumo", "Varejo eletro"),
    (["CASAS BAHIA"], "Casas Bahia", "Varejo & Consumo", "Varejo eletro"),
    (["GRUPO MATEUS"], "Grupo Mateus", "Varejo & Consumo", "Supermercados"),
    (["DUFRIO"], "Dufrio", "Varejo & Consumo", "Varejo eletro"),
    (["NISSEI"], "Nissei", "Varejo & Consumo", "Farmácias"),
    (["MADERO"], "Madero", "Varejo & Consumo", "Restaurantes"),
    (["ZAMP"], "Zamp", "Varejo & Consumo", "Restaurantes"),
    (["NORSA"], "Norsa", "Varejo & Consumo", "Bebidas"),
    (["HORTUS"], "Hortus", "Varejo & Consumo", "Distribuição de alimentos"),
    # Saúde
    (["DASA"], "Dasa", "Saúde", "Diagnósticos & Hospitais"),
    (["REDE D"], "Rede D'Or", "Saúde", "Hospitais"),
    (["HAPVIDA"], "Hapvida", "Saúde", "Operadora de saúde"),
    (["KORA SAUDE"], "Kora Saúde", "Saúde", "Hospitais"),
    (["ONCOCLINICAS"], "Oncoclínicas", "Saúde", "Oncologia"),
    (["ALBERT EINSTEIN"], "Hospital Albert Einstein", "Saúde", "Hospitais"),
    (["ACHE"], "Aché", "Saúde", "Farmacêutica"),
    # Educação
    (["ANIMA"], "Ânima", "Educação", "Ensino superior"),
    (["YDUQS"], "Yduqs", "Educação", "Ensino superior"),
    # Telecom / Tecnologia
    (["V.TAL", "V TAL"], "V.tal", "Telecomunicações", "Fibra / rede neutra"),
    (["LIGGA"], "Ligga", "Telecomunicações", "ISP / Fibra"),
    (["WECLIX"], "Weclix", "Telecomunicações", "ISP"),
    (["TRIPLE PLAY"], "Triple Play", "Telecomunicações", "ISP"),
    (["ALARES"], "Alares", "Telecomunicações", "ISP / Fibra"),
    (["VERO S.A", "VERO SA"], "Vero", "Telecomunicações", "ISP / Fibra"),
    (["GLOBO"], "Globo", "Telecomunicações", "Mídia"),
    (["BRASIL TECNOLOGIA E PARTICIPACOES"], "Brasil Tecnologia", "Tecnologia", "Tecnologia"),
    # Financeiro
    (["BANCO BTG PACTUAL", "BTG PACTUAL HOLDING", "BTG PACTUAL"], "BTG Pactual", "Financeiro", "Banco"),
    (["BANCO PAN"], "Banco Pan", "Financeiro", "Banco"),
    (["ABC"], "Banco ABC", "Financeiro", "Banco"),
    (["BV"], "BV", "Financeiro", "Banco"),
]

rows = list(csv.DictReader(open(SRC, encoding="utf-8")))
cp = [r for r in rows if (r['sub_tipo_canonico'] or '').upper() in CP and vazio(r['emissor_id'])]

def classificar(bruto):
    n = norm(lastro(bruto))
    for keys, curado, setor, gran in MAP:
        if any(k in n for k in keys):
            return curado, setor, gran, "NAO"
    # não mapeado → revisar
    return (lastro(bruto).title(), "Outros", "", "SIM")

por_emissor = collections.defaultdict(lambda: {"setor": "", "gran": "", "revisar": "", "n": 0, "brutos": set(), "isins": set()})
mapa_ativos = []
for r in cp:
    bruto = (r['emissor_bruto'] or '').strip()
    curado, setor, gran, rev = classificar(bruto)
    e = por_emissor[curado]
    e["setor"], e["gran"], e["revisar"] = setor, gran, (rev if e["revisar"] != "SIM" else "SIM")
    e["n"] += 1; e["brutos"].add(bruto)
    if not vazio(r['identificadores']): e["isins"].add(r['identificadores'].split(' | ')[0])
    mapa_ativos.append({"ativo_canonico_id": r['ativo_canonico_id'], "emissor_curado": curado, "setor": setor})

# Saída 1 — revisão dos gestores
with open(os.path.join(OUT, "emissores_classificados.csv"), "w", encoding="utf-8-sig", newline="") as f:
    w = csv.writer(f); w.writerow(["emissor_curado", "setor_provisorio", "segmento_granular", "n_ativos", "n_variacoes", "revisar", "variacoes_brutas", "exemplos_isin"])
    for cur, e in sorted(por_emissor.items(), key=lambda kv: (-kv[1]["n"], kv[0])):
        w.writerow([cur, e["setor"], e["gran"], e["n"], len(e["brutos"]), e["revisar"], " ; ".join(sorted(e["brutos"])), " ; ".join(sorted(e["isins"]))])

# Saída 2 — mapa por ativo (p/ reimport)
with open(os.path.join(OUT, "ativos_emissor_map.csv"), "w", encoding="utf-8-sig", newline="") as f:
    w = csv.DictWriter(f, fieldnames=["ativo_canonico_id", "emissor_curado", "setor"]); w.writeheader(); w.writerows(mapa_ativos)

rev = sum(1 for e in por_emissor.values() if e["revisar"] == "SIM")
print(f"Ativos CP processados: {len(cp)}")
print(f"Emissores curados: {len(por_emissor)}  (a revisar: {rev})")
print(f"Por setor provisório:")
for s, c in collections.Counter(e["setor"] for e in por_emissor.values()).most_common():
    print(f"  {c:>3}  {s or '<vazio>'}")
print(f"\nA REVISAR (não mapeados):")
for cur, e in sorted(por_emissor.items()):
    if e["revisar"] == "SIM": print(f"  {e['n']}x  {cur}  <- {' ; '.join(sorted(e['brutos']))}")
print(f"\nArquivos em {OUT}")

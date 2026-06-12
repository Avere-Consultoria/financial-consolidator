import csv, glob, os, re, json
SRC = max(glob.glob(r"C:\Users\luiz_\Downloads\*ativos can*nicos*1*.csv"), key=os.path.getmtime)
def vazio(v): return v is None or str(v).strip() in ("","null","NULL")
rows = list(csv.DictReader(open(SRC, encoding="utf-8")))
fund = [r for r in rows if (r['classe_avere'] or '') in ('Multimercado','FII-FIAgro') or (r['sub_tipo_canonico'] or '').upper() in ('FI','PREV','FUNDO')]
out=[]
for r in fund:
    d = re.sub(r'\D','', (r['identificadores'] or '').split(' | ')[0])
    if not d: continue
    cnpj = d.zfill(14)
    if len(cnpj)!=14: continue
    out.append({"id": r['ativo_canonico_id'], "nome": r['nome_canonico'].strip(), "cnpj": cnpj, "classe_atual": r['classe_avere']})
os.makedirs(os.path.join(os.path.dirname(__file__),"out"), exist_ok=True)
p = os.path.join(os.path.dirname(__file__),"out","fundos_base.json")
json.dump(out, open(p,"w",encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"{len(out)} fundos com CNPJ → {p}")

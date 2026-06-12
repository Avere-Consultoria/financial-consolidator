import csv, glob, os, re, collections
SRC = max(glob.glob(r"C:\Users\luiz_\Downloads\*ativos can*nicos*1*.csv"), key=os.path.getmtime)
def vazio(v): return v is None or str(v).strip() in ("","null","NULL")
rows = list(csv.DictReader(open(SRC, encoding="utf-8")))
# fundos = classe Multimercado / FII-FIAgro, ou sub_tipo FI/PREV/FUNDO
fund = [r for r in rows if (r['classe_avere'] or '') in ('Multimercado','FII-FIAgro') or (r['sub_tipo_canonico'] or '').upper() in ('FI','PREV','FUNDO','FUNDOS')]
print("Linhas 'fundo':", len(fund))
def temcnpj(r):
    ids = (r['identificadores'] or '') + ' ' + (r['tipos_id'] or '')
    return bool(re.search(r'\d{14}', re.sub(r'\D',' ', r['identificadores'] or '')) ) or 'CNPJ' in (r['tipos_id'] or '').upper()
com = [r for r in fund if temcnpj(r)]
print("com CNPJ nos identificadores:", len(com))
print("\n=== tipos_id nos fundos ===")
for k,v in collections.Counter((r['tipos_id'] or '<vazio>') for r in fund).most_common():
    print(f"  {v:>4}  {k}")
print("\n=== amostra de fundos (nome | sub_tipo | classe | identificadores | tipos_id) ===")
for r in fund[:25]:
    print(f"  {r['nome_canonico'][:32]:32} | {r['sub_tipo_canonico']:>10} | {r['classe_avere']:>14} | {r['identificadores']} | {r['tipos_id']}")

import csv, collections, glob, os
SRC = max(glob.glob(r"C:\Users\luiz_\Downloads\*ativos can*nicos*1*.csv"), key=os.path.getmtime)
def vazio(v): return v is None or str(v).strip() in ("","null","NULL")
rows = list(csv.DictReader(open(SRC, encoding="utf-8")))
CP = {'DEB','CRA','CRI','FIDC','NP','NC','CCB','CCI','DEBENTURE'}
cp = [r for r in rows if (r['sub_tipo_canonico'] or '').upper() in CP and vazio(r['emissor_id'])]
print(f"--- {len(cp)} ativos CP sem emissor; emissores brutos distintos: ---")
for k,v in sorted(collections.Counter((r['emissor_bruto'] or '<sem>').strip() for r in cp).items()):
    print(f"{v}\t{k}")
print("\n--- 7 liquidez vazia ---")
for r in rows:
    if vazio(r['liquidez_avere']): print(f"  {r['sub_tipo_canonico']} | {r['classe_avere']} | {r['nome_canonico']}")

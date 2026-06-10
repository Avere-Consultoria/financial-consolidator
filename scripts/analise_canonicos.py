import csv, collections, glob, os
cands = glob.glob(r"C:\Users\luiz_\Downloads\*ativos can*nicos*1*.csv")
SRC = max(cands, key=os.path.getmtime) if cands else None
print("Arquivo:", SRC)
def vazio(v): return v is None or str(v).strip() in ("", "null", "NULL")
rows = list(csv.DictReader(open(SRC, encoding="utf-8")))
print("TOTAL:", len(rows))
print("sem classe_avere:", sum(1 for r in rows if vazio(r['classe_avere'])))
print("sem liquidez_avere:", sum(1 for r in rows if vazio(r['liquidez_avere'])))
print("\n=== classe_avere ===")
for k,v in collections.Counter((r['classe_avere'] if not vazio(r['classe_avere']) else '<vazio>') for r in rows).most_common():
    print(f"  {v:>4}  {k}")
print("\n=== sub_tipos SEM classe (o trabalho de classe) ===")
for k,v in collections.Counter((r['sub_tipo_canonico'] if not vazio(r['sub_tipo_canonico']) else '<vazio>') for r in rows if vazio(r['classe_avere'])).most_common(50):
    print(f"  {v:>4}  {k}")
CP = {'DEB','CRA','CRI','FIDC','NP','NC','CCB','CCI','DEBENTURE'}
cp = [r for r in rows if (r['sub_tipo_canonico'] or '').upper() in CP]
print(f"\n=== crédito privado: {len(cp)} | sem emissor_id: {sum(1 for r in cp if vazio(r['emissor_id']))} ===")
for k,v in collections.Counter((r['emissor_bruto'] if not vazio(r['emissor_bruto']) else '<sem>') for r in cp).most_common(50):
    print(f"  {v:>3}  {k}")

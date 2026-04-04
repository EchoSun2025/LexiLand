import csv

rows = list(csv.DictReader(open('ecdict.csv', encoding='utf-8')))[:20]
for r in rows:
    print(f"{r['word']}: BNC={r.get('bnc', 'N/A')}")

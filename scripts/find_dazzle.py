import csv

found = False
with open('ecdict.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if 'dazzl' in row['word'].lower():
            print(f"Word: {row['word']}")
            print(f"Translation: {row.get('translation', '')[:100]}")
            print(f"BNC: {row.get('bnc', 'N/A')}")
            print(f"Collins: {row.get('collins', 'N/A')}")
            print()
            found = True

if not found:
    print("No words containing 'dazzl' found in ecdict.csv")

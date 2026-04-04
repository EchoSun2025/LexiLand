import csv

with open('ecdict.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['word'] == 'dazzle':
            print(f"Word: {row['word']}")
            print(f"Translation: {row.get('translation', '')}")
            print(f"Exchange: {row.get('exchange', '')}")
            print(f"BNC: {row.get('bnc', '')}")
            print(f"Tag: {row.get('tag', '')}")
            break
    else:
        print("Word 'dazzle' not found in ecdict.csv")

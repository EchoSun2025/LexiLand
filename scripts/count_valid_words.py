import csv
import re
from pathlib import Path

def simplify_translation(translation):
    if not translation:
        return ""
    translation = re.sub(r'^(v|n|adj|adv|prep|conj|pron|art|det|int|num|abbr|vt|vi)\.\s*', '', translation)
    if '\\n' in translation:
        translation = translation.split('\\n')[0]
    if '；' in translation:
        translation = translation.split('；')[0]
    elif ', ' in translation:
        translation = translation.split(', ')[0]
    translation = re.sub(r'\([^)]*\)', '', translation)
    translation = re.sub(r'（[^）]*）', '', translation)
    translation = re.sub(r'\[[^\]]*\]', '', translation)
    translation = translation.strip()
    return translation

count = 0
dazzle_found = False
dazzle_index = -1

with open('ecdict.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        word = row['word'].strip().lower()
        
        # Same filters as convert script
        if ' ' in word:
            continue
        if not re.match(r'^[a-z\-]+$', word):
            continue
        if len(word) < 2 or len(word) > 20:
            continue
        
        translation = simplify_translation(row.get('translation', ''))
        if not translation:
            continue
        
        count += 1
        
        if word == 'dazzle':
            dazzle_found = True
            dazzle_index = count
            print(f"Found 'dazzle' at position {count}")
            print(f"  BNC: {row.get('bnc', '')}")
            print(f"  Collins: {row.get('collins', '')}")
            print(f"  Oxford: {row.get('oxford', '')}")

print(f"\nTotal valid words after filtering: {count}")
if not dazzle_found:
    print("'dazzle' was NOT found in filtered words")
else:
    print(f"'dazzle' is at position {dazzle_index} out of {count}")

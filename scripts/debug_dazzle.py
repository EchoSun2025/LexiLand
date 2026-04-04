import csv
import re

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

with open('ecdict.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        word = row['word'].strip().lower()
        
        if word != 'dazzle':
            continue
            
        print(f"Found: {word}")
        print(f"  Has space: {' ' in word}")
        print(f"  Regex match: {bool(re.match(r'^[a-z\-]+$', word))}")
        print(f"  Length: {len(word)}")
        
        translation = simplify_translation(row.get('translation', ''))
        print(f"  Translation: '{translation}'")
        print(f"  Has translation: {bool(translation)}")
        
        print(f"  BNC: {row.get('bnc', '')}")
        print(f"  Collins: {row.get('collins', '')}")
        break

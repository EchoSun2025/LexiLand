"""
Simple BNC-based dictionary generator
Takes top N words by BNC frequency
"""
import csv
import json
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

def extract_ipa(phonetic):
    if not phonetic:
        return ""
    return phonetic.strip('/').strip()

# Read and filter words
words_with_bnc = []

print("Reading ECDICT...")
with open('ecdict.csv', 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        word = row['word'].strip().lower()
        
        # Skip phrases
        if ' ' in word:
            continue
        # Skip non-alphabetic
        if not re.match(r'^[a-z\-]+$', word):
            continue
        # Skip too short/long
        if len(word) < 2 or len(word) > 20:
            continue
        
        translation = simplify_translation(row.get('translation', ''))
        if not translation:
            continue
        
        # Only keep words with BNC ranking (BNC > 0)
        bnc = row.get('bnc', '').strip()
        if not bnc or not bnc.isdigit() or int(bnc) == 0:
            continue
        
        bnc_rank = int(bnc)
        
        words_with_bnc.append({
            'word': word,
            'bnc': bnc_rank,
            'ipa': extract_ipa(row.get('phonetic', '')),
            'chinese': translation,
            'definition': row.get('definition', '').strip()[:150],
            'exchange': row.get('exchange', '')
        })

print(f"Found {len(words_with_bnc)} words with BNC ranking")

# Sort by BNC (lower number = more frequent)
words_with_bnc.sort(key=lambda x: x['bnc'])

# Take top 30000
top_words = words_with_bnc[:30000]

print(f"Selected top {len(top_words)} words")
print(f"BNC range: {top_words[0]['bnc']} to {top_words[-1]['bnc']}")

# Check if dazzle is included
dazzle_words = [w for w in top_words if 'dazzl' in w['word']]
if dazzle_words:
    print("\nDazzle-related words included:")
    for w in dazzle_words:
        print(f"  {w['word']} (BNC: {w['bnc']})")
else:
    print("\nNo dazzle-related words in top 30000")

# Build dictionary
dictionary = {}
for w in top_words:
    dictionary[w['word']] = {
        'word': w['word'],
        'ipa': w['ipa'],
        'pos': 'unknown',
        'level': 'B2',
        'chinese': w['chinese'],
        'definition': w['definition'],
        'examples': []
    }

# Build word forms
word_forms = {}
for w in top_words:
    if not w['exchange']:
        continue
    base_word = w['word']
    parts = w['exchange'].split('/')
    for part in parts:
        if ':' not in part:
            continue
        form_type, form_words = part.split(':', 1)
        for form_word in form_words.split('/'):
            form_word = form_word.strip().lower()
            if form_word and form_word != base_word:
                if form_word not in word_forms:
                    word_forms[form_word] = base_word

# Save
output_dir = Path('../frontend/public/dictionaries')
output_dir.mkdir(parents=True, exist_ok=True)

dict_file = output_dir / 'core-30000.json'
print(f"\nSaving dictionary to {dict_file}...")
with open(dict_file, 'w', encoding='utf-8') as f:
    json.dump(dictionary, f, ensure_ascii=False, indent=2)

forms_file = output_dir / 'word-forms.json'
print(f"Saving word forms to {forms_file}...")
with open(forms_file, 'w', encoding='utf-8') as f:
    json.dump(word_forms, f, ensure_ascii=False, indent=2)

print(f"\nDone!")
print(f"Dictionary: {len(dictionary)} words")
print(f"Word forms: {len(word_forms)} mappings")

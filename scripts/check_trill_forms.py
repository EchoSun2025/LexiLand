import json

# Load word forms
with open('../frontend/public/dictionaries/word-forms.json', 'r', encoding='utf-8') as f:
    word_forms = json.load(f)

# Find all forms of "trill"
trill_forms = [form for form, base in word_forms.items() if base == 'trill']

print("Word: trill")
print(f"Found {len(trill_forms)} word forms:")
for form in sorted(trill_forms):
    print(f"  - {form}")

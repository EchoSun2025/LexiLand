"""
测试词形还原功能
"""
import json
from pathlib import Path

# 加载词形映射
forms_file = Path('../frontend/public/dictionaries/word-forms.json')
with open(forms_file, 'r', encoding='utf-8') as f:
    word_forms = json.load(f)

# 加载词典
dict_file = Path('../frontend/public/dictionaries/core-10000.json')
with open(dict_file, 'r', encoding='utf-8') as f:
    dictionary = json.load(f)

# 测试用例
test_cases = [
    ('clutching', 'clutch'),
    ('walked', 'walk'),
    ('studies', 'study'),
    ('running', 'run'),
    ('makes', 'make'),
    ('loved', 'love'),
    ('bigger', 'big'),
    ('biggest', 'big'),
    ('cities', 'city'),
]

print("=" * 60)
print("Word Form Lemmatization Test")
print("=" * 60)
print()

success = 0
failed = 0

for inflected, expected_base in test_cases:
    # 1. 检查词形映射
    mapped_base = word_forms.get(inflected)
    
    # 2. 检查基础词是否在词典中
    base_in_dict = expected_base in dictionary
    mapped_in_dict = mapped_base in dictionary if mapped_base else False
    
    status = "OK" if mapped_base == expected_base else "FAIL"
    
    if status == "OK":
        success += 1
    else:
        failed += 1
    
    print(f"[{status}] {inflected} -> {mapped_base or 'NOT FOUND'}")
    print(f"     Expected: {expected_base}")
    print(f"     Base in dict: {base_in_dict}")
    if mapped_base and mapped_base != expected_base:
        print(f"     Mapped in dict: {mapped_in_dict}")
    print()

print("=" * 60)
print(f"Results: {success} passed, {failed} failed")
print("=" * 60)
print()
print(f"Total word forms: {len(word_forms)}")
print(f"Total dictionary entries: {len(dictionary)}")

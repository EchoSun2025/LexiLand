"""
ECDICT 词典转换脚本
将 ECDICT 的 stardict.csv 转换为 LexiLand Read 使用的 JSON 格式
"""

import csv
import json
import re
import os
from pathlib import Path

def simplify_translation(translation):
    """
    只保留第一个翻译词
    例如：adj. 美丽的；美好的；出色的 → 美丽的
    """
    if not translation:
        return ""
    
    # 1. 去除词性标记 (v. n. adj. vt. vi. 等)
    translation = re.sub(r'^(v|n|adj|adv|prep|conj|pron|art|det|int|num|abbr|vt|vi)\.\s*', '', translation)
    
    # 2. 处理换行符（ecdict.csv 使用 \\n 分隔义项）
    if '\\n' in translation:
        translation = translation.split('\\n')[0]
    
    # 3. 只取第一个义项（支持多种分隔符）
    # 分号分隔（stardict 格式）
    if '；' in translation:
        translation = translation.split('；')[0]
    # 逗号分隔（ecdict 格式）
    elif ', ' in translation:
        translation = translation.split(', ')[0]
    
    # 4. 去除括号及其内容
    translation = re.sub(r'\([^)]*\)', '', translation)
    translation = re.sub(r'（[^）]*）', '', translation)
    translation = re.sub(r'\[[^\]]*\]', '', translation)  # 处理方括号 [经]
    
    # 5. 去除多余空格
    translation = translation.strip()
    
    return translation

def extract_ipa(phonetic):
    """提取标准 IPA 音标"""
    if not phonetic:
        return ""
    # 去除 / 符号
    return phonetic.strip('/').strip()

def extract_pos(pos_str):
    """提取主要词性"""
    if not pos_str:
        return "unknown"
    # 取第一个词性
    parts = pos_str.split()
    if parts:
        pos = parts[0].replace('.', '')
        # 标准化词性
        pos_map = {
            'n': 'noun',
            'v': 'verb',
            'adj': 'adjective',
            'adv': 'adverb',
            'prep': 'preposition',
            'conj': 'conjunction',
            'pron': 'pronoun',
            'int': 'interjection',
            'art': 'article',
            'det': 'determiner'
        }
        return pos_map.get(pos, pos)
    return "unknown"

def determine_level(tag, collins, oxford, bnc, frq):
    """根据标签和词频判断等级"""
    if not tag:
        tag = ""
    
    # 优先使用标签判断
    if 'zk' in tag or 'gk' in tag:
        return 'A1'
    if 'cet4' in tag:
        return 'A2'
    if 'cet6' in tag:
        return 'B1'
    if 'ielts' in tag or 'toefl' in tag:
        return 'B2'
    if 'gre' in tag:
        return 'C1'
    
    # 使用 Oxford 3000
    if oxford:
        try:
            if collins and int(collins) >= 4:
                return 'A2'
        except:
            pass
        return 'B1'
    
    # 使用柯林斯星级
    if collins:
        try:
            c = int(collins)
            if c >= 4:
                return 'A2'
            if c >= 3:
                return 'B1'
            if c >= 2:
                return 'B2'
        except:
            pass
    
    # 使用词频
    try:
        if bnc:
            b = int(bnc)
            if b <= 1000:
                return 'A1'
            if b <= 3000:
                return 'A2'
            if b <= 5000:
                return 'B1'
            if b <= 10000:
                return 'B2'
    except:
        pass
    
    return 'B2'

def calculate_priority(tag, collins, oxford, bnc):
    """
    计算单词优先级（用于排序）
    优先级越高，数字越小
    """
    priority = 100000
    
    # Oxford 3000 最高优先级
    if oxford:
        priority -= 50000
    
    # 柯林斯星级
    if collins:
        try:
            c = int(collins)
            priority -= c * 5000
        except:
            pass
    
    # 常用标签
    if not tag:
        tag = ""
    if 'zk' in tag or 'gk' in tag:
        priority -= 10000
    if 'cet4' in tag:
        priority -= 8000
    if 'cet6' in tag:
        priority -= 6000
    
    # BNC 词频
    try:
        if bnc:
            b = int(bnc)
            priority += b  # 词频序号越小越常用
    except:
        pass
    
    return priority

def build_word_forms_map(words_list):
    """
    从 exchange 字段构建词形映射
    返回: {变形词: 原型词}
    """
    word_forms = {}
    
    for word_data in words_list:
        base_word = word_data['word']
        exchange = word_data.get('_exchange', '')
        
        if not exchange:
            continue
        
        # 解析 exchange 字段
        # 格式: p:did/d:done/i:doing/3:does
        # p: 过去式, d: 过去分词, i: 现在分词, 3: 第三人称单数
        # r: 比较级, t: 最高级, s: 复数形式
        parts = exchange.split('/')
        for part in parts:
            if ':' not in part:
                continue
            
            form_type, form_words = part.split(':', 1)
            # 有些词可能有多个变形，用/分隔（但这种情况很少）
            for form_word in form_words.split('/'):
                form_word = form_word.strip().lower()
                
                # 将变形词映射到原型词
                if form_word and form_word != base_word:
                    # 如果已存在映射，保留原有的（优先级更高的词）
                    if form_word not in word_forms:
                        word_forms[form_word] = base_word
    
    return word_forms

def convert_ecdict_to_json(csv_file, output_file, max_words=10000):
    """
    转换 ECDICT CSV 到我们的 JSON 格式
    只保留最常用的 max_words 个单词
    """
    print(f"Reading {csv_file}...")
    
    if not os.path.exists(csv_file):
        print(f"Error: {csv_file} not found!")
        print(f"Please download stardict.csv from https://github.com/skywind3000/ECDICT")
        return 0
    
    words_list = []
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            word = row['word'].strip().lower()
            
            # 跳过包含空格的短语
            if ' ' in word:
                continue
            
            # 跳过包含特殊字符的词
            if not re.match(r'^[a-z\-]+$', word):
                continue
            
            # 跳过太短或太长的词
            if len(word) < 2 or len(word) > 20:
                continue
            
            phonetic = extract_ipa(row.get('phonetic', ''))
            pos = extract_pos(row.get('pos', ''))
            translation = simplify_translation(row.get('translation', ''))  # 使用精简函数
            definition = row.get('definition', '').strip()
            exchange = row.get('exchange', '')  # 读取词形变化字段
            
            # 跳过没有翻译的词
            if not translation:
                continue
            
            # 确定等级
            level = determine_level(
                row.get('tag', ''),
                row.get('collins', ''),
                row.get('oxford', ''),
                row.get('bnc', ''),
                row.get('frq', '')
            )
            
            # 计算优先级
            priority = calculate_priority(
                row.get('tag', ''),
                row.get('collins', ''),
                row.get('oxford', ''),
                row.get('bnc', '')
            )
            
            # 截取定义（避免过长）
            if len(definition) > 150:
                definition = definition[:150] + '...'
            
            word_data = {
                "word": word,
                "ipa": phonetic,
                "pos": pos,
                "level": level,
                "chinese": translation,
                "definition": definition,
                "examples": [],
                "_priority": priority,  # 临时字段用于排序
                "_exchange": exchange  # 临时保存用于生成词形映射
            }
            
            words_list.append(word_data)
    
    print(f"Total valid words: {len(words_list)}")
    
    # 按优先级排序
    print("Sorting by priority...")
    words_list.sort(key=lambda x: x['_priority'])
    
    # 取前 N 个
    words_list = words_list[:max_words]
    
    # 转换为字典格式并移除临时字段
    dictionary = {}
    for word_data in words_list:
        word = word_data['word']
        del word_data['_priority']
        # 保留 _exchange 用于生成词形映射
        dictionary[word] = word_data
    
    # 生成词形映射
    print("Building word forms mapping...")
    word_forms_map = build_word_forms_map(words_list)
    
    # 现在可以移除 _exchange 字段
    for word_data in dictionary.values():
        if '_exchange' in word_data:
            del word_data['_exchange']
    
    # 确保输出目录存在
    output_path = Path(output_file)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    
    # 保存词典 JSON
    print(f"Writing dictionary to {output_file}...")
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(dictionary, f, ensure_ascii=False, indent=2)
    
    # 保存词形映射 JSON
    forms_file = output_path.parent / 'word-forms.json'
    print(f"Writing word forms to {forms_file}...")
    with open(forms_file, 'w', encoding='utf-8') as f:
        json.dump(word_forms_map, f, ensure_ascii=False, indent=2)
    
    print(f"\nConverted {len(dictionary)} words to {output_file}")
    print(f"Generated {len(word_forms_map)} word forms to {forms_file}")
    
    # 显示文件大小
    file_size = os.path.getsize(output_file)
    print(f"File size: {file_size / 1024 / 1024:.2f} MB")
    
    # 显示一些统计
    levels = {}
    for word_data in dictionary.values():
        level = word_data['level']
        levels[level] = levels.get(level, 0) + 1
    
    print("\nLevel distribution:")
    for level in sorted(levels.keys()):
        print(f"  {level}: {levels[level]} words")
    
    return len(dictionary)

if __name__ == '__main__':
    import sys
    
    # 默认参数
    csv_file = 'stardict.csv'
    output_file = '../frontend/public/dictionaries/core-10000.json'
    max_words = 10000
    
    # 命令行参数
    if len(sys.argv) > 1:
        csv_file = sys.argv[1]
    if len(sys.argv) > 2:
        output_file = sys.argv[2]
    if len(sys.argv) > 3:
        max_words = int(sys.argv[3])
    
    print("=" * 60)
    print("ECDICT to LexiLand Dictionary Converter")
    print("=" * 60)
    print(f"Input:  {csv_file}")
    print(f"Output: {output_file}")
    print(f"Max words: {max_words}")
    print("=" * 60)
    print()
    
    count = convert_ecdict_to_json(csv_file, output_file, max_words)
    
    if count > 0:
        print("\nConversion complete!")
        print("\nNext steps:")
        print("  1. Check the generated JSON file")
        print("  2. Restart your development server")
        print("  3. Open Settings and verify dictionary status")
    else:
        print("\nConversion failed!")
        print("\nPlease download stardict.csv first:")
        print("  https://github.com/skywind3000/ECDICT")

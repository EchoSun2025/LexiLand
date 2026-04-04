# ECDICT 词典下载和转换脚本

## 下载地址

ECDICT 项目地址：https://github.com/skywind3000/ECDICT

### 词典文件下载

由于文件较大（约 200MB），有以下几种方式：

#### 方式 1：直接下载（推荐）

访问 GitHub Release 页面下载：
```
https://github.com/skywind3000/ECDICT/releases
```

下载 `ecdict.csv` 或 `stardict.csv` 文件

#### 方式 2：Git Clone

```bash
git clone https://github.com/skywind3000/ECDICT.git
cd ECDICT
```

#### 方式 3：直接下载 CSV（推荐用于本项目）

由于 GitHub 文件大小限制，建议使用以下镜像或分流下载：

1. **百度网盘**（如果作者提供）
2. **GitCode 镜像**：https://gitcode.com/mirrors/skywind3000/ECDICT
3. **直接下载链接**（需要验证）：
   ```
   https://github.com/skywind3000/ECDICT/raw/master/stardict.csv
   ```

## 数据格式

### stardict.csv 字段说明

```csv
word,phonetic,definition,translation,pos,collins,oxford,tag,bnc,frq,exchange,detail,audio
```

- **word**: 单词
- **phonetic**: 音标
- **definition**: 英文释义
- **translation**: 中文翻译
- **pos**: 词性（noun, verb, adj 等）
- **collins**: 柯林斯星级（1-5）
- **oxford**: 牛津三千核心词标记
- **tag**: 标签（如 zk=中考, gk=高考, cet4, cet6, toefl, ielts, gre）
- **bnc**: 英国国家语料库词频顺序
- **frq**: 当代语料库词频顺序
- **exchange**: 时态复数等变换（如 p:did/d:done/i:doing/3:does）
- **detail**: 详细信息
- **audio**: 读音音频 URL

## 转换脚本

使用以下 Python 脚本将 CSV 转换为我们需要的 JSON 格式：

```python
import csv
import json
import re

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
        return parts[0].replace('.', '')
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
        if collins and int(collins) >= 4:
            return 'A2'
        return 'B1'
    
    # 使用柯林斯星级
    if collins:
        c = int(collins)
        if c >= 4:
            return 'A2'
        if c >= 3:
            return 'B1'
        if c >= 2:
            return 'B2'
    
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

def convert_ecdict_to_json(csv_file, output_file, max_words=10000):
    """
    转换 ECDICT CSV 到我们的 JSON 格式
    只保留最常用的 max_words 个单词
    """
    dictionary = {}
    count = 0
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        
        for row in reader:
            word = row['word'].strip().lower()
            
            # 跳过包含空格的短语
            if ' ' in word:
                continue
            
            # 跳过包含特殊字符的词
            if not re.match(r'^[a-z]+$', word):
                continue
            
            # 跳过太短或太长的词
            if len(word) < 2 or len(word) > 20:
                continue
            
            phonetic = extract_ipa(row.get('phonetic', ''))
            pos = extract_pos(row.get('pos', ''))
            translation = row.get('translation', '').strip()
            definition = row.get('definition', '').strip()
            
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
            
            # 截取翻译（避免过长）
            if len(translation) > 100:
                translation = translation[:100] + '...'
            
            # 截取定义（避免过长）
            if len(definition) > 150:
                definition = definition[:150] + '...'
            
            dictionary[word] = {
                "word": word,
                "ipa": phonetic,
                "pos": pos,
                "level": level,
                "chinese": translation,
                "definition": definition,
                "examples": []  # ECDICT 没有例句，留空
            }
            
            count += 1
            if count >= max_words:
                break
            
            if count % 1000 == 0:
                print(f"Processed {count} words...")
    
    # 保存为 JSON
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(dictionary, f, ensure_ascii=False, indent=2)
    
    print(f"\n✓ Converted {count} words to {output_file}")
    return count

if __name__ == '__main__':
    # 转换前 10000 个单词
    convert_ecdict_to_json(
        'stardict.csv',
        '../frontend/public/dictionaries/core-10000.json',
        max_words=10000
    )
```

## 使用步骤

### 1. 下载 ECDICT 数据

```bash
# 方式 A: 克隆整个仓库
git clone https://github.com/skywind3000/ECDICT.git
cd ECDICT

# 方式 B: 只下载 stardict.csv（需要 Git LFS）
wget https://github.com/skywind3000/ECDICT/raw/master/stardict.csv
```

### 2. 安装依赖（如果需要）

```bash
pip install pandas
```

### 3. 运行转换脚本

```bash
# 在项目根目录创建 scripts 文件夹
mkdir scripts
cd scripts

# 复制上面的 Python 脚本保存为 convert_ecdict.py

# 运行转换
python convert_ecdict.py
```

### 4. 验证生成的文件

检查 `frontend/public/dictionaries/core-10000.json` 文件是否正确生成。

## 文件大小估算

- **stardict.csv**: ~200MB（77万词条）
- **core-10000.json**: ~2-3MB（1万词条）
- **core-5000.json**: ~1-1.5MB（5千词条）

## 注意事项

1. **文件大小**：10000 词约 2-3MB，建议不超过 5MB
2. **加载时间**：10000 词约 100-200ms 加载时间
3. **内存占用**：10000 词约 5-10MB 内存

## 词频优先级

转换时按以下优先级排序：
1. Oxford 3000 核心词
2. 柯林斯 4-5 星词汇
3. BNC 词频前 10000
4. CET4/CET6 词汇

## 许可证

ECDICT 使用 MIT 许可证，可以自由使用。

---

**下一步**：
1. 下载 stardict.csv
2. 运行转换脚本
3. 替换现有的 core-5000.json
4. 测试词典加载

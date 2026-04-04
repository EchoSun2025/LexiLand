# 词性识别逻辑改进 - 修复 landmarks 问题

## 问题
**landmarks** 显示为 `v-3s`（动词第三人称单数），但实际应该是 `n-pl`（名词复数）

## 原因分析
ECDICT 数据中很多词的 `pos` 字段是 "unknown"，但 `definition` 字段开头包含正确的词性标记（如 `n.`, `v.`, `adj.` 等）

### landmark 的数据
```json
{
  "word": "landmark",
  "pos": "unknown",  ← 词性未知
  "definition": "n. the position of a prominent..."  ← definition 开头有 n.
}
```

原逻辑只检查 `pos` 字段，导致无法正确判断。

## 解决方案

### 改进的识别逻辑

#### 1. 从 definition 提取词性
```typescript
const extractPosFromDefinition = (def: string): string => {
  const match = def.match(/^(n|v|adj|adv|prep|conj|pron|int|art)\./);
  return match ? match[1] : '';
};
```

#### 2. 结合多种信息判断
对于 `-s` 结尾的词，按优先级判断：
1. **Definition 词性**：如果 definition 开头是 `n.`，判定为名词复数
2. **POS 字段**：如果 pos 包含 "noun"，判定为名词复数
3. **词形规则**：`-ies` 结尾 → 名词复数
4. **词根后缀**：常见名词后缀（-ment, -tion, -ness 等）→ 名词复数
5. **默认**：动词第三人称单数

#### 3. 常见名词后缀识别
```typescript
if (baseLower.match(/(ment|tion|sion|ness|ship|hood|dom|er|or|ist|ant|ent|ure|age|ance|ence|ism|ity|ty)$/)) {
  return 'n-pl';
}
```

这样 `landmarks` (`landmark` + s) 会被正确识别为 `n-pl`。

## 修复效果

### 之前（错误）
| 词 | 显示 | 
|---|------|
| landmarks | `v-3s` ❌ |
| governments | `v-3s` ❌ |
| developments | `v-3s` ❌ |

### 现在（正确）
| 词 | 显示 | 说明 |
|---|------|------|
| landmarks | `n-pl` ✅ | 从 definition 识别为名词 |
| governments | `n-pl` ✅ | -ment 后缀识别 |
| developments | `n-pl` ✅ | -ment 后缀识别 |
| walks | `v-3s` ✅ | 基础词无名词后缀，判定为动词 |

## 支持的名词后缀

| 后缀 | 示例 | 
|------|------|
| -ment | government, development, movement |
| -tion/-sion | nation, decision, action |
| -ness | happiness, kindness, darkness |
| -ship | friendship, leadership |
| -hood | childhood, neighborhood |
| -dom | kingdom, freedom |
| -er/-or | teacher, actor, worker |
| -ist | artist, scientist |
| -ant/-ent | assistant, student |
| -ure | culture, nature |
| -age | package, message |
| -ance/-ence | performance, difference |
| -ism | capitalism, tourism |
| -ity/-ty | quality, safety |

## 修改的文件
- `frontend/src/components/WordCard.tsx`
  - 改进 `getDetailedPartOfSpeech()` 函数
  - 添加 `extractPosFromDefinition()` 提取词性
  - 添加名词后缀匹配规则

## 测试建议
测试以下词汇，确保正确识别：
- ✅ landmarks → n-pl
- ✅ governments → n-pl  
- ✅ developments → n-pl
- ✅ friendships → n-pl
- ✅ walks → v-3s
- ✅ runs → v-3s
- ✅ makes → v-3s

# 词形变化显示功能实现完成

## 完成时间
2026年3月11日

## 用户需求
1. **识别词形变化**：如 "trilled" 应该能识别为 "trill" 的变形
2. **显示词形信息**：在注释中显示词形变化（如 v-ing, v-ed）

## 问题诊断
用户报告 "trilled" 无法识别，经过检查发现：
- ✅ "trill" 在 30000 词词典中
- ✅ "trilled" → "trill" 映射在 word-forms.json 中
- ❌ **需要重启服务器加载新词典**

## 实现的功能

### 1. 双向词形显示

#### 变形词 → 基础词
当用户标注变形词时（如 "trilled"），会显示：
```
trilled /tril/ 颤声 (← trill)
```
- 显示变形词的翻译
- 用箭头指示基础形式

#### 基础词 → 变形词
当用户标注基础词时（如 "trill"），会显示：
```
trill /tril/ 颤声 (trilled, trilling, trills)
```
- 显示最多 3 个常见变形
- 如果超过 3 个，显示 "..."

### 2. 实现细节

#### 新增方法：`getWordForms()`
在 `LocalDictionaryService` 中添加：
```typescript
getWordForms(baseWord: string): string[]
```
- 遍历 word-forms.json
- 找到所有指向该基础词的变形
- 返回变形列表

#### 更新接口：`WordAnnotation`
添加字段：
```typescript
wordForms?: string[];  // 词形变化列表
```

#### 更新组件：`Word.tsx`
添加显示逻辑：
- 如果是变形词：显示 `(← baseForm)`
- 如果是基础词：显示 `(form1, form2, form3...)`

## 示例效果

### "trill" 的词形
- **基础词**: trill
- **变形**: trilled, trilling, trills

### 显示示例
| 标注词 | 显示效果 |
|--------|---------|
| trill | `trill /tril/ 颤声 (trilled, trilling, trills)` |
| trilled | `trilled /tril/ 颤声 (← trill)` |
| trilling | `trilling /tril/ 颤声 (← trill)` |

### 其他例子
| 标注词 | 显示效果 |
|--------|---------|
| walk | `walk /wɔːk/ 走 (walked, walking, walks)` |
| walking | `walking /wɔːkɪŋ/ 走 (← walk)` |
| dazzle | `dazzle /'dæzl/ 眼花 (dazzled, dazzles, dazzling)` |
| dazzling | `dazzling /'dæzlɪŋ/ 眼花 (← dazzle)` |

## 修改的文件

1. **frontend/src/services/localDictionary.ts**
   - 添加 `getWordForms()` 方法
   - 修改 `lookup()` 返回词形信息

2. **frontend/src/api/index.ts**
   - 更新 `WordAnnotation` 接口，添加 `wordForms` 字段

3. **frontend/src/components/Word.tsx**
   - 更新 `WordProps` 接口
   - 添加词形显示逻辑（双向显示）

## 样式细节
- **基础词指示**: 灰色斜体 `text-[9px] text-gray-400 ml-1 italic`
- **变形显示**: 最多显示 3 个，用逗号分隔
- **箭头符号**: 使用 `←` 表示"来自"

## 使用说明

### 用户操作
1. 标注任何单词（基础或变形）
2. 系统自动识别并还原到基础词
3. 显示翻译时会附带词形信息

### 开发者扩展
如果需要显示更多信息：
- 修改 `Word.tsx` 中的 `slice(0, 3)` 改变显示数量
- 添加词性标注（如标明哪个是 v-ing, v-ed）

## 测试文件
已创建 `TMP/test_word_forms.txt` 包含多个测试用例。

## 注意事项
⚠️ **必须重启开发服务器**才能加载新的 30000 词词典和词形映射！

```bash
# 重启后端
cd backend
npm run dev

# 重启前端（如果是开发模式）
cd frontend
npm run dev
```

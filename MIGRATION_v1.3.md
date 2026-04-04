# 数据迁移指南 - v1.2 到 v1.3

## 概述

v1.3 版本引入了新的数据字段和 LLIF 通用格式，但**完全向后兼容** v1.2 的数据。

## 自动迁移

### 什么会自动迁移？

✅ **无需任何操作**，以下内容会自动处理：

1. **字段名称统一**
   - 旧的 `sentence` 字段 → 自动识别为 `sentenceContext`
   - 导入旧数据时自动转换

2. **新增字段**
   - `documentTitle` 字段为可选，旧数据没有也不影响
   - 新标注的单词和短语会自动添加 `documentTitle`

3. **IndexedDB 升级**
   - 数据库版本保持 v4，无需重建
   - 新字段向后兼容

### 验证迁移

1. 导入旧的 JSON 备份文件
2. 打开浏览器控制台（F12）
3. 查看是否有错误信息
4. 双击已有的单词，查看 Word Card 是否正常显示

## 手动迁移（可选）

### 何时需要手动迁移？

如果您希望：
- 将旧数据完全转换为 LLIF 格式
- 清理数据库中的冗余字段
- 为旧数据添加 `documentTitle` 信息

### 迁移步骤

#### 1. 导出当前数据

```
1. 打开 LexiLand Read
2. 点击 "Export Data" → "Export All Data (JSON)"
3. 保存为 backup-v1.2.json
```

#### 2. 导出 LLIF 格式

```
1. 右键 "Export Data" → "Export LLIF (Universal)"
2. 保存为 data-llif-v1.0.json
```

#### 3. 清空数据库（可选）

如果要从头开始：

```javascript
// 打开浏览器控制台（F12）
// 执行以下代码
indexedDB.deleteDatabase('LexiLandDB');
// 刷新页面
```

#### 4. 导入 LLIF 数据

> ⚠️ **注意**：v1.3 暂不支持导入 LLIF 格式，此功能将在 v1.4 中添加

目前可以导入旧的 JSON 格式：

```
1. 点击 "Import Data"
2. 选择 backup-v1.2.json
3. 等待导入完成
```

## 数据格式对比

### 单词注释（Word Annotation）

#### 旧格式 (v1.2)

```json
{
  "word": "investigate",
  "ipa": "ɪnˈvestɪɡeɪt",
  "chinese": "调查；研究",
  "definition": "...",
  "sentence": "Perhaps we should investigate",
  "cachedAt": "2026-02-10T12:00:00.000Z"
}
```

#### 新格式 (v1.3 - 内部)

```json
{
  "word": "investigate",
  "ipa": "ɪnˈvestɪɡeɪt",
  "chinese": "调查；研究",
  "definition": "...",
  "sentence": "Perhaps we should investigate",
  "documentTitle": "The Mystery",
  "cachedAt": "2026-02-10T12:00:00.000Z"
}
```

> 注意：`sentence` 字段保留以兼容旧代码，导出时使用 `sentenceContext`

#### LLIF 格式 (v1.0)

```json
{
  "type": "word",
  "language": "en",
  "content": {
    "word": "investigate",
    "pronunciation": { "ipa": "ɪnˈvestɪɡeɪt" }
  },
  "translations": [
    { "language": "zh-CN", "text": "调查；研究" }
  ],
  "context": {
    "sentenceContext": "Perhaps we should investigate",
    "documentTitle": "The Mystery"
  },
  "metadata": {
    "addedAt": "2026-02-10T12:00:00.000Z"
  }
}
```

### 短语注释（Phrase Annotation）

#### 旧格式 (v1.2)

```json
{
  "phrase": "overcome her fear",
  "chinese": "克服她的恐惧",
  "sentenceContext": "her curiosity overcoming her fear",
  "cachedAt": "2026-02-10T12:00:00.000Z"
}
```

#### 新格式 (v1.3)

```json
{
  "phrase": "overcome her fear",
  "chinese": "克服她的恐惧",
  "sentenceContext": "her curiosity overcoming her fear",
  "documentTitle": "The Mystery",
  "cachedAt": "2026-02-10T12:00:00.000Z"
}
```

## 常见问题

### Q1: 旧数据会丢失吗？

**不会！** v1.3 完全兼容 v1.2 的数据格式。

### Q2: 需要重新标注所有单词吗？

**不需要。** 旧的单词和短语都可以正常使用，只是缺少 `documentTitle` 字段。

### Q3: 如何为旧数据添加 `documentTitle`？

目前没有自动方法。新标注的单词和短语会自动添加 `documentTitle`。

### Q4: LLIF 格式可以导入吗？

v1.3 暂不支持，计划在 v1.4 中添加。

### Q5: 我应该删除旧数据吗？

**不需要。** 除非您遇到了数据库问题，否则保留旧数据即可。

## 回滚到 v1.2

如果遇到问题，可以回滚到旧版本：

1. 导出当前数据（备份）
2. 下载 v1.2 版本代码
3. 启动 v1.2 版本
4. 导入备份数据

> 注意：回滚后，v1.3 新增的 `documentTitle` 字段会被忽略，但不会丢失。

## 数据库版本历史

| 版本 | DB Version | 主要变更 |
|------|------------|----------|
| v1.0 | 2 | 初始版本 |
| v1.1 | 3 | 添加 phraseAnnotations 表 |
| v1.2 | 4 | 添加 sentence, documentTitle 字段 |
| v1.3 | 4 | 添加 documentTitle 到 phraseAnnotations，字段可选 |

## 最佳实践

1. **定期备份**
   - 每周导出一次 "Export All Data (JSON)"
   - 每月导出一次 "Export LLIF (Universal)"

2. **测试新版本**
   - 在另一个浏览器中测试 v1.3
   - 确认无误后再升级主浏览器

3. **保留旧备份**
   - 至少保留最近 3 个月的备份
   - 旧备份可以用于紧急恢复

---

**版本**：v1.3  
**更新日期**：2026-02-10  
如有问题，请查看 [FEATURES_v1.3.md](./FEATURES_v1.3.md) 或提交 Issue。

# LexiLand Read - 标签系统逻辑说明

## 📋 单词标签系统

### 1️⃣ **Known Words (已认识的词)** 🎓
- **定义**: 用户已经掌握的基础词汇
- **来源**: 
  - 预加载：基础词汇 3000 词（从 JSON 文件加载）
  - 用户添加：点击 "Mark All Unmarked as Known"
- **显示**: 无任何标记（正常黑色文字）
- **存储**: IndexedDB (`knownWords` 表)
- **用途**: 过滤显示，这些词不会被标注

---

### 2️⃣ **Annotated Words (已标注的词)** 🟠
- **定义**: 已生成 Word Card 的单词（有音标、翻译、例句等完整信息）
- **触发**: 
  1. 单词变成绿色（marked）
  2. 点击 "Annotate" 按钮
  3. AI 生成完整的 Word Card
- **显示**: 
  - **橙色背景** (`bg-orange-100`)
  - 下方显示音标和中文翻译（如果打开对应开关）
  - **双击**可打开 Word Card
- **存储**: IndexedDB (`annotations` 表)
- **数据**: word, baseForm, ipa, chinese, definition, example, level, partOfSpeech

---

### 3️⃣ **Learnt Words (已记住的词)** ✅
- **定义**: 用户标记为"已掌握"的词（从 annotated 词中标记）
- **触发**: 
  1. 打开橙色词的 Word Card
  2. 点击卡片中的 "✓ Mark as Known" 按钮
- **显示**: 
  - **橙色 30% 透明** (`bg-orange-100/30`) - 更淡
  - **隐藏**音标和翻译注释
  - 按钮变为橙色 "✓ Known"
- **切换**: 再次点击可取消"已记住"状态
- **存储**: IndexedDB (`learntWords` 表)
- **用途**: 视觉反馈，标记学习进度

---

### 4️⃣ **Marked Words (标记的词)** 🟢
- **定义**: 临时标记为待处理的单词
- **触发**: 单击未标注的单词
- **显示**: **绿色背景** (`bg-green-100`)
- **用途**: 批量标注前的临时选择
- **存储**: 仅在内存中 (`markedWords` state)
- **清除**: 点击 "Annotate" 后自动清除

---

## 🎯 短语标签系统

### 5️⃣ **Phrase Marked (选择中的短语)** 🔵
- **定义**: 光标拖选的临时短语
- **触发**: 鼠标拖动选择 2 个或以上 token
- **显示**: 
  - **蓝色下划线** 35% 透明 (`border-blue-500/35`)
  - 悬停时变为 100% 不透明
- **存储**: 仅在内存中 (`phraseMarkedRanges` state)
- **清除**: 点击 "Annotate" 后自动清除

---

### 6️⃣ **Annotated Phrases (已标注的短语)** 🟣
- **定义**: 已生成 Phrase Card 的短语（有翻译和解释）
- **触发**: 
  1. 拖选短语（变蓝色下划线）
  2. 点击 "Annotate" 按钮
  3. AI 生成 Phrase Card（翻译 + 解释）
- **显示**: 
  - **紫色下划线** 35% 透明 (`border-purple-500/35`)
  - 悬停整个短语时变为 100% 不透明
  - **双击**可打开 Phrase Card
  - 点击 "Insert" 后，翻译显示在短语末尾（灰色小字）
- **存储**: 
  - IndexedDB (`phraseAnnotations` 表)
  - 位置信息在加载时自动重建
- **数据**: phrase, chinese, explanation, sentenceContext

---

## 🎨 颜色总览

| 状态 | 颜色/样式 | 透明度 | 交互 |
|------|-----------|--------|------|
| Known | 无标记 | - | 无 |
| Marked | 绿色背景 | 100% | 单击切换 |
| Annotated | 橙色背景 | 100% | 双击打开卡片 |
| Learnt | 橙色背景 | 30% | 双击打开卡片 |
| Phrase Marked | 蓝色下划线 | 35%→100%(hover) | 拖选 |
| Annotated Phrase | 紫色下划线 | 35%→100%(hover) | 双击打开卡片 |

---

## 🔄 状态转换流程

### 单词流程：
```
普通词 
  → [单击] → Marked (绿色)
  → [点击Annotate] → Annotated (橙色100%)
  → [Mark as Known] → Learnt (橙色30%)
  → [再次点击] → Annotated (橙色100%)
```

### 短语流程：
```
普通文本
  → [拖选] → Phrase Marked (蓝色下划线)
  → [点击Annotate] → Annotated Phrase (紫色下划线)
  → [点击Insert] → 显示翻译
  → [再次点击Insert] → 隐藏翻译
```

---

## 📊 数据持久化

| 数据类型 | 存储位置 | 版本 | 导出/导入 |
|---------|---------|------|----------|
| knownWords | IndexedDB | v3 | ✅ JSON |
| learntWords | IndexedDB | v3 | ✅ JSON |
| annotations | IndexedDB | v3 | ✅ JSON |
| phraseAnnotations | IndexedDB | v3 | ✅ JSON |
| markedWords | 内存 (state) | - | ❌ |
| phraseMarkedRanges | 内存 (state) | - | ❌ |
| annotatedPhraseRanges | 运行时重建 | - | ❌ |

---

## 🆕 最近开发的功能

### Sprint: Phrase Annotation Feature (短语标注功能)

#### 已完成：
1. ✅ **短语选择与标注**
   - 拖选 2+ 单词创建短语
   - 蓝色下划线标识选择中的短语
   - Annotate 按钮支持短语标注

2. ✅ **Phrase Card**
   - AI 生成短语翻译（基于句子上下文）
   - 固定短语/习惯用语的解释
   - 显示句子上下文
   - Insert 按钮控制翻译显示

3. ✅ **持久化存储**
   - 短语数据保存到 IndexedDB
   - Export/Import 支持短语数据
   - 页面刷新后自动恢复紫色下划线

4. ✅ **UI/UX 优化**
   - 紫色下划线 35% 透明度（更低调）
   - 悬停整个短语时同步高亮（100% 不透明）
   - 双击短语打开 Phrase Card
   - 翻译文字使用灰色（与单词翻译一致）

5. ✅ **已标注短语与橙色词共存**
   - 橙色背景 + 紫色下划线
   - 独立的显示逻辑
   - 无冲突

6. ✅ **开发工具**
   - `start-dev.ps1` - 一键启动前后端
   - `stop-dev.ps1` - 一键停止服务
   - `HOW_TO_RUN.md` - 详细启动指南

---

## 🎯 下一步开发建议

### 优先级 1: 核心功能完善
- [ ] 删除 Phrase Card 后自动移除紫色下划线
- [ ] 支持编辑已有的 Phrase Card
- [ ] 短语搜索和过滤功能

### 优先级 2: 用户体验提升
- [ ] 键盘快捷键支持
- [ ] 批量操作（批量删除、批量导出）
- [ ] 学习统计面板

### 优先级 3: 高级功能
- [ ] AI 生成例句
- [ ] 发音功能（单词和短语）
- [ ] 复习模式（间隔重复）

---

## 💡 使用建议

### 单词学习流程：
1. 打开文档，自动标记生词（橙色）
2. 双击橙色词查看 Word Card
3. 学习后点击 "Mark as Known"（变淡橙色）
4. 已掌握的词视觉弱化，专注未掌握的词

### 短语学习流程：
1. 阅读时遇到不懂的短语
2. 拖选短语（蓝色下划线）
3. 点击 "Annotate" 生成翻译
4. 短语变紫色下划线（已保存）
5. 需要时点击 "Insert" 在原文中显示翻译
6. 双击紫色短语重新查看解释

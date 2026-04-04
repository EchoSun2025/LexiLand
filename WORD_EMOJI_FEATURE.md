# 单词卡 Emoji 功能实现完成

## 完成时间
2026年3月11日

## 功能描述
为每个单词卡的单词旁边添加对应的 emoji 表情，让单词更生动形象，帮助记忆。

## 显示效果

### 单词卡示例

#### 常见单词
```
┌─────────────────────────────┐
│  ☀️ sun                      │
│  /sʌn/  A1  n               │
│  中文：太阳                  │
└─────────────────────────────┘

┌─────────────────────────────┐
│  🐱 cat                      │
│  /kæt/  A1  n               │
│  中文：猫                    │
└─────────────────────────────┘

┌─────────────────────────────┐
│  😊 happy                    │
│  /'hæpi/  A2  adj           │
│  中文：快乐的                │
└─────────────────────────────┘

┌─────────────────────────────┐
│  🏃 running (from: run)      │
│  /rʌn/  A1  v-ing           │
│  中文：跑                    │
└─────────────────────────────┘
```

## Emoji 匹配规则

### 1. 直接单词匹配（最精确）
拥有 **200+ 常见单词** 的直接映射：

| 类别 | 示例 |
|------|------|
| **自然天气** | sun☀️, moon🌙, star⭐, cloud☁️, rain🌧️, snow❄️ |
| **动物** | cat🐱, dog🐶, bird🐦, fish🐟, lion🦁, tiger🐯 |
| **食物** | apple🍎, banana🍌, coffee☕, pizza🍕, cake🍰 |
| **情感** | happy😊, sad😢, love❤️, smile😄, laugh😂 |
| **交通** | car🚗, bus🚌, train🚂, plane✈️, bike🚲 |
| **建筑** | home🏠, school🏫, hospital🏥, city🏙️ |
| **学习** | book📖, read📚, write✍️, study📝, learn🎓 |
| **科技** | computer💻, phone📱, internet🌐, email📧 |
| **运动** | play🎮, game🎯, ball⚽, music🎵, dance💃 |
| **动作** | walk🚶, run🏃, fly✈️, stop🛑, open🔓 |

### 2. 中文翻译匹配
如果单词本身没有映射，根据中文翻译匹配：

| 中文 | Emoji | 示例词 |
|------|-------|--------|
| 太阳 | ☀️ | sunlight |
| 猫 | 🐱 | kitten |
| 笑 | 😊 | grin |
| 书 | 📖 | textbook |
| 车 | 🚗 | vehicle |

### 3. Definition 关键词匹配
从英文释义中提取关键词：
- Definition 包含 "sun" → ☀️
- Definition 包含 "cat" → 🐱
- Definition 包含 "happy" → 😊

### 4. 词性默认 Emoji
如果以上都不匹配，根据词性显示默认图标：

| 词性 | Emoji | 含义 |
|------|-------|------|
| 名词 (n) | 📦 | 盒子（事物） |
| 名词复数 (n-pl) | 📦 | 盒子 |
| 动词 (v) | ⚡ | 闪电（动作） |
| 现在分词 (v-ing) | ⚡ | 闪电 |
| 过去式 (v-ed) | ⚡ | 闪电 |
| 三单 (v-3s) | ⚡ | 闪电 |
| 形容词 (adj) | ✨ | 星星（描述） |
| 比较级 (adj-comp) | ✨ | 星星 |
| 最高级 (adj-sup) | ✨ | 星星 |
| 副词 (adv) | 💫 | 流星 |
| 介词 (prep) | 📍 | 位置 |
| 连词 (conj) | 🔗 | 链接 |
| 代词 (pron) | 👤 | 人影 |
| 感叹词 (int) | ❗ | 感叹号 |

### 5. 完全未知
如果连词性都不确定：📝（笔记本）

## 实现细节

### 核心函数：`getWordEmoji()`
```typescript
function getWordEmoji(annotation: WordAnnotation): string {
  // 1. 直接匹配单词/基础形式
  // 2. 匹配中文翻译
  // 3. 匹配 definition 关键词
  // 4. 根据词性返回默认 emoji
  // 5. 兜底：📝
}
```

### 匹配优先级
```
直接单词匹配 (200+ 词)
    ↓ 未匹配
中文翻译匹配
    ↓ 未匹配
Definition 关键词
    ↓ 未匹配
词性默认图标
    ↓ 未匹配
📝 (笔记本)
```

## 示例展示

### 具体单词
| 单词 | Emoji | 匹配方式 |
|------|-------|---------|
| sun | ☀️ | 直接匹配 |
| running | 🏃 | 基础词 run |
| happiness | 😊 | 关键词 happy |
| landmarks | 📦 | 词性 n-pl |
| beautiful | ✨ | 直接匹配 |
| quickly | 💫 | 词性 adv |
| unknown | 📝 | 完全未知 |

### 不同词性的同一基础词
| 词 | 词性 | Emoji | 说明 |
|----|------|-------|------|
| run | v | 🏃 | 直接匹配 |
| running | v-ing | 🏃 | 基础词匹配 |
| runs | v-3s | 🏃 | 基础词匹配 |

## 用户体验提升

### 记忆辅助
- ✅ 视觉化单词含义
- ✅ emoji 增强记忆点
- ✅ 更有趣的学习体验

### 快速识别
- ✅ 一眼看出单词类别
- ✅ emoji 作为视觉锚点
- ✅ 区分同形异义词

## 技术实现

### 文件修改
- **frontend/src/components/WordCard.tsx**
  - 新增 `getWordEmoji()` 函数（200+ 单词映射）
  - 修改单词标题显示部分
  - 添加 flex 布局显示 emoji

### 样式调整
```tsx
<h3 className="flex items-center justify-center gap-2">
  <span className="text-3xl">{getWordEmoji(annotation)}</span>
  <span>{annotation.word}</span>
</h3>
```

## 扩展性

### 添加新单词映射
在 `emojiMap` 中添加：
```typescript
const emojiMap: Record<string, string> = {
  'newword': '🆕',
  // ...
};
```

### 添加新中文映射
在 `chineseEmojiMap` 中添加：
```typescript
const chineseEmojiMap: Record<string, string> = {
  '新词': '🆕',
  // ...
};
```

### 自定义词性图标
在 `posEmojiMap` 中修改：
```typescript
const posEmojiMap: Record<string, string> = {
  'n': '🎯',  // 改为其他图标
  // ...
};
```

## 注意事项
- ✅ Emoji 大小固定为 3xl (text-3xl)
- ✅ 与单词间距为 gap-2
- ✅ 支持所有词形变化
- ✅ 回退机制完善
- ⚠️ 不同系统 emoji 显示可能略有差异

## 未来优化
1. 用户自定义 emoji（允许用户编辑）
2. 更多单词映射（扩展到 500+）
3. AI 生成 emoji（根据 definition）
4. emoji 动画效果

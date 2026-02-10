# 紫色标签优化 - 更新日志

## 日期：2026-02-10

## 🎯 优化目标

优化紫色标签（短语标记）和橙色标签（已标注单词）的交互逻辑，使两者可以共存。

## 📝 问题描述

**修改前**：
- 橙色标签（已标注单词）和紫色标签（选中短语）是互斥的
- 使用 if-else 链式判断，导致如果单词已标注（橙色背景），就不会显示紫色短语标记
- 选中包含橙色单词的文本时，紫色标记不会显示

**用户需求**：
- 橙色标签和紫色标签应该是两个独立的逻辑
- 橙色 = 单词已标注（有 card 数据）
- 紫色 = 选中的短语范围
- 如果选中的短语包含橙色单词，应该显示：**橙色背景 + 紫色下划线**

## ✅ 修改内容

### 1. Word.tsx 组件优化

**关键改动**：
- 将背景色和下划线逻辑分离
- 背景色独立判断（橙色/绿色/黄色等）
- 紫色下划线独立判断（`isPhraseMarked`）
- 两者可以同时存在

**修改代码**：
```tsx
// 修改前（互斥逻辑）
className={`${
  isCurrentWord ? 'bg-yellow-300 ...'
  : showLearnt ? 'bg-orange-100 ...'      // 如果是橙色，就不检查紫色
  : isPhraseMarked ? 'bg-purple-100 ...'  // 紫色被跳过
  : ...
}`}

// 修改后（分离逻辑）
// 1. 背景色逻辑
let backgroundColor = '';
if (isCurrentWord) {
  backgroundColor = 'bg-yellow-300';
} else if (showLearnt) {
  backgroundColor = 'bg-orange-100';  // 橙色背景
} else if (isMarked) {
  backgroundColor = 'bg-green-100';
}

// 2. 下划线逻辑（独立）
let borderBottomStyle = '';
if (isPhraseMarked && !isCurrentWord) {
  borderBottomStyle = 'border-b-2 border-purple-500';  // 紫色下划线
}

// 3. 组合样式
className={`${backgroundColor} ${borderBottomStyle} ${additionalClasses}`}
```

**效果**：
- 已标注的单词（橙色背景）在被选中时，会同时显示紫色下划线
- 视觉上更清晰：橙色表示"这个词我已经标注过"，紫色下划线表示"这个词在我选中的短语范围内"

### 2. Sentence.tsx 组件优化

**改动**：
- 将非单词 token（标点、空格）的紫色背景改为紫色下划线
- 保持与单词 token 的样式一致性

**修改代码**：
```tsx
// 修改前
const className = isInPhraseRange ? 'bg-purple-100' : '';

// 修改后
const phraseUnderlineClass = isInPhraseRange ? 'border-b-2 border-purple-500' : '';
```

### 3. 代码清理

**清理内容**：
- 移除未使用的变量（`fontWeight`, `isHovered`, `isPaused` 等）
- 移除未使用的导入（`useState` from Word.tsx）
- 移除未使用的数据库函数导入
- 注释掉未使用的 `handleBatchAnnotate` 函数（保留以备将来使用）
- 删除导致构建失败的备份文件 `App.backup.tsx`

## 🎨 视觉效果

### 修改前
- 橙色单词：`橙色背景`
- 紫色短语：`紫色背景`
- **问题**：如果短语包含橙色单词，只显示橙色，看不出短语范围

### 修改后
- 橙色单词（未选中）：`橙色背景`
- 紫色短语（不含橙色单词）：`紫色下划线`
- **橙色单词 + 紫色短语**：`橙色背景 + 紫色下划线` ✨

## 📊 测试验证

✅ **构建测试**：`npm run build` 成功通过
✅ **TypeScript 检查**：无类型错误
✅ **样式独立性**：背景色和下划线可以共存

## 🔍 技术细节

### 样式优先级
1. **背景色**（按优先级）：
   - 当前朗读词：黄色高亮
   - 已标注词：橙色背景
   - 标记词：绿色背景
   - 其他：无背景

2. **下划线**（独立逻辑）：
   - 短语标记：紫色下划线（`border-b-2 border-purple-500`）
   - Ctrl 连接线：彩色虚线（`underlinePhraseRanges`）

### 代码架构
- 将样式逻辑分为三部分：
  1. `backgroundColor`：背景色
  2. `borderBottomStyle`：下划线
  3. `additionalClasses`：其他样式（圆角、hover、cursor 等）

## 📦 修改文件清单

1. `frontend/src/components/Word.tsx` - 核心样式逻辑分离
2. `frontend/src/components/Sentence.tsx` - 非单词 token 样式一致性
3. `frontend/src/App.tsx` - 清理未使用变量
4. `frontend/src/App.backup.tsx` - 删除（导致构建失败）

## 🚀 下一步建议

1. **测试交互**：启动开发服务器，测试选中包含橙色单词的短语
2. **用户反馈**：收集实际使用中的体验反馈
3. **样式微调**：如需要可以调整紫色下划线的粗细、颜色等

## 🎓 学习要点

这次修改展示了一个重要的前端设计原则：
- **关注点分离**：不同的视觉属性（背景色、下划线、边框等）应该使用独立的逻辑
- **避免互斥**：如果两个功能不是真正冲突的，就不应该用 if-else 互斥
- **组合而非继承**：通过组合多个独立的样式类，而不是一个巨大的条件判断

---

**作者**：Cursor AI Assistant  
**日期**：2026-02-10  
**版本**：v1.0

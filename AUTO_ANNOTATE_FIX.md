# 自动标注时机修复

## 问题
之前的实现：点击标记一个词后，要等到标记**下一个词**才会触发上一个词的标注。

### 原因
使用 `setTimeout` 时，`markedWords` 状态还未更新完成，导致：
1. 点击词 A → 标记 A
2. `setTimeout` 触发 `handleAnnotate` → 但此时 `markedWords` 还是空的
3. 点击词 B → 标记 B 
4. 现在 `markedWords` 包含 A → 触发标注 A ❌

## 解决方案
使用 `useEffect` 监听 `markedWords.size` 变化，当大小增加时立即触发标注。

### 实现细节

#### 1. 添加 ref 追踪
```typescript
const prevMarkedWordsSize = useRef<number>(0);
```

#### 2. useEffect 监听变化
```typescript
useEffect(() => {
  // 只在标记词增加时触发（不在减少时触发）
  if (autoAnnotate && 
      markedWords.size > prevMarkedWordsSize.current && 
      markedWords.size > 0 && 
      !isLoadingAnnotation) {
    handleAnnotate(true); // 静默标注
  }
  prevMarkedWordsSize.current = markedWords.size;
}, [markedWords.size]);
```

#### 3. 移除 handleWordClick 中的 setTimeout
```typescript
// Add mark
setMarkedWords(prev => new Set(prev).add(normalized));
// useEffect 会自动触发标注 ✓
```

## 执行流程

### 修复后的流程
```
用户点击词 A
  ↓
setMarkedWords 更新状态
  ↓
React 重新渲染
  ↓
useEffect 检测到 markedWords.size 增加
  ↓
立即触发 handleAnnotate(true)
  ↓
标注词 A
  ↓
词 A 变橙色 ✓
```

### 关键优势
✅ **立即响应**：状态更新后马上触发
✅ **避免竞态**：使用 React 的渲染周期
✅ **精确控制**：只在增加时触发，减少时不触发

## 对比

### 之前（错误）
| 操作 | markedWords | 触发标注 | 结果 |
|------|-------------|---------|------|
| 点击词 A | {} | {} | ❌ 未标注 |
| 点击词 B | {A} | {A} | ✅ 标注 A |
| 点击词 C | {B} | {B} | ✅ 标注 B |

### 现在（正确）
| 操作 | markedWords | 触发标注 | 结果 |
|------|-------------|---------|------|
| 点击词 A | {A} | {A} | ✅ 立即标注 A |
| 点击词 B | {B} | {B} | ✅ 立即标注 B |
| 点击词 C | {C} | {C} | ✅ 立即标注 C |

## 技术要点

### 为什么用 size 而不是整个 Set？
```typescript
// ❌ 这样会导致每次 Set 变化都触发
useEffect(() => { ... }, [markedWords]);

// ✅ 只监听数量变化，性能更好
useEffect(() => { ... }, [markedWords.size]);
```

### 为什么用 ref 追踪？
- `prevMarkedWordsSize.current` 不会触发重新渲染
- 可以在 `useEffect` 中比较新旧值
- 避免循环依赖

### 为什么检查 isLoadingAnnotation？
防止在标注进行中重复触发：
```typescript
if (!isLoadingAnnotation) {
  // 只在空闲时触发
}
```

## 修改的文件
- **frontend/src/App.tsx**
  - 添加 `prevMarkedWordsSize` ref
  - 添加 `useEffect` 监听 `markedWords.size`
  - 移除 `handleWordClick` 中的 `setTimeout`

## 测试建议
1. 开启自动标注（蓝色圆点）
2. 连续快速点击 3 个词
3. 验证每个词都立即变橙色
4. 无需等待下一个词

## 已知限制
- 只对**单个词**有效
- 短语标注仍需手动点击 Annotate
- 标注失败不会有提示（静默模式）

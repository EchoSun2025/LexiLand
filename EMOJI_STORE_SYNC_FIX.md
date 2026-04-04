# Emoji 持久化修复 - Store 同步

## 问题

用户报告：生成 emoji 或图片后，切换到其他单词再切换回来，emoji 又变回默认的。

**根本原因**：
- `updateEmoji()` 和 `addEmojiImagePath()` 只更新了 IndexedDB
- 没有同步更新内存中的 Zustand store (`annotations` Map)
- UI 从 store 读取数据，所以显示的是旧数据

## 解决方案

### 1. 添加 Store Action: `updateAnnotation`

在 `appStore.ts` 中添加新的 action，用于部分更新已存在的 annotation：

```typescript
updateAnnotation: (word, updates) => set((state) => {
  const newAnnotations = new Map(state.annotations);
  const existing = newAnnotations.get(word.toLowerCase());
  if (existing) {
    newAnnotations.set(word.toLowerCase(), { ...existing, ...updates });
  }
  return { annotations: newAnnotations };
}),
```

### 2. 修改数据库函数添加回调

修改 `db/index.ts` 中的函数，添加可选的 `onUpdate` 回调参数：

```typescript
export async function updateEmoji(
  word: string, 
  emoji: string, 
  onUpdate?: (updates: Partial<CachedAnnotation>) => void
): Promise<void> {
  // ... 更新数据库
  if (onUpdate) {
    onUpdate({ emoji });  // 通知调用者
  }
}

export async function addEmojiImagePath(
  word: string, 
  imagePath: string, 
  model?: string,
  onUpdate?: (updates: Partial<CachedAnnotation>) => void
): Promise<void> {
  // ... 更新数据库
  if (onUpdate) {
    onUpdate({ 
      emojiImagePath: annotation.emojiImagePath,
      emojiModel: model 
    });
  }
}
```

### 3. 调用时传入回调

在 `WordCard.tsx` 和 `App.tsx` 中：

```typescript
// WordCard.tsx
const updateAnnotation = useAppStore(state => state.updateAnnotation);

// 搜索 Unsplash
await addEmojiImagePath(annotation.word, imagePath, undefined, (updates) => {
  updateAnnotation(annotation.word, updates);
});

// 生成 AI 图片
await addEmojiImagePath(annotation.word, imagePath, model, (updates) => {
  updateAnnotation(annotation.word, updates);
});

// 手动选择 emoji
await updateEmoji(annotation.word, emoji, (updates) => {
  updateAnnotation(annotation.word, updates);
});
```

## 效果

现在修改 emoji/图片后：
1. ✅ 立即保存到 IndexedDB
2. ✅ 同时更新内存中的 store
3. ✅ UI 立即反映变化
4. ✅ 切换单词再回来，依然显示正确的 emoji/图片

## 相关文件

- `frontend/src/store/appStore.ts` - 添加 `updateAnnotation` action
- `frontend/src/db/index.ts` - 修改 `updateEmoji` 和 `addEmojiImagePath`
- `frontend/src/components/WordCard.tsx` - 使用回调同步 store
- `frontend/src/App.tsx` - 使用回调同步 store

## 测试

刷新浏览器后：
1. 标注一个单词
2. 生成 emoji/图片
3. 切换到其他单词
4. 再切换回来 → emoji/图片应该保持不变 ✅

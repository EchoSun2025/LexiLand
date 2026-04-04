# Emoji 本地存储实现文档

## 概述

本次更新将 AI 生成的 emoji 图片从临时 URL 存储改为永久本地文件存储，解决了图片过期失效的问题。

## 问题

**原有方案的问题：**
- OpenAI 返回的图片 URL 是临时的，会在 1-2 小时后过期
- 图片存储在 localStorage，但只是 URL 字符串，不是图片本身
- 所有单词共享同一个 `customEmoji` 状态，导致生成新图片时覆盖所有单词的显示

## 解决方案

### 架构设计

```
用户点击 emoji
    ↓
前端调用 /api/generate-emoji
    ↓
后端生成图片（OpenAI DALL-E 3）
    ↓
后端下载图片到本地
    ↓
保存到 frontend/public/emoji-images/{word}_{timestamp}.png
    ↓
返回本地路径 /emoji-images/{filename}
    ↓
前端保存路径到 IndexedDB (annotations 表)
    ↓
WordCard 显示本地图片
```

## 实现细节

### 1. 后端修改 (`backend/src/index.ts`)

**新增导入：**
```typescript
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
```

**图片下载和保存逻辑：**
```typescript
// Step 2: 生成图片（使用 gpt-image-1-mini + low quality 获得最低成本）
const imagePrompt = `A simple, clean emoji-style icon: ${visualHint}. Minimalist design, solid colors, white background, centered, no text.`;

const imageResponse = await openai.images.generate({
  model: 'gpt-image-1-mini', // 使用最经济的 gpt-image-1-mini 模型（$0.005/张）
  prompt: imagePrompt,
  n: 1,
  size: '1024x1024',
  quality: 'low', // 使用最低质量以最小化成本
  response_format: 'url',
});

// Step 3: 下载图片到本地
const sanitizedWord = word.toLowerCase().replace(/[^a-z0-9]/g, '_');
const filename = `${sanitizedWord}_${Date.now()}.png`;
const imagesDir = path.join(__dirname, '..', '..', 'frontend', 'public', 'emoji-images');
const filepath = path.join(imagesDir, filename);

// 确保目录存在
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// 下载图片
const imageData = await fetch(imageUrl);
const buffer = Buffer.from(await imageData.arrayBuffer());
fs.writeFileSync(filepath, buffer);

const localPath = `/emoji-images/${filename}`;
```

**返回格式：**
```typescript
return {
  success: true,
  data: {
    word,
    visualHint,
    imageUrl: localPath, // 返回本地路径
    originalUrl: imageUrl, // 保留原始 URL 用于调试
  }
}
```

### 2. 数据库修改 (`frontend/src/db/index.ts`)

**接口更新：**
```typescript
export interface CachedAnnotation {
  word: string;
  baseForm?: string;
  ipa: string;
  chinese: string;
  definition: string;
  example: string;
  level: string;
  partOfSpeech: string;
  sentence?: string;
  documentTitle?: string;
  emojiImagePath?: string;  // 新增：本地图片路径
  cachedAt: number;
}
```

**数据库版本升级：**
```typescript
// Version 5: 添加 emojiImagePath 字段到 annotations
this.version(5).stores({
  knownWords: 'word, level, addedAt',
  learntWords: 'word, learntAt',
  annotations: 'word, cachedAt',
  phraseAnnotations: 'phrase, cachedAt',
  documents: 'id, createdAt, lastOpenedAt',
});
```

**新增方法：**
```typescript
export async function updateEmojiImagePath(word: string, imagePath: string): Promise<void> {
  const annotation = await db.annotations.get(word.toLowerCase());
  if (annotation) {
    annotation.emojiImagePath = imagePath;
    await db.annotations.put(annotation);
  }
}
```

### 3. 前端 API 修改 (`frontend/src/api/index.ts`)

```typescript
export interface WordAnnotation {
  // ... 其他字段
  emojiImagePath?: string;  // 新增
}
```

### 4. WordCard 修改 (`frontend/src/components/WordCard.tsx`)

**优先使用数据库中的图片：**
```typescript
useEffect(() => {
  if (annotation.emojiImagePath) {
    setCustomEmoji(annotation.emojiImagePath);
  }
}, [annotation.word, annotation.emojiImagePath]);
```

**生成新图片后保存到数据库：**
```typescript
const handleEmojiClick = async () => {
  // ...
  if (result.success && result.data) {
    const imagePath = result.data.imageUrl; // 现在是本地路径
    setCustomEmoji(imagePath);
    
    // 保存到数据库
    await updateEmojiImagePath(annotation.word, imagePath);
    console.log('[Emoji AI] Generated and saved to DB:', annotation.word, imagePath);
  }
};
```

### 5. 移除旧的缓存系统

- 删除 `frontend/src/utils/emojiCache.ts`
- 从 `App.tsx` 移除 `initEmojiCache()` 调用
- 不再使用 localStorage 存储 emoji URL

## 文件结构

```
frontend/
  public/
    emoji-images/           # 存储 AI 生成的 emoji 图片
      word1_timestamp.png
      word2_timestamp.png
      ...
  src/
    db/
      index.ts             # 数据库定义，新增 emojiImagePath 字段
    api/
      index.ts             # API 接口，更新 WordAnnotation
    components/
      WordCard.tsx         # 使用本地图片并更新数据库
```

## 优势

✅ **永久有效**：图片保存在本地，不会过期  
✅ **离线可用**：不依赖网络，断网也能显示  
✅ **数据关联**：图片路径存储在单词卡数据库中  
✅ **可导出**：图片可以随项目一起分发  
✅ **独立存储**：每个单词都有自己的图片，互不干扰  

## 使用说明

1. **生成图片**：点击单词卡上的 emoji，AI 会生成专属图片
2. **图片位置**：`frontend/public/emoji-images/` 目录
3. **数据持久化**：图片路径自动保存到 IndexedDB
4. **刷新保持**：刷新页面后图片依然显示

## 注意事项

- 图片文件名格式：`{sanitized_word}_{timestamp}.png`
- 单词名会被清理（只保留字母和数字，其他字符替换为下划线）
- 时间戳确保同一单词的多次生成不会覆盖
- 图片大小：1024x1024 PNG 格式
- **使用 gpt-image-1-mini 模型**：OpenAI 最新最经济的图片生成模型（$0.005 每张）
- **质量设置**：`quality: 'low'` 以获得最低成本

## 成本优化

**模型选择说明（2026年最新）：**

| 模型 | 质量 | 每张成本 | 相对成本 |
|------|------|---------|---------|
| **gpt-image-1-mini** ✅ | **low** | **$0.005** | **基准（最便宜）** |
| gpt-image-1 | low | $0.011 | 贵 120% |
| dall-e-2 | (默认) | $0.020 | 贵 300% |
| dall-e-3 | standard | $0.080 | 贵 1500% |

**成本节省：**
- 相比 `dall-e-2`：节省 **75%**
- 相比 `dall-e-3`：节省 **93.75%**
- 每生成 1000 张图片：
  - `gpt-image-1-mini` (low): $5
  - `dall-e-2`: $20
  - `dall-e-3` (standard): $80

**为什么选择 `gpt-image-1-mini`？**
- ✅ OpenAI 2025-2026 年推出的最新图像生成模型
- ✅ 专为成本优化设计的 mini 版本
- ✅ 支持 `quality: 'low'` 参数（$0.005/张）
- ✅ 支持 1024x1024 PNG 输出
- ✅ 适合简单 emoji 图标场景
- ✅ 比旧的 DALL-E 模型便宜 4-16 倍

## 测试

1. 启动开发服务器：`.\start-dev.ps1`
2. 标记一个单词并生成注释
3. 点击单词卡上的 emoji
4. 观察：
   - 控制台显示 `[Emoji AI] Generated and saved to DB`
   - 图片保存到 `frontend/public/emoji-images/`
   - 刷新页面后图片仍然显示
   - 其他单词的 emoji 不受影响

## 后续优化建议

- [ ] 添加图片清理功能（删除未使用的图片）
- [ ] 支持图片导出/导入
- [ ] 添加图片压缩以减小文件大小
- [ ] 支持自定义上传图片

---

**实现日期**：2026-03-11  
**版本**：v1.4

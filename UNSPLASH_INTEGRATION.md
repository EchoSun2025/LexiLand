# Unsplash 图片搜索功能 - v1.6

## 更新日期
2026-03-11

## 功能概述

将 AI 图片生成替换为**Unsplash 真实照片搜索**，同时保留 AI 生成作为备选方案。

## 三种交互方式

### 🖱️ 左键点击：搜索真实照片
- 调用 Unsplash API
- 搜索与单词相关的真实照片
- 免费且快速（1-3秒）
- 图片质量高

### 🖱️ 右键点击：选择 Emoji
- 打开 emoji 选择器
- 250+ 常用 emoji 可选
- 手动选择喜欢的 emoji

### ⏱️ 长按（0.8秒）：AI 生成图片
- 触发 AI 图片生成
- 作为备选方案（当 Unsplash 搜不到时）
- 支持模型回退：gpt-image-1-mini → gpt-image-1 → dall-e-2

## Unsplash API 集成

### 后端实现

**端点**：`POST /api/search-image`

**请求**：
```typescript
{
  word: string;
  definition?: string;
}
```

**响应**：
```typescript
{
  success: boolean;
  data?: {
    word: string;
    imageUrl: string;       // 本地路径
    source: 'unsplash';
    photographer: string;
    photographerUrl: string;
  };
  error?: string;
}
```

### 搜索策略

根据词性优化搜索查询：

```typescript
// 名词：直接搜索
"currant" → "currant photo"

// 动词：搜索动作场景
"running" → "running action photo"

// 形容词：搜索相关场景
"beautiful" → "beautiful scene photo"
```

### 图片处理

1. **搜索图片**：从 Unsplash API 获取
2. **下载本地**：保存到 `frontend/public/emoji-images/`
3. **返回路径**：`/emoji-images/{word}_{timestamp}.jpg`

## 环境配置

### 获取 Unsplash API Key

1. 访问：https://unsplash.com/developers
2. 注册开发者账号
3. 创建应用
4. 获取 Access Key

### 配置文件

```bash
# backend/.env
UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here
```

**重要**：请替换 `your_unsplash_access_key_here` 为您的实际 API Key！

## 前端实现

### 长按检测

```typescript
const longPressTimer = useRef<number | null>(null);
const isLongPress = useRef(false);

// 鼠标按下：开始计时
const handleMouseDown = () => {
  isLongPress.current = false;
  longPressTimer.current = setTimeout(() => {
    isLongPress.current = true;
    handleGenerateAI();  // 触发 AI 生成
  }, 800); // 800ms
};

// 鼠标抬起：如果不是长按，执行短按
const handleMouseUp = () => {
  if (longPressTimer.current) {
    clearTimeout(longPressTimer.current);
  }
  
  if (!isLongPress.current) {
    handleSearchImage();  // 搜索照片
  }
};
```

### 图片来源显示

```typescript
{isImageEmoji && imageSource && (
  <div className="text-xs text-gray-500 mt-1">
    {imageSource === 'unsplash' && '📷 Photo from Unsplash'}
    {imageSource === 'ai' && '🎨 AI Generated'}
  </div>
)}
```

## 成本对比

### 1000 个单词

| 方案 | 成本 | 时间 | 来源 |
|------|------|------|------|
| **Unsplash 搜索** | **$0.00** | ~30-50 分钟 | 真实照片 |
| AI 生成 (gpt-image-1-mini) | $5.00 | ~5-8 小时 | 艺术风格 |
| AI 生成 (dall-e-2) | $20.00 | ~5-8 小时 | 艺术风格 |

## 数据库结构

保持现有结构不变：

```typescript
export interface CachedAnnotation {
  word: string;
  // ... 其他字段
  emojiImagePath?: string;  // 图片路径（Unsplash 或 AI）
  emojiModel?: string;      // 如果是 AI 生成，存储模型名
  manualEmoji?: string;     // 手动选择的 emoji
  cachedAt: number;
}
```

**识别来源**：
- 如果 `emojiModel` 存在 → AI 生成
- 如果 `emojiModel` 不存在但 `emojiImagePath` 存在 → Unsplash
- 如果 `manualEmoji` 存在 → 用户手动选择

## 使用流程

### 场景 1：搜索真实照片

1. 标记单词（如 "currant"）
2. 打开单词卡
3. **左键点击** emoji 图标
4. 系统搜索 "currant photo"
5. 下载并显示真实照片
6. 显示 "📷 Photo from Unsplash"

### 场景 2：手动选择 Emoji

1. **右键点击** emoji 图标
2. 从选择器中选择 emoji（如 🍇）
3. 显示 "✓ Manually selected emoji"

### 场景 3：AI 生成图片

1. **长按（0.8秒）** emoji 图标
2. 触发 AI 图片生成
3. 显示 "🎨 AI Generated (gpt-image-1-mini)"

## UI 提示

悬停在 emoji 图标上显示：
```
Left click: Search photo
Right click: Choose emoji
Long press: AI generate
```

## Unsplash API 限制

### 免费层级
- **50 请求/小时**
- 适合个人学习使用
- 超出限制会收到 429 错误

### 处理超限
如果超出限制，系统会：
1. 返回错误信息
2. 显示错误提示
3. 用户可以：
   - 等待 1 小时后重试
   - 使用右键选择 emoji
   - 使用长按生成 AI 图片

## 优势

✅ **完全免费**：Unsplash API 免费  
✅ **速度快**：1-3秒获取图片  
✅ **质量高**：专业摄影师作品  
✅ **真实性**：真实照片更助于学习  
✅ **灵活性**：三种方式可选  
✅ **成本可控**：优先使用免费方案，AI 作为备选  

## 测试步骤

1. **配置 API Key**：
   - 在 `backend/.env` 中设置 `UNSPLASH_ACCESS_KEY`

2. **重启服务器**：
   - 运行 `.\start-dev.ps1`

3. **测试左键点击**：
   - 标记单词（如 "apple"）
   - 左键点击 emoji
   - 确认显示真实苹果照片
   - 确认显示 "📷 Photo from Unsplash"

4. **测试右键点击**：
   - 右键点击 emoji
   - 选择一个 emoji
   - 确认显示选择的 emoji

5. **测试长按**：
   - 长按 emoji（0.8秒）
   - 确认触发 AI 生成
   - 确认显示 "🎨 AI Generated"

## 注意事项

⚠️ **必须配置 Unsplash API Key**：
- 如果不配置，会报错 "Unsplash API key not configured"
- 请访问 https://unsplash.com/developers 获取

⚠️ **网络需求**：
- 需要能访问 Unsplash API
- 需要能访问 OpenAI API（长按功能）

⚠️ **图片存储**：
- 图片保存在 `frontend/public/emoji-images/`
- Unsplash 图片是 `.jpg` 格式
- AI 图片是 `.png` 格式

## 后续优化建议

- [ ] 添加 Unsplash 摄影师署名显示
- [ ] 支持多张图片选择（浏览模式）
- [ ] 添加图片缓存机制（同一单词不重复下载）
- [ ] 支持备用图片源（如 Pexels）
- [ ] 添加图片质量选择（small/regular/full）

---

**版本**：v1.6  
**状态**：✅ 功能完整  
**主要改进**：免费真实照片搜索 + 三种交互方式

# API 接口文档

## 基础信息

- **Base URL**: `http://localhost:3000/api`
- **认证方式**: Header `X-API-Key: {your-secret-key}`
- **内容类型**: `application/json`
- **响应格式**: 统一的 `ApiResponse<T>` 结构

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
```

## 接口列表

### 1. 单词标注

生成单词的音标和中文翻译。

**请求**

```http
POST /api/annotate
Content-Type: application/json
X-API-Key: your-secret-key

{
  "word": "huddled",
  "sentence": "Three serving girls huddled together.",
  "userLevel": "B2"
}
```

**响应**

```json
{
  "success": true,
  "data": {
    "ipa": "/ˈhʌd(ə)ld/",
    "translation": "聚拢"
  }
}
```

**错误响应**

```json
{
  "success": false,
  "error": "OpenAI API rate limit exceeded"
}
```

**缓存策略**: 相同 `word + sentence` 的请求会命中缓存，直接返回。

---

### 2. 单词详情

生成单词的上下文解释和例句。

**请求**

```http
POST /api/word-detail
Content-Type: application/json
X-API-Key: your-secret-key

{
  "word": "huddled",
  "context": "Three serving girls huddled together in the corner, whispering.",
  "userLevel": "B2"
}
```

**响应**

```json
{
  "success": true,
  "data": {
    "contextExplanation": "In this context, 'huddled' means to crowd together closely, often for warmth or protection.",
    "exampleSentence": "The children huddled under the blanket during the storm."
  }
}
```

---

### 3. 段落翻译

将段落翻译成中文。

**请求**

```http
POST /api/translate
Content-Type: application/json
X-API-Key: your-secret-key

{
  "text": "The old man sat by the window, watching the rain fall...",
  "level": "B2"
}
```

**响应**

```json
{
  "success": true,
  "data": {
    "translation": "老人坐在窗边，看着雨落下..."
  }
}
```

---

### 4. 段落分析

根据用户等级分析段落的语法和用法。

**请求**

```http
POST /api/analyze
Content-Type: application/json
X-API-Key: your-secret-key

{
  "text": "Had she known the truth, she would have acted differently.",
  "level": "B2"
}
```

**响应**

```json
{
  "success": true,
  "data": {
    "analysis": "This sentence uses the third conditional (past unreal conditional). Structure: 'Had + subject + past participle, subject + would have + past participle'. It expresses a hypothetical situation in the past and its imagined result."
  }
}
```

---

### 5. 生成插图

根据选中的句子生成插图。

**请求**

```http
POST /api/generate-illustration
Content-Type: application/json
X-API-Key: your-secret-key

{
  "sentences": [
    "Three serving girls huddled together in the corner."
  ],
  "context": "The tavern was crowded and noisy. Three serving girls huddled together in the corner, whispering.",
  "newWords": ["huddled"],
  "userLevel": "B2"
}
```

**响应**

```json
{
  "success": true,
  "data": {
    "imageUrl": "https://oaidalleapiprodscus.blob.core.windows.net/...",
    "prompt": "A cozy medieval tavern interior with three young women in servant dresses huddled close together in a dimly lit corner, whispering secrets. Warm lighting, rustic wooden beams, crowded atmosphere. Illustration style, 6:9 aspect ratio."
  }
}
```

**注意**: 
- 这是最昂贵的接口（DALL-E 3 生图）
- 可在设置中关闭自动生图
- 建议在后端限制每用户每日请求次数

---

### 6. 参考图片

获取单词的参考图片（来自 Unsplash）。

**请求**

```http
GET /api/reference-image?word=apple
X-API-Key: your-secret-key
```

**响应**

```json
{
  "success": true,
  "data": {
    "imageUrl": "https://images.unsplash.com/photo-...",
    "attribution": "Photo by John Doe on Unsplash"
  }
}
```

---

### 7. 批量标注

一次请求标注多个单词（用于"一键标词"）。

**请求**

```http
POST /api/batch-annotate
Content-Type: application/json
X-API-Key: your-secret-key

{
  "words": [
    { "word": "huddled", "sentence": "Three girls huddled together." },
    { "word": "tavern", "sentence": "The tavern was crowded." }
  ],
  "userLevel": "B2"
}
```

**响应**

```json
{
  "success": true,
  "data": [
    { "word": "huddled", "ipa": "/ˈhʌd(ə)ld/", "translation": "聚拢" },
    { "word": "tavern", "ipa": "/ˈtæv(ə)n/", "translation": "酒馆" }
  ]
}
```

**限流策略**: 后端会自动限流（每秒 5 个请求），避免触发 OpenAI Rate Limit。

---

## 提示语编辑

所有提示语存储在后端的 `config/prompts.json` 中，用户可在前端设置页面编辑。

**获取提示语**

```http
GET /api/prompts
X-API-Key: your-secret-key
```

**响应**

```json
{
  "success": true,
  "data": {
    "annotate": {
      "template": "Please provide the IPA pronunciation and Chinese translation for the word \"{{word}}\" in the following sentence:\n\n\"{{sentence}}\"\n\nUser level: {{userLevel}}\n\nFormat your response as: /IPA/ · 中文翻译",
      "editable": true
    },
    "wordDetail": { ... },
    "translateParagraph": { ... }
  }
}
```

**更新提示语**

```http
PUT /api/prompts
Content-Type: application/json
X-API-Key: your-secret-key

{
  "annotate": {
    "template": "自定义的提示语..."
  }
}
```

---

## 缓存机制

后端使用 SQLite 缓存所有 OpenAI 响应，缓存键为请求参数的 SHA-256 哈希值。

**缓存策略**:
- 标注、翻译、分析：永久缓存（除非手动清除）
- 插图、参考图片：缓存 30 天

**清除缓存**

```http
DELETE /api/cache
X-API-Key: your-secret-key
```

**查询缓存统计**

```http
GET /api/cache/stats
X-API-Key: your-secret-key
```

**响应**

```json
{
  "success": true,
  "data": {
    "totalEntries": 1234,
    "totalSize": "12.5 MB",
    "hitRate": 0.78
  }
}
```

---

## 限流规则

**IP 限流**: 每个 IP 每分钟最多 100 次请求。

**OpenAI 限流**: 
- `gpt-4o-mini`: 每秒 5 次请求
- `dall-e-3`: 每分钟 3 次请求

超出限流返回 `429 Too Many Requests`。

---

## 错误码

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未授权（API Key 无效）|
| 429 | 请求过于频繁 |
| 500 | 服务器内部错误 |
| 503 | OpenAI API 不可用 |

---

## 开发/生产环境

**开发环境**: `http://localhost:3000/api`

**生产环境**: `https://api.lexiland.app/api`

环境变量配置:

```env
# .env
OPENAI_API_KEY=sk-...
API_SECRET=your-secret-key
NODE_ENV=production
PORT=3000
```

---

## 调用示例（前端）

```typescript
// frontend/src/services/api.ts
const API_URL = import.meta.env.VITE_API_URL;
const API_KEY = import.meta.env.VITE_API_KEY;

export async function annotateWord(
  word: string,
  sentence: string,
  userLevel: string
): Promise<AnnotateResponse> {
  const response = await fetch(`${API_URL}/api/annotate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': API_KEY,
    },
    body: JSON.stringify({ word, sentence, userLevel }),
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.statusText}`);
  }

  const result: ApiResponse<AnnotateResponse> = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Unknown error');
  }

  return result.data!;
}
```

---

## 测试

**健康检查**

```http
GET /health
```

**响应**

```json
{
  "status": "ok",
  "timestamp": 1705900800000
}
```

# Emoji 图片生成 - 回退机制说明

## 问题描述

在尝试使用 `gpt-image-1-mini` 模型时遇到 HTTP 500 错误：

```
API Error: Error: HTTP error! status: 500
[Emoji AI] Error: HTTP error! status: 500
```

## 可能的原因

1. **API 访问权限**：`gpt-image-1-mini` 可能需要特定的 API 访问权限
2. **SDK 版本兼容性**：虽然 SDK 已更新到 6.27.0，但可能还不完全支持最新模型
3. **区域限制**：某些新模型可能在特定区域尚未完全推出
4. **API Key 层级**：您的 API Key 可能还没有获得新模型的访问权限

## 解决方案：智能回退机制

### 实现逻辑

后端现在会按顺序尝试以下模型，直到成功：

```typescript
const modelsToTry = [
  { model: 'gpt-image-1-mini', quality: 'low' },  // 尝试最便宜的
  { model: 'gpt-image-1', quality: 'low' },       // 回退到标准版
  { model: 'dall-e-2', quality: undefined },      // 最后使用旧模型
];
```

### 成本对比

| 优先级 | 模型 | 质量 | 成本/张 | 状态 |
|-------|------|------|---------|------|
| 1️⃣ | gpt-image-1-mini | low | $0.005 | 优先尝试 |
| 2️⃣ | gpt-image-1 | low | $0.011 | 回退选项 |
| 3️⃣ | dall-e-2 | (默认) | $0.020 | 最后保底 |

### 代码实现

```typescript
for (const config of modelsToTry) {
  try {
    fastify.log.info({ model: config.model, quality: config.quality }, 'Trying image generation');
    
    const params: any = {
      model: config.model,
      prompt: imagePrompt,
      n: 1,
      size: '1024x1024',
      response_format: 'url',
    };
    
    if (config.quality) {
      params.quality = config.quality;
    }
    
    imageResponse = await openai.images.generate(params);

    if (imageResponse.data && imageResponse.data.length > 0) {
      imageUrl = imageResponse.data[0]?.url;
      if (imageUrl) {
        modelUsed = config.model;
        fastify.log.info({ word, imageUrl, model: modelUsed }, 'Successfully generated image');
        break; // 成功则停止尝试
      }
    }
  } catch (modelError: any) {
    fastify.log.warn({ 
      model: config.model, 
      error: modelError.message,
      code: modelError.code 
    }, 'Model failed, trying next');
    continue; // 失败则尝试下一个
  }
}
```

## 优势

✅ **自动适应**：根据 API 可用性自动选择最佳模型  
✅ **成本优化**：优先使用最便宜的模型  
✅ **高可用性**：即使新模型不可用，也能回退到稳定的旧模型  
✅ **详细日志**：记录每次尝试和最终使用的模型  
✅ **透明度**：返回实际使用的模型名称  

## 测试建议

### 1. 查看后端日志

重启后端后，查看控制台输出：

```bash
# 应该看到类似这样的日志：
[INFO] Trying image generation { model: 'gpt-image-1-mini', quality: 'low' }
[WARN] Model failed, trying next { model: 'gpt-image-1-mini', error: '...' }
[INFO] Trying image generation { model: 'gpt-image-1', quality: 'low' }
[INFO] Successfully generated image { word: '...', model: 'gpt-image-1' }
```

### 2. 检查返回数据

前端现在会收到 `model` 字段，表明实际使用的模型：

```typescript
{
  success: true,
  data: {
    word: "example",
    imageUrl: "/emoji-images/example_1234567890.png",
    model: "gpt-image-1",  // 实际使用的模型
    // ...
  }
}
```

### 3. 成本追踪

根据日志中的 `model` 字段，您可以了解实际产生的成本：
- `gpt-image-1-mini`: $0.005
- `gpt-image-1`: $0.011
- `dall-e-2`: $0.020

## 如何确认模型可用性

### 检查 OpenAI Dashboard

1. 登录 https://platform.openai.com/
2. 查看 **Models** 页面
3. 确认您的账户是否有 `gpt-image-1-mini` 和 `gpt-image-1` 的访问权限

### 联系 OpenAI 支持

如果您想使用最新的 `gpt-image-1-mini` 模型，可能需要：
- 升级 API 访问层级
- 申请 Beta 访问权限
- 等待模型在您的区域正式推出

## 当前状态

✅ **代码已更新**：包含完整的回退机制  
✅ **构建成功**：后端 TypeScript 编译通过  
⏳ **等待测试**：需要重启后端并测试实际效果  

## 下一步

1. **重启后端服务器**
2. **尝试生成 emoji**
3. **查看后端日志** - 确认实际使用的模型
4. **报告结果** - 让我知道哪个模型成功了

---

**更新时间**：2026-03-11  
**状态**：✅ 已实施回退机制

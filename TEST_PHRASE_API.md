# 测试短语 API

## 步骤 1: 检查后端是否运行

打开新的终端窗口，运行：

```bash
cd D:\00working\20260110_CODE_Lexiland_read\backend
npm run dev
```

应该看到：
```
✅ Backend server is running on http://localhost:3000
```

## 步骤 2: 测试健康检查

在浏览器访问：http://localhost:3000/health

应该返回：
```json
{"status":"ok","timestamp":1234567890}
```

## 步骤 3: 手动测试短语 API

在浏览器控制台（F12）运行：

```javascript
fetch('http://localhost:3000/api/annotate-phrase', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    phrase: 'mysterious stranger',
    sentenceContext: 'Three serving girls huddled together in the cold, whispering about the mysterious stranger who had arrived at dawn.',
    level: 'B2'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

## 预期结果

应该返回类似：
```json
{
  "success": true,
  "data": {
    "phrase": "mysterious stranger",
    "chinese": "神秘的陌生人",
    "explanation": null,
    "sentenceContext": "Three serving girls..."
  }
}
```

## 常见错误

### 错误 1: ECONNREFUSED
```
Failed to fetch
```
**原因**: 后端没有启动  
**解决**: 运行 `npm run dev` 启动后端

### 错误 2: HTTP 500
```json
{"success": false, "error": "Failed to generate phrase annotation"}
```
**原因**: OpenAI API Key 未配置或无效  
**解决**: 检查 `.env` 文件中的 `OPENAI_API_KEY`

### 错误 3: CORS Error
```
Access to fetch has been blocked by CORS policy
```
**原因**: CORS 配置问题  
**解决**: 确保后端 CORS 允许 `http://localhost:5173`

## 步骤 4: 查看完整错误

在前端控制台查找：
```
Annotating phrase: "..." in sentence: "..."
Phrase annotation result: {...}
```

如果有错误，会显示详细信息。

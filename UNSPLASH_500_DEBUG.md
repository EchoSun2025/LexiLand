# Unsplash 500 错误诊断指南

## 当前状态

✅ Unsplash API 本身工作正常（测试脚本成功）  
✅ API Key 配置正确  
✅ 后端服务器正在运行  
❌ 后端 `/api/search-image` 端点返回 HTTP 500  

## 问题分析

测试脚本可以成功调用 Unsplash API，但通过后端端点调用时失败，说明问题可能在：

1. **后端没有重新加载编译后的代码**
2. 图片下载或文件保存出错
3. 路径问题

## 🔧 解决步骤

### 步骤 1：完全重启后端（重要！）

**方法 A：关闭所有窗口重启**
1. 关闭所有由 `start-dev.ps1` 打开的窗口
2. 重新运行 `.\start-dev.ps1`

**方法 B：手动重启后端**
1. 在后端窗口按 `Ctrl+C` 停止
2. 重新运行：
   ```powershell
   cd backend
   npm run dev
   ```

### 步骤 2：检查后端控制台

当您左键点击 emoji 时，后端控制台应该显示：

**成功时：**
```
[INFO] Searching Unsplash { word: 'apple', searchQuery: 'apple photo' }
[INFO] Downloading image from Unsplash { imageUrl: '...', filepath: '...' }
[INFO] Saved Unsplash image locally { word: 'apple', localPath: '/emoji-images/...' }
```

**失败时：**
```
[ERROR] Image search error { error: '...', stack: '...', word: '...', searchQuery: '...' }
```

**请将错误信息发给我！**

### 步骤 3：测试端点（使用 PowerShell）

在 PowerShell 中运行：

```powershell
$body = @{
    word = "apple"
    definition = "n. fruit"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/search-image" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

**成功响应应该包含：**
```json
{
  "success": true,
  "data": {
    "word": "apple",
    "imageUrl": "/emoji-images/apple_1234567890.jpg",
    "source": "unsplash",
    "photographer": "...",
    "photographerUrl": "..."
  }
}
```

### 步骤 4：检查目录权限

确保后端可以创建目录和写入文件：

```powershell
Test-Path "D:\00working\20260110_CODE_Lexiland_read\frontend\public\emoji-images"
```

如果返回 `False`，手动创建：

```powershell
New-Item -ItemType Directory -Path "D:\00working\20260110_CODE_Lexiland_read\frontend\public\emoji-images"
```

## 常见问题

### Q1: 后端显示 "Failed to download image"

**可能原因：**
- 网络问题
- Unsplash 图片 URL 过期

**解决方案：**
- 检查网络连接
- 重试搜索

### Q2: 后端显示 "ENOENT: no such file or directory"

**可能原因：**
- `emoji-images` 目录不存在
- 路径错误

**解决方案：**
```powershell
mkdir "D:\00working\20260110_CODE_Lexiland_read\frontend\public\emoji-images"
```

### Q3: 后端显示 "EACCES: permission denied"

**可能原因：**
- 没有写入权限

**解决方案：**
- 右键点击 `emoji-images` 目录 → 属性 → 安全 → 编辑 → 添加完全控制权限

## 🔍 详细诊断

### 检查编译后的代码

```powershell
cd backend
Get-Content dist\index.js | Select-String "search-image" -Context 2
```

应该能看到 `/api/search-image` 端点的代码。

### 检查环境变量

在后端代码中添加临时日志：

```typescript
console.log('UNSPLASH_ACCESS_KEY:', process.env.UNSPLASH_ACCESS_KEY ? 'SET' : 'NOT SET');
```

### 检查是否使用了旧代码

1. 查看 `backend/dist/index.js` 的修改时间
2. 应该是最近的时间（刚才构建的）
3. 如果不是，说明编译有问题

```powershell
Get-Item backend\dist\index.js | Select-Object LastWriteTime
```

## 临时解决方案

如果 Unsplash 持续出错，可以：

1. **使用 AI 生成**
   - 长按 emoji 图标 0.8 秒
   - 使用 OpenAI 生成图片

2. **使用手动选择**
   - 右键点击 emoji 图标
   - 从选择器中选择

## 需要提供的信息

为了进一步诊断，请提供：

1. **后端控制台的完整错误信息**（包括 stack trace）
2. **PowerShell 测试的结果**（步骤 3）
3. **`emoji-images` 目录是否存在**
4. **后端 dist/index.js 的最后修改时间**

---

**下一步**：
1. 完全重启后端服务器
2. 再次测试左键点击
3. 查看后端控制台的错误信息
4. 将错误信息发给我

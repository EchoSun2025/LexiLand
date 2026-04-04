# Unsplash 图片搜索故障排除

## 遇到的问题

```
API Error: Error: HTTP error! status: 500
[Unsplash] Error: HTTP error! status: 500
```

## 原因分析

HTTP 500 错误通常是后端服务器内部错误，可能的原因：

1. **后端没有重启**（最常见）
2. Unsplash API Key 未正确加载
3. Unsplash API 请求失败
4. 网络连接问题

## 解决方案

### ✅ 步骤 1：重启后端服务器

**重要**：修改 `.env` 文件后必须重启后端！

1. 找到并关闭运行后端的 PowerShell 窗口
2. 重新运行 `.\start-dev.ps1`

或者手动重启：

```powershell
# 停止当前后端
# 按 Ctrl+C 或关闭窗口

# 重新启动后端
cd backend
npm run dev
```

### ✅ 步骤 2：检查后端日志

启动后端后，在控制台中查看：

**成功启动应该看到：**
```
✅ Backend server is running on http://localhost:3000
```

**当搜索图片时应该看到：**
```
[INFO] Searching Unsplash { word: 'apple', searchQuery: 'apple photo' }
[INFO] Downloading image from Unsplash { imageUrl: '...', filepath: '...' }
[INFO] Saved Unsplash image locally { word: 'apple', localPath: '/emoji-images/...' }
```

**如果看到错误：**
```
[ERROR] Unsplash API key not configured
```
→ 说明 API Key 未正确配置

```
[ERROR] Unsplash API error: Unauthorized
```
→ 说明 API Key 无效

### ✅ 步骤 3：验证配置

检查 `backend/.env` 文件：

```bash
UNSPLASH_ACCESS_KEY=GxsUzGv9j_L9xwdohcaPHHBcFiWNcKOd-pEIDMPdMww
```

**确认：**
- ✅ 没有多余空格
- ✅ 没有引号
- ✅ Key 是完整的

### ✅ 步骤 4：测试 API Key

在浏览器中访问（替换为您的 Key）：

```
https://api.unsplash.com/search/photos?query=apple&per_page=1&client_id=GxsUzGv9j_L9xwdohcaPHHBcFiWNcKOd-pEIDMPdMww
```

**成功响应应该包含：**
```json
{
  "total": ...,
  "results": [...]
}
```

**如果失败：**
- 检查 API Key 是否正确
- 检查 Unsplash 应用状态
- 访问 https://unsplash.com/oauth/applications 确认应用是激活状态

## 常见错误代码

| 错误码 | 原因 | 解决方案 |
|-------|------|---------|
| 401 | API Key 无效 | 检查 Key 是否正确 |
| 403 | 权限不足 | 检查应用状态 |
| 429 | 超出请求限制 | 等待 1 小时后重试 |
| 500 | 后端服务器错误 | 重启后端服务器 |

## 当前配置状态

✅ **API Key 已配置**：
```
GxsUzGv9j_L9xwdohcaPHHBcFiWNcKOd-pEIDMPdMww
```

✅ **后端代码已更新**：已重新编译

⚠️ **需要重启**：必须重启后端服务器才能生效！

## 快速重启指南

### 方法 1：使用启动脚本（推荐）

1. 关闭所有 `start-dev.ps1` 打开的窗口
2. 重新运行：
   ```powershell
   .\start-dev.ps1
   ```

### 方法 2：手动重启

**后端：**
```powershell
cd backend
npm run dev
```

**前端：**
```powershell
cd frontend
npm run dev
```

## 验证修复

重启后，测试：

1. 标记一个单词（如 "apple"）
2. 左键点击 emoji 图标
3. **预期结果**：
   - 看到 loading 动画
   - 1-3 秒后显示苹果照片
   - 卡片底部显示 "📷 Photo from Unsplash"

4. **后端日志应该显示**：
   ```
   [INFO] Searching Unsplash
   [INFO] Downloading image from Unsplash
   [INFO] Saved Unsplash image locally
   ```

## 备选方案

如果 Unsplash 持续出错，可以：

1. **使用右键选择 emoji**
   - 右键点击 emoji 图标
   - 从选择器中选择

2. **使用长按 AI 生成**
   - 长按 emoji 图标 0.8 秒
   - 触发 AI 图片生成（需要 OpenAI API）

## 需要帮助？

如果问题持续，请提供：
1. 后端控制台的完整错误信息
2. 访问 Unsplash API 测试 URL 的结果
3. `.env` 文件内容（遮盖敏感信息）

---

**状态**：已配置 API Key，需要重启后端  
**下一步**：重启 `.\start-dev.ps1`

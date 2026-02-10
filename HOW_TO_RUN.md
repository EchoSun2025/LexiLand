# 🚀 如何启动 LexiLand Read

## 快速启动（推荐）

### Windows 用户

**启动服务器：**
1. 双击 `start-dev.ps1`
2. 或右键 → "使用 PowerShell 运行"
3. 等待两个窗口打开（蓝色=前端，绿色=后端）

**停止服务器：**
- 双击 `stop-dev.ps1`
- 或直接关闭两个服务器窗口

---

## 访问地址

启动后，在浏览器中访问：

- 🌐 **前端界面**: http://localhost:5173
- 🔧 **后端 API**: http://localhost:3000
- ❤️ **健康检查**: http://localhost:3000/health

---

## 常见问题

### ❌ 端口被占用

如果看到端口占用警告：
1. 运行 `stop-dev.ps1` 停止旧进程
2. 或手动关闭之前的服务器窗口
3. 重新运行 `start-dev.ps1`

### ❌ PowerShell 执行策略错误

如果提示"无法加载脚本"：

```powershell
# 以管理员身份运行 PowerShell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### ❌ 后端无法启动

确保已配置环境变量：
1. 检查 `backend/.env` 文件是否存在
2. 确认 `OPENAI_API_KEY` 已设置

---

## 手动启动（所有平台）

如果自动脚本不工作，可以手动启动：

### 终端 1（后端）
```bash
cd backend
npm run dev
```

### 终端 2（前端）
```bash
cd frontend
npm run dev
```

---

## 开发提示

- 前端热重载：保存文件后自动刷新
- 后端自动重启：使用 nodemon，修改代码后自动重启
- 关闭窗口即停止对应服务器

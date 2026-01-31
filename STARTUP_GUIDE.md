# 🚀 快速启动指南

## 一键启动脚本

遇到 `localhost:5173` 无法连接的问题？使用这些脚本轻松解决：

### 📁 脚本说明

#### 1. `start-dev.ps1` - 完整启动（推荐）
**功能**:
- ✅ 自动检查并清理端口占用
- ✅ 同时启动前端 (5173) 和后端 (3000)
- ✅ 在新窗口中运行，方便查看日志

**使用方法**:
```powershell
# 方法1: 右键文件 -> "使用 PowerShell 运行"
# 方法2: 在 VS Code 终端运行
.\start-dev.ps1
```

#### 2. `start-dev-simple.ps1` - 简单启动
**功能**:
- ✅ 只启动前端服务器
- ✅ 在当前窗口运行
- ✅ 适合调试时使用

**使用方法**:
```powershell
.\start-dev-simple.ps1
```

#### 3. `stop-dev.ps1` - 停止所有服务
**功能**:
- ✅ 停止前端和后端服务
- ✅ 清理端口占用
- ✅ 彻底关闭

**使用方法**:
```powershell
.\stop-dev.ps1
```

---

## 🔧 常见问题解决

### 问题 1: "无法连接到 localhost:5173"

**解决方案**:
1. 运行 `start-dev.ps1`
2. 等待 5-10 秒
3. 刷新浏览器

如果还不行：
```powershell
.\stop-dev.ps1    # 先停止
.\start-dev.ps1   # 再启动
```

### 问题 2: "端口已被占用"

脚本会自动处理，无需手动操作。

如果需要手动清理：
```powershell
# 查找占用 5173 端口的进程
Get-NetTCPConnection -LocalPort 5173 | Select-Object OwningProcess

# 停止进程（替换 <PID> 为实际进程 ID）
Stop-Process -Id <PID> -Force
```

### 问题 3: "PowerShell 脚本无法运行"

**错误信息**: "无法加载文件，因为在此系统上禁止运行脚本"

**解决方案**:
```powershell
# 临时允许脚本运行（管理员权限）
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope Process

# 然后运行脚本
.\start-dev.ps1
```

或者：
```powershell
# 直接运行（绕过策略）
powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
```

---

## 📌 创建桌面快捷方式（推荐）

### Windows 快捷方式

1. **右键桌面 -> 新建 -> 快捷方式**

2. **目标位置** 填写：
   ```
   powershell.exe -ExecutionPolicy Bypass -File "D:\00working\20260110_CODE_Lexiland_read\start-dev.ps1"
   ```

3. **名称**: `启动 LexiLand`

4. **右键快捷方式 -> 属性**:
   - 起始位置: `D:\00working\20260110_CODE_Lexiland_read`
   - 运行方式: 常规窗口
   - 可选: 更改图标

现在双击桌面快捷方式即可启动！

---

## 🎯 推荐工作流程

### 开发时：
```powershell
# 1. 启动服务
.\start-dev.ps1

# 2. 打开浏览器
# http://localhost:5173

# 3. 开发完成后停止
.\stop-dev.ps1
```

### 仅测试前端：
```powershell
.\start-dev-simple.ps1
# Ctrl+C 停止
```

### 遇到连接问题：
```powershell
.\stop-dev.ps1      # 停止
.\start-dev.ps1     # 重启
```

---

## 📊 服务状态检查

### 检查端口是否监听：
```powershell
# 前端
Test-NetConnection -ComputerName localhost -Port 5173

# 后端
Test-NetConnection -ComputerName localhost -Port 3000
```

### 查看运行中的服务：
```powershell
Get-NetTCPConnection -LocalPort 5173,3000 | 
    Select-Object LocalPort, State, OwningProcess |
    Format-Table
```

---

## 🆘 紧急救援

如果所有方法都失效：

```powershell
# 1. 停止所有 Node 进程
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. 清理端口
Get-NetTCPConnection -LocalPort 5173,3000 -ErrorAction SilentlyContinue |
    ForEach-Object { Stop-Process -Id $_.OwningProcess -Force }

# 3. 重新安装依赖
cd D:\00working\20260110_CODE_Lexiland_read\frontend
npm install

# 4. 启动
npm run dev
```

---

## 💡 高级技巧

### 后台运行（无窗口）：
```powershell
# 创建 start-dev-background.ps1
Start-Process powershell -ArgumentList "-WindowStyle", "Hidden", "-Command", "cd D:\00working\20260110_CODE_Lexiland_read\frontend; npm run dev"
```

### 开机自动启动：
1. Win+R 输入 `shell:startup`
2. 将快捷方式复制到此文件夹

### VS Code 任务集成：
已在 `.vscode/tasks.json` 配置（如需）

---

## 🔗 相关文件

- `start-dev.ps1` - 完整启动脚本
- `start-dev-simple.ps1` - 简单启动脚本  
- `stop-dev.ps1` - 停止脚本
- `init-all.ps1` - 初始化脚本（首次使用）

---

**提示**: 将 `start-dev.ps1` 固定到任务栏或创建桌面快捷方式，下次遇到连接问题只需双击即可！

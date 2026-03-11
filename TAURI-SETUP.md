# Tauri 开发环境检查工具

## 📋 说明

这是用于检查你的电脑是否已安装 Tauri 开发所需依赖的脚本。

## 🪟 Windows 使用方法

### 运行检查脚本

```powershell
# 方法1：右键点击 check-tauri-windows.ps1 → "使用 PowerShell 运行"

# 方法2：在 PowerShell 中运行
powershell -ExecutionPolicy Bypass -File check-tauri-windows.ps1
```

### 📦 Windows 需要的依赖

1. **Node.js** (v16+)
   - 下载：https://nodejs.org/
   - 或使用 winget: `winget install OpenJS.NodeJS`

2. **Rust** (最新稳定版)
   - 下载：https://rustup.rs/
   - 或使用 winget: `winget install Rustlang.Rustup`

3. **Visual Studio C++ Build Tools**
   - 下载：https://visualstudio.microsoft.com/downloads/
   - 或 Build Tools: https://aka.ms/vs/17/release/vs_BuildTools.exe
   - **必须勾选**："使用 C++ 的桌面开发" 工作负载

4. **WebView2 Runtime** (运行时需要，开发可选)
   - 下载：https://go.microsoft.com/fwlink/p/?LinkId=2124703
   - Windows 11 通常已预装

---

## 🐧 Linux 使用方法

### 运行检查脚本

```bash
# 1. 添加执行权限
chmod +x check-tauri-linux.sh

# 2. 运行脚本
./check-tauri-linux.sh
```

### 📦 Linux 需要的依赖

根据你的发行版选择对应的安装命令：

#### Ubuntu / Debian / Pop!_OS / Linux Mint

```bash
# 更新包列表
sudo apt update

# 安装所有依赖
sudo apt install -y \
    nodejs npm \
    curl wget file \
    build-essential \
    libwebkit2gtk-4.0-dev \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev

# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

#### Fedora / RHEL / CentOS

```bash
# 安装所有依赖
sudo dnf install -y \
    nodejs npm \
    curl wget file \
    openssl-devel \
    webkit2gtk4.0-devel \
    gtk3-devel \
    libappindicator-gtk3-devel \
    librsvg2-devel

# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

#### Arch Linux / Manjaro

```bash
# 安装所有依赖
sudo pacman -S --needed \
    nodejs npm \
    base-devel \
    curl wget file \
    openssl \
    webkit2gtk \
    gtk3 \
    libappindicator-gtk3 \
    librsvg

# 安装 Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

---

## 📊 检查结果解读

### ✅ 成功标记
- `[OK]` / `✓` - 依赖已正确安装

### ❌ 错误标记
- `[X]` / `✗` - 依赖缺失，**必须安装**

### ⚠️ 警告标记
- `[!]` / `⚠` - 可选依赖或配置建议

---

## 🚀 安装后续步骤

### 1. 验证 Rust 安装

```bash
# 重启终端后运行
rustc --version
cargo --version
```

### 2. 安装 Tauri CLI（可选）

```bash
# 首次创建项目时会自动安装，也可以手动安装：
cargo install tauri-cli
```

### 3. 创建 Tauri 项目

```bash
# 使用 create-tauri-app 脚手架
npm create tauri-app@latest

# 或使用 cargo
cargo create-tauri-app
```

---

## ❓ 常见问题

### Windows: "无法加载脚本，因为在此系统上禁止运行脚本"

**解决方案：**
```powershell
# 使用 -ExecutionPolicy Bypass 参数运行
powershell -ExecutionPolicy Bypass -File check-tauri-windows.ps1
```

### Linux: "permission denied"

**解决方案：**
```bash
chmod +x check-tauri-linux.sh
./check-tauri-linux.sh
```

### Rust 安装后提示找不到命令

**解决方案：**
- **关闭并重新打开终端**（必须！）
- 或手动加载环境变量：
  ```bash
  # Linux/macOS
  source $HOME/.cargo/env
  
  # Windows PowerShell
  # Rust 安装程序会自动配置环境变量，重启终端即可
  ```

### Windows: Visual Studio C++ 工具检测失败

**解决方案：**
1. 打开 Visual Studio Installer
2. 修改已安装的版本
3. 勾选 "使用 C++ 的桌面开发" 工作负载
4. 安装

---

## 📚 相关资源

- **Tauri 官方文档**：https://tauri.app/
- **Tauri 先决条件**：https://tauri.app/v1/guides/getting-started/prerequisites
- **Rust 官网**：https://www.rust-lang.org/
- **Node.js 官网**：https://nodejs.org/

---

## 💡 提示

- **Windows 用户**：推荐使用 **Windows Terminal** + **PowerShell 7** 获得更好的体验
- **Linux 用户**：某些发行版的包名可能略有不同，请参考 Tauri 官方文档
- **开发建议**：安装 VS Code + rust-analyzer 插件获得最佳 Rust 开发体验

---

## 📝 检查结果示例

### ✅ 完整安装示例（Windows）

```
========================================
   Tauri Dev Environment Check
========================================

[1/5] Checking Node.js...
  [OK] Node.js: v20.10.0

[2/5] Checking npm...
  [OK] npm: v10.2.3

[3/5] Checking Rust...
  [OK] Rust: rustc 1.75.0
  [OK] Cargo: cargo 1.75.0

[4/5] Checking C++ Build Tools...
  [OK] Visual Studio C++ Build Tools installed

[5/5] Checking WebView2 Runtime...
  [OK] WebView2 Runtime installed

========================================
[OK] All required dependencies installed!
     Ready for Tauri development!
========================================
```

### ⚠️ 你当前的检查结果（Windows）

```
[1/5] Checking Node.js...
  [OK] Node.js: v24.12.0           ← ✅ 已安装

[2/5] Checking npm...
  [OK] npm: v11.6.2                ← ✅ 已安装

[3/5] Checking Rust...
  [X] Rust not installed           ← ❌ 需要安装

[4/5] Checking C++ Build Tools...
  [!] C++ tools may be missing     ← ⚠️ 需要配置

[5/5] Checking WebView2 Runtime...
  [OK] WebView2 Runtime installed  ← ✅ 已安装
```

**你需要：**
1. 安装 Rust：https://rustup.rs/
2. 配置 Visual Studio C++ 工具

---

## 🎯 下一步

环境配置完成后，你可以：

1. **学习 Tauri 基础**
   ```bash
   npm create tauri-app@latest my-app
   cd my-app
   npm install
   npm run tauri dev
   ```

2. **开始重写 TimeRecord 项目**
   - 使用 Svelte 模板
   - 实现可拖拽时间线
   - 迁移数据到 IndexedDB

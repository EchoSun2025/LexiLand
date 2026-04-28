# DesktopWord Prototype

这是一个面向 `Windows / Linux / macOS` 的侧边栏取词原型。当前版本先把共享交互流做出来：

- 常驻式 sidebar 词卡区
- `Alt + 点击单词` 加入词卡
- `Alt + 双击句子` 分析该句中已捕获的多个生词
- 一键导出 JSON
- 预留跨平台 `desktop bridge`
- 可选接入本地 `Ollama` 做句子分析

## 运行

在当前目录执行：

```powershell
node server.js
```

然后打开：

```text
http://localhost:4321
```

如果你已经装了 Ollama，并且模型可用：

```powershell
$env:OLLAMA_BASE_URL="http://127.0.0.1:11434"
$env:OLLAMA_MODEL="qwen2.5:7b"
node server.js
```

## 当前定位

当前不是最终的“全局桌面捕捉”成品，而是先把这几个跨平台共用层稳定下来：

1. 取词卡片数据结构
2. 句子级多词联动分析
3. JSON 导出格式
4. Sidebar UI 和交互
5. 桌面宿主接口边界

## 下一步怎么扩成真正桌面版

建议后续用一个跨平台桌面宿主来包这一套前端界面，宿主层只负责原生能力：

- 全局快捷键
- 置顶悬浮窗 / 第二屏固定位置
- 当前屏幕截图或区域截图
- OCR 或原生文本选区读取
- 系统权限申请

前端继续只负责：

- 词卡展示
- 句子分析
- 数据管理
- 导出到 WordDrop

## 跨平台建议

按工程拆分应为两层：

- `shared sidebar app`
  这一层就是当前目录里的前端与导出逻辑。

- `native desktop host`
  这一层按平台实现 `desktop bridge`：
  `Windows` 接屏幕捕捉 / OCR / 全局热键
  `macOS` 接权限与辅助功能
  `Linux` 分 X11 / Wayland 处理全局捕捉差异

这样以后无论你最终选 `Tauri` 还是 `Electron`，共享逻辑都不用重写。

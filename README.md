# LexiLand Read - 语言学习与阅读辅助软件

一个帮助语言学习者阅读原版书籍的智能辅助工具。

## 🎉 v1.3 新功能

- ⚡ **本地词典查询**：极速离线标注，速度提升 1000 倍
- 🌍 **LLIF 通用格式**：跨软件数据交换标准
- 📍 **来源追踪**：单词和短语自动记录所在文章
- 🎨 **设置面板**：可视化配置标注模式

详见 → [v1.3 功能说明](./FEATURES_v1.3.md) | [快速开始指南](./QUICKSTART_v1.3.md)

## 功能特点

- 📖 支持 txt/epub/docx 文档导入
- 🎯 智能生词标注（基于 B2 等级）
- ⚡ 本地词典查询（5000+ 核心词，离线可用）
- 🔊 单击朗读，双击标词
- 📝 单词卡片（音标、翻译、例句、上下文）
- 💬 短语标注与翻译（AI 驱动）
- 🌍 LLIF 通用数据格式（跨软件兼容）
- 💾 本地存储，隐私优先
- 🎮 手势抽象层，易于迁移 iPad

## 技术栈

- **前端**: React 18 + TypeScript + Vite + Zustand + Dexie.js + Tailwind CSS
- **后端**: Node.js + Fastify + OpenAI API + SQLite
- **未来**: React Native (iPad 版)

## 快速开始

### 1. 安装依赖

```bash
npm install
cd frontend && npm install
cd ../backend && npm install
```

### 2. 配置环境变量

```bash
cp .env.example .env
# 编辑 .env，填入 OPENAI_API_KEY
```

### 3. 启动开发服务器

#### Windows (推荐)

双击运行 `start-dev.ps1`，会自动启动前端和后端服务器：

```powershell
# 或在终端中运行
.\start-dev.ps1
```

停止服务器：
```powershell
.\stop-dev.ps1
```

#### 手动启动 (所有平台)

```bash
# 终端 1: 启动后端
cd backend
npm run dev

# 终端 2: 启动前端
cd frontend
npm run dev
```

**访问地址：**
- 前端: http://localhost:5173
- 后端: http://localhost:3000
- 健康检查: http://localhost:3000/health

## 项目结构

```
├── frontend/          # React 前端
├── backend/           # Fastify 后端
├── shared/            # 共享类型
└── docs/              # 文档
```

## 开发文档

- [v1.3 新功能说明](./FEATURES_v1.3.md) ⭐ 最新
- [v1.3 快速开始指南](./QUICKSTART_v1.3.md) ⭐ 最新
- [标签逻辑说明](./TAGS_LOGIC.md)
- [如何运行](./HOW_TO_RUN.md)
- [技术设计方案](./TECHNICAL_DESIGN.md)
- [API 文档](./docs/API.md)
- [手势映射文档](./docs/GESTURES.md)

## 里程碑

- [x] 技术方案设计
- [ ] Sprint 1: 基础架构与文档导入 (Week 1-2)
- [ ] Sprint 2: 手势抽象层与单词交互 (Week 3)
- [ ] Sprint 3: 词库策略与一键标词 (Week 4)
- [ ] Sprint 4: 单词卡片 (Week 5)
- [ ] Sprint 5: 段落交互与翻译 (Week 6-7)
- [ ] Sprint 6: 选区与插图生成 (Week 8)
- [ ] Sprint 7: 大纲与章节导航 (Week 9)
- [ ] Sprint 8: 设置与提示语编辑 (Week 10)
- [ ] Sprint 9: 缓存与性能优化 (Week 11)
- [ ] Sprint 10: 导出与备份 (Week 12)

## License

MIT

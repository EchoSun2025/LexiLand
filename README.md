# LexiLand Read - 语言学习与阅读辅助软件

一个帮助语言学习者阅读原版书籍的智能辅助工具。

## 功能特点

- 📖 支持 txt/epub/docx 文档导入
- 🎯 智能生词标注（基于 B2 等级）
- 🔊 单击朗读，双击标词
- 📝 单词卡片（音标、翻译、例句、配图）
- 🌍 段落翻译与语法分析
- 🎨 AI 生成上下文插图
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

```bash
npm run dev
```

- 前端: http://localhost:5173
- 后端: http://localhost:3000

## 项目结构

```
├── frontend/          # React 前端
├── backend/           # Fastify 后端
├── shared/            # 共享类型
└── docs/              # 文档
```

## 开发文档

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

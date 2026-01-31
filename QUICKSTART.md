# LexiLand Read - 快速开始指南

## 项目初始化（首次使用）

### 方式一：自动初始化（推荐）

在 PowerShell 中运行：

```powershell
cd D:\00working\20260110_CODE_Lexiland_read
.\init-all.ps1
```

这个脚本会自动：
- ✅ 安装所有依赖（根目录、前端、后端、shared）
- ✅ 配置 TypeScript
- ✅ 配置 Tailwind CSS
- ✅ 创建 `.env` 文件

### 方式二：手动初始化

```powershell
# 1. 安装根目录依赖
npm install

# 2. 初始化 shared
cd shared
npm install
cd ..

# 3. 初始化前端
cd frontend
npm create vite@latest . -- --template react-ts
npm install
npm install zustand dexie dexie-react-hooks
npm install tailwindcss postcss autoprefixer
npm install epubjs mammoth
npm install @headlessui/react @heroicons/react
npm install nanoid date-fns clsx tailwind-merge
npx tailwindcss init -p
cd ..

# 4. 初始化后端
cd backend
npm init -y
npm install fastify @fastify/cors @fastify/rate-limit
npm install openai better-sqlite3 dotenv
npm install -D typescript @types/node tsx nodemon
cd ..

# 5. 创建 .env
cp .env.example .env
```

---

## 配置 OpenAI API Key

编辑 `.env` 文件：

```env
OPENAI_API_KEY=sk-your-actual-key-here
API_SECRET=your-secret-key
```

获取 API Key：https://platform.openai.com/api-keys

---

## 启动开发服务器

### 方式一：同时启动前后端

```powershell
npm run dev
```

这会同时启动：
- 前端: http://localhost:5173
- 后端: http://localhost:3000

### 方式二：分别启动

**终端 1 - 前端**:
```powershell
cd frontend
npm run dev
```

**终端 2 - 后端**:
```powershell
cd backend
npm run dev
```

---

## 项目结构速览

```
LexiLand_read/
├── frontend/          # React 前端
│   ├── src/
│   │   ├── core/      # 核心抽象层（手势、存储、解析器）
│   │   ├── features/  # 功能模块（reader、outline、cards）
│   │   ├── services/  # API 调用封装
│   │   ├── stores/    # Zustand 状态管理
│   │   └── types/     # TypeScript 类型
│
├── backend/           # Fastify 后端
│   ├── src/
│   │   ├── routes/    # API 路由
│   │   ├── services/  # OpenAI 封装、缓存
│   │   └── config/    # 提示语配置
│
├── shared/            # 前后端共享类型
│   └── src/types/
│
└── docs/              # 文档
    ├── API.md         # API 接口文档
    └── GESTURES.md    # 手势抽象层文档
```

---

## 开发工作流

### Sprint 1: 基础架构（当前）

1. **创建基础 UI 布局**
   - 三栏布局：大纲 / 阅读器 / 卡片
   - 顶部导航栏
   - 参考 `TMP/layoutReference.html`

2. **实现文档导入**
   - TxtParser：读取 .txt 文件
   - Token 化：段落 → 句子 → 单词
   - 渲染到阅读器

3. **加载常见 3000 词**
   - 从 `public/known-words-3000.json` 加载
   - 实现 `isKnownWord()` 判断逻辑

**验收标准**: 能导入 txt 文件并在阅读器中渲染

### Sprint 2: 手势与标词

1. **实现手势抽象层**
   - EventManager 单例
   - WebGestureAdapter
   - useGesture Hook

2. **单击朗读**
   - Web Speech API

3. **双击标词**
   - 加粗显示
   - 调用后端 `/api/annotate`
   - 显示音标和翻译

**验收标准**: 双击单词后显示音标和翻译

### Sprint 3: 一键标词

1. **实现 "Auto-mark" 按钮**
   - 过滤已知词
   - 批量标注（限流）

2. **显示/隐藏控制**
   - topbar 切换按钮
   - 显示/隐藏 IPA
   - 显示/隐藏翻译

**验收标准**: 点击按钮后自动标注所有生词

---

## 常用命令

```powershell
# 启动开发服务器
npm run dev

# 单独启动前端
npm run dev:frontend

# 单独启动后端
npm run dev:backend

# 构建生产版本
npm run build

# 类型检查
cd frontend && npx tsc --noEmit
cd backend && npx tsc --noEmit

# 清理缓存
rm -rf node_modules frontend/node_modules backend/node_modules shared/node_modules
```

---

## 调试技巧

### 前端调试

1. **React DevTools**: 安装浏览器插件
2. **Zustand DevTools**: 
   ```typescript
   // stores/useDocumentStore.ts
   import { devtools } from 'zustand/middleware';
   
   export const useDocumentStore = create(
     devtools((set) => ({ ... }))
   );
   ```

3. **查看 IndexedDB**: 
   - Chrome DevTools → Application → IndexedDB

### 后端调试

1. **查看日志**: 
   - Fastify 会自动打印请求日志

2. **查看缓存**: 
   ```powershell
   sqlite3 backend/cache.db
   SELECT * FROM cache LIMIT 10;
   ```

3. **测试 API**: 
   - 使用 Postman 或 Thunder Client (VS Code 插件)

---

## 常见问题

### Q: 前端请求后端时出现 CORS 错误？

A: 检查后端是否正确配置 CORS：
```typescript
// backend/src/server.ts
await fastify.register(cors, {
  origin: 'http://localhost:5173',
  credentials: true,
});
```

### Q: OpenAI API 调用失败？

A: 检查：
1. `.env` 中的 `OPENAI_API_KEY` 是否正确
2. API Key 是否有余额
3. 是否触发了 Rate Limit（查看后端日志）

### Q: 双击单词没反应？

A: 检查：
1. 浏览器控制台是否有错误
2. 后端是否启动
3. `useGesture` Hook 是否正确绑定

### Q: IndexedDB 数据丢失？

A: 浏览器隐私模式下 IndexedDB 不持久化，使用普通模式。

---

## 下一步

- [ ] 阅读 [技术设计方案](./TECHNICAL_DESIGN.md)
- [ ] 阅读 [手势抽象层文档](./docs/GESTURES.md)
- [ ] 阅读 [API 文档](./docs/API.md)
- [ ] 开始实现 Sprint 1

---

## 获取帮助

- **技术问题**: 查看文档或提 Issue
- **OpenAI API**: https://platform.openai.com/docs
- **React 文档**: https://react.dev
- **Fastify 文档**: https://fastify.dev

祝开发顺利！🚀

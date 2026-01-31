# 📁 项目文件清单

## 已创建的文件

### 根目录
```
D:\00working\20260110_CODE_Lexiland_read\
├── README.md                    ✅ 项目说明
├── TECHNICAL_DESIGN.md          ✅ 技术设计方案（约 1 万字）
├── QUICKSTART.md                ✅ 快速开始指南
├── CHECKLIST.md                 ✅ 开发检查清单（10 个 Sprint）
├── SUMMARY.md                   ✅ 项目交付总结
├── package.json                 ✅ Workspace 配置
├── .env.example                 ✅ 环境变量模板
├── .gitignore                   ✅ Git 忽略规则
├── known-words-3000.json        ✅ 常见 3000 词（示例）
├── init-all.ps1                 ✅ 一键初始化脚本
├── init-frontend.ps1            ✅ 前端初始化脚本
└── init-backend.ps1             ✅ 后端初始化脚本
```

### 共享类型（shared/）
```
shared/
├── package.json                 ✅
├── tsconfig.json                ✅
└── src/
    ├── index.ts                 ✅ 导出所有类型
    └── types/
        ├── document.ts          ✅ Document, Chapter, Paragraph, Sentence, Token
        ├── word.ts              ✅ UserVocabulary, MarkedWord
        ├── card.ts              ✅ WordCard, ParagraphCard, IllustrationCard
        ├── gesture.ts           ✅ GestureType, GestureEvent, GestureConfig
        └── api.ts               ✅ API 请求/响应类型
```

### 文档（docs/）
```
docs/
├── API.md                       ✅ API 接口文档（约 2000 字）
└── GESTURES.md                  ✅ 手势抽象层设计文档（约 3000 字）
```

### 布局参考（TMP/）
```
TMP/
└── layoutReference.html         ✅ UI 布局参考（已存在）
```

---

## 待创建的文件（运行 init-all.ps1 后自动生成）

### 前端（frontend/）
```
frontend/
├── package.json                 ⏳ 运行脚本后生成
├── tsconfig.json                ⏳
├── vite.config.ts               ⏳
├── tailwind.config.js           ⏳
├── index.html                   ⏳
├── public/
│   └── known-words-3000.json    📋 需要手动复制
└── src/
    ├── main.tsx                 ⏳
    ├── App.tsx                  ⏳
    │
    ├── core/                    📝 Sprint 1-2 开发
    │   ├── events/
    │   │   ├── EventManager.ts
    │   │   ├── WebGestureAdapter.ts
    │   │   └── useGesture.ts
    │   ├── storage/
    │   │   ├── db.ts
    │   │   ├── DocumentStore.ts
    │   │   └── WordStore.ts
    │   └── parser/
    │       ├── TxtParser.ts
    │       ├── EpubParser.ts
    │       └── DocxParser.ts
    │
    ├── features/                📝 Sprint 1-8 开发
    │   ├── reader/
    │   │   ├── ReaderView.tsx
    │   │   ├── Paragraph.tsx
    │   │   ├── Sentence.tsx
    │   │   ├── Word.tsx
    │   │   └── WordAnnotation.tsx
    │   ├── outline/
    │   │   └── OutlinePanel.tsx
    │   ├── cards/
    │   │   ├── CardPanel.tsx
    │   │   ├── WordCard.tsx
    │   │   └── ParagraphCard.tsx
    │   └── settings/
    │       └── SettingsModal.tsx
    │
    ├── services/                📝 Sprint 2-4 开发
    │   ├── api.ts
    │   ├── tts.ts
    │   └── vocabulary.ts
    │
    ├── stores/                  📝 Sprint 1-3 开发
    │   ├── useDocumentStore.ts
    │   ├── useWordStore.ts
    │   └── useUIStore.ts
    │
    └── styles/
        └── global.css           ⏳
```

### 后端（backend/）
```
backend/
├── package.json                 ⏳ 运行脚本后生成
├── tsconfig.json                ⏳
├── .env                         📋 需要手动创建（复制 .env.example）
└── src/
    ├── index.ts                 📝 Sprint 2 开发
    ├── server.ts                📝
    │
    ├── routes/                  📝 Sprint 2-6 开发
    │   ├── openai.ts
    │   └── health.ts
    │
    ├── services/                📝 Sprint 2-4 开发
    │   ├── OpenAIService.ts
    │   ├── CacheService.ts
    │   └── RateLimiter.ts
    │
    ├── db/
    │   └── sqlite.ts            📝 Sprint 2 开发
    │
    └── config/
        └── prompts.json         📝 Sprint 8 开发
```

---

## 文件创建优先级

### 🔴 高优先级（Sprint 1，立即需要）
1. `frontend/src/main.tsx` - 入口文件
2. `frontend/src/App.tsx` - 根组件
3. `frontend/src/core/storage/db.ts` - IndexedDB 配置
4. `frontend/src/core/parser/TxtParser.ts` - 文档解析
5. `frontend/src/features/reader/ReaderView.tsx` - 阅读器主视图
6. `frontend/src/features/reader/Paragraph.tsx` - 段落组件
7. `frontend/src/features/reader/Word.tsx` - 单词组件

### 🟡 中优先级（Sprint 2-3）
1. `frontend/src/core/events/EventManager.ts` - 手势管理器
2. `frontend/src/core/events/useGesture.ts` - 手势 Hook
3. `frontend/src/services/api.ts` - API 封装
4. `backend/src/index.ts` - 后端入口
5. `backend/src/routes/openai.ts` - OpenAI 路由
6. `backend/src/services/OpenAIService.ts` - OpenAI 封装
7. `backend/src/services/CacheService.ts` - 缓存服务

### 🟢 低优先级（Sprint 4+）
1. `frontend/src/features/cards/WordCard.tsx` - 单词卡片
2. `frontend/src/features/settings/SettingsModal.tsx` - 设置页面
3. `backend/src/config/prompts.json` - 提示语配置

---

## 如何使用此清单

### 1. 初始化项目
```powershell
cd D:\00working\20260110_CODE_Lexiland_read
.\init-all.ps1
```

### 2. 复制必要文件
```powershell
# 复制常见词库到前端 public 目录
Copy-Item known-words-3000.json frontend/public/

# 创建 .env 文件
Copy-Item .env.example backend/.env
# 然后编辑 backend/.env，填入 OPENAI_API_KEY
```

### 3. 按 Sprint 开发
参考 [CHECKLIST.md](./CHECKLIST.md)，逐个完成任务。

---

## 验证清单

### ✅ 已完成（可立即验证）
- [ ] 运行 `init-all.ps1` 无错误
- [ ] `shared/` 目录包含所有类型定义
- [ ] `docs/` 目录包含 API.md 和 GESTURES.md
- [ ] `known-words-3000.json` 包含约 1000 个单词

### ⏳ 待完成（Sprint 1）
- [ ] 前端可访问 http://localhost:5173
- [ ] 后端可访问 http://localhost:3000/health
- [ ] 导入 txt 文件成功
- [ ] 文档渲染到阅读器

---

## 备注

- 📝 = 需要手动开发
- ⏳ = 运行脚本后自动生成
- 📋 = 需要手动配置
- ✅ = 已完成

所有标记为 ✅ 的文件已创建并提交。

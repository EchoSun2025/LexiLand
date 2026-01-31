# LexiLand Read - 技术设计方案

## 1. 推荐技术栈与理由

### 前端核心
- **React 18.x** + TypeScript 5.x
  - **理由**：成熟稳定，社区最大，bug 少，IDE 支持好
  - 生态完整，第三方库问题少
  - Hooks 模式适合交互抽象，易测试
  - 未来可用 React Native 迁移 iPad（代码复用率 70-80%）

- **Vite 5.x**
  - **理由**：启动快，HMR 稳定，配置简单
  - 比 CRA 轻量，比 Webpack 配置少出错

- **状态管理：Zustand**
  - **理由**：比 Redux 轻量 10 倍，API 简单，bug 少
  - 不需要 Provider 嵌套，易测试
  - 支持 TypeScript，类型推导好

- **样式方案：CSS Modules + Tailwind CSS**
  - **理由**：CSS Modules 避免样式冲突，稳定可靠
  - Tailwind 提高开发速度，utility-first 易维护
  - 不用 CSS-in-JS（styled-components），避免运行时开销和 SSR 问题

### 数据存储
- **Dexie.js**（IndexedDB 封装）
  - **理由**：IndexedDB 原生 API 太难用，Dexie 稳定 10 年+
  - 支持 TypeScript，API 类似 SQL，易理解
  - 自动处理版本迁移，bug 少

### 文档解析
- **txt**：直接读取，按段落分割
- **epub**：**epub.js** 或 **epubjs**（7k+ stars，稳定）
- **docx**：**mammoth.js**（专门提取干净 HTML，无样式污染）

### OpenAI API 调用
- **后端：Node.js + Fastify**
  - **理由**：Fastify 比 Express 快 2 倍，内置 Schema 验证
  - TypeScript 支持好，插件系统稳定
  
- **缓存：SQLite**（better-sqlite3）
  - **理由**：不需要额外服务，嵌入式数据库，零配置
  - 比 Redis 简单，适合单机场景
  - 支持全文搜索，可做词库查询

- **限流：@fastify/rate-limit**

### 手势抽象层
- **自定义 EventManager + React Context**
  - 不依赖第三方手势库（hammerjs 已不维护）
  - 自己封装 click/dblclick/hover → tap/longPress/hover 映射
  - 未来 iPad 版只需替换底层事件监听器

### UI 组件库
- **不推荐使用**重型 UI 库（Ant Design/Material-UI）
  - **理由**：样式定制困难，bundle 大，容易版本冲突
  
- **推荐**：Headless UI（@headlessui/react）+ 自定义样式
  - 只提供交互逻辑，不强制样式
  - 轻量，易定制，bug 少

### 国际化（可选）
- **i18next**（如需中英切换）

---

## 2. 项目目录结构

```
D:/00working/20260110_CODE_Lexiland_read/
├── frontend/                      # Web 前端
│   ├── public/
│   │   └── known-words-3000.json  # 常见 3000 词
│   ├── src/
│   │   ├── main.tsx               # 入口
│   │   ├── App.tsx                # 根组件
│   │   ├── vite-env.d.ts
│   │   │
│   │   ├── core/                  # 核心抽象层
│   │   │   ├── events/            # 手势抽象
│   │   │   │   ├── EventManager.ts      # 单例事件管理器
│   │   │   │   ├── GestureAdapter.ts    # Web→iPad 手势映射
│   │   │   │   ├── useGesture.ts        # React Hook
│   │   │   │   └── types.ts             # 手势类型定义
│   │   │   │
│   │   │   ├── storage/           # 数据存储抽象
│   │   │   │   ├── db.ts          # Dexie 配置
│   │   │   │   ├── DocumentStore.ts
│   │   │   │   ├── WordStore.ts
│   │   │   │   └── CardStore.ts
│   │   │   │
│   │   │   └── parser/            # 文档解析器
│   │   │       ├── BaseParser.ts
│   │   │       ├── TxtParser.ts
│   │   │       ├── EpubParser.ts
│   │   │       └── DocxParser.ts
│   │   │
│   │   ├── features/              # 功能模块（按垂直切分）
│   │   │   ├── reader/
│   │   │   │   ├── ReaderView.tsx        # 主阅读区
│   │   │   │   ├── Paragraph.tsx         # 段落组件
│   │   │   │   ├── Sentence.tsx          # 句子组件
│   │   │   │   ├── Word.tsx              # 单词组件
│   │   │   │   ├── WordAnnotation.tsx    # 音标/翻译标注
│   │   │   │   ├── SelectionToolbar.tsx  # 选区生成插图按钮
│   │   │   │   └── useReaderState.ts     # 阅读状态 Hook
│   │   │   │
│   │   │   ├── outline/
│   │   │   │   ├── OutlinePanel.tsx
│   │   │   │   ├── ChapterItem.tsx
│   │   │   │   └── useOutline.ts
│   │   │   │
│   │   │   ├── cards/
│   │   │   │   ├── CardPanel.tsx
│   │   │   │   ├── WordCard.tsx          # 单词卡片
│   │   │   │   ├── ParagraphCard.tsx     # 段落卡片
│   │   │   │   └── IllustrationCard.tsx  # 插图卡片
│   │   │   │
│   │   │   ├── import/
│   │   │   │   ├── ImportModal.tsx
│   │   │   │   ├── FileUploader.tsx
│   │   │   │   └── useImport.ts
│   │   │   │
│   │   │   └── settings/
│   │   │       ├── SettingsModal.tsx
│   │   │       ├── PromptEditor.tsx      # 可编辑提示语
│   │   │       └── useSettings.ts
│   │   │
│   │   ├── services/              # 业务服务
│   │   │   ├── api.ts             # OpenAI API 封装
│   │   │   ├── tts.ts             # 语音朗读
│   │   │   ├── vocabulary.ts      # 词库管理
│   │   │   └── annotation.ts      # 标注生成逻辑
│   │   │
│   │   ├── stores/                # Zustand 状态
│   │   │   ├── useDocumentStore.ts
│   │   │   ├── useWordStore.ts
│   │   │   ├── useUIStore.ts      # UI 状态（侧边栏展开等）
│   │   │   └── useSettingsStore.ts
│   │   │
│   │   ├── types/                 # TypeScript 类型
│   │   │   ├── document.ts
│   │   │   ├── word.ts
│   │   │   ├── card.ts
│   │   │   ├── gesture.ts
│   │   │   └── api.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── text.ts            # 文本处理工具
│   │   │   ├── debounce.ts
│   │   │   └── logger.ts
│   │   │
│   │   └── styles/
│   │       ├── global.css
│   │       └── variables.css
│   │
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── tailwind.config.js
│
├── backend/                       # Node.js 后端
│   ├── src/
│   │   ├── index.ts               # 入口
│   │   ├── server.ts              # Fastify 服务器
│   │   │
│   │   ├── routes/
│   │   │   ├── api.ts             # API 路由
│   │   │   ├── openai.ts          # OpenAI 代理路由
│   │   │   └── health.ts
│   │   │
│   │   ├── services/
│   │   │   ├── OpenAIService.ts   # OpenAI 调用封装
│   │   │   ├── CacheService.ts    # SQLite 缓存
│   │   │   └── RateLimiter.ts     # 限流逻辑
│   │   │
│   │   ├── db/
│   │   │   ├── sqlite.ts          # SQLite 初始化
│   │   │   └── schema.sql         # 数据库表结构
│   │   │
│   │   ├── types/
│   │   │   └── index.ts
│   │   │
│   │   └── config/
│   │       ├── index.ts
│   │       └── prompts.json       # 默认提示语
│   │
│   ├── package.json
│   └── tsconfig.json
│
├── shared/                        # 前后端共享类型
│   ├── types/
│   │   ├── api.ts
│   │   └── openai.ts
│   └── package.json
│
├── docs/                          # 文档
│   ├── API.md
│   ├── GESTURES.md                # 手势映射文档
│   └── DEPLOYMENT.md
│
├── .env.example
├── .gitignore
├── README.md
└── package.json                   # workspace root
```

---

## 3. 核心数据模型

```typescript
// ========== types/document.ts ==========

/** 文档类型 */
export enum DocumentType {
  TXT = 'txt',
  EPUB = 'epub',
  DOCX = 'docx',
  PASTE = 'paste', // 粘贴文本
}

/** 文档元数据 */
export interface Document {
  id: string;                    // UUID
  title: string;
  type: DocumentType;
  language: 'en' | 'zh' | 'auto';
  createdAt: number;             // timestamp
  updatedAt: number;
  chapters: Chapter[];           // 章节列表
  settings: DocumentSettings;
}

/** 章节 */
export interface Chapter {
  id: string;
  title: string;
  order: number;                 // 章节顺序
  paragraphs: Paragraph[];
}

/** 段落 */
export interface Paragraph {
  id: string;
  chapterId: string;
  order: number;
  sentences: Sentence[];
  translation?: string;          // 段落翻译（懒加载）
  analysisCardId?: string;       // 关联的段落卡片 ID
}

/** 句子 */
export interface Sentence {
  id: string;
  paragraphId: string;
  order: number;
  tokens: Token[];               // 词元（包括单词、标点、空格）
  illustrationCardId?: string;   // 关联的插图卡片 ID
}

/** 词元（Token）*/
export interface Token {
  id: string;
  sentenceId: string;
  text: string;
  type: 'word' | 'punctuation' | 'space';
  order: number;
  
  // 如果是单词
  isMarked?: boolean;            // 是否被标记（加粗）
  isKnown?: boolean;             // 是否是已知词（老词，淡橘色）
  annotation?: WordAnnotation;   // 标注信息
  cardId?: string;               // 关联的单词卡片 ID
}

/** 单词标注 */
export interface WordAnnotation {
  word: string;                  // 原词
  ipa?: string;                  // 音标
  translation?: string;          // 翻译
  generatedAt: number;
}

/** 文档设置 */
export interface DocumentSettings {
  fontSize: number;              // 14-20
  lineHeight: number;            // 1.4-2.0
  userLevel: 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
}


// ========== types/word.ts ==========

/** 用户词库 */
export interface UserVocabulary {
  knownWords: Set<string>;       // 已知词（包括常见 3000 + 用户删除的生词）
  markedWords: Map<string, MarkedWord>; // 用户标记的词
}

/** 标记的单词 */
export interface MarkedWord {
  word: string;
  firstMarkedAt: number;         // 首次标记时间
  contexts: WordContext[];       // 出现的上下文
}

/** 单词上下文 */
export interface WordContext {
  documentId: string;
  chapterId: string;
  sentenceId: string;
  markedAt: number;
}


// ========== types/card.ts ==========

/** 卡片类型 */
export enum CardType {
  WORD = 'word',
  PARAGRAPH = 'paragraph',
  ILLUSTRATION = 'illustration',
}

/** 基础卡片 */
export interface BaseCard {
  id: string;
  type: CardType;
  documentId: string;
  chapterId: string;
  createdAt: number;
}

/** 单词卡片 */
export interface WordCard extends BaseCard {
  type: CardType.WORD;
  tokenId: string;
  word: string;
  ipa?: string;
  translation?: string;
  contextExplanation?: string;   // 结合上下文的英文解释
  exampleSentence?: string;      // 生成的例句
  referenceImageUrl?: string;    // 参考图片
  contextImageUrl?: string;      // 上下文生成图
}

/** 段落卡片 */
export interface ParagraphCard extends BaseCard {
  type: CardType.PARAGRAPH;
  paragraphId: string;
  translation: string;
  analysis?: string;             // 句子用法解析
}

/** 插图卡片 */
export interface IllustrationCard extends BaseCard {
  type: CardType.ILLUSTRATION;
  sentenceIds: string[];         // 关联的句子
  imageUrl: string;
  prompt: string;                // 生成图片用的提示语
  annotations?: ImageAnnotation[]; // 图上标注的新单词
}

/** 图片标注 */
export interface ImageAnnotation {
  word: string;
  x: number;                     // 相对位置 0-1
  y: number;
}


// ========== types/gesture.ts ==========

/** 手势事件类型 */
export enum GestureType {
  TAP = 'tap',              // 单击 / 短按
  DOUBLE_TAP = 'doubleTap', // 双击 / 双击
  LONG_PRESS = 'longPress', // 长按（Web 用 hover 模拟）
  HOVER = 'hover',          // 悬停（iPad 用 longPress 替代）
  SELECTION = 'selection',  // 选区
}

/** 手势事件 */
export interface GestureEvent<T = HTMLElement> {
  type: GestureType;
  target: T;
  originalEvent: MouseEvent | TouchEvent | PointerEvent;
  data?: any;               // 自定义数据
}

/** 手势配置 */
export interface GestureConfig {
  platform: 'web' | 'ipad';
  longPressDelay: number;   // 长按延迟（ms）
  doubleTapDelay: number;   // 双击间隔（ms）
}
```

---

## 4. 关键交互与状态流转设计

### 4.1 手势抽象层架构

```typescript
// core/events/EventManager.ts
class EventManager {
  private config: GestureConfig;
  private listeners: Map<GestureType, Set<GestureHandler>>;
  
  // 单例
  static getInstance(): EventManager;
  
  // 配置平台
  configure(config: GestureConfig): void;
  
  // 注册手势监听
  on(type: GestureType, handler: GestureHandler): () => void;
  
  // 触发手势事件
  emit(event: GestureEvent): void;
  
  // 绑定到 DOM 元素（自动处理底层事件）
  attach(element: HTMLElement, gestureType: GestureType, handler: GestureHandler): () => void;
}

// core/events/useGesture.ts
export function useGesture(
  ref: RefObject<HTMLElement>,
  gestureType: GestureType,
  handler: GestureHandler,
  deps: any[] = []
) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    const manager = EventManager.getInstance();
    return manager.attach(element, gestureType, handler);
  }, [ref, gestureType, handler, ...deps]);
}
```

### 4.2 单词交互流程

```
【单击单词】
  → Token.tsx: useGesture(TAP)
    → services/tts.speak(word)  // 朗读

【双击单词】
  → Token.tsx: useGesture(DOUBLE_TAP)
    → 1. UI: 加粗显示（isMarked = true）
    → 2. services/annotation.generate(word, context)
         → API: POST /api/annotate { word, sentence, userLevel }
         → 返回: { ipa, translation }
    → 3. 保存到 WordStore
    → 4. 更新 UI 显示音标和翻译

【再次双击已标记词】
  → Token.tsx: 检测 isMarked === true
    → 展开 WordCard（弹出 Popover）
    → 懒加载：services/annotation.generateDetail(word, context)
      → API: POST /api/word-detail { word, sentence, context }
      → 返回: { contextExplanation, exampleSentence }
    → 渲染 WordCard 组件
    
【WordCard 内部交互】
  - "ref image" 按钮 → API: GET /api/unsplash?q={word}
  - "gen context image" 按钮 → API: POST /api/generate-image { word, context }
  - 点击卡片外部 → 关闭卡片
```

### 4.3 段落交互流程

```
【悬停段落】
  → Paragraph.tsx: useGesture(HOVER)
    → 显示 ">" 按钮（paraActions）

【点击 ">" 按钮】
  → ParagraphCard 出现在右侧面板
    → 1. services/annotation.translateParagraph(paragraph, userLevel)
         → API: POST /api/translate { text, level: 'B2' }
    → 2. services/annotation.analyzeParagraph(paragraph, userLevel)
         → API: POST /api/analyze { text, level: 'B2' }
    → 3. 渲染到 CardPanel
```

### 4.4 选区生成插图流程

```
【用户选中文本】
  → window.getSelection()
    → ReaderView: 监听 selectionchange 事件
    → 判断选中范围在句子内
    → 显示 SelectionToolbar（"gen illustration"按钮）

【点击 "gen illustration"】
  → services/api.generateIllustration(selectedText, context)
    → API: POST /api/generate-illustration {
         sentences: [...],
         context: paragraph,
         newWords: [...],
         userLevel: 'B2'
       }
    → OpenAI: 生成提示语
    → DALL-E 3: 生成图片（1024x1536, 6:9）
    → 返回: { imageUrl, prompt }
    
  → IllustrationCard 插入到右侧面板
    → 图片显示在段落右侧（CSS grid）
    → 新单词用箭头标注在图上
```

### 4.5 状态管理策略

```typescript
// stores/useDocumentStore.ts
interface DocumentStore {
  currentDocument: Document | null;
  currentChapterId: string | null;
  
  // 操作
  loadDocument(id: string): Promise<void>;
  setCurrentChapter(chapterId: string): void;
  updateToken(tokenId: string, updates: Partial<Token>): void;
}

// stores/useWordStore.ts
interface WordStore {
  knownWords: Set<string>;
  markedWords: Map<string, MarkedWord>;
  
  // 操作
  markWord(word: string, context: WordContext): void;
  unmarkWord(word: string): void; // 删除标记 → 加入已知词
  isKnown(word: string): boolean;
}

// stores/useUIStore.ts
interface UIStore {
  isOutlineOpen: boolean;
  showIPA: boolean;
  showTranslation: boolean;
  showOldWordIPA: boolean;
  showOldWordMeaning: boolean;
  
  activeCardId: string | null; // 当前展开的 WordCard
  
  toggleOutline(): void;
  openCard(cardId: string): void;
  closeCard(): void;
}

// stores/useSettingsStore.ts
interface SettingsStore {
  userLevel: 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  prompts: PromptTemplates;
  
  updatePrompt(key: string, template: string): void;
}
```

---

## 5. 文档导入流程与章节生成

### 5.1 导入流程

```typescript
// services/import.ts

export async function importDocument(file: File): Promise<Document> {
  // 1. 检测文件类型
  const type = detectFileType(file);
  
  // 2. 选择解析器
  const parser = getParser(type);
  
  // 3. 解析文件
  const rawContent = await parser.parse(file);
  // rawContent: { title, chapters: Array<{title, html}> }
  
  // 4. 分词与 Token 化
  const document = await tokenizeDocument(rawContent);
  
  // 5. 保存到 IndexedDB
  await db.documents.add(document);
  
  return document;
}

// core/parser/TxtParser.ts
export class TxtParser implements BaseParser {
  async parse(file: File) {
    const text = await file.text();
    
    // 简单策略：按空行分段，整个文件视为一章
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
    
    return {
      title: file.name.replace('.txt', ''),
      chapters: [{
        title: 'Chapter 1',
        paragraphs
      }]
    };
  }
}

// core/parser/EpubParser.ts
export class EpubParser implements BaseParser {
  async parse(file: File) {
    const book = await ePub(file);
    const toc = await book.loaded.navigation;
    
    // 读取目录
    const chapters = await Promise.all(
      toc.toc.map(async (chapter, index) => {
        const section = book.spine.get(chapter.href);
        const html = await section.load(book.load.bind(book));
        const text = extractTextFromHTML(html);
        const paragraphs = splitIntoParagraphs(text);
        
        return {
          title: chapter.label,
          paragraphs
        };
      })
    );
    
    return {
      title: book.packaging.metadata.title,
      chapters
    };
  }
}

// core/parser/DocxParser.ts
export class DocxParser implements BaseParser {
  async parse(file: File) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    // 简单策略：按空行分段
    const paragraphs = result.value.split(/\n\n+/).filter(p => p.trim());
    
    return {
      title: file.name.replace('.docx', ''),
      chapters: [{
        title: 'Chapter 1',
        paragraphs
      }]
    };
  }
}
```

### 5.2 分词策略

```typescript
// utils/text.ts

/** 将段落分割成句子 */
export function splitIntoSentences(paragraph: string): string[] {
  // 简单正则：按 .!? 结尾 + 空格分割
  return paragraph
    .split(/(?<=[.!?])\s+/)
    .filter(s => s.trim());
}

/** 将句子分割成 Token */
export function tokenize(sentence: string): Token[] {
  const tokens: Token[] = [];
  
  // 正则匹配：单词 | 标点 | 空格
  const regex = /(\w+(?:'\w+)?)|([^\w\s])|(\s+)/g;
  let match;
  let order = 0;
  
  while ((match = regex.exec(sentence)) !== null) {
    const [, word, punctuation, space] = match;
    
    if (word) {
      tokens.push({
        id: nanoid(),
        text: word,
        type: 'word',
        order: order++,
        sentenceId: '', // 稍后填充
      });
    } else if (punctuation) {
      tokens.push({
        id: nanoid(),
        text: punctuation,
        type: 'punctuation',
        order: order++,
        sentenceId: '',
      });
    } else if (space) {
      tokens.push({
        id: nanoid(),
        text: space,
        type: 'space',
        order: order++,
        sentenceId: '',
      });
    }
  }
  
  return tokens;
}
```

---

## 6. 词库与"已知词"策略

### 6.1 常见 3000 词

```json
// public/known-words-3000.json
[
  "the", "be", "to", "of", "and", "a", "in", "that", "have", "I",
  // ... 3000 个高频词
]
```

### 6.2 已知词逻辑

```typescript
// services/vocabulary.ts

let knownWordsCache: Set<string> | null = null;

/** 加载已知词（启动时调用一次）*/
export async function loadKnownWords(): Promise<Set<string>> {
  if (knownWordsCache) return knownWordsCache;
  
  // 1. 加载常见 3000 词
  const response = await fetch('/known-words-3000.json');
  const common3000: string[] = await response.json();
  
  // 2. 从 IndexedDB 加载用户删除的生词（即用户认识的词）
  const userKnown = await db.userVocabulary.get('knownWords');
  
  // 3. 合并
  knownWordsCache = new Set([
    ...common3000.map(w => w.toLowerCase()),
    ...(userKnown?.words || [])
  ]);
  
  return knownWordsCache;
}

/** 检查是否已知词 */
export function isKnownWord(word: string): boolean {
  if (!knownWordsCache) {
    throw new Error('Known words not loaded');
  }
  return knownWordsCache.has(word.toLowerCase());
}

/** 标记词为已知（删除生词时调用）*/
export async function markAsKnown(word: string): Promise<void> {
  if (!knownWordsCache) return;
  
  knownWordsCache.add(word.toLowerCase());
  
  // 保存到 IndexedDB
  const current = await db.userVocabulary.get('knownWords');
  const words = current?.words || [];
  words.push(word.toLowerCase());
  
  await db.userVocabulary.put({
    id: 'knownWords',
    words
  });
}

/** 一键标词 */
export async function autoMarkWords(chapter: Chapter): Promise<void> {
  const knownWords = await loadKnownWords();
  const updates: Array<{ tokenId: string; updates: Partial<Token> }> = [];
  
  for (const paragraph of chapter.paragraphs) {
    for (const sentence of paragraph.sentences) {
      for (const token of sentence.tokens) {
        if (token.type !== 'word') continue;
        
        const word = token.text.toLowerCase();
        
        // 跳过已知词
        if (knownWords.has(word)) continue;
        
        // 标记为需要标注
        updates.push({
          tokenId: token.id,
          updates: { isMarked: true }
        });
      }
    }
  }
  
  // 批量更新（避免阻塞 UI）
  await batchUpdateTokens(updates);
  
  // 批量生成标注（限流：每秒 5 个请求）
  await batchGenerateAnnotations(updates.map(u => u.tokenId));
}
```

---

## 7. OpenAI API 调用的后端代理设计

### 7.1 后端架构

```typescript
// backend/src/server.ts
import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { OpenAIService } from './services/OpenAIService';
import { CacheService } from './services/CacheService';

const fastify = Fastify({ logger: true });

// 注册限流插件
await fastify.register(rateLimit, {
  max: 100,              // 每个 IP 每分钟 100 次
  timeWindow: '1 minute'
});

// 全局钩子：检查 API Key
fastify.addHook('preHandler', async (request, reply) => {
  const apiKey = request.headers['x-api-key'];
  if (!apiKey || apiKey !== process.env.API_SECRET) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
});

// 路由
fastify.post('/api/annotate', async (request, reply) => {
  const { word, sentence, userLevel } = request.body;
  
  // 1. 查缓存
  const cached = await CacheService.get('annotate', { word, sentence });
  if (cached) return cached;
  
  // 2. 调用 OpenAI
  const result = await OpenAIService.annotate(word, sentence, userLevel);
  
  // 3. 存缓存
  await CacheService.set('annotate', { word, sentence }, result);
  
  return result;
});

// 其他路由...
```

### 7.2 OpenAI Service

```typescript
// backend/src/services/OpenAIService.ts
import OpenAI from 'openai';
import { getPromptTemplate } from '../config';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class OpenAIService {
  /** 生成单词标注（音标 + 翻译）*/
  static async annotate(word: string, sentence: string, userLevel: string) {
    const prompt = getPromptTemplate('annotate', {
      word,
      sentence,
      userLevel
    });
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an English learning assistant.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      max_tokens: 100,
    });
    
    const text = response.choices[0].message.content?.trim() || '';
    
    // 解析返回（期望格式：/ˈhʌd(ə)ld/ · 聚拢）
    const match = text.match(/^\/(.+?)\/ · (.+)$/);
    if (!match) {
      throw new Error('Invalid annotation format');
    }
    
    return {
      ipa: `/${match[1]}/`,
      translation: match[2]
    };
  }
  
  /** 生成单词详情（上下文解释 + 例句）*/
  static async wordDetail(word: string, context: string, userLevel: string) {
    const prompt = getPromptTemplate('wordDetail', {
      word,
      context,
      userLevel
    });
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are an English learning assistant.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 200,
    });
    
    const text = response.choices[0].message.content?.trim() || '';
    
    // 解析返回（期望格式：JSON）
    return JSON.parse(text);
  }
  
  // 其他方法：translateParagraph, analyzeParagraph, generateIllustration...
}
```

### 7.3 缓存服务

```typescript
// backend/src/services/CacheService.ts
import Database from 'better-sqlite3';
import crypto from 'crypto';

const db = new Database('./cache.db');

// 初始化表
db.exec(`
  CREATE TABLE IF NOT EXISTS cache (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );
  
  CREATE INDEX IF NOT EXISTS idx_created_at ON cache(created_at);
`);

export class CacheService {
  /** 生成缓存键 */
  private static getKey(type: string, params: any): string {
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ type, ...params }))
      .digest('hex');
    return hash;
  }
  
  /** 查询缓存 */
  static get(type: string, params: any): any | null {
    const key = this.getKey(type, params);
    const row = db.prepare('SELECT value FROM cache WHERE key = ?').get(key);
    
    if (!row) return null;
    
    return JSON.parse(row.value);
  }
  
  /** 设置缓存 */
  static set(type: string, params: any, value: any): void {
    const key = this.getKey(type, params);
    const now = Date.now();
    
    db.prepare(`
      INSERT OR REPLACE INTO cache (key, value, created_at)
      VALUES (?, ?, ?)
    `).run(key, JSON.stringify(value), now);
  }
  
  /** 清理 30 天前的缓存 */
  static cleanup(): void {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    db.prepare('DELETE FROM cache WHERE created_at < ?').run(thirtyDaysAgo);
  }
}
```

### 7.4 提示语配置

```json
// backend/src/config/prompts.json
{
  "annotate": {
    "template": "Please provide the IPA pronunciation and Chinese translation for the word \"{{word}}\" in the following sentence:\n\n\"{{sentence}}\"\n\nUser level: {{userLevel}}\n\nFormat your response as: /IPA/ · 中文翻译",
    "editable": true
  },
  "wordDetail": {
    "template": "Given the word \"{{word}}\" in this context:\n\n{{context}}\n\nProvide:\n1. A brief English explanation considering the context\n2. A new example sentence\n\nUser level: {{userLevel}}\n\nReturn JSON: {\"explanation\": \"...\", \"example\": \"...\"}",
    "editable": true
  },
  "translateParagraph": {
    "template": "Translate the following paragraph to Chinese. User level: {{userLevel}}\n\n{{text}}",
    "editable": true
  },
  "analyzeParagraph": {
    "template": "Analyze the grammar and usage of this paragraph for a {{userLevel}} English learner:\n\n{{text}}",
    "editable": true
  },
  "generateIllustration": {
    "template": "Create a DALL-E prompt to generate a 6:9 illustration for these sentences:\n\n{{sentences}}\n\nContext: {{context}}\nNew words to highlight: {{newWords}}\n\nReturn only the prompt, no additional text.",
    "editable": true
  }
}
```

---

## 8. 手势与交互抽象层设计

### 8.1 核心思想

**关键原则**：业务组件不直接监听 DOM 事件，而是通过 `useGesture` Hook 注册语义化手势。

```typescript
// ❌ 错误做法（难以迁移到 iPad）
<div onDoubleClick={handleDoubleClick} onMouseEnter={handleHover}>
  {word}
</div>

// ✅ 正确做法
const ref = useRef<HTMLSpanElement>(null);
useGesture(ref, GestureType.DOUBLE_TAP, handleMarkWord);
useGesture(ref, GestureType.HOVER, handleShowHint);

return <span ref={ref}>{word}</span>;
```

### 8.2 Web 平台实现

```typescript
// core/events/EventManager.ts

class EventManager {
  private config: GestureConfig = {
    platform: 'web',
    longPressDelay: 500,
    doubleTapDelay: 300,
  };
  
  attach(
    element: HTMLElement,
    gestureType: GestureType,
    handler: GestureHandler
  ): () => void {
    switch (gestureType) {
      case GestureType.TAP:
        return this.attachTap(element, handler);
      
      case GestureType.DOUBLE_TAP:
        return this.attachDoubleTap(element, handler);
      
      case GestureType.HOVER:
        return this.attachHover(element, handler);
      
      case GestureType.LONG_PRESS:
        return this.attachLongPress(element, handler);
      
      case GestureType.SELECTION:
        return this.attachSelection(element, handler);
    }
  }
  
  private attachTap(element: HTMLElement, handler: GestureHandler) {
    const listener = (e: MouseEvent) => {
      handler({
        type: GestureType.TAP,
        target: element,
        originalEvent: e,
      });
    };
    
    element.addEventListener('click', listener);
    return () => element.removeEventListener('click', listener);
  }
  
  private attachDoubleTap(element: HTMLElement, handler: GestureHandler) {
    let lastTap = 0;
    
    const listener = (e: MouseEvent) => {
      const now = Date.now();
      if (now - lastTap < this.config.doubleTapDelay) {
        e.preventDefault(); // 阻止默认选中行为
        handler({
          type: GestureType.DOUBLE_TAP,
          target: element,
          originalEvent: e,
        });
        lastTap = 0;
      } else {
        lastTap = now;
      }
    };
    
    element.addEventListener('click', listener);
    return () => element.removeEventListener('click', listener);
  }
  
  private attachHover(element: HTMLElement, handler: GestureHandler) {
    const enter = (e: MouseEvent) => {
      handler({
        type: GestureType.HOVER,
        target: element,
        originalEvent: e,
        data: { entered: true }
      });
    };
    
    const leave = (e: MouseEvent) => {
      handler({
        type: GestureType.HOVER,
        target: element,
        originalEvent: e,
        data: { entered: false }
      });
    };
    
    element.addEventListener('mouseenter', enter);
    element.addEventListener('mouseleave', leave);
    
    return () => {
      element.removeEventListener('mouseenter', enter);
      element.removeEventListener('mouseleave', leave);
    };
  }
  
  private attachLongPress(element: HTMLElement, handler: GestureHandler) {
    let timer: number | null = null;
    
    const start = (e: MouseEvent) => {
      timer = window.setTimeout(() => {
        handler({
          type: GestureType.LONG_PRESS,
          target: element,
          originalEvent: e,
        });
      }, this.config.longPressDelay);
    };
    
    const cancel = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };
    
    element.addEventListener('mousedown', start);
    element.addEventListener('mouseup', cancel);
    element.addEventListener('mouseleave', cancel);
    
    return () => {
      cancel();
      element.removeEventListener('mousedown', start);
      element.removeEventListener('mouseup', cancel);
      element.removeEventListener('mouseleave', cancel);
    };
  }
  
  private attachSelection(element: HTMLElement, handler: GestureHandler) {
    const listener = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) return;
      
      // 检查选区是否在元素内
      const range = selection.getRangeAt(0);
      if (!element.contains(range.commonAncestorContainer)) return;
      
      handler({
        type: GestureType.SELECTION,
        target: element,
        originalEvent: new Event('selectionchange') as any,
        data: { text: selection.toString(), range }
      });
    };
    
    document.addEventListener('selectionchange', listener);
    return () => document.removeEventListener('selectionchange', listener);
  }
}
```

### 8.3 iPad 平台适配（未来）

```typescript
// core/events/GestureAdapter.ts

/** iPad 平台适配器 */
class iPadGestureAdapter {
  attach(
    element: HTMLElement,
    gestureType: GestureType,
    handler: GestureHandler
  ): () => void {
    switch (gestureType) {
      case GestureType.TAP:
        // iOS: touchend
        return this.attachTouch(element, handler, 'tap');
      
      case GestureType.DOUBLE_TAP:
        // iOS: 检测两次快速 touchend
        return this.attachDoubleTouch(element, handler);
      
      case GestureType.HOVER:
        // iOS: 用 long press 模拟（显示提示）
        return this.attachLongPress(element, handler);
      
      case GestureType.LONG_PRESS:
        // iOS: touchstart 后延迟触发
        return this.attachLongPress(element, handler);
      
      case GestureType.SELECTION:
        // iOS: 使用系统选区 API
        return this.attachSelection(element, handler);
    }
  }
  
  // 具体实现...
}
```

### 8.4 业务组件使用示例

```typescript
// features/reader/Word.tsx

interface WordProps {
  token: Token;
  onTap: (word: string) => void;
  onDoubleTap: (word: string) => void;
  onHover: (word: string, entered: boolean) => void;
}

export function Word({ token, onTap, onDoubleTap, onHover }: WordProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const { isMarked, isKnown, annotation } = token;
  
  // 注册手势（自动适配平台）
  useGesture(ref, GestureType.TAP, () => onTap(token.text));
  useGesture(ref, GestureType.DOUBLE_TAP, () => onDoubleTap(token.text));
  useGesture(ref, GestureType.HOVER, (e) => onHover(token.text, e.data.entered));
  
  return (
    <span
      ref={ref}
      className={cn(
        styles.word,
        isMarked && styles.marked,
        isKnown && styles.known
      )}
    >
      {token.text}
      {annotation && (
        <span className={styles.annotation}>
          {annotation.ipa} · {annotation.translation}
        </span>
      )}
    </span>
  );
}
```

---

## 9. MVP 里程碑拆分（按 1-2 周迭代）

### Sprint 1: 基础架构与文档导入 (Week 1-2)
**目标**：搭建项目骨架，实现文档导入和基本渲染

- [ ] 项目初始化（Vite + React + TypeScript）
- [ ] 目录结构搭建
- [ ] 基础 UI 布局（三栏：大纲/阅读器/卡片）
- [ ] IndexedDB 数据库设计（Dexie.js）
- [ ] 文档解析器：TxtParser（优先）
- [ ] 基本的 Token 化（分段 → 句子 → 单词）
- [ ] 渲染文档（Paragraph + Sentence + Token 组件）
- [ ] 常见 3000 词加载

**验收标准**：能导入 txt 文件，在阅读器中渲染出段落和单词

---

### Sprint 2: 手势抽象层与单词交互 (Week 3)
**目标**：实现单击朗读、双击标词

- [ ] EventManager 核心类
- [ ] useGesture Hook
- [ ] 单击单词 → 朗读（Web Speech API）
- [ ] 双击单词 → 加粗显示 + 保存到 WordStore
- [ ] 后端代理搭建（Fastify + OpenAI Service）
- [ ] `/api/annotate` 接口（生成音标和翻译）
- [ ] 前端调用 API 并显示标注

**验收标准**：双击单词后，显示音标和中文翻译

---

### Sprint 3: 词库策略与一键标词 (Week 4)
**目标**：实现已知词过滤和批量标注

- [ ] 已知词逻辑（常见 3000 + 用户已知）
- [ ] 一键标词按钮
- [ ] 批量标注（限流：每秒 5 个请求）
- [ ] 显示/隐藏音标和翻译（topbar 切换）
- [ ] 老词显示（淡橘色）
- [ ] 删除生词 → 加入已知词

**验收标准**：点击"Auto-mark"后，自动标注所有生词（跳过常见 3000 词）

---

### Sprint 4: 单词卡片 (Week 5)
**目标**：双击已标词展开详情卡片

- [ ] WordCard 组件
- [ ] Popover 交互（点击外部关闭）
- [ ] `/api/word-detail` 接口（上下文解释 + 例句）
- [ ] "ref image" 按钮（Unsplash API）
- [ ] "gen context image" 按钮（DALL-E 3）占位
- [ ] 卡片显示在单词上方

**验收标准**：双击已标词，弹出卡片显示详情

---

### Sprint 5: 段落交互与翻译 (Week 6-7)
**目标**：实现段落翻译和分析

- [ ] 段落悬停 → 显示 ">" 按钮
- [ ] ParagraphCard 组件
- [ ] `/api/translate` 接口
- [ ] `/api/analyze` 接口（B2 等级解析）
- [ ] 右侧卡片面板显示段落卡
- [ ] 卡片按时间排序

**验收标准**：点击段落 ">"，右侧显示翻译和分析卡片

---

### Sprint 6: 选区与插图生成（占位）(Week 8)
**目标**：实现选区生成插图（先占位，暂不对接 DALL-E）

- [ ] Selection 手势监听
- [ ] SelectionToolbar 组件
- [ ] IllustrationCard 组件
- [ ] `/api/generate-illustration` 接口（返回占位图）
- [ ] 图片插入到段落右侧（CSS 布局）

**验收标准**：选中文本后，点击按钮生成占位插图

---

### Sprint 7: 大纲与章节导航 (Week 9)
**目标**：支持多章节文档

- [ ] OutlinePanel 组件
- [ ] ChapterItem 组件
- [ ] 切换章节（更新阅读器内容）
- [ ] EpubParser（支持电子书目录）
- [ ] DocxParser（支持 Word 文档）

**验收标准**：导入 epub 文件，左侧显示目录，点击切换章节

---

### Sprint 8: 设置与提示语编辑 (Week 10)
**目标**：用户可配置等级和提示语

- [ ] SettingsModal 组件
- [ ] PromptEditor 组件
- [ ] 保存用户设置到 IndexedDB
- [ ] 后端读取自定义提示语
- [ ] 语音选择（Web Speech API）

**验收标准**：在设置中修改提示语，生成的标注按新提示语返回

---

### Sprint 9: 缓存与性能优化 (Week 11)
**目标**：提高响应速度

- [ ] SQLite 缓存实现
- [ ] 后端限流优化
- [ ] 前端虚拟滚动（长文档）
- [ ] 懒加载（卡片内容按需生成）
- [ ] 批量请求合并

**验收标准**：重复标注同一单词，立即返回（命中缓存）

---

### Sprint 10: 导出与备份 (Week 12)
**目标**：数据导出和恢复

- [ ] 导出文档到 JSON
- [ ] 导出单词库到 CSV
- [ ] 导入备份
- [ ] 清空缓存功能

**验收标准**：能导出文档和单词库，在新设备上恢复

---

## 10. 最容易出 Bug 的点与规避策略

### 10.1 双击事件冲突
**问题**：双击会触发两次单击 + 一次双击，导致朗读 → 标词同时触发

**规避策略**：
```typescript
// ❌ 错误：分别监听 click 和 dblclick
element.addEventListener('click', handleTap);
element.addEventListener('dblclick', handleDoubleTap);

// ✅ 正确：在 click 中延迟判断
let lastTap = 0;
element.addEventListener('click', (e) => {
  const now = Date.now();
  if (now - lastTap < 300) {
    // 双击
    e.preventDefault();
    handleDoubleTap();
    lastTap = 0;
  } else {
    // 等待可能的第二次点击
    setTimeout(() => {
      if (lastTap !== 0) {
        handleTap(); // 确认单击
      }
    }, 300);
    lastTap = now;
  }
});
```

**更好的方案**：用 EventManager 封装，业务组件不感知

---

### 10.2 选区事件冒泡
**问题**：用户选中文本后，点击生成插图按钮，可能误触双击单词

**规避策略**：
```typescript
// SelectionToolbar.tsx
<button
  onClick={(e) => {
    e.stopPropagation(); // 阻止冒泡
    handleGenerateIllustration();
  }}
>
  gen illustration
</button>
```

---

### 10.3 IndexedDB 版本冲突
**问题**：多标签页同时打开，数据库版本升级失败

**规避策略**：
```typescript
// core/storage/db.ts
const db = new Dexie('LexiLand');

db.version(1).stores({
  documents: 'id, createdAt',
  words: 'word, firstMarkedAt',
  cards: 'id, createdAt, documentId',
});

// 监听版本冲突
db.on('versionchange', () => {
  db.close();
  alert('数据库已更新，请刷新页面');
});
```

---

### 10.4 OpenAI API 限流
**问题**：一键标词时并发 100 个请求，触发 Rate Limit

**规避策略**：
```typescript
// utils/rateLimiter.ts
class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private running = 0;
  
  constructor(private maxConcurrent: number) {}
  
  async add<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.process();
    });
  }
  
  private async process() {
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }
    
    this.running++;
    const fn = this.queue.shift()!;
    await fn();
    this.running--;
    
    this.process();
  }
}

export const apiLimiter = new RateLimiter(5); // 最多 5 个并发
```

---

### 10.5 React 状态更新时机
**问题**：快速双击多个单词，UI 更新不及时，用户以为没反应

**规避策略**：
```typescript
// ❌ 错误：直接修改状态
const handleDoubleTap = (word: string) => {
  const token = findToken(word);
  token.isMarked = true; // 不会触发重渲染
};

// ✅ 正确：使用 Zustand 的 immer 模式
const handleDoubleTap = (word: string) => {
  useDocumentStore.getState().updateToken(tokenId, {
    isMarked: true
  });
  
  // 立即反馈
  toast.success(`已标记: ${word}`);
};
```

---

### 10.6 长文档性能
**问题**：10 万字文档，渲染 1 万个 Token 组件，页面卡顿

**规避策略**：
```typescript
// 使用 react-window 虚拟滚动
import { VariableSizeList } from 'react-window';

function ReaderView({ paragraphs }: Props) {
  return (
    <VariableSizeList
      height={800}
      itemCount={paragraphs.length}
      itemSize={(index) => paragraphs[index].height}
      width="100%"
    >
      {({ index, style }) => (
        <div style={style}>
          <Paragraph data={paragraphs[index]} />
        </div>
      )}
    </VariableSizeList>
  );
}
```

---

### 10.7 跨平台字体问题
**问题**：Windows 音标显示乱码

**规避策略**：
```css
/* styles/global.css */
.annotation {
  font-family: 'Segoe UI', 'Noto Sans', 'Arial Unicode MS', sans-serif;
  /* 确保包含 IPA 字符的字体 */
}
```

---

### 10.8 CORS 问题
**问题**：前端调用后端 API 被 CORS 拦截

**规避策略**：
```typescript
// backend/src/server.ts
import cors from '@fastify/cors';

await fastify.register(cors, {
  origin: process.env.NODE_ENV === 'production'
    ? 'https://lexiland.app'
    : 'http://localhost:5173',
  credentials: true,
});
```

---

### 10.9 Safari 兼容性
**问题**：Safari 不支持某些 Web API（如 ResizeObserver）

**规避策略**：
```typescript
// 使用 polyfill
import 'resize-observer-polyfill';

// 或降级方案
if ('ResizeObserver' in window) {
  // 使用 ResizeObserver
} else {
  // 使用 window.resize 事件
}
```

---

### 10.10 手势误触
**问题**：用户想选中文本复制，却误触双击标词

**规避策略**：
```typescript
// 检测是否有选区
const handleDoubleTap = (e: GestureEvent) => {
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) {
    // 用户正在选中文本，忽略双击
    return;
  }
  
  // 执行标词
  markWord(e.target);
};
```

---

## 总结：关键设计原则

1. **关注点分离**：手势抽象层独立，业务组件不依赖平台特定 API
2. **渐进增强**：核心功能（标词、翻译）先做，插图等次要功能可占位
3. **性能优先**：虚拟滚动、懒加载、缓存，避免长文档卡顿
4. **类型安全**：全 TypeScript，减少运行时错误
5. **可测试性**：服务层与组件分离，易写单元测试
6. **用户反馈**：所有异步操作加 loading 和 toast，避免"点了没反应"
7. **错误处理**：API 失败时显示友好提示，不能让应用崩溃
8. **文档优先**：手势映射、API 接口写清楚，方便未来 iPad 迁移

---

## 下一步行动

1. **创建项目骨架**：运行 `npm create vite@latest frontend -- --template react-ts`
2. **安装依赖**：Zustand, Dexie.js, Tailwind CSS 等
3. **实现 Sprint 1**：基础 UI + TxtParser + Token 渲染
4. **搭建后端**：Fastify + OpenAI SDK + SQLite
5. **测试手势抽象层**：确保 Web 平台各手势正常工作

需要我帮你生成项目初始化脚本或具体代码文件吗？

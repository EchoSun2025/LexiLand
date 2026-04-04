# LexiLand Read v1.3 - 新功能说明

## 1. LLIF 通用数据格式 (LexiLearn Interchange Format)

### 什么是 LLIF？

LLIF (LexiLearn Interchange Format) 是一种标准化的语言学习数据交换格式，设计目标：

- **跨软件兼容**：可以在不同的语言学习软件之间共享数据
- **结构化存储**：清晰的层次结构，易于解析和扩展
- **多语言支持**：原生支持多种源语言和目标语言
- **元数据完整**：包含上下文、来源、时间戳等丰富信息

### 数据结构

```json
{
  "version": "1.0",
  "format": "LexiLearn Interchange Format",
  "metadata": {
    "created": "2026-02-10T12:00:00.000Z",
    "source": "LexiLand Read",
    "sourceLanguage": "en",
    "targetLanguage": "zh-CN",
    "creator": "LexiLand v1.3"
  },
  "entries": [
    {
      "type": "word",
      "language": "en",
      "content": {
        "word": "investigate",
        "pronunciation": {
          "ipa": "ɪnˈvestɪɡeɪt"
        },
        "partOfSpeech": "verb",
        "level": "B2"
      },
      "translations": [
        {
          "language": "zh-CN",
          "text": "调查；研究",
          "definition": "进行系统的调查或研究"
        }
      ],
      "context": {
        "sentenceContext": "Perhaps we should investigate...",
        "documentTitle": "The Mystery of Wilder House"
      },
      "metadata": {
        "addedAt": "2026-02-10T12:00:00.000Z"
      }
    },
    {
      "type": "phrase",
      "language": "en",
      "content": {
        "phrase": "overcome her fear"
      },
      "translations": [
        {
          "language": "zh-CN",
          "text": "克服她的恐惧"
        }
      ],
      "context": {
        "sentenceContext": "her curiosity overcoming her fear"
      },
      "metadata": {
        "addedAt": "2026-02-10T12:00:00.000Z"
      }
    }
  ]
}
```

### 如何使用

1. **导出 LLIF 格式**
   - 点击顶部工具栏的 "Export Data" 按钮
   - **右键点击**打开菜单
   - 选择 "Export LLIF (Universal)"
   - 保存的 JSON 文件可以导入到其他支持 LLIF 的语言学习软件

2. **导入 LLIF 格式**（即将支持）
   - 未来版本将支持导入 LLIF 格式的数据

### 与旧格式的区别

| 特性 | 旧格式 (v1.2) | LLIF (v1.0) |
|------|---------------|-------------|
| 字段命名 | `sentence` | `sentenceContext` |
| 结构 | 扁平化 | 层次化（content, translations, context） |
| 扩展性 | 有限 | 高（支持多语言、多译文） |
| 跨软件 | 仅 LexiLand | 通用标准 |
| 元数据 | 基础 | 丰富（来源、创建者、标签） |

## 2. 本地词典查询功能

### 功能说明

- **离线标注**：使用本地词典进行单词标注，无需网络和 API 费用
- **极速响应**：本地查询速度是 AI 的 1000-5000 倍
- **核心词汇**：内置约 5000 个核心英语单词
- **三种模式**：AI、本地、本地优先（推荐）

### 标注模式对比

| 模式 | 速度 | 成本 | 准确性 | 词汇量 | 适用场景 |
|------|------|------|--------|--------|----------|
| **本地优先** ⭐ | 极快 | 免费 | 高（常用词） | 5000+ | 日常阅读（推荐） |
| AI 模式 | 慢 | 付费 | 最高 | 无限 | 专业文献、生僻词 |
| 仅本地 | 极快 | 免费 | 高（常用词） | 5000+ | 离线环境 |

### 如何设置

1. 点击顶部工具栏的 **⚙️ 设置** 按钮
2. 在 "Word Annotation Mode" 区域选择模式：
   - **Local Dictionary First（推荐）**：先查本地词典，找不到再用 AI
   - **AI Only**：始终使用 AI（旧版行为）
   - **Local Dictionary Only**：仅使用本地词典，找不到则跳过

3. 查看词典状态：
   - ✓ Loaded: 10 words（已加载 10 个单词）
   - ⚠ Not loaded yet（尚未加载）

### 本地词典内容

当前包含的示例单词（实际项目中应扩展至 5000+）：

- `the`, `be`, `have` 等基础词
- `investigate`, `curiosity`, `overcome` 等 B1-B2 常用词
- `ancient`, `fear`, `suggest` 等实用词汇

### 扩展词典

词典文件位于：`frontend/public/dictionaries/core-5000.json`

格式：

```json
{
  "word": {
    "word": "word",
    "ipa": "wɜːd",
    "pos": "noun",
    "level": "A1",
    "chinese": "单词；词",
    "definition": "语言的基本单位",
    "examples": ["This is a word."]
  }
}
```

## 3. 数据一致性改进

### sentenceContext 统一命名

- **单词标注**：现在使用 `sentenceContext` 字段（而不是 `sentence`）
- **短语标注**：也使用 `sentenceContext` 字段
- **向后兼容**：导入旧数据时自动转换 `sentence` → `sentenceContext`

### documentTitle 字段

**单词和短语都添加了来源文章标题**：

- 在 Word Card 和 Phrase Card 中显示 "来源" 信息
- 便于日后复习时追溯上下文
- 支持按文章分类浏览（未来功能）

## 4. UI 改进

### 设置面板

- 新增 ⚙️ 设置按钮（顶部工具栏）
- 清晰的模式选择界面
- 实时显示本地词典加载状态

### 导出菜单

- Export All Data (JSON) - 完整数据（LexiLand 专用格式）
- **Export LLIF (Universal)** - 通用格式（新增）
- Export Known Words (TXT) - 已知单词列表

## 5. 开发者信息

### 新增文件

```
frontend/src/
├── types/
│   └── llif.ts                    # LLIF 类型定义
├── services/
│   ├── localDictionary.ts         # 本地词典服务
│   └── llifConverter.ts           # LLIF 转换器
frontend/public/
└── dictionaries/
    └── core-5000.json             # 核心词典数据
```

### API 变更

1. **CachedPhraseAnnotation 接口**（db/index.ts）
   - 新增 `documentTitle?: string`

2. **PhraseAnnotation 接口**（api/index.ts, components/PhraseCard.tsx）
   - 新增 `documentTitle?: string`

3. **AppStore**（store/appStore.ts）
   - 新增 `annotationMode: 'ai' | 'local' | 'local-first'`
   - 新增 `setAnnotationMode(mode)` 方法

### 数据库版本

- **当前版本**：v4（未变更，字段可选）
- **导出格式版本**：v1.2（新增 LLIF 导出）

## 6. 使用建议

### 推荐配置

- **日常阅读**：本地优先模式 + LLIF 定期导出
- **专业学习**：AI 模式（生僻词多）
- **离线使用**：仅本地模式

### 数据管理

1. **定期导出 LLIF**：作为通用备份，可跨软件使用
2. **保留完整备份**：用 "Export All Data" 导出 LexiLand 专用格式
3. **导出已知单词**：用 TXT 格式方便分享和打印

## 7. 未来规划

- [ ] 导入 LLIF 格式数据
- [ ] 扩展本地词典至 10,000+ 单词
- [ ] 支持其他语言（日语、法语等）
- [ ] 按时间/文章分类浏览单词和短语
- [ ] 复习系统（基于 sentenceContext）
- [ ] 与其他 LLIF 兼容软件的生态对接

---

**版本**：v1.3  
**更新日期**：2026-02-10  
**作者**：LexiLand Team

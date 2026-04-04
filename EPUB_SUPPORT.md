# EPUB 电子书支持功能

## ✅ 已完成功能

### 1. EPUB 文件加载
- ✅ 支持上传 `.epub` 格式的电子书
- ✅ 自动解析书籍元数据（书名、作者）
- ✅ 自动提取所有章节内容
- ✅ 跳过空章节
- ✅ 将 HTML 内容转换为纯文本

### 2. 章节导航（Outline 侧边栏）
- ✅ **文档列表视图**：
  - 显示所有文档（文本和 EPUB）
  - EPUB 文档显示 📖 图标和章节数量
  - 文本文档显示 📄 图标
  
- ✅ **章节树视图**（点击 EPUB 文档后）：
  - 显示书名和作者
  - 列出所有章节（带序号）
  - 高亮当前章节
  - "Back to Documents" 按钮返回文档列表

### 3. 章节阅读
- ✅ 点击章节切换显示内容
- ✅ 主面板标题显示当前章节名
- ✅ 副标题显示书名和作者
- ✅ 每章独立的段落分词
- ✅ 完整支持单词标注、phrase 标注等所有原有功能

### 4. 数据结构
```typescript
// EPUB 文档
{
  type: 'epub',
  title: '书名',
  author: '作者',
  chapters: [
    {
      id: 'chapter-0',
      title: 'Chapter 1: Introduction',
      content: '章节文本内容...',
      paragraphs: [...]  // 分词后的段落
    }
  ],
  currentChapterId: 'chapter-0'  // 当前阅读的章节
}

// 普通文本文档
{
  type: 'text',
  title: '文档名',
  content: '...',
  paragraphs: [...]
}
```

## 使用方法

### 导入 EPUB 电子书

1. 点击顶部栏的 **"Import File"** 按钮
2. 选择 `.epub` 文件
3. 等待解析完成（控制台会显示进度）
4. 自动打开书籍的第一章

### 浏览章节

1. **Outline 侧边栏**默认显示文档列表
2. 点击一个 EPUB 文档，展开章节列表
3. 点击任意章节进行阅读
4. 点击 **"← Back to Documents"** 返回文档列表

### 学习和标注

- 所有标注功能（单词、短语、已知词）完全兼容
- 每章独立标注，不会相互影响
- 章节切换时保留学习进度

## 技术实现

### 核心库
- **epubjs**: EPUB 解析库
- 自动安装依赖：`npm install epubjs`

### 关键文件

1. **`frontend/src/utils/epubParser.ts`**
   - EPUB 解析核心逻辑
   - HTML 转文本
   - 章节提取

2. **`frontend/src/store/appStore.ts`**
   - 新增 `Chapter` 和 `Document` 类型
   - 新增 `setCurrentChapter` action

3. **`frontend/src/App.tsx`**
   - `handleFileChange` 支持 EPUB 检测
   - Outline 动态显示章节树
   - 主面板根据章节显示内容

### 已知限制

1. **图片不显示**：EPUB 中的图片会被忽略（提取纯文本）
2. **复杂排版**：诗歌、表格等特殊格式按普通段落处理
3. **性能**：超大 EPUB（>100章）可能加载较慢

### 后续优化建议

- [ ] 支持 EPUB 中的图片显示
- [ ] 添加章节搜索功能
- [ ] 保存每章的阅读进度（滚动位置）
- [ ] 添加书签功能
- [ ] 支持 EPUB 导出（带标注）

## 测试清单

请刷新浏览器（Ctrl+F5）后测试：

1. ✅ 上传一个 EPUB 文件
2. ✅ 检查 Outline 是否显示章节列表
3. ✅ 点击不同章节，内容是否切换
4. ✅ 标注单词，切换章节再回来，标注是否保留
5. ✅ 多个 EPUB 文档可以共存

## 控制台日志

加载 EPUB 时会显示：
```
[App] Loading EPUB file: book.epub
[EPUB] Book loaded: Book Title by Author
[EPUB] Spine items: 25
[EPUB] Parsed chapter 1: Chapter 1 (5234 chars)
...
[EPUB] Successfully parsed 25 chapters
[App] EPUB loaded: Book Title with 25 chapters
```

## 故障排查

如果 EPUB 加载失败：
1. 检查控制台错误信息
2. 确认文件是标准 EPUB 格式（不是 MOBI 或 PDF）
3. 尝试用其他 EPUB 阅读器验证文件是否损坏

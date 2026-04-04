# LexiLand Read v1.3 快速开始指南

## 新功能体验

### 1. 本地词典查询

#### 步骤 1：打开设置
1. 启动软件后，点击顶部工具栏右侧的 **⚙️ 设置** 按钮
2. 在设置面板中，找到 "Word Annotation Mode" 区域

#### 步骤 2：选择标注模式
选择其中一种模式（推荐 "Local Dictionary First"）：

- **Local Dictionary First（推荐）** ⭐
  - 优先使用本地词典（瞬间完成）
  - 本地找不到时自动调用 AI（保证覆盖率）
  - 速度快、成本低、准确性高

- **AI Only**
  - 与旧版相同，始终使用 AI
  - 适合生僻词多的专业文献

- **Local Dictionary Only**
  - 仅使用本地词典，不调用 AI
  - 适合完全离线环境
  - 如果单词不在词典中会跳过

#### 步骤 3：查看词典状态
在设置面板底部的蓝色区域，可以看到：
- ✓ Loaded: 10 words（已加载 10 个单词）

关闭设置面板即可开始使用。

#### 步骤 4：测试本地查询
1. 导入示例文档或创建新文档
2. 选中一个常用单词（如 "the", "be", "have", "investigate" 等）
3. 点击 "Annotate" 按钮
4. 观察浏览器控制台（F12），会看到：
   - `[Local Dict] Found "investigate"`（本地找到）
   - 或 `[Local Dict] Not found "xyz", falling back to AI`（本地没找到，使用 AI）

**速度对比**：
- 本地查询：< 1ms
- AI 查询：200-500ms

### 2. LLIF 通用格式导出

#### 什么时候使用 LLIF？

- 想要在多个语言学习软件之间共享数据
- 需要一个标准化的备份格式
- 希望数据格式更清晰、易读

#### 如何导出 LLIF

1. 点击顶部工具栏的 "Export Data" 按钮
2. **右键点击**（或按住 Ctrl + 左键）
3. 在弹出的菜单中选择 "Export LLIF (Universal)"
4. 保存 JSON 文件（文件名类似 `lexiland-llif-2026-02-10T12-00-00.json`）

#### LLIF 文件预览

打开导出的 JSON 文件，可以看到清晰的结构：

```json
{
  "version": "1.0",
  "format": "LexiLearn Interchange Format",
  "metadata": {
    "created": "2026-02-10T12:00:00.000Z",
    "source": "LexiLand Read",
    "sourceLanguage": "en",
    "targetLanguage": "zh-CN"
  },
  "entries": [
    {
      "type": "word",
      "content": {
        "word": "investigate",
        "pronunciation": { "ipa": "ɪnˈvestɪɡeɪt" },
        "level": "B2"
      },
      "translations": [
        { "language": "zh-CN", "text": "调查；研究" }
      ],
      "context": {
        "sentenceContext": "Perhaps we should investigate...",
        "documentTitle": "The Mystery"
      }
    }
  ]
}
```

### 3. 查看单词和短语的来源

#### Word Card 新增 "来源" 信息

1. 标注单词后，双击该单词打开 Word Card
2. 向下滚动，可以看到：
   - **原文句子**：显示单词所在的完整句子
   - **来源**：显示文章标题

#### Phrase Card 新增 "来源" 信息

1. 标注短语后，双击短语打开 Phrase Card
2. 在解释下方，可以看到：
   - **来源**：显示文章标题

**为什么重要？**
- 日后复习时可以回想起学习场景
- 便于按文章分类管理单词
- 未来可以实现 "按文章浏览" 功能

## 对比测试

### 测试 1：本地词典 vs AI

**准备**：导入一篇英文文章（建议 "The Mystery of Wilder House"）

**步骤**：
1. 在设置中选择 "AI Only" 模式
2. 标记 10 个常用单词（如 the, be, have, perhaps, fear 等）
3. 点击 Annotate，记录耗时（约 2-5 秒）
4. 刷新页面，重新导入文章
5. 在设置中选择 "Local Dictionary First" 模式
6. 标记相同的 10 个单词
7. 点击 Annotate，记录耗时（约 < 0.5 秒）

**结果**：本地查询速度约为 AI 的 5-10 倍

### 测试 2：LLIF 格式

**步骤**：
1. 标注一些单词和短语
2. 右键 "Export Data" → 选择 "Export LLIF (Universal)"
3. 用文本编辑器打开导出的 JSON 文件
4. 对比观察：
   - 字段名称更清晰（`sentenceContext` 而不是 `sentence`）
   - 结构更层次化（`content`, `translations`, `context` 分离）
   - 包含元数据（`metadata.created`, `metadata.source` 等）

### 测试 3：来源信息

**步骤**：
1. 在不同文章中标注单词
2. 双击单词查看 Word Card
3. 观察底部 "来源" 区域是否显示正确的文章标题

## 常见问题

### Q1: 本地词典只有 10 个单词？

是的，这是示例版本。实际项目中应该：
1. 下载完整的 ECDICT 核心 5000 词数据
2. 替换 `frontend/public/dictionaries/core-5000.json`
3. 或参考 `FEATURES_v1.3.md` 中的词典扩展说明

### Q2: 如何知道是用了本地词典还是 AI？

打开浏览器控制台（F12），查看 Console 标签页：
- 看到 `[Local Dict] Found "word"` = 使用了本地词典
- 看到 `[Local Dict] Not found "word", falling back to AI` = 本地没找到，使用了 AI

### Q3: LLIF 格式可以导入吗？

v1.3 版本暂时只支持导出。导入功能将在未来版本中添加。

### Q4: 旧数据会丢失吗？

不会！新版本向后兼容：
- 旧的 `sentence` 字段会自动转换为 `sentenceContext`
- 旧的单词卡依然可以正常显示
- 导入旧的 JSON 备份不会有问题

### Q5: 短语标注还是用 AI 吗？

是的，短语标注始终使用 AI，因为：
- 短语通常是上下文相关的
- 本地词典很难覆盖所有短语组合
- 短语数量相对较少，AI 成本可接受

## 最佳实践

### 推荐工作流

1. **设置**：选择 "Local Dictionary First" 模式
2. **阅读**：导入文章，边读边标记生词
3. **标注**：点击 Annotate，快速获取释义
4. **复习**：双击单词查看 Word Card，包含原句和来源
5. **备份**：
   - 日常备份：Export All Data (JSON)
   - 跨软件备份：Export LLIF (Universal)
   - 打印复习：Export Known Words (TXT)

### 数据管理建议

- **每周导出一次 LLIF**：作为通用备份
- **每月导出一次完整数据**：保留所有细节
- **学习完一篇文章**：点击 Finish 按钮标记完成

## 反馈与贡献

如果您有任何问题或建议，欢迎：
- 提交 Issue（如果这是开源项目）
- 扩展本地词典数据
- 开发 LLIF 兼容的其他软件

---

**版本**：v1.3  
**文档更新**：2026-02-10  
祝您学习愉快！🎉

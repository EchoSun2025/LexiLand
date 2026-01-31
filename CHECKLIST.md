# 开发检查清单

## Sprint 1: 基础架构与文档导入 ✅/❌

### 环境搭建
- [ ] 运行 `init-all.ps1` 初始化项目
- [ ] 配置 `.env` 文件（填入 OPENAI_API_KEY）
- [ ] 启动开发服务器 `npm run dev`
- [ ] 验证前端访问 http://localhost:5173
- [ ] 验证后端访问 http://localhost:3000/health

### 前端基础
- [ ] 创建三栏布局（参考 `layoutReference.html`）
  - [ ] 左侧：OutlinePanel
  - [ ] 中间：ReaderPanel
  - [ ] 右侧：CardPanel
- [ ] 创建 TopBar 组件
  - [ ] 大纲按钮（三横线）
  - [ ] Auto-mark 按钮
  - [ ] IPA/中文切换按钮
  - [ ] 等级选择器
- [ ] 配置 Tailwind CSS（使用 layoutReference 的配色）

### 数据存储
- [ ] 配置 Dexie.js
  - [ ] 创建 `documents` 表
  - [ ] 创建 `words` 表
  - [ ] 创建 `cards` 表
- [ ] 实现 `DocumentStore` 类
- [ ] 实现 `WordStore` 类
- [ ] 测试数据持久化（刷新页面后数据仍在）

### 文档解析
- [ ] 实现 `TxtParser`
  - [ ] 按段落分割
  - [ ] 按句子分割
  - [ ] Token 化（单词、标点、空格）
- [ ] 加载常见 3000 词到 `public/known-words-3000.json`
- [ ] 实现 `isKnownWord()` 函数

### 文档渲染
- [ ] 创建 `Paragraph` 组件
- [ ] 创建 `Sentence` 组件
- [ ] 创建 `Token` 组件（区分 word/punctuation/space）
- [ ] 实现基本样式（参考 layoutReference）

### 导入功能
- [ ] 创建 `ImportModal` 组件
- [ ] 实现文件选择器
- [ ] 实现 "+" 新建文本按钮
- [ ] 实现粘贴文本功能
- [ ] 保存文档到 IndexedDB
- [ ] 渲染文档到阅读器

### 验收测试
- [ ] 导入 `.txt` 文件成功
- [ ] 文档正确分段、分句、分词
- [ ] 刷新页面后文档仍在
- [ ] 已知词（常见 3000 词）不会高亮

---

## Sprint 2: 手势抽象层与单词交互 ✅/❌

### 手势抽象层
- [ ] 创建 `EventManager` 类（单例）
- [ ] 实现 `WebGestureAdapter`
  - [ ] TAP 事件
  - [ ] DOUBLE_TAP 事件（解决双击冲突）
  - [ ] HOVER 事件
- [ ] 创建 `useGesture` Hook
- [ ] 测试双击不会误触单击

### 单词交互
- [ ] 单击单词 → 朗读
  - [ ] 使用 Web Speech API
  - [ ] 显示朗读状态（高亮当前单词）
- [ ] 双击单词 → 标词
  - [ ] 加粗显示（CSS `font-weight: 700`）
  - [ ] 保存到 WordStore
  - [ ] 显示 loading 状态

### 后端 API
- [ ] 搭建 Fastify 服务器
- [ ] 配置 CORS
- [ ] 实现 `/api/annotate` 接口
  - [ ] 调用 OpenAI API
  - [ ] 解析返回（IPA + 翻译）
  - [ ] 错误处理
- [ ] 实现 SQLite 缓存
  - [ ] 创建 cache 表
  - [ ] 实现 `CacheService.get/set`
  - [ ] 测试缓存命中
- [ ] 实现限流（@fastify/rate-limit）

### 标注显示
- [ ] 创建 `WordAnnotation` 组件
- [ ] 调用后端 API 生成标注
- [ ] 显示音标（小两号字体）
- [ ] 显示翻译（小两号字体）
- [ ] 处理 API 错误（显示 toast）

### 验收测试
- [ ] 单击单词能朗读
- [ ] 双击单词显示音标和翻译
- [ ] 重复双击同一单词，立即返回（命中缓存）
- [ ] 标注样式符合 layoutReference

---

## Sprint 3: 词库策略与一键标词 ✅/❌

### 已知词逻辑
- [ ] 实现 `loadKnownWords()` 函数
  - [ ] 加载常见 3000 词
  - [ ] 加载用户已知词（IndexedDB）
  - [ ] 合并为 Set
- [ ] 实现 `markAsKnown()` 函数
  - [ ] 删除生词时调用
  - [ ] 保存到 IndexedDB
- [ ] 老词显示（淡橘色 `#fed7aa`）

### 一键标词
- [ ] 实现 `autoMarkWords()` 函数
  - [ ] 过滤已知词
  - [ ] 收集需要标注的单词
  - [ ] 批量调用 API（限流：每秒 5 个）
- [ ] 后端实现 `/api/batch-annotate` 接口
- [ ] 显示进度条（标注进度：23/100）
- [ ] 标注完成后显示成功提示

### 显示控制
- [ ] 实现 `UIStore`
  - [ ] `showIPA: boolean`
  - [ ] `showTranslation: boolean`
  - [ ] `showOldWordIPA: boolean`
  - [ ] `showOldWordMeaning: boolean`
- [ ] topbar 切换按钮控制显示
- [ ] CSS 条件渲染音标和翻译

### 删除生词
- [ ] 标注上显示小 "X" 按钮（hover 时）
- [ ] 点击 "X" → 删除标注 + 加入已知词
- [ ] 更新 UI（移除加粗和标注）

### 验收测试
- [ ] 点击 "Auto-mark" 后自动标注所有生词
- [ ] 常见 3000 词不会被标注
- [ ] 切换 IPA/翻译按钮生效
- [ ] 删除生词后，该词变为已知词

---

## Sprint 4: 单词卡片 ✅/❌

### WordCard 组件
- [ ] 创建 `WordCard` 组件
- [ ] 实现 Popover 交互（点击外部关闭）
- [ ] 显示单词、音标、翻译
- [ ] 显示上下文解释（懒加载）
- [ ] 显示例句（懒加载）

### WordCard 交互
- [ ] 双击已标词 → 展开 WordCard
- [ ] 卡片显示在单词上方（position: absolute）
- [ ] "ref image" 按钮
  - [ ] 调用 Unsplash API
  - [ ] 显示图片
- [ ] "gen context image" 按钮
  - [ ] 调用 DALL-E（占位）
  - [ ] 显示生成图

### 后端 API
- [ ] 实现 `/api/word-detail` 接口
- [ ] 实现 `/api/reference-image` 接口
- [ ] （可选）实现 `/api/generate-image` 接口

### 卡片管理
- [ ] 保存 WordCard 到 IndexedDB
- [ ] 在右侧 CardPanel 显示所有卡片
- [ ] 按创建时间倒序排列
- [ ] 点击卡片 → 跳转到对应单词

### 验收测试
- [ ] 双击已标词展开 WordCard
- [ ] 卡片显示上下文解释和例句
- [ ] "ref image" 按钮能获取图片
- [ ] 点击卡片外部关闭

---

## Sprint 5: 段落交互与翻译 ✅/❌

### 段落悬停
- [ ] Paragraph 组件实现 HOVER 手势
- [ ] 显示 ">" 按钮（position: absolute, right: 8px）
- [ ] 按钮样式符合 layoutReference

### ParagraphCard
- [ ] 创建 `ParagraphCard` 组件
- [ ] 显示段落原文
- [ ] 显示翻译
- [ ] 显示语法分析（B2 等级）

### 后端 API
- [ ] 实现 `/api/translate` 接口
- [ ] 实现 `/api/analyze` 接口
- [ ] 提示语支持 `{{userLevel}}` 变量

### 卡片展示
- [ ] 点击 ">" → 生成 ParagraphCard
- [ ] 卡片显示在右侧 CardPanel
- [ ] 保存到 IndexedDB
- [ ] 按创建时间排序

### 验收测试
- [ ] 悬停段落显示 ">" 按钮
- [ ] 点击按钮生成段落卡片
- [ ] 卡片显示翻译和分析
- [ ] 刷新后卡片仍在

---

## Sprint 6: 选区与插图生成（占位）✅/❌

### 选区检测
- [ ] 监听 `selectionchange` 事件
- [ ] 判断选区是否在阅读器内
- [ ] 提取选中的句子 ID

### SelectionToolbar
- [ ] 创建 `SelectionToolbar` 组件
- [ ] 显示 "gen illustration" 按钮
- [ ] 按钮位置跟随选区（getBoundingClientRect）
- [ ] 点击按钮 → 生成插图

### IllustrationCard
- [ ] 创建 `IllustrationCard` 组件
- [ ] 显示占位图片（暂不对接 DALL-E）
- [ ] 显示生成提示语
- [ ] 图片插入到段落右侧（CSS grid）

### 后端 API
- [ ] 实现 `/api/generate-illustration` 接口
- [ ] 返回占位图片 URL

### 验收测试
- [ ] 选中文本后显示 "gen illustration" 按钮
- [ ] 点击按钮生成插图卡片
- [ ] 卡片显示在右侧面板

---

## Sprint 7: 大纲与章节导航 ✅/❌

### OutlinePanel
- [ ] 创建 `OutlinePanel` 组件
- [ ] 显示文档列表
- [ ] 显示章节列表（如果是多章节文档）
- [ ] 点击章节 → 切换阅读器内容

### 多章节支持
- [ ] 实现 `EpubParser`
  - [ ] 读取 epub 目录（TOC）
  - [ ] 按章节分割
- [ ] 实现 `DocxParser`
  - [ ] 读取 docx 文档
  - [ ] 简单按段落分割
- [ ] 章节导航（上一章/下一章）

### 文档管理
- [ ] "+" 新建文档按钮
- [ ] "导入文件" 按钮
- [ ] 删除文档功能
- [ ] 重命名文档功能

### 验收测试
- [ ] 导入 epub 文件，左侧显示目录
- [ ] 点击章节切换内容
- [ ] 导入 docx 文件成功

---

## Sprint 8: 设置与提示语编辑 ✅/❌

### SettingsModal
- [ ] 创建 `SettingsModal` 组件
- [ ] 用户等级选择（A2-C2）
- [ ] 字体大小、行高调整
- [ ] 语音选择（Web Speech API）

### PromptEditor
- [ ] 创建 `PromptEditor` 组件
- [ ] 显示所有提示语
- [ ] 编辑提示语（textarea）
- [ ] 保存到后端

### 后端 API
- [ ] 实现 `/api/prompts` GET（获取提示语）
- [ ] 实现 `/api/prompts` PUT（更新提示语）
- [ ] 提示语支持变量替换（{{word}}, {{sentence}}）

### 验收测试
- [ ] 修改提示语后，API 返回按新提示语生成
- [ ] 修改用户等级，分析结果符合等级

---

## Sprint 9: 缓存与性能优化 ✅/❌

### 后端缓存
- [ ] 查询缓存命中率
- [ ] 实现 `/api/cache/stats` 接口
- [ ] 实现缓存清理（30 天前）
- [ ] 手动清除缓存功能

### 前端性能
- [ ] 虚拟滚动（react-window）
  - [ ] 测试 10 万字文档
  - [ ] 优化渲染性能
- [ ] 懒加载（卡片内容按需生成）
- [ ] 图片懒加载

### 批量请求优化
- [ ] 实现 `RateLimiter` 类
- [ ] 批量标注时限流（每秒 5 个）
- [ ] 显示进度条

### 验收测试
- [ ] 重复标注同一单词，立即返回
- [ ] 10 万字文档流畅滚动
- [ ] 批量标注不会触发 Rate Limit

---

## Sprint 10: 导出与备份 ✅/❌

### 导出功能
- [ ] 导出文档到 JSON
- [ ] 导出单词库到 CSV
- [ ] 导出所有卡片
- [ ] 导出为 HTML（可打印）

### 导入备份
- [ ] 导入 JSON 备份
- [ ] 恢复单词库
- [ ] 恢复卡片

### 数据清理
- [ ] 清空所有文档
- [ ] 清空单词库
- [ ] 清空缓存

### 验收测试
- [ ] 导出文档，在新设备上导入成功
- [ ] 导出单词库，数据完整

---

## 最终验收 ✅/❌

### 功能完整性
- [ ] 导入 txt/epub/docx 文件
- [ ] 单击朗读
- [ ] 双击标词（音标 + 翻译）
- [ ] 一键标词
- [ ] 单词卡片（解释 + 例句 + 图片）
- [ ] 段落卡片（翻译 + 分析）
- [ ] 生成插图
- [ ] 章节导航
- [ ] 设置与提示语编辑

### 性能
- [ ] 10 万字文档流畅滚动
- [ ] 批量标注不卡顿
- [ ] 缓存命中率 > 70%

### 用户体验
- [ ] 所有操作有 loading 状态
- [ ] 错误有友好提示
- [ ] 布局响应式（1100px 以下单栏）
- [ ] 样式符合 layoutReference

### 代码质量
- [ ] TypeScript 无错误
- [ ] 手势抽象层易于迁移
- [ ] 代码有注释
- [ ] 关键函数有单元测试

---

## 下一步：iPad 迁移准备 ✅/❌

- [ ] 实现 `iPadGestureAdapter`
- [ ] 测试 React Native 兼容性
- [ ] 封装平台特定代码（文件系统、存储）
- [ ] 设计 iPad UI（更大的按钮、手势优化）

---

## 备注

- 每完成一个 Sprint，更新此清单
- 遇到问题记录在 [ISSUES.md](./ISSUES.md)
- 定期 Code Review，保持代码质量

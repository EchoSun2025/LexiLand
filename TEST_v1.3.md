# v1.3 功能验证测试

## 测试前准备

1. 确保前端正在运行：http://localhost:5175
2. 打开浏览器控制台（按 F12）
3. 切换到 Console 标签页

## 测试 1：本地词典初始化

### 预期结果
在 Console 中看到：
```
[App] Local dictionary initialized: 10 words
```

### 实际结果
- [ ] 看到了初始化日志
- [ ] 显示词典大小为 10

---

## 测试 2：设置面板

### 步骤
1. 点击顶部工具栏的 ⚙️ 按钮
2. 检查设置面板是否打开
3. 查看 "Word Annotation Mode" 区域
4. 查看底部蓝色的 "Local Dictionary Status"

### 预期结果
- 设置面板正常打开
- 显示三个单选按钮（AI Only, Local Dictionary Only, Local Dictionary First）
- 默认选中 "Local Dictionary First"
- 底部显示 "✓ Loaded: 10 words"

### 实际结果
- [ ] 设置面板正常
- [ ] 三个选项都能选择
- [ ] 词典状态显示正确

---

## 测试 3：本地词典查询

### 步骤
1. 点击 "Load sample" 加载示例文章
2. 确保设置中选择 "Local Dictionary First"
3. 单击以下单词进行标记（这些词在本地词典中）：
   - investigate
   - curiosity
   - overcome
   - fear
   - perhaps
4. 点击顶部的 "Annotate" 按钮
5. 观察 Console 输出

### 预期结果
在 Console 中看到：
```
[Local Dict] Found "investigate"
[Local Dict] Found "curiosity"
[Local Dict] Found "overcome"
[Local Dict] Found "fear"
[Local Dict] Found "perhaps"
```

### 实际结果
- [ ] 看到了 Local Dict 日志
- [ ] 所有单词都标记为 "Found"
- [ ] 标注速度明显快于 AI 模式

---

## 测试 4：AI 回退机制

### 步骤
1. 保持 "Local Dictionary First" 模式
2. 单击一个不在本地词典中的单词（如 "mysterious", "ancient"）
3. 点击 "Annotate" 按钮
4. 观察 Console 输出

### 预期结果
看到类似：
```
[Local Dict] Not found "mysterious", falling back to AI
```

### 实际结果
- [ ] 看到了回退日志
- [ ] AI 标注成功
- [ ] 单词卡正常显示

---

## 测试 5：模式切换

### 步骤
1. 打开设置，切换到 "AI Only"
2. 标记一个单词
3. 点击 "Annotate"
4. 观察 Console（不应该有 Local Dict 日志）

### 预期结果
- Console 中没有 `[Local Dict]` 日志
- 直接调用 AI 标注

### 实际结果
- [ ] AI Only 模式正常工作
- [ ] 没有本地查询日志

---

## 测试 6：LLIF 导出

### 步骤
1. 确保已标注了一些单词和短语
2. **右键点击** "Export Data" 按钮
3. 在弹出菜单中选择 "Export LLIF (Universal)"
4. 保存文件
5. 用文本编辑器打开导出的 JSON 文件

### 预期结果
JSON 文件包含：
```json
{
  "version": "1.0",
  "format": "LexiLearn Interchange Format",
  "metadata": {
    "source": "LexiLand Read",
    "sourceLanguage": "en",
    "targetLanguage": "zh-CN"
  },
  "entries": [
    {
      "type": "word",
      "content": { ... },
      "translations": [ ... ],
      "context": {
        "sentenceContext": "...",
        "documentTitle": "..."
      }
    }
  ]
}
```

### 实际结果
- [ ] LLIF 文件结构正确
- [ ] 包含 metadata 信息
- [ ] entries 字段包含单词和短语
- [ ] sentenceContext 和 documentTitle 存在

---

## 测试 7：Word Card 显示来源

### 步骤
1. 标注一个单词（确保在标注前已加载文章）
2. 双击该单词打开 Word Card
3. 向下滚动到底部

### 预期结果
- 看到 "原文句子" 区域，显示完整句子
- 看到 "来源" 区域，显示文章标题

### 实际结果
- [ ] 原文句子显示正确
- [ ] 来源信息显示正确

---

## 测试 8：Phrase Card 显示来源

### 步骤
1. 选中一个短语（如 "overcome her fear"）
2. 点击 "Annotate" 按钮标注短语
3. 双击短语打开 Phrase Card
4. 查看卡片内容

### 预期结果
- 翻译显示在最上方
- Context 显示原句
- 解释（如果有）
- **来源** 显示文章标题

### 实际结果
- [ ] Phrase Card 布局正确
- [ ] 来源信息显示正确

---

## 测试 9：向后兼容

### 步骤（如果有 v1.2 备份）
1. 点击 "Import Data"
2. 选择 v1.2 的备份文件
3. 等待导入完成
4. 查看是否有错误
5. 双击旧的单词查看 Word Card

### 预期结果
- 导入成功，没有错误
- 旧单词正常显示
- 缺少 documentTitle 字段不影响使用

### 实际结果
- [ ] 导入成功
- [ ] 旧数据正常显示

---

## 测试 10：性能对比

### 步骤
1. 标记 10 个在本地词典中的单词
2. 记录标注耗时（从点击 Annotate 到完成）
3. 刷新页面
4. 切换到 "AI Only" 模式
5. 标记相同的 10 个单词
6. 记录标注耗时

### 预期结果
- Local First 模式：< 1 秒
- AI Only 模式：2-5 秒

### 实际结果
- [ ] Local First: _____ 秒
- [ ] AI Only: _____ 秒
- [ ] 速度提升约 _____ 倍

---

## 问题记录

### 发现的问题
1. 
2. 
3. 

### 改进建议
1. 
2. 
3. 

---

## 测试结论

- [ ] 所有核心功能正常
- [ ] 性能符合预期
- [ ] 向后兼容性良好
- [ ] 可以发布 v1.3

**测试人**：  
**测试日期**：  
**测试环境**：  
- 浏览器：
- 操作系统：
- Node.js 版本：

---

**备注**：

# 本地词典说明

## 当前词典

**文件**: `frontend/public/dictionaries/core-1000.json`
**词汇量**: 88 个核心词
**来源**: 手工精选的最常用英语单词

### 词汇分布

- **A1 级别**: 81 个（最基础）
- **A2 级别**: 2 个
- **B1 级别**: 3 个
- **B2 级别**: 2 个

### 包含的单词类型

1. **冠词和代词**: the, a, I, you, he, she, it, we, they, this, that, etc.
2. **常用动词**: be, have, do, go, get, make, take, see, know, think, etc.
3. **常用介词**: in, on, at, to, from, with, for, by, about, etc.
4. **常用连词**: and, but, or, if, when, because, etc.
5. **常用形容词**: good, new, old, great, small, large, etc.
6. **学习词汇**: investigate, curiosity, overcome, fear, suggest, etc.

## 扩展词典

### 方式 1：使用预生成的基础词典（已完成）✅

当前使用的方式，包含 88 个最常用词。

### 方式 2：下载并转换 ECDICT（推荐用于生产环境）

ECDICT 是一个开源的英汉词典，包含 77 万词条。

#### 步骤：

1. **下载 ECDICT 数据**
   ```bash
   # 访问 GitHub
   https://github.com/skywind3000/ECDICT
   
   # 下载 stardict.csv（约 200MB）
   ```

2. **安装 Python（如果没有）**
   ```
   https://www.python.org/downloads/
   ```

3. **运行转换脚本**
   ```bash
   # 将 stardict.csv 放到 scripts 目录
   cd scripts
   python convert_ecdict.py stardict.csv ../frontend/public/dictionaries/core-10000.json 10000
   ```

4. **验证**
   - 重启开发服务器
   - 打开设置面板
   - 查看词典状态应显示 "Loaded: 10000 words"

### 方式 3：使用在线 API（备选）

可以集成免费的在线词典 API：
- Free Dictionary API: https://dictionaryapi.dev/
- 优点：无需本地文件，词汇量无限
- 缺点：需要网络，速度较慢

## 词典格式

```json
{
  "word": {
    "word": "example",
    "ipa": "ɪɡˈzɑːmpl",
    "pos": "noun",
    "level": "B1",
    "chinese": "例子；榜样",
    "definition": "a thing characteristic of its kind",
    "examples": ["For example, this is how you do it."]
  }
}
```

### 字段说明

- `word`: 单词（小写）
- `ipa`: 国际音标
- `pos`: 词性（noun, verb, adjective, etc.）
- `level`: CEFR 等级（A1, A2, B1, B2, C1, C2）
- `chinese`: 中文翻译
- `definition`: 英文释义
- `examples`: 例句数组（可选）

## 性能考虑

### 词典大小建议

| 词汇量 | 文件大小 | 加载时间 | 内存占用 | 适用场景 |
|--------|----------|----------|----------|----------|
| 100 | 20 KB | < 10ms | < 100 KB | 测试/演示 |
| 1,000 | 200 KB | < 50ms | 1 MB | 基础阅读 |
| 5,000 | 1 MB | < 200ms | 5 MB | 日常阅读 |
| 10,000 | 2-3 MB | < 500ms | 10 MB | 高级阅读 ⭐推荐 |
| 20,000 | 4-6 MB | 1-2s | 20 MB | 专业阅读 |

### 优化建议

1. **懒加载**: 首次使用时才加载词典
2. **按需加载**: 根据文章难度动态选择词典大小
3. **缓存策略**: 使用 Service Worker 缓存词典文件
4. **分片加载**: 将大词典分成多个文件，按需加载

## 词典来源

### 推荐的开源词典

1. **ECDICT** ⭐推荐
   - GitHub: https://github.com/skywind3000/ECDICT
   - 许可证: MIT
   - 词汇量: 77万+
   - 质量: 高（含音标、词频、标签）

2. **FreeDictionary**
   - 网站: https://dictionaryapi.dev/
   - 许可证: 免费
   - 词汇量: 无限（在线API）
   - 质量: 中等

3. **WordNet**
   - 网站: https://wordnet.princeton.edu/
   - 许可证: BSD
   - 词汇量: 15万+
   - 质量: 高（学术级）

## 维护建议

### 定期更新

- 每季度检查 ECDICT 是否有更新
- 根据用户反馈补充常用词
- 优化词性和等级标注

### 质量控制

- 定期抽查词条准确性
- 收集用户反馈的错误
- 对比多个来源确保准确

## 故障排除

### 问题 1: 词典加载失败

**症状**: 设置面板显示 "Not loaded yet"

**解决方案**:
1. 检查文件是否存在: `frontend/public/dictionaries/core-1000.json`
2. 检查浏览器控制台是否有错误
3. 尝试清除浏览器缓存
4. 确认 JSON 格式正确

### 问题 2: 查询速度慢

**症状**: 标注时卡顿

**解决方案**:
1. 减小词典大小（使用 5000 词而不是 10000 词）
2. 检查是否在低性能设备上运行
3. 优化 JSON 文件（移除不必要的字段）

### 问题 3: 词汇覆盖率低

**症状**: 很多单词查不到

**解决方案**:
1. 使用更大的词典（10000 词）
2. 切换到 "Local Dictionary First" 模式（AI 兜底）
3. 下载完整的 ECDICT 数据

---

**更新日期**: 2026-02-10  
**版本**: v1.3

# 翻译自动精简功能 - 已实现 ✅

## 功能说明

`convert_ecdict.py` 脚本现在会**自动精简翻译**，只保留第一个翻译词。

### 工作原理

```python
def simplify_translation(translation):
    """
    处理步骤：
    1. 去除词性标记 (v. n. adj. 等)
    2. 只取分号前的第一个义项
    3. 去除括号内容（支持中英文括号）
    4. 去除多余空格
    """
```

### 效果示例

| 原始翻译（ECDICT） | 精简后 |
|-------------------|--------|
| art. 这个；那个；这些；那些 | **这个** |
| v. 有；拥有；持有；占有 | **有** |
| adj. 美丽的；美好的；出色的 | **美丽的** |
| adv. 迅速地；很快地 | **迅速地** |
| prep. 和；用；随着 | **和** |
| n. 调查；研究；审查 | **调查** |
| 快速（地）；迅速 | **快速** |
| prep. 在...上面；关于 | **在...上面** |

## 测试结果

✅ **9/9 测试全部通过**

运行测试：
```bash
cd scripts
python test_simplify.py
```

## 使用方法

### 步骤 1：下载 ECDICT 数据

访问：https://github.com/skywind3000/ECDICT

下载 `stardict.csv` 文件（约 200MB）

### 步骤 2：转换词典

```bash
cd scripts
python convert_ecdict.py stardict.csv ../frontend/public/dictionaries/core-10000.json 10000
```

**参数说明**：
- `stardict.csv` - ECDICT 数据文件
- `../frontend/public/dictionaries/core-10000.json` - 输出文件
- `10000` - 词汇数量

### 步骤 3：验证结果

生成的 `core-10000.json` 中，每个词条的翻译都是精简后的：

```json
{
  "beautiful": {
    "word": "beautiful",
    "ipa": "ˈbjuːtɪfl",
    "pos": "adjective",
    "level": "A2",
    "chinese": "美丽的",  // ← 精简！原始是 "adj. 美丽的；美好的；出色的"
    "definition": "pleasing the senses or mind aesthetically",
    "examples": []
  }
}
```

### 步骤 4：重启服务器

```bash
# 前端会自动加载新词典
# 刷新浏览器即可
```

## 显示效果

在原文中，标注后的单词会显示为：

```
beautiful 美丽的
the 这个
investigate 调查
```

而不是冗长的：

```
beautiful adj. 美丽的；美好的；出色的
the art. 这个；那个；这些；那些
investigate v. 调查；研究；审查
```

## 注意事项

1. **自动降级**：系统会按顺序尝试加载：
   - `core-10000.json` （优先）
   - `core-5000.json`
   - `core-1000.json` （当前使用）

2. **覆盖率**：
   - 1000 词：约 60% 日常词汇
   - 5000 词：约 85% 日常词汇
   - 10000 词：约 95% 日常词汇 ⭐推荐

3. **性能**：
   - 10000 词文件大小：2-3 MB
   - 加载时间：< 500ms
   - 查询速度：< 1ms（O(1)）

## 自定义精简规则

如果需要更改精简规则，编辑 `convert_ecdict.py` 中的 `simplify_translation()` 函数。

例如，保留前两个义项：
```python
# 修改第 2 步
parts = translation.split('；')
translation = '；'.join(parts[:2])  # 保留前两个
```

## 故障排除

### 问题 1：翻译还是很长

**原因**：ECDICT 中某些词的第一个义项本身就很长

**解决方案**：
```python
# 在 simplify_translation() 末尾添加
if len(translation) > 10:
    translation = translation[:10] + '...'
```

### 问题 2：某些词没有翻译

**原因**：精简后结果为空

**解决方案**：脚本会自动跳过没有翻译的词

---

**更新日期**：2026-02-10  
**版本**：v1.3  
**状态**：✅ 已实现并测试

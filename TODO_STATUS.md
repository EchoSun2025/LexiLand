# Task Status - 2026-04-02

## Completed Tasks ✅

1. **右侧卡片历史** - 显示最近15个单词/短语
   - 最新的在最上面
   - 点击可重新打开卡片
   
2. **右侧卡片删除按钮** - 每个历史卡片有❌按钮
   - 可手动从历史中移除
   
3. **书签功能：数据结构和存储** - 在 appStore 中添加 bookmarks Map
   
4. **书签功能：右键添加书签** - 右键段落打开菜单，选择"Add Bookmark"
   
5. **书签功能：大纲跳转按钮** - 顶部工具栏的🔖按钮跳转到最近的书签
   
6. **自动发音：hover 3s触发** - Word组件实现hover 3秒自动发音
   
7. **自动发音：设置开关** - Settings中添加"Auto Pronounce Words"开关

## Implementation Details

### 1. Card History (右侧历史记录)
- **Store**: 添加 `cardHistory` 数组（最多15个）
- **Actions**: `addToCardHistory`, `removeFromCardHistory`
- **UI**: 在右侧面板显示历史卡片列表，支持点击和删除

### 2. Bookmark System (书签功能)
- **Store**: 添加 `bookmarks` Map，存储每个文档的书签位置
- **Data Structure**: `{ documentId, chapterId?, paragraphIndex, sentenceIndex, timestamp }`
- **Right-click Menu**: 在段落上右键显示"Add Bookmark"选项
- **Jump Button**: 顶部工具栏🔖按钮，跳转到当前文档的最近书签
- **EPUB Support**: 支持跨章节书签

### 3. Auto Pronounce (自动发音)
- **Word Component**: 添加 hover 计时器（3秒）
- **Settings**: 添加开关控制是否启用
- **Voice**: 使用浏览器 SpeechSynthesis API
- **Rate**: 0.9x 速度

## Technical Changes

### Modified Files:
1. `frontend/src/store/appStore.ts` - 添加 cardHistory, bookmarks, autoPronounceSetting
2. `frontend/src/App.tsx` - 实现历史记录、书签、右键菜单
3. `frontend/src/components/Word.tsx` - 实现 hover 自动发音
4. `frontend/src/components/Sentence.tsx` - 传递 autoPronounceSetting
5. `frontend/src/components/Paragraph.tsx` - 传递 autoPronounceSetting

### Type Safety:
- 添加显式类型注解修复所有 implicit any 错误
- 导出 Document, Chapter 类型供 App.tsx 使用
- 导出 getLatestBookmark 辅助函数

## Usage

### Card History
- 点击任意单词/短语后，会自动添加到历史记录
- 关闭卡片后，可在右侧看到历史列表
- 点击历史项可重新打开卡片
- 鼠标悬停显示删除按钮

### Bookmarks
- **添加**: 在段落上右键 → 选择"Add Bookmark"
- **跳转**: 点击顶部工具栏的🔖按钮
- 每个文档只保存一个最近的书签
- 支持 EPUB 跨章节书签

### Auto Pronounce
- **启用**: Settings → 勾选"Auto Pronounce Words"
- **触发**: 鼠标停留在单词上3秒自动发音
- **取消**: 鼠标移开取消定时器
- 只对长度>1的单词生效

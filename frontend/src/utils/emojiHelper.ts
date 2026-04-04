import type { WordAnnotation } from '../api';
import emojilib from 'emojilib';

// 构建反向索引：关键词 -> emoji（初始化时执行一次）
const keywordToEmoji = new Map<string, string>();
const emojiData = emojilib as Record<string, string[]>;

// 初始化索引
for (const [emoji, keywords] of Object.entries(emojiData)) {
  if (Array.isArray(keywords)) {
    keywords.forEach(keyword => {
      const key = keyword.toLowerCase().trim();
      if (key && !keywordToEmoji.has(key)) {
        keywordToEmoji.set(key, emoji);
      }
    });
  }
}

console.log(`[Emoji] Loaded ${keywordToEmoji.size} keywords for emoji matching`);

/**
 * 根据词形判断具体的词性标签
 */
export function getDetailedPartOfSpeech(annotation: WordAnnotation): string {
  const { word, baseForm, partOfSpeech, definition } = annotation;
  
  // 从 definition 中提取词性（如果 partOfSpeech 是 unknown）
  const extractPosFromDefinition = (def: string): string => {
    if (!def) return '';
    const match = def.match(/^(n|v|adj|adv|prep|conj|pron|int|art)\./);
    return match ? match[1] : '';
  };
  
  const defPos = extractPosFromDefinition(definition || '');
  const actualPos = partOfSpeech !== 'unknown' ? partOfSpeech : defPos;
  
  // 如果有基础形式且不同于当前词，说明是变形
  if (baseForm && baseForm !== word.toLowerCase()) {
    const wordLower = word.toLowerCase();
    const baseLower = baseForm.toLowerCase();
    
    // 判断词形类型
    if (wordLower.endsWith('ing') && !baseLower.endsWith('ing')) {
      return 'v-ing'; // 现在分词
    }
    if (wordLower.endsWith('ed') && !baseLower.endsWith('ed')) {
      return 'v-ed'; // 过去式/过去分词
    }
    if (wordLower.endsWith('s') && !baseLower.endsWith('s')) {
      // 可能是复数或第三人称单数
      // 优先从 definition 判断
      if (defPos === 'n' || actualPos.includes('noun')) {
        return 'n-pl'; // 名词复数
      }
      if (wordLower.endsWith('ies') && baseLower.endsWith('y')) {
        return 'n-pl'; // 名词复数 (y→ies)
      }
      // 如果基础词可能是名词（常见名词后缀），也判断为复数
      if (baseLower.match(/(ment|tion|sion|ness|ship|hood|dom|er|or|ist|ant|ent|ure|age|ance|ence|ism|ity|ty)$/)) {
        return 'n-pl';
      }
      return 'v-3s'; // 第三人称单数
    }
    if (wordLower.endsWith('er') && !baseLower.endsWith('er')) {
      return 'adj-comp'; // 形容词比较级
    }
    if (wordLower.endsWith('est') && !baseLower.endsWith('est')) {
      return 'adj-sup'; // 形容词最高级
    }
  }
  
  // 返回实际词性
  return actualPos || 'unknown';
}

/**
 * 根据单词内容和释义生成对应的 emoji
 * 使用混合策略：手动映射 > emojilib > definition 关键词 > 词性默认
 */
export function getWordEmoji(annotation: WordAnnotation): string {
  const word = annotation.word.toLowerCase();
  const baseForm = (annotation.baseForm || annotation.word).toLowerCase();
  const chinese = annotation.chinese?.toLowerCase() || '';
  const definition = annotation.definition?.toLowerCase() || '';
  
  // 1. 高优先级手动映射（确保常用词 100% 准确）
  const manualMap: Record<string, string> = {
    // 基础高频词
    'the': '📌', 'a': '📌', 'an': '📌',
    'be': '✨', 'is': '✨', 'are': '✨', 'was': '✨', 'were': '✨',
    'have': '🤝', 'has': '🤝', 'had': '🤝',
    'do': '⚡', 'does': '⚡', 'did': '⚡',
    'will': '🔮', 'would': '🔮', 'can': '💪', 'could': '💪',
    'should': '💡', 'may': '🌟', 'might': '🌟',
    
    // 常见动作
    'get': '🎯', 'make': '🔨', 'take': '🤲', 'give': '🎁',
    'tell': '💬', 'say': '🗣️', 'know': '🧠', 'think': '🤔',
    'feel': '💭', 'want': '💫', 'need': '❗',
    
    // 时间地点
    'here': '📍', 'there': '👉', 'now': '⏰', 'then': '⏳',
    'today': '📅', 'yesterday': '📆', 'tomorrow': '🌅',
    
    // 程度
    'very': '💯', 'much': '📈', 'more': '➕', 'most': '🔝',
    'less': '➖', 'little': '🤏', 'few': '🔢',
    
    // 特殊词汇修正
    'government': '🏛️', 'landmark': '🗿', 'trill': '🎵',
  };
  
  if (manualMap[word]) return manualMap[word];
  if (manualMap[baseForm]) return manualMap[baseForm];
  
  // 2. emojilib 精确匹配（单词或基础形式）
  if (keywordToEmoji.has(word)) {
    return keywordToEmoji.get(word)!;
  }
  if (keywordToEmoji.has(baseForm)) {
    return keywordToEmoji.get(baseForm)!;
  }
  
  // 3. emojilib 词根匹配（更宽泛）
  // 去除常见后缀再匹配
  const wordRoot = word.replace(/(ing|ed|s|es|er|est|ly)$/, '');
  if (wordRoot !== word && wordRoot.length > 2 && keywordToEmoji.has(wordRoot)) {
    return keywordToEmoji.get(wordRoot)!;
  }
  
  // 4. 中文翻译关键词匹配
  const chineseKeywords = [
    { key: '太阳', emoji: '☀️' }, { key: '月亮', emoji: '🌙' },
    { key: '星', emoji: '⭐' }, { key: '云', emoji: '☁️' },
    { key: '雨', emoji: '🌧️' }, { key: '雪', emoji: '❄️' },
    { key: '猫', emoji: '🐱' }, { key: '狗', emoji: '🐶' },
    { key: '鸟', emoji: '🐦' }, { key: '鱼', emoji: '🐟' },
    { key: '书', emoji: '📖' }, { key: '学', emoji: '🎓' },
    { key: '车', emoji: '🚗' }, { key: '家', emoji: '🏠' },
    { key: '笑', emoji: '😊' }, { key: '哭', emoji: '😢' },
    { key: '爱', emoji: '❤️' }, { key: '心', emoji: '💖' },
    { key: '吃', emoji: '🍽️' }, { key: '喝', emoji: '🥤' },
    { key: '睡', emoji: '😴' }, { key: '跑', emoji: '🏃' },
    { key: '走', emoji: '🚶' }, { key: '飞', emoji: '✈️' },
  ];
  
  for (const { key, emoji } of chineseKeywords) {
    if (chinese.includes(key)) return emoji;
  }
  
  // 5. Definition 关键词匹配（从 emojilib）
  // 提取 definition 中的关键词（名词/动词）
  const defWords = definition
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3); // 只取长度 > 3 的词
  
  for (const defWord of defWords) {
    if (keywordToEmoji.has(defWord)) {
      return keywordToEmoji.get(defWord)!;
    }
  }
  
  // 6. 根据词性返回默认 emoji
  const pos = getDetailedPartOfSpeech(annotation);
  const posEmojiMap: Record<string, string> = {
    'n': '📦',      // 名词
    'n-pl': '📦',   
    'v': '⚡',      // 动词
    'v-ing': '⚡',  
    'v-ed': '⚡',
    'v-3s': '⚡',
    'adj': '✨',    // 形容词
    'adj-comp': '✨',
    'adj-sup': '✨',
    'adv': '💫',    // 副词
    'prep': '📍',   // 介词
    'conj': '🔗',   // 连词
    'pron': '👤',   // 代词
    'int': '❗',    // 感叹词
  };
  
  if (posEmojiMap[pos]) return posEmojiMap[pos];
  
  // 7. 默认 emoji
  return '📝';
}

/**
 * 导出所有 emoji keywords 用于搜索
 */
export function getAllEmojiKeywords(): Map<string, string> {
  return keywordToEmoji;
}

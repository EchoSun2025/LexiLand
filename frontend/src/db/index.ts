import Dexie from 'dexie';
import type { Table } from 'dexie';

export interface KnownWord {
  word: string;
  level?: string; // A2, B1, B2, C1, C2
  addedAt: number;
}

export interface LearntWord {
  word: string;
  learntAt: number;
}

export interface CachedAnnotation {
  word: string;
  baseForm?: string;
  ipa: string;
  chinese: string;
  definition: string;
  example: string;
  level: string;
  partOfSpeech: string;
  sentence?: string;  // 单词所在的原文句子
  documentTitle?: string;  // 文章标题
  emoji?: string;  // Unicode emoji（默认生成或手动选择）
  emojiImagePath?: string[];  // 图片路径数组（AI/Unsplash，支持多个历史记录）
  emojiModel?: string;  // 最新图片使用的模型
  cachedAt: number;
}

export interface SavedDocument {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  lastOpenedAt: number;
}

export interface CachedPhraseAnnotation {
  phrase: string;
  chinese: string;
  explanation?: string;
  sentenceContext: string;
  documentTitle?: string;  // 文章标题
  cachedAt: number;
}

export class LexiLandDB extends Dexie {
  knownWords!: Table<KnownWord, string>;
  learntWords!: Table<LearntWord, string>;
  annotations!: Table<CachedAnnotation, string>;
  phraseAnnotations!: Table<CachedPhraseAnnotation, string>;
  documents!: Table<SavedDocument, string>;

  constructor() {
    super('LexiLandDB');
    // Version 4: 原有结构
    this.version(4).stores({
      knownWords: 'word, level, addedAt',
      learntWords: 'word, learntAt',
      annotations: 'word, cachedAt',
      phraseAnnotations: 'phrase, cachedAt',
      documents: 'id, createdAt, lastOpenedAt',
    });
    
    // Version 5: 添加 emojiImagePath 字段到 annotations
    this.version(5).stores({
      knownWords: 'word, level, addedAt',
      learntWords: 'word, learntAt',
      annotations: 'word, cachedAt',
      phraseAnnotations: 'phrase, cachedAt',
      documents: 'id, createdAt, lastOpenedAt',
    });
    
    // Version 6: 添加 emojiModel 和 manualEmoji 字段
    this.version(6).stores({
      knownWords: 'word, level, addedAt',
      learntWords: 'word, learntAt',
      annotations: 'word, cachedAt',
      phraseAnnotations: 'phrase, cachedAt',
      documents: 'id, createdAt, lastOpenedAt',
    });
    
    // Version 7: 重构 emoji 数据结构：emoji (string) + emojiImagePath (array)
    this.version(7).stores({
      knownWords: 'word, level, addedAt',
      learntWords: 'word, learntAt',
      annotations: 'word, cachedAt',
      phraseAnnotations: 'phrase, cachedAt',
      documents: 'id, createdAt, lastOpenedAt',
    }).upgrade(async (trans) => {
      // 数据迁移：manualEmoji -> emoji, emojiImagePath (string) -> emojiImagePath (array)
      const annotations = await trans.table('annotations').toArray();
      for (const annotation of annotations) {
        const updated: any = { ...annotation };
        
        // 迁移 manualEmoji -> emoji
        if ((annotation as any).manualEmoji) {
          updated.emoji = (annotation as any).manualEmoji;
          delete updated.manualEmoji;
        }
        
        // 迁移 emojiImagePath (string) -> emojiImagePath (array)
        if ((annotation as any).emojiImagePath && typeof (annotation as any).emojiImagePath === 'string') {
          updated.emojiImagePath = [(annotation as any).emojiImagePath];
        } else if (!(annotation as any).emojiImagePath) {
          updated.emojiImagePath = [];
        }
        
        await trans.table('annotations').put(updated);
      }
      console.log('[DB Migration v7] Migrated emoji data structure for', annotations.length, 'annotations');
    });

    this.version(8).stores({
      knownWords: 'word, level, addedAt',
      learntWords: 'word, learntAt',
      annotations: 'word, cachedAt',
      phraseAnnotations: 'phrase, cachedAt',
      documents: 'id, createdAt, lastOpenedAt',
    }).upgrade(async (trans) => {
      const annotations = await trans.table('annotations').toArray();
      for (const annotation of annotations) {
        await trans.table('annotations').put({
          ...annotation,
          emojiImagePath: normalizeEmojiImagePaths((annotation as any).emojiImagePath),
        });
      }
      console.log('[DB Migration v8] Normalized emoji image paths to /learning-images/ for', annotations.length, 'annotations');
    });
  }
}

export const db = new LexiLandDB();

function normalizeEmojiImagePath(path?: string): string | undefined {
  if (!path) return path;
  if (path.startsWith('/emoji-images/')) {
    return path.replace('/emoji-images/', '/learning-images/');
  }
  return path;
}

function normalizeEmojiImagePaths(paths?: string[]): string[] {
  if (!paths) return [];
  return paths.map(normalizeEmojiImagePath).filter((path): path is string => Boolean(path));
}

/**
 * Load known words from JSON file and save to IndexedDB
 */
export async function loadKnownWordsFromFile(jsonPath: string): Promise<string[]> {
  try {
    const response = await fetch(jsonPath);
    const data = await response.json();
    
    // Assume the JSON structure is: { words: ["word1", "word2", ...] }
    // Or: ["word1", "word2", ...]
    const words: string[] = Array.isArray(data) ? data : data.words || [];
    
    // Save to IndexedDB
    const knownWords = words.map(word => ({
      word: word.toLowerCase(),
      addedAt: Date.now(),
    }));
    
    await db.knownWords.bulkPut(knownWords);
    
    return words;
  } catch (error) {
    console.error('Failed to load known words:', error);
    return [];
  }
}

/**
 * Get all known words from IndexedDB
 */
export async function getAllKnownWords(): Promise<string[]> {
  const words = await db.knownWords.toArray();
  return words.map(w => w.word);
}

/**
 * Add a known word to IndexedDB
 */
export async function addKnownWord(word: string, level?: string): Promise<void> {
  await db.knownWords.put({
    word: word.toLowerCase(),
    level,
    addedAt: Date.now(),
  });
}

/**
 * Batch add known words to IndexedDB (faster for large batches)
 */
export async function batchAddKnownWords(words: string[], level?: string): Promise<void> {
  const timestamp = Date.now();
  const knownWords = words.map(word => ({
    word: word.toLowerCase(),
    level,
    addedAt: timestamp,
  }));
  
  await db.knownWords.bulkPut(knownWords);
}

/**
 * Cache an annotation in IndexedDB
 */
export async function cacheAnnotation(word: string, annotation: Omit<CachedAnnotation, 'word' | 'cachedAt'>): Promise<void> {
  await db.annotations.put({
    word: word.toLowerCase(),
    ...annotation,
    emojiImagePath: normalizeEmojiImagePaths(annotation.emojiImagePath),
    cachedAt: Date.now(),
  });
}

/**
 * Get cached annotation from IndexedDB
 */
export async function getCachedAnnotation(word: string): Promise<CachedAnnotation | undefined> {
  const annotation = await db.annotations.get(word.toLowerCase());
  if (!annotation) return annotation;
  return {
    ...annotation,
    emojiImagePath: normalizeEmojiImagePaths(annotation.emojiImagePath),
  };
}

/**
 * Get all cached annotations from IndexedDB
 */
export async function getAllCachedAnnotations(): Promise<CachedAnnotation[]> {
  const annotations = await db.annotations.toArray();
  return annotations.map(annotation => ({
    ...annotation,
    emojiImagePath: normalizeEmojiImagePaths(annotation.emojiImagePath),
  }));
}

/**
 * Update emoji for a word annotation (unicode emoji)
 */
export async function updateEmoji(word: string, emoji: string, onUpdate?: (updates: Partial<CachedAnnotation>) => void): Promise<void> {
  const annotation = await db.annotations.get(word.toLowerCase());
  if (annotation) {
    annotation.emoji = emoji;
    await db.annotations.put(annotation);
    console.log('[DB] Updated emoji for:', word, emoji);
    
    // 回调：通知 store 更新
    if (onUpdate) {
      onUpdate({ emoji });
    }
  } else {
    console.warn('[DB] Annotation not found for word:', word, '- Cannot save emoji');
  }
}

/**
 * Add image path to a word annotation (Unsplash/AI)
 */
export async function addEmojiImagePath(word: string, imagePath: string, model?: string, onUpdate?: (updates: Partial<CachedAnnotation>) => void): Promise<void> {
  const annotation = await db.annotations.get(word.toLowerCase());
  if (annotation) {
    // 初始化数组（如果不存在）
    if (!annotation.emojiImagePath) {
      annotation.emojiImagePath = [];
    }
    
    // 添加新图片路径到数组开头（最新的在前面）
    annotation.emojiImagePath.unshift(normalizeEmojiImagePath(imagePath)!);
    
    // 限制最多保存 5 张历史图片
    if (annotation.emojiImagePath.length > 5) {
      annotation.emojiImagePath = annotation.emojiImagePath.slice(0, 5);
    }
    
    // 更新模型信息（如果提供）
    if (model) {
      annotation.emojiModel = model;
    }
    
    await db.annotations.put(annotation);
    console.log('[DB] Added emoji image path for:', word, imagePath);
    
    // 回调：通知 store 更新
    if (onUpdate) {
      onUpdate({ 
        emojiImagePath: annotation.emojiImagePath,
        emojiModel: model 
      });
    }
  } else {
    console.warn('[DB] Annotation not found for word:', word, '- Cannot save emoji image path');
  }
}

/**
 * Add a learnt word to IndexedDB
 */
export async function addLearntWordToDB(word: string): Promise<void> {
  await db.learntWords.put({
    word: word.toLowerCase(),
    learntAt: Date.now(),
  });
}

/**
 * Remove a learnt word from IndexedDB
 */
export async function removeLearntWordFromDB(word: string): Promise<void> {
  await db.learntWords.delete(word.toLowerCase());
}

/**
 * Cache phrase annotation
 */
export async function cachePhraseAnnotation(phrase: string, annotation: { chinese: string; explanation?: string; sentenceContext: string; documentTitle?: string }): Promise<void> {
  await db.phraseAnnotations.put({
    phrase: phrase.toLowerCase(),
    chinese: annotation.chinese,
    explanation: annotation.explanation,
    sentenceContext: annotation.sentenceContext,
    documentTitle: annotation.documentTitle,
    cachedAt: Date.now(),
  });
}

/**
 * Get all cached phrase annotations
 */
export async function getAllCachedPhraseAnnotations(): Promise<CachedPhraseAnnotation[]> {
  return await db.phraseAnnotations.toArray();
}

/**
 * Delete phrase annotation
 */
export async function deletePhraseAnnotation(phrase: string): Promise<void> {
  await db.phraseAnnotations.delete(phrase.toLowerCase());
}

/**
 * Get all learnt words from IndexedDB
 */
export async function getAllLearntWords(): Promise<string[]> {
  const words = await db.learntWords.toArray();
  return words.map(w => w.word);
}

/**
 * Delete an annotation from IndexedDB
 */
export async function deleteAnnotation(word: string): Promise<void> {
  await db.annotations.delete(word.toLowerCase());
}

/**
 * Export all user data as JSON with timestamp
 */
export async function exportUserData(): Promise<string> {
  const [knownWords, learntWords, annotations, phraseAnnotations] = await Promise.all([
    db.knownWords.toArray(),
    db.learntWords.toArray(),
    db.annotations.toArray(),
    db.phraseAnnotations.toArray()
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    exportDate: new Date().toLocaleDateString('zh-CN'),
    version: '1.2',
    data: {
      knownWords: knownWords.map(w => ({
        word: w.word,
        level: w.level,
        addedAt: new Date(w.addedAt).toISOString()
      })),
      learntWords: learntWords.map(w => ({
        word: w.word,
        learntAt: new Date(w.learntAt).toISOString()
      })),
      phraseAnnotations: phraseAnnotations.map(p => ({
        phrase: p.phrase,
        chinese: p.chinese,
        explanation: p.explanation,
        sentenceContext: p.sentenceContext,
        documentTitle: p.documentTitle,
        cachedAt: new Date(p.cachedAt).toISOString()
      })),
      annotations: annotations.map(a => ({
        word: a.word,
        baseForm: a.baseForm,
        ipa: a.ipa,
        chinese: a.chinese,
        definition: a.definition,
        example: a.example,
        level: a.level,
        partOfSpeech: a.partOfSpeech,
        sentenceContext: a.sentence,  // 保持向后兼容，但导出时使用 sentenceContext
        documentTitle: a.documentTitle,
        emoji: a.emoji,  // Unicode emoji
        emojiImagePath: normalizeEmojiImagePaths(a.emojiImagePath),  // 图片路径数组
        emojiModel: a.emojiModel,  // 生成图片的模型
        cachedAt: new Date(a.cachedAt).toISOString()
      }))
    },
    statistics: {
      totalKnownWords: knownWords.length,
      totalLearntWords: learntWords.length,
      totalAnnotations: annotations.length,
      totalPhraseAnnotations: phraseAnnotations.length
    }
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Import user data from JSON and merge with existing data
 */
export async function importUserData(jsonData: string): Promise<{ imported: number; skipped: number; errors: string[] }> {
  const result = {
    imported: 0,
    skipped: 0,
    errors: [] as string[]
  };

  try {
    const data = JSON.parse(jsonData);
    
    if (!data.data || !data.version) {
      throw new Error('Invalid data format');
    }

    // Import known words
    if (data.data.knownWords && Array.isArray(data.data.knownWords)) {
      for (const item of data.data.knownWords) {
        try {
          const existing = await db.knownWords.get(item.word);
          if (!existing) {
            await db.knownWords.add({
              word: item.word,
              level: item.level,
              addedAt: new Date(item.addedAt).getTime()
            });
            result.imported++;
          } else {
            result.skipped++;
          }
        } catch (err: any) {
          result.errors.push(`Known word "${item.word}": ${err.message}`);
        }
      }
    }

    // Import learnt words
    if (data.data.learntWords && Array.isArray(data.data.learntWords)) {
      for (const item of data.data.learntWords) {
        try {
          const existing = await db.learntWords.get(item.word);
          if (!existing) {
            await db.learntWords.add({
              word: item.word,
              learntAt: new Date(item.learntAt).getTime()
            });
            result.imported++;
          } else {
            result.skipped++;
          }
        } catch (err: any) {
          result.errors.push(`Learnt word "${item.word}": ${err.message}`);
        }
      }
    }

    // Import annotations
    if (data.data.annotations && Array.isArray(data.data.annotations)) {
      for (const item of data.data.annotations) {
        try {
          const existing = await db.annotations.get(item.word);
          if (!existing) {
            await db.annotations.add({
              word: item.word,
              baseForm: item.baseForm,
              ipa: item.ipa,
              chinese: item.chinese,
              definition: item.definition,
              example: item.example,
              level: item.level,
              partOfSpeech: item.partOfSpeech,
              sentence: item.sentenceContext || item.sentence,  // 支持新旧格式
              documentTitle: item.documentTitle,
              emoji: item.emoji,  // Unicode emoji
              emojiImagePath: normalizeEmojiImagePaths(item.emojiImagePath),  // 图片路径数组
              emojiModel: item.emojiModel,  // 生成图片的模型
              cachedAt: new Date(item.cachedAt).getTime()
            });
            result.imported++;
          } else {
            result.skipped++;
          }
        } catch (err: any) {
          result.errors.push(`Annotation "${item.word}": ${err.message}`);
        }
      }
    }

    // Import phrase annotations
    if (data.data.phraseAnnotations && Array.isArray(data.data.phraseAnnotations)) {
      for (const item of data.data.phraseAnnotations) {
        try {
          const existing = await db.phraseAnnotations.get(item.phrase);
          if (!existing) {
            await db.phraseAnnotations.add({
              phrase: item.phrase,
              chinese: item.chinese,
              explanation: item.explanation,
              sentenceContext: item.sentenceContext,
              documentTitle: item.documentTitle,
              cachedAt: new Date(item.cachedAt).getTime()
            });
            result.imported++;
          } else {
            result.skipped++;
          }
        } catch (err: any) {
          result.errors.push(`Phrase annotation "${item.phrase}": ${err.message}`);
        }
      }
    }

    return result;
  } catch (error: any) {
    throw new Error(`Failed to parse import data: ${error.message}`);
  }
}

import type { LLIFData, LLIFEntry, LLIFWordEntry, LLIFPhraseEntry } from '../types/llif';
import type { CachedAnnotation, CachedPhraseAnnotation } from '../db';
import { db } from '../db';

/**
 * 将数据库中的单词注释转换为 LLIF 格式
 */
export function annotationToLLIF(annotation: CachedAnnotation): LLIFWordEntry {
  return {
    type: 'word',
    language: 'en',
    content: {
      word: annotation.word,
      baseForm: annotation.baseForm,
      pronunciation: {
        ipa: annotation.ipa,
      },
      partOfSpeech: annotation.partOfSpeech,
      level: annotation.level,
    },
    translations: [
      {
        language: 'zh-CN',
        text: annotation.chinese,
        definition: annotation.definition,
      },
    ],
    context: {
      sentenceContext: annotation.sentence,
      documentTitle: annotation.documentTitle,
    },
    examples: annotation.example ? [
      {
        text: annotation.example,
      },
    ] : [],
    metadata: {
      addedAt: new Date(annotation.cachedAt).toISOString(),
    },
  };
}

/**
 * 将数据库中的短语注释转换为 LLIF 格式
 */
export function phraseAnnotationToLLIF(annotation: CachedPhraseAnnotation): LLIFPhraseEntry {
  return {
    type: 'phrase',
    language: 'en',
    content: {
      phrase: annotation.phrase,
    },
    translations: [
      {
        language: 'zh-CN',
        text: annotation.chinese,
        definition: annotation.explanation,
      },
    ],
    context: {
      sentenceContext: annotation.sentenceContext,
    },
    metadata: {
      addedAt: new Date(annotation.cachedAt).toISOString(),
    },
  };
}

/**
 * 将 LLIF 单词条目转换为数据库格式
 */
export function llifToAnnotation(entry: LLIFWordEntry): Omit<CachedAnnotation, 'cachedAt'> {
  return {
    word: entry.content.word,
    baseForm: entry.content.baseForm,
    ipa: entry.content.pronunciation?.ipa || '',
    chinese: entry.translations[0]?.text || '',
    definition: entry.translations[0]?.definition || '',
    example: entry.examples?.[0]?.text || '',
    level: entry.content.level || 'B2',
    partOfSpeech: entry.content.partOfSpeech || 'unknown',
    sentence: entry.context?.sentenceContext,
    documentTitle: entry.context?.documentTitle,
  };
}

/**
 * 将 LLIF 短语条目转换为数据库格式
 */
export function llifToPhraseAnnotation(entry: LLIFPhraseEntry): Omit<CachedPhraseAnnotation, 'cachedAt'> {
  return {
    phrase: entry.content.phrase,
    chinese: entry.translations[0]?.text || '',
    explanation: entry.translations[0]?.definition,
    sentenceContext: entry.context?.sentenceContext || '',
  };
}

/**
 * 导出所有数据为 LLIF 格式
 */
export async function exportToLLIF(): Promise<LLIFData> {
  const [annotations, phraseAnnotations] = await Promise.all([
    db.annotations.toArray(),
    db.phraseAnnotations.toArray(),
  ]);

  const entries: LLIFEntry[] = [
    ...annotations.map(annotationToLLIF),
    ...phraseAnnotations.map(phraseAnnotationToLLIF),
  ];

  return {
    version: '1.0',
    format: 'LexiLearn Interchange Format',
    metadata: {
      created: new Date().toISOString(),
      source: 'LexiLand Read',
      sourceLanguage: 'en',
      targetLanguage: 'zh-CN',
      creator: 'LexiLand v1.3',
    },
    entries,
  };
}

/**
 * 从 LLIF 格式导入数据
 */
export async function importFromLLIF(data: LLIFData): Promise<{
  imported: number;
  skipped: number;
  errors: string[];
}> {
  const result = {
    imported: 0,
    skipped: 0,
    errors: [] as string[],
  };

  for (const entry of data.entries) {
    try {
      if (entry.type === 'word') {
        const word = entry.content.word.toLowerCase();
        const existing = await db.annotations.get(word);
        
        if (!existing) {
          const annotation = llifToAnnotation(entry);
          await db.annotations.add({
            ...annotation,
            word,
            cachedAt: Date.now(),
          });
          result.imported++;
        } else {
          result.skipped++;
        }
      } else if (entry.type === 'phrase') {
        const phrase = entry.content.phrase.toLowerCase();
        const existing = await db.phraseAnnotations.get(phrase);
        
        if (!existing) {
          const annotation = llifToPhraseAnnotation(entry);
          await db.phraseAnnotations.add({
            ...annotation,
            phrase,
            cachedAt: Date.now(),
          });
          result.imported++;
        } else {
          result.skipped++;
        }
      }
    } catch (error: any) {
      result.errors.push(`Failed to import entry: ${error.message}`);
    }
  }

  return result;
}

/**
 * 导出为 LLIF JSON 字符串
 */
export async function exportLLIFString(): Promise<string> {
  const data = await exportToLLIF();
  return JSON.stringify(data, null, 2);
}

/**
 * 从 LLIF JSON 字符串导入
 */
export async function importLLIFString(jsonString: string): Promise<{
  imported: number;
  skipped: number;
  errors: string[];
}> {
  try {
    const data = JSON.parse(jsonString) as LLIFData;
    
    // 验证格式
    if (!data.version || !data.format || !data.entries) {
      throw new Error('Invalid LLIF format');
    }
    
    return await importFromLLIF(data);
  } catch (error: any) {
    throw new Error(`Failed to parse LLIF data: ${error.message}`);
  }
}

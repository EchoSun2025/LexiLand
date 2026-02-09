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
  cachedAt: number;
}

export interface SavedDocument {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  lastOpenedAt: number;
}

export class LexiLandDB extends Dexie {
  knownWords!: Table<KnownWord, string>;
  learntWords!: Table<LearntWord, string>;
  annotations!: Table<CachedAnnotation, string>;
  documents!: Table<SavedDocument, string>;

  constructor() {
    super('LexiLandDB');
    this.version(2).stores({
      knownWords: 'word, level, addedAt',
      learntWords: 'word, learntAt',
      annotations: 'word, cachedAt',
      documents: 'id, createdAt, lastOpenedAt',
    });
  }
}

export const db = new LexiLandDB();

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
 * Cache an annotation in IndexedDB
 */
export async function cacheAnnotation(word: string, annotation: Omit<CachedAnnotation, 'word' | 'cachedAt'>): Promise<void> {
  await db.annotations.put({
    word: word.toLowerCase(),
    ...annotation,
    cachedAt: Date.now(),
  });
}

/**
 * Get cached annotation from IndexedDB
 */
export async function getCachedAnnotation(word: string): Promise<CachedAnnotation | undefined> {
  return await db.annotations.get(word.toLowerCase());
}

/**
 * Get all cached annotations from IndexedDB
 */
export async function getAllCachedAnnotations(): Promise<CachedAnnotation[]> {
  return await db.annotations.toArray();
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
  const [knownWords, learntWords, annotations] = await Promise.all([
    db.knownWords.toArray(),
    db.learntWords.toArray(),
    db.annotations.toArray()
  ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    exportDate: new Date().toLocaleDateString('zh-CN'),
    version: '1.0',
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
      annotations: annotations.map(a => ({
        word: a.word,
        baseForm: a.baseForm,
        ipa: a.ipa,
        chinese: a.chinese,
        definition: a.definition,
        example: a.example,
        level: a.level,
        partOfSpeech: a.partOfSpeech,
        cachedAt: new Date(a.cachedAt).toISOString()
      }))
    },
    statistics: {
      totalKnownWords: knownWords.length,
      totalLearntWords: learntWords.length,
      totalAnnotations: annotations.length
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

    return result;
  } catch (error: any) {
    throw new Error(`Failed to parse import data: ${error.message}`);
  }
}

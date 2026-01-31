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
  ipa?: string;
  chinese?: string;
  definition?: string;
  examples?: string[];
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
        ipa: a.ipa,
        chinese: a.chinese,
        definition: a.definition,
        examples: a.examples,
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

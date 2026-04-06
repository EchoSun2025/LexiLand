import { create } from 'zustand';
import type { Paragraph } from '../utils/tokenize';
import type { WordAnnotation } from '../api';

export interface Chapter {
  id: string;
  title: string;
  content: string;
  paragraphs: Paragraph[];
}

export interface Document {
  id: string;
  title: string;
  type: 'text' | 'epub';  // 文档类型
  content?: string;       // 纯文本内容（text 类型）
  paragraphs?: Paragraph[]; // 纯文本段落（text 类型）
  chapters?: Chapter[];   // EPUB 章节（epub 类型）
  currentChapterId?: string; // 当前显示的章节
  author?: string;        // 作者（epub）
  createdAt: number;
}

interface AppState {
  // Documents
  documents: Document[];
  currentDocumentId: string | null;
  
  // Known words
  knownWords: Set<string>;

  // Learnt words (marked as learnt but keep annotations)
  learntWords: Set<string>;

  // Annotations (word -> full annotation)
  annotations: Map<string, WordAnnotation>;

  // Selected word
  selectedWord: string | null;
  
  // Card history (最近查看的单词/短语，最多15个)
  cardHistory: Array<{ type: 'word' | 'phrase'; word: string; timestamp: number }>;
  
  // Bookmarks (书签：文档 -> 位置信息)
  bookmarks: Map<string, { 
    documentId: string;
    chapterId?: string;
    paragraphIndex: number;
    sentenceIndex: number;
    timestamp: number;
  }>;

  // UI settings
  showIPA: boolean;
  showChinese: boolean;
  level: string;
  autoMark: boolean;
  annotationMode: 'ai' | 'local' | 'local-first';  // 新增：标注模式
  autoPronounceSetting: boolean;  // 自动发音开关
  autoShowCardOnPlay: boolean;  // 朗读时自动显示卡片

  // Actions
  addDocument: (doc: Document) => void;
  setCurrentDocument: (id: string) => void;
  setCurrentChapter: (chapterId: string) => void;  // 新增：切换章节
  loadKnownWords: (words: string[]) => void;
  addKnownWord: (word: string) => void;
  addLearntWord: (word: string) => void;
  removeLearntWord: (word: string) => void;
  removeAnnotation: (word: string) => void;
  addAnnotation: (word: string, annotation: WordAnnotation) => void;
  updateAnnotation: (word: string, updates: Partial<WordAnnotation>) => void;  // 新增：部分更新
  loadLearntWords: (words: string[]) => void;
  loadAnnotations: (annotations: Map<string, WordAnnotation>) => void;
  setSelectedWord: (word: string | null) => void;
  addToCardHistory: (type: 'word' | 'phrase', word: string) => void;
  removeFromCardHistory: (word: string) => void;
  addBookmark: (documentId: string, chapterId: string | undefined, paragraphIndex: number, sentenceIndex: number) => void;
  setShowIPA: (show: boolean) => void;
  setShowChinese: (show: boolean) => void;
  setLevel: (level: string) => void;
  setAutoMark: (autoMark: boolean) => void;
  setAnnotationMode: (mode: 'ai' | 'local' | 'local-first') => void;
  setAutoPronounceSetting: (enabled: boolean) => void;
  setAutoShowCardOnPlay: (enabled: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  documents: [],
  currentDocumentId: null,
  knownWords: new Set(),
  learntWords: new Set(),
  annotations: new Map(),
  selectedWord: null,
  cardHistory: [],
  bookmarks: (() => {
    // Load bookmarks from localStorage on init
    const stored = localStorage.getItem('bookmarks');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return new Map(Object.entries(parsed));
      } catch (e) {
        console.error('Failed to load bookmarks:', e);
      }
    }
    return new Map();
  })(),
  showIPA: true,
  showChinese: true,
  level: 'B2',
  autoMark: true,
  annotationMode: 'local-first',  // 默认本地优先
  autoPronounceSetting: true,  // 默认开启自动发音
  autoShowCardOnPlay: false,  // 默认关闭朗读时自动显示卡片
  
  addDocument: (doc) => set((state) => ({
    documents: [...state.documents, doc],
    currentDocumentId: doc.id,
  })),
  
  setCurrentDocument: (id) => set({ currentDocumentId: id }),
  
  setCurrentChapter: (chapterId) => set((state) => {
    const currentDoc = state.documents.find(d => d.id === state.currentDocumentId);
    if (currentDoc && currentDoc.type === 'epub') {
      const updatedDocs = state.documents.map(doc => 
        doc.id === state.currentDocumentId 
          ? { ...doc, currentChapterId: chapterId }
          : doc
      );
      return { documents: updatedDocs };
    }
    return {};
  }),
  
  loadKnownWords: (words) => set({ knownWords: new Set(words.map(w => w.toLowerCase())) }),

  addKnownWord: (word) => set((state) => {
    const newKnownWords = new Set(state.knownWords);
    newKnownWords.add(word.toLowerCase());
    return { knownWords: newKnownWords };
  }),

  addLearntWord: (word) => set((state) => {
    const newLearntWords = new Set(state.learntWords);
    newLearntWords.add(word.toLowerCase());
    return { learntWords: newLearntWords };
  }),

  removeLearntWord: (word) => set((state) => {
    const newLearntWords = new Set(state.learntWords);
    newLearntWords.delete(word.toLowerCase());
    return { learntWords: newLearntWords };
  }),

  removeAnnotation: (word) => set((state) => {
    const newAnnotations = new Map(state.annotations);
    newAnnotations.delete(word.toLowerCase());
    return { annotations: newAnnotations };
  }),

  addAnnotation: (word, annotation) => set((state) => {
    const newAnnotations = new Map(state.annotations);
    newAnnotations.set(word.toLowerCase(), annotation);
    return { annotations: newAnnotations };
  }),

  updateAnnotation: (word, updates) => set((state) => {
    const newAnnotations = new Map(state.annotations);
    const existing = newAnnotations.get(word.toLowerCase());
    if (existing) {
      newAnnotations.set(word.toLowerCase(), { ...existing, ...updates });
    }
    return { annotations: newAnnotations };
  }),

  loadLearntWords: (words) => set({ learntWords: new Set(words.map(w => w.toLowerCase())) }),

  loadAnnotations: (annotations) => set({ annotations }),

  setSelectedWord: (word) => set({ selectedWord: word }),
  
  addToCardHistory: (type, word) => set((state) => {
    // 去重：如果已存在，先移除
    const filtered = state.cardHistory.filter(item => item.word !== word);
    // 添加到开头，限制最多50个
    const newHistory = [
      { type, word, timestamp: Date.now() },
      ...filtered
    ];
    return { cardHistory: newHistory };
  }),
  
  removeFromCardHistory: (word) => set((state) => ({
    cardHistory: state.cardHistory.filter(item => item.word !== word)
  })),
  
  addBookmark: (documentId, chapterId, paragraphIndex, sentenceIndex) => set((state) => {
    const newBookmarks = new Map(state.bookmarks);
    newBookmarks.set(documentId, {
      documentId,
      chapterId,
      paragraphIndex,
      sentenceIndex,
      timestamp: Date.now()
    });
    console.log('[Bookmark] Added:', { documentId, chapterId, paragraphIndex, sentenceIndex });
    
    // Save to localStorage
    const bookmarksObj = Object.fromEntries(newBookmarks);
    localStorage.setItem('bookmarks', JSON.stringify(bookmarksObj));
    
    return { bookmarks: newBookmarks };
  }),

  setShowIPA: (show) => set({ showIPA: show }),
  setShowChinese: (show) => set({ showChinese: show }),
  setLevel: (level) => set({ level }),
  setAutoMark: (autoMark) => set({ autoMark }),
  setAnnotationMode: (mode) => set({ annotationMode: mode }),
  setAutoPronounceSetting: (enabled) => set({ autoPronounceSetting: enabled }),
  setAutoShowCardOnPlay: (enabled) => set({ autoShowCardOnPlay: enabled }),
}));

// Helper function to get latest bookmark
export const getLatestBookmark = (documentId: string) => {
  const bookmarks = useAppStore.getState().bookmarks;
  return bookmarks.get(documentId) || null;
};

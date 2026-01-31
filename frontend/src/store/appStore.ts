import { create } from 'zustand';
import type { Paragraph } from '../utils/tokenize';
import type { WordAnnotation } from '../api';

interface Document {
  id: string;
  title: string;
  content: string;
  paragraphs: Paragraph[];
  createdAt: number;
}

interface AppState {
  // Documents
  documents: Document[];
  currentDocumentId: string | null;
  
  // Known words
  knownWords: Set<string>;

  // Annotations (word -> full annotation)
  annotations: Map<string, WordAnnotation>;

  // Selected word
  selectedWord: string | null;

  // UI settings
  showIPA: boolean;
  showChinese: boolean;
  level: string;
  
  // Actions
  addDocument: (doc: Document) => void;
  setCurrentDocument: (id: string) => void;
  loadKnownWords: (words: string[]) => void;
  addKnownWord: (word: string) => void;
  addAnnotation: (word: string, annotation: WordAnnotation) => void;
  setSelectedWord: (word: string | null) => void;
  setShowIPA: (show: boolean) => void;
  setShowChinese: (show: boolean) => void;
  setLevel: (level: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  documents: [],
  currentDocumentId: null,
  knownWords: new Set(),
  annotations: new Map(),
  selectedWord: null,
  showIPA: true,
  showChinese: true,
  level: 'B2',
  
  addDocument: (doc) => set((state) => ({
    documents: [...state.documents, doc],
    currentDocumentId: doc.id,
  })),
  
  setCurrentDocument: (id) => set({ currentDocumentId: id }),
  
  loadKnownWords: (words) => set({ knownWords: new Set(words.map(w => w.toLowerCase())) }),

  addKnownWord: (word) => set((state) => {
    const newKnownWords = new Set(state.knownWords);
    newKnownWords.add(word.toLowerCase());
    return { knownWords: newKnownWords };
  }),

  addAnnotation: (word, annotation) => set((state) => {
    const newAnnotations = new Map(state.annotations);
    newAnnotations.set(word.toLowerCase(), annotation);
    return { annotations: newAnnotations };
  }),

  setSelectedWord: (word) => set({ selectedWord: word }),

  setShowIPA: (show) => set({ showIPA: show }),
  setShowChinese: (show) => set({ showChinese: show }),
  setLevel: (level) => set({ level }),
}));

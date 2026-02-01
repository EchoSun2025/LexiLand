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

  // Learnt words (marked as learnt but keep annotations)
  learntWords: Set<string>;

  // Annotations (word -> full annotation)
  annotations: Map<string, WordAnnotation>;

  // Selected word
  selectedWord: string | null;

  // UI settings
  showIPA: boolean;
  showChinese: boolean;
  level: string;
  autoMark: boolean;
  autoMarkUnknown: boolean;
  genCard: boolean;
  
  // Actions
  addDocument: (doc: Document) => void;
  setCurrentDocument: (id: string) => void;
  loadKnownWords: (words: string[]) => void;
  addKnownWord: (word: string) => void;
  addLearntWord: (word: string) => void;
  removeLearntWord: (word: string) => void;
  removeAnnotation: (word: string) => void;
  addAnnotation: (word: string, annotation: WordAnnotation) => void;
  loadLearntWords: (words: string[]) => void;
  loadAnnotations: (annotations: Map<string, WordAnnotation>) => void;
  setSelectedWord: (word: string | null) => void;
  setShowIPA: (show: boolean) => void;
  setShowChinese: (show: boolean) => void;
  setLevel: (level: string) => void;
  setAutoMark: (autoMark: boolean) => void;
  setAutoMarkUnknown: (auto: boolean) => void;
  setGenCard: (gen: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  documents: [],
  currentDocumentId: null,
  knownWords: new Set(),
  learntWords: new Set(),
  annotations: new Map(),
  selectedWord: null,
  showIPA: true,
  showChinese: true,
  level: 'B2',
  autoMark: true,
  autoMarkUnknown: false,
  genCard: false,
  
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

  loadLearntWords: (words) => set({ learntWords: new Set(words.map(w => w.toLowerCase())) }),

  loadAnnotations: (annotations) => set({ annotations }),

  setSelectedWord: (word) => set({ selectedWord: word }),

  setShowIPA: (show) => set({ showIPA: show }),
  setShowChinese: (show) => set({ showChinese: show }),
  setLevel: (level) => set({ level }),
  setAutoMark: (autoMark) => set({ autoMark }),`n  setAutoMarkUnknown: (auto) => set({ autoMarkUnknown: auto }),`n  setGenCard: (gen) => set({ genCard: gen }),
}));

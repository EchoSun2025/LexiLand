/**
 * LexiLearn Interchange Format (LLIF) v1.0
 * 通用语言学习数据交换格式
 */

export interface LLIFMetadata {
  created: string;
  source: string;
  sourceLanguage: string;
  targetLanguage: string;
  creator: string;
  tags?: string[];
}

export interface LLIFPronunciation {
  ipa: string;
  audio?: string;
}

export interface LLIFTranslation {
  language: string;
  text: string;
  definition?: string;
}

export interface LLIFContext {
  sentence?: string;
  sentenceContext?: string;
  documentTitle?: string;
  documentUrl?: string;
  position?: {
    paragraph?: number;
    sentence?: number;
  };
}

export interface LLIFExample {
  text: string;
  translation?: string;
}

export interface LLIFEntryMetadata {
  addedAt: string;
  lastReviewedAt?: string;
  reviewCount?: number;
  masteryLevel?: number;
  tags?: string[];
}

export interface LLIFWordEntry {
  type: 'word';
  id?: string;
  language: string;
  content: {
    word: string;
    baseForm?: string;
    pronunciation?: LLIFPronunciation;
    partOfSpeech?: string;
    level?: string;
  };
  translations: LLIFTranslation[];
  context?: LLIFContext;
  examples?: LLIFExample[];
  metadata?: LLIFEntryMetadata;
}

export interface LLIFPhraseEntry {
  type: 'phrase';
  id?: string;
  language: string;
  content: {
    phrase: string;
    phraseType?: string;
  };
  translations: LLIFTranslation[];
  context?: LLIFContext;
  examples?: LLIFExample[];
  metadata?: LLIFEntryMetadata;
}

export type LLIFEntry = LLIFWordEntry | LLIFPhraseEntry;

export interface LLIFData {
  version: string;
  format: string;
  metadata: LLIFMetadata;
  entries: LLIFEntry[];
}

export interface LLIFStatistics {
  totalWords: number;
  totalPhrases: number;
  totalEntries: number;
  languages: string[];
}

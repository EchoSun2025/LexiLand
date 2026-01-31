/** 文档类型 */
export enum DocumentType {
  TXT = 'txt',
  EPUB = 'epub',
  DOCX = 'docx',
  PASTE = 'paste',
}

/** 文档元数据 */
export interface Document {
  id: string;
  title: string;
  type: DocumentType;
  language: 'en' | 'zh' | 'auto';
  createdAt: number;
  updatedAt: number;
  chapters: Chapter[];
  settings: DocumentSettings;
}

/** 章节 */
export interface Chapter {
  id: string;
  title: string;
  order: number;
  paragraphs: Paragraph[];
}

/** 段落 */
export interface Paragraph {
  id: string;
  chapterId: string;
  order: number;
  sentences: Sentence[];
  translation?: string;
  analysisCardId?: string;
}

/** 句子 */
export interface Sentence {
  id: string;
  paragraphId: string;
  order: number;
  tokens: Token[];
  illustrationCardId?: string;
}

/** 词元（Token）*/
export interface Token {
  id: string;
  sentenceId: string;
  text: string;
  type: 'word' | 'punctuation' | 'space';
  order: number;
  
  // 如果是单词
  isMarked?: boolean;
  isKnown?: boolean;
  annotation?: WordAnnotation;
  cardId?: string;
}

/** 单词标注 */
export interface WordAnnotation {
  word: string;
  ipa?: string;
  translation?: string;
  generatedAt: number;
}

/** 文档设置 */
export interface DocumentSettings {
  fontSize: number;
  lineHeight: number;
  userLevel: 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
}

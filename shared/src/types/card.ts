/** 卡片类型 */
export enum CardType {
  WORD = 'word',
  PARAGRAPH = 'paragraph',
  ILLUSTRATION = 'illustration',
}

/** 基础卡片 */
export interface BaseCard {
  id: string;
  type: CardType;
  documentId: string;
  chapterId: string;
  createdAt: number;
}

/** 单词卡片 */
export interface WordCard extends BaseCard {
  type: CardType.WORD;
  tokenId: string;
  word: string;
  ipa?: string;
  translation?: string;
  contextExplanation?: string;
  exampleSentence?: string;
  referenceImageUrl?: string;
  contextImageUrl?: string;
}

/** 段落卡片 */
export interface ParagraphCard extends BaseCard {
  type: CardType.PARAGRAPH;
  paragraphId: string;
  translation: string;
  analysis?: string;
}

/** 插图卡片 */
export interface IllustrationCard extends BaseCard {
  type: CardType.ILLUSTRATION;
  sentenceIds: string[];
  imageUrl: string;
  prompt: string;
  annotations?: ImageAnnotation[];
}

/** 图片标注 */
export interface ImageAnnotation {
  word: string;
  x: number;
  y: number;
}

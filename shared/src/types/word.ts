/** 用户词库 */
export interface UserVocabulary {
  knownWords: Set<string>;
  markedWords: Map<string, MarkedWord>;
}

/** 标记的单词 */
export interface MarkedWord {
  word: string;
  firstMarkedAt: number;
  contexts: WordContext[];
}

/** 单词上下文 */
export interface WordContext {
  documentId: string;
  chapterId: string;
  sentenceId: string;
  markedAt: number;
}

/** API 响应基础结构 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/** 标注请求 */
export interface AnnotateRequest {
  word: string;
  sentence: string;
  userLevel: 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
}

/** 标注响应 */
export interface AnnotateResponse {
  ipa: string;
  translation: string;
}

/** 单词详情请求 */
export interface WordDetailRequest {
  word: string;
  context: string;
  userLevel: string;
}

/** 单词详情响应 */
export interface WordDetailResponse {
  contextExplanation: string;
  exampleSentence: string;
}

/** 翻译请求 */
export interface TranslateRequest {
  text: string;
  level: string;
}

/** 翻译响应 */
export interface TranslateResponse {
  translation: string;
}

/** 分析请求 */
export interface AnalyzeRequest {
  text: string;
  level: string;
}

/** 分析响应 */
export interface AnalyzeResponse {
  analysis: string;
}

/** 生成插图请求 */
export interface GenerateIllustrationRequest {
  sentences: string[];
  context: string;
  newWords: string[];
  userLevel: string;
}

/** 生成插图响应 */
export interface GenerateIllustrationResponse {
  imageUrl: string;
  prompt: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface WordAnnotation {
  word: string;
  baseForm?: string;
  ipa: string;
  chinese: string;
  definition: string;
  example: string;
  level: string;
  partOfSpeech: string;
  sentence?: string;  // 单词所在的原文句子
  documentTitle?: string;  // 文章标题
  wordForms?: string[];  // 词形变化（如 v-ing, v-ed, 复数等）
  emoji?: string;  // Unicode emoji（默认生成或手动选择）
  emojiImagePath?: string[];  // 图片路径数组（AI/Unsplash，支持多个历史记录）
  emojiModel?: string;  // 最新图片使用的模型
}

export interface PhraseAnnotation {
  phrase: string;
  chinese: string;
  explanation?: string;
  sentenceContext: string;
  documentTitle?: string;  // 文章标题
}

export interface GenerateEmojiResponse {
  success: boolean;
  data?: {
    word: string;
    visualHint: string;
    imageUrl: string;
    model: string;  // 添加模型字段
  };
  error?: string;
  usage?: any;
}

export interface AnnotateResponse {
  success: boolean;
  data?: WordAnnotation;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface PhraseAnnotateResponse {
  success: boolean;
  data?: PhraseAnnotation;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export async function annotateWord(
  word: string,
  level: string = 'B2',
  context?: string
): Promise<AnnotateResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/annotate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ word, level, context }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('API Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch annotation',
    };
  }
}

export async function annotatePhrase(
  phrase: string,
  sentenceContext: string,
  level: string = 'B2'
): Promise<PhraseAnnotateResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/annotate-phrase`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phrase, sentenceContext, level }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('API Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch phrase annotation',
    };
  }
}

export async function generateEmojiImage(
  word: string,
  definition: string,
  sentenceContext?: string
): Promise<GenerateEmojiResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/generate-emoji`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ word, definition, sentenceContext }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('API Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to generate emoji',
    };
  }
}

export interface SearchImageResponse {
  success: boolean;
  data?: {
    word: string;
    imageUrl: string;
    source: string;
    searchQuery?: string;
    photographer?: string;
    photographerUrl?: string;
  };
  error?: string;
}

export async function searchImage(
  word: string,
  definition?: string
): Promise<SearchImageResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/search-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ word, definition }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    if (data?.success && data?.data) {
      console.log(
        `[Image Search Debug] word=${word}, source=${data.data.source}, query=${data.data.searchQuery || ''}`
      );
    }
    return data;
  } catch (error: any) {
    console.error('API Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to search image',
    };
  }
}

export interface SavePastedImageResponse {
  success: boolean;
  data?: {
    word: string;
    imageUrl: string;
    source: string;
  };
  error?: string;
}

export async function savePastedImage(
  word: string,
  imageData: string
): Promise<SavePastedImageResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/save-pasted-image`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ word, imageData }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('API Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to save pasted image',
    };
  }
}

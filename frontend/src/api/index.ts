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
}

export interface PhraseAnnotation {
  phrase: string;
  chinese: string;
  explanation?: string;
  sentenceContext: string;
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

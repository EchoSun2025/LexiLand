declare global {
  interface Window {
    __LEXILAND_DEBUG_WORDS__?: string[] | string;
  }
}

const DEFAULT_DEBUG_WORDS = ['worn', 'wear'];
const DEBUG_WORDS_STORAGE_KEY = 'lexiland:debugWords';

function normalizeWord(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

function parseDebugWords(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(item => normalizeWord(String(item))).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[,\s]+/)
      .map(item => normalizeWord(item))
      .filter(Boolean);
  }

  return [];
}

export function getDebugWords(): string[] {
  const fromWindow =
    typeof window !== 'undefined' ? parseDebugWords(window.__LEXILAND_DEBUG_WORDS__) : [];
  if (fromWindow.length > 0) {
    return Array.from(new Set(fromWindow));
  }

  const fromStorage =
    typeof window !== 'undefined'
      ? parseDebugWords(window.localStorage.getItem(DEBUG_WORDS_STORAGE_KEY))
      : [];
  if (fromStorage.length > 0) {
    return Array.from(new Set(fromStorage));
  }

  return DEFAULT_DEBUG_WORDS;
}

export function shouldDebugWord(...words: Array<string | undefined | null>): boolean {
  const debugWords = new Set(getDebugWords());
  if (debugWords.size === 0) return false;

  return words
    .map(normalizeWord)
    .filter(Boolean)
    .some(word => debugWords.has(word));
}

export function logWordDebug(stage: string, payload: Record<string, unknown>): void {
  console.groupCollapsed(`[WordDebug] ${stage}`);
  Object.entries(payload).forEach(([key, value]) => {
    console.log(`${key}:`, value);
  });
  console.groupEnd();
}

export {};

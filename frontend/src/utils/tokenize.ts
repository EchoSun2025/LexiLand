/**
 * Tokenize text into paragraphs, sentences, and words
 */

export interface Token {
  id: string;
  type: 'word' | 'punctuation' | 'whitespace';
  text: string;
  startIndex: number;
  endIndex: number;
}

export interface Sentence {
  id: string;
  text: string;
  tokens: Token[];
  startIndex: number;
  endIndex: number;
}

export interface Paragraph {
  id: string;
  text: string;
  sentences: Sentence[];
  startIndex: number;
  endIndex: number;
}

/**
 * Generate a simple unique ID
 */
function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Split text into paragraphs
 */
export function tokenizeParagraphs(text: string): Paragraph[] {
  const paragraphs: Paragraph[] = [];
  
  // First try splitting by double newlines (standard paragraph breaks)
  let rawParagraphs = text.split(/\n\n+/);
  
  // If only one paragraph found, try splitting by single newlines followed by uppercase
  // This handles files where paragraphs are separated by single newlines
  if (rawParagraphs.length === 1) {
    rawParagraphs = text.split(/\n(?=[A-Z])/);
  }

  let currentIndex = 0;

  for (const line of rawParagraphs) {
    const trimmed = line.trim();
    if (trimmed.length === 0) {
      currentIndex += line.length;
      continue;
    }
    
    const startIndex = text.indexOf(trimmed, currentIndex);
    const endIndex = startIndex + trimmed.length;
    
    const sentences = tokenizeSentences(trimmed, startIndex);
    
    paragraphs.push({
      id: generateId('para'),
      text: trimmed,
      sentences,
      startIndex,
      endIndex,
    });
    
    currentIndex = endIndex;
  }
  
  return paragraphs;
}

/**
 * Split paragraph into sentences
 * Simple implementation: split by . ! ?
 */
export function tokenizeSentences(text: string, baseIndex: number = 0): Sentence[] {
  const sentences: Sentence[] = [];
  
  // Match sentences ending with . ! ? followed by space or end of string
  const sentenceRegex = /[^.!?]+[.!?]+/g;
  let match;
  
  while ((match = sentenceRegex.exec(text)) !== null) {
    const sentenceText = match[0].trim();
    const startIndex = baseIndex + match.index;
    const endIndex = startIndex + match[0].length;
    
    const tokens = tokenizeWords(sentenceText, startIndex);
    
    sentences.push({
      id: generateId('sent'),
      text: sentenceText,
      tokens,
      startIndex,
      endIndex,
    });
  }
  
  // Handle remaining text without sentence ending
  const lastIndex = sentences.length > 0 ? sentences[sentences.length - 1].endIndex - baseIndex : 0;
  const remaining = text.slice(lastIndex).trim();
  
  if (remaining.length > 0) {
    const startIndex = baseIndex + lastIndex;
    const tokens = tokenizeWords(remaining, startIndex);
    
    sentences.push({
      id: generateId('sent'),
      text: remaining,
      tokens,
      startIndex,
      endIndex: startIndex + remaining.length,
    });
  }
  
  return sentences;
}

/**
 * Split sentence into word tokens
 */
export function tokenizeWords(text: string, baseIndex: number = 0): Token[] {
  const tokens: Token[] = [];
  
  // Match words, punctuation, and whitespace
  const tokenRegex = /(\w+(?:'\w+)?)|([^\w\s])|(\s+)/g;
  let match;
  
  while ((match = tokenRegex.exec(text)) !== null) {
    const [fullMatch, word, punct, space] = match;
    const startIndex = baseIndex + match.index;
    const endIndex = startIndex + fullMatch.length;
    
    let type: Token['type'];
    let tokenText: string;
    
    if (word) {
      type = 'word';
      tokenText = word;
    } else if (punct) {
      type = 'punctuation';
      tokenText = punct;
    } else {
      type = 'whitespace';
      tokenText = space;
    }
    
    tokens.push({
      id: generateId('tok'),
      type,
      text: tokenText,
      startIndex,
      endIndex,
    });
  }
  
  return tokens;
}

/**
 * Check if a word is in the known words list
 */
export function isKnownWord(word: string, knownWords: Set<string>): boolean {
  return knownWords.has(word.toLowerCase());
}

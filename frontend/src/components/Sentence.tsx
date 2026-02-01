import type { Sentence as SentenceType } from '../utils/tokenize';
import Word from './Word';

interface SentenceProps {
  sentence: SentenceType;
  knownWords: Set<string>;
  markedWords: Set<string>;
  learntWords: Set<string>;
  annotations: Map<string, { ipa?: string; chinese?: string }>;
  showIPA: boolean;
  showChinese: boolean;
  autoMark: boolean;
  onWordClick?: (word: string) => void;
  onMarkKnown?: (word: string) => void;
  isCurrentSentence?: boolean;
  currentWordIndex?: number;
}

export default function Sentence({ sentence, knownWords, markedWords, learntWords, annotations, showIPA, showChinese, autoMark, onWordClick, onMarkKnown, isCurrentSentence = false, currentWordIndex = -1 }: SentenceProps) {
  let wordCount = 0; // Track word index within this sentence
  
  return (
    <span className={`inline whitespace-pre-wrap ${isCurrentSentence ? 'bg-blue-100 rounded px-1' : ''}`}>
      {sentence.tokens.map((token, index) => {
        // For word tokens, render Word component followed by space if next token is not whitespace/punctuation
        const nextToken = sentence.tokens[index + 1];
        const needsSpace = token.type === 'word' && nextToken && nextToken.type === 'word';
        const isWordToken = token.type === 'word';
        
        // Calculate isCurrentWord BEFORE incrementing wordCount
        const isCurrentWord = isCurrentSentence && isWordToken && wordCount === currentWordIndex;
        
        // Increment wordCount AFTER checking
        if (isWordToken) {
          wordCount++;
        }
        
        return (
          <span key={`${token.id}-${index}`}>
            <Word
              token={token}
              isKnown={knownWords.has(token.text.toLowerCase())}
              isMarked={markedWords.has(token.text.toLowerCase())}
              isLearnt={learntWords.has(token.text.toLowerCase())}
              annotation={annotations.get(token.text.toLowerCase())}
              showIPA={showIPA}
              showChinese={showChinese}
              autoMark={autoMark}
              onClick={() => onWordClick?.(token.text)}
              onMarkKnown={onMarkKnown}
              isCurrentWord={isCurrentWord}
            />
            {needsSpace && ' '}
          </span>
        );
      })}
    </span>
  );
}

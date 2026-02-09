import type { Sentence as SentenceType } from '../utils/tokenize';
import Word from './Word';

interface SentenceProps {
  sentence: SentenceType;
  paragraphIndex: number;
  sentenceIndex: number;
  knownWords: Set<string>;
  markedWords: Set<string>;
  phraseMarkedRanges: Array<{ pIndex: number; sIndex: number; startTokenIndex: number; endTokenIndex: number }>;
  learntWords: Set<string>;
  annotations: Map<string, { ipa?: string; chinese?: string }>;
  showIPA: boolean;
  showChinese: boolean;
  autoMark: boolean;
  onWordClick?: (word: string, pIndex?: number, sIndex?: number, tokenIndex?: number) => void;
  onMarkKnown?: (word: string) => void;
  isCurrentSentence?: boolean;
  currentWordIndex?: number;
}

export default function Sentence({ sentence, paragraphIndex, sentenceIndex, knownWords, markedWords, phraseMarkedRanges, learntWords, annotations, showIPA, showChinese, autoMark, onWordClick, onMarkKnown, isCurrentSentence = false, currentWordIndex = -1 }: SentenceProps) {
  let wordCount = 0; // Track word index within this sentence

  return (
    <span className={`inline whitespace-pre-wrap ${isCurrentSentence ? 'bg-blue-100 rounded px-1' : ''}`}>
      {sentence.tokens.map((token, tokenIndex) => {
        const tokenPos = `p${paragraphIndex}-s${sentenceIndex}-t${tokenIndex}`;
        
        // Check if this token is in any phrase marked range
        const isInPhraseRange = phraseMarkedRanges.some(range =>
          range.pIndex === paragraphIndex &&
          range.sIndex === sentenceIndex &&
          tokenIndex >= range.startTokenIndex &&
          tokenIndex <= range.endTokenIndex
        );

        const isWordToken = token.type === 'word';
        const isCurrentWord = isCurrentSentence && isWordToken && wordCount === currentWordIndex;

        if (isWordToken) {
          const result = (
            <span key={`${token.id}-${tokenIndex}`} data-token-pos={tokenPos}>
              <Word
                token={token}
                isKnown={knownWords.has(token.text.toLowerCase())}
                isMarked={markedWords.has(token.text.toLowerCase())}
                isPhraseMarked={isInPhraseRange}
                isLearnt={learntWords.has(token.text.toLowerCase())}
                annotation={annotations.get(token.text.toLowerCase())}
                showIPA={showIPA}
                showChinese={showChinese}
                autoMark={autoMark}
                onClick={() => onWordClick?.(token.text, paragraphIndex, sentenceIndex, tokenIndex)}
                onMarkKnown={onMarkKnown}
                isCurrentWord={isCurrentWord}
              />
            </span>
          );
          wordCount++;
          return result;
        } else {
          // For non-word tokens (space, punctuation), also check if in purple range
          const className = isInPhraseRange ? 'bg-purple-100' : '';
          return (
            <span key={`${token.id}-${tokenIndex}`} data-token-pos={tokenPos} className={className}>
              {token.text}
            </span>
          );
        }
      })}
    </span>
  );
}

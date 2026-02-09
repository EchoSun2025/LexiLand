import type { Sentence as SentenceType } from '../utils/tokenize';
import Word from './Word';

interface SentenceProps {
  sentence: SentenceType;
  paragraphIndex: number;
  sentenceIndex: number;
  knownWords: Set<string>;
  markedWords: Set<string>;
  phraseMarkedRanges: Array<{ pIndex: number; sIndex: number; startTokenIndex: number; endTokenIndex: number }>;
  underlinePhraseRanges: Array<{ pIndex: number; sIndex: number; startTokenIndex: number; endTokenIndex: number; color: string }>;
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

export default function Sentence({ sentence, paragraphIndex, sentenceIndex, knownWords, markedWords, phraseMarkedRanges, underlinePhraseRanges, learntWords, annotations, showIPA, showChinese, autoMark, onWordClick, onMarkKnown, isCurrentSentence = false, currentWordIndex = -1 }: SentenceProps) {
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

        // Check if this token is in any underline phrase range and get its color
        const underlineRange = underlinePhraseRanges.find(range =>
          range.pIndex === paragraphIndex &&
          range.sIndex === sentenceIndex &&
          tokenIndex >= range.startTokenIndex &&
          tokenIndex <= range.endTokenIndex
        );
        const isInUnderlineRange = !!underlineRange;
        const underlineColor = underlineRange?.color || 'purple';

        const isWordToken = token.type === 'word';
        const isCurrentWord = isCurrentSentence && isWordToken && wordCount === currentWordIndex;

        if (isWordToken) {
          const colorMap: Record<string, string> = {
            red: '#f8717199', orange: '#fb923c99', amber: '#fbbf2499', emerald: '#34d39999',
            cyan: '#22d3ee99', blue: '#60a5fa99', purple: '#a78bfa99', pink: '#f472b699'
          };
          const borderStyle = isInUnderlineRange ? {
            borderBottom: `1px solid ${colorMap[underlineColor] || '#a78bfa99'}`
          } : {};
          const result = (
            <span key={`${token.id}-${tokenIndex}`} data-token-pos={tokenPos} style={borderStyle}>
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
          const colorMap: Record<string, string> = {
            red: '#f8717199', orange: '#fb923c99', amber: '#fbbf2499', emerald: '#34d39999',
            cyan: '#22d3ee99', blue: '#60a5fa99', purple: '#a78bfa99', pink: '#f472b699'
          };
          const borderStyle = isInUnderlineRange ? {
            borderBottom: `1px solid ${colorMap[underlineColor] || '#a78bfa99'}`
          } : {};
          return (
            <span key={`${token.id}-${tokenIndex}`} data-token-pos={tokenPos} className={className} style={borderStyle}>
              {token.text}
            </span>
          );
        }
      })}
    </span>
  );
}

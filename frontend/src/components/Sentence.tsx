import type { Sentence as SentenceType } from '../utils/tokenize';
import Word from './Word';
import { useState } from 'react';

interface SentenceProps {
  sentence: SentenceType;
  paragraphIndex: number;
  sentenceIndex: number;
  knownWords: Set<string>;
  markedWords: Set<string>;
  phraseMarkedRanges: Array<{ pIndex: number; sIndex: number; startTokenIndex: number; endTokenIndex: number }>;
  annotatedPhraseRanges: Array<{ pIndex: number; sIndex: number; startTokenIndex: number; endTokenIndex: number; phrase: string }>;
  underlinePhraseRanges: Array<{ pIndex: number; sIndex: number; startTokenIndex: number; endTokenIndex: number; color: string }>;
  learntWords: Set<string>;
  annotations: Map<string, { ipa?: string; chinese?: string }>;
  phraseAnnotations: Map<string, { phrase: string; chinese: string; explanation?: string; sentenceContext: string }>;
  phraseTranslationInserts: Map<string, boolean>;
  showIPA: boolean;
  showChinese: boolean;
  autoMark: boolean;
  onWordClick?: (word: string, pIndex?: number, sIndex?: number, tokenIndex?: number) => void;
  onMarkKnown?: (word: string) => void;
  isCurrentSentence?: boolean;
  currentWordIndex?: number;
}

export default function Sentence({ sentence, paragraphIndex, sentenceIndex, knownWords, markedWords, phraseMarkedRanges, annotatedPhraseRanges, underlinePhraseRanges, learntWords, annotations, phraseAnnotations, phraseTranslationInserts, showIPA, showChinese, autoMark, onWordClick, onMarkKnown, isCurrentSentence = false, currentWordIndex = -1 }: SentenceProps) {
  let wordCount = 0; // Track word index within this sentence
  const [hoveredUnderlineRange, setHoveredUnderlineRange] = useState<number | null>(null);

  return (
    <span className={`inline whitespace-pre-wrap ${isCurrentSentence ? 'bg-blue-100 rounded px-1' : ''}`}>
      {sentence.tokens.map((token, tokenIndex) => {
        const tokenPos = `p${paragraphIndex}-s${sentenceIndex}-t${tokenIndex}`;
        
        // Check if this token is in any phrase marked range (purple)
        const isInPhraseRange = phraseMarkedRanges.some(range =>
          range.pIndex === paragraphIndex &&
          range.sIndex === sentenceIndex &&
          tokenIndex >= range.startTokenIndex &&
          tokenIndex <= range.endTokenIndex
        );
        
        // Check if this token is in any annotated phrase range (blue-purple)
        const annotatedRange = annotatedPhraseRanges.find(range =>
          range.pIndex === paragraphIndex &&
          range.sIndex === sentenceIndex &&
          tokenIndex >= range.startTokenIndex &&
          tokenIndex <= range.endTokenIndex
        );
        const isInAnnotatedPhraseRange = !!annotatedRange;

        // Check if this token is in any underline phrase range and get its color
        const underlineRangeIndex = underlinePhraseRanges.findIndex(range =>
          range.pIndex === paragraphIndex &&
          range.sIndex === sentenceIndex &&
          tokenIndex >= range.startTokenIndex &&
          tokenIndex <= range.endTokenIndex
        );
        const underlineRange = underlineRangeIndex !== -1 ? underlinePhraseRanges[underlineRangeIndex] : null;
        const isInUnderlineRange = !!underlineRange;
        const underlineColor = underlineRange?.color || 'purple';
        
        // Highlight if hovering over an underline range and this token is in a phrase range within that underline
        const shouldHighlight = hoveredUnderlineRange !== null && 
          isInPhraseRange &&
          underlinePhraseRanges[hoveredUnderlineRange] &&
          paragraphIndex === underlinePhraseRanges[hoveredUnderlineRange].pIndex &&
          sentenceIndex === underlinePhraseRanges[hoveredUnderlineRange].sIndex &&
          tokenIndex >= underlinePhraseRanges[hoveredUnderlineRange].startTokenIndex &&
          tokenIndex <= underlinePhraseRanges[hoveredUnderlineRange].endTokenIndex;

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
          const hoverStyle = shouldHighlight ? { backgroundColor: 'rgba(167, 139, 250, 0.3)' } : {};
          
          // Determine if should show phrase translation
          const shouldShowPhraseTranslation = isInAnnotatedPhraseRange && 
            annotatedRange && 
            showChinese && 
            phraseTranslationInserts.get(annotatedRange.phrase);
          
          const result = (
            <span 
              key={`${token.id}-${tokenIndex}`} 
              data-token-pos={tokenPos} 
              style={{...borderStyle, ...hoverStyle}}
              onMouseEnter={() => isInUnderlineRange && setHoveredUnderlineRange(underlineRangeIndex)}
              onMouseLeave={() => setHoveredUnderlineRange(null)}
            >
              <Word
                token={token}
                isKnown={knownWords.has(token.text.toLowerCase())}
                isMarked={markedWords.has(token.text.toLowerCase())}
                isPhraseMarked={isInPhraseRange}
                isAnnotatedPhrase={isInAnnotatedPhraseRange}
                isLearnt={learntWords.has(token.text.toLowerCase())}
                annotation={annotations.get(token.text.toLowerCase())}
                showIPA={showIPA}
                showChinese={showChinese}
                autoMark={autoMark}
                onClick={() => onWordClick?.(token.text, paragraphIndex, sentenceIndex, tokenIndex)}
                onMarkKnown={onMarkKnown}
                isCurrentWord={isCurrentWord}
              />
              {/* Show phrase translation after the last token of annotated phrase */}
              {shouldShowPhraseTranslation && 
               annotatedRange.endTokenIndex === tokenIndex &&
               phraseAnnotations.get(annotatedRange.phrase) && (
                <span className="text-[10px] text-purple-700 ml-1 bg-purple-50 px-1 rounded">
                  {phraseAnnotations.get(annotatedRange.phrase)!.chinese}
                </span>
              )}
            </span>
          );
          wordCount++;
          return result;
        } else {
          // For non-word tokens (space, punctuation), also check if in purple range
          // Use blue-purple for annotated phrases, purple for marked phrases
          let phraseUnderlineClass = '';
          if (isInAnnotatedPhraseRange) {
            phraseUnderlineClass = 'border-b-2 border-indigo-500'; // 蓝紫色
          } else if (isInPhraseRange) {
            phraseUnderlineClass = 'border-b-2 border-purple-500/50'; // 紫色 50% 透明
          }
          
          const colorMap: Record<string, string> = {
            red: '#f8717199', orange: '#fb923c99', amber: '#fbbf2499', emerald: '#34d39999',
            cyan: '#22d3ee99', blue: '#60a5fa99', purple: '#a78bfa99', pink: '#f472b699'
          };
          const borderStyle = isInUnderlineRange ? {
            borderBottom: `1px solid ${colorMap[underlineColor] || '#a78bfa99'}`
          } : {};
          const hoverStyle = shouldHighlight ? { backgroundColor: 'rgba(167, 139, 250, 0.3)' } : {};
          return (
            <span 
              key={`${token.id}-${tokenIndex}`} 
              data-token-pos={tokenPos} 
              className={phraseUnderlineClass} 
              style={{...borderStyle, ...hoverStyle}}
              onMouseEnter={() => isInUnderlineRange && setHoveredUnderlineRange(underlineRangeIndex)}
              onMouseLeave={() => setHoveredUnderlineRange(null)}
            >
              {token.text}
            </span>
          );
        }
      })}
    </span>
  );
}

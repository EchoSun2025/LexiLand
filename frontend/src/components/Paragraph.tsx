import type { Paragraph as ParagraphType } from '../utils/tokenize';
import Sentence from './Sentence';

interface ParagraphProps {
  paragraph: ParagraphType;
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
  onPhraseClick?: (phrase: string) => void;
  onMarkKnown?: (word: string) => void;
  onParagraphAction?: () => void;
  paragraphIndex?: number;
  currentSentenceIndex?: number | null;
  currentWordIndex?: number;
  sentencesBeforeThisPara?: number;
}

export default function Paragraph({
  paragraph,
  knownWords,
  markedWords,
  phraseMarkedRanges,
  annotatedPhraseRanges,
  underlinePhraseRanges,
  learntWords,
  annotations,
  phraseAnnotations,
  phraseTranslationInserts,
  showIPA,
  showChinese,
  autoMark,
  onWordClick,
  onPhraseClick,
  onMarkKnown,
  onParagraphAction,
  paragraphIndex = 0,
  currentSentenceIndex = null,
  currentWordIndex = -1,
  sentencesBeforeThisPara = 0
}: ParagraphProps) {
  return (
    <div className="relative leading-relaxed mb-4 rounded-lg p-1.5 hover:bg-gray-50 group">
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          className="px-2 py-1 border border-border bg-white rounded-lg hover:bg-hover text-xs"
          onClick={onParagraphAction}
        >
          &gt;
        </button>
      </div>
      {paragraph.sentences.map((sentence, index) => {
        // Calculate global sentence index
        const globalSentenceIndex = sentencesBeforeThisPara + index;
        const isCurrentSentence = currentSentenceIndex === globalSentenceIndex;
        
        if (isCurrentSentence) {
          console.log('[Paragraph] Current sentence:', globalSentenceIndex, 'wordIndex:', currentWordIndex, 'text:', sentence.text);
        }
        
        return (
          <Sentence
            key={sentence.id}
            sentence={sentence}
            paragraphIndex={paragraphIndex}
            sentenceIndex={index}
            knownWords={knownWords}
            markedWords={markedWords}
            phraseMarkedRanges={phraseMarkedRanges}
            annotatedPhraseRanges={annotatedPhraseRanges}
            underlinePhraseRanges={underlinePhraseRanges}
            learntWords={learntWords}
            annotations={annotations}
            phraseAnnotations={phraseAnnotations}
            phraseTranslationInserts={phraseTranslationInserts}
            showIPA={showIPA}
            showChinese={showChinese}
            autoMark={autoMark}
            onWordClick={onWordClick}
            onPhraseClick={onPhraseClick}
            onMarkKnown={onMarkKnown}
            isCurrentSentence={isCurrentSentence}
            currentWordIndex={currentWordIndex}
          />
        );
      })}
    </div>
  );
}

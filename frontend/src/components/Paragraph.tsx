import type { Paragraph as ParagraphType } from '../utils/tokenize';
import Sentence from './Sentence';

interface ParagraphProps {
  paragraph: ParagraphType;
  knownWords: Set<string>;
  markedWords: Set<string>;
  phraseMarkedWords: Set<string>;
  learntWords: Set<string>;
  annotations: Map<string, { ipa?: string; chinese?: string }>;
  showIPA: boolean;
  showChinese: boolean;
  autoMark: boolean;
  onWordClick?: (word: string) => void;
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
  phraseMarkedWords,
  learntWords,
  annotations,
  showIPA,
  showChinese,
  autoMark,
  onWordClick,
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
            sentenceIndex={sIdx}
            knownWords={knownWords}
            markedWords={markedWords}
            phraseMarkedWords={phraseMarkedWords}
            learntWords={learntWords}
            annotations={annotations}
            showIPA={showIPA}
            showChinese={showChinese}
            autoMark={autoMark}
            onWordClick={onWordClick}
            onMarkKnown={onMarkKnown}
            isCurrentSentence={isCurrentSentence}
            currentWordIndex={currentWordIndex}
          />
        );
      })}
    </div>
  );
}

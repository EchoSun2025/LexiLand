import type { Sentence as SentenceType } from '../utils/tokenize';
import Word from './Word';

interface SentenceProps {
  sentence: SentenceType;
  knownWords: Set<string>;
  learntWords: Set<string>;
  annotations: Map<string, { ipa?: string; chinese?: string }>;
  showIPA: boolean;
  showChinese: boolean;
  autoMark: boolean;
  onWordClick?: (word: string) => void;
  onMarkKnown?: (word: string) => void;
}

export default function Sentence({ sentence, knownWords, learntWords, annotations, showIPA, showChinese, autoMark, onWordClick, onMarkKnown }: SentenceProps) {
  return (
    <span className="inline whitespace-pre-wrap">
      {sentence.tokens.map((token, index) => (
        <Word
          key={`${token.id}-${index}`}
          token={token}
          isKnown={knownWords.has(token.text.toLowerCase())}
          isLearnt={learntWords.has(token.text.toLowerCase())}
          annotation={annotations.get(token.text.toLowerCase())}
          showIPA={showIPA}
          showChinese={showChinese}
          autoMark={autoMark}
          onClick={() => onWordClick?.(token.text)}
          onMarkKnown={onMarkKnown}
        />
      ))}
    </span>
  );
}

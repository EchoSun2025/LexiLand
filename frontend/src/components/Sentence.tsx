import type { Sentence as SentenceType } from '../utils/tokenize';
import Word from './Word';

interface SentenceProps {
  sentence: SentenceType;
  knownWords: Set<string>;
  annotations: Map<string, { ipa?: string; chinese?: string }>;
  showIPA: boolean;
  showChinese: boolean;
  onWordClick?: (word: string) => void;
  onMarkKnown?: (word: string) => void;
}

export default function Sentence({ sentence, knownWords, annotations, showIPA, showChinese, onWordClick, onMarkKnown }: SentenceProps) {
  return (
    <span className="inline">
      {sentence.tokens.map((token, index) => (
        <Word
          key={`${token.id}-${index}`}
          token={token}
          isKnown={knownWords.has(token.text.toLowerCase())}
          annotation={annotations.get(token.text.toLowerCase())}
          showIPA={showIPA}
          showChinese={showChinese}
          onClick={() => onWordClick?.(token.text)}
          onMarkKnown={onMarkKnown}
        />
      ))}
    </span>
  );
}

import type { Sentence as SentenceType } from '../utils/tokenize';
import Word from './Word';

interface SentenceProps {
  sentence: SentenceType;
  paragraphIndex: number;
  sentenceIndex: number;
  knownWords: Set<string>;
  markedWords: Set<string>;
  phraseMarkedWords: Set<string>;
  learntWords: Set<string>;
  annotations: Map<string, { ipa?: string; chinese?: string }>;
  showIPA: boolean;
  showChinese: boolean;
  autoMark: boolean;
  onWordClick?: (word: string, wordId?: string) => void;
  onMarkKnown?: (word: string) => void;
  isCurrentSentence?: boolean;
  currentWordIndex?: number;
}

export default function Sentence({ sentence, paragraphIndex, sentenceIndex, knownWords, markedWords, phraseMarkedWords, learntWords, annotations, showIPA, showChinese, autoMark, onWordClick, onMarkKnown, isCurrentSentence = false, currentWordIndex = -1 }: SentenceProps) {
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
        
        // Create word position ID
        const wordId = isWordToken ? `p${paragraphIndex}-s${sentenceIndex}-w${wordCount}` : '';
        
        // Check if this word is phrase marked (purple)
        const isPhraseMarked = wordId && phraseMarkedWords.has(wordId);
        
        // Check if next word is also phrase marked (for purple space)
        const nextWordId = nextToken && nextToken.type === 'word' ? `p${paragraphIndex}-s${sentenceIndex}-w${wordCount + 1}` : '';
        const isNextPhraseMarked = nextWordId && phraseMarkedWords.has(nextWordId);
        const shouldPurpleSpace = needsSpace && isPhraseMarked && isNextPhraseMarked;
        
        if (isPhraseMarked || isNextPhraseMarked) {
          console.log('Word:', token.text, 'wordId:', wordId, 'isPhraseMarked:', isPhraseMarked, 'nextToken:', nextToken?.text, 'nextWordId:', nextWordId, 'isNextPhraseMarked:', isNextPhraseMarked, 'needsSpace:', needsSpace, 'shouldPurpleSpace:', shouldPurpleSpace);
        }
        
        // Increment wordCount AFTER checking
        if (isWordToken) {
          wordCount++;
        }

        return (
          <span key={`${token.id}-${index}`}>
            <Word
              token={token}
              wordId={wordId}
              isKnown={knownWords.has(token.text.toLowerCase())}
              isMarked={markedWords.has(token.text.toLowerCase())}
              isPhraseMarked={isPhraseMarked}
              isLearnt={learntWords.has(token.text.toLowerCase())}
              annotation={annotations.get(token.text.toLowerCase())}
              showIPA={showIPA}
              showChinese={showChinese}
              autoMark={autoMark}
              onClick={() => onWordClick?.(token.text, wordId)}
              onMarkKnown={onMarkKnown}
              isCurrentWord={isCurrentWord}
            />
            {needsSpace && (shouldPurpleSpace ? <span className="bg-purple-100"> </span> : ' ')}
          </span>
        );
      })}
    </span>
  );
}

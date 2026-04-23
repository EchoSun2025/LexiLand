import CardNotes from './CardNotes';

export interface PhraseAnnotation {
  phrase: string;
  cardType?: 'phrase' | 'sentence' | 'paragraph' | 'grammar';
  chinese: string;
  explanation?: string;
  usagePattern?: string;
  usagePatternChinese?: string;
  isCommonUsage?: boolean;
  grammarPoints?: Array<{
    text: string;
    explanation: string;
  }>;
  sentenceContext: string;
  documentTitle?: string;  // 文章标题
  cachedAt?: number;
}

interface PhraseCardProps {
  annotation: PhraseAnnotation;
  isInserted: boolean;
  onClose: () => void;
  onDelete?: (phrase: string) => void;
  onToggleInsert: (phrase: string) => void;
  onRegenerateAI?: (phrase: string, sentence: string) => void;
}

export default function PhraseCard({ annotation, isInserted, onClose, onDelete, onToggleInsert, onRegenerateAI }: PhraseCardProps) {
  const handleToggleInsert = () => {
    onToggleInsert(annotation.phrase);
  };
  const cardType = annotation.cardType || 'phrase';
  const label = cardType === 'sentence'
    ? 'Sentence'
    : cardType === 'paragraph'
      ? 'Paragraph'
      : cardType === 'grammar'
        ? 'Grammar'
        : 'Phrase / Expression';

  return (
    <div className="bg-white border border-purple-300 rounded-2xl p-4 mb-3 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 text-center">
          <h3 className="text-xl font-bold text-purple-900">
            {annotation.phrase}
          </h3>
          <div className="text-xs text-muted mt-1">{label}</div>
        </div>
        <div className="flex items-center gap-2">
          {/* Delete button */}
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (confirm(`Delete phrase "${annotation.phrase}" from cards?`)) {
                  onDelete(annotation.phrase);
                }
              }}
              className="text-gray-400 hover:text-red-600 text-lg leading-none px-2"
              aria-label="Delete"
              title="Delete phrase"
            >
              ×
            </button>
          )}
          {/* Collapse button */}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none px-2"
            aria-label="Collapse"
            title="Collapse card"
          >
            ◀
          </button>
        </div>
      </div>

      {/* Chinese Translation with AI button */}
      <div className="mb-3">
        <div className="flex items-center gap-2">
          <div className="flex-1">
            <div className="text-lg text-gray-900">{annotation.chinese}</div>
          </div>
          <button
            onClick={handleToggleInsert}
            className={`text-xs px-2 py-1 rounded border flex-shrink-0 ${
              isInserted 
                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-300' 
                : 'bg-purple-50 text-purple-600 hover:bg-purple-100 border-purple-200'
            }`}
            title="Insert translation into text"
          >
            {isInserted ? '✓ Inserted' : '+ Insert'}
          </button>
          {onRegenerateAI && (
            <button
              onClick={() => onRegenerateAI(annotation.phrase, annotation.sentenceContext)}
              className="text-xs px-2 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded border border-purple-200 flex-shrink-0"
              title="Re-generate with AI"
            >
              🤖 AI
            </button>
          )}
        </div>
      </div>

      {/* Explanation (if available) */}
      {annotation.explanation && (
        <div className="mb-3">
          <div className="text-sm text-gray-700">{annotation.explanation}</div>
        </div>
      )}

      {annotation.usagePattern && (
        <div className="mb-3 bg-purple-50 border border-purple-100 rounded-lg p-3">
          <div className="text-xs font-semibold text-purple-700 mb-1">Common Pattern</div>
          <div className="text-sm font-semibold text-purple-900">{annotation.usagePattern}</div>
          {annotation.usagePatternChinese && (
            <div className="text-xs text-purple-700 mt-1">{annotation.usagePatternChinese}</div>
          )}
        </div>
      )}

      {annotation.grammarPoints && annotation.grammarPoints.length > 0 && (
        <div className="mb-3 bg-amber-50 border border-amber-100 rounded-lg p-3">
          <div className="text-xs font-semibold text-amber-800 mb-2">Grammar Points</div>
          <div className="space-y-2">
            {annotation.grammarPoints.map((point, index) => (
              <div key={`${point.text}-${index}`} className="text-sm">
                <div className="font-semibold text-amber-900">{point.text}</div>
                <div className="text-xs text-amber-800">{point.explanation}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Context Sentence */}
      <div className="mb-3">
        <div className="text-xs font-semibold text-muted mb-1">Context</div>
        <div className="text-sm text-gray-700 italic bg-purple-50 p-2 rounded-lg leading-relaxed">
          "{annotation.sentenceContext}"
        </div>
      </div>

      {/* Document Title (if exists) */}
      {annotation.documentTitle && (
        <div className="mb-3">
          <div className="text-xs font-semibold text-muted mb-1">来源</div>
          <div className="text-xs text-gray-600 italic">{annotation.documentTitle}</div>
        </div>
      )}

      <CardNotes
        cardType={cardType}
        cardKey={annotation.phrase.toLowerCase()}
        cardText={annotation.phrase}
        context={annotation.sentenceContext}
      />
    </div>
  );
}



export interface PhraseAnnotation {
  phrase: string;
  chinese: string;
  explanation?: string;
  sentenceContext: string;
}

interface PhraseCardProps {
  annotation: PhraseAnnotation;
  isInserted: boolean;
  onClose: () => void;
  onDelete?: (phrase: string) => void;
  onToggleInsert: (phrase: string) => void;
}

export default function PhraseCard({ annotation, isInserted, onClose, onDelete, onToggleInsert }: PhraseCardProps) {
  const handleDelete = () => {
    if (confirm(`Delete phrase "${annotation.phrase}" from cards?`)) {
      onDelete?.(annotation.phrase);
    }
  };
  
  const handleToggleInsert = () => {
    onToggleInsert(annotation.phrase);
  };

  return (
    <div className="bg-white border border-purple-300 rounded-2xl p-4 mb-3 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 text-center">
          <h3 className="text-xl font-bold text-purple-900">
            {annotation.phrase}
          </h3>
          <div className="text-xs text-muted mt-1">Phrase / Expression</div>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Chinese Translation */}
      <div className="mb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="text-xs font-semibold text-muted mb-1">翻译</div>
            <div className="text-lg text-gray-900">{annotation.chinese}</div>
          </div>
          <button
            onClick={handleToggleInsert}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
              isInserted 
                ? 'bg-purple-100 text-purple-700 hover:bg-purple-200' 
                : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
            }`}
          >
            {isInserted ? '✓ Inserted' : '+ Insert'}
          </button>
        </div>
      </div>

      {/* Context Sentence */}
      <div className="mb-3">
        <div className="text-xs font-semibold text-muted mb-1">Context</div>
        <div className="text-sm text-gray-700 italic bg-purple-50 p-2 rounded-lg leading-relaxed">
          "{annotation.sentenceContext}"
        </div>
      </div>

      {/* Explanation (if exists) */}
      {annotation.explanation && (
        <div className="mb-3">
          <div className="text-xs font-semibold text-muted mb-1">解释</div>
          <div className="text-sm text-gray-700 leading-relaxed">{annotation.explanation}</div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-border">
        {onDelete && (
          <button 
            onClick={handleDelete}
            className="flex-1 px-3 py-2 text-sm bg-red-50 text-red-700 hover:bg-red-100 rounded-lg font-semibold"
          >
            🗑️ Delete
          </button>
        )}
      </div>
    </div>
  );
}

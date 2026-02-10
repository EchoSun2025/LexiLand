import type { WordAnnotation } from '../api';

interface WordCardProps {
  annotation: WordAnnotation;
  isLearnt: boolean;
  onClose: () => void;
  onMarkKnown?: (word: string) => void;
  onDelete?: (word: string) => void;
}

export default function WordCard({ annotation, isLearnt, onClose, onMarkKnown, onDelete }: WordCardProps) {
  const handleDelete = () => {
    if (confirm(`Delete "${annotation.word}" from cards?`)) {
      onDelete?.(annotation.word);
    }
  };

  const handlePronounce = () => {
    const utterance = new SpeechSynthesisUtterance(annotation.word);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="bg-white border border-border rounded-2xl p-4 mb-3 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 text-center">
          <h3 className="text-2xl font-bold text-gray-900">
            {annotation.word}
            {annotation.baseForm && (
              <span className="text-sm text-gray-500 font-normal ml-2">
                (from: {annotation.baseForm})
              </span>
            )}
          </h3>
          <div className="flex items-center justify-center gap-3 mt-1">
            {/* Clickable IPA for pronunciation */}
            <button
              onClick={handlePronounce}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline cursor-pointer transition-colors"
              title="Click to pronounce"
            >
              /{annotation.ipa.replace(/^\/+|\/+$/g, '')}/
            </button>
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">
              {annotation.level}
            </span>
            <span className="text-xs text-muted">{annotation.partOfSpeech}</span>
          </div>
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
        <div className="text-xs font-semibold text-muted mb-1">中文翻译</div>
        <div className="text-lg text-gray-900">{annotation.chinese}</div>
      </div>

      {/* Definition */}
      <div className="mb-3">
        <div className="text-xs font-semibold text-muted mb-1">Definition</div>
        <div className="text-sm text-gray-700 leading-relaxed">{annotation.definition}</div>
      </div>

      {/* Example */}
      <div className="mb-3">
        <div className="text-xs font-semibold text-muted mb-1">Example</div>
        <div className="text-sm text-gray-700 italic leading-relaxed bg-gray-50 p-2 rounded-lg">
          "{annotation.example}"
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2 border-t border-border">
        {onMarkKnown && (
          <button 
            onClick={() => onMarkKnown(annotation.word)}
            className={`flex-1 px-3 py-2 text-sm rounded-lg font-semibold transition-colors ${
              isLearnt
                ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                : 'bg-green-50 text-green-700 hover:bg-green-100'
            }`}
          >
            {isLearnt ? '✓ Known' : '✓ Mark as Known'}
          </button>
        )}
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

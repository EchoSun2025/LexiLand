import type { WordAnnotation } from '../api';

interface WordCardProps {
  annotation: WordAnnotation;
  onClose: () => void;
}

export default function WordCard({ annotation, onClose }: WordCardProps) {
  return (
    <div className="bg-white border border-border rounded-2xl p-4 mb-3 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-gray-900">{annotation.word}</h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-sm text-blue-600">/{annotation.ipa}/</span>
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
        <button className="flex-1 px-3 py-2 text-sm bg-green-50 text-green-700 hover:bg-green-100 rounded-lg font-semibold">
          ✓ Mark as Known
        </button>
        <button className="flex-1 px-3 py-2 text-sm bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-semibold">
          🔊 Pronounce
        </button>
      </div>
    </div>
  );
}

import { useState } from 'react';
import type { Token } from '../utils/tokenize';

interface WordProps {
  token: Token;
  isKnown: boolean;
  annotation?: {
    ipa?: string;
    chinese?: string;
  };
  showIPA: boolean;
  showChinese: boolean;
  onClick?: () => void;
  onMarkKnown?: (word: string) => void;
}

export default function Word({ token, isKnown, annotation, showIPA, showChinese, onClick, onMarkKnown }: WordProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  if (token.type !== 'word') {
    return <span>{token.text}</span>;
  }

  const isUnknown = !isKnown && token.text.length > 1;

  const handleMarkKnown = (e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发 onClick
    onMarkKnown?.(token.text);
  };

  return (
    <span 
      className="relative inline-block group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <span
        className={`${isUnknown ? 'font-bold rounded px-0.5 cursor-pointer hover:bg-yellow-100' : ''}`}
        onClick={isUnknown ? onClick : undefined}
      >
        {token.text}
      </span>
      
      {/* × 按钮 - 悬停时显示 */}
      {isUnknown && isHovered && (
        <button
          onClick={handleMarkKnown}
          className="absolute -top-3 -right-2 w-4 h-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full text-xs flex items-center justify-center shadow-md transition-all"
          title="Mark as known"
        >
          ×
        </button>
      )}
      
      {isUnknown && annotation && (
        <>
          {showIPA && annotation.ipa && (
            <span className="text-[10px] text-muted ml-1 whitespace-nowrap">
              /{annotation.ipa.replace(/^\/+|\/+$/g, '')}/
            </span>
          )}
          {showChinese && annotation.chinese && (
            <span className="text-[10px] text-muted ml-1">
              {annotation.chinese}
            </span>
          )}
        </>
      )}
    </span>
  );
}

import { useState } from 'react';
import type { Token } from '../utils/tokenize';

interface WordProps {
  token: Token;
  isKnown: boolean;
  isMarked: boolean;
  isLearnt: boolean;
  annotation?: {
    ipa?: string;
    chinese?: string;
  };
  showIPA: boolean;
  showChinese: boolean;
  autoMark: boolean;
  onClick?: () => void;
  onMarkKnown?: (word: string) => void;
  isCurrentWord?: boolean;
}

export default function Word({ token, isKnown, isMarked, isLearnt, annotation, showIPA, showChinese, autoMark, onClick, onMarkKnown, isCurrentWord = false }: WordProps) {
  // Display marked words in bold
  const fontWeight = isMarked ? 'font-bold' : 'font-normal';
  const [isHovered, setIsHovered] = useState(false);

  if (token.type !== 'word') {
    return <span>{token.text}</span>;
  }

  const isUnknown = !isKnown && !isLearnt && token.text.length > 1;
  // 淡橙色高亮: 已学习且有注释数据的单词
  const showLearnt = isLearnt && annotation && (annotation as any).definition;
  // 是否有注释（已加入cards）
  const hasAnnotation = !!annotation;
  
  // 可点击条件：autoMark模式下只有未知词和learnt可点，非autoMark模式下所有词都可点
  const isClickable = autoMark ? (isUnknown || showLearnt) : token.text.length > 1;

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
        className={`${
          isCurrentWord
            ? 'bg-yellow-300 font-bold rounded px-0.5 border-2 border-yellow-500'
            : showLearnt
            ? 'bg-orange-100 rounded px-0.5 cursor-pointer hover:bg-orange-200'
            : isMarked || hasAnnotation
            ? 'font-bold rounded px-0.5 cursor-pointer hover:bg-yellow-100'
            : isClickable && !autoMark
            ? 'cursor-pointer hover:bg-yellow-50'
            : ''
        }`}
        onClick={isClickable && !showLearnt ? onClick : undefined}
        onDoubleClick={showLearnt ? onClick : undefined}
        </button>
      )}

      {hasAnnotation && isUnknown && (
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



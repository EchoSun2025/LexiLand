import type { Token } from '../utils/tokenize';
import { useRef } from 'react';

interface WordProps {
  token: Token;
  isKnown: boolean;
  isMarked: boolean;
  isPhraseMarked: boolean;
  isAnnotatedPhrase?: boolean;
  isHoveredPhrase?: boolean;
  isLearnt: boolean;
  annotation?: {
    ipa?: string;
    chinese?: string;
    baseForm?: string;
    wordForms?: string[];
  };
  showIPA: boolean;
  showChinese: boolean;
  autoMark: boolean;
  autoPronounceSetting?: boolean;  // 自动发音开关
  onClick?: () => void;
  onMarkKnown?: (word: string) => void;
  isCurrentWord?: boolean;
}

export default function Word({ token, isMarked, isPhraseMarked, isAnnotatedPhrase = false, isHoveredPhrase = false, isLearnt, annotation, showIPA, showChinese, autoMark, autoPronounceSetting = false, onClick, isCurrentWord = false }: WordProps) {
  const hoverTimerRef = useRef<number | undefined>(undefined);

  if (token.type !== 'word') {
    return <span>{token.text}</span>;
  }
  
  // Auto pronounce on hover
  const handleMouseEnter = () => {
    if (!autoPronounceSetting || token.text.length <= 1) return;
    
    // 1秒后自动发音
    hoverTimerRef.current = window.setTimeout(() => {
      const utterance = new SpeechSynthesisUtterance(token.text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
      console.log('[Auto Pronounce]', token.text);
    }, 1000);
  };
  
  const handleMouseLeave = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = undefined;
    }
  };
  
  // Pronounce on click (if auto pronounce is enabled)
  const handleClick = () => {
    // 单击时朗读（如果启用了自动发音）
    if (autoPronounceSetting && token.text.length > 1) {
      const utterance = new SpeechSynthesisUtterance(token.text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
      console.log('[Click Pronounce]', token.text);
    }
    
    // 执行原有的点击逻辑
    if (onClick) {
      onClick();
    }
  };

  // 是否有完整的card数据（有definition表示已生成过card）
  const hasCard = annotation && (annotation as any).definition;
  // 淡橙色高亮: 有card的词
  const showLearnt = hasCard;
  // 是否有注释（IPA或中文）
  const hasAnnotation = !!annotation;

  // 可点击条件：showLearnt的词双击打开卡片，其他词单击切换标记
  const isClickable = token.text.length > 1;
  
  // 分离背景色和下划线逻辑
  let backgroundColor = '';
  let borderBottomStyle = '';
  let additionalClasses = '';
  
  // 1. 确定背景色（优先级：当前朗读 > 橙色已标注 > 绿色标记 > 加粗显示）
  if (isCurrentWord) {
    // 正在朗读的词：仅高亮显示，不加粗不加边框
    backgroundColor = 'bg-yellow-300';
  } else if (showLearnt) {
    // isLearnt 为 true 时，橙色 30% 透明度
    backgroundColor = isLearnt ? 'bg-orange-100/30' : 'bg-orange-100';
    additionalClasses = 'cursor-pointer hover:bg-orange-200';
  } else if (isMarked) {
    backgroundColor = 'bg-green-100';
    additionalClasses = 'cursor-pointer hover:bg-green-200';
  } else if (hasAnnotation) {
    additionalClasses = 'font-bold px-0.5 cursor-pointer hover:bg-yellow-100';
  } else if (isClickable && !autoMark) {
    additionalClasses = 'cursor-pointer hover:bg-yellow-50';
  }
  
  // 2. 确定下划线（短语标记）- 独立逻辑，悬停整个短语时100%透明度
  if (isAnnotatedPhrase && !isCurrentWord) {
    // 已标注的短语：紫色 35% 透明，悬停整个短语时 100%
    borderBottomStyle = isHoveredPhrase 
      ? 'border-b-2 border-purple-500' 
      : 'border-b-2 border-purple-500/35';
  } else if (isPhraseMarked && !isCurrentWord) {
    // 选择中的短语：蓝色 35% 透明，悬停整个短语时 100%
    borderBottomStyle = isHoveredPhrase 
      ? 'border-b-2 border-blue-500' 
      : 'border-b-2 border-blue-500/35';
  }
  
  return (
    <span className="relative inline-block group">
      <span
        className={`${backgroundColor} ${borderBottomStyle} ${additionalClasses}`}
        onClick={isClickable && !showLearnt ? handleClick : undefined}
        onDoubleClick={showLearnt ? handleClick : undefined}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        >
        {token.text}
      </span>

      {/* 显示注释：有 annotation 且非 learnt 状态时显示 */}
      {hasAnnotation && !isLearnt && (
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



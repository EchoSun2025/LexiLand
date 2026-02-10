import type { Token } from '../utils/tokenize';

interface WordProps {
  token: Token;
  isKnown: boolean;
  isMarked: boolean;
  isPhraseMarked: boolean;
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

export default function Word({ token, isKnown, isMarked, isPhraseMarked, isLearnt, annotation, showIPA, showChinese, autoMark, onClick, isCurrentWord = false }: WordProps) {

  if (token.type !== 'word') {
    return <span>{token.text}</span>;
  }

  const isUnknown = !isKnown && !isLearnt && token.text.length > 1;
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
    backgroundColor = 'bg-yellow-300';
    additionalClasses = 'font-bold rounded px-0.5 border-2 border-yellow-500';
  } else if (showLearnt) {
    backgroundColor = 'bg-orange-100';
    additionalClasses = 'cursor-pointer hover:bg-orange-200';
  } else if (isMarked) {
    backgroundColor = 'bg-green-100';
    additionalClasses = 'cursor-pointer hover:bg-green-200';
  } else if (hasAnnotation) {
    additionalClasses = 'font-bold px-0.5 cursor-pointer hover:bg-yellow-100';
  } else if (isClickable && !autoMark) {
    additionalClasses = 'cursor-pointer hover:bg-yellow-50';
  }
  
  // 2. 确定下划线（紫色短语标记）- 独立逻辑，透明度50%
  if (isPhraseMarked && !isCurrentWord) {
    borderBottomStyle = 'border-b-2 border-purple-500/50';
  }
  
  return (
    <span className="relative inline-block group">
      <span
        className={`${backgroundColor} ${borderBottomStyle} ${additionalClasses}`}
        onClick={isClickable && !showLearnt ? onClick : undefined}
        onDoubleClick={showLearnt ? onClick : undefined}
        >
        {token.text}
      </span>

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



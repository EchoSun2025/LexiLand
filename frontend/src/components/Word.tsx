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
}

export default function Word({ token, isKnown, annotation, showIPA, showChinese, onClick }: WordProps) {
  if (token.type !== 'word') {
    return <span>{token.text}</span>;
  }

  const isUnknown = !isKnown && token.text.length > 1;

  return (
    <>
      <span
        className={`${isUnknown ? 'font-bold rounded px-0.5 cursor-pointer hover:bg-yellow-100' : ''}`}
        onClick={isUnknown ? onClick : undefined}
      >
        {token.text}
      </span>
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
    </>
  );
}

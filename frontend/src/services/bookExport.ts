import JSZip from 'jszip';
import type { PhraseAnnotation, WordAnnotation } from '../api';
import type { Document as AppDocument } from '../store/appStore';
import type { Paragraph, Sentence, Token } from '../utils';
import { applyMeaningToAnnotation, findAnnotationEntry, findBestMeaningIdForSentence } from '../utils/wordMeanings';

export interface ExportBookSettings {
  format: 'epub' | 'pdf';
  includeIPA: boolean;
  includeChinese: boolean;
  includePhraseList: boolean;
  includePhraseTranslations: boolean;
}

interface ExportChapter {
  id: string;
  title: string;
  paragraphs: Paragraph[];
}

interface ChapterPhraseItem {
  phrase: string;
  displayText: string;
  translation?: string;
}

type PhraseRange = {
  startTokenIndex: number;
  endTokenIndex: number;
  phrase: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'book';
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getExportChapters(document: AppDocument): ExportChapter[] {
  if (document.type === 'epub' && document.chapters?.length) {
    return document.chapters.map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      paragraphs: chapter.paragraphs,
    }));
  }

  return [{
    id: document.id,
    title: document.title,
    paragraphs: document.paragraphs || [],
  }];
}

function findPhraseRanges(sentence: Sentence, phraseAnnotations: Map<string, PhraseAnnotation>): PhraseRange[] {
  const ranges: PhraseRange[] = [];

  for (let startTokenIndex = 0; startTokenIndex < sentence.tokens.length; startTokenIndex++) {
    for (let endTokenIndex = startTokenIndex + 1; endTokenIndex < sentence.tokens.length; endTokenIndex++) {
      const phraseText = sentence.tokens
        .slice(startTokenIndex, endTokenIndex + 1)
        .map((token) => token.text)
        .join('')
        .trim()
        .toLowerCase();

      if (phraseAnnotations.has(phraseText)) {
        ranges.push({ startTokenIndex, endTokenIndex, phrase: phraseText });
        startTokenIndex = endTokenIndex;
        break;
      }
    }
  }

  return ranges;
}

function formatWordRuby(annotation: WordAnnotation, tokenText: string, settings: ExportBookSettings): string {
  const parts: string[] = [];

  if (settings.includeIPA && annotation.ipa) {
    parts.push(annotation.ipa);
  }

  if (settings.includeChinese && annotation.chinese) {
    parts.push(annotation.chinese);
  }

  if (parts.length === 0) {
    return escapeHtml(tokenText);
  }

  return `<ruby class="lx-word"><rb>${escapeHtml(tokenText)}</rb><rt>${escapeHtml(parts.join(' | '))}</rt></ruby>`;
}

function resolveWordAnnotation(
  token: Token,
  sentenceText: string,
  annotations: Map<string, WordAnnotation>,
): WordAnnotation | null {
  const base = findAnnotationEntry(annotations, token.text);
  if (!base) {
    return null;
  }

  const annotation = base.annotation;
  const bestMeaningId = findBestMeaningIdForSentence(annotation, sentenceText);
  return bestMeaningId ? applyMeaningToAnnotation(annotation, bestMeaningId) : annotation;
}

function renderSentence(
  sentence: Sentence,
  annotations: Map<string, WordAnnotation>,
  phraseAnnotations: Map<string, PhraseAnnotation>,
  phraseTranslationInserts: Map<string, boolean>,
  settings: ExportBookSettings,
  chapterPhrases: Map<string, ChapterPhraseItem>,
): string {
  const phraseRanges = findPhraseRanges(sentence, phraseAnnotations);
  const tokenToPhrase = new Map<number, PhraseRange>();

  phraseRanges.forEach((range) => {
    for (let index = range.startTokenIndex; index <= range.endTokenIndex; index++) {
      tokenToPhrase.set(index, range);
    }

    const annotation = phraseAnnotations.get(range.phrase);
    if (annotation && !chapterPhrases.has(range.phrase)) {
      chapterPhrases.set(range.phrase, {
        phrase: range.phrase,
        displayText: annotation.usagePattern?.trim() || annotation.phrase,
        translation: annotation.usagePatternChinese?.trim() || annotation.chinese,
      });
    }
  });

  return sentence.tokens.map((token, index) => {
    let rendered = escapeHtml(token.text);

    if (token.type === 'word') {
      const annotation = resolveWordAnnotation(token, sentence.text, annotations);
      if (annotation) {
        rendered = formatWordRuby(annotation, token.text, settings);
      }
    }

    const phraseRange = tokenToPhrase.get(index);
    if (
      phraseRange &&
      settings.includePhraseTranslations &&
      index === phraseRange.endTokenIndex &&
      phraseTranslationInserts.get(phraseRange.phrase)
    ) {
      const phraseAnnotation = phraseAnnotations.get(phraseRange.phrase);
      if (phraseAnnotation?.chinese) {
        rendered += `<span class="lx-phrase-translation"> (${escapeHtml(phraseAnnotation.chinese)})</span>`;
      }
    }

    return rendered;
  }).join('');
}

function renderChapterBody(
  chapter: ExportChapter,
  annotations: Map<string, WordAnnotation>,
  phraseAnnotations: Map<string, PhraseAnnotation>,
  phraseTranslationInserts: Map<string, boolean>,
  settings: ExportBookSettings,
): { bodyHtml: string; phraseItems: ChapterPhraseItem[] } {
  const chapterPhrases = new Map<string, ChapterPhraseItem>();

  const paragraphsHtml = chapter.paragraphs.map((paragraph) => {
    const sentenceHtml = paragraph.sentences.map((sentence) => renderSentence(
      sentence,
      annotations,
      phraseAnnotations,
      phraseTranslationInserts,
      settings,
      chapterPhrases,
    )).join(' ');

    return `<p>${sentenceHtml}</p>`;
  }).join('\n');

  const phraseItems = Array.from(chapterPhrases.values());
  const phraseSummaryHtml = settings.includePhraseList && phraseItems.length > 0
    ? `
      <section class="lx-phrase-summary">
        <h3>Marked Phrases</h3>
        <ul>
          ${phraseItems.map((item) => `
            <li>
              <span class="lx-phrase-item">${escapeHtml(item.displayText)}</span>
              ${settings.includePhraseTranslations && item.translation ? `<span class="lx-phrase-item-translation"> - ${escapeHtml(item.translation)}</span>` : ''}
            </li>
          `).join('')}
        </ul>
      </section>
    `
    : '';

  return {
    bodyHtml: `
      <section class="lx-chapter">
        <h2>${escapeHtml(chapter.title)}</h2>
        ${paragraphsHtml}
        ${phraseSummaryHtml}
      </section>
    `,
    phraseItems,
  };
}

function getBookStyles(): string {
  return `
    body { font-family: Georgia, "Times New Roman", serif; color: #222; line-height: 1.7; margin: 0; }
    .lx-book { max-width: 840px; margin: 0 auto; padding: 32px 28px 48px; }
    .lx-cover { border-bottom: 2px solid #d4d0c8; margin-bottom: 28px; padding-bottom: 20px; }
    .lx-cover h1 { font-size: 2rem; margin: 0 0 8px; }
    .lx-cover p { color: #666; margin: 0; }
    .lx-chapter { page-break-before: always; margin-bottom: 40px; }
    .lx-chapter h2 { font-size: 1.6rem; margin: 0 0 18px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
    p { margin: 0 0 1rem; text-align: justify; }
    ruby.lx-word { ruby-position: over; }
    ruby.lx-word rt { font-size: 0.7rem; color: #8b4513; }
    .lx-phrase-translation { color: #5b4db1; font-size: 0.92em; }
    .lx-phrase-summary { margin-top: 28px; padding-top: 14px; border-top: 1px dashed #bdb3a7; }
    .lx-phrase-summary h3 { margin: 0 0 12px; font-size: 1rem; }
    .lx-phrase-summary ul { margin: 0; padding-left: 20px; }
    .lx-phrase-summary li { margin: 0 0 8px; }
    .lx-phrase-item { font-weight: 600; }
    .lx-phrase-item-translation { color: #555; }
    @media print {
      body { margin: 0; }
      .lx-book { max-width: none; padding: 18mm 14mm; }
      .lx-chapter { break-before: page; }
    }
  `;
}

function buildBookHtml(
  document: AppDocument,
  annotations: Map<string, WordAnnotation>,
  phraseAnnotations: Map<string, PhraseAnnotation>,
  phraseTranslationInserts: Map<string, boolean>,
  settings: ExportBookSettings,
): { html: string; chapters: Array<{ id: string; title: string; bodyHtml: string }> } {
  const chapters = getExportChapters(document).map((chapter) => {
    const rendered = renderChapterBody(
      chapter,
      annotations,
      phraseAnnotations,
      phraseTranslationInserts,
      settings,
    );

    return {
      id: chapter.id,
      title: chapter.title,
      bodyHtml: rendered.bodyHtml,
    };
  });

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(document.title)}</title>
        <style>${getBookStyles()}</style>
      </head>
      <body>
        <main class="lx-book">
          <section class="lx-cover">
            <h1>${escapeHtml(document.title)}</h1>
            ${document.author ? `<p>${escapeHtml(document.author)}</p>` : ''}
          </section>
          ${chapters.map((chapter) => chapter.bodyHtml).join('\n')}
        </main>
      </body>
    </html>
  `;

  return { html, chapters };
}

async function exportAsPdf(html: string, existingWindow?: Window | null) {
  const printWindow = existingWindow ?? window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) {
    throw new Error('Popup blocked. Please allow popups to export PDF.');
  }

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  await new Promise<void>((resolve) => {
    printWindow.onload = () => resolve();
    setTimeout(() => resolve(), 600);
  });

  printWindow.print();
}

function buildEpubChapterXhtml(title: string, bodyHtml: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
  <head>
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" type="text/css" href="styles.css"/>
  </head>
  <body>
    <main class="lx-book">
      ${bodyHtml}
    </main>
  </body>
</html>`;
}

async function exportAsEpub(
  document: AppDocument,
  chapters: Array<{ id: string; title: string; bodyHtml: string }>,
) {
  const zip = new JSZip();
  const safeTitle = slugify(document.title);

  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });
  zip.folder('META-INF')?.file('container.xml', `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`);

  const oebps = zip.folder('OEBPS');
  oebps?.file('styles.css', getBookStyles());

  const manifestItems = [
    '<item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml"/>',
    ...chapters.map((_, index) => `<item id="chap${index + 1}" href="chapter-${index + 1}.xhtml" media-type="application/xhtml+xml"/>`),
  ];

  const spineItems = chapters.map((_, index) => `<itemref idref="chap${index + 1}"/>`);

  chapters.forEach((chapter, index) => {
    oebps?.file(`chapter-${index + 1}.xhtml`, buildEpubChapterXhtml(chapter.title, chapter.bodyHtml));
  });

  oebps?.file('toc.ncx', `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
  <head>
    <meta name="dtb:uid" content="${safeTitle}"/>
  </head>
  <docTitle><text>${escapeHtml(document.title)}</text></docTitle>
  <navMap>
    ${chapters.map((chapter, index) => `
      <navPoint id="navPoint-${index + 1}" playOrder="${index + 1}">
        <navLabel><text>${escapeHtml(chapter.title)}</text></navLabel>
        <content src="chapter-${index + 1}.xhtml"/>
      </navPoint>
    `).join('')}
  </navMap>
</ncx>`);

  oebps?.file('content.opf', `<?xml version="1.0" encoding="UTF-8"?>
<package version="2.0" xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title>${escapeHtml(document.title)}</dc:title>
    <dc:language>en</dc:language>
    <dc:identifier id="BookId">${safeTitle}</dc:identifier>
    ${document.author ? `<dc:creator>${escapeHtml(document.author)}</dc:creator>` : ''}
  </metadata>
  <manifest>
    <item id="css" href="styles.css" media-type="text/css"/>
    ${manifestItems.join('\n    ')}
  </manifest>
  <spine toc="ncx">
    ${spineItems.join('\n    ')}
  </spine>
</package>`);

  const blob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
  });

  downloadBlob(blob, `${safeTitle}.epub`);
}

export async function exportAnnotatedBook(
  document: AppDocument,
  annotations: Map<string, WordAnnotation>,
  phraseAnnotations: Map<string, PhraseAnnotation>,
  phraseTranslationInserts: Map<string, boolean>,
  settings: ExportBookSettings,
  existingPdfWindow?: Window | null,
) {
  const { html, chapters } = buildBookHtml(
    document,
    annotations,
    phraseAnnotations,
    phraseTranslationInserts,
    settings,
  );

  if (settings.format === 'pdf') {
    await exportAsPdf(html, existingPdfWindow);
    return;
  }

  await exportAsEpub(document, chapters);
}

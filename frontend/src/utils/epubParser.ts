// @ts-nocheck
import ePub from 'epubjs';
import type { Chapter } from '../store/appStore';
import { tokenizeParagraphs } from './tokenize';

/**
 * Parse EPUB file and extract chapters
 */
export async function parseEpubFile(file: File): Promise<{
  title: string;
  author?: string;
  chapters: Chapter[];
}> {
  try {
    // Read file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Create EPUB book instance
    const book = ePub(arrayBuffer);
    await book.ready;
    
    // Get metadata
    const metadata = book.packaging.metadata;
    const title = metadata.title || file.name.replace(/\.epub$/i, '');
    const author = metadata.creator || undefined;
    
    console.log('[EPUB] Book loaded:', title, 'by', author);
    console.log('[EPUB] Spine items:', book.spine.items.length);
    
    // Extract chapters from spine
    const chapters: Chapter[] = [];
    
    for (let i = 0; i < book.spine.items.length; i++) {
      const item = book.spine.items[i];
      
      try {
        // Load chapter content
        const doc = await book.load(item.href);
        
        // Extract text content
        let textContent = '';
        if (doc && doc.body) {
          textContent = extractTextFromHtml(doc.body);
        }
        
        // Skip empty chapters
        if (!textContent.trim()) {
          console.log(`[EPUB] Skipping empty chapter ${i + 1}`);
          continue;
        }
        
        // Get chapter title from TOC or use default
        const chapterTitle = getChapterTitle(book, item.idref) || `Chapter ${chapters.length + 1}`;
        
        console.log(`[EPUB] Parsed chapter ${chapters.length + 1}: ${chapterTitle} (${textContent.length} chars)`);
        
        chapters.push({
          id: `chapter-${i}`,
          title: chapterTitle,
          content: textContent,
          paragraphs: tokenizeParagraphs(textContent)
        });
      } catch (error) {
        console.error(`[EPUB] Error parsing chapter ${i + 1}:`, error);
      }
    }
    
    console.log(`[EPUB] Successfully parsed ${chapters.length} chapters`);
    
    return {
      title,
      author,
      chapters
    };
  } catch (error) {
    console.error('[EPUB] Parse error:', error);
    throw new Error(`Failed to parse EPUB file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract plain text from HTML element
 */
function extractTextFromHtml(element: HTMLElement): string {
  // Remove script and style tags
  const cloned = element.cloneNode(true) as HTMLElement;
  const scripts = cloned.querySelectorAll('script, style');
  scripts.forEach(script => script.remove());
  
  // Get text content with proper paragraph separation
  let text = '';
  
  // Process block-level elements as paragraphs
  const blockElements = cloned.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li, blockquote, pre');
  
  if (blockElements.length > 0) {
    // Extract text from each block element
    blockElements.forEach((block) => {
      const blockText = (block.textContent || '').trim();
      if (blockText) {
        text += blockText + '\n\n';
      }
    });
  } else {
    // Fallback: use the whole element's text content
    text = cloned.textContent || '';
  }
  
  // Clean up excessive whitespace within paragraphs
  text = text
    .split('\n\n')  // Split by paragraph breaks
    .map(para => para.replace(/\s+/g, ' ').trim())  // Clean each paragraph
    .filter(para => para.length > 0)  // Remove empty paragraphs
    .join('\n\n');  // Rejoin with double newlines
  
  return text;
}

/**
 * Get chapter title from TOC
 */
function getChapterTitle(book: any, idref: string): string | null {
  try {
    // Try to find title in navigation
    if (book.navigation && book.navigation.toc) {
      for (const item of book.navigation.toc) {
        if (item.href && item.href.includes(idref)) {
          return item.label || null;
        }
        // Check nested items
        if (item.subitems) {
          for (const subitem of item.subitems) {
            if (subitem.href && subitem.href.includes(idref)) {
              return subitem.label || null;
            }
          }
        }
      }
    }
    return null;
  } catch (error) {
    return null;
  }
}

import { useEffect, useRef, useState } from 'react'
import './App.css'
import { useAppStore, type Document, type Chapter, getLatestBookmark } from './store/appStore'
import { tokenizeParagraphs, type Paragraph as ParagraphType, type Sentence, type Token } from './utils'
import Paragraph from './components/Paragraph'
import WordCard from './components/WordCard'
import { loadKnownWordsFromFile, getAllKnownWords, addKnownWord as addKnownWordToDB, batchAddKnownWords, cacheAnnotation, getAllCachedAnnotations, addLearntWordToDB, removeLearntWordFromDB, getAllLearntWords, deleteAnnotation, cachePhraseAnnotation, getAllCachedPhraseAnnotations, deletePhraseAnnotation, exportUserData, importUserData, updateEmoji, addEmojiImagePath } from './db'
import { annotateWord, annotatePhrase, searchImage, generateEmojiImage, savePastedImage, type WordAnnotation, type PhraseAnnotation } from './api'
import PhraseCard from './components/PhraseCard'
import { localDictionary } from './services/localDictionary'
import { exportLLIFString } from './services/llifConverter'
import { getWordEmoji, getAllEmojiKeywords } from './utils/emojiHelper'

const keywordToEmoji = getAllEmojiKeywords();
const collapsedCommonEmojis = Array.from(new Set(Array.from(keywordToEmoji.values()))).slice(0, 120);

function App() {
  const {
    documents,
    currentDocumentId,
    knownWords,
    learntWords,
    annotations,
    selectedWord,
    cardHistory,
    showIPA,
    showChinese,
    level,
    autoMark,
    annotationMode,
    autoPronounceSetting,
    addDocument,
    setCurrentDocument,
    setCurrentChapter,
    setSelectedWord,
    addAnnotation,
    updateAnnotation,
    addKnownWord,
    addLearntWord,
    removeLearntWord,
    removeAnnotation,
    addToCardHistory,
    removeFromCardHistory,
    addBookmark,
    setShowIPA,
    setShowChinese,
    setLevel,
    setAnnotationMode,
    setAutoPronounceSetting,
    setAutoShowCardOnPlay,
    loadKnownWords,
    loadLearntWords,
    loadAnnotations,
  } = useAppStore();
  
  const autoShowCardOnPlay = useAppStore(state => state.autoShowCardOnPlay);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [showNewDocModal, setShowNewDocModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  
  // Get current document and chapter
  const currentDocument = documents.find((d: Document) => d.id === currentDocumentId);
  const currentChapter = currentDocument?.type === 'epub' && currentDocument.currentChapterId
    ? currentDocument.chapters?.find((c: Chapter) => c.id === currentDocument.currentChapterId)
    : null;
  
  // Get paragraphs to display (from chapter or document)
  const displayParagraphs = currentChapter?.paragraphs || currentDocument?.paragraphs || [];

  // Speech synthesis state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState<number | null>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(-1);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const shouldStopRef = useRef(false);
  const [speechRate, setSpeechRate] = useState(0.9);
  const [speechPitch, setSpeechPitch] = useState(1.0);
  const [selectedVoice, setSelectedVoice] = useState<string>('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showSpeedControl, setShowSpeedControl] = useState(false);
  const [autoAnnotate, setAutoAnnotate] = useState(false); // 自动标注模式
  const [isLoadingAnnotation, setIsLoadingAnnotation] = useState(false);
  const [markedWords, setMarkedWords] = useState<Set<string>>(new Set());
  
  // 今日标注统计
  const [todayAnnotations, setTodayAnnotations] = useState<{ date: string; count: number; words: Array<{type: 'word' | 'phrase', word: string}> }>(() => {
    const stored = localStorage.getItem('todayAnnotations');
    if (stored) {
      const data = JSON.parse(stored);
      const today = new Date().toDateString();
      // 如果存储的日期是今天，返回存储的数据；否则重置
      if (data.date === today) {
        // 兼容旧版本：如果没有words字段，添加空数组
        return {
          date: data.date,
          count: data.count || 0,
          words: data.words || []
        };
      }
    }
    return { date: new Date().toDateString(), count: 0, words: [] };
  });
  
  // State for hiding translations in card history (for self-testing)
  const [hiddenTranslations, setHiddenTranslations] = useState<Set<string>>(new Set());
  
  const [phraseMarkedRanges, setPhraseMarkedRanges] = useState<Array<{ pIndex: number; sIndex: number; startTokenIndex: number; endTokenIndex: number }>>([]); // stores token ranges
  const [underlinePhraseRanges, setUnderlinePhraseRanges] = useState<Array<{ pIndex: number; sIndex: number; startTokenIndex: number; endTokenIndex: number; color: string }>>([]); // for discontinuous phrases with Ctrl+Shift
  const [isOutlineCollapsed, setIsOutlineCollapsed] = useState(true); // Default collapsed like Notion
  const [isOutlineHovered, setIsOutlineHovered] = useState(false);
  const [phraseAnnotations, setPhraseAnnotations] = useState<Map<string, PhraseAnnotation>>(new Map());
  const [annotatedPhraseRanges, setAnnotatedPhraseRanges] = useState<Array<{ pIndex: number; sIndex: number; startTokenIndex: number; endTokenIndex: number; phrase: string }>>([]); // 已标注的短语范围
  const [phraseTranslationInserts, setPhraseTranslationInserts] = useState<Map<string, boolean>>(new Map()); // 短语翻译插入状态
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false); // 设置面板
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; pIndex: number; sIndex: number } | null>(null); // 右键菜单
  const [expandedCardKey, setExpandedCardKey] = useState<string | null>(null); // 当前展开的卡片（格式：type-word）
  const [collapsedImageMenu, setCollapsedImageMenu] = useState<{ panel: 'emoji' | 'web'; word: string; top: number; left: number } | null>(null);
  const [collapsedEmojiSearchQuery, setCollapsedEmojiSearchQuery] = useState('');
  const [collapsedGoogleKeyword, setCollapsedGoogleKeyword] = useState('');
  const [collapsedClipboardSaving, setCollapsedClipboardSaving] = useState(false);
  const [collapsedUnsplashLockedWords, setCollapsedUnsplashLockedWords] = useState<Set<string>>(new Set());
  const prevMarkedWordsSize = useRef<number>(0); // 追踪上次的 markedWords 大小

  // Initialize local dictionary
  useEffect(() => {
    localDictionary.initialize().then(() => {
      const stats = localDictionary.getStats();
      console.log(`[App] Local dictionary initialized: ${stats.totalWords} words`);
    });
  }, []);

  // Save today's annotations to localStorage
  useEffect(() => {
    localStorage.setItem('todayAnnotations', JSON.stringify(todayAnnotations));
  }, [todayAnnotations]);

  // Auto-annotate when markedWords increases (if autoAnnotate is enabled)
  useEffect(() => {
    // 只在标记词增加时触发（不在减少时触发）
    if (autoAnnotate && markedWords.size > prevMarkedWordsSize.current && markedWords.size > 0 && !isLoadingAnnotation) {
      console.log('[Auto-Annotate] Triggered by word mark');
      handleAnnotate(true);
    }
    prevMarkedWordsSize.current = markedWords.size;
  }, [markedWords.size]); // 只监听大小变化

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowExportMenu(false);
    if (showExportMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showExportMenu]);

  // Rebuild annotatedPhraseRanges when document or phraseAnnotations change
  useEffect(() => {
    if (!currentDocument || phraseAnnotations.size === 0) {
      setAnnotatedPhraseRanges([]);
      return;
    }

    const ranges: Array<{ pIndex: number; sIndex: number; startTokenIndex: number; endTokenIndex: number; phrase: string }> = [];

    // Scan each paragraph and sentence
    displayParagraphs.forEach((paragraph: ParagraphType, pIndex: number) => {
      paragraph.sentences.forEach((sentence: Sentence, sIndex: number) => {
        // Try to find phrase matches in this sentence
        for (let startTokenIndex = 0; startTokenIndex < sentence.tokens.length; startTokenIndex++) {
          // Try different phrase lengths (from 2 to remaining tokens)
          for (let endTokenIndex = startTokenIndex + 1; endTokenIndex < sentence.tokens.length; endTokenIndex++) {
            const phraseText = sentence.tokens
              .slice(startTokenIndex, endTokenIndex + 1)
              .map((t: Token) => t.text)
              .join('')
              .trim()
              .toLowerCase();

            // Check if this phrase exists in phraseAnnotations
            if (phraseAnnotations.has(phraseText)) {
              ranges.push({
                pIndex,
                sIndex,
                startTokenIndex,
                endTokenIndex,
                phrase: phraseText
              });
              // Skip to end of this phrase to avoid overlapping matches
              startTokenIndex = endTokenIndex;
              break;
            }
          }
        }
      });
    });

    setAnnotatedPhraseRanges(ranges);
    console.log(`[OK] Rebuilt ${ranges.length} annotated phrase ranges for current document`);
  }, [currentDocument, phraseAnnotations]);

  // Clear marked words when document changes
  useEffect(() => {
    if (!currentDocument) {
      setMarkedWords(new Set());
      return;
    }

    // Auto-mark is removed, markedWords will only be set by manual clicks
    setMarkedWords(new Set());
  }, [currentDocument, knownWords]);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const enVoices = voices.filter(v => v.lang.startsWith('en'));
      setAvailableVoices(enVoices);
      if (enVoices.length > 0 && !selectedVoice) {
        // Try to find Microsoft Ava Online Natural voice
        const avaVoice = enVoices.find(v => 
          v.name.toLowerCase().includes('ava') && 
          v.name.toLowerCase().includes('online')
        );
        // Fallback to any Microsoft Online Natural voice
        const msOnlineVoice = enVoices.find(v => 
          v.name.toLowerCase().includes('microsoft') && 
          v.name.toLowerCase().includes('online')
        );
        // Use Ava, or any MS Online, or first available
        setSelectedVoice(avaVoice?.name || msOnlineVoice?.name || enVoices[0].name);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [selectedVoice]);

  // When selectedWord changes, add to history (不自动展开)
  useEffect(() => {
    if (selectedWord && annotations.has(selectedWord)) {
      const annotation = annotations.get(selectedWord);
      if (annotation && (annotation as any).definition) {
        // 添加到历史记录，但不自动展开
        addToCardHistory('word', selectedWord);
      }
    }
  }, [selectedWord, annotations, addToCardHistory]);

  // Handle word click
  // Handle word click: toggle marked state
  const handleWordClick = (word: string, pIndex?: number, sIndex?: number, tokenIndex?: number) => {
    const normalized = word.toLowerCase();
    // If word has a card, just select it to show the card (for double-click on orange words)
    const hasCard = annotations.has(normalized) && (annotations.get(normalized) as any)?.definition;
    if (hasCard) {
      setSelectedWord(normalized);
      return;
    }

    // Check if this token is in any phrase marked range (purple takes priority)
    if (pIndex !== undefined && sIndex !== undefined && tokenIndex !== undefined) {
      // First check if this token is in any underline range
      const underlineRangeIndex = underlinePhraseRanges.findIndex(range =>
        range.pIndex === pIndex &&
        range.sIndex === sIndex &&
        tokenIndex >= range.startTokenIndex &&
        tokenIndex <= range.endTokenIndex
      );

      if (underlineRangeIndex !== -1) {
        // Remove the entire underline range and all phrase ranges within it
        const underlineRange = underlinePhraseRanges[underlineRangeIndex];
        setUnderlinePhraseRanges(prev => prev.filter((_, i) => i !== underlineRangeIndex));
        // Remove all phrase ranges that are within or overlap with this underline range
        setPhraseMarkedRanges(prev => prev.filter(phraseRange =>
          !(phraseRange.pIndex === underlineRange.pIndex &&
            phraseRange.sIndex === underlineRange.sIndex &&
            phraseRange.startTokenIndex >= underlineRange.startTokenIndex &&
            phraseRange.endTokenIndex <= underlineRange.endTokenIndex)
        ));
        return;
      }

      // Otherwise, check if it's in a phrase range (not connected by underline)
      const rangeIndex = phraseMarkedRanges.findIndex(range =>
        range.pIndex === pIndex &&
        range.sIndex === sIndex &&
        tokenIndex >= range.startTokenIndex &&
        tokenIndex <= range.endTokenIndex
      );

      if (rangeIndex !== -1) {
        // Remove entire range
        setPhraseMarkedRanges(prev => prev.filter((_, i) => i !== rangeIndex));
        return;
      }
    }

    // Then handle regular word marks (green)
    if (markedWords.has(normalized)) {
      // Remove mark
      setMarkedWords(prev => {
        const next = new Set(prev);
        next.delete(normalized);
        return next;
      });
    } else {
      // Add mark
      setMarkedWords(prev => new Set(prev).add(normalized));
      // useEffect 会自动触发标注
    }
  };

  // Handle text selection for phrase marking
  const handleTextSelection = (e: React.MouseEvent) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    const selectedText = selection.toString().trim();
    if (!selectedText) return;

    // Find a suitable parent container that's likely to contain all selected tokens
    // Start from the mouse event target and go up
    let parent = e.currentTarget as Element;

    const tokenPositions: Array<{ pIndex: number; sIndex: number; tokenIndex: number }> = [];
    const walker = document.createTreeWalker(
      parent,
      NodeFilter.SHOW_ELEMENT,
      {
        acceptNode: (node) => {
          const el = node as HTMLElement;
          if (el.hasAttribute('data-token-pos')) {
            const isContained = selection.containsNode(el, true);
            if (isContained) {
              return NodeFilter.FILTER_ACCEPT;
            }
          }
          return NodeFilter.FILTER_SKIP;
        }
      }
    );

    let node;
    while (node = walker.nextNode()) {
      const tokenPos = (node as HTMLElement).getAttribute('data-token-pos');
      if (tokenPos) {
        const match = tokenPos.match(/^p(\d+)-s(\d+)-t(\d+)$/);
        if (match) {
          tokenPositions.push({
            pIndex: parseInt(match[1]),
            sIndex: parseInt(match[2]),
            tokenIndex: parseInt(match[3])
          });
        }
      }
    }

    if (tokenPositions.length === 0) {
      selection.removeAllRanges();
      return;
    }

    // 防止双击触发紫色标记：只有选中多个token时才认为是真正的拖动选择
    if (tokenPositions.length === 1) {
      selection.removeAllRanges();
      return;
    }

    // Group by sentence to support cross-sentence selection
    const sentenceGroups = new Map<string, typeof tokenPositions>();
    tokenPositions.forEach(pos => {
      const key = `p${pos.pIndex}-s${pos.sIndex}`;
      if (!sentenceGroups.has(key)) {
        sentenceGroups.set(key, []);
      }
      sentenceGroups.get(key)!.push(pos);
    });

    // Create a range for each sentence group
    const newRanges = Array.from(sentenceGroups.entries()).map(([, positions]) => {
      const first = positions[0];
      const last = positions[positions.length - 1];
      return {
        pIndex: first.pIndex,
        sIndex: first.sIndex,
        startTokenIndex: first.tokenIndex,
        endTokenIndex: last.tokenIndex
      };
    });

// Handle Ctrl for underline phrases (connect with dashed line)
    if (e.ctrlKey || e.metaKey) {
      // If there are existing purple ranges, create underline from last purple to current selection
      if (phraseMarkedRanges.length > 0 && newRanges.length > 0) {
        const lastPurple = phraseMarkedRanges[phraseMarkedRanges.length - 1];
        const firstNew = newRanges[0];

        // Check if they're in the same sentence
        if (lastPurple.pIndex === firstNew.pIndex && lastPurple.sIndex === firstNew.sIndex) {
          const colors = ['red', 'orange', 'amber', 'emerald', 'cyan', 'blue', 'purple', 'pink'];
          const randomColor = colors[Math.floor(Math.random() * colors.length)];
          const underlineRange = {
            pIndex: lastPurple.pIndex,
            sIndex: lastPurple.sIndex,
            startTokenIndex: Math.min(lastPurple.startTokenIndex, firstNew.startTokenIndex),
            endTokenIndex: Math.max(lastPurple.endTokenIndex, firstNew.endTokenIndex),
            color: randomColor
          };
          setUnderlinePhraseRanges(prev => [...prev, underlineRange]);
        }
      }
      setPhraseMarkedRanges(prev => [...prev, ...newRanges]);
    } else {
      // Normal selection: just add purple marks without clearing
      setPhraseMarkedRanges(prev => [...prev, ...newRanges]);
    }

    selection.removeAllRanges();
  };

  // Handle annotate: generate IPA and Chinese for marked words
  const handleAnnotate = async (silent = false) => {
    if (!currentDocument || (markedWords.size === 0 && phraseMarkedRanges.length === 0)) {
      if (!silent) alert('Please mark some words or phrases first');
      return;
    }

    setIsLoadingAnnotation(true);

    // Collect words to annotate with their context
    const wordsToAnnotate: Array<{ word: string; sentence: string }> = [];
    const wordsSet = new Set(Array.from(markedWords).filter(word => !annotations.has(word)));
    
    // Find sentences containing marked words
    if (wordsSet.size > 0) {
      displayParagraphs.forEach((paragraph: ParagraphType) => {
        paragraph.sentences.forEach((sentence: Sentence) => {
          sentence.tokens.forEach((token: Token) => {
            if (token.type === 'word' && wordsSet.has(token.text.toLowerCase())) {
              wordsToAnnotate.push({
                word: token.text.toLowerCase(),
                sentence: sentence.text
              });
              wordsSet.delete(token.text.toLowerCase());
            }
          });
        });
      });
    }

    // Collect phrases to annotate
    const phrasesToAnnotate: Array<{ text: string; pIndex: number; sIndex: number }> = [];
    
    displayParagraphs.forEach((paragraph: ParagraphType, pIndex: number) => {
      paragraph.sentences.forEach((sentence: Sentence, sIndex: number) => {
        const rangesInThisSentence = phraseMarkedRanges.filter(
          range => range.pIndex === pIndex && range.sIndex === sIndex
        );

        rangesInThisSentence.forEach(range => {
          const phraseTokens = sentence.tokens.slice(range.startTokenIndex, range.endTokenIndex + 1);
          const phraseText = phraseTokens
            .map((t: Token) => t.text)
            .join('')
            .trim();

          if (phraseText) {
            phrasesToAnnotate.push({ text: phraseText, pIndex, sIndex });
          }
        });
      });
    });

    if (wordsToAnnotate.length === 0 && phrasesToAnnotate.length === 0) {
      if (!silent) alert('All marked words and phrases are already annotated');
      setIsLoadingAnnotation(false);
      return;
    }

    console.log(`Annotating ${wordsToAnnotate.length} words and ${phrasesToAnnotate.length} phrases...`);
    console.log('Phrases to annotate:', phrasesToAnnotate);
    let completed = 0;
    let failed = 0;
    const newAnnotations: WordAnnotation[] = [];
    const successfullyAnnotated: Array<{type: 'word' | 'phrase', word: string}> = [];

    // Annotate words
    for (const wordItem of wordsToAnnotate) {
      try {
        let annotationWithContext: WordAnnotation;
        
        // 根据标注模式选择标注方式
        if (annotationMode === 'local' || annotationMode === 'local-first') {
          // 尝试本地词典查询
          const localResult = await localDictionary.lookup(wordItem.word);
          
          if (localResult) {
            // 本地词典找到了
            console.log(`[Local Dict] Found "${wordItem.word}"`);
            annotationWithContext = {
              ...localResult,
              sentence: wordItem.sentence,
              documentTitle: currentDocument.title
            };
            console.log('[Local Dict] Annotation data:', annotationWithContext);
          } else if (annotationMode === 'local-first') {
            // 本地没找到，使用 AI
            console.log(`[Local Dict] Not found "${wordItem.word}", falling back to AI`);
            const result = await annotateWord(wordItem.word);
            if (!result.success || !result.data) {
              failed++;
              console.error(`Failed to annotate "${wordItem.word}":`, result.error);
              continue;
            }
            annotationWithContext = {
              ...result.data,
              sentence: wordItem.sentence,
              documentTitle: currentDocument.title
            };
          } else {
            // annotationMode === 'local' 且本地没找到，跳过
            failed++;
            console.warn(`[Local Dict] Word "${wordItem.word}" not in dictionary, skipping (local-only mode)`);
            continue;
          }
        } else {
          // annotationMode === 'ai'，直接使用 AI
          const result = await annotateWord(wordItem.word);
          if (!result.success || !result.data) {
            failed++;
            console.error(`Failed to annotate "${wordItem.word}":`, result.error);
            continue;
          }
          annotationWithContext = {
            ...result.data,
            sentence: wordItem.sentence,
            documentTitle: currentDocument.title
          };
        }
        
        // 保存标注
        addAnnotation(wordItem.word, annotationWithContext);
        await cacheAnnotation(wordItem.word, annotationWithContext);
        
        // 计算并保存默认 emoji
        const defaultEmoji = getWordEmoji(annotationWithContext);
        await updateEmoji(wordItem.word, defaultEmoji, (updates) => {
          updateAnnotation(wordItem.word, updates);
        });
        console.log(`[App] Saved default emoji for "${wordItem.word}": ${defaultEmoji}`);
        
        // 添加到历史记录（折叠状态）
        addToCardHistory('word', wordItem.word);
        
        newAnnotations.push(annotationWithContext);
        successfullyAnnotated.push({ type: 'word', word: wordItem.word });
        completed++;
        
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        failed++;
        console.error(`Failed to annotate "${wordItem.word}":`, error);
      }
    }

    // Annotate phrases
    for (const phrase of phrasesToAnnotate) {
      try {
        // Get the full sentence text for context
        const sentenceText = displayParagraphs[phrase.pIndex].sentences[phrase.sIndex].text;
        
        console.log(`Annotating phrase: "${phrase.text}" in sentence: "${sentenceText}"`);
        const result = await annotatePhrase(phrase.text, sentenceText, level);
        console.log('Phrase annotation result:', result);
        
        if (result.success && result.data) {
          const phraseData = {
            ...result.data,
            documentTitle: currentDocument.title  // 添加文章标题
          };
          
          // Save to state
          setPhraseAnnotations(prev => new Map(prev).set(phrase.text.toLowerCase(), phraseData));
          
          // Save to IndexedDB
          await cachePhraseAnnotation(phrase.text, phraseData);
          
          // Find the range for this phrase and mark as annotated
          const rangeIndex = phraseMarkedRanges.findIndex(r => 
            r.pIndex === phrase.pIndex && 
            r.sIndex === phrase.sIndex &&
            displayParagraphs[r.pIndex].sentences[r.sIndex].tokens
              .slice(r.startTokenIndex, r.endTokenIndex + 1)
              .map((t: Token) => t.text)
              .join('')
              .trim()
              .toLowerCase() === phrase.text.toLowerCase()
          );
          
          if (rangeIndex !== -1) {
            const range = phraseMarkedRanges[rangeIndex];
            setAnnotatedPhraseRanges(prev => [...prev, { ...range, phrase: phrase.text.toLowerCase() }]);
          }
          
          // 添加到历史记录，但不自动展开
          addToCardHistory('phrase', phrase.text);
          successfullyAnnotated.push({ type: 'phrase', word: phrase.text });
          completed++;
        } else {
          failed++;
          console.error(`Failed to annotate phrase "${phrase.text}":`, result.error);
        }
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        failed++;
        console.error(`Failed to annotate phrase "${phrase.text}":`, error);
      }
    }

    setIsLoadingAnnotation(false);
    
    // Clear the marked ranges after successful annotation
    if (completed > 0) {
      setPhraseMarkedRanges([]);
      
      // Update today's annotation count and word list
      const today = new Date().toDateString();
      setTodayAnnotations(prev => {
        if (prev.date === today) {
          return { 
            date: today, 
            count: prev.count + completed,
            words: [...prev.words, ...successfullyAnnotated]
          };
        } else {
          // New day, reset count and list
          return { 
            date: today, 
            count: completed,
            words: successfullyAnnotated
          };
        }
      });
    }
    
    // 只在非静默模式下显示提示
    if (!silent) {
      alert(`Annotation complete!\nWords: ${wordsToAnnotate.length}\nPhrases: ${phrasesToAnnotate.length}\nSuccess: ${completed}\nFailed: ${failed}`);
    }
  };

// Handle mark word as known (toggle learnt status)
  const handleMarkKnown = async (word: string) => {
    try {
      const normalized = word.toLowerCase();
      const isCurrentlyLearnt = learntWords.has(normalized);
      
      if (isCurrentlyLearnt) {
        // Remove from learntWords (unmark as known)
        removeLearntWord(normalized);
        await removeLearntWordFromDB(normalized);
        console.log(`Unmarked "${word}" as learnt`);
      } else {
        // Add to learntWords (mark as known)
        addLearntWord(normalized);
        await addLearntWordToDB(normalized);
        console.log(`Marked "${word}" as learnt`);
      }
    } catch (error) {
      console.error('Failed to toggle learnt status:', error);
    }
  };
  
  // Handle toggle phrase translation insert
  const handleTogglePhraseInsert = (phrase: string) => {
    const phraseLower = phrase.toLowerCase();
    setPhraseTranslationInserts(prev => {
      const newMap = new Map(prev);
      const currentState = newMap.get(phraseLower) || false;
      newMap.set(phraseLower, !currentState);
      return newMap;
    });
  };
  
  // Handle phrase click (double-click on annotated phrase to show card)
  const handlePhraseClick = (phrase: string) => {
    const phraseLower = phrase.toLowerCase();
    const annotation = phraseAnnotations.get(phraseLower);
    if (annotation) {
      // 添加到历史记录，但不自动展开
      addToCardHistory('phrase', phrase);
    }
  };
  
  // Handle context menu (right-click to add bookmark)
  const handleContextMenu = (e: React.MouseEvent, pIndex: number, sIndex: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, pIndex, sIndex });
  };
  
  // AI 重新生成解释
  const handleRegenerateAI = async (word: string, sentence: string, type: 'word' | 'phrase') => {
    try {
      console.log('[AI Regenerate]', type, ':', word, 'Sentence:', sentence);
      
      if (type === 'word') {
        const result = await annotateWord(word, sentence, currentDocument?.title || 'Unknown');
        if (result.success && result.data) {
          addAnnotation(word, result.data);
          await cacheAnnotation(word, result.data);
          console.log('[AI Regenerate] Success:', result.data);
          alert('✅ AI re-generated successfully!');
        } else {
          console.error('[AI Regenerate] Failed:', result.error);
          alert('❌ Failed to regenerate: ' + result.error);
        }
      } else {
        // Phrase
        const result = await annotatePhrase(word, sentence, currentDocument?.title || 'Unknown');
        if (result.success && result.data) {
          setPhraseAnnotations(prev => {
            const next = new Map(prev);
            next.set(word.toLowerCase(), result.data!);
            return next;
          });
          await cachePhraseAnnotation(word, {
            chinese: result.data.chinese,
            explanation: result.data.explanation,
            sentenceContext: result.data.sentenceContext,
            documentTitle: result.data.documentTitle,
          });
          console.log('[AI Regenerate] Success:', result.data);
          alert('✅ AI re-generated successfully!');
        } else {
          console.error('[AI Regenerate] Failed:', result.error);
          alert('❌ Failed to regenerate: ' + result.error);
        }
      }
    } catch (error) {
      console.error('[AI Regenerate] Error:', error);
      alert('❌ Error: ' + error);
    }
  };
  
  // Add bookmark at current position
  const handleAddBookmark = () => {
    if (!contextMenu || !currentDocument) return;
    
    addBookmark(
      currentDocument.id,
      currentDocument.type === 'epub' ? currentDocument.currentChapterId : undefined,
      contextMenu.pIndex,
      contextMenu.sIndex
    );
    
    setContextMenu(null);
    alert('📌 Bookmark added!');
  };
  
  // Jump to latest bookmark
  const handleJumpToBookmark = () => {
    if (!currentDocument) return;
    
    const bookmark = getLatestBookmark(currentDocument.id);
    if (!bookmark) {
      alert('No bookmark found for this document');
      return;
    }
    
    // If EPUB and different chapter, switch chapter first
    if (currentDocument.type === 'epub' && bookmark.chapterId && bookmark.chapterId !== currentDocument.currentChapterId) {
      setCurrentChapter(bookmark.chapterId);
    }
    
    // Scroll to the bookmarked paragraph
    setTimeout(() => {
      const element = document.querySelector(`[data-paragraph-index="${bookmark.paragraphIndex}"]`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        console.log('[Bookmark] Jumped to:', bookmark);
      }
    }, 100);
  };

  // Play (read aloud) from a specific paragraph
  const handlePlayFromParagraph = (startPIndex: number) => {
    if (!currentDocument) return;
    
    // Stop any ongoing speech
    window.speechSynthesis.cancel();
    
    // Get paragraphs to read
    const displayParagraphs = currentDocument.type === 'epub' && currentDocument.currentChapterId && currentDocument.chapters
      ? (currentDocument.chapters.find((c: Chapter) => c.id === currentDocument.currentChapterId)?.paragraphs || [])
      : (currentDocument.paragraphs || []);
    
    if (!displayParagraphs || startPIndex >= displayParagraphs.length) return;
    
    // Calculate the global sentence index from paragraph index
    let sentenceIndex = 0;
    for (let i = 0; i < startPIndex; i++) {
      sentenceIndex += displayParagraphs[i].sentences.length;
    }
    
    // Use the existing speakFromSentence function for consistent behavior
    speakFromSentence(sentenceIndex);
  };
  
  // Stop reading
  const handleStopReading = () => {
    handleStop();
  };

  // Handle delete from cards
  const handleDeleteFromCards = async (word: string) => {
    try {
      // Remove annotation from store
      removeAnnotation(word);

      // Remove from IndexedDB
      await deleteAnnotation(word);

      // Add to known words
      addKnownWord(word);
      await addKnownWordToDB(word);

      // Close the card and remove from history
      setExpandedCardKey(null);
      removeFromCardHistory(word);

      console.log(`Deleted "${word}" from cards and added to known words`);
    } catch (error) {
      console.error('Failed to delete from cards:', error);
    }
  };

  // Handle export known words (TXT format)
  const handleExportKnownWords = async () => {
    try {
      const allKnownWords = await getAllKnownWords();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const exportDate = new Date().toLocaleDateString('zh-CN');
      const filename = `lexiland-known-words-${timestamp}.txt`;

      // Sort words alphabetically
      const sortedWords = allKnownWords.sort((a, b) => a.localeCompare(b));

      // Create TXT content
      const txtContent = `Export Date: ${exportDate}
Known: ${sortedWords.length}

Known Words:
${sortedWords.join(' ')}
`;

      const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      console.log('Known words exported:', filename);
      alert(`Known words exported successfully!\n${sortedWords.length} words\nFilename: ${filename}`);
    } catch (error) {
      console.error('Export known words failed:', error);
      alert('Export failed, please try again');
    }
  };

  // Handle finish document - mark all unannotated words as known
  const handleFinishDocument = async () => {
    if (!currentDocument) return;

    try {
      // First, collect all words from the document
      const allWords = new Set<string>();
      displayParagraphs.forEach((paragraph: ParagraphType) => {
        paragraph.sentences.forEach((sentence: Sentence) => {
          sentence.tokens.forEach((token: Token) => {
            if (token.type === 'word' && token.text.length > 1) {
              allWords.add(token.text.toLowerCase());
            }
          });
        });
      });

      // Collect words that will be added (not already known and not annotated)
      const wordsToAdd: string[] = [];
      for (const word of allWords) {
        if (!knownWords.has(word) && !annotations.has(word)) {
          wordsToAdd.push(word);
        }
      }

      // Check if there's a next chapter BEFORE showing any confirmation
      let hasNextChapter = false;
      let nextChapter = null;
      
      if (currentDocument.type === 'epub' && currentDocument.chapters && currentDocument.currentChapterId) {
        console.log('[Finish] Document type: epub, checking chapters');
        console.log('[Finish] Current chapter ID:', currentDocument.currentChapterId);
        console.log('[Finish] Total chapters:', currentDocument.chapters.length);
        
        const currentChapterIndex = currentDocument.chapters.findIndex(
          (c: Chapter) => c.id === currentDocument.currentChapterId
        );
        console.log('[Finish] Current chapter index:', currentChapterIndex);
        
        if (currentChapterIndex !== -1 && currentChapterIndex < currentDocument.chapters.length - 1) {
          hasNextChapter = true;
          nextChapter = currentDocument.chapters[currentChapterIndex + 1];
          console.log('[Finish] Next chapter exists:', nextChapter.title);
        }
      }

      // If no words to add and has next chapter, go directly to next chapter
      if (wordsToAdd.length === 0 && hasNextChapter && nextChapter) {
        console.log('[Finish] No new words, moving to next chapter directly');
        setCurrentChapter(nextChapter.id);
        
        // Scroll to top - use ID selector
        setTimeout(() => {
          const scrollContainer = document.getElementById('main-scroll-container');
          if (scrollContainer) {
            console.log('[Finish] Scrolling to top (no words case)');
            scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
          }
        }, 200);
        return;
      }

      // If no words to add and no next chapter, just show message
      if (wordsToAdd.length === 0) {
        alert('All words in this chapter are already known!\n\n没有需要添加的新单词。');
        return;
      }

      const confirmed = confirm(
        `将添加 ${wordsToAdd.length} 个单词到 Known Words\n\n` +
        `Add ${wordsToAdd.length} words to known words?\n\n` +
        '确认完成本篇阅读？'
      );

      if (!confirmed) return;

      // Show processing message
      console.log(`[Finish] Batch adding ${wordsToAdd.length} words...`);

      // Batch add to IndexedDB (much faster!)
      await batchAddKnownWords(wordsToAdd);
      
      // Batch update Zustand store
      wordsToAdd.forEach(word => addKnownWord(word));

      // After adding words, check if we should go to next chapter
      if (hasNextChapter && nextChapter) {
        console.log('[Finish] Moving to next chapter:', nextChapter.title);
        
        setCurrentChapter(nextChapter.id);
        
        // Scroll to top - use ID selector
        setTimeout(() => {
          const scrollContainer = document.getElementById('main-scroll-container');
          if (scrollContainer) {
            console.log('[Finish] Scrolling to top');
            scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
          } else {
            console.warn('[Finish] Scroll container not found');
          }
        }, 300);
      } else {
        alert(`✓ 本篇学习完毕！\n\n已添加 ${wordsToAdd.length} 个新单词到 Known Words`);
      }
      
      console.log(`[Finish] Successfully added ${wordsToAdd.length} words to known words`);
    } catch (error) {
      console.error('Failed to finish document:', error);
      alert('Failed to finish document, please try again');
    }
  };

  // Handle export user data
  const handleExportData = async () => {
    try {
      const jsonData = await exportUserData();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `lexiland-userdata-${timestamp}.json`;

      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      console.log('User data exported:', filename);
      alert(`Data exported successfully!\nFilename: ${filename}`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed, please try again');
    }
  };

  // Handle export LLIF format
  const handleExportLLIF = async () => {
    try {
      const llifData = await exportLLIFString();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `lexiland-llif-${timestamp}.json`;

      const blob = new Blob([llifData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      console.log('LLIF data exported:', filename);
      alert(`LLIF data exported successfully!\nFilename: ${filename}\n\nThis format can be used across different language learning apps.`);
    } catch (error) {
      console.error('LLIF export failed:', error);
      alert('LLIF export failed, please try again');
    }
  };

  // Handle import user data
  const handleImportData = () => {
    importInputRef.current?.click();
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const result = await importUserData(text);

      // Reload data into state
      const [newKnownWords, newLearntWords, newAnnotations] = await Promise.all([
        getAllKnownWords(),
        getAllLearntWords(),
        getAllCachedAnnotations()
      ]);

      loadKnownWords(newKnownWords);
      loadLearntWords(newLearntWords);

      const annotationsMap = new Map();
      newAnnotations.forEach(a => {
        annotationsMap.set(a.word, {
          word: a.word,
          baseForm: a.baseForm,
          ipa: a.ipa,
          chinese: a.chinese,
          definition: a.definition,
          example: a.example,
          level: a.level,
          partOfSpeech: a.partOfSpeech,
        });
      });
      loadAnnotations(annotationsMap);

      let message = `Import completed!\nImported: ${result.imported} items\nSkipped (already exists): ${result.skipped} items`;
      if (result.errors.length > 0) {
        message += `\n\nErrors: ${result.errors.length}\n${result.errors.slice(0, 5).join('\n')}`;
        if (result.errors.length > 5) {
          message += `\n... and ${result.errors.length - 5} more errors`;
        }
      }
      alert(message);

      console.log('Import result:', result);
    } catch (error: any) {
      console.error('Failed to import user data:', error);
      alert(`Import failed: ${error.message}`);
    } finally {
      // Reset file input
      e.target.value = '';
    }
  };

  // Handle batch annotate all unknown words (currently unused, kept for future use)
  // const handleBatchAnnotate = async () => {
  //   if (!currentDocument) return;

  //   const unknownWords = new Set<string>();

  //   // Collect all unknown words from document
  //   displayParagraphs.forEach(paragraph => {
  //     paragraph.sentences.forEach(sentence => {
  //       sentence.tokens.forEach(token => {
  //         if (token.type === 'word' && token.text.length > 1) {
  //           const normalized = token.text.toLowerCase();
  //           if (!knownWords.has(normalized) && !learntWords.has(normalized)) {
  //             unknownWords.add(token.text);
  //           }
  //         }
  //       });
  //     });
  //   });

  //   const totalWords = unknownWords.size;
  //   console.log(`Starting batch annotation for ${totalWords} words...`);

  //   let completed = 0;
  //   let failed = 0;

  //   for (const word of unknownWords) {
  //     try {
  //       await handleWordClick(word);
  //       completed++;
  //       console.log(`Progress: ${completed}/${totalWords}`);
  //       // Small delay to avoid rate limiting
  //       await new Promise(resolve => setTimeout(resolve, 200));
  //     } catch (error) {
  //       failed++;
  //       console.error(`Failed to annotate "${word}":`, error);
  //     }
  //   }

  //   alert(`Batch annotation complete!\\nSuccess: ${completed}\\nFailed: ${failed}`);
  // };

  // Load known words on mount
  useEffect(() => {
    const initKnownWords = async () => {
      try {
        // Load basic known words first (fast)
        const basicWords = ['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'to', 'of', 'in', 'for', 'on', 'with', 'and', 'or', 'but', 'not', 'at', 'by', 'from', 'as', 'if', 'this', 'that', 'it', 'they', 'we', 'you', 'he', 'she', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'can', 'could', 'should', 'may', 'might', 'must'];
        loadKnownWords(basicWords);
        console.log('Loaded basic known words');

        // Then try to load from IndexedDB in background
        setTimeout(async () => {
          try {
            const cachedWords = await getAllKnownWords();
            if (cachedWords.length > 0) {
              console.log(`Loaded ${cachedWords.length} known words from IndexedDB`);
              loadKnownWords(cachedWords);
            } else {
              // If empty, load from JSON file
              const words = await loadKnownWordsFromFile('/known-words-3000.json');
              console.log(`Loaded ${words.length} known words from file`);
              loadKnownWords(words);
            }
          } catch (error) {
            console.error('Failed to load extended known words:', error);
          }
        }, 100);
      } catch (error) {
        console.error('Failed to initialize:', error);
      }
    };

    initKnownWords();

    // Load cached annotations
    const loadCachedAnnotations = async () => {
      try {
        const cached = await getAllCachedAnnotations();
        console.log(`Loading ${cached.length} cached annotations from IndexedDB`);
        cached.forEach(item => {
          const annotation: WordAnnotation = {
            word: item.word,
            baseForm: item.baseForm,
            ipa: item.ipa,
            chinese: item.chinese,
            definition: item.definition,
            example: item.example,
            level: item.level,
            partOfSpeech: item.partOfSpeech,
            // 加载emoji相关字段
            emoji: item.emoji,
            emojiImagePath: item.emojiImagePath,
            emojiModel: item.emojiModel,
            // 加载上下文字段
            sentence: item.sentence,
            documentTitle: item.documentTitle,
          };
          addAnnotation(item.word, annotation);
        });
        if (cached.length > 0) {
          console.log('[OK] Cached annotations loaded');
        }
      } catch (error) {
        console.error('Failed to load cached annotations:', error);
      }
    };

    // Load learnt words
    const loadLearntWordsFromDB = async () => {
      try {
        const learnt = await getAllLearntWords();
        learnt.forEach(word => addLearntWord(word));
        if (learnt.length > 0) {
          console.log(`[OK] Loaded ${learnt.length} learnt words from IndexedDB`);
        }
      } catch (error) {
        console.error('Failed to load learnt words:', error);
      }
    };

    loadCachedAnnotations();
    loadLearntWordsFromDB();
    
    // Load cached phrase annotations
    const loadCachedPhraseAnnotations = async () => {
      try {
        const cached = await getAllCachedPhraseAnnotations();
        console.log(`Loading ${cached.length} cached phrase annotations from IndexedDB`);
        const phraseMap = new Map<string, PhraseAnnotation>();
        cached.forEach(item => {
          phraseMap.set(item.phrase, {
            phrase: item.phrase,
            chinese: item.chinese,
            explanation: item.explanation,
            sentenceContext: item.sentenceContext,
            documentTitle: item.documentTitle,  // 加载文章标题
          });
        });
        setPhraseAnnotations(phraseMap);
        if (cached.length > 0) {
          console.log('[OK] Cached phrase annotations loaded');
        }
      } catch (error) {
        console.error('Failed to load cached phrase annotations:', error);
      }
    };
    
    loadCachedPhraseAnnotations();
  }, [loadKnownWords]);

  const handleLoadSample = () => {
    const sampleText = `Three serving girls huddled together in the cold, whispering about the mysterious stranger who had arrived at dawn.

The old manor house stood silent on the hill, its windows dark and unwelcoming. Nobody had lived there for decades, yet smoke curled from one chimney.

"Perhaps we should investigate," suggested the youngest girl, her curiosity overcoming her fear. But the others shook their heads vigorously.`;

    const paragraphs = tokenizeParagraphs(sampleText);

    addDocument({
      id: 'sample-document',  // Fixed ID for sample
      type: 'text',
      title: 'Sample Document',
      content: sampleText,
      paragraphs,
      createdAt: Date.now(),
    });
  };

  const handleNewDocument = () => {
    setNewDocTitle('Untitled Document');
    setNewDocContent('');
    setShowNewDocModal(true);
  };

  const handleCreateDocument = () => {
    if (!newDocTitle.trim()) {
      alert('Please enter a document title');
      return;
    }

    const paragraphs = newDocContent.trim() ? tokenizeParagraphs(newDocContent) : [];
    
    // Use title as consistent ID
    const documentId = `custom-${newDocTitle.trim().replace(/\s+/g, '-').toLowerCase()}`;

    addDocument({
      id: documentId,
      type: 'text',
      title: newDocTitle.trim(),
      content: newDocContent.trim(),
      paragraphs,
      createdAt: Date.now(),
    });

    setShowNewDocModal(false);
    setNewDocTitle('');
    setNewDocContent('');
  };

  const handleFileImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's an EPUB file
    if (file.name.toLowerCase().endsWith('.epub')) {
      try {
        console.log('[App] Loading EPUB file:', file.name);
        const { parseEpubFile } = await import('./utils/epubParser');
        const { title, author, chapters } = await parseEpubFile(file);
        
        // Use filename as consistent ID (remove .epub extension)
        const documentId = `epub-${file.name.replace(/\.epub$/i, '')}`;
        
        addDocument({
          id: documentId,
          type: 'epub',
          title,
          author,
          chapters,
          currentChapterId: chapters[0]?.id,  // Default to first chapter
          createdAt: Date.now(),
        });
        
        console.log(`[App] EPUB loaded: ${title} with ${chapters.length} chapters`);
      } catch (error) {
        console.error('[App] Failed to load EPUB:', error);
        alert(`Failed to load EPUB file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      // Handle text file
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        const paragraphs = tokenizeParagraphs(content);
        
        // Use filename as consistent ID (remove extension)
        const documentId = `txt-${file.name.replace(/\.[^/.]+$/, '')}`;

        addDocument({
          id: documentId,
          type: 'text',
          title: file.name.replace(/\.[^/.]+$/, ''),
          content,
          paragraphs,
          createdAt: Date.now(),
        });
      };
      reader.readAsText(file);
    }
  };

  const handleParagraphAction = () => {
    console.log('Paragraph action clicked');
    // TODO: Show paragraph card
  };

  // Speech synthesis handlers
  const handlePlayPause = () => {
    if (!currentDocument) return;

    if (isSpeaking) {
      // Stop current playback
      console.log('[TTS] Stopping current playback...');
      shouldStopRef.current = true;
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      // Don't clear currentSentenceIndex so next play starts from here
    } else {
      // Start/Resume playing from current position or beginning
      console.log('[TTS] Starting playback from:', currentSentenceIndex);
      const startIndex = currentSentenceIndex ?? 0;
      speakFromSentence(startIndex);
    }
  };

  const handleStop = () => {
      console.log('[TTS] Stopping and resetting...');
      shouldStopRef.current = true;
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setCurrentSentenceIndex(null);
      setCurrentWordIndex(-1);
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current = null;
      }
    };

    const handlePrevSentence = () => {
      if (currentSentenceIndex !== null && currentSentenceIndex > 0) {
        console.log('[TTS] Going to previous sentence');
        shouldStopRef.current = true;
        window.speechSynthesis.cancel();
        setTimeout(() => {
          shouldStopRef.current = false;
          speakFromSentence(currentSentenceIndex - 1);
        }, 50);
      }
    };

    const handleNextSentence = () => {
      if (currentSentenceIndex !== null) {
        console.log('[TTS] Going to next sentence');
        shouldStopRef.current = true;
        window.speechSynthesis.cancel();
        setTimeout(() => {
          shouldStopRef.current = false;
          speakFromSentence(currentSentenceIndex + 1);
        }, 50);
      }
    };

  const speakFromSentence = (startIndex: number) => {
    if (!currentDocument) return;

    // Reset stop flag when starting new speech
    shouldStopRef.current = false;

    const allSentences: { paragraphIndex: number; sentenceIndex: number; text: string }[] = [];
    displayParagraphs.forEach((para: ParagraphType, pIdx: number) => {
      para.sentences.forEach((sent: Sentence, sIdx: number) => {
        allSentences.push({
          paragraphIndex: pIdx,
          sentenceIndex: sIdx,
          text: sent.text
        });
      });
    });

    if (startIndex >= allSentences.length) {
      handleStop();
      return;
    }

    const sentence = allSentences[startIndex];
    const utterance = new SpeechSynthesisUtterance(sentence.text);

    // Configure speech
    utterance.rate = speechRate;
    utterance.pitch = speechPitch;
    utterance.volume = 1.0;
    utterance.lang = 'en-US';

    // Set voice if selected
    if (selectedVoice) {
      const voice = availableVoices.find(v => v.name === selectedVoice);
      if (voice) {
        utterance.voice = voice;
      }
    }

    utterance.onstart = () => {
      console.log('[TTS] Started speaking sentence:', startIndex);
      setIsSpeaking(true);
      setCurrentSentenceIndex(startIndex);
      setCurrentWordIndex(0);
      
      // Note: Auto-show cards logic moved to onboundary to show cards as each word is read
    };

    // Track word-level progress
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const charIndex = event.charIndex;
        console.log('[TTS] Word boundary at charIndex:', charIndex, 'in sentence:', sentence.text);

        // Find which word index corresponds to this character position
        const sentenceData = displayParagraphs
          .flatMap((p: ParagraphType) => p.sentences)[startIndex];
        if (sentenceData && sentenceData.tokens) {
          // Extract only word tokens
          const wordTokens = sentenceData.tokens.filter((t: Token) => t.type === 'word');

          // Find the word that contains this character index
          for (let i = 0; i < wordTokens.length; i++) {
            const token = wordTokens[i];
            // startIndex and endIndex are relative to the sentence
            const tokenStart = token.startIndex - sentenceData.startIndex;
            const tokenEnd = token.endIndex - sentenceData.startIndex;

            if (charIndex >= tokenStart && charIndex < tokenEnd) {
              console.log('[TTS] Setting currentWordIndex to:', i, 'word:', token.text, 'tokenStart:', tokenStart, 'tokenEnd:', tokenEnd);
              setCurrentWordIndex(i);
              
              // Auto-show card for this word if enabled
              if (autoShowCardOnPlay) {
                const word = token.text.toLowerCase();
                
                // Check for word annotations (but skip if marked as known/learnt)
                if (annotations.has(word)) {
                  // Only show if not marked as known/learnt
                  if (!learntWords.has(word)) {
                    addToCardHistory('word', word);
                  }
                }
                
                // Check for phrase annotations starting with this word
                // Check phrases of length 2-5 words starting from current position
                for (let len = 2; len <= Math.min(5, wordTokens.length - i); len++) {
                  const phraseTokens = wordTokens.slice(i, i + len);
                  const phraseText = phraseTokens.map((t: Token) => t.text).join(' ').trim();
                  if (phraseAnnotations.has(phraseText.toLowerCase())) {
                    addToCardHistory('phrase', phraseText);
                    break; // Only show the first matching phrase
                  }
                }
              }
              
              break;
            }
          }
        }
      }
    };

    utterance.onend = () => {
      console.log('[TTS] onend triggered, shouldStop:', shouldStopRef.current);

      // Check stop flag first (most reliable)
      if (shouldStopRef.current) {
        console.log('[TTS] Stopped by user');
        return;
      }

      // Move to next sentence
      const nextIndex = startIndex + 1;
      if (nextIndex < allSentences.length) {
        speakFromSentence(nextIndex);
      } else {
        handleStop();
      }
    };

    utterance.onerror = (error) => {
      console.error('Speech synthesis error:', error);
      handleStop();
    };

    speechSynthesisRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const getCollapsedFilteredEmojis = () => {
    if (!collapsedEmojiSearchQuery.trim()) return collapsedCommonEmojis;
    const query = collapsedEmojiSearchQuery.toLowerCase().trim();
    const results: string[] = [];
    for (const [keyword, emoji] of keywordToEmoji.entries()) {
      if (keyword.includes(query) && !results.includes(emoji)) {
        results.push(emoji);
      }
    }
    return results.slice(0, 120);
  };

  const openCollapsedWebMenu = (e: React.MouseEvent, word: string) => {
    e.preventDefault();
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const panelWidth = 336;
    const panelHeight = 320;
    const gap = 8;
    const padding = 12;
    let left = rect.right + gap;
    if (left + panelWidth > window.innerWidth - padding) {
      left = rect.left - panelWidth - gap;
    }
    left = Math.max(padding, Math.min(left, window.innerWidth - panelWidth - padding));
    let top = rect.top;
    top = Math.max(padding, Math.min(top, window.innerHeight - panelHeight - padding));
    setCollapsedGoogleKeyword(`${word} photo`);
    setCollapsedImageMenu({ panel: 'web', word, top, left });
  };

  const handleCollapsedSelectEmoji = async (emoji: string) => {
    if (!collapsedImageMenu?.word) return;
    await updateEmoji(collapsedImageMenu.word, emoji, (updates) => {
      updateAnnotation(collapsedImageMenu.word, updates);
    });
    setCollapsedUnsplashLockedWords(prev => {
      const next = new Set(prev);
      next.delete(collapsedImageMenu.word.toLowerCase());
      return next;
    });
    setCollapsedImageMenu(null);
  };

  const openCollapsedWebImage = () => {
    if (!collapsedImageMenu) return;
    setCollapsedImageMenu({ ...collapsedImageMenu, panel: 'web' });
  };

  const blobToDataUrl = (blob: Blob): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result;
        if (typeof result === 'string') resolve(result);
        else reject(new Error('Failed to convert blob to data URL'));
      };
      reader.onerror = () => reject(reader.error || new Error('FileReader failed'));
      reader.readAsDataURL(blob);
    });

  const handleCollapsedOpenGoogleImages = () => {
    const q = (collapsedGoogleKeyword.trim() || `${collapsedImageMenu?.word || ''} photo`);
    const url = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(q)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const saveCollapsedClipboardBlob = async (blob: Blob) => {
    if (!collapsedImageMenu?.word) return;
    const dataUrl = await blobToDataUrl(blob);
    const result = await savePastedImage(collapsedImageMenu.word, dataUrl);
    if (!result.success || !result.data?.imageUrl) {
      throw new Error(result.error || 'Failed to save pasted image');
    }
    await addEmojiImagePath(collapsedImageMenu.word, result.data.imageUrl, 'web-clipboard', (updates) => {
      updateAnnotation(collapsedImageMenu.word, updates);
    });
    setCollapsedUnsplashLockedWords(prev => {
      const next = new Set(prev);
      next.delete(collapsedImageMenu.word.toLowerCase());
      return next;
    });
    setCollapsedImageMenu(null);
  };

  const handleCollapsedUnsplashRightClick = async (
    e: React.MouseEvent,
    word: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const normalized = word.toLowerCase();
    if (collapsedUnsplashLockedWords.has(normalized)) {
      return;
    }
    try {
      const result = await searchImage(word);
      if (result.success && result.data?.imageUrl) {
        await addEmojiImagePath(word, result.data.imageUrl, undefined, (updates) => {
          updateAnnotation(word, updates);
        });
        setCollapsedUnsplashLockedWords(prev => {
          const next = new Set(prev);
          next.add(normalized);
          return next;
        });
      } else {
        alert(result.error || 'No image found for this word');
      }
    } catch (error) {
      console.error('[Collapsed Unsplash Right Click] Error:', error);
      alert('Failed to search image');
    }
  };

  const handleCollapsedPasteFromClipboard = async () => {
    if (collapsedClipboardSaving) return;
    setCollapsedClipboardSaving(true);
    try {
      if (!navigator.clipboard || !navigator.clipboard.read) {
        throw new Error('Clipboard image read is not supported in this browser.');
      }
      const items = await navigator.clipboard.read();
      let imageBlob: Blob | null = null;
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          imageBlob = await item.getType(imageType);
          break;
        }
      }
      if (!imageBlob) {
        throw new Error('No image found in clipboard. Copy an image first.');
      }
      await saveCollapsedClipboardBlob(imageBlob);
      alert('Pasted image saved successfully.');
    } catch (error: any) {
      alert(error?.message || 'Failed to save pasted image');
    } finally {
      setCollapsedClipboardSaving(false);
    }
  };

  const handleCollapsedPasteEvent = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items || items.length === 0 || collapsedClipboardSaving) return;
    const imageItem = Array.from(items).find((item) => item.type.startsWith('image/'));
    if (!imageItem) return;
    e.preventDefault();
    e.stopPropagation();
    setCollapsedClipboardSaving(true);
    try {
      const blob = imageItem.getAsFile();
      if (!blob) throw new Error('Failed to read pasted image data');
      await saveCollapsedClipboardBlob(blob);
      alert('Pasted image saved successfully.');
    } catch (error: any) {
      alert(error?.message || 'Failed to save pasted image');
    } finally {
      setCollapsedClipboardSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.epub"
        onChange={handleFileChange}
        className="hidden"
      />
      <input
        ref={importInputRef}
        type="file"
        accept=".json"
        onChange={handleImportFileChange}
        className="hidden"
      />

      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-border px-4 py-2.5 flex items-center gap-3 flex-wrap">
        {/* Hamburger Menu Button - Notion Style */}
        <button
          onClick={() => setIsOutlineCollapsed(!isOutlineCollapsed)}
          className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded transition-colors"
          title={isOutlineCollapsed ? 'Show outline' : 'Hide outline'}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <div className="text-sm font-semibold">Lexiland</div>

        <button
          className="px-2 py-1 border border-border rounded-lg hover:bg-hover text-xs"
          title="Previous sentence"
          onClick={handlePrevSentence}
          disabled={!currentDocument || currentSentenceIndex === null || currentSentenceIndex === 0}
        >
          &lt;
        </button>
        <button
          className={`px-2 py-1 border rounded-lg text-xs ${
            isSpeaking
              ? 'border-active bg-active hover:bg-indigo-100'
              : 'border-border hover:bg-hover'
          }`}
          title="Play"
          onClick={handlePlayPause}
          disabled={!currentDocument}
        >
          {isSpeaking ? 'Pause' : 'Play'}
        </button>
        <button
          className="px-2 py-1 border border-border rounded-lg hover:bg-hover text-xs"
          title="Next sentence"
          onClick={handleNextSentence}
          disabled={!currentDocument || currentSentenceIndex === null}
        >
          &gt;
        </button>
        <button
          className="px-2 py-1 border border-border rounded-lg hover:bg-hover text-xs"
          title="Stop"
          onClick={handleStop}
          disabled={!isSpeaking}
        >
          Stop
        </button>

        {/* Speed control */}
        <div className="relative">
          <button
            className="px-2 py-1 border border-border rounded-lg hover:bg-hover text-xs"
            title="Speed"
            onClick={() => setShowSpeedControl(!showSpeedControl)}
          >
            {speechRate.toFixed(1)}x
          </button>
          {showSpeedControl && (
            <div className="absolute top-full mt-2 p-3 bg-white border border-border rounded-lg shadow-lg z-10 min-w-[200px]">
              <label className="block text-sm mb-2">Speed: {speechRate.toFixed(1)}x</label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={speechRate}
                onChange={(e) => setSpeechRate(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* Annotate Button with Auto Mode Toggle */}
        <div className="flex items-center gap-2">
          {/* Auto-annotate toggle (dot indicator) */}
          <button
            onClick={() => setAutoAnnotate(!autoAnnotate)}
            className="w-6 h-6 flex items-center justify-center rounded-full border-2 border-indigo-500 hover:bg-indigo-50 transition-colors"
            title={autoAnnotate ? "Auto-annotate: ON" : "Auto-annotate: OFF"}
          >
            <div className={`w-2 h-2 rounded-full transition-all ${autoAnnotate ? 'bg-indigo-500' : 'bg-gray-300'}`} />
          </button>
          
          {/* Annotate Button */}
          <button
            onClick={() => handleAnnotate(false)}
            disabled={markedWords.size === 0 && phraseMarkedRanges.length === 0}
            className="px-3 py-1 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-xs font-semibold"
          >
            Annotate ({markedWords.size + phraseMarkedRanges.length})
          </button>
          
          {/* Statistics */}
          <div className="flex items-center gap-3 text-xs text-muted">
            <button
              onClick={() => {
                console.log('[Today] Clicked. Count:', todayAnnotations.count, 'Words:', todayAnnotations.words);
                if (todayAnnotations.count > 0 && todayAnnotations.words.length > 0) {
                  // Add today's words to card history
                  todayAnnotations.words.forEach(item => {
                    console.log('[Today] Adding to history:', item.type, item.word);
                    addToCardHistory(item.type, item.word);
                  });
                } else if (todayAnnotations.count > 0 && todayAnnotations.words.length === 0) {
                  alert('Today\'s word list is empty. This might be from an old version. New annotations will be tracked.');
                } else {
                  alert('No annotations today yet!');
                }
              }}
              className="hover:bg-indigo-50 px-1 py-0.5 rounded cursor-pointer transition-colors"
              title="Click to show today's cards"
            >
              Today: <span className="font-semibold text-indigo-600">{todayAnnotations.count}</span>
            </button>
            <span>Known: <span className="font-semibold text-green-600">{knownWords.size}</span></span>
          </div>
        </div>

        <div className="flex-1"></div>

        {/* Bookmark Button */}
        {currentDocument && (
          <button
            onClick={handleJumpToBookmark}
            className="px-2 py-1 border border-border rounded-lg hover:bg-hover text-xs"
            title="Jump to latest bookmark"
            disabled={!getLatestBookmark(currentDocument.id)}
          >
            🔖
          </button>
        )}

        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(true)}
          className="px-2 py-1 border border-border rounded-lg hover:bg-hover text-xs"
          title="Settings"
        >
          ⚙️
        </button>
      </div>

      {/* Main Layout: Three Columns */}
      <div className="flex-1 flex gap-3 p-3 min-h-0">
        {/* Left Panel: Outline - Notion Style Sidebar */}
        {!isOutlineCollapsed && (
          <aside 
            className="w-[260px] border border-border rounded-2xl overflow-hidden bg-white flex flex-col min-h-0 transition-all duration-300 ease-in-out"
            style={{ minWidth: '260px' }}
            onMouseEnter={() => setIsOutlineHovered(true)}
            onMouseLeave={() => setIsOutlineHovered(false)}
          >
            <div className="px-3 py-3 border-b border-border bg-panel font-bold flex items-center justify-between">
              <span>Outline</span>
              {/* Collapse button - only visible on hover */}
              <button
                onClick={() => setIsOutlineCollapsed(true)}
                className={`w-6 h-6 flex items-center justify-center hover:bg-gray-200 rounded transition-all flex-shrink-0 ${
                  isOutlineHovered ? 'opacity-100' : 'opacity-0'
                }`}
                title="Hide outline"
              >
                <span className="text-gray-600 text-sm font-bold">‹</span>
              </button>
            </div>
            <div className="flex-1 p-3 overflow-auto">
              {/* 如果当前文档是 EPUB，显示章节列表 */}
              {currentDocument?.type === 'epub' && currentDocument.chapters ? (
                <>
                  {/* EPUB 书籍标题 */}
                  <div className="px-3 py-2 mb-2 font-bold text-lg border-b border-border">
                    📖 {currentDocument.title}
                  </div>
                  {currentDocument.author && (
                    <div className="px-3 py-1 mb-3 text-xs text-muted">
                      by {currentDocument.author}
                    </div>
                  )}
                  
                  {/* 章节列表 */}
                  <div className="text-xs text-muted mb-2 px-3">Chapters ({currentDocument.chapters.length})</div>
                  {currentDocument.chapters.map((chapter: Chapter, idx: number) => {
                    // Check if this chapter contains the bookmark
                    const currentBookmark = getLatestBookmark(currentDocument.id);
                    const hasBookmark = currentBookmark && 
                      currentBookmark.chapterId === chapter.id;
                    
                    return (
                      <div
                        key={chapter.id}
                        onClick={() => setCurrentChapter(chapter.id)}
                        className={`px-3 py-2 rounded-lg cursor-pointer flex items-start gap-2 ${
                          chapter.id === currentDocument.currentChapterId
                            ? 'bg-active font-semibold'
                            : 'hover:bg-hover'
                        }`}
                      >
                        <span className="text-muted min-w-[24px]">{idx + 1}.</span>
                        <span className="flex-1">{chapter.title}</span>
                        {hasBookmark && <span className="text-sm">🔖</span>}
                      </div>
                    );
                  })}
                  
                  {/* 返回文档列表按钮 */}
                  <div className="mt-4 pt-3 border-t border-border">
                    <button
                      onClick={() => setCurrentDocument('')}
                      className="w-full px-3 py-2 rounded-lg hover:bg-hover text-sm flex items-center gap-2"
                    >
                      ← Back to Documents
                    </button>
                  </div>
                </>
              ) : (
                /* 否则显示文档列表 */
                <>
                  {documents.map((doc: Document) => (
                    <div
                      key={doc.id}
                      onClick={() => setCurrentDocument(doc.id)}
                      className={`px-3 py-2 rounded-lg ${doc.id === currentDocumentId ? 'bg-active font-bold' : 'hover:bg-hover'} flex items-center justify-between cursor-pointer`}
                    >
                      <span className="flex items-center gap-2">
                        {doc.type === 'epub' ? '📖' : '📄'}
                        {doc.title}
                      </span>
                      {doc.type === 'epub' && doc.chapters && (
                        <span className="text-xs text-muted">{doc.chapters.length} ch</span>
                      )}
                    </div>
                  ))}

                  <div className="text-xs text-muted mt-3 mb-1">Documents</div>
                  <div
                    className="px-3 py-2 rounded-lg hover:bg-hover flex items-center justify-between cursor-pointer text-sm"
                    onClick={handleNewDocument}
                  >
                    <span>+ New document</span>
                  </div>
                  <div
                    className="px-3 py-2 rounded-lg hover:bg-hover flex items-center justify-between cursor-pointer text-sm"
                    onClick={handleFileImport}
                  >
                    <span>Import file</span>
                  </div>
                </>
              )}
            </div>
          </aside>
        )}

        {/* Center Panel: Reader */}
        <main className="flex-1 border border-border rounded-2xl overflow-hidden bg-white flex flex-col min-h-0">
          <div id="main-scroll-container" className="flex-1 p-3 overflow-auto" onMouseUp={handleTextSelection}>
            {currentDocument ? (
              <>
                <div className="text-2xl font-extrabold mb-2 flex items-center justify-between">
                  {/* Previous chapter button */}
                  {currentDocument.type === 'epub' && currentDocument.chapters && currentDocument.currentChapterId && (() => {
                    const currentChapterIndex = currentDocument.chapters.findIndex(
                      (c: Chapter) => c.id === currentDocument.currentChapterId
                    );
                    const hasPrevChapter = currentChapterIndex > 0;
                    return (
                      <button
                        onClick={() => {
                          if (hasPrevChapter && currentDocument.chapters) {
                            const prevChapter = currentDocument.chapters[currentChapterIndex - 1];
                            setCurrentChapter(prevChapter.id);
                            setTimeout(() => {
                              const scrollContainer = document.getElementById('main-scroll-container');
                              if (scrollContainer) {
                                scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
                              }
                            }, 200);
                          }
                        }}
                        disabled={!hasPrevChapter}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg ${
                          hasPrevChapter 
                            ? 'hover:bg-gray-100 cursor-pointer' 
                            : 'opacity-30 cursor-not-allowed'
                        }`}
                        title="Previous chapter"
                      >
                        &lt;
                      </button>
                    );
                  })()}
                  
                  {/* Chapter title */}
                  <div className="flex-1 text-center">
                    {currentDocument.type === 'epub' && currentChapter
                      ? currentChapter.title
                      : currentDocument.title}
                  </div>
                  
                  {/* Next chapter button */}
                  {currentDocument.type === 'epub' && currentDocument.chapters && currentDocument.currentChapterId && (() => {
                    const currentChapterIndex = currentDocument.chapters.findIndex(
                      (c: Chapter) => c.id === currentDocument.currentChapterId
                    );
                    const hasNextChapter = currentChapterIndex !== -1 && currentChapterIndex < currentDocument.chapters.length - 1;
                    return (
                      <button
                        onClick={() => {
                          if (hasNextChapter && currentDocument.chapters) {
                            const nextChapter = currentDocument.chapters[currentChapterIndex + 1];
                            setCurrentChapter(nextChapter.id);
                            setTimeout(() => {
                              const scrollContainer = document.getElementById('main-scroll-container');
                              if (scrollContainer) {
                                scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
                              }
                            }, 200);
                          }
                        }}
                        disabled={!hasNextChapter}
                        className={`w-8 h-8 flex items-center justify-center rounded-lg ${
                          hasNextChapter 
                            ? 'hover:bg-gray-100 cursor-pointer' 
                            : 'opacity-30 cursor-not-allowed'
                        }`}
                        title="Next chapter"
                      >
                        &gt;
                      </button>
                    );
                  })()}
                </div>
                <div className="text-xs text-muted mb-4 leading-relaxed">
                  {currentDocument.type === 'epub' && currentChapter ? (
                    <>
                      📖 {currentDocument.title}
                      {currentDocument.author && <> by {currentDocument.author}</>}
                      <span className="mx-2">•</span>
                      {displayParagraphs.length} paragraphs
                    </>
                  ) : (
                    <>{displayParagraphs.length} paragraphs</>
                  )}
                </div>

                {displayParagraphs.map((paragraph: ParagraphType, pIdx: number) => {
                  // Calculate global sentence indices for this paragraph
                  let sentencesBeforeThisPara = 0;
                  for (let i = 0; i < pIdx; i++) {
                    sentencesBeforeThisPara += displayParagraphs[i].sentences.length;
                  }

                  // Check if this paragraph has a bookmark
                  const currentBookmark = currentDocument ? getLatestBookmark(currentDocument.id) : null;
                  const hasBookmark = currentBookmark && 
                    currentBookmark.paragraphIndex === pIdx &&
                    // For EPUB, also check chapter matches
                    (!currentDocument.currentChapterId || currentBookmark.chapterId === currentDocument.currentChapterId);

                  return (
                    <div
                      key={paragraph.id}
                      data-paragraph-index={pIdx}
                      onContextMenu={(e) => handleContextMenu(e, pIdx, 0)}
                      className="relative group transition-all hover:bg-gray-100"
                    >
                      {/* Bookmark indicator */}
                      {hasBookmark && (
                        <div className="absolute left-[-24px] top-0 text-lg">
                          🔖
                        </div>
                      )}
                      
                      <Paragraph
                        paragraph={paragraph}
                        paragraphIndex={pIdx}
                        knownWords={knownWords}
                        markedWords={markedWords}
                        phraseMarkedRanges={phraseMarkedRanges}
                        annotatedPhraseRanges={annotatedPhraseRanges}
                        underlinePhraseRanges={underlinePhraseRanges}
                      learntWords={learntWords}
                      annotations={annotations}
                      phraseAnnotations={phraseAnnotations}
                      phraseTranslationInserts={phraseTranslationInserts}
                      showIPA={showIPA}
                      showChinese={showChinese}
                      autoMark={autoMark}
                      autoPronounceSetting={autoPronounceSetting}
                      onWordClick={handleWordClick}
                      onPhraseClick={handlePhraseClick}
                      onMarkKnown={handleMarkKnown}
                      onParagraphAction={handleParagraphAction}
                      currentSentenceIndex={currentSentenceIndex}
                      currentWordIndex={currentWordIndex}
                      sentencesBeforeThisPara={sentencesBeforeThisPara}
                    />
                    </div>
                  );
                })}
                
                {/* Finish Button at the bottom of document */}
                {currentDocument && (() => {
                  // Check if there's a next chapter
                  let hasNextChapter = false;
                  if (currentDocument.type === 'epub' && currentDocument.chapters && currentDocument.currentChapterId) {
                    const currentChapterIndex = currentDocument.chapters.findIndex(
                      (c: Chapter) => c.id === currentDocument.currentChapterId
                    );
                    if (currentChapterIndex !== -1 && currentChapterIndex < currentDocument.chapters.length - 1) {
                      hasNextChapter = true;
                    }
                  }
                  
                  return (
                    <div className="mt-6 pb-6 flex justify-center">
                      <button
                        onClick={handleFinishDocument}
                        className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 font-semibold shadow-md"
                        title="Mark all unannotated words as known"
                      >
                        {hasNextChapter ? '✓ Finish → Next Chapter' : '✓ Finish Reading'}
                      </button>
                    </div>
                  );
                })()}
              </>
            ) : (
              <>
                <div className="text-2xl font-extrabold mb-2">Welcome to LexiLand Read</div>
                <div className="text-xs text-muted mb-4 leading-relaxed">
                  A language learning assistant powered by AI.
                </div>
                <div className="text-sm text-muted">
                  Click "Load sample" or "Import file" to start reading.
                </div>
              </>
            )}
          </div>
        </main>

        {/* Right Panel: Cards */}
        <aside className="w-[360px] flex flex-col min-h-0 overflow-auto" style={{ minWidth: '360px' }}>
          {isLoadingAnnotation && (
            <div className="text-center py-8 text-muted">
              <div className="text-2xl mb-2">...</div>
              <div>Loading annotation...</div>
            </div>
          )}

          {/* Card History - 始终显示所有历史卡片 */}
          {!isLoadingAnnotation && (
            <div className="border border-border rounded-2xl p-3 bg-white mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-xs text-muted">Cards ({cardHistory.length})</div>
                {cardHistory.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (hiddenTranslations.size === 0) {
                          // Hide all translations
                          const allWords = cardHistory.map(item => `${item.type}-${item.word}`);
                          setHiddenTranslations(new Set(allWords));
                        } else {
                          // Show all translations
                          setHiddenTranslations(new Set());
                        }
                      }}
                      className="text-xs px-2 py-0.5 text-blue-600 hover:bg-blue-50 rounded border border-blue-300"
                      title={hiddenTranslations.size === 0 ? "Hide all translations for self-testing" : "Show all translations"}
                    >
                      👁️ {hiddenTranslations.size === 0 ? 'Hide' : 'Show'}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Clear all cards from history?')) {
                          // Clear all cards
                          cardHistory.forEach(item => removeFromCardHistory(item.word));
                          setHiddenTranslations(new Set());
                        }
                      }}
                      className="text-xs px-2 py-0.5 text-red-600 hover:bg-red-50 rounded border border-red-300"
                      title="Clear all cards"
                    >
                      🗑️ Clear
                    </button>
                  </div>
                )}
              </div>
              <div className="h-px bg-border my-2"></div>
              
              {cardHistory.length === 0 ? (
                <div className="text-sm text-muted leading-relaxed">
                  Double-click an orange word to see its card, or select a phrase and click Annotate.
                </div>
              ) : (
                <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
                  {cardHistory.map((item: { type: 'word' | 'phrase'; word: string; timestamp: number }) => {
                    const annotation = item.type === 'word' 
                      ? annotations.get(item.word)
                      : phraseAnnotations.get(item.word.toLowerCase());
                    
                    if (!annotation) return null;
                    
                    const cardKey = `${item.type}-${item.word}`;
                    const isExpanded = expandedCardKey === cardKey;
                    
                    return (
                      <div
                        key={`${item.type}-${item.word}-${item.timestamp}`}
                        className={`border-2 rounded-lg relative ${
                          isExpanded ? 'border-blue-500' : 'border-border'
                        }`}
                      >
                        {/* Delete button - 只在折叠状态显示 */}
                        {!isExpanded && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeFromCardHistory(item.word);
                            }}
                            className="absolute top-2 right-2 z-10 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                            title="Remove from history"
                          >
                            ×
                          </button>
                        )}
                        
                        {/* 展开状态：显示完整卡片 */}
                        {isExpanded ? (
                          <div className="p-0">
                            {item.type === 'word' ? (
                              <WordCard
                                annotation={annotation as WordAnnotation}
                                isLearnt={learntWords.has(item.word.toLowerCase())}
                                onClose={() => setExpandedCardKey(null)}
                                onMarkKnown={handleMarkKnown}
                                onDelete={handleDeleteFromCards}
                                onRegenerateAI={(word, sentence) => handleRegenerateAI(word, sentence, 'word')}
                              />
                            ) : (
                              <PhraseCard
                                annotation={annotation as PhraseAnnotation}
                                isInserted={phraseTranslationInserts.get(item.word.toLowerCase()) || false}
                                onClose={() => setExpandedCardKey(null)}
                                onToggleInsert={handleTogglePhraseInsert}
                                onRegenerateAI={(phrase, sentence) => handleRegenerateAI(phrase, sentence, 'phrase')}
                                onDelete={async (phrase) => {
                                  setPhraseAnnotations(prev => {
                                    const next = new Map(prev);
                                    next.delete(phrase.toLowerCase());
                                    return next;
                                  });
                                  setExpandedCardKey(null);
                                  
                                  setAnnotatedPhraseRanges(prev => 
                                    prev.filter(r => r.phrase !== phrase.toLowerCase())
                                  );
                                  
                                  await deletePhraseAnnotation(phrase);
                                  removeFromCardHistory(phrase);
                                }}
                              />
                            )}
                          </div>
                        ) : (
                          /* 折叠状态：显示简要信息 */
                          <div
                            className="p-2 hover:bg-gray-50 cursor-pointer pr-8"
                            onClick={() => {
                              setExpandedCardKey(cardKey);
                            }}
                          >
                            {item.type === 'word' ? (
                              /* 单词卡：使用上一版布局（flex-wrap，min-w-0）*/
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* Emoji/Image - 支持左键/右键/长按功能（仅对单词）*/}
                                <div 
                                  className="w-10 h-10 flex-shrink-0 flex items-center justify-center text-2xl bg-gray-100 rounded hover:ring-2 hover:ring-blue-300 transition-all"
                                  onClick={(e) => {
                                    openCollapsedWebMenu(e, item.word);
                                  }}
                                  onContextMenu={(e) => {
                                    void handleCollapsedUnsplashRightClick(e, item.word);
                                  }}
                                  onMouseDown={(e) => {
                                    if (e.button !== 0) return;
                                    // 长按检测
                                    const timer = window.setTimeout(async () => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      // 长按：AI生成图片
                                      try {
                                        const sentence = (annotation as WordAnnotation).sentence || '';
                                        const result = await generateEmojiImage(item.word, sentence);
                                        if (result.success && result.data?.imageUrl) {
                                          await addEmojiImagePath(item.word, result.data.imageUrl, result.data.model, (updates) => {
                                            updateAnnotation(item.word, updates);
                                          });
                                          console.log('[AI Image] Generated:', item.word, result.data.imageUrl);
                                        } else {
                                          console.error('[AI Image] Failed:', result.error);
                                          alert('Failed to generate AI image');
                                        }
                                      } catch (error) {
                                        console.error('[AI Image] Error:', error);
                                      }
                                    }, 800);
                                    
                                    const clearTimer = () => {
                                      clearTimeout(timer);
                                      document.removeEventListener('mouseup', clearTimer);
                                    };
                                    document.addEventListener('mouseup', clearTimer);
                                  }}
                                >
                                  {(annotation as WordAnnotation).emojiImagePath?.[0] ? (
                                    <img 
                                      src={(annotation as WordAnnotation).emojiImagePath![0]} 
                                      alt="emoji" 
                                      className="w-full h-full object-cover rounded"
                                    />
                                  ) : (annotation as WordAnnotation).emoji ? (
                                    <span>{(annotation as WordAnnotation).emoji}</span>
                                  ) : (
                                    <span>{getWordEmoji(annotation as WordAnnotation)}</span>
                                  )}
                                </div>
                                
                                {/* 英文 */}
                                <span className="font-bold text-sm flex-shrink-0">
                                  {item.word}
                                </span>
                                
                                {/* 音标（可点击发音）*/}
                                {(annotation as WordAnnotation).ipa && (
                                  <span
                                    className="text-xs text-blue-600 cursor-pointer hover:underline flex-shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const utterance = new SpeechSynthesisUtterance(item.word);
                                      utterance.lang = 'en-US';
                                      utterance.rate = 0.9;
                                      window.speechSynthesis.speak(utterance);
                                    }}
                                  >
                                    /{(annotation as WordAnnotation).ipa}/
                                  </span>
                                )}
                                
                                {/* 中文 */}
                                <span 
                                  className={`text-sm flex-1 min-w-0 break-words cursor-pointer select-none ${
                                    hiddenTranslations.has(cardKey) ? 'text-muted bg-muted' : 'text-muted'
                                  }`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setHiddenTranslations(prev => {
                                      const next = new Set(prev);
                                      if (next.has(cardKey)) {
                                        next.delete(cardKey);
                                      } else {
                                        next.add(cardKey);
                                      }
                                      return next;
                                    });
                                  }}
                                  title={hiddenTranslations.has(cardKey) ? "Click to show translation" : "Click to hide translation"}
                                >
                                  {hiddenTranslations.has(cardKey) ? '••••••' : (annotation as WordAnnotation).chinese}
                                </span>
                                
                                {/* AI 按钮 */}
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    const sentence = (annotation as WordAnnotation).sentence;
                                    await handleRegenerateAI(item.word, sentence || '', 'word');
                                  }}
                                  className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded border border-purple-200 flex-shrink-0"
                                  title="Re-generate with AI"
                                >
                                  🤖
                                </button>
                              </div>
                            ) : (
                              /* 短语卡：使用上上版布局（英文一行，中文一行）*/
                              <div className="flex flex-col gap-1">
                                {/* 第一行：图标、英文 */}
                                <div className="flex items-center gap-2">
                                  <span className="text-2xl flex-shrink-0">📖</span>
                                  <span className="font-bold text-sm flex-1">{item.word}</span>
                                </div>
                                
                                {/* 第二行：中文 + AI 按钮 */}
                                <div className="flex items-center gap-2">
                                  <span 
                                    className={`text-sm flex-1 cursor-pointer select-none ${
                                      hiddenTranslations.has(cardKey) ? 'text-muted bg-muted' : 'text-muted'
                                    }`}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setHiddenTranslations(prev => {
                                        const next = new Set(prev);
                                        if (next.has(cardKey)) {
                                          next.delete(cardKey);
                                        } else {
                                          next.add(cardKey);
                                        }
                                        return next;
                                      });
                                    }}
                                    title={hiddenTranslations.has(cardKey) ? "Click to show translation" : "Click to hide translation"}
                                  >
                                    {hiddenTranslations.has(cardKey) ? '••••••' : (annotation as PhraseAnnotation).chinese}
                                  </span>
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      const sentence = (annotation as PhraseAnnotation).sentenceContext;
                                      await handleRegenerateAI(item.word, sentence || '', 'phrase');
                                    }}
                                    className="text-xs px-1.5 py-0.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded border border-purple-200 flex-shrink-0"
                                    title="Re-generate with AI"
                                  >
                                    🤖
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {/* New Document Modal */}
      {showNewDocModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[600px] max-h-[80vh] flex flex-col shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Create New Document</h2>

            <label className="text-sm font-semibold mb-2 block">Title</label>
            <input
              type="text"
              value={newDocTitle}
              onChange={(e) => setNewDocTitle(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter document title..."
              autoFocus
            />

            <label className="text-sm font-semibold mb-2 block">Content</label>
            <textarea
              value={newDocContent}
              onChange={(e) => setNewDocContent(e.target.value)}
              className="border border-border rounded-lg px-3 py-2 flex-1 min-h-[300px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="Paste or type your text here...&#10;&#10;You can use multiple paragraphs.&#10;Press Enter to create new lines."
            />

            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => {
                  setShowNewDocModal(false);
                  setNewDocTitle('');
                  setNewDocContent('');
                }}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDocument}
                className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-[600px] max-h-[80vh] overflow-auto shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Settings</h2>

            {/* Speech Settings */}
            <div className="mb-6 p-4 border border-border rounded-lg">
              <h3 className="text-sm font-bold mb-3">Speech Settings</h3>
              
              {/* Pitch control */}
              <div className="mb-4">
                <label className="block text-sm mb-2">Pitch: {speechPitch.toFixed(1)}</label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={speechPitch}
                  onChange={(e) => setSpeechPitch(parseFloat(e.target.value))}
                  className="w-full"
                />
              </div>
              
              {/* Voice selector */}
              <div className="mb-4">
                <label className="block text-sm mb-2">Voice</label>
                <select
                  className="w-full px-3 py-2 border border-border rounded-lg bg-white text-sm"
                  value={selectedVoice}
                  onChange={(e) => setSelectedVoice(e.target.value)}
                >
                  {availableVoices.map((voice) => (
                    <option key={voice.name} value={voice.name}>
                      {voice.name}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Auto Pronounce Setting */}
              <label className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPronounceSetting}
                  onChange={(e) => setAutoPronounceSetting(e.target.checked)}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-semibold text-sm">Auto Pronounce Words</div>
                  <div className="text-xs text-muted">Automatically read aloud when hovering over a word for 1 second or when clicking it</div>
                </div>
              </label>
              
              {/* Auto Show Card on Play */}
              <label className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoShowCardOnPlay}
                  onChange={(e) => setAutoShowCardOnPlay(e.target.checked)}
                  className="w-4 h-4"
                />
                <div>
                  <div className="font-semibold text-sm">Auto Show Cards During Playback</div>
                  <div className="text-xs text-muted">Show word/phrase cards in the right panel when reading words with annotations (excludes words marked as known)</div>
                </div>
              </label>
            </div>

            {/* Display Settings */}
            <div className="mb-6 p-4 border border-border rounded-lg">
              <h3 className="text-sm font-bold mb-3">Display Settings</h3>
              
              <div className="space-y-3">
                <label className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={showIPA} 
                    onChange={(e) => setShowIPA(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-semibold text-sm">Show IPA</div>
                    <div className="text-xs text-muted">Display phonetic transcription for words</div>
                  </div>
                </label>
                
                <label className="flex items-center gap-3 p-3 border border-border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={showChinese} 
                    onChange={(e) => setShowChinese(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <div>
                    <div className="font-semibold text-sm">Show Chinese Translation</div>
                    <div className="text-xs text-muted">Display Chinese translations inline</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Reading Level */}
            <div className="mb-6 p-4 border border-border rounded-lg">
              <h3 className="text-sm font-bold mb-3">Reading Level</h3>
              <label className="block text-sm mb-2 text-muted">Words below this level will be automatically marked as known</label>
              <select
                className="w-full px-3 py-2 border border-border rounded-lg bg-white text-sm"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
              >
                <option value="A2">A2 - Elementary</option>
                <option value="B1">B1 - Intermediate</option>
                <option value="B2">B2 - Upper Intermediate</option>
                <option value="C1">C1 - Advanced</option>
              </select>
            </div>

            {/* Annotation Mode Setting */}
            <div className="mb-6 p-4 border border-border rounded-lg">
              <h3 className="text-sm font-bold mb-3">Word Annotation Mode</h3>
              <div className="text-xs text-muted mb-3">
                Choose how words are annotated. (Phrases always use AI)
              </div>
              
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 border border-border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="annotationMode"
                    value="local-first"
                    checked={annotationMode === 'local-first'}
                    onChange={(e) => setAnnotationMode(e.target.value as 'ai' | 'local' | 'local-first')}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-semibold text-sm">Local Dictionary First (Recommended)</div>
                    <div className="text-xs text-muted">Try local dictionary first, fallback to AI if not found. Fast and cost-effective.</div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border border-border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="annotationMode"
                    value="ai"
                    checked={annotationMode === 'ai'}
                    onChange={(e) => setAnnotationMode(e.target.value as 'ai' | 'local' | 'local-first')}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-semibold text-sm">AI Only</div>
                    <div className="text-xs text-muted">Always use AI for word annotation. Slower but provides context-aware definitions.</div>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 border border-border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="annotationMode"
                    value="local"
                    checked={annotationMode === 'local'}
                    onChange={(e) => setAnnotationMode(e.target.value as 'ai' | 'local' | 'local-first')}
                    className="mt-0.5"
                  />
                  <div>
                    <div className="font-semibold text-sm">Local Dictionary Only</div>
                    <div className="text-xs text-muted">Only use local dictionary. Very fast, free, but limited vocabulary (core ~5000 words).</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Dictionary Info */}
            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-sm font-semibold text-blue-900 mb-1">Local Dictionary Status</div>
              <div className="text-xs text-blue-700">
                {localDictionary.getStats().isLoaded 
                  ? `✓ Loaded: ${localDictionary.getStats().totalWords} words` 
                  : '⚠ Not loaded yet'}
              </div>
            </div>
            
            {/* Data Management */}
            <div className="mb-6 p-4 border border-border rounded-lg">
              <h3 className="text-sm font-bold mb-3">Data Management</h3>
              
              <div className="space-y-2">
                <button
                  onClick={handleLoadSample}
                  className="w-full px-4 py-2 border border-border rounded-lg hover:bg-hover text-sm"
                >
                  📖 Load Sample Text
                </button>
                
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!showExportMenu) {
                        handleExportData();
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowExportMenu(!showExportMenu);
                    }}
                    className="w-full px-4 py-2 border border-green-500 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-semibold"
                    title="Export user data (right-click for options)"
                  >
                    📤 Export Data
                  </button>
                  
                  {/* Export Context Menu */}
                  {showExportMenu && (
                    <div 
                      className="absolute top-full left-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-20 min-w-full"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          handleExportData();
                          setShowExportMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-t-lg"
                      >
                        Export All Data (JSON)
                      </button>
                      <button
                        onClick={() => {
                          handleExportLLIF();
                          setShowExportMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                      >
                        Export LLIF (Universal)
                      </button>
                      <button
                        onClick={() => {
                          handleExportKnownWords();
                          setShowExportMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 rounded-b-lg"
                      >
                        Export Known Words (TXT)
                      </button>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={handleImportData}
                  className="w-full px-4 py-2 border border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-sm font-semibold"
                  title="Import user data from JSON file"
                >
                  📥 Import Data
                </button>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowSettings(false)}
                className="px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Collapsed Card Emoji Tools (right-click) */}
      {collapsedImageMenu && (
        <>
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setCollapsedImageMenu(null)}
          />
          <div
            className="fixed z-[9999] bg-white border-2 border-gray-300 rounded-lg shadow-2xl p-3 w-[21rem] max-h-96 overflow-hidden flex flex-col"
            style={{ top: collapsedImageMenu.top, left: collapsedImageMenu.left }}
            onClick={(e) => e.stopPropagation()}
            onPaste={collapsedImageMenu.panel === 'web' ? handleCollapsedPasteEvent : undefined}
          >
            {collapsedImageMenu.panel === 'emoji' ? (
              <>
                <div className="text-xs text-gray-600 mb-2 font-semibold">Select an emoji:</div>
                <input
                  type="text"
                  value={collapsedEmojiSearchQuery}
                  onChange={(e) => setCollapsedEmojiSearchQuery(e.target.value)}
                  placeholder="Search emoji (e.g., hand, smile)..."
                  className="w-full px-3 py-2 mb-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <div className="overflow-y-auto max-h-56 mb-2">
                  <div className="grid grid-cols-10 gap-1">
                    {getCollapsedFilteredEmojis().map((emoji, index) => (
                      <button
                        key={`${emoji}-${index}`}
                        onClick={() => handleCollapsedSelectEmoji(emoji)}
                        className="text-2xl hover:bg-gray-100 rounded p-1 transition-colors"
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={openCollapsedWebImage}
                  className="w-full py-1 mb-2 text-sm bg-blue-100 text-blue-700 hover:bg-blue-200 rounded"
                >
                  🌐 Web Image Helper
                </button>
                <button
                  onClick={() => setCollapsedImageMenu(null)}
                  className="w-full py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
                >
                  Close
                </button>
              </>
            ) : (
              <>
                <div className="text-xs text-gray-700 mb-2 font-semibold">Web Image Helper</div>
                <div className="text-xs text-gray-500 mb-2 leading-relaxed">
                  1) Open Google Images with keyword
                  <br />
                  2) Copy an image
                  <br />
                  3) Click "Paste from Clipboard" or press Ctrl/Cmd+V directly
                </div>
                <input
                  type="text"
                  value={collapsedGoogleKeyword}
                  onChange={(e) => setCollapsedGoogleKeyword(e.target.value)}
                  onPaste={handleCollapsedPasteEvent}
                  className="w-full px-3 py-2 mb-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Search keyword"
                />
                <button
                  onClick={handleCollapsedOpenGoogleImages}
                  className="w-full py-1 mb-2 text-sm bg-blue-600 text-white hover:bg-blue-700 rounded"
                >
                  🔎 Open Google Images
                </button>
                <button
                  onClick={handleCollapsedPasteFromClipboard}
                  disabled={collapsedClipboardSaving}
                  className={`w-full py-1 mb-2 text-sm rounded ${
                    collapsedClipboardSaving
                      ? 'bg-gray-200 text-gray-500 cursor-wait'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {collapsedClipboardSaving ? 'Saving...' : '📋 Paste from Clipboard'}
                </button>
                <button
                  onClick={() => setCollapsedImageMenu((prev) => prev ? { ...prev, panel: 'emoji' } : prev)}
                  className="w-full py-1 mb-2 text-sm bg-purple-100 text-purple-700 hover:bg-purple-200 rounded"
                >
                  😀 Back to Emoji Picker
                </button>
                <button
                  onClick={() => setCollapsedImageMenu(null)}
                  className="w-full py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded"
                >
                  Close
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Context Menu - 右键菜单 */}
      {contextMenu && (
        <>
          {/* 遮罩层 */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu(null)}
          />
          
          {/* 菜单 */}
          <div
            className="fixed z-50 bg-white border-2 border-gray-300 rounded-lg shadow-2xl py-1 min-w-[160px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <button
              onClick={handleAddBookmark}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              🔖 Add Bookmark
            </button>
            <button
              onClick={() => {
                handlePlayFromParagraph(contextMenu.pIndex);
                setContextMenu(null);
              }}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              ▶️ Play from here
            </button>
            {isSpeaking && (
              <button
                onClick={() => {
                  handleStopReading();
                  setContextMenu(null);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2 text-red-600"
              >
                ⏹️ Stop reading
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default App

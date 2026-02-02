import { useEffect, useRef, useState } from 'react'
import './App.css'
import { useAppStore } from './store/appStore'
import { tokenizeParagraphs } from './utils'
import Paragraph from './components/Paragraph'
import WordCard from './components/WordCard'
import { loadKnownWordsFromFile, getAllKnownWords, addKnownWord as addKnownWordToDB, cacheAnnotation, getCachedAnnotation, getAllCachedAnnotations, addLearntWordToDB, removeLearntWordFromDB, getAllLearntWords, deleteAnnotation, exportUserData, importUserData } from './db'
import { annotateWord, type WordAnnotation } from './api'

function App() {
  const {
    documents,
    currentDocumentId,
    knownWords,
    learntWords,
    annotations,
    selectedWord,
    showIPA,
    showChinese,
    level,
    autoMark,
    autoMarkUnknown,
    genCard,
    addDocument,
    setCurrentDocument,
    setSelectedWord,
    addAnnotation,
    addKnownWord,
    addLearntWord,
    removeLearntWord,
    removeAnnotation,
    setShowIPA,
    setShowChinese,
    setLevel,
    setAutoMark,
    setAutoMarkUnknown,
    setGenCard,
    loadKnownWords,
    loadLearntWords,
    loadAnnotations,
  } = useAppStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const [showNewDocModal, setShowNewDocModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  
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
  const [showPitchControl, setShowPitchControl] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentAnnotation, setCurrentAnnotation] = useState<WordAnnotation | null>(null);
  const [isLoadingAnnotation, setIsLoadingAnnotation] = useState(false);
  const [markedWords, setMarkedWords] = useState<Set<string>>(new Set());

  
  const currentDocument = documents.find(doc => doc.id === currentDocumentId);

  // Auto-mark unknown words when document loads or toggle changes
  useEffect(() => {
    if (!currentDocument || !autoMarkUnknown) {
      if (!autoMarkUnknown) setMarkedWords(new Set());
      return;
    }

    const unknownWords = new Set<string>();
    currentDocument.paragraphs.forEach(paragraph => {
      paragraph.sentences.forEach(sentence => {
        sentence.tokens.forEach(token => {
          if (token.type === 'word' && token.text.length > 1) {
            const normalized = token.text.toLowerCase();
            if (!knownWords.has(normalized)) {
              unknownWords.add(normalized);
            }
          }
        });
      });
    });

    setMarkedWords(unknownWords);
  }, [currentDocument, autoMarkUnknown, knownWords]);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      const enVoices = voices.filter(v => v.lang.startsWith('en'));
      setAvailableVoices(enVoices);
      if (enVoices.length > 0 && !selectedVoice) {
        setSelectedVoice(enVoices[0].name);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, [selectedVoice]);

  // Handle word click
  // Handle word click: toggle marked state
  const handleWordClick = (word: string) => {
    const normalized = word.toLowerCase();
    
    // Don't allow marking words that already have cards (in learntWords)
    if (learntWords.has(normalized)) {
      return;
    }

    if (markedWords.has(normalized)) {
      // Remove mark
      setMarkedWords(prev => {
  };
        

  // Handle annotate: generate IPA and Chinese for marked words
  const handleAnnotate = async () => {
    if (!currentDocument || markedWords.size === 0) {
      alert('Please mark some words first (click words to mark them)');
      return;
    }

    const wordsToAnnotate = Array.from(markedWords).filter(
      word => !annotations.has(word)
    );

    if (wordsToAnnotate.length === 0) {
      alert('All marked words are already annotated');
      return;
    }

    console.log(`Annotating ${wordsToAnnotate.length} words...`);
    let completed = 0;
    let failed = 0;
    const newAnnotations: WordAnnotation[] = [];

    for (const word of wordsToAnnotate) {
      try {
        const annotation = await annotateWord(word);
        addAnnotation(word, annotation);
        await cacheAnnotation(word, annotation);
        newAnnotations.push(annotation);
        completed++;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        failed++;
        console.error(`Failed to annotate "${word}":`, error);
      }
    }

    alert(`Annotation complete!\nSuccess: ${completed}\nFailed: ${failed}`);
    
    // If genCard is true, open card for the first annotated word
    if (genCard && newAnnotations.length > 0) {
      setCurrentAnnotation(newAnnotations[0]);
    }
  };


// Handle mark word as known (mark as learnt)
  const handleMarkKnown = async (word: string) => {
    try {
      // Add to learntWords (keeps annotation but changes display)
      addLearntWord(word);

      // Save to IndexedDB
      await addLearntWordToDB(word);
      console.log(`Marked "${word}" as learnt`);
    } catch (error) {
      console.error('Failed to mark word as learnt:', error);
    }
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
      
      // Close the card
      setCurrentAnnotation(null);
      
      console.log(`Deleted "${word}" from cards and added to known words`);
    } catch (error) {
      console.error('Failed to delete from cards:', error);
    }
  };

  // Handle mark all unmarked words as known
  const handleMarkAllUnmarkedAsKnown = async () => {
    if (!currentDocument) return;
    
    // Collect all words that are not in knownWords, learntWords, or annotations
    const allWords = new Set<string>();
    currentDocument.paragraphs.forEach(p => {
      p.sentences.forEach(s => {
        s.tokens.forEach(t => {
          if (t.text.length > 1) {
            allWords.add(t.text.toLowerCase());
          }
        });
      });
    });
    
    const unmarkedWords = Array.from(allWords).filter(
      word => !knownWords.has(word) && !learntWords.has(word) && !annotations.has(word)
    );
    
    if (unmarkedWords.length === 0) {
      alert('No unmarked words found!');
      return;
    }
    
    if (!confirm(`Add ${unmarkedWords.length} unmarked words to known words?`)) {
      return;
    }
    
    try {
      for (const word of unmarkedWords) {
        addKnownWord(word);
        await addKnownWordToDB(word);
      }
      alert(`Successfully added ${unmarkedWords.length} words to known words!`);
    } catch (error) {
      console.error('Failed to mark words as known:', error);
      alert('Operation failed, please try again');
    }
  };

  // Handle export user data
  const handleExportData = async () => {
    try {
      const jsonData = await exportUserData();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `lexiland-userdata-${timestamp}.json`;
      
      // Try to use File System Access API if available
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [{
              description: 'JSON Files',
              accept: { 'application/json': ['.json'] }
            }]
          });
          const writable = await handle.createWritable();
          await writable.write(jsonData);
          await writable.close();
          console.log('User data exported successfully:', filename);
          return;
        } catch (err: any) {
          if (err.name === 'AbortError') {
            return; // User cancelled
          }
          throw err;
        }
      }
      
      // Fallback to download method
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      console.log('User data exported successfully:', filename);
    } catch (error) {
      console.error('Failed to export user data:', error);
      alert('Export failed, please try again');
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
          ipa: a.ipa,
          chinese: a.chinese
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

  // Handle batch annotate all unknown words
  const handleBatchAnnotate = async () => {
    if (!currentDocument) return;

    const unknownWords = new Set<string>();
    
    // Collect all unknown words from document
    currentDocument.paragraphs.forEach(paragraph => {
      paragraph.sentences.forEach(sentence => {
        sentence.tokens.forEach(token => {
          if (token.type === 'word' && token.text.length > 1) {
            const normalized = token.text.toLowerCase();
            if (!knownWords.has(normalized) && !learntWords.has(normalized)) {
              unknownWords.add(token.text);
            }
          }
        });
      });
    });

    const totalWords = unknownWords.size;
    console.log(`Starting batch annotation for ${totalWords} words...`);
    
    let completed = 0;
    let failed = 0;

    for (const word of unknownWords) {
      try {
        await handleWordClick(word);
        completed++;
        console.log(`Progress: ${completed}/${totalWords}`);
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        failed++;
        console.error(`Failed to annotate "${word}":`, error);
      }
    }

    alert(`批量注释完成！\\n成功: ${completed}\\n失败: ${failed}`);
  };

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
          };
          addAnnotation(item.word, annotation);
        });
        if (cached.length > 0) {
          console.log('✅ Cached annotations loaded');
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
          console.log(`✅ Loaded ${learnt.length} learnt words from IndexedDB`);
        }
      } catch (error) {
        console.error('Failed to load learnt words:', error);
      }
    };

    loadCachedAnnotations();
    loadLearntWordsFromDB();
  }, [loadKnownWords]);

  const handleLoadSample = () => {
    const sampleText = `Three serving girls huddled together in the cold, whispering about the mysterious stranger who had arrived at dawn.

The old manor house stood silent on the hill, its windows dark and unwelcoming. Nobody had lived there for decades, yet smoke curled from one chimney.

"Perhaps we should investigate," suggested the youngest girl, her curiosity overcoming her fear. But the others shook their heads vigorously.`;

    const paragraphs = tokenizeParagraphs(sampleText);
    
    addDocument({
      id: `doc-${Date.now()}`,
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

    addDocument({
      id: `doc-${Date.now()}`,
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const paragraphs = tokenizeParagraphs(content);
      
      addDocument({
        id: `doc-${Date.now()}`,
        title: file.name.replace(/\.[^/.]+$/, ''),
        content,
        paragraphs,
        createdAt: Date.now(),
      });
    };
    reader.readAsText(file);
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
      setIsPaused(false);
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
      setIsPaused(false);
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
    currentDocument.paragraphs.forEach((para, pIdx) => {
      para.sentences.forEach((sent, sIdx) => {
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
    };

    // Track word-level progress
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const charIndex = event.charIndex;
        console.log('[TTS] Word boundary at charIndex:', charIndex, 'in sentence:', sentence.text);
        
        // Find which word index corresponds to this character position
        const sentenceData = currentDocument.paragraphs
          .flatMap(p => p.sentences)[startIndex];
        if (sentenceData && sentenceData.tokens) {
          // Extract only word tokens
          const wordTokens = sentenceData.tokens.filter(t => t.type === 'word');
          
          // Find the word that contains this character index
          for (let i = 0; i < wordTokens.length; i++) {
            const token = wordTokens[i];
            // startIndex and endIndex are relative to the sentence
            const tokenStart = token.startIndex - sentenceData.startIndex;
            const tokenEnd = token.endIndex - sentenceData.startIndex;
            
            if (charIndex >= tokenStart && charIndex < tokenEnd) {
              console.log('[TTS] Setting currentWordIndex to:', i, 'word:', token.text, 'tokenStart:', tokenStart, 'tokenEnd:', tokenEnd);
              setCurrentWordIndex(i);
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

  return (
    <div className="h-screen flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt"
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
        <div className="font-bold mr-2">LexiLand Read</div>
        

        <button 
          className="px-3 py-2 border border-border rounded-lg hover:bg-hover text-sm" 
          title="Stop"
          onClick={handleStop}
          disabled={!isSpeaking}
        >
          ⏹
        </button>
        <button
          className="px-3 py-2 border border-border rounded-lg hover:bg-hover text-sm"
          title="Previous sentence"
          onClick={handlePrevSentence}
          disabled={!currentDocument || currentSentenceIndex === null || currentSentenceIndex === 0}
        >
          &lt;
        </button>
        <button
          className={`px-3 py-2 border rounded-lg text-sm ${
            isSpeaking
              ? 'border-active bg-active hover:bg-indigo-100'
              : 'border-border hover:bg-hover'
          }`}
          title="Play"
          onClick={handlePlayPause}
          disabled={!currentDocument}
        >
          ▶
        </button>
        <button
          className="px-3 py-2 border border-border rounded-lg hover:bg-hover text-sm"
          title="Next sentence"
          onClick={handleNextSentence}
          disabled={!currentDocument || currentSentenceIndex === null}
        >
          &gt;
        </button>

        {/* Speed control */}
        <div className="relative">
          <button
            className="px-3 py-2 border border-border rounded-lg hover:bg-hover text-sm"
            title="Speed"
            onClick={() => setShowSpeedControl(!showSpeedControl)}
          >
            Speed {speechRate.toFixed(1)}x
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

        {/* Pitch control */}
        <div className="relative">
          <button
            className="px-3 py-2 border border-border rounded-lg hover:bg-hover text-sm"
            title="Pitch"
            onClick={() => setShowPitchControl(!showPitchControl)}
          >
            Pitch {speechPitch.toFixed(1)}
          </button>
          {showPitchControl && (
            <div className="absolute top-full mt-2 p-3 bg-white border border-border rounded-lg shadow-lg z-10 min-w-[200px]">
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
          )}
        </div>

        {/* Voice selector */}
        <select
          className="px-3 py-2 border border-border rounded-lg bg-white text-sm"
          title="Voice"
          value={selectedVoice}
          onChange={(e) => setSelectedVoice(e.target.value)}
        >
          {availableVoices.map((voice) => (
            <option key={voice.name} value={voice.name}>
              {voice.name}
            </option>
          ))}
        </select>

        <button 
          className="px-3 py-2 border border-border rounded-lg hover:bg-hover text-sm"
          onClick={handleLoadSample}
        >
          Load sample
        </button>

        <label className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg bg-white text-sm">
          <input type="checkbox" checked={showIPA} onChange={(e) => setShowIPA(e.target.checked)} />
          IPA
        </label>
        <label className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg bg-white text-sm">
          <input type="checkbox" checked={showChinese} onChange={(e) => setShowChinese(e.target.checked)} />
          中文
        </label>
        
        
        <button
          onClick={handleExportData}
          className="px-2 py-1 border border-green-500 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-semibold"
          title="Export user data to JSON file"
        >
          Export Data
        </button>
        
        <button
          onClick={handleImportData}
          className="px-2 py-1 border border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-semibold"
          title="Import user data from JSON file"
        >
          Import Data
        </button>

        <span className="text-xs text-muted">Level</span>
        <select 
          className="px-3 py-2 border border-border rounded-lg bg-white text-sm"
          value={level}
          onChange={(e) => setLevel(e.target.value)}
        >
          <option value="A2">A2</option>
          <option value="B1">B1</option>
          <option value="B2">B2</option>
          <option value="C1">C1</option>
        </select>
      </div>

      {/* Main Layout: Three Columns */}
      <div className="flex-1 grid grid-cols-[260px_1fr_360px] gap-3 p-3 min-h-0">
        {/* Left Panel: Outline */}
        <aside className="border border-border rounded-2xl overflow-hidden bg-white flex flex-col min-h-0">
          <div className="px-3 py-3 border-b border-border bg-panel font-bold flex items-center justify-between">
            Outline
          </div>
          <div className="flex-1 p-3 overflow-auto">
            {documents.map(doc => (
              <div 
                key={doc.id}                onClick={() => setCurrentDocument(doc.id)}                className={`px-3 py-2 rounded-lg ${doc.id === currentDocumentId ? 'bg-active font-bold' : 'hover:bg-hover'} flex items-center justify-between cursor-pointer`}
              >
                <span>{doc.title}</span>
                <span className="text-muted">›</span>
              </div>
            ))}

            <div className="text-xs text-muted mt-3 mb-1">Documents</div>
            <div 
              className="px-3 py-2 rounded-lg hover:bg-hover flex items-center justify-between cursor-pointer text-sm"
              onClick={handleNewDocument}
            >
              <span>＋ New document</span>
            </div>
            <div 
              className="px-3 py-2 rounded-lg hover:bg-hover flex items-center justify-between cursor-pointer text-sm"
              onClick={handleFileImport}
            >
              <span>Import file</span>
            </div>
          </div>
        </aside>

        {/* Center Panel: Reader */}
        <main className="border border-border rounded-2xl overflow-hidden bg-white flex flex-col min-h-0">
          <div className="flex-1 p-3 overflow-auto">
            {currentDocument ? (
              <>
                <div className="text-2xl font-extrabold mb-2">{currentDocument.title}</div>
                <div className="text-xs text-muted mb-4 leading-relaxed">
                  {currentDocument.paragraphs.length} paragraphs
                </div>

                {currentDocument.paragraphs.map((paragraph, pIdx) => {
                  // Calculate global sentence indices for this paragraph
                  let sentencesBeforeThisPara = 0;
                  for (let i = 0; i < pIdx; i++) {
                    sentencesBeforeThisPara += currentDocument.paragraphs[i].sentences.length;
                  }
                  
                  return (
                    <Paragraph
                      key={paragraph.id}
                      paragraph={paragraph}
                      paragraphIndex={pIdx}
                      knownWords={knownWords}
                      markedWords={markedWords}
                      learntWords={learntWords}
                      annotations={annotations}
                      showIPA={showIPA}
                      showChinese={showChinese}
                      autoMark={autoMark}
                      onWordClick={handleWordClick}
                      onMarkKnown={handleMarkKnown}
                      onParagraphAction={handleParagraphAction}
                      currentSentenceIndex={currentSentenceIndex}
                      currentWordIndex={currentWordIndex}
                      sentencesBeforeThisPara={sentencesBeforeThisPara}
                    />
                  );
                })}
                
                {/* New control panel */}
                <div className="mt-8 flex items-center justify-center gap-4 p-4 border-t border-border bg-gray-50 rounded-lg">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={autoMarkUnknown}
                      onChange={(e) => setAutoMarkUnknown(e.target.checked)}
                    />
                    <span className="text-sm font-medium">Unknown Words</span>
                  </label>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={genCard}
                      onChange={(e) => setGenCard(e.target.checked)}
                    />
                    <span className="text-sm font-medium">Gen Card</span>
                  </label>

                  <button
                    onClick={handleAnnotate}
                    disabled={markedWords.size === 0}
                    className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
                  >
                    Annotate ({markedWords.size})
                  </button>

                  <button
                    onClick={handleMarkAllUnmarkedAsKnown}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium"
                  >
                     Mark All Unmarked as Known
                  </button>
                </div>
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
        <aside className="border border-border rounded-2xl overflow-hidden bg-white flex flex-col min-h-0">
          <div className="px-3 py-3 border-b border-border bg-panel font-bold">
            Cards
          </div>
          <div className="flex-1 p-3 overflow-auto">
            {isLoadingAnnotation && (
              <div className="text-center py-8 text-muted">
                <div className="text-2xl mb-2">⏳</div>
                <div>Loading annotation...</div>
              </div>
            )}
            
            {!isLoadingAnnotation && currentAnnotation && (
              <WordCard
                annotation={currentAnnotation}
                onClose={() => setCurrentAnnotation(null)}
                onDelete={handleDeleteFromCards}
              />
            )}
            
            {!isLoadingAnnotation && !currentAnnotation && (
              <div className="border border-border rounded-2xl p-3 bg-white mb-3">
                <div className="text-xs text-muted">Placeholder</div>
                <div className="font-extrabold mt-1">Word / Paragraph Cards</div>
                <div className="h-px bg-border my-2"></div>
                <div className="text-sm leading-relaxed">
                  Click on an unknown word to see its annotation card.
                </div>
              </div>
            )}
          </div>
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
    </div>
  )
}

export default App

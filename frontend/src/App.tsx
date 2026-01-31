import { useEffect, useRef, useState } from 'react'
import './App.css'
import { useAppStore } from './store/appStore'
import { tokenizeParagraphs } from './utils'
import Paragraph from './components/Paragraph'
import WordCard from './components/WordCard'
import { loadKnownWordsFromFile, getAllKnownWords, addKnownWord as addKnownWordToDB, cacheAnnotation, getCachedAnnotation, getAllCachedAnnotations, addLearntWordToDB, removeLearntWordFromDB, getAllLearntWords, deleteAnnotation } from './db'
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
    loadKnownWords,
  } = useAppStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showNewDocModal, setShowNewDocModal] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [currentAnnotation, setCurrentAnnotation] = useState<WordAnnotation | null>(null);
  const [isLoadingAnnotation, setIsLoadingAnnotation] = useState(false);
  
  const currentDocument = documents.find(doc => doc.id === currentDocumentId);

  // Handle word click
  const handleWordClick = async (word: string, context?: string) => {
    const normalizedWord = word.toLowerCase();

    // If word is learnt, remove from learnt list (restore to unknown)
    if (learntWords.has(normalizedWord)) {
      try {
        removeLearntWord(word);
        await removeLearntWordFromDB(word);
        console.log(`Restored "${word}" to unknown state`);
      } catch (error) {
        console.error('Failed to restore word:', error);
      }
    }

    // Check if already annotated in store
    const existingAnnotation = annotations.get(normalizedWord);
    if (existingAnnotation && (existingAnnotation as any).definition) {
      setCurrentAnnotation(existingAnnotation as WordAnnotation);
      return;
    }

    // Check IndexedDB cache
    setIsLoadingAnnotation(true);
    try {
      const cachedAnnotation = await getCachedAnnotation(normalizedWord);
      if (cachedAnnotation) {
        console.log(`Loaded annotation for "${word}" from cache`);
        const annotation: WordAnnotation = {
          word: cachedAnnotation.word,
          baseForm: cachedAnnotation.baseForm,
          ipa: cachedAnnotation.ipa,
          chinese: cachedAnnotation.chinese,
          definition: cachedAnnotation.definition,
          example: cachedAnnotation.example,
          level: cachedAnnotation.level,
          partOfSpeech: cachedAnnotation.partOfSpeech,
        };
        addAnnotation(word, annotation);
        setCurrentAnnotation(annotation);
        setIsLoadingAnnotation(false);
        return;
      }
    } catch (error) {
      console.error('Failed to load from cache:', error);
    }

    // Fetch annotation from API
    const result = await annotateWord(word, level, context);

    if (result.success && result.data) {
      addAnnotation(word, result.data);
      setCurrentAnnotation(result.data);

      // Cache the annotation
      try {
        await cacheAnnotation(word, result.data);
        console.log(`Cached annotation for "${word}"`);
      } catch (error) {
        console.error('Failed to cache annotation:', error);
      }

      console.log('Annotation fetched from API:', result.data);
      console.log('API usage:', result.usage);
    } else {
      console.error('Failed to fetch annotation:', result.error);
      alert(`Failed to annotate "${word}": ${result.error}`);
    }

    setIsLoadingAnnotation(false);
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

  return (
    <div className="h-screen flex flex-col">
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Top Bar */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-border px-4 py-2.5 flex items-center gap-3 flex-wrap">
        <div className="font-bold mr-2">LexiLand Read</div>
        
        <button className="px-3 py-2 border border-border rounded-lg hover:bg-hover text-sm" title="Previous sentence">
          ⟨
        </button>
        <button className="px-3 py-2 border border-active bg-active rounded-lg hover:bg-indigo-100 text-sm" title="Play from cursor">
          ▶
        </button>
        <button className="px-3 py-2 border border-border rounded-lg hover:bg-hover text-sm" title="Next sentence">
          ⟩
        </button>

        <select className="px-3 py-2 border border-border rounded-lg bg-white text-sm" title="Voice">
          <option value="">Voice (placeholder)</option>
        </select>

        <button 
          className="px-3 py-2 border border-border rounded-lg hover:bg-hover text-sm"
          onClick={handleLoadSample}
        >
          Load sample
        </button>
<button
          className="px-2 py-1 border border-indigo-200 bg-indigo-50 rounded-lg hover:bg-indigo-100 text-xs"
          onClick={handleBatchAnnotate}
          disabled={!currentDocument}
          title="Batch annotate all unknown words"
        >
          Batch Annotate
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
          onClick={() => setAutoMark(!autoMark)}
          className={`px-3 py-1.5 border border-border rounded-lg text-sm font-semibold ${
            autoMark ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'
          }`}
        >
          {autoMark ? 'ON' : 'OFF'} Auto-mark
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

        <span className="text-xs text-muted">
          {currentDocument ? `${currentDocument.title}` : 'Ready'}
        </span>
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

                {currentDocument.paragraphs.map(paragraph => (
                  <Paragraph
                    key={paragraph.id}
                    paragraph={paragraph}
                    knownWords={knownWords}
                    learntWords={learntWords}
                    annotations={annotations}
                    showIPA={showIPA}
                    showChinese={showChinese}                    autoMark={autoMark}                    onWordClick={handleWordClick}                      onMarkKnown={handleMarkKnown}                    onParagraphAction={handleParagraphAction}
                  />
                ))}
                
                {!autoMark && (
                  <div className="mt-8 flex justify-center">
                    <button
                      onClick={handleMarkAllUnmarkedAsKnown}
                      className="px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold text-sm shadow-md"
                    >
                      ✓ Done - Mark All Unmarked as Known
                    </button>
                  </div>
                )}
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

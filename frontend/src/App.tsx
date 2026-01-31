import { useEffect, useRef } from 'react'
import './App.css'
import { useAppStore } from './store/appStore'
import { tokenizeParagraphs } from './utils'
import Paragraph from './components/Paragraph'
import { loadKnownWordsFromFile, getAllKnownWords } from './db'

function App() {
  const {
    documents,
    currentDocumentId,
    knownWords,
    annotations,
    showIPA,
    showChinese,
    level,
    addDocument,
    setCurrentDocument,
    setShowIPA,
    setShowChinese,
    setLevel,
    loadKnownWords,
  } = useAppStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const currentDocument = documents.find(doc => doc.id === currentDocumentId);

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
    const title = prompt('Enter document title:', 'Untitled Document');
    if (!title) return;

    addDocument({
      id: `doc-${Date.now()}`,
      title,
      content: '',
      paragraphs: [],
      createdAt: Date.now(),
    });
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

  const handleWordClick = (word: string) => {
    console.log('Word clicked:', word);
    // TODO: Fetch annotation from backend API
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
        <button className="px-3 py-2 border border-active bg-active rounded-lg hover:bg-indigo-100 text-sm">
          Auto-mark
        </button>

        <label className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg bg-white text-sm">
          <input type="checkbox" checked={showIPA} onChange={(e) => setShowIPA(e.target.checked)} />
          IPA
        </label>
        <label className="flex items-center gap-2 px-3 py-1.5 border border-border rounded-lg bg-white text-sm">
          <input type="checkbox" checked={showChinese} onChange={(e) => setShowChinese(e.target.checked)} />
          中文
        </label>

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
                    annotations={annotations}
                    showIPA={showIPA}
                    showChinese={showChinese}
                    onWordClick={handleWordClick}
                    onParagraphAction={handleParagraphAction}
                  />
                ))}
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
            <div className="border border-border rounded-2xl p-3 bg-white mb-3">
              <div className="text-xs text-muted">Placeholder</div>
              <div className="font-extrabold mt-1">Word / Paragraph Cards</div>
              <div className="h-px bg-border my-2"></div>
              <div className="text-sm leading-relaxed">
                Click on an unknown word to see its annotation card.
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default App

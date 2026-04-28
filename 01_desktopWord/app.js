import { createBrowserBridge } from './desktop-bridge.js';

const defaultText = `The lantern swung above the narrow bridge, and Mara hesitated before taking another step. A gust of wind pressed against her coat, but the small note in her hand felt unexpectedly steady. She had promised herself that once she reached the far side, she would stop delaying the difficult conversation.

Across the river, the station lamps shimmered in the rain. A porter waved to a late passenger, while a child crouched beside a suitcase and carefully counted the brass buttons on his sleeve. The whole platform looked ordinary, yet Mara sensed that one ordinary moment could still redirect an entire year.

When the train finally arrived, its doors opened with a tired sigh. She tucked the note into her pocket, drew a slow breath, and stepped forward before doubt could reclaim her.`;

const bridge = createBrowserBridge();

const state = {
  altPressed: false,
  sourceText: loadLocal('desktopword_source_text', defaultText),
  cards: loadJson('desktopword_cards', []),
  analyses: loadJson('desktopword_analyses', []),
  settings: loadJson('desktopword_settings', {
    analyzeUrl: '/api/analyze-sentence',
    model: 'qwen2.5:7b',
    useOllama: true,
  }),
  renderedSentences: [],
  activeSentenceId: null,
  pendingAnalysis: false,
};

const sourceInput = document.querySelector('#sourceInput');
const articleView = document.querySelector('#articleView');
const cardList = document.querySelector('#cardList');
const cardCounter = document.querySelector('#cardCounter');
const analysisView = document.querySelector('#analysisView');
const altStatus = document.querySelector('#altStatus');
const bridgeNote = document.querySelector('#bridgeNote');
const platformStatus = document.querySelector('#platformStatus');
const analyzeUrlInput = document.querySelector('#analyzeUrlInput');
const modelInput = document.querySelector('#modelInput');
const useOllamaInput = document.querySelector('#useOllamaInput');

sourceInput.value = state.sourceText;
analyzeUrlInput.value = state.settings.analyzeUrl;
modelInput.value = state.settings.model;
useOllamaInput.checked = state.settings.useOllama;

platformStatus.textContent = `Host: ${bridge.platform} (${bridge.kind})`;
bridgeNote.textContent = `Global capture bridge: ${bridge.kind} | cross-platform host pending native adapter`;

function loadLocal(key, fallback) {
  return localStorage.getItem(key) ?? fallback;
}

function loadJson(key, fallback) {
  const raw = localStorage.getItem(key);
  if (!raw) return fallback;

  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function normalizeWord(word) {
  return word.toLowerCase().replace(/^[^a-z]+|[^a-z]+$/gi, '');
}

function sentenceIdFor(index) {
  return `sentence-${index + 1}`;
}

function splitSentences(paragraphText) {
  const matches = paragraphText.match(/[^.!?]+[.!?]["')\]]*|[^.!?]+$/g);
  return (matches || [paragraphText]).map((item) => item.trim()).filter(Boolean);
}

function tokenize(sentence) {
  return sentence.match(/\s+|[A-Za-z]+(?:['’-][A-Za-z]+)*|\d+|[^\s]/g) || [];
}

function buildRenderModel() {
  const paragraphs = sourceInput.value
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const sentences = [];

  paragraphs.forEach((paragraphText, paragraphIndex) => {
    splitSentences(paragraphText).forEach((sentenceText) => {
      sentences.push({
        id: sentenceIdFor(sentences.length),
        paragraphIndex,
        paragraphText,
        sentenceText,
        tokens: tokenize(sentenceText),
      });
    });
  });

  state.renderedSentences = sentences;
}

function renderArticle() {
  buildRenderModel();
  state.sourceText = sourceInput.value;
  localStorage.setItem('desktopword_source_text', state.sourceText);

  articleView.innerHTML = '';

  if (state.renderedSentences.length === 0) {
    articleView.textContent = '请输入英文文本。';
    return;
  }

  const groupedByParagraph = new Map();
  state.renderedSentences.forEach((sentence) => {
    const bucket = groupedByParagraph.get(sentence.paragraphIndex) || [];
    bucket.push(sentence);
    groupedByParagraph.set(sentence.paragraphIndex, bucket);
  });

  for (const [, sentences] of groupedByParagraph) {
    const paragraphBlock = document.createElement('section');
    paragraphBlock.className = 'paragraph-block';

    sentences.forEach((sentence) => {
      const sentenceBlock = document.createElement('article');
      sentenceBlock.className = 'sentence-block';
      sentenceBlock.dataset.sentenceId = sentence.id;

      if (state.activeSentenceId === sentence.id) {
        sentenceBlock.classList.add('active');
      }

      if (findAnalysis(sentence.id)) {
        sentenceBlock.classList.add('has-analysis');
      }

      const sentenceText = document.createElement('div');
      sentenceText.className = 'sentence-text';

      sentence.tokens.forEach((token) => {
        if (/^\s+$/.test(token)) {
          const spacer = document.createElement('span');
          spacer.className = 'token-space';
          spacer.textContent = token;
          sentenceText.appendChild(spacer);
          return;
        }

        if (/^[A-Za-z]+(?:['’-][A-Za-z]+)*$/.test(token)) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'token-word';
          button.dataset.word = token;
          button.textContent = token;

          if (sentenceHasWordMarked(sentence.id, token)) {
            button.classList.add('marked');
          }

          button.addEventListener('click', (event) => {
            event.stopPropagation();
            state.activeSentenceId = sentence.id;
            renderArticle();

            if (!state.altPressed) {
              return;
            }

            captureWord(sentence, token);
          });

          sentenceText.appendChild(button);
          return;
        }

        const punctuation = document.createElement('span');
        punctuation.textContent = token;
        sentenceText.appendChild(punctuation);
      });

      sentenceBlock.appendChild(sentenceText);

      sentenceBlock.addEventListener('click', () => {
        state.activeSentenceId = sentence.id;
        renderArticle();
      });

      sentenceBlock.addEventListener('dblclick', async () => {
        state.activeSentenceId = sentence.id;
        renderArticle();

        if (!state.altPressed) {
          return;
        }

        await analyzeSentence(sentence.id);
      });

      const footer = document.createElement('div');
      footer.className = 'sentence-footer';
      footer.innerHTML = `
        <span>ALT + click words | ALT + double click sentence</span>
        <span>${countCardsForSentence(sentence.id)} captured</span>
      `;
      sentenceBlock.appendChild(footer);

      paragraphBlock.appendChild(sentenceBlock);
    });

    articleView.appendChild(paragraphBlock);
  }
}

function sentenceHasWordMarked(sentenceId, word) {
  const normalizedWord = normalizeWord(word);
  return state.cards.some(
    (card) => card.sentenceId === sentenceId && card.normalizedWord === normalizedWord,
  );
}

function countCardsForSentence(sentenceId) {
  return state.cards.filter((card) => card.sentenceId === sentenceId).length;
}

function captureWord(sentence, word) {
  const normalizedWord = normalizeWord(word);
  if (!normalizedWord) return;

  const alreadyExists = state.cards.some(
    (card) => card.sentenceId === sentence.id && card.normalizedWord === normalizedWord,
  );

  if (alreadyExists) {
    return;
  }

  const card = {
    id: `card-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    type: 'word',
    word,
    normalizedWord,
    sentenceId: sentence.id,
    sentenceText: sentence.sentenceText,
    paragraphText: sentence.paragraphText,
    createdAt: new Date().toISOString(),
  };

  state.cards.unshift(card);
  saveJson('desktopword_cards', state.cards);

  bridge.emitMockCapture({
    kind: 'word-card',
    payload: card,
  });

  renderCards();
  renderArticle();
}

function renderCards() {
  cardCounter.textContent = `${state.cards.length} cards`;

  if (state.cards.length === 0) {
    cardList.className = 'card-list empty-state';
    cardList.textContent = '还没有卡片。按住 Alt 点击单词开始。';
    return;
  }

  cardList.className = 'card-list';
  cardList.innerHTML = '';

  const template = document.querySelector('#wordCardTemplate');

  state.cards.forEach((card) => {
    const fragment = template.content.cloneNode(true);
    const article = fragment.querySelector('.word-card');
    const token = fragment.querySelector('.word-token');
    const meta = fragment.querySelector('.word-meta');
    const sentence = fragment.querySelector('.word-sentence');
    const removeButton = fragment.querySelector('.remove-card-button');

    token.textContent = card.word;
    meta.textContent = `${card.createdAt.replace('T', ' ').slice(0, 16)} | ${card.sentenceId}`;
    sentence.textContent = card.sentenceText;

    const jumpButton = document.createElement('button');
    jumpButton.type = 'button';
    jumpButton.className = 'sentence-anchor-button';
    jumpButton.textContent = '定位句子';
    jumpButton.addEventListener('click', () => {
      state.activeSentenceId = card.sentenceId;
      renderArticle();
      document
        .querySelector(`[data-sentence-id="${card.sentenceId}"]`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });

    article.appendChild(jumpButton);

    removeButton.addEventListener('click', () => {
      state.cards = state.cards.filter((item) => item.id !== card.id);
      saveJson('desktopword_cards', state.cards);
      renderCards();
      renderArticle();
    });

    cardList.appendChild(fragment);
  });
}

function findAnalysis(sentenceId) {
  return state.analyses.find((item) => item.sentenceId === sentenceId) || null;
}

function renderAnalyses() {
  if (state.analyses.length === 0) {
    analysisView.className = 'analysis-view empty-state';
    analysisView.textContent = '还没有分析结果。按住 Alt，在某个句子区域双击。';
    return;
  }

  analysisView.className = 'analysis-view';
  analysisView.innerHTML = '';

  state.analyses.forEach((analysis) => {
    const card = document.createElement('article');
    card.className = 'analysis-card';

    const title = document.createElement('div');
    title.className = 'card-title-row';
    title.innerHTML = `
      <div>
        <h3>${analysis.focusWords.join(', ')}</h3>
        <p class="analysis-meta">${analysis.source} | ${analysis.createdAt.replace('T', ' ').slice(0, 16)}</p>
      </div>
    `;
    card.appendChild(title);

    const translation = document.createElement('p');
    translation.className = 'analysis-translation';
    translation.textContent = analysis.translation || '暂无翻译。';
    card.appendChild(translation);

    const note = document.createElement('p');
    note.textContent = analysis.overallNote || '暂无额外说明。';
    card.appendChild(note);

    const wordGrid = document.createElement('div');
    wordGrid.className = 'analysis-word-grid';

    analysis.words.forEach((item) => {
      const wordItem = document.createElement('section');
      wordItem.className = 'analysis-word-item';
      wordItem.innerHTML = `
        <strong>${item.word}</strong>
        <div>${item.meaning || '待补充词义'}</div>
        <div class="analysis-meta">${item.grammarNote || '无特别语法说明'}</div>
        ${item.collocationNote ? `<div class="analysis-meta">${item.collocationNote}</div>` : ''}
      `;
      wordGrid.appendChild(wordItem);
    });

    card.appendChild(wordGrid);
    analysisView.appendChild(card);
  });
}

function buildFallbackAnalysis(sentenceText, focusWords) {
  return {
    source: 'browser-fallback',
    translation: '本地回退模式：建议连接 Ollama 后生成更准确译文。',
    overallNote: '当前没有拿到模型输出，只保留了句子与目标词列表，方便后续补分析。',
    words: focusWords.map((word) => ({
      word,
      meaning: `请结合上下文确认 "${word}" 的具体含义。`,
      grammarNote: '此条为回退占位结果。',
      collocationNote: '',
    })),
    sentenceText,
  };
}

async function analyzeSentence(sentenceId) {
  if (state.pendingAnalysis) {
    return;
  }

  const sentence = state.renderedSentences.find((item) => item.id === sentenceId);
  if (!sentence) {
    return;
  }

  const focusWords = state.cards
    .filter((card) => card.sentenceId === sentenceId)
    .map((card) => card.word);

  if (focusWords.length === 0) {
    analysisView.className = 'analysis-view empty-state';
    analysisView.textContent = '这个句子还没有选中任何生词。先按住 Alt 点击几个单词。';
    return;
  }

  state.pendingAnalysis = true;
  analysisView.className = 'analysis-view empty-state';
  analysisView.textContent = '正在分析句子...';

  let result = buildFallbackAnalysis(sentence.sentenceText, focusWords);

  if (state.settings.useOllama) {
    try {
      const response = await fetch(state.settings.analyzeUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sentence: sentence.sentenceText,
          focusWords,
          model: state.settings.model,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const payload = await response.json();
      if (payload?.success && payload?.data) {
        result = payload.data;
      }
    } catch (error) {
      console.warn('Sentence analysis fallback:', error);
    }
  }

  const analysisRecord = {
    id: `analysis-${Date.now()}`,
    sentenceId,
    sentenceText: sentence.sentenceText,
    focusWords,
    source: result.source || 'unknown',
    translation: result.translation || '',
    overallNote: result.overallNote || '',
    words: Array.isArray(result.words) ? result.words : [],
    createdAt: new Date().toISOString(),
  };

  state.analyses = [
    analysisRecord,
    ...state.analyses.filter((item) => item.sentenceId !== sentenceId),
  ];
  state.pendingAnalysis = false;

  saveJson('desktopword_analyses', state.analyses);
  renderAnalyses();
  renderArticle();
}

function exportJson() {
  const exportPayload = {
    source: 'desktopword-prototype',
    exportedAt: new Date().toISOString(),
    bridge: {
      kind: bridge.kind,
      platform: bridge.platform,
      supportsGlobalCapture: bridge.supportsGlobalCapture,
    },
    cards: state.cards,
    sentenceAnalyses: state.analyses,
    worddropImport: {
      words: state.cards.map((card) => ({
        text: card.word,
        normalized: card.normalizedWord,
        sentence: card.sentenceText,
        createdAt: card.createdAt,
      })),
    },
  };

  const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `desktopword-export-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function syncSettings() {
  state.settings = {
    analyzeUrl: analyzeUrlInput.value.trim() || '/api/analyze-sentence',
    model: modelInput.value.trim() || 'qwen2.5:7b',
    useOllama: useOllamaInput.checked,
  };
  saveJson('desktopword_settings', state.settings);
}

document.querySelector('#renderButton').addEventListener('click', renderArticle);
document.querySelector('#analyzeSelectedButton').addEventListener('click', async () => {
  if (state.activeSentenceId) {
    await analyzeSentence(state.activeSentenceId);
  }
});
document.querySelector('#exportJsonButton').addEventListener('click', exportJson);
document.querySelector('#clearAnalysisButton').addEventListener('click', () => {
  state.analyses = [];
  saveJson('desktopword_analyses', state.analyses);
  renderAnalyses();
  renderArticle();
});

analyzeUrlInput.addEventListener('change', syncSettings);
modelInput.addEventListener('change', syncSettings);
useOllamaInput.addEventListener('change', syncSettings);

window.addEventListener('keydown', (event) => {
  if (event.key === 'Alt') {
    state.altPressed = true;
    altStatus.textContent = 'ALT held';
  }
});

window.addEventListener('keyup', (event) => {
  if (event.key === 'Alt') {
    state.altPressed = false;
    altStatus.textContent = 'ALT idle';
  }
});

window.addEventListener('blur', () => {
  state.altPressed = false;
  altStatus.textContent = 'ALT idle';
});

bridge.subscribe((event) => {
  if (event.kind === 'word-card') {
    cardCounter.textContent = `${state.cards.length} cards`;
  }
});

renderArticle();
renderCards();
renderAnalyses();

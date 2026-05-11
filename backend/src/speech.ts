import type { FastifyInstance } from 'fastify';
import type OpenAI from 'openai';
import { toFile } from 'openai';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

type AITextProvider = 'openai' | 'local';

type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type CreateTextCompletion = (options: {
  messages: ChatMessage[];
  temperature?: number;
  jsonMode?: boolean;
  maxTokens?: number;
  provider?: AITextProvider;
}) => Promise<{
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}>;

type RegisterSpeechRoutesOptions = {
  dataDir: string;
  speechAudioUrlPrefix: string;
  openai: OpenAI | null;
  createTextCompletion: CreateTextCompletion;
  resolveTextProvider: (provider?: string) => AITextProvider;
  getTextProviderLabel: (provider?: AITextProvider) => string;
};

type SpeechCorrection = {
  id: string;
  original: string;
  corrected: string;
  explanation: string;
  tip: string;
};

type CandidateExpression = {
  text: string;
  meaning: string;
  explanation: string;
  aiImprovedSentence: string;
  recommended?: boolean;
};

type TranscriptLineSource = 'realtime' | 'manual' | 'transcribed';

type TranscriptLine = {
  id: string;
  speakerTag: string;
  text: string;
  startMs: number | null;
  endMs: number | null;
  source: TranscriptLineSource;
};

type ReviewStatus = 'new' | 'reviewing' | 'completed';

type SpeechCard = {
  id: string;
  text: string;
  type: 'speech';
  meaning: string;
  explanation: string;
  aiImprovedSentence: string;
  contextId: string;
  review: {
    status: ReviewStatus;
    reviewCount: number;
    createdAt: string;
    lastReviewedAt: string | null;
    nextReviewAt: string | null;
  };
};

type SpeechSession = {
  id: string;
  title: string;
  createdAt: string;
  audioUrl: string | null;
  speakerMode: 'manual' | 'auto_pending';
  speakerTags: string[];
  transcript: string;
  transcriptLines: TranscriptLine[];
  allCorrections: SpeechCorrection[];
  candidateExpressions: CandidateExpression[];
  selectedCardIds: string[];
};

type SpeechState = {
  sessions: SpeechSession[];
  cards: SpeechCard[];
};

type SpeechSessionDetail = SpeechSession & {
  selectedCards: SpeechCard[];
};

type SpeechDashboard = {
  sessions: SpeechSessionDetail[];
  dueCards: SpeechCard[];
};

type CreateSpeechSessionRequest = {
  transcript?: string;
  transcriptLines?: TranscriptLine[];
  audioDataUrl?: string;
  audioMimeType?: string;
  createdAt?: string;
  provider?: AITextProvider;
  speakerTags?: string[];
};

type UpdateSelectionRequest = {
  expressions: string[];
};

type UpdateTranscriptRequest = {
  title?: string;
  transcriptLines?: TranscriptLine[];
  speakerTags?: string[];
};

const REVIEW_DAY_OFFSETS = [1, 3, 6] as const;
const DEFAULT_SPEAKER_TAGS = ['Teacher', 'Student A', 'Student B', 'Me'] as const;
const DEFAULT_TRANSCRIPTION_MODEL = process.env.OPENAI_TRANSCRIPTION_MODEL || 'gpt-4o-mini-transcribe';
const DEFAULT_REALTIME_TRANSCRIPTION_MODEL =
  process.env.OPENAI_REALTIME_TRANSCRIBE_MODEL
  || process.env.OPENAI_TRANSCRIPTION_MODEL
  || DEFAULT_TRANSCRIPTION_MODEL;
const REALTIME_VAD_THRESHOLD = Number(process.env.OPENAI_REALTIME_VAD_THRESHOLD) || 0.45;
const REALTIME_VAD_PREFIX_PADDING_MS = Number(process.env.OPENAI_REALTIME_VAD_PREFIX_MS) || 200;
const REALTIME_VAD_SILENCE_MS = Number(process.env.OPENAI_REALTIME_VAD_SILENCE_MS) || 280;
const STOP_WORDS = new Set([
  'about', 'after', 'again', 'also', 'always', 'am', 'an', 'and', 'are', 'around', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'but', 'by', 'can', 'could', 'did', 'do', 'does',
  'doing', 'done', 'for', 'from', 'get', 'got', 'had', 'has', 'have', 'having', 'he', 'her',
  'here', 'hers', 'him', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'just',
  'kind', 'like', 'maybe', 'me', 'more', 'most', 'my', 'of', 'on', 'or', 'our', 'really', 'so',
  'some', 'something', 'still', 'that', 'the', 'their', 'them', 'there', 'they', 'this', 'to',
  'too', 'up', 'us', 'very', 'was', 'we', 'were', 'what', 'when', 'which', 'who', 'will',
  'with', 'would', 'you', 'your',
]);

function speechPaths(dataDir: string) {
  const rootDir = path.join(dataDir, 'speech');
  return {
    rootDir,
    stateFile: path.join(rootDir, 'state.json'),
    audioDir: path.join(rootDir, 'audio'),
  };
}

export async function ensureSpeechDirectories(dataDir: string) {
  const paths = speechPaths(dataDir);
  await Promise.all([
    fs.mkdir(paths.rootDir, { recursive: true }),
    fs.mkdir(paths.audioDir, { recursive: true }),
  ]);

  try {
    await fs.access(paths.stateFile);
  } catch {
    const initialState: SpeechState = { sessions: [], cards: [] };
    await fs.writeFile(paths.stateFile, JSON.stringify(initialState, null, 2), 'utf-8');
  }

  return paths;
}

async function loadSpeechState(dataDir: string): Promise<SpeechState> {
  const paths = await ensureSpeechDirectories(dataDir);
  const raw = await fs.readFile(paths.stateFile, 'utf-8');
  const parsed = JSON.parse(raw) as Partial<SpeechState>;
  return {
    sessions: Array.isArray(parsed.sessions)
      ? parsed.sessions.map(session => normalizeStoredSession(session as SpeechSession))
      : [],
    cards: Array.isArray(parsed.cards) ? parsed.cards : [],
  };
}

async function saveSpeechState(dataDir: string, state: SpeechState): Promise<void> {
  const paths = await ensureSpeechDirectories(dataDir);
  await fs.writeFile(paths.stateFile, JSON.stringify(state, null, 2), 'utf-8');
}

function normalizeDate(input?: string): string {
  const date = input ? new Date(input) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function normalizeSpeakerTags(input?: string[]): string[] {
  const tags = Array.isArray(input)
    ? input
        .map(tag => String(tag || '').trim())
        .filter(Boolean)
    : [];

  const unique = Array.from(new Set(tags)).slice(0, 8);
  return unique.length > 0 ? unique : [...DEFAULT_SPEAKER_TAGS];
}

function normalizeLineTime(input: unknown): number | null {
  if (typeof input !== 'number' || !Number.isFinite(input) || input < 0) {
    return null;
  }

  return Math.round(input);
}

function normalizeTranscriptLine(
  input: Partial<TranscriptLine> | undefined,
  index: number,
  speakerTags: string[],
): TranscriptLine | null {
  const text = String(input?.text || '').trim();
  if (!text) {
    return null;
  }

  const fallbackTag = speakerTags[Math.min(index, speakerTags.length - 1)] || speakerTags[0] || DEFAULT_SPEAKER_TAGS[0];
  const speakerTag = speakerTags.includes(String(input?.speakerTag || '').trim())
    ? String(input?.speakerTag || '').trim()
    : String(input?.speakerTag || '').trim() || fallbackTag;
  const source = input?.source === 'realtime' || input?.source === 'transcribed' ? input.source : 'manual';
  const startMs = normalizeLineTime(input?.startMs);
  const endMs = normalizeLineTime(input?.endMs);

  return {
    id: String(input?.id || `line_${randomUUID().slice(0, 8)}`),
    speakerTag,
    text,
    startMs,
    endMs: endMs !== null && startMs !== null && endMs < startMs ? startMs : endMs,
    source,
  };
}

function buildTranscriptLinesFromTranscript(transcript: string, speakerTags: string[]): TranscriptLine[] {
  const lines = transcript
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  return lines
    .map((line, index) =>
      normalizeTranscriptLine(
        {
          text: line,
          speakerTag: speakerTags[Math.min(index, speakerTags.length - 1)] || speakerTags[0] || DEFAULT_SPEAKER_TAGS[0],
          source: 'transcribed',
        },
        index,
        speakerTags,
      ),
    )
    .filter((line): line is TranscriptLine => Boolean(line));
}

function joinTranscriptLines(lines: TranscriptLine[]): string {
  return lines.map(line => line.text.trim()).filter(Boolean).join('\n').trim();
}

function normalizeTranscriptPayload(input: {
  transcript?: string;
  transcriptLines?: TranscriptLine[];
  speakerTags?: string[];
}) {
  const speakerTags = normalizeSpeakerTags(input.speakerTags);
  const normalizedLines = Array.isArray(input.transcriptLines)
    ? input.transcriptLines
        .map((line, index) => normalizeTranscriptLine(line, index, speakerTags))
        .filter((line): line is TranscriptLine => Boolean(line))
    : [];
  const transcript = joinTranscriptLines(normalizedLines)
    || String(input.transcript || '').trim();
  const transcriptLines = normalizedLines.length > 0
    ? normalizedLines
    : buildTranscriptLinesFromTranscript(transcript, speakerTags);

  return {
    speakerTags,
    transcriptLines,
    transcript: joinTranscriptLines(transcriptLines),
  };
}

function normalizeStoredSession(session: SpeechSession): SpeechSession {
  const normalized = normalizeTranscriptPayload({
    transcript: session.transcript,
    transcriptLines: session.transcriptLines,
    speakerTags: session.speakerTags,
  });

  return {
    ...session,
    speakerMode: session.speakerMode === 'manual' ? 'manual' : 'auto_pending',
    speakerTags: normalized.speakerTags,
    transcript: normalized.transcript || String(session.transcript || '').trim(),
    transcriptLines: normalized.transcriptLines,
  };
}

function toDateKey(input: string): string {
  return normalizeDate(input).slice(0, 10);
}

function titleCaseWords(text: string): string {
  return text
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function fallbackTitle(transcript: string): string {
  const words = transcript
    .replace(/[^\w\s'-]/g, ' ')
    .split(/\s+/)
    .map(word => word.trim())
    .filter(Boolean)
    .slice(0, 5);

  return words.length > 0 ? titleCaseWords(words.join(' ')) : 'Daily Voice Diary';
}

function summarizeSentence(text: string): string {
  const sentence = text.split(/(?<=[.!?])\s+/).find(Boolean) || text;
  return sentence.trim();
}

function extractFallbackExpressions(transcript: string): CandidateExpression[] {
  const seen = new Set<string>();
  const words = transcript
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, ' ')
    .split(/\s+/)
    .map(word => word.trim())
    .filter(word => word.length >= 5 && !STOP_WORDS.has(word));

  const uniqueWords = words.filter(word => {
    if (seen.has(word)) return false;
    seen.add(word);
    return true;
  }).slice(0, 6);

  return uniqueWords.map((word, index) => ({
    text: word,
    meaning: index < 3 ? 'Recommended expression from your diary' : 'Candidate expression from your diary',
    explanation: 'Selected from your own speech so you can recycle it in future speaking.',
    aiImprovedSentence: summarizeSentence(transcript),
    recommended: index < 3,
  }));
}

function extractJsonBlock(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  return fenced?.[1]?.trim() || trimmed;
}

function parseJsonResponse<T>(content: string, providerLabel: string): T {
  const normalized = extractJsonBlock(content);
  try {
    return JSON.parse(normalized) as T;
  } catch {
    const objectMatch = normalized.match(/\{[\s\S]*\}/);
    if (!objectMatch) {
      throw new Error(`Failed to parse JSON returned by ${providerLabel}`);
    }
    return JSON.parse(objectMatch[0]) as T;
  }
}

function buildInitialReview(createdAt: string): SpeechCard['review'] {
  return {
    status: 'new',
    reviewCount: 0,
    createdAt: toDateKey(createdAt),
    lastReviewedAt: null,
    nextReviewAt: addDays(toDateKey(createdAt), REVIEW_DAY_OFFSETS[0]),
  };
}

function addDays(dateKey: string, amount: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function computeNextReview(review: SpeechCard['review']): SpeechCard['review'] {
  const nextCount = review.reviewCount + 1;
  const lastReviewedAt = new Date().toISOString();

  if (nextCount >= REVIEW_DAY_OFFSETS.length) {
    return {
      ...review,
      reviewCount: nextCount,
      status: 'completed',
      lastReviewedAt,
      nextReviewAt: null,
    };
  }

  return {
    ...review,
    reviewCount: nextCount,
    status: 'reviewing',
    lastReviewedAt,
    nextReviewAt: addDays(review.createdAt, REVIEW_DAY_OFFSETS[nextCount]),
  };
}

function buildSessionDetail(session: SpeechSession, cards: SpeechCard[]): SpeechSessionDetail {
  return {
    ...session,
    selectedCards: session.selectedCardIds
      .map(cardId => cards.find(card => card.id === cardId))
      .filter((card): card is SpeechCard => Boolean(card)),
  };
}

function buildDashboard(state: SpeechState): SpeechDashboard {
  const today = new Date().toISOString().slice(0, 10);
  const sessions = state.sessions
    .slice()
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
    .map(session => buildSessionDetail(session, state.cards));
  const dueCards = state.cards
    .filter(card => card.review.status !== 'completed' && Boolean(card.review.nextReviewAt) && card.review.nextReviewAt! <= today)
    .sort((left, right) => {
      const leftKey = left.review.nextReviewAt || '';
      const rightKey = right.review.nextReviewAt || '';
      return leftKey.localeCompare(rightKey) || left.text.localeCompare(right.text);
    });

  return { sessions, dueCards };
}

function parseAudioDataUrl(dataUrl: string, fallbackMimeType?: string) {
  const match = dataUrl.match(/^data:([^,]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Invalid audio data. Expected a base64 data URL.');
  }

  const mimeType = fallbackMimeType || match[1];
  const base64 = match[2];
  const buffer = Buffer.from(base64, 'base64');
  const extension = mimeType.includes('mpeg')
    ? 'mp3'
    : mimeType.includes('mp4')
      ? 'm4a'
      : mimeType.includes('ogg')
        ? 'ogg'
        : 'webm';

  return { buffer, mimeType, extension };
}

function normalizeLanguage(input?: string): string {
  return String(input || 'en').trim().slice(0, 2).toLowerCase() || 'en';
}

async function saveAudioFile(dataDir: string, sessionId: string, audioDataUrl: string, fallbackMimeType?: string) {
  const paths = await ensureSpeechDirectories(dataDir);
  const { buffer, extension, mimeType } = parseAudioDataUrl(audioDataUrl, fallbackMimeType);
  const filename = `${sessionId}.${extension}`;
  const filepath = path.join(paths.audioDir, filename);
  await fs.writeFile(filepath, buffer);
  return { buffer, filename, mimeType };
}

async function transcribeAudio(openai: OpenAI | null, buffer: Buffer, filename: string, mimeType?: string): Promise<string> {
  if (!openai) {
    throw new Error('OPENAI_API_KEY is required for speech transcription when no transcript is provided.');
  }

  const file = await toFile(buffer, filename, mimeType ? { type: mimeType } : undefined);
  const transcription = await openai.audio.transcriptions.create({
    file,
    model: DEFAULT_TRANSCRIPTION_MODEL,
  });

  const text = typeof transcription.text === 'string' ? transcription.text.trim() : '';
  if (!text) {
    throw new Error('Transcription returned empty text.');
  }

  return text;
}

async function createRealtimeTranscriptionSession(input: {
  apiKey: string;
  sdp: string;
  language?: string;
  prompt?: string;
  model?: string;
}) {
  const model = input.model?.trim() || DEFAULT_REALTIME_TRANSCRIPTION_MODEL;
  const language = normalizeLanguage(input.language);
  const prompt = input.prompt?.trim() || '';

  const sessionConfig = {
    type: 'transcription',
    audio: {
      input: {
        noise_reduction: {
          type: 'near_field',
        },
        transcription: {
          model,
          language,
          ...(prompt ? { prompt } : {}),
        },
        turn_detection: {
          type: 'server_vad',
          threshold: REALTIME_VAD_THRESHOLD,
          prefix_padding_ms: REALTIME_VAD_PREFIX_PADDING_MS,
          silence_duration_ms: REALTIME_VAD_SILENCE_MS,
        },
      },
    },
  };

  const formData = new FormData();
  formData.set('sdp', input.sdp);
  formData.set('session', JSON.stringify(sessionConfig));

  const response = await fetch('https://api.openai.com/v1/realtime/calls', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
    },
    body: formData,
  });

  const answerSdp = await response.text();
  if (!response.ok) {
    throw new Error(answerSdp || `Realtime transcription session failed (${response.status}).`);
  }

  return {
    sdp: answerSdp,
    model,
    language,
  };
}

async function analyzeTranscript(
  transcript: string,
  provider: AITextProvider,
  createTextCompletion: CreateTextCompletion,
  providerLabel: string,
): Promise<{
  title: string;
  corrections: SpeechCorrection[];
  candidateExpressions: CandidateExpression[];
}> {
  const prompt = `You are building a daily English speaking diary analysis for a Chinese learner.

Transcript:
"""${transcript}"""

Return ONE JSON object in this exact shape:
{
  "title": "short natural title, 3 to 7 words",
  "corrections": [
    {
      "original": "original problematic fragment",
      "corrected": "natural corrected fragment",
      "explanation": "short simplified Chinese explanation",
      "tip": "short simplified Chinese tip for future speaking"
    }
  ],
  "candidateExpressions": [
    {
      "text": "expression",
      "meaning": "short simplified Chinese meaning",
      "explanation": "why this expression is useful, in simplified Chinese",
      "aiImprovedSentence": "one short natural English sentence using this expression",
      "recommended": true
    }
  ]
}

Rules:
- corrections: 0 to 6 items, only real mistakes or clearly unnatural fragments.
- candidateExpressions: 3 to 6 items total.
- Mark exactly 3 candidateExpressions with "recommended": true when possible.
- Keep every candidate expression reusable for daily spoken English.
- Prefer phrases/collocations over isolated rare words.
- All Chinese fields must be simplified Chinese.
- Return JSON only, no markdown.`;

  const completion = await createTextCompletion({
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    jsonMode: true,
    provider,
  });

  const content = completion.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error(`No response from ${providerLabel}`);
  }

  const parsed = parseJsonResponse<{
    title?: string;
    corrections?: Array<Partial<SpeechCorrection>>;
    candidateExpressions?: Array<Partial<CandidateExpression>>;
  }>(content, providerLabel);

  const corrections = Array.isArray(parsed.corrections)
    ? parsed.corrections
        .map((item, index) => ({
          id: `correction_${index + 1}`,
          original: String(item.original || '').trim(),
          corrected: String(item.corrected || '').trim(),
          explanation: String(item.explanation || '').trim(),
          tip: String(item.tip || '').trim(),
        }))
        .filter(item => item.original && item.corrected)
        .slice(0, 6)
    : [];

  const candidateExpressions = Array.isArray(parsed.candidateExpressions)
    ? parsed.candidateExpressions
        .map(item => ({
          text: String(item.text || '').trim(),
          meaning: String(item.meaning || '').trim(),
          explanation: String(item.explanation || '').trim(),
          aiImprovedSentence: String(item.aiImprovedSentence || '').trim(),
          recommended: Boolean(item.recommended),
        }))
        .filter(item => item.text)
        .slice(0, 6)
    : [];

  return {
    title: String(parsed.title || '').trim() || fallbackTitle(transcript),
    corrections,
    candidateExpressions: candidateExpressions.length > 0 ? candidateExpressions : extractFallbackExpressions(transcript),
  };
}

function buildFallbackAnalysis(transcript: string) {
  return {
    title: fallbackTitle(transcript),
    corrections: [] as SpeechCorrection[],
    candidateExpressions: extractFallbackExpressions(transcript),
  };
}

function buildCardFromExpression(expression: CandidateExpression, session: SpeechSession): SpeechCard {
  return {
    id: `speech_card_${randomUUID()}`,
    text: expression.text,
    type: 'speech',
    meaning: expression.meaning || 'Useful expression from this session.',
    explanation: expression.explanation || 'Picked from your own speech so you can reuse it later.',
    aiImprovedSentence: expression.aiImprovedSentence || summarizeSentence(session.transcript),
    contextId: session.id,
    review: buildInitialReview(session.createdAt),
  };
}

function formatTimestamp(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) {
    return '--:--';
  }

  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function buildMarkdown(session: SpeechSessionDetail): string {
  const lines: string[] = [
    `# Speech Diary - ${toDateKey(session.createdAt)}`,
    '',
    '## Title',
    session.title,
    '',
    '## Transcript',
  ];

  if (session.transcriptLines.length === 0) {
    lines.push(session.transcript);
  } else {
    session.transcriptLines.forEach(line => {
      lines.push(`- [${formatTimestamp(line.startMs)}] ${line.speakerTag}: ${line.text}`);
    });
  }

  lines.push('');
  lines.push('## Corrections');

  if (session.allCorrections.length === 0) {
    lines.push('No major corrections today.');
  } else {
    session.allCorrections.forEach((correction, index) => {
      lines.push(`${index + 1}. ${correction.original}`);
      lines.push(`Corrected: ${correction.corrected}`);
      lines.push(`Explanation: ${correction.explanation}`);
      lines.push(`Tip: ${correction.tip}`);
      lines.push('');
    });
  }

  lines.push('## Speech Cards');
  lines.push('');

  if (session.selectedCards.length === 0) {
    lines.push('No speech cards selected yet.');
  } else {
    session.selectedCards.forEach(card => {
      lines.push(`### ${card.text}`);
      lines.push(`Meaning: ${card.meaning}`);
      lines.push(`Explanation: ${card.explanation}`);
      lines.push(`Sentence: ${card.aiImprovedSentence}`);
      lines.push('');
    });
  }

  return lines.join('\n').trimEnd() + '\n';
}

export async function registerSpeechRoutes(fastify: FastifyInstance, options: RegisterSpeechRoutesOptions) {
  await ensureSpeechDirectories(options.dataDir);

  fastify.get('/api/speech/dashboard', async () => {
    const state = await loadSpeechState(options.dataDir);
    return {
      success: true,
      data: buildDashboard(state),
    };
  });

  fastify.post<{
    Body: {
      sdp?: string;
      language?: string;
      prompt?: string;
      model?: string;
    };
  }>('/api/speech/realtime/session', async (request, reply) => {
    const { sdp, language, prompt, model } = request.body || {};

    if (!process.env.OPENAI_API_KEY) {
      return reply.code(500).send({
        success: false,
        error: 'OPENAI_API_KEY is not configured for realtime transcription.',
      });
    }

    if (!sdp || typeof sdp !== 'string') {
      return reply.code(400).send({
        success: false,
        error: 'sdp is required.',
      });
    }

    try {
      const session = await createRealtimeTranscriptionSession({
        apiKey: process.env.OPENAI_API_KEY,
        sdp,
        language,
        prompt,
        model,
      });

      return {
        success: true,
        data: session,
      };
    } catch (error: any) {
      fastify.log.error({ error, stack: error.stack }, 'Failed to create realtime speech session');
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to create realtime speech session',
      });
    }
  });

  fastify.post<{ Body: CreateSpeechSessionRequest }>('/api/speech/sessions', async (request, reply) => {
    const { transcript, transcriptLines, audioDataUrl, audioMimeType, createdAt, provider, speakerTags } = request.body || {};
    const normalizedCreatedAt = normalizeDate(createdAt);
    const selectedProvider = provider
      ? options.resolveTextProvider(provider)
      : options.openai
        ? 'openai'
        : options.resolveTextProvider(provider);
    const initialTranscriptPayload = normalizeTranscriptPayload({
      transcript,
      transcriptLines,
      speakerTags,
    });
    const trimmedTranscript = initialTranscriptPayload.transcript;

    if (!trimmedTranscript && !audioDataUrl) {
      return reply.code(400).send({
        success: false,
        error: 'Transcript or recorded audio is required.',
      });
    }

    try {
      const state = await loadSpeechState(options.dataDir);
      const sessionId = `speech_session_${toDateKey(normalizedCreatedAt).replace(/-/g, '_')}_${randomUUID().slice(0, 8)}`;

      let resolvedTranscript = trimmedTranscript;
      let audioUrl: string | null = null;
      let resolvedTranscriptLines = initialTranscriptPayload.transcriptLines;
      const resolvedSpeakerTags = initialTranscriptPayload.speakerTags;

      if (audioDataUrl) {
        const { filename, buffer, mimeType } = await saveAudioFile(options.dataDir, sessionId, audioDataUrl, audioMimeType);
        audioUrl = `${options.speechAudioUrlPrefix}/${filename}`;

        if (!resolvedTranscript) {
          resolvedTranscript = await transcribeAudio(options.openai, buffer, filename, mimeType);
          resolvedTranscriptLines = buildTranscriptLinesFromTranscript(resolvedTranscript, resolvedSpeakerTags);
        }
      }

      if (!resolvedTranscript) {
        return reply.code(400).send({
          success: false,
          error: 'Transcript could not be resolved from the current input.',
        });
      }

      let analysis = buildFallbackAnalysis(resolvedTranscript);
      try {
        analysis = await analyzeTranscript(
          resolvedTranscript,
          selectedProvider,
          options.createTextCompletion,
          options.getTextProviderLabel(selectedProvider),
        );
      } catch (error: any) {
        fastify.log.warn({ error: error.message }, 'Speech AI analysis failed, using fallback analysis');
      }

      const recommendedTexts = analysis.candidateExpressions
        .filter(item => item.recommended)
        .map(item => item.text)
        .slice(0, 3);
      const fallbackTexts = analysis.candidateExpressions.map(item => item.text).slice(0, 3);
      const selectedTexts = Array.from(new Set([...recommendedTexts, ...fallbackTexts])).slice(0, 3);

      const session: SpeechSession = {
        id: sessionId,
        title: analysis.title,
        createdAt: normalizedCreatedAt,
        audioUrl,
        speakerMode: 'manual',
        speakerTags: resolvedSpeakerTags,
        transcript: resolvedTranscript,
        transcriptLines: resolvedTranscriptLines,
        allCorrections: analysis.corrections,
        candidateExpressions: analysis.candidateExpressions,
        selectedCardIds: [],
      };

      const selectedCards = selectedTexts
        .map(text => session.candidateExpressions.find(item => item.text === text))
        .filter((item): item is CandidateExpression => Boolean(item))
        .map(expression => buildCardFromExpression(expression, session));

      session.selectedCardIds = selectedCards.map(card => card.id);

      state.sessions.unshift(session);
      state.cards = [...selectedCards, ...state.cards];
      await saveSpeechState(options.dataDir, state);

      return {
        success: true,
        data: {
          session: buildSessionDetail(session, state.cards),
          ...buildDashboard(state),
        },
      };
    } catch (error: any) {
      fastify.log.error({ error, stack: error.stack }, 'Failed to create speech session');
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to create speech session',
      });
    }
  });

  fastify.put<{ Params: { sessionId: string }; Body: UpdateTranscriptRequest }>(
    '/api/speech/sessions/:sessionId/transcript',
    async (request, reply) => {
      const { sessionId } = request.params;
      const payload = normalizeTranscriptPayload({
        transcriptLines: request.body?.transcriptLines,
        speakerTags: request.body?.speakerTags,
      });
      const title = String(request.body?.title || '').trim();

      if (!payload.transcript) {
        return reply.code(400).send({
          success: false,
          error: 'At least one transcript line is required.',
        });
      }

      try {
        const state = await loadSpeechState(options.dataDir);
        const sessionIndex = state.sessions.findIndex(item => item.id === sessionId);
        if (sessionIndex < 0) {
          return reply.code(404).send({
            success: false,
            error: 'Speech session not found.',
          });
        }

        state.sessions[sessionIndex] = {
          ...state.sessions[sessionIndex],
          ...(title ? { title } : {}),
          speakerMode: 'manual',
          speakerTags: payload.speakerTags,
          transcript: payload.transcript,
          transcriptLines: payload.transcriptLines,
        };

        await saveSpeechState(options.dataDir, state);

        return {
          success: true,
          data: {
            session: buildSessionDetail(state.sessions[sessionIndex], state.cards),
            ...buildDashboard(state),
          },
        };
      } catch (error: any) {
        fastify.log.error({ error, stack: error.stack, sessionId }, 'Failed to update speech transcript');
        return reply.code(500).send({
          success: false,
          error: error.message || 'Failed to update speech transcript',
        });
      }
    },
  );

  fastify.put<{ Params: { sessionId: string }; Body: UpdateSelectionRequest }>(
    '/api/speech/sessions/:sessionId/selection',
    async (request, reply) => {
      const { sessionId } = request.params;
      const expressions = Array.isArray(request.body?.expressions) ? request.body.expressions : [];
      const selectedTexts = Array.from(
        new Set(
          expressions
            .filter((item): item is string => typeof item === 'string')
            .map(item => item.trim())
            .filter(Boolean),
        ),
      ).slice(0, 3);

      try {
        const state = await loadSpeechState(options.dataDir);
        const sessionIndex = state.sessions.findIndex(item => item.id === sessionId);
        if (sessionIndex < 0) {
          return reply.code(404).send({
            success: false,
            error: 'Speech session not found.',
          });
        }

        const session = state.sessions[sessionIndex];
        const availableExpressions = session.candidateExpressions.filter(item => selectedTexts.includes(item.text));

        state.cards = state.cards.filter(card => !(card.contextId === session.id && !selectedTexts.includes(card.text)));

        const nextSelectedCards = availableExpressions.map(expression => {
          const existing = state.cards.find(card => card.contextId === session.id && card.text === expression.text);
          if (existing) {
            return {
              ...existing,
              meaning: expression.meaning || existing.meaning,
              explanation: expression.explanation || existing.explanation,
              aiImprovedSentence: expression.aiImprovedSentence || existing.aiImprovedSentence,
            };
          }

          return buildCardFromExpression(expression, session);
        });

        state.cards = [
          ...nextSelectedCards,
          ...state.cards.filter(card => card.contextId !== session.id || !selectedTexts.includes(card.text)),
        ];

        state.sessions[sessionIndex] = {
          ...session,
          selectedCardIds: nextSelectedCards.map(card => card.id),
        };

        await saveSpeechState(options.dataDir, state);

        return {
          success: true,
          data: {
            session: buildSessionDetail(state.sessions[sessionIndex], state.cards),
            ...buildDashboard(state),
          },
        };
      } catch (error: any) {
        fastify.log.error({ error, stack: error.stack, sessionId }, 'Failed to update speech card selection');
        return reply.code(500).send({
          success: false,
          error: error.message || 'Failed to update speech card selection',
        });
      }
    },
  );

  fastify.post<{ Params: { cardId: string } }>('/api/speech/cards/:cardId/review', async (request, reply) => {
    const { cardId } = request.params;

    try {
      const state = await loadSpeechState(options.dataDir);
      const cardIndex = state.cards.findIndex(card => card.id === cardId);
      if (cardIndex < 0) {
        return reply.code(404).send({
          success: false,
          error: 'Speech card not found.',
        });
      }

      state.cards[cardIndex] = {
        ...state.cards[cardIndex],
        review: computeNextReview(state.cards[cardIndex].review),
      };

      await saveSpeechState(options.dataDir, state);

      return {
        success: true,
        data: {
          card: state.cards[cardIndex],
          ...buildDashboard(state),
        },
      };
    } catch (error: any) {
      fastify.log.error({ error, stack: error.stack, cardId }, 'Failed to review speech card');
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to review speech card',
      });
    }
  });

  fastify.get<{ Params: { sessionId: string } }>('/api/speech/sessions/:sessionId/markdown', async (request, reply) => {
    const { sessionId } = request.params;

    try {
      const state = await loadSpeechState(options.dataDir);
      const session = state.sessions.find(item => item.id === sessionId);
      if (!session) {
        return reply.code(404).send({
          success: false,
          error: 'Speech session not found.',
        });
      }

      const markdown = buildMarkdown(buildSessionDetail(session, state.cards));
      reply.header('Content-Type', 'text/markdown; charset=utf-8');
      return reply.send(markdown);
    } catch (error: any) {
      fastify.log.error({ error, stack: error.stack, sessionId }, 'Failed to export speech markdown');
      return reply.code(500).send({
        success: false,
        error: error.message || 'Failed to export speech markdown',
      });
    }
  });
}

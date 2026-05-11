export const API_BASE_URL =
  import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? 'http://localhost:3000' : window.location.origin);

export type SpeechCorrection = {
  id: string;
  original: string;
  corrected: string;
  explanation: string;
  tip: string;
};

export type CandidateExpression = {
  text: string;
  meaning: string;
  explanation: string;
  aiImprovedSentence: string;
  recommended?: boolean;
};

export type TranscriptLine = {
  id: string;
  speakerTag: string;
  text: string;
  startMs: number | null;
  endMs: number | null;
  source: 'realtime' | 'manual' | 'transcribed';
};

export type SpeechCard = {
  id: string;
  text: string;
  type: 'speech';
  meaning: string;
  explanation: string;
  aiImprovedSentence: string;
  contextId: string;
  review: {
    status: 'new' | 'reviewing' | 'completed';
    reviewCount: number;
    createdAt: string;
    lastReviewedAt: string | null;
    nextReviewAt: string | null;
  };
};

export type SpeechSession = {
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
  selectedCards: SpeechCard[];
};

export type SpeechDashboard = {
  sessions: SpeechSession[];
  dueCards: SpeechCard[];
};

type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

async function readJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>;
}

async function parseResponse<T>(response: Response): Promise<ApiResponse<T>> {
  if (!response.ok) {
    let message = `HTTP error ${response.status}`;
    try {
      const errorData = await readJson<ApiResponse<T>>(response);
      message = errorData.error || message;
    } catch {
      // keep the generic message
    }
    throw new Error(message);
  }

  return readJson<ApiResponse<T>>(response);
}

export async function getSpeechDashboard(): Promise<SpeechDashboard> {
  const response = await fetch(`${API_BASE_URL}/api/speech/dashboard`);
  const payload = await parseResponse<SpeechDashboard>(response);
  if (!payload.success || !payload.data) {
    throw new Error(payload.error || 'Failed to load speech dashboard');
  }
  return payload.data;
}

export async function createSpeechSession(input: {
  transcript?: string;
  transcriptLines?: TranscriptLine[];
  audioDataUrl?: string;
  audioMimeType?: string;
  provider?: 'openai' | 'local';
  speakerTags?: string[];
}) {
  const response = await fetch(`${API_BASE_URL}/api/speech/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const payload = await parseResponse<{
    session: SpeechSession;
    sessions: SpeechSession[];
    dueCards: SpeechCard[];
  }>(response);

  if (!payload.success || !payload.data) {
    throw new Error(payload.error || 'Failed to create speech session');
  }

  return payload.data;
}

export async function updateSpeechTranscript(
  sessionId: string,
  input: {
    title?: string;
    transcriptLines: TranscriptLine[];
    speakerTags?: string[];
  },
) {
  const response = await fetch(`${API_BASE_URL}/api/speech/sessions/${sessionId}/transcript`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const payload = await parseResponse<{
    session: SpeechSession;
    sessions: SpeechSession[];
    dueCards: SpeechCard[];
  }>(response);

  if (!payload.success || !payload.data) {
    throw new Error(payload.error || 'Failed to update speech transcript');
  }

  return payload.data;
}

export async function updateSpeechSelection(sessionId: string, expressions: string[]) {
  const response = await fetch(`${API_BASE_URL}/api/speech/sessions/${sessionId}/selection`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ expressions }),
  });

  const payload = await parseResponse<{
    session: SpeechSession;
    sessions: SpeechSession[];
    dueCards: SpeechCard[];
  }>(response);

  if (!payload.success || !payload.data) {
    throw new Error(payload.error || 'Failed to update speech selection');
  }

  return payload.data;
}

export async function reviewSpeechCard(cardId: string) {
  const response = await fetch(`${API_BASE_URL}/api/speech/cards/${cardId}/review`, {
    method: 'POST',
  });

  const payload = await parseResponse<{
    card: SpeechCard;
    sessions: SpeechSession[];
    dueCards: SpeechCard[];
  }>(response);

  if (!payload.success || !payload.data) {
    throw new Error(payload.error || 'Failed to review speech card');
  }

  return payload.data;
}

export async function downloadSpeechMarkdown(sessionId: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/speech/sessions/${sessionId}/markdown`);
  if (!response.ok) {
    throw new Error(`Failed to export markdown: ${response.status}`);
  }
  return response.text();
}

export function resolveSpeechAssetUrl(urlOrPath: string | null): string | null {
  if (!urlOrPath) return null;
  if (urlOrPath.startsWith('/')) {
    return `${API_BASE_URL}${urlOrPath}`;
  }
  return urlOrPath;
}

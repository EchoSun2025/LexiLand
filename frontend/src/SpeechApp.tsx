import { useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react';
import './SpeechApp.css';
import {
  createSpeechSession,
  downloadSpeechMarkdown,
  getSpeechDashboard,
  resolveSpeechAssetUrl,
  reviewSpeechCard,
  updateSpeechSelection,
  updateSpeechTranscript,
  type SpeechCard,
  type SpeechDashboard,
  type SpeechSession,
  type TranscriptLine,
} from './speechApi';
import { SpeechRealtimeTranscriber } from './speechRealtime';

const DEFAULT_SPEAKER_TAGS = ['Teacher', 'Student A', 'Student B', 'Me'];
const MAX_SPEECH_CARDS = 3;
const SPEAKER_TONES = [
  { color: '#8a5b35', backgroundColor: 'rgba(232, 210, 190, 0.42)' },
  { color: '#21646e', backgroundColor: 'rgba(191, 229, 235, 0.42)' },
  { color: '#556a1c', backgroundColor: 'rgba(218, 234, 184, 0.45)' },
  { color: '#7c3362', backgroundColor: 'rgba(235, 199, 223, 0.42)' },
  { color: '#934b1a', backgroundColor: 'rgba(248, 211, 180, 0.44)' },
] as const;

type TranscriptScope = 'draft' | 'session';

type TranscriptContextMenuState = {
  scope: TranscriptScope;
  lineId: string;
  x: number;
  y: number;
  cursorPos: number;
};

function formatDate(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatDateTime(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleString();
}

function formatTimestamp(ms: number | null) {
  if (ms === null || !Number.isFinite(ms)) return '--:--';
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getSpeakerTone(index: number): CSSProperties {
  const tone = SPEAKER_TONES[index % SPEAKER_TONES.length];
  return {
    color: tone.color,
    backgroundColor: tone.backgroundColor,
  };
}

function groupSessionsByDate(sessions: SpeechSession[]) {
  const groups = new Map<string, SpeechSession[]>();
  sessions.forEach(session => {
    const key = formatDate(session.createdAt);
    const bucket = groups.get(key) || [];
    bucket.push(session);
    groups.set(key, bucket);
  });
  return Array.from(groups.entries());
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
        return;
      }
      reject(new Error('Failed to convert audio blob to data URL.'));
    };
    reader.onerror = () => reject(reader.error || new Error('Failed to read audio blob.'));
    reader.readAsDataURL(blob);
  });
}

function createLine(input: Partial<TranscriptLine> = {}): TranscriptLine {
  return {
    id: input.id || `line_${crypto.randomUUID().slice(0, 8)}`,
    speakerTag: input.speakerTag || DEFAULT_SPEAKER_TAGS[0],
    text: input.text || '',
    startMs: typeof input.startMs === 'number' ? input.startMs : null,
    endMs: typeof input.endMs === 'number' ? input.endMs : null,
    source: input.source || 'manual',
  };
}

function normalizeSpeakerTags(tags: string[]) {
  const cleaned = tags.map(tag => tag.trim()).filter(Boolean);
  const unique = Array.from(new Set(cleaned)).slice(0, 8);
  return unique.length > 0 ? unique : [...DEFAULT_SPEAKER_TAGS];
}

function normalizeLines(lines: TranscriptLine[], speakerTags: string[]) {
  const tags = normalizeSpeakerTags(speakerTags);
  return lines
    .map((line, index) => {
      const text = line.text.trim();
      if (!text) return null;

      const fallbackTag = tags[Math.min(index, tags.length - 1)] || tags[0] || DEFAULT_SPEAKER_TAGS[0];
      return createLine({
        ...line,
        text,
        speakerTag: tags.includes(line.speakerTag) ? line.speakerTag : fallbackTag,
      });
    })
    .filter((line): line is TranscriptLine => Boolean(line));
}

function seekAudio(audio: HTMLAudioElement | null, startMs: number | null) {
  if (!audio || startMs === null || !Number.isFinite(startMs)) return;
  audio.currentTime = Math.max(0, startMs / 1000);
  void audio.play().catch(() => {});
}

function replaceTag(lines: TranscriptLine[], previousTag: string, nextTag: string) {
  return lines.map(line => (
    line.speakerTag === previousTag
      ? { ...line, speakerTag: nextTag }
      : line
  ));
}

function resizeTextarea(element: HTMLTextAreaElement | null) {
  if (!element) return;
  element.style.height = '0px';
  element.style.height = `${Math.max(element.scrollHeight, 22)}px`;
}

function splitLineAtCursor(lines: TranscriptLine[], lineId: string, cursorPos: number) {
  const index = lines.findIndex(line => line.id === lineId);
  if (index < 0) return lines;

  const line = lines[index];
  const safeCursor = Math.max(0, Math.min(cursorPos, line.text.length));
  const before = line.text.slice(0, safeCursor).trimEnd();
  const after = line.text.slice(safeCursor).trimStart();
  const currentText = before || line.text.trim();
  const nextText = before && after ? after : '';

  const nextLine = createLine({
    speakerTag: line.speakerTag,
    text: nextText,
    startMs: line.endMs ?? line.startMs,
    endMs: line.endMs,
    source: 'manual',
  });

  return [
    ...lines.slice(0, index),
    { ...line, text: currentText },
    nextLine,
    ...lines.slice(index + 1),
  ];
}

function useSessionEditor(session: SpeechSession | null) {
  const [title, setTitle] = useState('');
  const [speakerTags, setSpeakerTags] = useState<string[]>([...DEFAULT_SPEAKER_TAGS]);
  const [lines, setLines] = useState<TranscriptLine[]>([]);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (!session) {
      setTitle('');
      setSpeakerTags([...DEFAULT_SPEAKER_TAGS]);
      setLines([]);
      setDirty(false);
      return;
    }

    setTitle(session.title);
    setSpeakerTags(normalizeSpeakerTags(session.speakerTags));
    setLines(session.transcriptLines.map(line => createLine(line)));
    setDirty(false);
  }, [session]);

  return {
    title,
    setTitle,
    speakerTags,
    setSpeakerTags,
    lines,
    setLines,
    dirty,
    setDirty,
  };
}

function SpeechApp() {
  const [sessions, setSessions] = useState<SpeechSession[]>([]);
  const [dueCards, setDueCards] = useState<SpeechCard[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedExpressions, setSelectedExpressions] = useState<string[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [savingSelection, setSavingSelection] = useState(false);
  const [savingTranscript, setSavingTranscript] = useState(false);
  const [reviewingCardId, setReviewingCardId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isRealtimeActive, setIsRealtimeActive] = useState(false);
  const [isRealtimeStarting, setIsRealtimeStarting] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [recordedAudioUrl, setRecordedAudioUrl] = useState<string | null>(null);
  const [recordedMimeType, setRecordedMimeType] = useState<string>('audio/webm');
  const [realtimeInterim, setRealtimeInterim] = useState('');
  const [draftSpeakerTags, setDraftSpeakerTags] = useState<string[]>([...DEFAULT_SPEAKER_TAGS]);
  const [draftLines, setDraftLines] = useState<TranscriptLine[]>([]);
  const [newDraftTag, setNewDraftTag] = useState('');
  const [newSessionTag, setNewSessionTag] = useState('');
  const [contextMenu, setContextMenu] = useState<TranscriptContextMenuState | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const realtimeRef = useRef<SpeechRealtimeTranscriber | null>(null);
  const draftAudioRef = useRef<HTMLAudioElement | null>(null);
  const sessionAudioRef = useRef<HTMLAudioElement | null>(null);
  const recordStartedAtRef = useRef<number | null>(null);
  const speechStartedAtRef = useRef<number | null>(null);
  const speechStoppedAtRef = useRef<number | null>(null);

  const canRecord = typeof window !== 'undefined'
    && typeof navigator !== 'undefined'
    && Boolean(navigator.mediaDevices?.getUserMedia)
    && typeof MediaRecorder !== 'undefined';
  const canRealtimeTranscribe = SpeechRealtimeTranscriber.isSupported();

  const currentSession = useMemo(
    () => sessions.find(session => session.id === currentSessionId) || sessions[0] || null,
    [currentSessionId, sessions],
  );
  const sessionEditor = useSessionEditor(currentSession);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        setLoading(true);
        const dashboard: SpeechDashboard = await getSpeechDashboard();
        if (cancelled) return;
        setSessions(dashboard.sessions);
        setDueCards(dashboard.dueCards);
        setCurrentSessionId(previous => previous || dashboard.sessions[0]?.id || null);
      } catch (loadError: any) {
        if (!cancelled) {
          setError(loadError.message || 'Failed to load speech data.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!currentSession) {
      setSelectedExpressions([]);
      return;
    }

    setSelectedExpressions(currentSession.selectedCards.map(card => card.text));
  }, [currentSession]);

  useEffect(() => {
    return () => {
      if (recordedAudioUrl) {
        URL.revokeObjectURL(recordedAudioUrl);
      }
      streamRef.current?.getTracks().forEach(track => track.stop());
      realtimeRef.current?.stop({ silent: true });
    };
  }, [recordedAudioUrl]);

  useEffect(() => {
    if (!contextMenu) return undefined;

    const closeMenu = () => setContextMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null);
      }
    };

    window.addEventListener('click', closeMenu);
    window.addEventListener('scroll', closeMenu, true);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('click', closeMenu);
      window.removeEventListener('scroll', closeMenu, true);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [contextMenu]);

  function currentRecordingOffsetMs() {
    if (recordStartedAtRef.current === null) return null;
    return Math.max(0, Math.round(performance.now() - recordStartedAtRef.current));
  }

  function resetDraftComposer() {
    setDraftLines([]);
    setRealtimeInterim('');
    setRecordedAudio(null);
    setRecordedMimeType('audio/webm');
    setRecordedAudioUrl(previousUrl => {
      if (previousUrl) {
        URL.revokeObjectURL(previousUrl);
      }
      return null;
    });
    speechStartedAtRef.current = null;
    speechStoppedAtRef.current = null;
  }

  async function startRecording() {
    if (!canRecord) {
      setError('This browser does not support in-browser recording. You can still add transcript lines manually.');
      return;
    }

    try {
      setError(null);
      setNotice(null);
      resetDraftComposer();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];
      recordStartedAtRef.current = performance.now();

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      setRecordedMimeType(recorder.mimeType || 'audio/webm');

      recorder.ondataavailable = event => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        setRecordedAudio(blob);
        setRecordedMimeType(blob.type || recorder.mimeType || 'audio/webm');
        setRecordedAudioUrl(previousUrl => {
          if (previousUrl) {
            URL.revokeObjectURL(previousUrl);
          }
          return URL.createObjectURL(blob);
        });
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;
        recordStartedAtRef.current = null;
      };

      recorder.start();
      setIsRecording(true);
      void startRealtimeTranscript();
    } catch (recordError: any) {
      setError(recordError.message || 'Failed to access microphone.');
    }
  }

  function stopRecording() {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current = null;
    setIsRecording(false);
    stopRealtimeTranscript();
  }

  async function startRealtimeTranscript() {
    if (!canRealtimeTranscribe) {
      return;
    }

    try {
      setRealtimeInterim('');
      setIsRealtimeStarting(true);

      if (!realtimeRef.current) {
        realtimeRef.current = new SpeechRealtimeTranscriber({
          onStatus: () => {},
          onInterim: text => {
            setRealtimeInterim(text);
          },
          onFinal: text => {
            const trimmed = text.trim();
            if (!trimmed) return;
            const startMs = speechStartedAtRef.current ?? currentRecordingOffsetMs();
            const endMs = speechStoppedAtRef.current ?? currentRecordingOffsetMs();
            setDraftLines(previous => [
              ...previous,
              createLine({
                speakerTag: draftSpeakerTags[0] || DEFAULT_SPEAKER_TAGS[0],
                text: trimmed,
                startMs,
                endMs,
                source: 'realtime',
              }),
            ]);
            setRealtimeInterim('');
            speechStartedAtRef.current = null;
            speechStoppedAtRef.current = null;
          },
          onEvent: eventName => {
            if (eventName === 'speech started') {
              speechStartedAtRef.current = currentRecordingOffsetMs();
            }
            if (eventName === 'speech stopped') {
              speechStoppedAtRef.current = currentRecordingOffsetMs();
            }
          },
          onError: runtimeError => {
            const message = runtimeError instanceof Error ? runtimeError.message : 'Realtime transcription failed.';
            setError(message);
            setRealtimeInterim('');
            setIsRealtimeActive(false);
            setIsRealtimeStarting(false);
          },
        });
      }

      await realtimeRef.current.start({
        language: 'en',
        prompt: 'Transcribe a live classroom or meeting. Keep each utterance short, clean, and lightly punctuated.',
      });

      setIsRealtimeActive(true);
    } catch (realtimeError: any) {
      setError(realtimeError.message || 'Failed to start realtime transcription.');
      setIsRealtimeActive(false);
    } finally {
      setIsRealtimeStarting(false);
    }
  }

  function stopRealtimeTranscript() {
    realtimeRef.current?.stop();
    setIsRealtimeActive(false);
    setIsRealtimeStarting(false);
    setRealtimeInterim('');
  }

  function updateDraftLine(lineId: string, patch: Partial<TranscriptLine>) {
    setDraftLines(previous => previous.map(line => (
      line.id === lineId
        ? { ...line, ...patch }
        : line
    )));
  }

  function addDraftLine() {
    setDraftLines(previous => [
      ...previous,
      createLine({
        speakerTag: draftSpeakerTags[0] || DEFAULT_SPEAKER_TAGS[0],
      }),
    ]);
  }

  function addDraftSpeakerTag() {
    const candidate = newDraftTag.trim();
    if (!candidate) return;
    setDraftSpeakerTags(previous => normalizeSpeakerTags([...previous, candidate]));
    setNewDraftTag('');
  }

  function renameDraftSpeakerTag(previousTag: string, nextTag: string) {
    const trimmed = nextTag.trim();
    if (!trimmed) return;

    setDraftSpeakerTags(previous => {
      const nextTags = normalizeSpeakerTags(previous.map(tag => (tag === previousTag ? trimmed : tag)));
      const resolved = nextTags.includes(trimmed) ? trimmed : nextTags[0];
      setDraftLines(lines => replaceTag(lines, previousTag, resolved));
      return nextTags;
    });
  }

  function removeDraftSpeakerTag(tagToRemove: string) {
    setDraftSpeakerTags(previous => {
      if (previous.length <= 1) return previous;
      const nextTags = previous.filter(tag => tag !== tagToRemove);
      const replacement = nextTags[0] || DEFAULT_SPEAKER_TAGS[0];
      setDraftLines(lines => replaceTag(lines, tagToRemove, replacement));
      return nextTags;
    });
  }

  function updateSessionLine(lineId: string, patch: Partial<TranscriptLine>) {
    sessionEditor.setLines(previous => previous.map(line => (
      line.id === lineId
        ? { ...line, ...patch }
        : line
    )));
    sessionEditor.setDirty(true);
  }

  function addSessionLine() {
    sessionEditor.setLines(previous => [
      ...previous,
      createLine({
        speakerTag: sessionEditor.speakerTags[0] || DEFAULT_SPEAKER_TAGS[0],
      }),
    ]);
    sessionEditor.setDirty(true);
  }

  function addSessionSpeakerTag() {
    const candidate = newSessionTag.trim();
    if (!candidate) return;
    sessionEditor.setSpeakerTags(previous => normalizeSpeakerTags([...previous, candidate]));
    sessionEditor.setDirty(true);
    setNewSessionTag('');
  }

  function renameSessionSpeakerTag(previousTag: string, nextTag: string) {
    const trimmed = nextTag.trim();
    if (!trimmed) return;

    sessionEditor.setSpeakerTags(previous => {
      const nextTags = normalizeSpeakerTags(previous.map(tag => (tag === previousTag ? trimmed : tag)));
      const resolved = nextTags.includes(trimmed) ? trimmed : nextTags[0];
      sessionEditor.setLines(lines => replaceTag(lines, previousTag, resolved));
      return nextTags;
    });
    sessionEditor.setDirty(true);
  }

  function removeSessionSpeakerTag(tagToRemove: string) {
    sessionEditor.setSpeakerTags(previous => {
      if (previous.length <= 1) return previous;
      const nextTags = previous.filter(tag => tag !== tagToRemove);
      const replacement = nextTags[0] || DEFAULT_SPEAKER_TAGS[0];
      sessionEditor.setLines(lines => replaceTag(lines, tagToRemove, replacement));
      return nextTags;
    });
    sessionEditor.setDirty(true);
  }

  function openTranscriptContextMenu(
    scope: TranscriptScope,
    line: TranscriptLine,
    event: ReactMouseEvent<HTMLElement>,
  ) {
    event.preventDefault();
    event.stopPropagation();

    const target = event.target as HTMLTextAreaElement | HTMLElement;
    const cursorPos = target instanceof HTMLTextAreaElement
      ? target.selectionStart ?? line.text.length
      : line.text.length;

    setContextMenu({
      scope,
      lineId: line.id,
      x: event.clientX,
      y: event.clientY,
      cursorPos,
    });
  }

  function splitDraftLine(lineId: string, cursorPos: number) {
    setDraftLines(previous => splitLineAtCursor(previous, lineId, cursorPos));
    setContextMenu(null);
  }

  function deleteDraftLine(lineId: string) {
    setDraftLines(previous => previous.filter(line => line.id !== lineId));
    setContextMenu(null);
  }

  function assignDraftSpeaker(lineId: string, speakerTag: string) {
    setDraftLines(previous => previous.map(line => (
      line.id === lineId
        ? { ...line, speakerTag }
        : line
    )));
    setContextMenu(null);
  }

  function splitSessionLine(lineId: string, cursorPos: number) {
    sessionEditor.setLines(previous => splitLineAtCursor(previous, lineId, cursorPos));
    sessionEditor.setDirty(true);
    setContextMenu(null);
  }

  function deleteSessionLine(lineId: string) {
    sessionEditor.setLines(previous => previous.filter(line => line.id !== lineId));
    sessionEditor.setDirty(true);
    setContextMenu(null);
  }

  function assignSessionSpeaker(lineId: string, speakerTag: string) {
    sessionEditor.setLines(previous => previous.map(line => (
      line.id === lineId
        ? { ...line, speakerTag }
        : line
    )));
    sessionEditor.setDirty(true);
    setContextMenu(null);
  }

  async function handleCreateSession() {
    const normalizedDraftLines = normalizeLines(draftLines, draftSpeakerTags);

    if (normalizedDraftLines.length === 0 && !recordedAudio) {
      setError('Add at least one transcript line or record audio before creating a session.');
      return;
    }

    try {
      setCreating(true);
      setError(null);
      setNotice(null);

      const audioDataUrl = recordedAudio ? await blobToDataUrl(recordedAudio) : undefined;
      const response = await createSpeechSession({
        transcript: normalizedDraftLines.map(line => line.text).join('\n') || undefined,
        transcriptLines: normalizedDraftLines.length > 0 ? normalizedDraftLines : undefined,
        speakerTags: draftSpeakerTags,
        audioDataUrl,
        audioMimeType: recordedMimeType || undefined,
        provider: 'openai',
      });

      setSessions(response.sessions);
      setDueCards(response.dueCards);
      setCurrentSessionId(response.session.id);
      resetDraftComposer();
      setNotice('Speech session created. Manual speaker tags and audio-linked lines are ready below.');
      setHistoryOpen(false);
    } catch (createError: any) {
      setError(createError.message || 'Failed to create speech session.');
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveTranscript() {
    if (!currentSession) return;

    const normalizedSessionLines = normalizeLines(sessionEditor.lines, sessionEditor.speakerTags);
    if (normalizedSessionLines.length === 0) {
      setError('At least one transcript line is required.');
      return;
    }

    try {
      setSavingTranscript(true);
      setError(null);
      setNotice(null);
      const response = await updateSpeechTranscript(currentSession.id, {
        title: sessionEditor.title.trim() || currentSession.title,
        transcriptLines: normalizedSessionLines,
        speakerTags: sessionEditor.speakerTags,
      });
      setSessions(response.sessions);
      setDueCards(response.dueCards);
      setCurrentSessionId(response.session.id);
      setNotice('Transcript lines and speaker tags saved.');
    } catch (saveError: any) {
      setError(saveError.message || 'Failed to save transcript.');
    } finally {
      setSavingTranscript(false);
    }
  }

  function toggleExpression(expression: string) {
    setNotice(null);
    setSelectedExpressions(previous => {
      if (previous.includes(expression)) {
        return previous.filter(item => item !== expression);
      }

      if (previous.length >= MAX_SPEECH_CARDS) {
        setNotice(`You can select up to ${MAX_SPEECH_CARDS} expressions.`);
        return previous;
      }

      return [...previous, expression];
    });
  }

  async function handleSaveSelection() {
    if (!currentSession) return;

    try {
      setSavingSelection(true);
      setError(null);
      setNotice(null);
      const response = await updateSpeechSelection(currentSession.id, selectedExpressions);
      setSessions(response.sessions);
      setDueCards(response.dueCards);
      setCurrentSessionId(response.session.id);
      setNotice('Speech card selection saved.');
    } catch (saveError: any) {
      setError(saveError.message || 'Failed to save speech card selection.');
    } finally {
      setSavingSelection(false);
    }
  }

  async function handleReviewCard(cardId: string) {
    try {
      setReviewingCardId(cardId);
      setError(null);
      const response = await reviewSpeechCard(cardId);
      setSessions(response.sessions);
      setDueCards(response.dueCards);
    } catch (reviewError: any) {
      setError(reviewError.message || 'Failed to update review state.');
    } finally {
      setReviewingCardId(null);
    }
  }

  async function handleExportMarkdown() {
    if (!currentSession) return;

    try {
      setExporting(true);
      setError(null);
      const markdown = await downloadSpeechMarkdown(currentSession.id);
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `speech-diary-${formatDate(currentSession.createdAt)}.md`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (exportError: any) {
      setError(exportError.message || 'Failed to export markdown.');
    } finally {
      setExporting(false);
    }
  }

  function renderSpeakerTags(
    speakerTags: string[],
    pendingTag: string,
    setPendingTag: (value: string) => void,
    onAdd: () => void,
    onRename: (previousTag: string, nextTag: string) => void,
    onRemove: (tag: string) => void,
  ) {
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {speakerTags.map((tag, index) => (
            <div key={tag} className="speech-tag-chip" style={getSpeakerTone(index)}>
              <input
                value={tag}
                onChange={event => onRename(tag, event.target.value)}
                className="speech-tag-input"
              />
              <button type="button" className="speech-tag-remove" onClick={() => onRemove(tag)}>
                x
              </button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            value={pendingTag}
            onChange={event => setPendingTag(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter') {
                event.preventDefault();
                onAdd();
              }
            }}
            placeholder="Add tag"
            className="speech-inline-input"
          />
          <button type="button" className="speech-soft-button" onClick={onAdd}>
            Add
          </button>
        </div>
      </div>
    );
  }

  function renderTranscriptLines(
    scope: TranscriptScope,
    lines: TranscriptLine[],
    speakerTags: string[],
    onLineChange: (lineId: string, patch: Partial<TranscriptLine>) => void,
    onSeek: (line: TranscriptLine) => void,
  ) {
    if (lines.length === 0) {
      return (
        <button
          type="button"
          className="speech-empty-lines"
          onClick={() => {
            if (scope === 'draft') {
              addDraftLine();
            } else {
              addSessionLine();
            }
          }}
        >
          No lines yet. Click to add the first line.
        </button>
      );
    }

    return (
      <div className="space-y-2">
        {lines.map(line => {
          const tagIndex = Math.max(0, speakerTags.indexOf(line.speakerTag));
          return (
            <div
              key={line.id}
              className="speech-line"
              onContextMenu={event => openTranscriptContextMenu(scope, line, event)}
            >
              <div className="speech-line-meta">
                <span className="speech-line-tag" style={getSpeakerTone(tagIndex)}>
                  {line.speakerTag}
                </span>
                <button
                  type="button"
                  className="speech-time-link"
                  onClick={() => onSeek(line)}
                  disabled={line.startMs === null}
                >
                  {formatTimestamp(line.startMs)}
                </button>
              </div>
              <textarea
                value={line.text}
                onChange={event => onLineChange(line.id, { text: event.target.value })}
                onInput={event => resizeTextarea(event.currentTarget)}
                ref={resizeTextarea}
                onContextMenu={event => openTranscriptContextMenu(scope, line, event)}
                className="speech-line-textarea"
                rows={1}
              />
            </div>
          );
        })}
      </div>
    );
  }

  function renderTranscriptContextMenu() {
    if (!contextMenu) return null;

    const speakerTags = contextMenu.scope === 'draft' ? draftSpeakerTags : sessionEditor.speakerTags;
    const onSplit = () => {
      if (contextMenu.scope === 'draft') {
        splitDraftLine(contextMenu.lineId, contextMenu.cursorPos);
        return;
      }
      splitSessionLine(contextMenu.lineId, contextMenu.cursorPos);
    };
    const onDelete = () => {
      if (contextMenu.scope === 'draft') {
        deleteDraftLine(contextMenu.lineId);
        return;
      }
      deleteSessionLine(contextMenu.lineId);
    };
    const onAssignSpeaker = (speakerTag: string) => {
      if (contextMenu.scope === 'draft') {
        assignDraftSpeaker(contextMenu.lineId, speakerTag);
        return;
      }
      assignSessionSpeaker(contextMenu.lineId, speakerTag);
    };

    return (
      <div
        className="speech-context-menu"
        style={{ left: contextMenu.x, top: contextMenu.y }}
        onClick={event => event.stopPropagation()}
      >
        <button type="button" className="speech-context-item" onClick={onSplit}>
          Split here
        </button>
        <button type="button" className="speech-context-item is-danger" onClick={onDelete}>
          Delete line
        </button>
        <div className="speech-context-label">Speaker</div>
        <div className="speech-context-speakers">
          {speakerTags.map((tag, index) => (
            <button
              key={tag}
              type="button"
              className="speech-context-speaker"
              style={getSpeakerTone(index)}
              onClick={() => onAssignSpeaker(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="speech-shell">
      <div className="speech-layout">
        <aside className="speech-sidebar speech-scroll p-5" data-open={historyOpen}>
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.22em] text-amber-700">Lexiland</div>
              <h1 className="speech-title text-3xl font-semibold text-stone-900">Live Notes</h1>
            </div>
            <button
              type="button"
              className="rounded-full border border-stone-300 px-3 py-1 text-xs text-stone-700 md:hidden"
              onClick={() => setHistoryOpen(false)}
            >
              Close
            </button>
          </div>

          <div className="speech-card mb-5 p-4">
            <div className="text-sm font-semibold text-stone-900">Review Queue</div>
            <div className="mt-1 text-xs text-stone-500">Due cards from your speaking practice.</div>
            <div className="mt-4 text-3xl font-semibold text-orange-700">{dueCards.length}</div>
          </div>

          <div className="mb-3 text-xs uppercase tracking-[0.18em] text-stone-500">History</div>
          <div className="space-y-4">
            {groupSessionsByDate(sessions).map(([date, items]) => (
              <div key={date}>
                <div className="mb-2 text-xs font-semibold text-stone-500">{date}</div>
                <div className="space-y-2">
                  {items.map(session => (
                    <button
                      key={session.id}
                      type="button"
                      className={`speech-card speech-fade-in w-full p-3 text-left transition ${
                        currentSession?.id === session.id ? 'border-orange-300 bg-orange-50/80' : ''
                      }`}
                      onClick={() => {
                        setCurrentSessionId(session.id);
                        setHistoryOpen(false);
                      }}
                    >
                      <div className="text-sm font-semibold text-stone-900">{session.title}</div>
                      <div className="mt-1 text-xs text-stone-500">
                        {session.transcriptLines.length} lines · {session.selectedCards.length} cards
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}

            {!loading && sessions.length === 0 && (
              <div className="text-sm text-stone-500">No speech sessions yet.</div>
            )}
          </div>
        </aside>

        <main className="speech-main">
          <div className="mx-auto max-w-6xl">
            <div className="mb-4 flex items-center justify-between md:hidden">
              <button
                type="button"
                className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-700"
                onClick={() => setHistoryOpen(true)}
              >
                History
              </button>
              <div className="text-xs uppercase tracking-[0.18em] text-stone-500">Speech Module</div>
            </div>

            {(notice || error) && (
              <div
                className={`speech-card mb-4 p-4 text-sm ${
                  error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                }`}
              >
                {error || notice}
              </div>
            )}

            <section className="speech-card speech-hero mb-6 p-6">
              <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      className={`rounded-2xl px-5 py-3 text-sm font-semibold text-white ${
                        isRecording ? 'bg-stone-700' : 'bg-orange-600 hover:bg-orange-700'
                      }`}
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={isRealtimeStarting}
                    >
                      {isRecording ? 'Stop' : 'Record'}
                    </button>
                    <button
                      type="button"
                      className="rounded-2xl border border-stone-300 bg-white px-5 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                      onClick={handleCreateSession}
                      disabled={creating || isRecording}
                    >
                      {creating ? 'Analyzing...' : 'Create Session'}
                    </button>
                  </div>

                  <div className="flex-1">
                    {recordedAudioUrl ? (
                      <audio ref={draftAudioRef} controls className="w-full min-w-0" src={recordedAudioUrl} />
                    ) : (
                      <div className="h-14 rounded-2xl border border-stone-200 bg-white/70" />
                    )}
                  </div>
                </div>

                <div className="speech-realtime-panel">
                  <div className="flex items-center gap-3">
                    <div className={`speech-live-dot ${isRealtimeActive ? 'is-live' : ''}`} />
                    <div className="text-sm font-semibold text-stone-800">
                      {isRecording ? 'Live capture active' : 'Ready for live capture'}
                    </div>
                    <div className="text-xs uppercase tracking-[0.16em] text-stone-500">speaker mode later</div>
                  </div>
                  <div className="mt-2 text-sm text-stone-600">
                    Right-click a line to split it, switch speaker, or delete it.
                  </div>
                  {realtimeInterim.trim() && (
                    <div className="mt-4 rounded-2xl bg-white/85 px-4 py-3 text-sm italic text-stone-700">
                      {realtimeInterim}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <section className="speech-card mb-6 p-6">
              <div>
                <div className="text-lg font-semibold text-stone-900">Draft Transcript</div>
                <div className="mt-1 text-sm text-stone-500">
                  Compact classroom-note layout. Speaker tag and time stay small; the line text stays dense.
                </div>
              </div>

              <div className="mt-4">
                {renderSpeakerTags(
                  draftSpeakerTags,
                  newDraftTag,
                  setNewDraftTag,
                  addDraftSpeakerTag,
                  renameDraftSpeakerTag,
                  removeDraftSpeakerTag,
                )}
              </div>

              <div className="mt-5">
                {renderTranscriptLines(
                  'draft',
                  draftLines,
                  draftSpeakerTags,
                  updateDraftLine,
                  line => seekAudio(draftAudioRef.current, line.startMs),
                )}
              </div>
            </section>

            {loading ? (
              <div className="speech-card p-8 text-sm text-stone-500">Loading speech dashboard...</div>
            ) : currentSession ? (
              <div className="grid gap-6 xl:grid-cols-[1.5fr_0.7fr]">
                <section className="space-y-6">
                  <div className="speech-card p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-xs uppercase tracking-[0.18em] text-stone-500">{formatDate(currentSession.createdAt)}</div>
                        <input
                          value={sessionEditor.title}
                          onChange={event => {
                            sessionEditor.setTitle(event.target.value);
                            sessionEditor.setDirty(true);
                          }}
                          className="speech-title mt-2 w-full bg-transparent text-3xl font-semibold text-stone-900 outline-none"
                        />
                        <div className="mt-2 text-sm text-stone-500">{formatDateTime(currentSession.createdAt)}</div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className="rounded-2xl border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50"
                          onClick={handleExportMarkdown}
                          disabled={exporting}
                        >
                          {exporting ? 'Exporting...' : 'Export Markdown'}
                        </button>
                        <button
                          type="button"
                          className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
                          onClick={handleSaveTranscript}
                          disabled={savingTranscript || !sessionEditor.dirty}
                        >
                          {savingTranscript ? 'Saving...' : 'Save Transcript'}
                        </button>
                      </div>
                    </div>

                    {currentSession.audioUrl && (
                      <div className="mt-5">
                        <audio
                          ref={sessionAudioRef}
                          controls
                          className="w-full"
                          src={resolveSpeechAssetUrl(currentSession.audioUrl) || undefined}
                        />
                      </div>
                    )}
                  </div>

                  <div className="speech-card p-6">
                    <div>
                      <div className="text-lg font-semibold text-stone-900">Transcript Lines</div>
                      <div className="mt-1 text-sm text-stone-500">
                        Right-click a line to split, switch speaker, or delete it.
                      </div>
                    </div>

                    <div className="mt-4">
                      {renderSpeakerTags(
                        sessionEditor.speakerTags,
                        newSessionTag,
                        setNewSessionTag,
                        addSessionSpeakerTag,
                        renameSessionSpeakerTag,
                        removeSessionSpeakerTag,
                      )}
                    </div>

                    <div className="mt-5">
                      {renderTranscriptLines(
                        'session',
                        sessionEditor.lines,
                        sessionEditor.speakerTags,
                        updateSessionLine,
                        line => seekAudio(sessionAudioRef.current, line.startMs),
                      )}
                    </div>
                  </div>

                  <div className="speech-card p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-lg font-semibold text-stone-900">Corrections</div>
                        <div className="mt-1 text-sm text-stone-500">Focused on speaking mistakes and unnatural phrasing.</div>
                      </div>
                    </div>

                    <div className="mt-5 space-y-4">
                      {currentSession.allCorrections.length === 0 ? (
                        <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-500">
                          No major corrections were flagged for this session.
                        </div>
                      ) : (
                        currentSession.allCorrections.map(correction => (
                          <div key={correction.id} className="rounded-3xl border border-stone-200 bg-white px-5 py-4">
                            <div className="text-sm font-semibold text-stone-900">{correction.original}</div>
                            <div className="mt-2 text-sm text-emerald-700">{correction.corrected}</div>
                            <div className="mt-3 text-sm leading-7 text-stone-600">{correction.explanation}</div>
                            <div className="mt-2 text-xs uppercase tracking-[0.14em] text-orange-700">Tip</div>
                            <div className="mt-1 text-sm text-stone-600">{correction.tip}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="speech-card p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <div className="text-lg font-semibold text-stone-900">Choose 3 Expressions</div>
                        <div className="mt-1 text-sm text-stone-500">Tap to toggle. Maximum 3 speech cards per session.</div>
                      </div>
                      <button
                        type="button"
                        className="rounded-2xl bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-60"
                        onClick={handleSaveSelection}
                        disabled={savingSelection}
                      >
                        {savingSelection ? 'Saving...' : 'Save Speech Cards'}
                      </button>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      {currentSession.candidateExpressions.map(expression => {
                        const isSelected = selectedExpressions.includes(expression.text);
                        return (
                          <button
                            key={expression.text}
                            type="button"
                            className="speech-chip px-4 py-3 text-left text-sm text-stone-800"
                            data-selected={isSelected}
                            data-recommended={expression.recommended ? 'true' : undefined}
                            onClick={() => toggleExpression(expression.text)}
                          >
                            <div className="font-semibold">{expression.text}</div>
                            <div className="mt-1 text-xs text-stone-500">{expression.meaning}</div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-6 space-y-3">
                      {currentSession.candidateExpressions.map(expression => (
                        <div key={`${expression.text}-detail`} className="rounded-3xl border border-stone-200 bg-stone-50 px-4 py-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-semibold text-stone-900">{expression.text}</div>
                            {expression.recommended && (
                              <div className="rounded-full bg-orange-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-orange-700">
                                Recommended
                              </div>
                            )}
                          </div>
                          <div className="mt-2 text-sm text-stone-600">{expression.explanation}</div>
                          <div className="mt-2 text-sm text-stone-500">Meaning: {expression.meaning}</div>
                          <div className="mt-2 text-sm italic text-stone-700">{expression.aiImprovedSentence}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <aside className="space-y-6">
                  <div className="speech-card p-6">
                    <div className="text-lg font-semibold text-stone-900">Speech Cards</div>
                    <div className="mt-1 text-sm text-stone-500">Saved expressions from the current session.</div>

                    <div className="mt-5 space-y-4">
                      {currentSession.selectedCards.length === 0 ? (
                        <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-500">
                          No speech cards saved yet.
                        </div>
                      ) : (
                        currentSession.selectedCards.map(card => (
                          <div key={card.id} className="rounded-3xl border border-stone-200 bg-white px-4 py-4">
                            <div className="text-base font-semibold text-stone-900">{card.text}</div>
                            <div className="mt-2 text-sm text-stone-600">Meaning: {card.meaning}</div>
                            <div className="mt-2 text-sm leading-7 text-stone-600">{card.explanation}</div>
                            <div className="mt-3 rounded-2xl bg-stone-50 px-3 py-3 text-sm italic text-stone-700">
                              {card.aiImprovedSentence}
                            </div>
                            <div className="mt-3 text-xs text-stone-500">
                              Review: {card.review.status} · next {card.review.nextReviewAt || 'completed'}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="speech-card p-6">
                    <div className="text-lg font-semibold text-stone-900">Review Schedule</div>
                    <div className="mt-1 text-sm text-stone-500">Day 2, Day 4, Day 7 review rhythm for speech cards.</div>

                    <div className="mt-5 space-y-4">
                      {dueCards.length === 0 ? (
                        <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-500">
                          No cards due right now.
                        </div>
                      ) : (
                        dueCards.map(card => (
                          <div key={card.id} className="rounded-3xl border border-stone-200 bg-white px-4 py-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="text-sm font-semibold text-stone-900">{card.text}</div>
                                <div className="mt-1 text-xs text-stone-500">Due: {card.review.nextReviewAt}</div>
                              </div>
                              <button
                                type="button"
                                className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                onClick={() => handleReviewCard(card.id)}
                                disabled={reviewingCardId === card.id}
                              >
                                {reviewingCardId === card.id ? 'Updating...' : 'Reviewed'}
                              </button>
                            </div>
                            <div className="mt-3 text-sm text-stone-600">{card.meaning}</div>
                            <div className="mt-2 text-sm italic text-stone-700">{card.aiImprovedSentence}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </aside>
              </div>
            ) : (
              <div className="speech-card p-8 text-sm text-stone-500">
                Create your first speech session to see transcript analysis, manual speaker tags, and review cards.
              </div>
            )}
          </div>
        </main>
      </div>

      {historyOpen && (
        <button
          type="button"
          aria-label="Close history drawer"
          className="fixed inset-0 z-20 bg-stone-900/25 md:hidden"
          onClick={() => setHistoryOpen(false)}
        />
      )}

      {renderTranscriptContextMenu()}
    </div>
  );
}

export default SpeechApp;

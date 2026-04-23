import { useEffect, useRef, useState } from 'react';
import { addCardNote, getCardNotes, type CardNote } from '../db';
import { requestCardNoteReply } from '../api';

interface CardNotesProps {
  cardType: CardNote['cardType'];
  cardKey: string;
  cardText: string;
  context?: string;
}

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: any) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export default function CardNotes({ cardType, cardKey, cardText, context }: CardNotesProps) {
  const [notes, setNotes] = useState<CardNote[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getCardNotes(cardType, cardKey).then((items) => {
      if (!cancelled) setNotes(items);
    });
    return () => {
      cancelled = true;
      recognitionRef.current?.stop();
    };
  }, [cardType, cardKey]);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || isSending) return;

    setIsSending(true);
    setDraft('');

    try {
      const userNote = await addCardNote({
        cardType,
        cardKey,
        role: 'user',
        content,
      });
      const nextNotes = [...notes, userNote];
      setNotes(nextNotes);

      const result = await requestCardNoteReply(
        cardType,
        cardText,
        content,
        nextNotes.map(({ role, content }) => ({ role, content })),
        context,
      );

      if (!result.success || !result.data?.reply) {
        throw new Error(result.error || 'Failed to get AI reply');
      }

      const assistantNote = await addCardNote({
        cardType,
        cardKey,
        role: 'assistant',
        content: result.data.reply,
      });
      setNotes([...nextNotes, assistantNote]);
    } catch (error: any) {
      const assistantNote = await addCardNote({
        cardType,
        cardKey,
        role: 'assistant',
        content: error?.message || 'AI reply failed.',
      });
      setNotes((prev) => [...prev, assistantNote]);
    } finally {
      setIsSending(false);
    }
  };

  const toggleVoiceInput = () => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition: SpeechRecognitionLike = new SpeechRecognitionCtor();
    recognition.lang = 'zh-CN';
    recognition.interimResults = false;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0]?.transcript || '')
        .join('')
        .trim();
      if (transcript) {
        setDraft((prev) => `${prev}${prev ? ' ' : ''}${transcript}`);
      }
    };
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  };

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="text-xs font-semibold text-muted mb-2">Notes</div>
      {notes.length > 0 && (
        <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
          {notes.map((note) => (
            <div
              key={note.id}
              className={`text-xs rounded-lg px-3 py-2 leading-relaxed ${
                note.role === 'user'
                  ? 'bg-blue-50 text-blue-900'
                  : 'bg-gray-50 text-gray-800 border border-gray-100'
              }`}
            >
              <div className="font-semibold mb-0.5">{note.role === 'user' ? 'You' : 'AI'}</div>
              <div>{note.content}</div>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
              void handleSend();
            }
          }}
          placeholder="Ask about this card..."
          className="flex-1 min-h-[52px] px-3 py-2 text-xs border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
        />
        <div className="flex flex-col gap-2">
          <button
            onClick={toggleVoiceInput}
            className={`w-9 h-7 rounded-lg border text-xs ${
              isListening
                ? 'border-red-300 bg-red-50 text-red-700'
                : 'border-border bg-white hover:bg-hover'
            }`}
            title="Voice input"
          >
            Mic
          </button>
          <button
            onClick={() => void handleSend()}
            disabled={!draft.trim() || isSending}
            className="w-9 h-7 rounded-lg bg-blue-600 text-white text-xs disabled:bg-gray-300"
            title="Send note"
          >
            {isSending ? '...' : 'AI'}
          </button>
        </div>
      </div>
    </div>
  );
}

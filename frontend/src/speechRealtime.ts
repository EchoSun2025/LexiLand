import { API_BASE_URL } from './speechApi';

const DEFAULT_API_BASE_URL = API_BASE_URL;
const DEFAULT_SESSION_PATH = '/api/speech/realtime/session';

function normalizeLanguage(value?: string) {
  return String(value || 'en').trim().slice(0, 2).toLowerCase() || 'en';
}

type RealtimeSpeechOptions = {
  apiBaseUrl?: string;
  sessionPath?: string;
  language?: string;
  prompt?: string;
  model?: string;
  onStatus?: (status: string) => void;
  onInterim?: (text: string, event?: unknown) => void;
  onFinal?: (text: string, event?: unknown) => void;
  onEvent?: (event: string, payload?: unknown) => void;
  onError?: (error: unknown) => void;
};

export class SpeechRealtimeTranscriber {
  private apiBaseUrl: string;
  private sessionPath: string;
  private onStatus: NonNullable<RealtimeSpeechOptions['onStatus']>;
  private onInterim: NonNullable<RealtimeSpeechOptions['onInterim']>;
  private onFinal: NonNullable<RealtimeSpeechOptions['onFinal']>;
  private onEvent: NonNullable<RealtimeSpeechOptions['onEvent']>;
  private onError: NonNullable<RealtimeSpeechOptions['onError']>;
  private language: string;
  private prompt: string;
  private model: string;
  private peerConnection: RTCPeerConnection | null;
  private dataChannel: RTCDataChannel | null;
  private mediaStream: MediaStream | null;
  private isActive: boolean;
  private isStarting: boolean;
  private interimByItemId: Map<string, string>;

  constructor(options: RealtimeSpeechOptions = {}) {
    this.apiBaseUrl = options.apiBaseUrl || DEFAULT_API_BASE_URL;
    this.sessionPath = options.sessionPath || DEFAULT_SESSION_PATH;
    this.onStatus = options.onStatus || (() => {});
    this.onInterim = options.onInterim || (() => {});
    this.onFinal = options.onFinal || (() => {});
    this.onEvent = options.onEvent || (() => {});
    this.onError = options.onError || (() => {});
    this.language = normalizeLanguage(options.language);
    this.prompt = options.prompt || '';
    this.model = options.model || '';
    this.peerConnection = null;
    this.dataChannel = null;
    this.mediaStream = null;
    this.isActive = false;
    this.isStarting = false;
    this.interimByItemId = new Map();
  }

  static isSupported() {
    return Boolean(window.RTCPeerConnection && navigator.mediaDevices?.getUserMedia);
  }

  updateConfig(options: Pick<RealtimeSpeechOptions, 'language' | 'prompt' | 'model'> = {}) {
    if (options.language) {
      this.language = normalizeLanguage(options.language);
    }

    if (typeof options.prompt === 'string') {
      this.prompt = options.prompt;
    }

    if (typeof options.model === 'string') {
      this.model = options.model;
    }
  }

  async start(options: Pick<RealtimeSpeechOptions, 'language' | 'prompt' | 'model'> = {}) {
    if (this.isActive || this.isStarting) return;
    if (!SpeechRealtimeTranscriber.isSupported()) {
      throw new Error('Realtime speech is not supported in this browser.');
    }

    this.updateConfig(options);
    this.isStarting = true;
    this.interimByItemId.clear();
    this.onStatus('Connecting realtime transcription...');
    this.onEvent('requesting microphone...');

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.onEvent('microphone connected');

      this.peerConnection = new RTCPeerConnection();
      this.mediaStream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.mediaStream!);
      });

      this.dataChannel = this.peerConnection.createDataChannel('oai-events');
      this.attachPeerConnectionListeners();
      this.attachDataChannelListeners();

      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      const response = await fetch(`${this.apiBaseUrl}${this.sessionPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sdp: this.peerConnection.localDescription?.sdp || offer.sdp,
          language: this.language,
          prompt: this.prompt,
          ...(this.model ? { model: this.model } : {}),
        }),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || `Realtime session failed (${response.status})`);
      }

      await this.peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: result.data?.sdp,
      });

      this.isActive = true;
      this.onStatus('Realtime transcription connected');
        this.onEvent(`session ready (${result.data?.model || 'default model'})`, result.data);
    } catch (error) {
      this.cleanupResources();
      this.onError(error);
      throw error;
    } finally {
      this.isStarting = false;
    }
  }

  stop(options: { silent?: boolean } = {}) {
    const { silent = false } = options;
    if (!this.peerConnection && !this.mediaStream && !this.dataChannel) return;

    this.cleanupResources();
    if (!silent) {
      this.onStatus('Realtime transcription stopped');
    }
  }

  private attachPeerConnectionListeners() {
    this.peerConnection?.addEventListener('connectionstatechange', () => {
      const state = this.peerConnection?.connectionState;
      if (state) {
      this.onEvent(`peer connection: ${state}`, { connectionState: state });
      }
    });
  }

  private attachDataChannelListeners() {
    this.dataChannel?.addEventListener('open', () => {
      this.onEvent('data channel open');
      this.onStatus('Listening live...');
    });

    this.dataChannel?.addEventListener('close', () => {
      this.onEvent('data channel closed');
    });

    this.dataChannel?.addEventListener('error', event => {
      const message = (event as RTCErrorEvent).error?.message || 'Realtime data channel failed.';
      this.onError(new Error(message));
    });

    this.dataChannel?.addEventListener('message', event => {
      this.handleRealtimeEvent(event.data);
    });
  }

  private handleRealtimeEvent(rawEvent: string) {
    let parsedEvent: any;
    try {
      parsedEvent = JSON.parse(rawEvent);
    } catch {
      this.onEvent(`non-json event: ${String(rawEvent).slice(0, 80)}`, rawEvent);
      return;
    }

    const type = parsedEvent.type || 'unknown';
    switch (type) {
      case 'session.created':
        this.onEvent('session created', parsedEvent);
        break;
      case 'session.updated':
      case 'transcription_session.updated':
        this.onEvent('session updated', parsedEvent);
        break;
      case 'input_audio_buffer.speech_started':
        this.onStatus('Speech detected...');
        this.onEvent('speech started', parsedEvent);
        break;
      case 'input_audio_buffer.speech_stopped':
        this.onStatus('Processing speech...');
        this.onEvent('speech stopped', parsedEvent);
        break;
      case 'conversation.item.input_audio_transcription.delta': {
        const previous = this.interimByItemId.get(parsedEvent.item_id) || '';
        const next = previous + (parsedEvent.delta || '');
        this.interimByItemId.set(parsedEvent.item_id, next);
        this.onInterim(next, parsedEvent);
        break;
      }
      case 'conversation.item.input_audio_transcription.completed': {
        const finalTranscript = (
          parsedEvent.transcript
          || this.interimByItemId.get(parsedEvent.item_id)
          || ''
        ).trim();
        this.interimByItemId.delete(parsedEvent.item_id);
        this.onInterim('', parsedEvent);
        this.onFinal(finalTranscript, parsedEvent);
        break;
      }
      case 'error': {
        const message = parsedEvent.error?.message
          || parsedEvent.message
          || 'Realtime transcription error.';
        this.onError(new Error(message));
        break;
      }
      default:
        this.onEvent(type, parsedEvent);
    }
  }

  private cleanupResources() {
    this.isActive = false;
    this.isStarting = false;
    this.interimByItemId.clear();

    if (this.dataChannel) {
      try {
        this.dataChannel.close();
      } catch {}
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch {}
      this.peerConnection = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
  }
}

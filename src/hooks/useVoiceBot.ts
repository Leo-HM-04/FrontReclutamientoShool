'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

// ── Tipos ───────────────────────────────────────────────────────────────────

export type BotState =
  | 'loading'       // Cargando info de la sesión
  | 'ready'         // Listo para empezar (mostrar pantalla de bienvenida)
  | 'speaking'      // El bot está leyendo la pregunta en voz alta
  | 'listening'     // Escuchando al candidato
  | 'processing'    // Guardando respuesta, esperando siguiente pregunta
  | 'completed'     // Entrevista terminada
  | 'already_done'  // Ya fue completada antes
  | 'error';        // Error irrecuperable

export type RecordingMode = 'raw' | 'composite';
export type TabAudioCaptureStatus = 'idle' | 'requesting' | 'granted' | 'missing' | 'unsupported';

export interface AudioInputDeviceOption {
  deviceId: string;
  label: string;
  isDefault: boolean;
  isVirtual: boolean;
}

export interface AudioInputRefreshResult {
  audioInputs: AudioInputDeviceOption[];
  audioOutputs: string[];
  bluetoothOutputOnlyLabels: string[];
}

export interface SessionInfo {
  candidateName: string;
  jobTitle: string;
  totalQuestions: number;
  currentIndex: number;
  interviewType: string;
}

export interface VoiceBotState {
  botState: BotState;
  sessionInfo: SessionInfo | null;
  currentQuestion: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  isFollowUpQuestion: boolean;
  isGeminiThinking: boolean;
  transcript: string;
  liveTranscript: string;   // Texto transcrito y listo para revisar/enviar
  isUserSpeaking: boolean;  // true cuando el candidato habla activamente
  audioLevel: number;       // Nivel de audio 0-1 para animar las barras
  error: string;
  speechError: string;       // Error de reconocimiento de voz (visible al usuario)
  speechSupported: boolean;
  forceManualInput: boolean;
  isTranscribing: boolean;   // Subiendo audio al backend para transcribir (modo fallback)
  isMuted: boolean;
  isMicMuted: boolean;
  isCameraOn: boolean;
  cameraStream: MediaStream | null;
  isRecording: boolean;
  recordingUploading: boolean;
  recordingMode: RecordingMode | 'none';
  tabAudioCaptureStatus: TabAudioCaptureStatus;
  isCapturing: boolean;     // true cuando el candidato presionó "Hablar" y el mic está activo
  audioInputDevices: AudioInputDeviceOption[];
  selectedAudioInputId: string;
  // Acciones
  startInterview: () => void;
  submitAnswer: (text: string) => void;
  finishEarly: () => void;
  toggleMute: () => void;
  toggleMicMute: () => void;
  toggleCamera: () => void;
  retryListening: () => void;
  refreshAudioInputs: () => Promise<AudioInputRefreshResult>;
  selectAudioInput: (deviceId: string) => Promise<void>;
  startCapture: () => void;  // Candidato presiona "Hablar"
  stopCapture: () => void;   // Candidato presiona "Detener" (sin enviar)
}

const MIN_GEMINI_THINKING_MS = 900;
const AUDIO_INPUT_STORAGE_KEY = 'voicebot:selected-audio-input';
const VIRTUAL_AUDIO_INPUT_KEYWORDS = [
  'steam streaming',
  'steam',
  'virtual',
  'vb-audio',
  'voicemeeter',
  'blackhole',
  'loopback',
  'cable',
  'null',
  'fake',
];
const BLUETOOTH_AUDIO_HINT_KEYWORDS = [
  'bluetooth',
  'headphone',
  'headset',
  'earbud',
  'earbuds',
  'buds',
  'airpods',
  'hands-free',
  'handsfree',
  'ag audio',
];
const GENERIC_AUDIO_DEVICE_TOKENS = new Set([
  'default',
  'communications',
  'predeterminado',
  'comunicaciones',
  'microphone',
  'micrófono',
  'headphone',
  'headphones',
  'headset',
  'bluetooth',
  'audio',
  'device',
  'array',
  'stereo',
  'hands',
  'free',
]);

function isProbablyVirtualAudioInput(label: string): boolean {
  const normalizedLabel = (label || '').trim().toLowerCase();
  if (!normalizedLabel) return false;
  return VIRTUAL_AUDIO_INPUT_KEYWORDS.some((keyword) => normalizedLabel.includes(keyword));
}

function normalizeAudioDeviceLabel(label: string): string {
  return (label || '')
    .toLowerCase()
    .replace(/^predeterminado\s*-\s*/i, '')
    .replace(/^comunicaciones\s*-\s*/i, '')
    .replace(/^default\s*-\s*/i, '')
    .replace(/^communications\s*-\s*/i, '')
    .trim();
}

function extractRelevantAudioTokens(label: string): string[] {
  return normalizeAudioDeviceLabel(label)
    .split(/[^a-z0-9áéíóúñü]+/i)
    .filter((token) => token.length >= 4 && !GENERIC_AUDIO_DEVICE_TOKENS.has(token));
}

function deviceLabelsLookRelated(labelA: string, labelB: string): boolean {
  const tokensA = extractRelevantAudioTokens(labelA);
  const tokensB = new Set(extractRelevantAudioTokens(labelB));
  return tokensA.some((token) => tokensB.has(token));
}

function findBluetoothOutputOnlyLabels(
  outputs: MediaDeviceInfo[],
  inputs: AudioInputDeviceOption[],
): string[] {
  return outputs
    .filter((device) => {
      const normalizedOutput = normalizeAudioDeviceLabel(device.label);
      if (!BLUETOOTH_AUDIO_HINT_KEYWORDS.some((keyword) => normalizedOutput.includes(keyword))) {
        return false;
      }

      return !inputs.some((input) => deviceLabelsLookRelated(input.label, device.label));
    })
    .map((device) => device.label.trim())
    .filter(Boolean);
}

function describeAudioInput(device: MediaDeviceInfo, index: number): AudioInputDeviceOption {
  const isDefault = device.deviceId === 'default';
  const isCommunications = device.deviceId === 'communications';
  const fallbackLabel = isDefault
    ? 'Predeterminado del navegador'
    : isCommunications
    ? 'Micrófono de comunicaciones'
    : `Micrófono ${index + 1}`;
  const label = (device.label || fallbackLabel).trim() || fallbackLabel;

  return {
    deviceId: device.deviceId,
    label,
    isDefault,
    isVirtual: isProbablyVirtualAudioInput(label),
  };
}

function pickPreferredAudioInput(
  devices: AudioInputDeviceOption[],
  requestedDeviceId = '',
): AudioInputDeviceOption | null {
  if (!devices.length) return null;
  if (requestedDeviceId) {
    const requested = devices.find((device) => device.deviceId === requestedDeviceId);
    if (requested) return requested;
  }

  return devices.find((device) => !device.isVirtual && !device.isDefault && device.deviceId !== 'communications')
    || devices.find((device) => !device.isVirtual && device.deviceId !== 'communications')
    || devices.find((device) => device.deviceId !== 'communications')
    || devices[0];
}

function buildAudioInputConstraints(deviceId?: string): MediaTrackConstraints {
  return {
    ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
    channelCount: 1,
    // echoCancellation/noiseSuppression/autoGainControl desactivados:
    // en Brave (y algunos Chromium), estos procesadores pueden suprimir la voz.
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
  };
}

function extractAudioInputs(allDevices: MediaDeviceInfo[]): AudioInputDeviceOption[] {
  return allDevices
    .filter((device) => device.kind === 'audioinput')
    .map((device, index) => describeAudioInput(device, index));
}

const INTERVIEW_TEXT_REPLACEMENTS: Array<[string, string]> = [
  ['├í', 'á'],
  ['├®', 'é'],
  ['├¡', 'í'],
  ['├│', 'ó'],
  ['├║', 'ú'],
  ['├▒', 'ñ'],
  ['├╝', 'ü'],
  ['├ü', 'Á'],
  ['├ë', 'É'],
  ['├ì', 'Í'],
  ['├ô', 'Ó'],
  ['├Ü', 'Ú'],
  ['├æ', 'Ñ'],
  ['├£', 'Ü'],
  ['Ã¡', 'á'],
  ['Ã©', 'é'],
  ['Ã­', 'í'],
  ['Ã³', 'ó'],
  ['Ãº', 'ú'],
  ['Ã±', 'ñ'],
  ['Ã¼', 'ü'],
  ['┬┐', '¿'],
  ['┬í', '¡'],
  ['Â ', ' '],
  ['Â', ''],
  ['Cu?ntame', 'Cuéntame'],
  ['despu?s', 'después'],
  ['t?cnica', 'técnica'],
  ['t?cnico', 'técnico'],
  ['t?cnicas', 'técnicas'],
  ['t?cnicos', 'técnicos'],
  ['presentaci?n', 'presentación'],
  ['introducci?n', 'introducción'],
  ['evaluaci?n', 'evaluación'],
  ['soluci?n', 'solución'],
  ['gesti?n', 'gestión'],
  ['relaci?n', 'relación'],
  ['implementaci?n', 'implementación'],
  ['colaboraci?n', 'colaboración'],
  ['adaptaci?n', 'adaptación'],
  ['organizaci?n', 'organización'],
  ['explicaci?n', 'explicación'],
  ['grabaci?n', 'grabación'],
  ['transcripci?n', 'transcripción'],
  ['reuni?n', 'reunión'],
  ['tecnolog?as', 'tecnologías'],
  ['posici?n', 'posición'],
  ['motivaci?n', 'motivación'],
  ['comunicaci?n', 'comunicación'],
  ['informaci?n', 'información'],
  ['situaci?n', 'situación'],
  ['transcripci?n', 'transcripción'],
  ['grabaci?n', 'grabación'],
  ['optimizaci?n', 'optimización'],
  ['integraci?n', 'integración'],
  ['automatizaci?n', 'automatización'],
  ['m?tricas', 'métricas'],
  ['c?mo', 'cómo'],
  ['qu?', 'qué'],
  ['cu?les', 'cuáles'],
  ['alg?n', 'algún'],
  ['ning?n', 'ningún'],
  ['pr?ximos', 'próximos'],
  ['tambi?n', 'también'],
  ['est?s', 'estás'],
  ['m?s', 'más'],
  ['aqu?', 'aquí'],
];

function normalizeInterviewText(value: string): string {
  let normalized = String(value || '');
  if (!normalized) return '';

  normalized = normalized
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');

  if (/[ÃÂ][\x80-\xBF]/.test(normalized) && typeof TextDecoder !== 'undefined') {
    try {
      const bytes = Uint8Array.from(normalized, char => char.charCodeAt(0) & 0xff);
      const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      if (decoded && decoded.length >= normalized.length * 0.6) {
        normalized = decoded;
      }
    } catch {
      // ignore decoding fallbacks and keep applying replacements below
    }
  }

  for (const [corrupted, correct] of INTERVIEW_TEXT_REPLACEMENTS) {
    normalized = normalized.split(corrupted).join(correct);
  }

  return collapseRepeatedTranscriptSegments(normalized.replace(/\s+/g, ' ').trim());
}

function splitTranscriptSegments(value: string): string[] {
  return String(value || '')
    .split(/(?<=[.!?])\s+/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function buildTranscriptDedupKey(value: string): string {
  return String(value || '')
    .toLowerCase()
    .replace(/[¿?¡!]/g, '')
    .replace(/[.,;:]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isLongRepeatedTranscriptSegment(value: string): boolean {
  return buildTranscriptDedupKey(value).split(' ').filter(Boolean).length >= 4;
}

function collapseRepeatedTranscriptSegments(value: string): string {
  const segments = splitTranscriptSegments(value);
  if (segments.length <= 1) {
    return String(value || '').trim();
  }

  const collapsed: string[] = [];
  let previousKey = '';

  for (const segment of segments) {
    const key = buildTranscriptDedupKey(segment);
    if (collapsed.length > 0 && key && key === previousKey && isLongRepeatedTranscriptSegment(segment)) {
      continue;
    }
    collapsed.push(segment);
    previousKey = key;
  }

  return collapsed.join(' ').replace(/\s+/g, ' ').trim();
}

function appendTranscriptChunk(previous: string, next: string): string {
  const previousText = String(previous || '').trim();
  const nextText = String(next || '').trim();

  if (!previousText) {
    return collapseRepeatedTranscriptSegments(nextText);
  }

  if (!nextText) {
    return collapseRepeatedTranscriptSegments(previousText);
  }

  const previousSegments = splitTranscriptSegments(previousText);
  const nextSegments = splitTranscriptSegments(nextText);
  const lastPreviousSegment = previousSegments[previousSegments.length - 1] || '';
  const firstNextSegment = nextSegments[0] || '';

  if (
    lastPreviousSegment
    && firstNextSegment
    && isLongRepeatedTranscriptSegment(firstNextSegment)
    && buildTranscriptDedupKey(lastPreviousSegment) === buildTranscriptDedupKey(firstNextSegment)
  ) {
    nextSegments.shift();
  }

  return collapseRepeatedTranscriptSegments([
    previousText,
    nextSegments.join(' '),
  ].filter(Boolean).join(' '));
}

type DisplayCaptureOptions = DisplayMediaStreamOptions & {
  preferCurrentTab?: boolean;
  selfBrowserSurface?: 'include' | 'exclude';
  surfaceSwitching?: 'include' | 'exclude';
};

function wrapCanvasText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = String(text || '').split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];

  const lines: string[] = [];
  let currentLine = words[0];

  for (const word of words.slice(1)) {
    const candidate = `${currentLine} ${word}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
      continue;
    }
    lines.push(currentLine);
    currentLine = word;
  }

  lines.push(currentLine);
  return lines;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawVideoCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const videoWidth = video.videoWidth || width;
  const videoHeight = video.videoHeight || height;
  const scale = Math.max(width / videoWidth, height / videoHeight);
  const drawWidth = videoWidth * scale;
  const drawHeight = videoHeight * scale;
  const drawX = x + (width - drawWidth) / 2;
  const drawY = y + (height - drawHeight) / 2;
  ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
}

function drawActivityBars(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  level: number,
  color: string,
) {
  const clampedLevel = Math.max(0.18, Math.min(level || 0.2, 1));
  const time = Date.now() / 180;

  for (let index = 0; index < 6; index++) {
    const pulse = 0.45 + Math.abs(Math.sin(time + (index * 0.75))) * 0.85;
    const barHeight = 12 + (40 * clampedLevel * pulse);
    drawRoundedRect(ctx, x + (index * 14), y + (48 - barHeight), 8, barHeight, 4);
    ctx.fillStyle = color;
    ctx.fill();
  }
}

// ── Hook principal ───────────────────────────────────────────────────────────

export function useVoiceBot(token: string): VoiceBotState {
  const [botState, setBotState] = useState<BotState>('loading');
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [isFollowUpQuestion, setIsFollowUpQuestion] = useState(false);
  const [isGeminiThinking, setIsGeminiThinking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [error, setError] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isUserSpeaking, setIsUserSpeaking] = useState(false);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingUploading, setRecordingUploading] = useState(false);
  const [recordingMode, setRecordingMode] = useState<RecordingMode | 'none'>('none');
  const [tabAudioCaptureStatus, setTabAudioCaptureStatus] = useState<TabAudioCaptureStatus>('idle');
  const [isCapturing, setIsCapturing] = useState(false);  // usuario activamente grabando voz
  const [audioLevel, setAudioLevel] = useState(0);
  const [speechError, setSpeechError] = useState('');     // error visible de reconocimiento
  const [forceManualInput, setForceManualInput] = useState(false);
  const [audioInputDevices, setAudioInputDevices] = useState<AudioInputDeviceOption[]>([]);
  const [selectedAudioInputId, setSelectedAudioInputId] = useState('');

  const wsRef = useRef<WebSocket | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speechAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechAudioUrlRef = useRef<string | null>(null);
  const pendingAnswerRef = useRef<string>('');
  const isMutedRef = useRef(false);
  const micMutedRef = useRef(false);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraRecordingVideoRef = useRef<HTMLVideoElement | null>(null);
  const accumulatedTranscriptRef = useRef('');  // Acumula texto entre reinicios de STT
  const shouldListenRef = useRef(false);        // Controla si debemos seguir escuchando
  const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingModeRef = useRef<RecordingMode | null>(null);
  const isPreparingRecordingRef = useRef(false);
  const displayCaptureStreamRef = useRef<MediaStream | null>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const compositeCanvasStreamRef = useRef<MediaStream | null>(null);
  const compositeAudioContextRef = useRef<AudioContext | null>(null);
  const compositeAnimationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioStreamPromiseRef = useRef<Promise<MediaStream> | null>(null);
  const selectedAudioInputIdRef = useRef('');
  const animFrameRef = useRef<number | null>(null);
  const revealTranscriptRef = useRef(false);
  const transcriptionTasksRef = useRef(new Set<Promise<void>>());
  const followUpThinkingStartedAtRef = useRef<number | null>(null);
  const pendingQuestionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const debugForceFollowUpRef = useRef(
    typeof window !== 'undefined' &&
      ['1', 'true', 'yes'].includes(
        (new URLSearchParams(window.location.search).get('debug_followup') || '').toLowerCase(),
      ),
  );
  const requestedVoiceIdRef = useRef(
    typeof window !== 'undefined'
      ? (new URLSearchParams(window.location.search).get('voice') || '').trim()
      : '',
  );
  const recordingSceneRef = useRef({
    botState: 'loading' as BotState,
    currentQuestion: '',
    currentQuestionIndex: 0,
    totalQuestions: 0,
    isFollowUpQuestion: false,
    isGeminiThinking: false,
    isUserSpeaking: false,
    audioLevel: 0,
    jobTitle: 'Entrevista Virtual',
    candidateName: '',
  });

  // ── Modo de transcripción ──────────────────────────────────────────────────
  // Este flujo usa siempre Groq Whisper desde backend para evitar diferencias
  // entre navegadores y asegurar que la transcripción final salga de un solo motor.
  const useServerSTTRef = useRef(true);
  const [isTranscribing, setIsTranscribing] = useState(false);
  // MediaRecorder dedicado a la respuesta de audio que se envía a Groq al detener.
  const sttRecorderRef = useRef<MediaRecorder | null>(null);
  const sttChunksRef = useRef<Blob[]>([]);
  const sttStopPromiseRef = useRef<Promise<void> | null>(null);
  const sttStopResolveRef = useRef<(() => void) | null>(null);
  const isCapturingRef = useRef(false);
  // Forward ref para llamar startServerSTTRecording desde onerror (declarado más abajo)
  const startServerSTTRecordingRef = useRef<(() => Promise<void>) | null>(null);

  // ── Detección de soporte ───────────────────────────────────────────────────
  const speechSupported = typeof window !== 'undefined' &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const loadAudioInputDevices = useCallback(async (preferredDeviceId?: string): Promise<AudioInputDeviceOption[]> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
      setAudioInputDevices([]);
      return [];
    }

    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const inputs = extractAudioInputs(allDevices);

      setAudioInputDevices(inputs);
      const preferred = pickPreferredAudioInput(inputs, preferredDeviceId ?? selectedAudioInputIdRef.current);
      const nextDeviceId = preferred?.deviceId || '';
      selectedAudioInputIdRef.current = nextDeviceId;
      setSelectedAudioInputId(nextDeviceId);

      if (typeof window !== 'undefined') {
        if (nextDeviceId) {
          window.localStorage.setItem(AUDIO_INPUT_STORAGE_KEY, nextDeviceId);
        } else {
          window.localStorage.removeItem(AUDIO_INPUT_STORAGE_KEY);
        }
      }

      return inputs;
    } catch (error) {
      console.warn('[Recorder] No se pudieron enumerar micrófonos:', error);
      return [];
    }
  }, []);

  const createAudioInputStream = useCallback(async (deviceId?: string): Promise<MediaStream> => {
    return navigator.mediaDevices.getUserMedia({
      audio: buildAudioInputConstraints(deviceId),
    });
  }, []);

  // stopAudioAnalyser: liberar AnalyserNode y stream de audio del micrófono
  const stopAudioAnalyser = useCallback(() => {
    if (animFrameRef.current !== null) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(t => t.stop());
      audioStreamRef.current = null;
    }
    audioStreamPromiseRef.current = null;
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  const refreshAudioInputs = useCallback(async () => {
    stopAudioAnalyser();
    setSpeechError('');

    let probeStream: MediaStream | null = null;
    try {
      // Algunos navegadores y Windows no actualizan enumerateDevices tras
      // conectar un dispositivo Bluetooth hasta abrir un stream nuevo.
      probeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (error) {
      console.warn('[Recorder] No se pudo abrir un stream temporal para refrescar micrófonos:', error);
    } finally {
      probeStream?.getTracks().forEach((track) => track.stop());
    }

    const allDevices = await navigator.mediaDevices.enumerateDevices();
    const audioInputs = await loadAudioInputDevices(selectedAudioInputIdRef.current);
    const audioOutputs = allDevices
      .filter((device) => device.kind === 'audiooutput')
      .map((device) => device.label.trim())
      .filter(Boolean);
    const bluetoothOutputOnlyLabels = findBluetoothOutputOnlyLabels(
      allDevices.filter((device) => device.kind === 'audiooutput'),
      audioInputs,
    );

    console.log('[Recorder] audio outputs detectados:', audioOutputs);
    if (bluetoothOutputOnlyLabels.length > 0) {
      console.warn('[Recorder] audífonos detectados solo como salida:', bluetoothOutputOnlyLabels);
    }

    return {
      audioInputs,
      audioOutputs,
      bluetoothOutputOnlyLabels,
    };
  }, [loadAudioInputDevices, stopAudioAnalyser]);

  const selectAudioInput = useCallback(async (deviceId: string) => {
    selectedAudioInputIdRef.current = deviceId;
    setSelectedAudioInputId(deviceId);
    if (typeof window !== 'undefined') {
      if (deviceId) {
        window.localStorage.setItem(AUDIO_INPUT_STORAGE_KEY, deviceId);
      } else {
        window.localStorage.removeItem(AUDIO_INPUT_STORAGE_KEY);
      }
    }
    stopAudioAnalyser();
    setSpeechError('');
    await loadAudioInputDevices(deviceId);
  }, [loadAudioInputDevices, stopAudioAnalyser]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      selectedAudioInputIdRef.current = window.localStorage.getItem(AUDIO_INPUT_STORAGE_KEY) || '';
    }

    void loadAudioInputDevices(selectedAudioInputIdRef.current);

    if (typeof navigator === 'undefined' || !navigator.mediaDevices) return;
    const mediaDevices = navigator.mediaDevices;
    const handleDeviceChange = () => {
      void loadAudioInputDevices(selectedAudioInputIdRef.current);
    };

    if (typeof mediaDevices.addEventListener === 'function') {
      mediaDevices.addEventListener('devicechange', handleDeviceChange);
      return () => mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    }

    const previousHandler = mediaDevices.ondevicechange;
    mediaDevices.ondevicechange = handleDeviceChange;
    return () => {
      mediaDevices.ondevicechange = previousHandler;
    };
  }, [loadAudioInputDevices]);

  useEffect(() => {
    recordingSceneRef.current = {
      botState,
      currentQuestion,
      currentQuestionIndex,
      totalQuestions,
      isFollowUpQuestion,
      isGeminiThinking,
      isUserSpeaking,
      audioLevel,
      jobTitle: sessionInfo?.jobTitle || 'Entrevista Virtual',
      candidateName: sessionInfo?.candidateName || '',
    };
  }, [
    botState,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    isFollowUpQuestion,
    isGeminiThinking,
    isUserSpeaking,
    audioLevel,
    sessionInfo,
  ]);

  const clearPendingQuestionTimeout = useCallback(() => {
    if (pendingQuestionTimeoutRef.current) {
      clearTimeout(pendingQuestionTimeoutRef.current);
      pendingQuestionTimeoutRef.current = null;
    }
  }, []);

  const stopDisplayCapture = useCallback(() => {
    displayCaptureStreamRef.current?.getTracks().forEach((track) => track.stop());
    displayCaptureStreamRef.current = null;
  }, []);

  const cleanupCompositeRecording = useCallback((stopDisplayCaptureToo = false) => {
    if (compositeAnimationFrameRef.current !== null) {
      cancelAnimationFrame(compositeAnimationFrameRef.current);
      compositeAnimationFrameRef.current = null;
    }

    compositeCanvasStreamRef.current?.getTracks().forEach((track) => track.stop());
    compositeCanvasStreamRef.current = null;
    compositeCanvasRef.current = null;

    if (compositeAudioContextRef.current) {
      compositeAudioContextRef.current.close().catch(() => {});
      compositeAudioContextRef.current = null;
    }

    recordingModeRef.current = null;
    setRecordingMode('none');

    if (stopDisplayCaptureToo) {
      stopDisplayCapture();
    }
  }, [stopDisplayCapture]);

  const ensureCameraRecordingVideo = useCallback(async (stream: MediaStream) => {
    if (typeof document === 'undefined') return null;

    let video = cameraRecordingVideoRef.current;
    if (!video) {
      video = document.createElement('video');
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      cameraRecordingVideoRef.current = video;
    }

    if (video.srcObject !== stream) {
      video.srcObject = stream;
    }

    await video.play().catch(() => {});
    return video;
  }, []);

  const drawCompositeFrame = useCallback(() => {
    const canvas = compositeCanvasRef.current;
    const cameraVideo = cameraRecordingVideoRef.current;
    const state = recordingSceneRef.current;

    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const progressRatio = state.totalQuestions > 0
      ? Math.min((state.currentQuestionIndex + 1) / state.totalQuestions, 1)
      : 0.18;
    const showBotScene = state.botState === 'speaking' || state.botState === 'processing' || state.isGeminiThinking;

    ctx.clearRect(0, 0, width, height);

    if (showBotScene) {
      const background = ctx.createLinearGradient(0, 0, width, height);
      background.addColorStop(0, '#0f172a');
      background.addColorStop(0.5, '#1d4ed8');
      background.addColorStop(1, '#312e81');
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.beginPath();
      ctx.arc(width - 120, 120, 200, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(120, height - 80, 150, 0, Math.PI * 2);
      ctx.fill();

      drawRoundedRect(ctx, 44, 36, width - 88, 64, 24);
      ctx.fillStyle = 'rgba(10,16,32,0.28)';
      ctx.fill();
      drawRoundedRect(ctx, 64, 50, 204, 34, 17);
      ctx.fillStyle = 'rgba(255,255,255,0.14)';
      ctx.fill();
      ctx.fillStyle = '#dbeafe';
      ctx.font = '700 18px "Segoe UI", sans-serif';
      ctx.fillText('BAUSEN | Entrevista IA', 82, 72);

      drawRoundedRect(ctx, width - 318, 50, 126, 34, 17);
      ctx.fillStyle = 'rgba(15,23,42,0.35)';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '600 16px "Segoe UI", sans-serif';
      ctx.fillText('Grabacion activa', width - 286, 72);

      drawRoundedRect(ctx, width - 176, 50, 92, 34, 17);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 16px "Segoe UI", sans-serif';
      ctx.fillText(`${Math.round(progressRatio * 100)}%`, width - 145, 72);

      drawRoundedRect(ctx, 64, 124, 760, 468, 32);
      ctx.fillStyle = 'rgba(255,255,255,0.94)';
      ctx.fill();

      drawRoundedRect(ctx, 96, 156, 178, 34, 17);
      ctx.fillStyle = 'rgba(30,64,175,0.08)';
      ctx.fill();
      ctx.fillStyle = '#1d4ed8';
      ctx.font = '700 17px "Segoe UI", sans-serif';
      ctx.fillText('Asistente virtual', 120, 178);

      ctx.fillStyle = '#0f172a';
      ctx.font = '700 46px "Segoe UI", sans-serif';
      ctx.fillText(state.isGeminiThinking ? 'Gemini esta refinando la siguiente pregunta' : 'Turno del asistente', 96, 252);

      ctx.fillStyle = '#475569';
      ctx.font = '600 22px "Segoe UI", sans-serif';
      ctx.fillText(`Tema ${Math.min(state.currentQuestionIndex + 1, state.totalQuestions || state.currentQuestionIndex + 1)} de ${state.totalQuestions || 1}`, 96, 292);

      if (state.isFollowUpQuestion || state.isGeminiThinking) {
        drawRoundedRect(ctx, 96, 316, 198, 38, 19);
        ctx.fillStyle = 'rgba(124,58,237,0.12)';
        ctx.fill();
        ctx.fillStyle = '#ede9fe';
        ctx.font = '700 17px "Segoe UI", sans-serif';
        ctx.fillText(state.isGeminiThinking ? 'Pensando la repregunta' : 'Seguimiento Gemini', 120, 340);
      }

      ctx.fillStyle = '#0f172a';
      ctx.font = '600 33px "Segoe UI", sans-serif';
      const questionText = state.isGeminiThinking
        ? 'La entrevista sigue activa. El sistema esta preparando una repregunta mas precisa antes de continuar.'
        : state.currentQuestion || 'Preparando la siguiente intervencion del asistente.';
      const lines = wrapCanvasText(ctx, questionText, 640).slice(0, 6);
      lines.forEach((line, index) => {
        ctx.fillText(line, 96, 412 + (index * 44));
      });

      ctx.fillStyle = '#475569';
      ctx.font = '600 20px "Segoe UI", sans-serif';
      ctx.fillText(
        state.isGeminiThinking
          ? 'La grabacion conservara este momento para que tambien se entienda el contexto de la repregunta.'
          : 'La grabacion mostrara esta escena mientras el bot habla, como una videollamada guiada.',
        96,
        556,
      );

      drawActivityBars(ctx, 96, 566, state.isGeminiThinking ? 0.55 : 0.35, 'rgba(37,99,235,0.85)');

      drawRoundedRect(ctx, 856, 124, 360, 250, 32);
      ctx.fillStyle = 'rgba(10,16,32,0.32)';
      ctx.fill();
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '700 18px "Segoe UI", sans-serif';
      ctx.fillText('Vista de la candidata', 886, 156);

      if (cameraVideo && cameraVideo.readyState >= 2) {
        const previewWidth = 300;
        const previewHeight = 168;
        const previewX = 886;
        const previewY = 180;
        ctx.save();
        drawRoundedRect(ctx, previewX, previewY, previewWidth, previewHeight, 20);
        ctx.clip();
        drawVideoCover(ctx, cameraVideo, previewX, previewY, previewWidth, previewHeight);
        ctx.restore();

        drawRoundedRect(ctx, previewX + 14, previewY + 14, 152, 32, 16);
        ctx.fillStyle = 'rgba(15,23,42,0.72)';
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 16px "Segoe UI", sans-serif';
        ctx.fillText(state.candidateName || 'Candidata', previewX + 34, previewY + 35);
      } else {
        drawRoundedRect(ctx, 886, 180, 300, 168, 20);
        ctx.fillStyle = 'rgba(15,23,42,0.42)';
        ctx.fill();
        ctx.fillStyle = '#cbd5e1';
        ctx.font = '700 28px "Segoe UI", sans-serif';
        ctx.fillText('Camara en espera', 942, 270);
      }

      drawRoundedRect(ctx, 856, 400, 360, 192, 32);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 18px "Segoe UI", sans-serif';
      ctx.fillText('Lo que quedara en el video', 886, 434);
      ctx.fillStyle = 'rgba(255,255,255,0.84)';
      ctx.font = '500 20px "Segoe UI", sans-serif';
      const detailLines = wrapCanvasText(
        ctx,
        state.isGeminiThinking
          ? 'Se escuchara la voz del asistente mientras prepara la repregunta y la escena cambiara de nuevo a la camara en cuanto te toque responder.'
          : 'Mientras el asistente habla, la grabacion muestra esta tarjeta principal y mantiene una vista secundaria de la candidata.',
        300,
      ).slice(0, 4);
      detailLines.forEach((line, index) => {
        ctx.fillText(line, 886, 474 + (index * 28));
      });

      drawRoundedRect(ctx, 64, 630, width - 128, 18, 9);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fill();
      drawRoundedRect(ctx, 64, 630, (width - 128) * progressRatio, 18, 9);
      ctx.fillStyle = '#93c5fd';
      ctx.fill();
    } else {
      if (cameraVideo && cameraVideo.readyState >= 2) {
        ctx.fillStyle = '#020617';
        ctx.fillRect(0, 0, width, height);
        drawVideoCover(ctx, cameraVideo, 0, 0, width, height);
      } else {
        const background = ctx.createLinearGradient(0, 0, width, height);
        background.addColorStop(0, '#0f172a');
        background.addColorStop(1, '#1e293b');
        ctx.fillStyle = background;
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#e2e8f0';
        ctx.font = '700 44px "Segoe UI", sans-serif';
        ctx.fillText('Camara en espera', 72, height / 2 - 18);
      }

      const topOverlay = ctx.createLinearGradient(0, 0, 0, 160);
      topOverlay.addColorStop(0, 'rgba(2,6,23,0.74)');
      topOverlay.addColorStop(1, 'rgba(2,6,23,0)');
      ctx.fillStyle = topOverlay;
      ctx.fillRect(0, 0, width, 160);

      const bottomOverlay = ctx.createLinearGradient(0, height - 220, 0, height);
      bottomOverlay.addColorStop(0, 'rgba(2,6,23,0)');
      bottomOverlay.addColorStop(1, 'rgba(2,6,23,0.84)');
      ctx.fillStyle = bottomOverlay;
      ctx.fillRect(0, height - 220, width, 220);

      drawRoundedRect(ctx, 48, 36, 288, 56, 24);
      ctx.fillStyle = 'rgba(15,23,42,0.46)';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 22px "Segoe UI", sans-serif';
      ctx.fillText('Bausen | Vista candidata', 76, 70);

      drawRoundedRect(ctx, width - 270, 36, 222, 56, 24);
      ctx.fillStyle = 'rgba(15,23,42,0.42)';
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 22px "Segoe UI", sans-serif';
      ctx.fillText(state.isUserSpeaking ? 'Respondiendo' : 'Lista para responder', width - 238, 70);

      drawRoundedRect(ctx, width - 330, 118, 282, 122, 28);
      ctx.fillStyle = 'rgba(15,23,42,0.42)';
      ctx.fill();
      ctx.fillStyle = '#bfdbfe';
      ctx.font = '700 16px "Segoe UI", sans-serif';
      ctx.fillText('Asistente IA', width - 300, 150);
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      ctx.font = '500 17px "Segoe UI", sans-serif';
      const assistantLines = wrapCanvasText(
        ctx,
        state.currentQuestion || 'Esperando la siguiente pregunta.',
        228,
      ).slice(0, 3);
      assistantLines.forEach((line, index) => {
        ctx.fillText(line, width - 300, 182 + (index * 22));
      });

      drawRoundedRect(ctx, 48, height - 170, width - 96, 124, 28);
      ctx.fillStyle = 'rgba(15,23,42,0.58)';
      ctx.fill();
      ctx.fillStyle = '#dbeafe';
      ctx.font = '700 18px "Segoe UI", sans-serif';
      ctx.fillText(`Tema ${Math.min(state.currentQuestionIndex + 1, state.totalQuestions || state.currentQuestionIndex + 1)}${state.isFollowUpQuestion ? ' · Seguimiento' : ''}`, 78, height - 126);
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 34px "Segoe UI", sans-serif';
      ctx.fillText(state.candidateName || 'Candidata', 78, height - 86);
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.font = '500 22px "Segoe UI", sans-serif';
      ctx.fillText(state.jobTitle || 'Entrevista virtual', 78, height - 52);

      drawActivityBars(
        ctx,
        width - 162,
        height - 112,
        state.isUserSpeaking ? Math.max(state.audioLevel, 0.28) : 0.16,
        state.isUserSpeaking ? 'rgba(56,189,248,0.92)' : 'rgba(255,255,255,0.78)',
      );

      drawRoundedRect(ctx, 48, height - 28, (width - 96) * progressRatio, 10, 5);
      ctx.fillStyle = '#60a5fa';
      ctx.fill();

      drawRoundedRect(ctx, 48, height - 28, width - 96, 10, 5);
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
    }

    compositeAnimationFrameRef.current = requestAnimationFrame(drawCompositeFrame);
  }, []);

  const requestDisplayCapture = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getDisplayMedia) {
      setTabAudioCaptureStatus('unsupported');
      return null;
    }

    const existingStream = displayCaptureStreamRef.current;
    if (existingStream && existingStream.getTracks().some((track) => track.readyState === 'live')) {
      setTabAudioCaptureStatus(existingStream.getAudioTracks().length > 0 ? 'granted' : 'missing');
      return existingStream;
    }

    setTabAudioCaptureStatus('requesting');

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true,
        preferCurrentTab: true,
        selfBrowserSurface: 'include',
        surfaceSwitching: 'include',
      } as DisplayCaptureOptions);

      if (displayStream.getAudioTracks().length === 0) {
        console.warn('[VoiceBot] El tab compartido no expuso audio. La grabacion seguira sin la voz del asistente.');
        setTabAudioCaptureStatus('missing');
        displayStream.getTracks().forEach((track) => track.stop());
        return null;
      }

      const releaseStream = () => {
        if (displayCaptureStreamRef.current === displayStream) {
          displayCaptureStreamRef.current = null;
          setTabAudioCaptureStatus('missing');
        }
      };

      displayStream.getTracks().forEach((track) => track.addEventListener('ended', releaseStream));
      displayCaptureStreamRef.current = displayStream;
      setTabAudioCaptureStatus('granted');
      return displayStream;
    } catch (e) {
      console.warn('[VoiceBot] No se pudo capturar el audio de la pestaña:', e);
      setTabAudioCaptureStatus('missing');
      return null;
    }
  }, []);

  const createCompositeRecordingStream = useCallback(async (stream: MediaStream) => {
    const displayStream = displayCaptureStreamRef.current;
    if (!displayStream || displayStream.getAudioTracks().length === 0 || typeof document === 'undefined') {
      return null;
    }

    const cameraVideo = await ensureCameraRecordingVideo(stream);
    if (!cameraVideo) return null;

    cleanupCompositeRecording(false);

    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    compositeCanvasRef.current = canvas;

    const canvasStream = canvas.captureStream(30);
    compositeCanvasStreamRef.current = canvasStream;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    const audioCtx: AudioContext = new AudioCtx();
    compositeAudioContextRef.current = audioCtx;
    await audioCtx.resume().catch(() => {});

    const destination = audioCtx.createMediaStreamDestination();

    const micTracks = stream.getAudioTracks();
    if (micTracks.length > 0) {
      const micSource = audioCtx.createMediaStreamSource(new MediaStream([micTracks[0]]));
      const micGain = audioCtx.createGain();
      micGain.gain.value = 1;
      micSource.connect(micGain);
      micGain.connect(destination);
    }

    const tabAudioTracks = displayStream.getAudioTracks();
    if (tabAudioTracks.length > 0) {
      const tabSource = audioCtx.createMediaStreamSource(new MediaStream([tabAudioTracks[0]]));
      const tabGain = audioCtx.createGain();
      tabGain.gain.value = 1;
      tabSource.connect(tabGain);
      tabGain.connect(destination);
    }

    const recordingStream = new MediaStream();
    canvasStream.getVideoTracks().forEach((track) => recordingStream.addTrack(track));
    destination.stream.getAudioTracks().forEach((track) => recordingStream.addTrack(track));

    recordingModeRef.current = 'composite';
    setRecordingMode('composite');
    drawCompositeFrame();
    return recordingStream;
  }, [cleanupCompositeRecording, drawCompositeFrame, ensureCameraRecordingVideo]);

  const uploadRecordingBlob = useCallback(async (blob: Blob, mimeType: string) => {
    const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';

    setRecordingUploading(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000/api';
      const formData = new FormData();
      formData.append('recording', blob, `interview_${token}.${ext}`);
      await fetch(`${apiUrl}/interviews/sessions/${token}/upload-recording/`, {
        method: 'POST',
        body: formData,
      });
      console.log('[VoiceBot] Grabacion subida correctamente');
    } catch (e) {
      console.warn('[VoiceBot] Error subiendo grabacion:', e);
    } finally {
      setRecordingUploading(false);
    }
  }, [token]);

  const applyIncomingQuestion = useCallback((msg: Record<string, unknown>) => {
    const questionText = normalizeInterviewText(String(msg.text || ''));
    setCurrentQuestion(questionText);
    setCurrentQuestionIndex(Number(msg.topic_index ?? msg.index ?? 0));
    setTotalQuestions(Number(msg.total || 0));
    setIsFollowUpQuestion(Boolean(msg.is_followup));
    setIsGeminiThinking(false);
    followUpThinkingStartedAtRef.current = null;
    setLiveTranscript('');
    revealTranscriptRef.current = false;
    pendingAnswerRef.current = '';
    accumulatedTranscriptRef.current = '';
    setBotState('speaking');
    speakText(questionText);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── WebSocket setup ────────────────────────────────────────────────────────
  const connectWS = useCallback(() => {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    // En dev: conecta directo al backend en puerto 8000
    // En prod: a través del mismo host (nginx hace el proxy)
    const wsHost = process.env.NEXT_PUBLIC_WS_URL || `${wsProtocol}://localhost:8000`;
    const url = `${wsHost}/ws/entrevista/${token}/`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[VoiceBot] WS conectado');
    };

    ws.onerror = (e) => {
      console.error('[VoiceBot] WS error:', e);
      setError('Error de conexión con el servidor. Recarga la página.');
      setBotState('error');
    };

    ws.onclose = (e) => {
      console.log('[VoiceBot] WS cerrado:', e.code);
    };
  }, [token]);

  // ── Manejar mensajes del servidor ──────────────────────────────────────────
  const handleServerMessage = useCallback((msg: Record<string, unknown>) => {
    console.log('[VoiceBot] ←', msg);
    switch (msg.type) {
      case 'session_info':
        setSessionInfo({
          candidateName: String(msg.candidate_name || ''),
          jobTitle: String(msg.job_title || ''),
          totalQuestions: Number(msg.total_questions || 0),
          currentIndex: Number(msg.current_index || 0),
          interviewType: '',
        });
        setTotalQuestions(Number(msg.total_questions || 0));
        setIsFollowUpQuestion(false);
        setIsGeminiThinking(false);
        followUpThinkingStartedAtRef.current = null;
        setBotState('ready');
        break;

      case 'question':
        clearPendingQuestionTimeout();
        if (Boolean(msg.is_followup) && followUpThinkingStartedAtRef.current) {
          const elapsed = Date.now() - followUpThinkingStartedAtRef.current;
          const remaining = Math.max(MIN_GEMINI_THINKING_MS - elapsed, 0);
          if (remaining > 0) {
            pendingQuestionTimeoutRef.current = setTimeout(() => {
              applyIncomingQuestion(msg);
            }, remaining);
            break;
          }
        }
        applyIncomingQuestion(msg);
        break;

      case 'answer_saved':
        // La respuesta fue guardada, esperando la siguiente pregunta (ya llegará)
        setIsGeminiThinking(false);
        setBotState('processing');
        break;

      case 'followup_thinking':
        followUpThinkingStartedAtRef.current = Date.now();
        setIsGeminiThinking(true);
        setBotState('processing');
        break;

      case 'completed':
        clearPendingQuestionTimeout();
        setIsGeminiThinking(false);
        followUpThinkingStartedAtRef.current = null;
        setTranscript(normalizeInterviewText(String(msg.transcript || '')));
        setBotState('completed');
        stopSpeech();
        stopListening();
        stopAndUploadRecording();
        break;

      case 'already_completed':
        clearPendingQuestionTimeout();
        setIsGeminiThinking(false);
        followUpThinkingStartedAtRef.current = null;
        setBotState('already_done');
        break;

      case 'error':
        clearPendingQuestionTimeout();
        setIsGeminiThinking(false);
        followUpThinkingStartedAtRef.current = null;
        setError(String(msg.message || 'Error desconocido.'));
        setBotState('error');
        break;
    }
  }, [applyIncomingQuestion, clearPendingQuestionTimeout]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Speech-to-Text ─────────────────────────────────────────────────────────
  // Watchdog: si continuous:true falla silenciosamente (bug Chrome), fuerza reinicio
  const resetWatchdog = useCallback(() => {
    if (watchdogRef.current) clearTimeout(watchdogRef.current);
    if (!shouldListenRef.current) return;
    watchdogRef.current = setTimeout(() => {
      if (!shouldListenRef.current || micMutedRef.current) return;
      console.log('[VoiceBot] Watchdog: reiniciando recognition');
      if (recognitionRef.current) {
        const old = recognitionRef.current;
        recognitionRef.current = null;
        try { old.abort(); } catch { /* ignore */ }
      }
      setTimeout(() => startRecognition(), 100);
    }, 10000); // 10 s — con continuous:true raramente se dispara
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startRecognition = useCallback(() => {
    if (!speechSupported || !shouldListenRef.current) return;

    // Limpiar instancia anterior ANTES de abort para que su onend no relance otra
    if (recognitionRef.current) {
      const old = recognitionRef.current;
      recognitionRef.current = null;
      try { old.abort(); } catch { /* ignore */ }
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;
    const recognition = new SpeechRecognitionAPI();
    recognition.lang = 'es-ES';
    // continuous:false — más fiable; con true Chrome puede iniciar sin emitir resultados.
    // Reiniciamos manualmente en onend para mantener la sesión activa.
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    resetWatchdog();

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      setSpeechError(''); // reconocimiento funcionando — borrar error previo
      resetWatchdog(); // hay actividad → extender watchdog
      let latestInterim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          // Elegir candidato con mayor confianza
          let best = result[0];
          for (let k = 1; k < result.length; k++) {
            if ((result[k].confidence || 0) > (best.confidence || 0)) best = result[k];
          }
          const text = normalizeInterviewText(best.transcript.trim());
          if (text) {
            accumulatedTranscriptRef.current = (accumulatedTranscriptRef.current + ' ' + text).trimStart();
          }
        } else {
          // Solo mostrar el interim MÁS RECIENTE (el último no-final)
          latestInterim = normalizeInterviewText(result[0].transcript.trim());
        }
      }
      const composedTranscript = normalizeInterviewText(
        latestInterim
          ? accumulatedTranscriptRef.current + (accumulatedTranscriptRef.current ? ' ' : '') + latestInterim
          : accumulatedTranscriptRef.current
      );
      pendingAnswerRef.current = composedTranscript;
      if (revealTranscriptRef.current) {
        setLiveTranscript(composedTranscript);
      }
      // Actualizar isUserSpeaking basado en si hay texto interim activo
      if (latestInterim) setIsUserSpeaking(true);
    };

    recognition.onspeechstart = () => { setIsUserSpeaking(true); resetWatchdog(); };
    recognition.onspeechend  = () => setIsUserSpeaking(false);

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === 'aborted') return; // nuestro propio abort — ignorar
      if (event.error === 'no-speech') return; // silencio — normal
      console.warn('[VoiceBot] SpeechRecognition error:', event.error);
      if (event.error === 'network') {
        // Si este flujo vuelve a activarse por error, forzar inmediatamente Groq.
        console.warn('[VoiceBot] Web Speech bloqueado — cambiando a transcripción server-side con Groq');
        useServerSTTRef.current = true;
        setSpeechError('Tu navegador bloqueó el reconocimiento local. Usando transcripción con Groq — sigue hablando.');
        // Detener recognition y arrancar grabador de audio para servidor
        shouldListenRef.current = false;
        if (recognitionRef.current) {
          const old = recognitionRef.current;
          recognitionRef.current = null;
          try { old.abort(); } catch { /* ignore */ }
        }
        // Iniciar grabación de audio si el usuario sigue en modo captura
        if (isCapturingRef.current) {
          startServerSTTRecordingRef.current?.();
        }
        return;
      }
      if (event.error === 'audio-capture') {
        setSpeechError('No se detectó micrófono. Verifica que esté conectado y con permiso.');
          setForceManualInput(true);
        shouldListenRef.current = false;
        setIsCapturing(false);
        stopAudioAnalyser();
        return;
      }
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setSpeechError('Permiso de micrófono denegado. Puedes continuar respondiendo por texto.');
        setForceManualInput(true);
        shouldListenRef.current = false;
        setIsCapturing(false);
        stopAudioAnalyser();
      }
    };

    recognition.onend = () => {
      setIsUserSpeaking(false);
      // Solo reiniciar si ESTA instancia es la activa y debemos seguir escuchando.
      // Con continuous:true, onend solo ocurre por timeout de red (~60s) o abort explícito.
      if (recognitionRef.current === recognition && shouldListenRef.current && !micMutedRef.current) {
        recognitionRef.current = null;
        // Reinicio inmediato — no hay "cool-down" de Chrome con continuous:true
        setTimeout(() => startRecognition(), 50);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch (e) {
      console.warn('[VoiceBot] recognition.start() falló:', e);
      recognitionRef.current = null;
      if (shouldListenRef.current) setTimeout(() => startRecognition(), 200);
    }
  }, [speechSupported]); // eslint-disable-line react-hooks/exhaustive-deps

  const startMediaRecorder = useCallback(async (stream: MediaStream) => {
    if (!stream || !window.MediaRecorder) return;
    if (isPreparingRecordingRef.current) return;
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') return;

    isPreparingRecordingRef.current = true;

    const mimeType = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus',
      'video/webm',
      'video/mp4',
    ].find(t => MediaRecorder.isTypeSupported(t)) || '';

    let recordingStream: MediaStream = stream;
    const compositeStream = await createCompositeRecordingStream(stream);
    if (compositeStream) {
      recordingStream = compositeStream;
    } else {
      cleanupCompositeRecording(false);
      recordingModeRef.current = 'raw';
      setRecordingMode('raw');
    }

    recordingChunksRef.current = [];
    const recorder = new MediaRecorder(recordingStream, mimeType ? { mimeType } : {});
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) recordingChunksRef.current.push(e.data);
    };
    recorder.onstop = async () => {
      const chunks = recordingChunksRef.current;
      const finalMimeType = recorder.mimeType || mimeType || 'video/webm';

      mediaRecorderRef.current = null;
      isPreparingRecordingRef.current = false;
      setIsRecording(false);
      cleanupCompositeRecording(true);

      if (chunks.length === 0) {
        recordingChunksRef.current = [];
        return;
      }

      const blob = new Blob(chunks, { type: finalMimeType });
      recordingChunksRef.current = [];
      await uploadRecordingBlob(blob, finalMimeType);
    };
    recorder.onerror = () => {
      mediaRecorderRef.current = null;
      isPreparingRecordingRef.current = false;
      setIsRecording(false);
      cleanupCompositeRecording(true);
    };
    recorder.start(5000);
    mediaRecorderRef.current = recorder;
    isPreparingRecordingRef.current = false;
    setIsRecording(true);
  }, [cleanupCompositeRecording, createCompositeRecordingStream, uploadRecordingBlob]);

  // startListening: solo cambia el estado a 'listening' — NO arranca reconocimiento.
  // El candidato debe presionar "Hablar" (startCapture) para activar el micrófono.
  const startListening = useCallback(() => {
    shouldListenRef.current = false;
    setIsCapturing(false);
    setBotState('listening');
    // Limpiar transcripción anterior al recibir nueva pregunta
    revealTranscriptRef.current = false;
    accumulatedTranscriptRef.current = '';
    pendingAnswerRef.current = '';
    setLiveTranscript('');
    // Si la cámara está activa y no hay grabación, iniciarla
    if (cameraStreamRef.current && (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive')) {
      void startMediaRecorder(cameraStreamRef.current);
    }
  }, [startMediaRecorder]);

  // ── Text-to-Speech ─────────────────────────────────────────────────────────
  const cleanupSpeechAudio = useCallback(() => {
    if (speechAudioRef.current) {
      const audio = speechAudioRef.current;
      speechAudioRef.current = null;
      audio.onended = null;
      audio.onerror = null;
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    if (speechAudioUrlRef.current) {
      URL.revokeObjectURL(speechAudioUrlRef.current);
      speechAudioUrlRef.current = null;
    }
  }, []);

  const stopSpeech = useCallback(() => {
    cleanupSpeechAudio();
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
    }
  }, [cleanupSpeechAudio]);

  const speakWithBrowserVoice = useCallback((text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-MX';
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const esVoice = voices.find(v => v.lang.startsWith('es')) || null;
    if (esVoice) utterance.voice = esVoice;

    utterance.onend = () => {
      setBotState('listening');
      startListening();
    };
    utterance.onerror = () => {
      setBotState('listening');
      startListening();
    };
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [startListening]);

  const speakText = useCallback(async (text: string) => {
    if (typeof window === 'undefined') return;
    stopSpeech();
    if (isMutedRef.current) {
      // Si está silenciado, pasar directamente a escuchar
      setBotState('listening');
      startListening();
      return;
    }

    try {
      const isLocalBrowser = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const apiUrl = isLocalBrowser
        ? 'http://127.0.0.1:8000/api'
        : (process.env.NEXT_PUBLIC_API_URL || '/reclutamiento-api');
      const response = await fetch(`${apiUrl}/interviews/sessions/${token}/tts/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice_id: requestedVoiceIdRef.current || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS HTTP ${response.status}`);
      }

      const audioBlob = await response.blob();
      if (!audioBlob.size) {
        throw new Error('Piper devolvio un audio vacio');
      }

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      speechAudioRef.current = audio;
      speechAudioUrlRef.current = audioUrl;

      audio.onended = () => {
        cleanupSpeechAudio();
        setBotState('listening');
        startListening();
      };
      audio.onerror = () => {
        cleanupSpeechAudio();
        speakWithBrowserVoice(text);
      };

      await audio.play();
    } catch (error) {
      console.warn('[VoiceBot] Piper TTS no disponible, usando voz del navegador:', error);
      speakWithBrowserVoice(text);
    }
  }, [cleanupSpeechAudio, speakWithBrowserVoice, startListening, stopSpeech, token]);

  const ensureAudioInputStream = useCallback(async (): Promise<MediaStream> => {
    const currentStream = audioStreamRef.current;
    if (currentStream?.getAudioTracks().some((track) => track.readyState === 'live')) {
      return currentStream;
    }

    if (audioStreamPromiseRef.current) {
      return audioStreamPromiseRef.current;
    }

    const streamPromise = (async () => {
      let stream = await createAudioInputStream(selectedAudioInputIdRef.current);

      try {
        const inputs = await loadAudioInputDevices(selectedAudioInputIdRef.current);
        const preferred = pickPreferredAudioInput(inputs, selectedAudioInputIdRef.current);
        const expectedDeviceId = preferred?.deviceId || selectedAudioInputIdRef.current;
        const activeTrack = stream.getAudioTracks()[0];
        const currentDeviceId = activeTrack?.getSettings().deviceId || '';

        if (expectedDeviceId && currentDeviceId && currentDeviceId !== expectedDeviceId) {
          stream.getTracks().forEach((track) => track.stop());
          stream = await createAudioInputStream(expectedDeviceId);
        }
      } catch (error) {
        console.warn('[Analyser] No se pudo refrescar la selección de micrófono:', error);
      }

      audioStreamRef.current = stream;
      return stream;
    })().finally(() => {
      audioStreamPromiseRef.current = null;
    });

    audioStreamPromiseRef.current = streamPromise;
    return streamPromise;
  }, [createAudioInputStream, loadAudioInputDevices]);

  // startAudioAnalyser: pedir permiso de micrófono y medir niveles de audio reales
  const startAudioAnalyser = useCallback(async (stream?: MediaStream): Promise<boolean> => {
    try {
      if (audioContextRef.current && analyserRef.current) {
        return true;
      }

      const activeStream = stream || await ensureAudioInputStream();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const audioCtx: AudioContext = new AudioCtx();
      console.log('[Analyser] AudioContext state al crear:', audioCtx.state, '| sampleRate:', audioCtx.sampleRate);
      if (audioCtx.state === 'suspended') {
        await audioCtx.resume().catch((err) => console.warn('[Analyser] resume() falló:', err));
      }
      console.log('[Analyser] AudioContext state tras resume():', audioCtx.state);
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      // Log de estado del stream de entrada
      const audioTracks = activeStream.getAudioTracks();
      console.log('[Analyser] Stream audio tracks:', audioTracks.length,
        audioTracks.map(t => `id=${t.id.slice(0,8)} estado=${t.readyState} enabled=${t.enabled} muted=${t.muted}`));

      const source = audioCtx.createMediaStreamSource(activeStream);
      source.connect(analyser);
      // Nodo silenciado hacia destination: sin esto el grafo de Web Audio no
      // fluye y algunos navegadores (Chromium/Brave) capturan silencio en el
      // MediaRecorder que use el mismo stream.
      const muteGain = audioCtx.createGain();
      muteGain.gain.value = 0;
      analyser.connect(muteGain);
      muteGain.connect(audioCtx.destination);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        if (!analyserRef.current) return;
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a: number, b: number) => a + b, 0) / dataArray.length;
        // Nota: en Brave, avg siempre es 0 por protección anti-fingerprinting.
        // La detección de voz se hace por tamaño de chunk de MediaRecorder.
        setAudioLevel(Math.min(1, (avg / 255) * 4));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      animFrameRef.current = requestAnimationFrame(tick);
      return true;
    } catch (e) {
      console.error('[VoiceBot] Micrófono no disponible:', e);
      return false;
    }
  }, [ensureAudioInputStream]);

  // ── Server-side STT (Groq Whisper) ─────────────────────────────────────────
  // Sube blob de audio a /transcribe/ y agrega texto al transcript acumulado.
  const uploadAndTranscribe = useCallback(async (blob: Blob) => {
    if (!blob || blob.size < 500) return; // muy corto — ignorar
    const task = (async () => {
      setIsTranscribing(true);
      try {
        const formData = new FormData();
        const ext = blob.type.includes('wav') ? 'wav'
          : blob.type.includes('webm') ? 'webm'
          : blob.type.includes('ogg') ? 'ogg'
          : 'audio';
        formData.append('audio', blob, `chunk.${ext}`);
        const isLocalBrowser = typeof window !== 'undefined'
          && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        const apiUrl = isLocalBrowser
          ? 'http://127.0.0.1:8000/api'
          : (process.env.NEXT_PUBLIC_API_URL || '/reclutamiento-api');
        const url = `${apiUrl}/interviews/sessions/${token}/transcribe/`;
        const resp = await fetch(url, { method: 'POST', body: formData });
        if (!resp.ok) {
          const errorText = await resp.text().catch(() => '');
          console.warn('[VoiceBot] /transcribe/ falló:', resp.status, errorText);
          setSpeechError('Error al transcribir con Groq. Puedes continuar respondiendo por texto.');
          setForceManualInput(true);
          return;
        }
        const data = await resp.json();
        const text = normalizeInterviewText((data?.text || '').trim());
        if (!text) {
          setSpeechError('No detecté voz en la grabación. Intenta de nuevo o responde por texto.');
          return;
        }
        if (text) {
          accumulatedTranscriptRef.current = appendTranscriptChunk(accumulatedTranscriptRef.current, text);
          pendingAnswerRef.current = accumulatedTranscriptRef.current;
          if (revealTranscriptRef.current) {
            setLiveTranscript(accumulatedTranscriptRef.current);
          }
        }
      } catch (e) {
        console.warn('[VoiceBot] Error subiendo audio para transcribir:', e);
        setSpeechError('Error de red al transcribir. Puedes continuar respondiendo por texto.');
        setForceManualInput(true);
      }
    })();

    // La limpieza se encadena tras asignar `task` (en vez de un `finally` dentro
    // del closure) para no referenciar `task` dentro de su propio inicializador.
    transcriptionTasksRef.current.add(task);
    void task.finally(() => {
      transcriptionTasksRef.current.delete(task);
      setIsTranscribing(transcriptionTasksRef.current.size > 0);
    });
    await task;
  }, [token]);

  const waitForPendingTranscriptions = useCallback(async () => {
    if (transcriptionTasksRef.current.size === 0) return;
    await Promise.all(Array.from(transcriptionTasksRef.current));
  }, []);

  // Graba la respuesta completa y la sube a Groq al detener.
  // Usa un stream propio (getUserMedia independiente) para evitar interferencia
  // con el grafo Web Audio del analyser que, en Chromium/Brave, puede causar
  // que el MediaRecorder reciba el audio procesado (silenciado) en lugar del crudo.
  const startServerSTTRecording = useCallback(async () => {
    if (sttRecorderRef.current) return;

    try {
      if (!window.MediaRecorder) {
        setSpeechError('Tu navegador no soporta grabación de audio.');
        return;
      }

      // Stream exclusivo para el grabador — independiente del stream del analyser.
      // Usa el micrófono seleccionado por el usuario o, si no existe, el mejor
      // candidato físico disponible.
      let recorderStream: MediaStream;
      try {
        const audioInputs = await loadAudioInputDevices(selectedAudioInputIdRef.current);
        const selectedDevice = pickPreferredAudioInput(audioInputs, selectedAudioInputIdRef.current);
        console.log('[Recorder] dispositivos audio:', audioInputs.map((device) => `${device.label} [${device.deviceId.slice(0, 8)}]`));
        console.log('[Recorder] dispositivo elegido:', selectedDevice?.label ?? 'predeterminado');
        recorderStream = await createAudioInputStream(selectedDevice?.deviceId || selectedAudioInputIdRef.current);
      } catch {
        // Fallback al default si la enumeración falla
        recorderStream = await createAudioInputStream();
      }
      const track = recorderStream.getAudioTracks()[0];
      console.log('[Recorder] stream final | label:', track?.label,
        '| settings:', JSON.stringify(track?.getSettings()));

      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/mp4',
      ].find((type) => MediaRecorder.isTypeSupported(type)) || '';

      const recorder = new MediaRecorder(recorderStream, mimeType ? { mimeType } : undefined);
      sttChunksRef.current = [];
      sttStopPromiseRef.current = new Promise<void>((resolve) => {
        sttStopResolveRef.current = resolve;
      });

      recorder.ondataavailable = (event) => {
        const sz = event.data?.size ?? 0;
        console.log(`[VAD] chunk | size=${sz}B | recorder=${sttRecorderRef.current ? 'activo' : 'null'}`);
        if (event.data && sz > 0) {
          sttChunksRef.current.push(event.data);
          // Detección de voz por tamaño de chunk comprimido (Opus/WebM).
          // Silencio: ~100-300 bytes/200 ms. Voz activa: ~500+ bytes/200 ms.
          // Funciona incluso en Brave (no usa Web Audio API).
          if (sttRecorderRef.current) {
            setIsUserSpeaking(sz > 400);
          }
        }
      };

      recorder.onstop = async () => {
        const chunks = sttChunksRef.current;
        const finalMimeType = recorder.mimeType || mimeType || 'audio/webm';

        // Liberar el stream exclusivo del grabador
        recorderStream.getTracks().forEach(t => t.stop());

        sttRecorderRef.current = null;
        sttChunksRef.current = [];
        setIsUserSpeaking(false);

        try {
          if (chunks.length > 0) {
            const blob = new Blob(chunks, { type: finalMimeType });
            if (blob.size > 500) {
              await uploadAndTranscribe(blob);
            }
          }
        } finally {
          sttStopResolveRef.current?.();
          sttStopResolveRef.current = null;
          sttStopPromiseRef.current = null;
        }
      };

      recorder.onerror = () => {
        recorderStream.getTracks().forEach(t => t.stop());
        sttRecorderRef.current = null;
        sttChunksRef.current = [];
        setIsUserSpeaking(false);
        setSpeechError('No se pudo capturar tu audio. Intenta de nuevo o responde por texto.');
        sttStopResolveRef.current?.();
        sttStopResolveRef.current = null;
        sttStopPromiseRef.current = null;
      };

      // timeslice 200 ms: ondataavailable dispara cada 200 ms para detección
      // de voz por tamaño de chunk (funciona en todos los navegadores incluyendo Brave).
      recorder.start(200);
      sttRecorderRef.current = recorder;
      setSpeechError('');
    } catch (e) {
      console.error('[VoiceBot] No se pudo iniciar la grabación para Groq:', e);
      setSpeechError('No se pudo acceder al micrófono.');
    }
}, [createAudioInputStream, loadAudioInputDevices, uploadAndTranscribe]);

  const stopServerSTTRecording = useCallback(async () => {
    const recorder = sttRecorderRef.current;
    if (!recorder) {
      setIsUserSpeaking(false);
      return;
    }

    if (recorder.state !== 'inactive') {
      try { recorder.stop(); } catch { /* ignore */ }
    }

    if (sttStopPromiseRef.current) {
      await sttStopPromiseRef.current;
    }
  }, []);

  // Mantener el ref actualizado para que onerror pueda llamarlo
  useEffect(() => {
    startServerSTTRecordingRef.current = startServerSTTRecording;
  }, [startServerSTTRecording]);

  // startCapture: el candidato presionó "Hablar" — arranca grabación para Groq inmediatamente
  const startCapture = useCallback(async () => {
    useServerSTTRef.current = true;
    setSpeechError('');
    setIsCapturing(true);
    revealTranscriptRef.current = false;
    isCapturingRef.current = true;
    shouldListenRef.current = true;
    try {
      const stream = await ensureAudioInputStream();
      await startAudioAnalyser(stream);
      await startServerSTTRecording();
    } catch (e) {
      console.error('[VoiceBot] No se pudo iniciar la captura de audio:', e);
      setSpeechError('No se pudo acceder al micrófono.');
      setIsCapturing(false);
      isCapturingRef.current = false;
      shouldListenRef.current = false;
    }
  }, [ensureAudioInputStream, startAudioAnalyser, startServerSTTRecording]);

  // stopCapture: el candidato presionó "Detener" — parar mic pero conservar texto
  const stopCapture = useCallback(async () => {
    setIsCapturing(false);
    isCapturingRef.current = false;
    shouldListenRef.current = false;
    if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; }
    if (recognitionRef.current) {
      const old = recognitionRef.current;
      recognitionRef.current = null;
      try { old.abort(); } catch { /* ignore */ }
    }
    await stopServerSTTRecording();
    await waitForPendingTranscriptions();
    revealTranscriptRef.current = true;
    setLiveTranscript(pendingAnswerRef.current.trim());
    setIsUserSpeaking(false);
    stopAudioAnalyser();
  }, [stopAudioAnalyser, stopServerSTTRecording, waitForPendingTranscriptions]);

  const stopListening = useCallback(() => {
    setIsCapturing(false);
    isCapturingRef.current = false;
    shouldListenRef.current = false;
    if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; }
    if (recognitionRef.current) {
      const old = recognitionRef.current;
      recognitionRef.current = null;
      try { old.abort(); } catch { /* ignore */ }
    }
    void stopServerSTTRecording();
    setIsUserSpeaking(false);
    stopAudioAnalyser();
  }, [stopAudioAnalyser, stopServerSTTRecording]);

  // ── Acciones públicas ──────────────────────────────────────────────────────
  const startInterview = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'start',
        debug_force_followup: debugForceFollowUpRef.current,
      }));
    }
  }, []);

  const submitAnswer = useCallback((text: string) => {
    setIsCapturing(false);
    stopListening();
    stopSpeech();
    const answer = text.trim() || pendingAnswerRef.current.trim() || '[Sin respuesta]';
    clearPendingQuestionTimeout();
    followUpThinkingStartedAtRef.current = null;
    setIsGeminiThinking(false);
    setBotState('processing');
    setLiveTranscript('');
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'answer',
        text: answer,
        question: currentQuestion,
        topic_index: currentQuestionIndex,
        is_followup: isFollowUpQuestion,
        debug_force_followup: debugForceFollowUpRef.current,
      }));
    }
  }, [clearPendingQuestionTimeout, currentQuestion, currentQuestionIndex, isFollowUpQuestion, stopListening, stopSpeech]);

  const finishEarly = useCallback(() => {
    stopListening();
    stopSpeech();
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'finish' }));
    }
  }, [stopListening, stopSpeech]);

  const toggleMute = useCallback(() => {
    const newMuted = !isMutedRef.current;
    isMutedRef.current = newMuted;
    setIsMuted(newMuted);
    if (newMuted) stopSpeech();
  }, [stopSpeech]);

  const toggleMicMute = useCallback(() => {
    const newMuted = !micMutedRef.current;
    micMutedRef.current = newMuted;
    setIsMicMuted(newMuted);
    if (newMuted) {
      // Pausar captura sin cambiar shouldListenRef, para poder reanudar al desmutear.
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch { /* ignore */ }
        recognitionRef.current = null;
      }
      void stopServerSTTRecording();
      setIsUserSpeaking(false);
    } else {
      if (shouldListenRef.current) {
        if (useServerSTTRef.current) {
          void startServerSTTRecording();
        } else {
          startRecognition();
        }
      }
    }
  }, [startRecognition, startServerSTTRecording, stopServerSTTRecording]);

  const toggleCamera = useCallback(async () => {
    if (cameraStreamRef.current) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      } else {
        cleanupCompositeRecording(true);
      }
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
      if (cameraRecordingVideoRef.current) {
        cameraRecordingVideoRef.current.srcObject = null;
      }
      setRecordingMode('none');
      setTabAudioCaptureStatus('idle');
      setCameraStream(null);
      setIsCameraOn(false);
    } else {
      try {
        await requestDisplayCapture();
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        cameraStreamRef.current = stream;
        setCameraStream(stream);
        setIsCameraOn(true);
        await ensureCameraRecordingVideo(stream);
        const interviewIsActive = !['loading', 'ready', 'completed', 'already_done', 'error'].includes(botState);
        if (interviewIsActive || shouldListenRef.current) {
          void startMediaRecorder(stream);
        }
      } catch (e) {
        console.warn('[VoiceBot] Cámara no disponible:', e);
      }
    }
  }, [botState, cleanupCompositeRecording, ensureCameraRecordingVideo, requestDisplayCapture, startMediaRecorder]);

  const stopAndUploadRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    recorder.stop();
  }, []);

  const retryListening = useCallback(() => {
    setSpeechError('');
    setForceManualInput(false);
    useServerSTTRef.current = true;
    shouldListenRef.current = false;
    setIsCapturing(false);
    isCapturingRef.current = false;
    setIsUserSpeaking(false);
    setBotState('listening');
  }, []);

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;
    connectWS();
    return () => {
      clearPendingQuestionTimeout();
      stopListening();
      stopSpeech();
      wsRef.current?.close();
      // Apagar cámara al desmontar
      cameraStreamRef.current?.getTracks().forEach(t => t.stop());
      if (cameraRecordingVideoRef.current) {
        cameraRecordingVideoRef.current.srcObject = null;
      }
      mediaRecorderRef.current?.stop();
      cleanupCompositeRecording(true);
      stopAudioAnalyser();
    };
  }, [cleanupCompositeRecording, clearPendingQuestionTimeout, connectWS, stopAudioAnalyser, stopListening, stopSpeech, token]);

  // Reasignar handleServerMessage al ws después de conectar
  useEffect(() => {
    if (wsRef.current) {
      wsRef.current.onmessage = (event) => {
        try {
          handleServerMessage(JSON.parse(event.data));
        } catch { /* ignore */ }
      };
    }
  }, [handleServerMessage]);

  return {
    botState,
    sessionInfo,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    isFollowUpQuestion,
    isGeminiThinking,
    transcript,
    liveTranscript,
    isUserSpeaking,
    audioLevel,
    error,
    speechError,
    speechSupported,
    forceManualInput,
    isTranscribing,
    isMuted,
    isMicMuted,
    isCameraOn,
    cameraStream,
    isRecording,
    recordingUploading,
    recordingMode,
    tabAudioCaptureStatus,
    isCapturing,
    audioInputDevices,
    selectedAudioInputId,
    startInterview,
    submitAnswer,
    finishEarly,
    toggleMute,
    toggleMicMute,
    toggleCamera,
    retryListening,
    refreshAudioInputs,
    selectAudioInput,
    startCapture,
    stopCapture,
  };
}

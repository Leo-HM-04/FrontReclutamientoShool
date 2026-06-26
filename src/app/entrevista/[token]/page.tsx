'use client';
import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import { useVoiceBot, type AudioInputDeviceOption, type AudioInputRefreshResult } from '@/hooks/useVoiceBot';
import bausenLogo from '@/logos/bausen-logo.png';

type TutorialStepStatus = 'done' | 'current' | 'upcoming' | 'warning';

type TutorialStep = {
  id: string;
  icon: string;
  title: string;
  description: string;
  status: TutorialStepStatus;
  actionLabel?: string;
  onAction?: () => void;
};

// ── Onda de voz tipo Siri (tema claro) ───────────────────────────────────────
function SiriWave({
  active,
  userSpeaking,
  botSpeaking,
}: {
  active: boolean;
  userSpeaking: boolean;
  botSpeaking: boolean;
  audioLevel: number;
}) {
  const profile = [0.18, 0.38, 0.60, 0.82, 1.0, 0.82, 0.60, 0.38, 0.18];
  const color = userSpeaking
    ? '#3b82f6'   // azul cielo — usuario hablando
    : botSpeaking
    ? '#1e3a8a'   // índigo — bot leyendo
    : active
    ? '#2563eb'   // gris azulado — esperando
    : '#e2e8f0';  // gris claro — inactivo

  return (
    <div className="flex items-center justify-center gap-[5px]" style={{ height: '52px' }}>
      {profile.map((h, i) => {
        const maxH = Math.round(h * 48);
        const dur  = `${(0.28 + (i % 5) * 0.07).toFixed(2)}s`;
        const del  = `${(i * 0.065).toFixed(2)}s`;
        return (
          <div
            key={i}
            style={{
              width: '4px',
              height: `${maxH}px`,
              borderRadius: '2px',
              backgroundColor: color,
              transformOrigin: 'center',
              transition: 'background-color 0.35s ease',
              animation: active
                ? `siri-bar ${dur} ease-in-out ${del} infinite alternate`
                : 'none',
              transform: active ? undefined : 'scaleY(0.08)',
            }}
          />
        );
      })}
    </div>
  );
}

// ── Logo Bausen ─────────────────────────────────────────────────────────────
function BausenLogo() {
  return (
    <div className="absolute top-4 left-5 z-10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={bausenLogo.src}
        alt="Bausen"
        width={bausenLogo.width}
        height={bausenLogo.height}
        style={{ width: 110, height: 'auto' }}
      />
    </div>
  );
}

function MicrophoneSelectorCard({
  devices,
  selectedDeviceId,
  disabled,
  isRefreshing,
  refreshNotice,
  onSelect,
  onRefresh,
}: {
  devices: AudioInputDeviceOption[];
  selectedDeviceId: string;
  disabled: boolean;
  isRefreshing: boolean;
  refreshNotice: { tone: 'info' | 'success' | 'warning'; text: string } | null;
  onSelect: (deviceId: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}) {
  const selectedDevice = devices.find((device) => device.deviceId === selectedDeviceId) || null;
  const refreshNoticeStyles = refreshNotice?.tone === 'success'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : refreshNotice?.tone === 'warning'
    ? 'border-amber-200 bg-amber-50 text-amber-800'
    : 'border-sky-200 bg-sky-50 text-sky-800';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm shadow-slate-100">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-slate-700 mb-2">
            <i className="fas fa-microphone text-blue-600" />
            <span className="text-sm font-semibold">Micrófono para responder</span>
          </div>
          <div className="relative">
            <select
              value={selectedDeviceId}
              onChange={(event) => void onSelect(event.target.value)}
              disabled={disabled || devices.length === 0}
              className="w-full appearance-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 pr-10 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              {devices.length > 0 ? devices.map((device) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label}{device.isVirtual ? ' · virtual' : device.isDefault ? ' · predeterminado' : ''}
                </option>
              )) : (
                <option value="">Predeterminado del navegador</option>
              )}
            </select>
            <i className="fas fa-chevron-down pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400" />
          </div>
        </div>

        <button
          onClick={() => void onRefresh()}
          disabled={disabled || isRefreshing}
          className="shrink-0 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-sm font-semibold text-slate-600 transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
        >
          <i className={`fas ${isRefreshing ? 'fa-spinner animate-spin' : 'fa-rotate-right'} text-[11px] mr-2`} />
          {isRefreshing ? 'Buscando...' : 'Actualizar'}
        </button>
      </div>

      <p className="mt-3 text-xs text-slate-500 leading-relaxed">
        El visualizador y la transcripción usarán este mismo micrófono. Aquí solo aparecen entradas con micrófono; unos audífonos Bluetooth sin perfil de micrófono no se mostrarán en esta lista.
      </p>

      {refreshNotice && (
        <div className={`mt-3 rounded-xl border px-3 py-2 text-xs ${refreshNoticeStyles}`}>
          <div className="flex items-start gap-2">
            <i className={`fas ${refreshNotice.tone === 'success' ? 'fa-circle-check' : refreshNotice.tone === 'warning' ? 'fa-triangle-exclamation' : 'fa-circle-info'} mt-0.5`} />
            <span>{refreshNotice.text}</span>
          </div>
        </div>
      )}

      {selectedDevice ? (
        <div className={`mt-3 rounded-xl border px-3 py-2 text-xs ${selectedDevice.isVirtual ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
          <div className="flex items-start gap-2">
            <i className={`fas ${selectedDevice.isVirtual ? 'fa-triangle-exclamation' : 'fa-circle-check'} mt-0.5`} />
            <span>
              {selectedDevice.isVirtual
                ? `El micrófono seleccionado parece virtual: ${selectedDevice.label}. Si no es tu micrófono físico, cámbialo antes de grabar.`
                : `Micrófono activo: ${selectedDevice.label}. Si conectas otro dispositivo, pulsa Actualizar para volver a detectarlo.`}
            </span>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Todavía no pudimos identificar tus micrófonos. Si hace falta, pulsa Actualizar después de conceder permiso al navegador.
        </div>
      )}
    </div>
  );
}

function InterviewTutorialPanel({
  steps,
  note,
  onClose,
}: {
  steps: TutorialStep[];
  note?: { tone: 'sky' | 'emerald' | 'amber'; text: string };
  onClose: () => void;
}) {
  const currentStep = steps.find((step) => step.status === 'warning')
    || steps.find((step) => step.status === 'current')
    || steps.find((step) => step.status === 'upcoming')
    || steps[steps.length - 1];

  const stepCardStyles: Record<TutorialStepStatus, string> = {
    done: 'border-emerald-200 bg-emerald-50/80',
    current: 'border-blue-200 bg-blue-50/85',
    upcoming: 'border-slate-200 bg-white',
    warning: 'border-amber-200 bg-amber-50/90',
  };

  const stepBadgeStyles: Record<TutorialStepStatus, string> = {
    done: 'bg-emerald-100 text-emerald-700',
    current: 'bg-blue-100 text-blue-700',
    upcoming: 'bg-slate-100 text-slate-500',
    warning: 'bg-amber-100 text-amber-700',
  };

  const stepLabels: Record<TutorialStepStatus, string> = {
    done: 'Hecho',
    current: 'Ahora',
    upcoming: 'Siguiente',
    warning: 'Atencion',
  };

  const noteStyles = note?.tone === 'emerald'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
    : note?.tone === 'amber'
    ? 'border-amber-200 bg-amber-50 text-amber-800'
    : 'border-sky-200 bg-sky-50 text-sky-800';

  return (
    <div className="w-full rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm shadow-slate-200">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-700">Tutorial interactivo</p>
          <h2 className="text-lg font-bold text-slate-900 mt-1">Te vamos guiando paso por paso</h2>
          {currentStep && (
            <p className="text-sm text-slate-500 mt-1">
              Paso actual: <span className="font-semibold text-slate-700">{currentStep.title}</span>
            </p>
          )}
        </div>
        <button
          onClick={onClose}
          className="shrink-0 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
          title="Ocultar guía"
        >
          <i className="fas fa-times text-xs" />
        </button>
      </div>

      <div className="space-y-3">
        {steps.map((step, index) => (
          <div key={step.id} className={`rounded-2xl border p-3.5 ${stepCardStyles[step.status]}`}>
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${stepBadgeStyles[step.status]}`}>
                {step.status === 'done'
                  ? <i className="fas fa-check text-sm" />
                  : <i className={`fas ${step.icon} text-sm`} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-slate-400">Paso {index + 1}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${stepBadgeStyles[step.status]}`}>
                    {stepLabels[step.status]}
                  </span>
                </div>
                <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                <p className="text-sm text-slate-600 leading-relaxed mt-1">{step.description}</p>
                {step.actionLabel && step.onAction && (
                  <button
                    onClick={step.onAction}
                    className={`mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${step.status === 'warning' ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 'bg-blue-100 text-blue-800 hover:bg-blue-200'}`}
                  >
                    {step.actionLabel}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {note && (
        <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm leading-relaxed ${noteStyles}`}>
          <div className="flex items-start gap-2.5">
            <i className={`fas ${note.tone === 'emerald' ? 'fa-check-circle' : note.tone === 'amber' ? 'fa-exclamation-triangle' : 'fa-circle-info'} mt-0.5`} />
            <span>{note.text}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function CameraShareTutorialModal({
  open,
  retryMode,
  onClose,
  onPrimaryAction,
}: {
  open: boolean;
  retryMode: boolean;
  onClose: () => void;
  onPrimaryAction: () => void;
}) {
  if (!open) return null;

  const steps = retryMode
    ? [
        'Apaga la cámara actual para volver a configurarla.',
        'Al encenderla otra vez, elige "Esta pestaña" en la ventana del navegador.',
        'Activa "Compartir audio de la pestaña" antes de pulsar Compartir.',
      ]
    : [
        'En la ventana del navegador, selecciona "Esta pestaña".',
        'Activa la opción "Compartir audio de la pestaña".',
        'Después pulsa Compartir para que el video final se escuche como una videollamada.',
      ];

  return (
    <div className="fixed inset-0 z-[80] bg-slate-950/70 backdrop-blur-sm p-4 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-[28px] overflow-hidden bg-white shadow-2xl border border-slate-200">
        <div className="bg-gradient-to-r from-blue-950 via-blue-900 to-indigo-800 px-6 py-6 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-blue-200">Guia de camara</p>
          <h2 className="text-2xl font-bold mt-2">
            {retryMode ? 'Vamos a corregir la grabacion con audio del asistente' : 'Antes de encender tu camara'}
          </h2>
          <p className="text-sm text-blue-100 leading-relaxed mt-3">
            {retryMode
              ? 'La camara ya esta activa, pero la grabacion no incluye la voz del asistente. Haz esta reconfiguracion para que el video final se oiga como una videollamada.'
              : 'Si quieres que la grabacion tambien conserve la voz del asistente, comparte esta misma pestana con audio cuando el navegador te lo pida.'}
          </p>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 leading-relaxed">
            <div className="flex items-start gap-2.5">
              <i className="fas fa-volume-up mt-0.5 text-amber-500" />
              <span>Si no compartes el audio de la pestaña, el sistema seguira grabando tu camara y tu voz, pero no se escucharan las preguntas del bot dentro del video.</span>
            </div>
          </div>

          <div className="space-y-3">
            {steps.map((step, index) => (
              <div key={step} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-900 text-white flex items-center justify-center text-xs font-bold shrink-0">
                    {index + 1}
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed pt-1">{step}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors font-medium"
            >
              Ahora no
            </button>
            <button
              onClick={onPrimaryAction}
              className="px-5 py-2.5 rounded-xl bg-blue-900 hover:bg-blue-950 text-white transition-colors font-semibold"
            >
              {retryMode ? 'Apagar camara para reconfigurar' : 'Entendido, continuar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EntrevistaPage() {
  const params = useParams();
  const token = params.token as string;
  const [manualInput, setManualInput] = useState('');
  const [showTutorial, setShowTutorial] = useState(true);
  const [isRefreshingAudioInputs, setIsRefreshingAudioInputs] = useState(false);
  const [audioInputRefreshNotice, setAudioInputRefreshNotice] = useState<{ tone: 'info' | 'success' | 'warning'; text: string } | null>(null);
  const [showCameraSetupModal, setShowCameraSetupModal] = useState(false);
  const [cameraGuideSeen, setCameraGuideSeen] = useState(false);
  const [cameraGuideMode, setCameraGuideMode] = useState<'before-enable' | 'retry'>('before-enable');
  const liveRef = useRef<HTMLTextAreaElement | HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const {
    botState,
    sessionInfo,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions,
    isFollowUpQuestion,
    isGeminiThinking,
    liveTranscript,
    transcript,
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
  } = useVoiceBot(token);

  useEffect(() => {
    liveRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [liveTranscript]);

  // Asignar stream de cámara al elemento video cuando cambia
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = cameraStream;
    }
  }, [cameraStream]);

  const handleSubmit = () => {
    const text = manualInput.trim() || liveTranscript;
    if (!text || isCapturing || isTranscribing) return;
    submitAnswer(text);
    setManualInput('');
  };

  const progress = totalQuestions > 0
    ? Math.round((Math.min(currentQuestionIndex + 1, totalQuestions) / totalQuestions) * 100)
    : 0;
  const hasTranscriptDraft = Boolean(liveTranscript || manualInput.trim());
  const useManualAnswerMode = !speechSupported || forceManualInput;
  const isListening  = botState === 'listening';
  const isSpeaking   = botState === 'speaking';
  const isProcessing = botState === 'processing';
  const tutorialVisible = showTutorial || tabAudioCaptureStatus === 'missing' || tabAudioCaptureStatus === 'unsupported';
  const interviewStarted = !['loading', 'ready'].includes(botState);
  const cameraWithAssistantAudio = isCameraOn && recordingMode === 'composite';
  const cameraNeedsAudioRetry = isCameraOn && recordingMode === 'raw';
  const micSelectorDisabled = isCapturing || isTranscribing || isRefreshingAudioInputs;

  const handleRefreshAudioInputs = async () => {
    const previousIds = new Set(audioInputDevices.map((device) => device.deviceId));
    setIsRefreshingAudioInputs(true);
    setAudioInputRefreshNotice({ tone: 'info', text: 'Buscando micrófonos conectados y actualizando la lista...' });

    try {
      const refreshResult: AudioInputRefreshResult = await refreshAudioInputs();
      const refreshedDevices = refreshResult.audioInputs;
      const newDevices = refreshedDevices.filter((device) => !previousIds.has(device.deviceId));
      if (refreshResult.bluetoothOutputOnlyLabels.length > 0) {
        setAudioInputRefreshNotice({
          tone: 'warning',
          text: `Tus audífonos aparecen solo como salida de audio: ${refreshResult.bluetoothOutputOnlyLabels.join(', ')}. Windows o Brave no están exponiendo su micrófono; busca un perfil tipo Headset o Hands-Free en la configuración del sistema.`,
        });
      } else if (newDevices.length > 0) {
        setAudioInputRefreshNotice({
          tone: 'success',
          text: `Lista actualizada. Detectamos ${newDevices.length} micrófono${newDevices.length === 1 ? '' : 's'} nuevo${newDevices.length === 1 ? '' : 's'}: ${newDevices.map((device) => device.label).join(', ')}.`,
        });
      } else {
        setAudioInputRefreshNotice({
          tone: 'warning',
          text: 'Lista actualizada. Si tus audífonos Bluetooth no aparecen aquí, el navegador o Windows no los está exponiendo como entrada de micrófono.',
        });
      }
    } catch {
      setAudioInputRefreshNotice({
        tone: 'warning',
        text: 'No pudimos actualizar la lista de micrófonos. Revisa la conexión del dispositivo e inténtalo de nuevo.',
      });
    } finally {
      setIsRefreshingAudioInputs(false);
    }
  };

  const handleSelectAudioInput = async (deviceId: string) => {
    setAudioInputRefreshNotice(null);
    await selectAudioInput(deviceId);
  };

  const handleOpenCameraGuide = (mode: 'before-enable' | 'retry' = 'before-enable') => {
    setCameraGuideMode(mode);
    setShowCameraSetupModal(true);
  };

  const handleCameraToggle = () => {
    if (isCameraOn) {
      void toggleCamera();
      return;
    }

    if (!cameraGuideSeen || tabAudioCaptureStatus === 'missing' || tabAudioCaptureStatus === 'unsupported') {
      handleOpenCameraGuide('before-enable');
      return;
    }

    void toggleCamera();
  };

  const handleCameraGuidePrimaryAction = () => {
    if (cameraGuideMode === 'retry') {
      setCameraGuideSeen(false);
      setShowCameraSetupModal(false);
      if (isCameraOn) {
        void toggleCamera();
      }
      return;
    }

    setCameraGuideSeen(true);
    setShowCameraSetupModal(false);
    void toggleCamera();
  };

  let tutorialNote: { tone: 'sky' | 'emerald' | 'amber'; text: string } = {
    tone: 'sky',
    text: 'Si decides encender tu camara, comparte esta misma pestana con audio para que el video final incluya tambien la voz del asistente.',
  };

  if (cameraWithAssistantAudio) {
    tutorialNote = {
      tone: 'emerald',
      text: 'Grabacion tipo videollamada activa: el video final ya incluye tu camara, tu voz y la voz del asistente.',
    };
  } else if (cameraNeedsAudioRetry) {
    tutorialNote = {
      tone: 'amber',
      text: tabAudioCaptureStatus === 'unsupported'
        ? 'Tu navegador no esta exponiendo audio de pestaña. La entrevista seguira grabandose, pero el video final solo llevara tu voz.'
        : 'La camara esta activa, pero falta el audio de esta pestana. Si quieres que tambien se oigan las preguntas del asistente, apaga y vuelve a encender la camara siguiendo la guia.',
    };
  }

  const tutorialSteps: TutorialStep[] = [
    {
      id: 'start',
      icon: 'fa-play',
      title: 'Comienza la entrevista',
      description: 'Pulsa "Comenzar entrevista" para que el asistente lea la primera pregunta y arranque el flujo.',
      status: botState === 'ready' ? 'current' : 'done',
    },
    {
      id: 'camera',
      icon: 'fa-video',
      title: 'Si quieres video tipo videollamada, enciende tu camara',
      description: cameraWithAssistantAudio
        ? 'La grabacion ya esta configurada con tu camara, tu voz y la voz del asistente.'
        : cameraNeedsAudioRetry
        ? tabAudioCaptureStatus === 'unsupported'
          ? 'Tu navegador no esta entregando audio de pestaña. El video seguira grabando tu voz y tu camara.'
          : 'La camara esta activa, pero debes reconfigurarla para que tambien se escuchen las preguntas del asistente.'
        : 'Cuando el navegador abra la ventana de compartir, elige "Esta pestaña" y activa "Compartir audio de la pestaña".',
      status: cameraWithAssistantAudio
        ? 'done'
        : cameraNeedsAudioRetry
        ? 'warning'
        : interviewStarted && !cameraGuideSeen
        ? 'current'
        : 'upcoming',
      actionLabel: cameraWithAssistantAudio ? undefined : cameraNeedsAudioRetry ? 'Reconfigurar' : 'Ver pasos',
      onAction: cameraWithAssistantAudio ? undefined : () => handleOpenCameraGuide(cameraNeedsAudioRetry ? 'retry' : 'before-enable'),
    },
    {
      id: 'listen',
      icon: 'fa-volume-up',
      title: 'Escucha la pregunta completa',
      description: 'Deja que el asistente termine de hablar antes de responder. Si aparece una repregunta, espera a que se lea por completo.',
      status: isSpeaking || isGeminiThinking
        ? 'current'
        : currentQuestion || isListening || isCapturing || hasTranscriptDraft || isProcessing || botState === 'completed'
        ? 'done'
        : 'upcoming',
    },
    {
      id: 'answer',
      icon: useManualAnswerMode ? 'fa-keyboard' : 'fa-microphone',
      title: useManualAnswerMode ? 'Responde por texto' : 'Responde con el boton Hablar',
      description: useManualAnswerMode
        ? 'Escribe tu respuesta y enviala cuando estes lista.'
        : 'Pulsa "Hablar" para responder y "Detener" cuando hayas terminado.',
      status: isListening || isCapturing
        ? 'current'
        : hasTranscriptDraft || isProcessing || currentQuestionIndex > 0 || botState === 'completed'
        ? 'done'
        : 'upcoming',
    },
    {
      id: 'review',
      icon: 'fa-paper-plane',
      title: 'Revisa y envia tu respuesta',
      description: 'Cuando pares de hablar, revisa la transcripcion, corrige lo necesario y luego pulsa "Enviar respuesta".',
      status: hasTranscriptDraft && !isCapturing
        ? 'current'
        : isProcessing || currentQuestionIndex > 0 || botState === 'completed'
        ? 'done'
        : 'upcoming',
    },
  ];

  const recordingBanner = isCameraOn
    ? cameraWithAssistantAudio
      ? {
          tone: 'emerald' as const,
          icon: 'fa-check-circle',
          title: 'Grabacion tipo videollamada activa',
          text: 'La entrevista se esta guardando con tu camara, tu voz y la voz del asistente.',
        }
      : {
          tone: 'amber' as const,
          icon: 'fa-exclamation-triangle',
          title: 'La camara esta grabando, pero falta el audio del asistente',
          text: tabAudioCaptureStatus === 'unsupported'
            ? 'Tu navegador no esta exponiendo audio de pestaña. El video final seguira guardando tu camara y tu voz.'
            : 'Para que tambien se oigan las preguntas del bot, apaga y vuelve a encender la camara y elige "Esta pestaña" con "Compartir audio de la pestaña".',
        }
    : null;

  // ── Carga ────────────────────────────────────────────────────────────────
  if (botState === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center relative">
        <BausenLogo />
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-blue-900 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderWidth: '3px' }} />
          <p className="text-slate-500 text-sm font-medium">Conectando con el servidor...</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (botState === 'error') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative">
        <BausenLogo />
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-slate-100">
          <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-exclamation-triangle text-red-500 text-xl" />
          </div>
          <h2 className="text-slate-800 text-xl font-bold mb-2">Algo salió mal</h2>
          <p className="text-slate-500 text-sm mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2.5 bg-blue-900 hover:bg-blue-950 text-white rounded-lg font-medium transition-colors text-sm"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // ── Ya completada ─────────────────────────────────────────────────────────
  if (botState === 'already_done') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative">
        <BausenLogo />
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-md w-full text-center border border-slate-100">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <i className="fas fa-check-circle text-emerald-500 text-2xl" />
          </div>
          <h2 className="text-slate-800 text-xl font-bold mb-2">Entrevista completada</h2>
          <p className="text-slate-500 text-sm">Esta entrevista ya fue realizada. Gracias por tu tiempo.</p>
        </div>
      </div>
    );
  }

  // ── Completada ────────────────────────────────────────────────────────────
  if (botState === 'completed') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative">
        <BausenLogo />
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-lg w-full border border-slate-100">
          {/* Checkmark animado */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center">
              <i className="fas fa-check-circle text-emerald-500 text-4xl" />
            </div>
          </div>
          <h2 className="text-slate-800 text-2xl font-bold text-center mb-2">¡Excelente trabajo!</h2>
          <p className="text-slate-500 text-sm text-center mb-8">
            Tu entrevista fue registrada. El equipo de reclutamiento revisará
            tus respuestas y se pondrá en contacto contigo pronto.
          </p>
          <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
            <p className="text-xs text-slate-400 font-semibold mb-3 uppercase tracking-widest">
              Resumen de respuestas
            </p>
            <p className="text-sm text-slate-600 whitespace-pre-wrap max-h-52 overflow-y-auto leading-relaxed">
              {transcript}
            </p>
          </div>
          <p className="text-xs text-slate-400 text-center mt-6">Puedes cerrar esta ventana.</p>
        </div>
      </div>
    );
  }

  // ── Bienvenida ────────────────────────────────────────────────────────────
  if (botState === 'ready') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative">
        <BausenLogo />
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-100 overflow-hidden">
          {/* Banner superior */}
          <div className="bg-gradient-to-r from-blue-950 to-blue-800 px-8 py-8 text-white">
            <div className="mb-5">
              <Image src="/Logo_Blanco.png" alt="Bausen" width={120} height={38} style={{ width: 120, height: 38 }} className="object-contain" priority />
            </div>
            <div>
              <p className="text-xs text-blue-200 font-medium uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <i className="fas fa-robot text-blue-300 text-[11px]" />
                Entrevista Virtual IA
              </p>
              <h1 className="text-white font-bold text-xl leading-tight">
                {sessionInfo?.jobTitle || 'Entrevista Virtual'}
              </h1>
            </div>
            {sessionInfo?.candidateName && (
              <p className="text-blue-100 text-sm mt-3">
                Hola, <span className="font-semibold text-white">{sessionInfo.candidateName}</span>
              </p>
            )}
          </div>

          <div className="p-8">
            {/* Info pills */}
            <div className="flex flex-wrap gap-2 mb-7">
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs text-slate-600 font-medium">
                <i className="fas fa-list-ol text-blue-700" />
                {totalQuestions} temas base
              </span>
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-full text-xs text-slate-600 font-medium">
                <i className="fas fa-clock text-blue-700" />
                ~{Math.max(totalQuestions * 2, 8)}-{Math.max(totalQuestions * 3, 12)} min
              </span>
              {speechSupported
                ? <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-full text-xs text-emerald-700 font-medium">
                    <i className="fas fa-microphone text-emerald-500" />
                    Voz activada
                  </span>
                : <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-full text-xs text-amber-700 font-medium">
                    <i className="fas fa-keyboard text-amber-500" />
                    Modo texto
                  </span>
              }
            </div>

            {/* Instrucciones */}
            <div className="space-y-3 mb-7">
              {[
                { icon: 'fa-volume-up', color: 'text-blue-700', text: 'El asistente leerá cada pregunta en voz alta' },
                { icon: speechSupported ? 'fa-microphone' : 'fa-keyboard', color: 'text-blue-600',
                  text: speechSupported ? 'Presiona \"Hablar\" cuando estés listo para responder' : 'Escribe tu respuesta en el campo de texto' },
                { icon: 'fa-comments', color: 'text-violet-600', text: 'Según tu respuesta, el asistente puede hacer una breve repregunta para profundizar' },
                { icon: 'fa-stop-circle', color: 'text-blue-700', text: 'Presiona \"Detener\" al terminar — revisa el texto y envíalo' },
                { icon: 'fa-shield-alt', color: 'text-emerald-500', text: 'Tus respuestas son confidenciales y seguras' },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-slate-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <i className={`fas ${item.icon} ${item.color} text-xs`} />
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>

            {tutorialVisible ? (
              <div className="mb-7">
                <InterviewTutorialPanel
                  steps={tutorialSteps}
                  note={tutorialNote}
                  onClose={() => setShowTutorial(false)}
                />
              </div>
            ) : (
              <button
                onClick={() => setShowTutorial(true)}
                className="mb-7 w-full px-4 py-3 rounded-2xl border border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100 transition-colors font-semibold text-sm flex items-center justify-center gap-2"
              >
                <i className="fas fa-circle-info text-xs" />
                Mostrar guia paso a paso
              </button>
            )}

            <button
              onClick={startInterview}
              className="w-full py-3.5 bg-blue-900 hover:bg-blue-950 active:bg-blue-950 text-white rounded-xl font-semibold text-base transition-all duration-200 flex items-center justify-center gap-2.5 shadow-lg shadow-blue-200"
            >
              <i className="fas fa-play text-sm" />
              Comenzar entrevista
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* ── Header ── */}
      <header className="bg-white border-b border-slate-200 px-5 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={bausenLogo.src}
            alt="Bausen"
            width={bausenLogo.width}
            height={bausenLogo.height}
            style={{ width: 96, height: 'auto' }}
          />
          <div className="hidden sm:block w-px h-6 bg-slate-200" />
          <div className="hidden sm:block">
            <p className="text-slate-700 font-semibold text-sm leading-tight">
              {sessionInfo?.jobTitle || 'Entrevista Virtual'}
            </p>
            {sessionInfo?.candidateName && (
              <p className="text-slate-400 text-xs">{sessionInfo.candidateName}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Silenciar bot */}
          <button
            onClick={toggleMute}
            title={isMuted ? 'Activar voz del bot' : 'Silenciar bot'}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
              isMuted
                ? 'bg-red-50 text-red-500 hover:bg-red-100'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <i className={`fas ${isMuted ? 'fa-volume-mute' : 'fa-volume-up'}`} />
          </button>
          {/* Micrófono usuario */}
          <button
            onClick={toggleMicMute}
            title={isMicMuted ? 'Activar micrófono' : 'Silenciar micrófono'}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
              isMicMuted
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <i className={`fas ${isMicMuted ? 'fa-microphone-slash' : 'fa-microphone'}`} />
          </button>
          {/* Cámara */}
          <button
            onClick={handleCameraToggle}
            title={isCameraOn ? 'Apagar cámara' : 'Encender cámara y grabación tipo videollamada'}
            className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
              isCameraOn
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            <i className={`fas ${isCameraOn ? 'fa-video' : 'fa-video-slash'}`} />
          </button>
          <div className="w-px h-5 bg-slate-200" />
          <button
            onClick={finishEarly}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            Finalizar
          </button>
        </div>
      </header>

      {/* ── Barra de progreso ── */}
      <div className="bg-white border-b border-slate-100 px-5 py-2.5">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5 font-medium">
          <span>
            Tema {Math.min(currentQuestionIndex + 1, totalQuestions || currentQuestionIndex + 1)} de {totalQuestions}
            {isFollowUpQuestion ? ' · Seguimiento' : ''}
          </span>
          <span className="text-blue-900 font-semibold">{progress}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-700 to-blue-900 rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {recordingBanner && (
        <div className={`px-5 py-3 border-b ${recordingBanner.tone === 'emerald' ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className="max-w-2xl mx-auto w-full flex items-start gap-3 text-sm">
            <i className={`fas ${recordingBanner.icon} mt-0.5 ${recordingBanner.tone === 'emerald' ? 'text-emerald-600' : 'text-amber-500'}`} />
            <div>
              <p className={`font-semibold ${recordingBanner.tone === 'emerald' ? 'text-emerald-800' : 'text-amber-900'}`}>{recordingBanner.title}</p>
              <p className={`${recordingBanner.tone === 'emerald' ? 'text-emerald-700' : 'text-amber-800'} leading-relaxed`}>{recordingBanner.text}</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Cuerpo ── */}
      <div className="flex-1 flex flex-col items-center justify-start p-5 gap-5 overflow-y-auto max-w-2xl mx-auto w-full">

        {tutorialVisible ? (
          <InterviewTutorialPanel
            steps={tutorialSteps}
            note={tutorialNote}
            onClose={() => setShowTutorial(false)}
          />
        ) : (
          <button
            onClick={() => setShowTutorial(true)}
            className="self-start px-4 py-2 rounded-full border border-blue-200 bg-white text-blue-800 hover:bg-blue-50 transition-colors text-sm font-semibold shadow-sm"
          >
            <i className="fas fa-circle-info mr-2 text-xs" />
            Mostrar guia interactiva
          </button>
        )}

        {/* ── Orbe de voz ── */}
        <div className="flex flex-col items-center gap-3 pt-4">
          {/* Círculo principal */}
          <div
            className={`relative flex items-center justify-center rounded-full transition-all duration-500 ${
              isListening && isCapturing && isUserSpeaking
                ? 'w-40 h-40 shadow-[0_0_60px_rgba(14,165,233,0.35)]'
                : isListening && isCapturing
                ? 'w-36 h-36 shadow-[0_0_40px_rgba(239,68,68,0.2)]'
                : isSpeaking
                ? 'w-36 h-36 shadow-[0_0_40px_rgba(30,58,138,0.25)]'
                : 'w-32 h-32'
            }`}
            style={{
              background: isListening && isCapturing && isUserSpeaking
                ? 'radial-gradient(circle, #e0f2fe 0%, #f0f9ff 60%, #f8fafc 100%)'
                : isListening && isCapturing
                ? 'radial-gradient(circle, #fff1f2 0%, #fff5f5 60%, #f8fafc 100%)'
                : isSpeaking
                ? 'radial-gradient(circle, #eef2ff 0%, #f5f3ff 60%, #f8fafc 100%)'
                : 'radial-gradient(circle, #f1f5f9 0%, #f8fafc 100%)',
              border: isListening && isCapturing && isUserSpeaking
                ? '2px solid rgba(14,165,233,0.3)'
                : isListening && isCapturing
                ? '2px solid rgba(239,68,68,0.2)'
                : isSpeaking
                ? '2px solid rgba(30,58,138,0.2)'
                : '2px solid rgba(226,232,240,0.8)',
            }}
          >
            {/* Anillos pulsantes — usuario hablando */}
            {isListening && isCapturing && isUserSpeaking && (
              <>
                <div className="absolute inset-[-8px] rounded-full border border-blue-400/40"
                  style={{ animation: 'ping-ring 1.3s ease-out infinite' }} />
                <div className="absolute inset-[-18px] rounded-full border border-blue-300/20"
                  style={{ animation: 'ping-ring 1.3s ease-out 0.4s infinite' }} />
              </>
            )}
            {/* Pulso bot hablando */}
            {isSpeaking && (
              <div className="absolute inset-[-8px] rounded-full border border-blue-800/30"
                style={{ animation: 'ping-ring 2s ease-out infinite' }} />
            )}
            <SiriWave
              active={isListening && isCapturing || isSpeaking}
              userSpeaking={isListening && isCapturing && isUserSpeaking}
              botSpeaking={isSpeaking}
              audioLevel={audioLevel}
            />
          </div>

          {/* Chip de estado */}
          <div className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-300 ${
            isListening && isCapturing && isUserSpeaking
              ? 'bg-blue-50 text-blue-700'
              : isListening && isCapturing
              ? 'bg-red-50 text-red-600'
              : isListening
              ? 'bg-slate-100 text-slate-500'
              : isSpeaking
              ? 'bg-blue-50 text-blue-900'
              : isProcessing
              ? 'bg-amber-50 text-amber-600'
              : 'bg-slate-100 text-slate-500'
          }`}>
            {isListening && isCapturing && isUserSpeaking
              ? <><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />Escuchándote</>
              : isListening && isCapturing
              ? <><span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />Mic activo</>
              : isListening
              ? <><span className="w-1.5 h-1.5 rounded-full bg-slate-400" />Presiona &quot;Hablar&quot; para responder</>
              : isSpeaking
              ? <><span className="w-1.5 h-1.5 rounded-full bg-blue-900 animate-pulse" />Leyendo pregunta</>
              : isProcessing
              ? isGeminiThinking
                ? <><i className="fas fa-sparkles text-[10px] animate-pulse" />Gemini está pensando una repregunta...</>
                : <><i className="fas fa-spinner fa-spin text-[10px]" />Analizando tu respuesta...</>
              : null
            }
          </div>
        </div>

        {isGeminiThinking && (
          <div className="w-full rounded-2xl border border-violet-200 bg-gradient-to-br from-violet-50 to-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-2 text-violet-700">
              <i className="fas fa-sparkles animate-pulse text-sm" />
              <span className="text-sm font-semibold">Gemini está pensando cómo profundizar</span>
            </div>
            <p className="text-sm text-violet-800 leading-relaxed mb-3">
              Está revisando tu respuesta para hacer una repregunta más específica y natural antes de continuar.
            </p>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce [animation-delay:-0.2s]"></span>
              <span className="w-2 h-2 rounded-full bg-violet-500 animate-bounce [animation-delay:-0.1s]"></span>
              <span className="w-2 h-2 rounded-full bg-violet-600 animate-bounce"></span>
            </div>
          </div>
        )}

        {/* ── Tarjeta de pregunta ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 w-full">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 bg-blue-900 rounded-md flex items-center justify-center flex-shrink-0">
              <i className="fas fa-robot text-white text-[9px]" />
            </span>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Asistente IA
            </span>
            {isFollowUpQuestion && (
              <span className="px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 text-[11px] font-semibold uppercase tracking-wide">
                Seguimiento
              </span>
            )}
            {isSpeaking && (
              <span className="ml-auto flex items-center gap-1 text-xs text-blue-700 font-medium">
                <i className="fas fa-volume-up animate-pulse text-[10px]" />
                Leyendo...
              </span>
            )}
          </div>
          {isFollowUpQuestion && (
            <p className="text-xs text-violet-600 font-medium mb-3">
              El asistente está profundizando en algo relevante de tu respuesta anterior.
            </p>
          )}
          <p className="text-slate-800 text-base leading-relaxed font-medium">
            {currentQuestion}
          </p>
        </div>

        {speechSupported && (
          <MicrophoneSelectorCard
            devices={audioInputDevices}
            selectedDeviceId={selectedAudioInputId}
            disabled={micSelectorDisabled}
            isRefreshing={isRefreshingAudioInputs}
            refreshNotice={audioInputRefreshNotice}
            onSelect={handleSelectAudioInput}
            onRefresh={handleRefreshAudioInputs}
          />
        )}

        {/* ── Zona de respuesta (modo push-to-talk) ── */}
        {isListening && !useManualAnswerMode && (
          <div className="w-full space-y-4">

            {/* ── Botón principal: Hablar / Detener ── */}
            {!isCapturing ? (
              /* Estado: esperando que el usuario presione */
              <div className="flex flex-col items-center gap-3 py-2">
                <button
                  onClick={startCapture}
                  className="relative flex flex-col items-center justify-center w-28 h-28 rounded-full bg-blue-900 hover:bg-blue-800 active:scale-95 text-white shadow-xl shadow-blue-200 transition-all duration-150 focus:outline-none"
                >
                  <i className="fas fa-microphone text-3xl mb-1" />
                  <span className="text-xs font-semibold tracking-wide">Hablar</span>
                </button>
                <p className="text-xs text-slate-400 font-medium text-center">
                  Presiona el botón cuando estés listo para responder
                </p>
              </div>
            ) : (
              /* Estado: candidato está hablando */
              <div className="flex flex-col items-center gap-3 py-2">
                {/* Anillos de actividad */}
                <div className="relative flex items-center justify-center">
                  {/* Ring exterior animado */}
                  <div
                    className="absolute w-36 h-36 rounded-full border-2 border-blue-400/40"
                    style={{ animation: 'ping-ring 1.4s ease-out infinite' }}
                  />
                  <div
                    className="absolute w-32 h-32 rounded-full border border-blue-300/25"
                    style={{ animation: 'ping-ring 1.4s ease-out 0.35s infinite' }}
                  />
                  <button
                    onClick={stopCapture}
                    className="relative flex flex-col items-center justify-center w-28 h-28 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 text-white shadow-xl shadow-red-200 transition-all duration-150 focus:outline-none z-10"
                  >
                    <i className="fas fa-stop text-2xl mb-1" />
                    <span className="text-xs font-semibold tracking-wide">Detener</span>
                  </button>
                </div>
                <p className={`text-xs font-semibold text-center ${isUserSpeaking ? 'text-blue-600' : 'text-slate-400'}`}>
                  {isUserSpeaking
                    ? <><i className="fas fa-circle text-[8px] animate-pulse mr-1" />Grabando tu voz...</>
                    : 'Escuchando... habla cuando quieras'}
                </p>
              </div>
            )}

            {/* ── Error de reconocimiento de voz ── */}
            {speechError && (
              <div className="flex items-start gap-2.5 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
                <i className="fas fa-exclamation-triangle text-amber-500 mt-0.5 flex-shrink-0" />
                <span className="flex-1">{speechError}</span>
              </div>
            )}

            {/* ── Estado de transcripción / texto final ── */}
            {isCapturing ? (
              <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-gradient-to-br from-blue-50 via-white to-sky-50 p-5 shadow-sm shadow-blue-100">
                <div className="flex items-center gap-2 text-blue-700 mb-3">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Transcribiendo en segundo plano</span>
                </div>
                <div className="flex items-end gap-2 h-14 mb-4">
                  {[0, 1, 2, 3, 4, 5, 6].map((bar) => (
                    <div
                      key={bar}
                      className="flex-1 rounded-full bg-gradient-to-t from-blue-200 via-blue-400 to-sky-300 opacity-80"
                      style={{
                        height: `${28 + ((bar % 4) * 8)}px`,
                        animation: `siri-bar ${0.45 + (bar * 0.05)}s ease-in-out ${bar * 0.06}s infinite alternate`,
                        animationPlayState: isUserSpeaking ? 'running' : 'paused',
                      }}
                    />
                  ))}
                </div>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Sigue hablando con normalidad. Cuando presiones <span className="font-semibold text-slate-800">Detener</span>,
                  aquí aparecerá la transcripción completa de tu respuesta para revisarla y editarla si hace falta.
                </p>
              </div>
            ) : isTranscribing && !hasTranscriptDraft ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
                <div className="flex items-center gap-2 text-amber-700 mb-2">
                  <i className="fas fa-spinner fa-spin text-sm" />
                  <span className="text-xs font-semibold uppercase tracking-wider">Preparando tu transcripción</span>
                </div>
                <p className="text-sm text-amber-800 leading-relaxed">
                  Estamos convirtiendo tu respuesta a texto. En un momento verás aquí la transcripción completa para revisarla antes de enviarla.
                </p>
              </div>
            ) : hasTranscriptDraft ? (
              <div className="rounded-2xl border-2 border-slate-200 overflow-hidden transition-all duration-300 shadow-sm">
                <div className="flex items-center justify-between px-4 pt-3 pb-1 bg-white">
                  <div className="flex items-center gap-1.5 text-slate-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-xs font-semibold uppercase tracking-wider">
                      Tu respuesta transcrita — puedes editar
                    </span>
                  </div>
                  {manualInput && (
                    <button
                      onClick={() => setManualInput('')}
                      className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-red-500 transition-colors font-medium"
                    >
                      <i className="fas fa-undo text-[9px]" /> Deshacer edición
                    </button>
                  )}
                </div>
                <textarea
                  ref={liveRef as React.RefObject<HTMLTextAreaElement>}
                  rows={4}
                  value={manualInput || liveTranscript}
                  onChange={e => setManualInput(e.target.value)}
                  placeholder="Aquí aparecerá tu respuesta transcrita..."
                  className="w-full px-4 py-3 text-sm text-slate-800 placeholder-slate-400 resize-none focus:outline-none leading-relaxed bg-white"
                />
              </div>
            ) : null}

            {/* ── Botones de acción ── */}
            <div className="space-y-2">
              <button
                onClick={handleSubmit}
                disabled={!hasTranscriptDraft || isCapturing || isTranscribing}
                className="w-full py-3.5 bg-blue-900 hover:bg-blue-950 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:cursor-not-allowed shadow-md shadow-blue-200 disabled:shadow-none"
              >
                <i className="fas fa-paper-plane text-xs" />
                {isCapturing
                  ? 'Detén primero para revisar'
                  : isTranscribing
                  ? 'Preparando transcripción...'
                  : 'Enviar respuesta'}
              </button>

              <button
                onClick={() => submitAnswer('[Sin respuesta]')}
                className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                Omitir esta pregunta
              </button>
            </div>
          </div>
        )}

        {/* ── Solo texto (sin soporte de voz) ── */}
        {isListening && useManualAnswerMode && (
          <div className="w-full space-y-3">
            {forceManualInput && speechSupported && (
              <div className="flex items-start justify-between gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 font-medium">
                <div className="flex items-start gap-2.5 min-w-0">
                  <i className="fas fa-keyboard text-blue-500 mt-0.5 flex-shrink-0" />
                  <span className="flex-1">Cambiamos automáticamente a modo texto para que puedas continuar sin depender del micrófono.</span>
                </div>
                <button
                  onClick={retryListening}
                  className="shrink-0 px-2.5 py-1 rounded-md bg-white border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors font-semibold"
                >
                  Reintentar voz
                </button>
              </div>
            )}
            <textarea
              rows={4}
              value={manualInput}
              onChange={e => setManualInput(e.target.value)}
              placeholder="Escribe tu respuesta aquí..."
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-800 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-700 resize-none shadow-sm"
              autoFocus
            />
            <button
              onClick={() => { submitAnswer(manualInput); setManualInput(''); }}
              disabled={!manualInput.trim()}
              className="w-full py-3.5 bg-blue-900 hover:bg-blue-950 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl font-semibold text-sm transition-all disabled:cursor-not-allowed"
            >
              <i className="fas fa-paper-plane mr-2 text-xs" />
              Enviar respuesta
            </button>
            <button
              onClick={() => submitAnswer('[Sin respuesta]')}
              className="w-full py-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              Omitir esta pregunta
            </button>
          </div>
        )}

      </div>

      {/* ── Footer ── */}
      <footer className="border-t border-slate-200 bg-white px-5 py-3 flex items-center justify-between">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={bausenLogo.src}
          alt="Bausen"
          width={bausenLogo.width}
          height={bausenLogo.height}
          style={{ width: 76, height: 'auto' }}
        />
        <p className="text-xs text-slate-400">
          Entrevista Virtual · Tus respuestas son confidenciales
        </p>
      </footer>

      {/* ── Video preview flotante (PiP) ── */}
      {isCameraOn && (
        <div className="fixed bottom-16 right-4 z-50 rounded-xl overflow-hidden border-2 border-blue-900 shadow-2xl bg-black" style={{ width: '192px', height: '144px' }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover scale-x-[-1]"
          />
          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/50 rounded-full px-2 py-0.5">
            {recordingUploading ? (
              <><i className="fas fa-spinner fa-spin text-white text-[9px]" /><span className="text-white text-[10px] font-medium">Subiendo...</span></>
            ) : isRecording ? (
              <>
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${recordingMode === 'composite' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                <span className="text-white text-[10px] font-medium">{recordingMode === 'composite' ? 'Grabando: asistente + camara' : 'Grabando: solo tu voz'}</span>
              </>
            ) : (
              <><span className="w-1.5 h-1.5 rounded-full bg-slate-400" /><span className="text-white text-[10px] font-medium">Cámara</span></>
            )}
          </div>
        </div>
      )}

      <CameraShareTutorialModal
        open={showCameraSetupModal}
        retryMode={cameraGuideMode === 'retry'}
        onClose={() => setShowCameraSetupModal(false)}
        onPrimaryAction={handleCameraGuidePrimaryAction}
      />
    </div>
  );
}

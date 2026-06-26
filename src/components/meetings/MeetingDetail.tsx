'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useModal } from '@/context/ModalContext';
import { meetingsApi, feedbackApi, interviewsApi, type InterviewSession } from '@/lib/api-meetings';
import type { Meeting, InterviewFeedback, MeetingStatus, AiAnalysisStatus } from '@/types/meetings';
import InterviewFeedbackForm from './InterviewFeedbackForm';
import MeetingFormModal from './MeetingFormModal';

interface Props {
  meeting: Meeting;
  onClose: () => void;
  onRefresh: () => void;
}

const STATUS_COLORS: Record<MeetingStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  rescheduled: 'bg-yellow-100 text-yellow-800',
};

const RECOMMENDATION_CONFIG = {
  advance: { label: 'Avanzar', color: 'text-green-700 bg-green-50', icon: 'fa-thumbs-up' },
  hold: { label: 'En revisión', color: 'text-yellow-700 bg-yellow-50', icon: 'fa-pause-circle' },
  reject: { label: 'No continuar', color: 'text-red-700 bg-red-50', icon: 'fa-thumbs-down' },
};

const BOT_CUSTOM_QUESTION_LIMITS: Record<MeetingStatus | 'hr' | 'technical' | 'initial' | 'final' | 'group' | 'follow_up', number> = {
  scheduled: 6,
  in_progress: 6,
  completed: 6,
  cancelled: 6,
  rescheduled: 6,
  initial: 4,
  hr: 6,
  technical: 6,
  final: 5,
  group: 4,
  follow_up: 3,
};

// ── Componente panel de análisis IA ───────────────────────────────────────────
function AiAnalysisPanel({
  status,
  result,
}: {
  status: AiAnalysisStatus;
  result: Meeting['ai_analysis_result'];
}) {
  const REC_CONFIG: Record<string, { label: string; color: string; icon: string }> = {
    advance: { label: 'Avanzar al siguiente paso', color: 'text-green-700 bg-green-100', icon: 'fa-thumbs-up' },
    hold:    { label: 'En revisión',               color: 'text-yellow-700 bg-yellow-100', icon: 'fa-pause-circle' },
    reject:  { label: 'No continuar',              color: 'text-red-700 bg-red-100',    icon: 'fa-thumbs-down' },
  };

  if (status === 'pending' || status === 'processing') {
    return (
      <div className="mb-4 bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-center gap-3 text-violet-700">
        <i className="fas fa-spinner fa-spin text-violet-500"></i>
        <div>
          <p className="text-sm font-semibold">Análisis IA en proceso</p>
          <p className="text-xs text-violet-500">Gemini está analizando la transcripción. Recarga en unos minutos.</p>
        </div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3 text-red-700">
        <i className="fas fa-exclamation-circle text-red-400"></i>
        <div>
          <p className="text-sm font-semibold">El análisis IA falló</p>
          <p className="text-xs text-red-500">
            {(result as { error?: string } | null)?.error ?? 'Error desconocido.'}
            {' '}Usa el botón &quot;Analizar con IA&quot; para reintentar.
          </p>
        </div>
      </div>
    );
  }

  if (status === 'skipped') {
    return (
      <div className="mb-4 bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center gap-3 text-gray-500">
        <i className="fas fa-info-circle"></i>
        <p className="text-sm">Sin transcripción disponible para analizar. Agrega una y usa &quot;Analizar con IA&quot;.</p>
      </div>
    );
  }

  if (status !== 'completed' || !result) return null;

  const rec = result.recommendation ? REC_CONFIG[result.recommendation] : null;
  const confidence = result.confidence ?? 0;

  return (
    <div className="mb-4 border border-violet-200 rounded-xl overflow-hidden">
      {/* Header del panel */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-white">
          <i className="fas fa-robot"></i>
          <span className="text-sm font-semibold">Análisis Gemini AI</span>
        </div>
        <div className="flex items-center gap-2">
          {rec && (
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${rec.color}`}>
              <i className={`fas ${rec.icon}`}></i> {rec.label}
            </span>
          )}
          <div className="flex items-center gap-1 bg-white/20 px-2.5 py-1 rounded-full">
            <i className="fas fa-star text-yellow-300 text-xs"></i>
            <span className="text-white text-sm font-bold">{result.overall_rating ?? '—'}/10</span>
          </div>
        </div>
      </div>

      <div className="p-4 bg-violet-50 space-y-4">
        {/* Barras de puntuación */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: 'Habilidades Técnicas', score: result.technical_score, color: 'bg-blue-500' },
            { label: 'Habilidades Blandas',  score: result.soft_skills_score, color: 'bg-purple-500' },
            { label: 'Comunicación',         score: result.communication_score, color: 'bg-teal-500' },
          ].map(({ label, score, color }) =>
            score != null ? (
              <div key={label}>
                <div className="flex justify-between text-xs text-gray-600 mb-1">
                  <span>{label}</span><span className="font-bold">{score}/10</span>
                </div>
                <div className="h-1.5 bg-gray-200 rounded-full">
                  <div className={`h-full ${color} rounded-full`} style={{ width: `${score * 10}%` }} />
                </div>
              </div>
            ) : null
          )}
        </div>

        {/* Fortalezas / Debilidades */}
        {(result.strengths || result.weaknesses) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {result.strengths && (
              <div className="bg-white rounded-lg p-3 border border-green-100">
                <p className="text-xs font-semibold text-green-700 mb-1">
                  <i className="fas fa-star text-yellow-400 mr-1"></i>Fortalezas
                </p>
                <p className="text-xs text-gray-600">{result.strengths}</p>
              </div>
            )}
            {result.weaknesses && (
              <div className="bg-white rounded-lg p-3 border border-orange-100">
                <p className="text-xs font-semibold text-orange-700 mb-1">
                  <i className="fas fa-exclamation-triangle text-orange-400 mr-1"></i>Áreas de mejora
                </p>
                <p className="text-xs text-gray-600">{result.weaknesses}</p>
              </div>
            )}
          </div>
        )}

        {/* Notas */}
        {result.notes && (
          <div className="bg-white rounded-lg p-3 border border-violet-100">
            <p className="text-xs font-semibold text-violet-700 mb-2">
              <i className="fas fa-file-alt mr-1"></i>Resumen ejecutivo
            </p>
            <p className="text-xs text-gray-600 whitespace-pre-wrap">{result.notes}</p>
          </div>
        )}

        {/* Temas clave y señales de alerta */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {result.key_topics && result.key_topics.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1.5">
                <i className="fas fa-tags mr-1 text-violet-400"></i>Temas discutidos
              </p>
              <div className="flex flex-wrap gap-1">
                {result.key_topics.map((t, i) => (
                  <span key={i} className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
            </div>
          )}
          {result.red_flags && result.red_flags.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-600 mb-1.5">
                <i className="fas fa-flag mr-1"></i>Señales de alerta
              </p>
              <ul className="space-y-0.5">
                {result.red_flags.map((f, i) => (
                  <li key={i} className="text-xs text-red-600 flex items-start gap-1">
                    <i className="fas fa-circle text-[6px] mt-1.5 flex-shrink-0"></i>{f}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Confianza */}
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-violet-100">
          <i className="fas fa-brain text-violet-300 text-xs"></i>
          <span className="text-xs text-violet-400">Confianza del análisis: {confidence}%</span>
        </div>
      </div>
    </div>
  );
}


export default function MeetingDetail({ meeting: initialMeeting, onClose, onRefresh }: Props) {
  const { showConfirm, showSuccess, showError } = useModal();
  const [meeting, setMeeting] = useState<Meeting>(initialMeeting);
  const [feedbacks, setFeedbacks] = useState<InterviewFeedback[]>(initialMeeting.feedbacks || []);
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  const [editFeedback, setEditFeedback] = useState<InterviewFeedback | undefined>(undefined);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showTranscription, setShowTranscription] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [completingLoading, setCompletingLoading] = useState(false);
  const [analyzingLoading, setAnalyzingLoading] = useState(false);
  const [showTranscriptionInput, setShowTranscriptionInput] = useState(false);
  const [transcriptionInput, setTranscriptionInput] = useState('');

  // Bot de entrevistas
  const [botSessions, setBotSessions] = useState<InterviewSession[]>([]);
  const [generatingBotMode, setGeneratingBotMode] = useState<'custom' | 'gemini' | null>(null);
  const [showBotPanel, setShowBotPanel] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [expandedRecordingId, setExpandedRecordingId] = useState<number | null>(null);
  const [expandedQuestionsId, setExpandedQuestionsId] = useState<number | null>(null);
  const [botQuestionsInput, setBotQuestionsInput] = useState((initialMeeting.bot_custom_questions || []).join('\n'));
  const [savingBotQuestions, setSavingBotQuestions] = useState(false);
  const [openingBotDirect, setOpeningBotDirect] = useState(false);

  const loadBotSessions = useCallback(async () => {
    try {
      const sessions = await interviewsApi.listSessions(meeting.id);
      setBotSessions(sessions);
    } catch {}
  }, [meeting.id]);

  const parseBotCustomQuestions = (value: string) =>
    value
      .split('\n')
      .map(question => question.trim())
      .filter(Boolean);

  const maxBotCustomQuestions = BOT_CUSTOM_QUESTION_LIMITS[meeting.interview_type] || 6;

  const syncBotCustomQuestions = async (showSavedMessage = false) => {
    const customQuestions = parseBotCustomQuestions(botQuestionsInput);
    if (customQuestions.length > maxBotCustomQuestions) {
      throw new Error(`Puedes agregar hasta ${maxBotCustomQuestions} preguntas personalizadas para este tipo de entrevista.`);
    }

    const currentQuestions = meeting.bot_custom_questions || [];
    const unchanged =
      customQuestions.length === currentQuestions.length
      && customQuestions.every((question, index) => question === currentQuestions[index]);

    if (unchanged) {
      return meeting;
    }

    const updated = await meetingsApi.update(meeting.id, { bot_custom_questions: customQuestions } as never);
    setMeeting(updated);
    setBotQuestionsInput((updated.bot_custom_questions || []).join('\n'));
    if (showSavedMessage) {
      await showSuccess('Preguntas personalizadas guardadas.');
    }
    return updated;
  };

  const handleGenerateBotLink = async (useCustomQuestions = true) => {
    setGeneratingBotMode(useCustomQuestions ? 'custom' : 'gemini');
    try {
      if (useCustomQuestions) {
        await syncBotCustomQuestions(false);
      }
      const session = await interviewsApi.createSession(meeting.id, { useCustomQuestions });
      setBotSessions(prev => [session, ...prev]);
      setShowBotPanel(true);
      await showSuccess(
        useCustomQuestions
          ? '¡Link de entrevista generado! Cópialo y envíaselo al candidato.'
          : '¡Link generado sólo con preguntas de Gemini! Las preguntas guardadas no se modificaron.'
      );
    } catch (e: unknown) {
      const msg = (e as { data?: { error?: string } })?.data?.error || 'No se pudo generar el link.';
      await showError(msg);
    } finally {
      setGeneratingBotMode(null);
    }
  };

  // Acceso directo: reutiliza una sesión vigente o crea una nueva, y abre el bot
  // de entrevista (/entrevista/{token}) en una pestaña nueva con un solo clic.
  const handleOpenBotDirect = async () => {
    setOpeningBotDirect(true);
    try {
      let session =
        botSessions.find(s => s.status === 'pending' || s.status === 'active')
        || (await interviewsApi.listSessions(meeting.id)).find(
          s => s.status === 'pending' || s.status === 'active',
        );
      if (!session) {
        session = await interviewsApi.createSession(meeting.id, { useCustomQuestions: true });
        setBotSessions(prev => [session as InterviewSession, ...prev]);
        await showSuccess('Sesión de entrevista creada. Abriendo el bot…');
      }
      if (typeof window !== 'undefined') {
        window.open(`${window.location.origin}/entrevista/${session.token}`, '_blank', 'noopener,noreferrer');
      }
    } catch (e: unknown) {
      const msg = (e as { data?: { error?: string } })?.data?.error || 'No se pudo abrir el bot de entrevista.';
      await showError(msg);
    } finally {
      setOpeningBotDirect(false);
    }
  };

  const handleClearBotQuestions = async () => {
    const confirmed = await showConfirm('¿Eliminar las preguntas personalizadas guardadas para futuras sesiones del bot?');
    if (!confirmed) return;

    setSavingBotQuestions(true);
    try {
      const updated = await meetingsApi.update(meeting.id, { bot_custom_questions: [] } as never);
      setMeeting(updated);
      setBotQuestionsInput('');
      await showSuccess('Preguntas personalizadas eliminadas.');
    } catch {
      await showError('No se pudieron eliminar las preguntas personalizadas.');
    } finally {
      setSavingBotQuestions(false);
    }
  };

  const handleDeleteBotSession = async (id: number) => {
    const confirmed = await showConfirm('¿Eliminar este link de entrevista?');
    if (!confirmed) return;
    try {
      await interviewsApi.deleteSession(id);
      setBotSessions(prev => prev.filter(s => s.id !== id));
    } catch {
      await showError('No se pudo eliminar la sesión.');
    }
  };

  const copyToClipboard = (url: string, token: string) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(null), 2000);
    });
  };

  const formatQuestionsForExport = (session: InterviewSession) => {
    const customQuestionKeys = new Set(
      (session.custom_questions_used || []).map(question => question.trim().toLocaleLowerCase())
    );

    return session.questions.map((question, index) => {
      const isCustomQuestion = customQuestionKeys.has(question.trim().toLocaleLowerCase());
      return `${index + 1}. [${isCustomQuestion ? 'Personalizada' : 'Gemini'}] ${question}`;
    }).join('\n');
  };

  const handleCopyQuestionSet = async (session: InterviewSession) => {
    try {
      await navigator.clipboard.writeText(formatQuestionsForExport(session));
      await showSuccess('Set de preguntas copiado al portapapeles.');
    } catch {
      await showError('No se pudo copiar el set de preguntas.');
    }
  };

  const handleExportQuestionSet = (session: InterviewSession) => {
    if (typeof window === 'undefined') return;

    const content = formatQuestionsForExport(session);
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeCandidate = (session.candidate_name_display || 'candidato')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .toLowerCase();

    link.href = url;
    link.download = `preguntas-bot-${safeCandidate || 'candidato'}-${session.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSaveBotQuestions = async () => {
    setSavingBotQuestions(true);
    try {
      await syncBotCustomQuestions(true);
      setShowBotPanel(true);
    } catch (e: unknown) {
      await showError((e as Error).message || 'No se pudieron guardar las preguntas personalizadas.');
    } finally {
      setSavingBotQuestions(false);
    }
  };

  const resolveRecordingUrl = (recordingUrl: string | null | undefined, token: string) => {
    if (!recordingUrl) return null;
    const fallbackPath = `/api/interviews/public/${token}/recording/`;

    if (typeof window === 'undefined') {
      return recordingUrl.includes('/media/') ? fallbackPath : recordingUrl;
    }

    if (recordingUrl.includes('/media/')) {
      return `http://127.0.0.1:8000${fallbackPath}`;
    }

    if (/^https?:\/\//i.test(recordingUrl)) return recordingUrl;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl && /^https?:\/\//i.test(apiUrl)) {
      return new URL(recordingUrl, apiUrl).toString();
    }

    return new URL(recordingUrl, window.location.origin).toString();
  };

  const getAnswerOriginMeta = (answer: InterviewSession['answers'][number]) => {
    if (answer.is_followup) {
      return {
        label: 'Seguimiento Gemini',
        className: 'bg-violet-100 text-violet-700',
      };
    }

    switch (answer.question_origin) {
      case 'custom':
        return {
          label: 'Base personalizada',
          className: 'bg-amber-100 text-amber-700',
        };
      case 'gemini':
        return {
          label: 'Base Gemini',
          className: 'bg-sky-100 text-sky-700',
        };
      case 'intro':
        return {
          label: 'Introducción',
          className: 'bg-slate-100 text-slate-600',
        };
      case 'closing':
        return {
          label: 'Cierre',
          className: 'bg-emerald-100 text-emerald-700',
        };
      default:
        return {
          label: 'Pregunta base',
          className: 'bg-slate-100 text-slate-600',
        };
    }
  };

  const buildConversationTimeline = (session: InterviewSession) => {
    return (session.answers || []).flatMap((answer, index) => {
      const answerOrigin = getAnswerOriginMeta(answer);
      return [
        {
          id: `${session.id}-question-${index}`,
          role: 'assistant' as const,
          label: answerOrigin.label,
          className: answerOrigin.className,
          content: answer.question,
        },
        {
          id: `${session.id}-answer-${index}`,
          role: 'candidate' as const,
          label: 'Respuesta candidata',
          className: 'bg-slate-100 text-slate-700',
          content: answer.answer || '[Sin respuesta]',
        },
      ];
    });
  };

  // Recargar feedbacks frescos
  const loadFeedbacks = useCallback(async () => {
    try {
      const data = await feedbackApi.listByMeeting(meeting.id);
      setFeedbacks(data);
    } catch {}
  }, [meeting.id]);

  // Cargar datos completos del detalle al abrir el modal (el endpoint list no incluye `transcription`)
  useEffect(() => {
    meetingsApi.get(initialMeeting.id).then(setMeeting).catch(() => {});
    loadBotSessions();
  }, [initialMeeting.id, loadBotSessions]);

  useEffect(() => {
    setBotQuestionsInput((meeting.bot_custom_questions || []).join('\n'));
  }, [meeting.id, meeting.bot_custom_questions]);

  useEffect(() => { loadFeedbacks(); }, [loadFeedbacks]);

  // Auto-polling: cuando el análisis está en proceso, sondea cada 5s hasta que termine
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const isActive = meeting.ai_analysis_status === 'pending' || meeting.ai_analysis_status === 'processing';

    if (isActive && !pollingRef.current) {
      pollingRef.current = setInterval(async () => {
        try {
          const updated = await meetingsApi.get(meeting.id);
          const newStatus = updated.ai_analysis_status;
          setMeeting(updated);
          if (newStatus !== 'pending' && newStatus !== 'processing') {
            if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
            setAnalyzingLoading(false);
            if (newStatus === 'completed') { await loadFeedbacks(); }
          }
        } catch {}
      }, 5000);
    }

    if (!isActive && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    return () => {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meeting.ai_analysis_status]);

  const handleComplete = async (transcriptionValue?: string) => {
    const confirmed = await showConfirm('¿Marcar esta reunión como completada? Se iniciará el análisis IA de la transcripción automáticamente.');
    if (!confirmed) return;
    setCompletingLoading(true);
    try {
      const updated = await meetingsApi.complete(meeting.id, transcriptionValue || undefined);
      setMeeting(updated);
      await showSuccess('Reunión completada. El análisis IA iniciará en breve.');
      setShowTranscription(false);
    } catch {
      await showError('No se pudo completar la reunión.');
    } finally {
      setCompletingLoading(false);
    }
  };

  const handleAnalyzeTranscript = async () => {
    // Si no hay transcripción, mostrar formulario para agregarla primero
    if (!meeting.transcription) {
      setShowTranscriptionInput(true);
      return;
    }
    const confirmed = await showConfirm('¿Re-analizar la transcripción con Gemini AI?');
    if (!confirmed) return;
    await doAnalyze();
  };

  const doAnalyze = async () => {
    setAnalyzingLoading(true);
    try {
      await meetingsApi.analyzeTranscript(meeting.id);
      setMeeting(prev => ({ ...prev, ai_analysis_status: 'pending' }));
    } catch {
      await showError('No se pudo iniciar el análisis.');
      setAnalyzingLoading(false);
    }
  };

  const handleSaveTranscriptionAndAnalyze = async () => {
    if (!transcriptionInput.trim()) {
      await showError('Escribe la transcripción antes de analizar.');
      return;
    }
    setAnalyzingLoading(true);
    try {
      const updated = await meetingsApi.update(meeting.id, { transcription: transcriptionInput.trim() } as never);
      setMeeting(updated);
      setShowTranscriptionInput(false);
      setTranscriptionInput('');
      await doAnalyze();
    } catch {
      await showError('No se pudo guardar la transcripción.');
      setAnalyzingLoading(false);
    }
  };

  const handleCancel = async () => {
    const confirmed = await showConfirm(`¿Cancelar la reunión "${meeting.title}"?`);
    if (!confirmed) return;
    try {
      const updated = await meetingsApi.cancel(meeting.id);
      setMeeting(updated);
      await showSuccess('Reunión cancelada.');
      onRefresh();
    } catch {
      await showError('No se pudo cancelar la reunión.');
    }
  };

  const handleFeedbackSaved = (fb: InterviewFeedback) => {
    setFeedbacks(prev => {
      const idx = prev.findIndex(f => f.id === fb.id);
      return idx >= 0 ? prev.map(f => f.id === fb.id ? fb : f) : [...prev, fb];
    });
    setShowFeedbackForm(false);
    setEditFeedback(undefined);
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('es-MX', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const modal = (
    <>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-start justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl my-6">
          {/* Header */}
          <div className="p-6 border-b bg-gradient-to-r from-slate-700 to-slate-900 rounded-t-2xl text-white">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[meeting.status]}`}>
                    {meeting.status_display}
                  </span>
                  <span className="text-slate-400 text-xs">{meeting.interview_type_display} · {meeting.format_display}</span>
                </div>
                <h2 className="text-xl font-bold">{meeting.title}</h2>
                <p className="text-slate-300 text-sm mt-1">
                  <i className="fas fa-user mr-1"></i>{meeting.candidate_name}
                  {meeting.candidate_email && <span className="ml-2 text-slate-400">({meeting.candidate_email})</span>}
                </p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {meeting.status === 'scheduled' && (
                  <>
                    <button
                      onClick={() => setShowEditModal(true)}
                      className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <i className="fas fa-pen"></i> Editar
                    </button>
                    <button
                      onClick={() => setShowBotPanel(true)}
                      className="px-3 py-1.5 bg-violet-500 hover:bg-violet-400 text-white text-xs rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-60"
                    >
                      <><i className="fas fa-robot"></i> Bot entrevista</>
                    </button>
                    <button
                      onClick={handleOpenBotDirect}
                      disabled={openingBotDirect}
                      title="Genera la sesión si hace falta y abre el bot de entrevista en una pestaña nueva"
                      className="px-3 py-1.5 bg-fuchsia-500 hover:bg-fuchsia-400 text-white text-xs rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-60"
                    >
                      {openingBotDirect
                        ? <><i className="fas fa-spinner fa-spin"></i> Abriendo…</>
                        : <><i className="fas fa-external-link-alt"></i> Abrir bot</>}
                    </button>
                    <button
                      onClick={() => setShowTranscription(true)}
                      className="px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <i className="fas fa-check"></i> Completar
                    </button>
                    <button
                      onClick={handleCancel}
                      className="px-3 py-1.5 bg-red-500/80 hover:bg-red-500 text-white text-xs rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <i className="fas fa-ban"></i> Cancelar
                    </button>
                  </>
                )}
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors ml-2">
                  <i className="fas fa-times text-lg"></i>
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Info general */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1"><i className="fas fa-calendar mr-1"></i>Fecha y hora</p>
                <p className="text-sm font-medium text-gray-800">{formatDate(meeting.scheduled_at)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs text-gray-400 mb-1"><i className="fas fa-clock mr-1"></i>Duración</p>
                <p className="text-sm font-medium text-gray-800">{meeting.duration_minutes} minutos</p>
              </div>
              {meeting.profile_title && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1"><i className="fas fa-briefcase mr-1"></i>Perfil/Vacante</p>
                  <p className="text-sm font-medium text-gray-800">{meeting.profile_title}</p>
                </div>
              )}
            </div>

            {/* Enlace de Teams */}
            {meeting.join_url && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                      <i className="fab fa-microsoft text-white"></i>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-blue-800">Microsoft Teams</p>
                      <p className="text-xs text-blue-600">Videollamada con grabación y transcripción</p>
                    </div>
                  </div>
                  <a
                    href={meeting.join_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Unirse <i className="fas fa-external-link-alt ml-1 text-xs"></i>
                  </a>
                </div>
                {meeting.teams_join_meeting_id && (
                  <div className="mt-3 pt-3 border-t border-blue-200 flex items-center gap-2">
                    <i className="fas fa-hashtag text-blue-400 text-xs"></i>
                    <span className="text-xs text-blue-600">Código de reunión:</span>
                    <span className="font-mono font-bold text-blue-800 tracking-wider">{meeting.teams_join_meeting_id}</span>
                    <span className="text-xs text-blue-400">(para unirse por teléfono o desde Teams)</span>
                  </div>
                )}
              </div>
            )}

            {/* Entrevistadores */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <i className="fas fa-users text-gray-400"></i> Entrevistadores
              </h3>
              {meeting.interviewers_data.length === 0 ? (
                <p className="text-sm text-gray-400">No se han asignado entrevistadores.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {meeting.interviewers_data.map(i => (
                    <div key={i.id} className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full text-sm text-gray-700">
                      <div className="w-6 h-6 bg-blue-200 rounded-full flex items-center justify-center text-xs font-bold text-blue-800">
                        {i.full_name.charAt(0).toUpperCase()}
                      </div>
                      {i.full_name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notas de preparación */}
            {meeting.preparation_notes && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <i className="fas fa-sticky-note text-yellow-400"></i> Notas de preparación
                </h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap">
                  {meeting.preparation_notes}
                </div>
              </div>
            )}

            {/* Transcripción (si existe) */}
            {meeting.transcription && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                  <i className="fas fa-file-alt text-gray-400"></i> Transcripción / Resumen
                </h3>
                <div className="bg-gray-50 border rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-y-auto">
                  {meeting.transcription}
                </div>
              </div>
            )}

            {/* Panel para completar con transcripción */}
            {showTranscription && meeting.status === 'scheduled' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-emerald-800 mb-2 flex items-center gap-2">
                  <i className="fas fa-check-circle"></i> Completar reunión
                </h3>
                <p className="text-xs text-emerald-600 mb-3">Opcional: agrega notas o transcripción de la reunión.</p>
                <textarea
                  rows={4}
                  value={transcription}
                  onChange={e => setTranscription(e.target.value)}
                  placeholder="Resumen, puntos clave, conclusiones..."
                  className="w-full border border-emerald-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none bg-white"
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => setShowTranscription(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={() => handleComplete(transcription)}
                    disabled={completingLoading}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {completingLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-check"></i>}
                    Confirmar completada
                  </button>
                </div>
              </div>
            )}

            {/* Feedbacks */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <i className="fas fa-clipboard-check text-emerald-500"></i>
                  Evaluaciones ({feedbacks.filter(fb => !fb.is_ai_generated).length})
                </h3>
                {meeting.status === 'completed' && (
                  <div className="flex items-center gap-2">
                    {/* Botón Re-analizar IA */}
                    <button
                      onClick={handleAnalyzeTranscript}
                      disabled={analyzingLoading || meeting.ai_analysis_status === 'processing' || meeting.ai_analysis_status === 'pending'}
                      title="Analizar/Re-analizar transcripción con Gemini AI"
                      className="px-3 py-1.5 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {analyzingLoading || meeting.ai_analysis_status === 'processing' || meeting.ai_analysis_status === 'pending'
                        ? <><i className="fas fa-spinner fa-spin"></i> Analizando...</>
                        : <><i className="fas fa-robot"></i> Analizar con IA</>}
                    </button>
                    <button
                      onClick={() => { setEditFeedback(undefined); setShowFeedbackForm(true); }}
                      className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 flex items-center gap-1.5"
                    >
                      <i className="fas fa-plus"></i> Agregar evaluación
                    </button>
                  </div>
                )}
              </div>

              {/* Panel de Bot de entrevista */}
              {(showBotPanel || botSessions.length > 0) && (
                <div className="mb-4 bg-violet-50 border border-violet-200 rounded-xl overflow-hidden">
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-violet-100 transition-colors"
                    onClick={() => setShowBotPanel(v => !v)}
                  >
                    <div className="flex items-center gap-2">
                      <i className="fas fa-robot text-violet-500"></i>
                      <span className="text-sm font-semibold text-violet-800">Bot de entrevista</span>
                      {botSessions.length > 0 && (
                        <span className="bg-violet-200 text-violet-700 text-xs px-1.5 py-0.5 rounded-full">
                          {botSessions.length}
                        </span>
                      )}
                    </div>
                    <i className={`fas fa-chevron-${showBotPanel ? 'up' : 'down'} text-violet-400 text-xs`}></i>
                  </div>

                  {showBotPanel && (
                    <div className="px-3 pb-3 space-y-2">
                      <div className="bg-white rounded-lg border border-violet-200 p-3">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div>
                            <p className="text-xs font-semibold text-violet-800">Preguntas personalizadas del entrevistador</p>
                            <p className="text-[11px] text-violet-500">Una por línea. Máximo {maxBotCustomQuestions} para este tipo de entrevista.</p>
                          </div>
                          <button
                            onClick={handleSaveBotQuestions}
                            disabled={savingBotQuestions}
                            className="px-2.5 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-medium disabled:opacity-50 flex items-center gap-1.5"
                          >
                            {savingBotQuestions
                              ? <><i className="fas fa-spinner fa-spin"></i> Guardando...</>
                              : <><i className="fas fa-save"></i> Guardar</>}
                          </button>
                        </div>
                        <textarea
                          rows={4}
                          value={botQuestionsInput}
                          onChange={e => setBotQuestionsInput(e.target.value)}
                          placeholder="¿Qué experiencia tienes con este stack?&#10;¿Has trabajado con pruebas automatizadas?"
                          className="w-full border border-violet-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
                        />
                        {(meeting.bot_custom_questions || []).length > 0 && (
                          <div className="mt-2 flex items-center justify-between gap-2">
                            <p className="text-[11px] text-gray-500">
                              Guardadas actualmente: {(meeting.bot_custom_questions || []).length} pregunta{(meeting.bot_custom_questions || []).length === 1 ? '' : 's'}.
                            </p>
                            <button
                              onClick={handleClearBotQuestions}
                              disabled={savingBotQuestions}
                              className="text-[11px] font-medium text-red-500 hover:text-red-600 disabled:opacity-50"
                            >
                              Limpiar guardadas
                            </button>
                          </div>
                        )}
                      </div>

                      {botSessions.length === 0 ? (
                        <p className="text-xs text-violet-500 py-2">No hay sesiones de bot creadas todavía.</p>
                      ) : botSessions.map(s => {
                        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
                        const publicUrl = `${baseUrl}/entrevista/${s.token}`;
                        const recordingUrl = resolveRecordingUrl(s.recording_url, s.token);
                        const customQuestionsUsedCount = s.custom_questions_used_count || 0;
                        const followUpAnswersCount = (s.answers || []).filter(answer => answer.is_followup).length;
                        const customQuestionKeys = new Set(
                          (s.custom_questions_used || []).map(question => question.trim().toLocaleLowerCase())
                        );
                        const statusColor = {
                          pending: 'bg-yellow-100 text-yellow-700',
                          active: 'bg-blue-100 text-blue-700',
                          completed: 'bg-green-100 text-green-700',
                          expired: 'bg-gray-100 text-gray-500',
                        }[s.status] || 'bg-gray-100 text-gray-500';
                        const questionSourceColor = {
                          custom: 'bg-emerald-100 text-emerald-700',
                          gemini: 'bg-sky-100 text-sky-700',
                          unknown: 'bg-slate-100 text-slate-500',
                        }[s.question_source] || 'bg-slate-100 text-slate-500';

                        return (
                          <div key={s.id} className="bg-white rounded-lg border border-violet-200 p-3">
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor}`}>
                                    {s.status}
                                  </span>
                                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${questionSourceColor}`}>
                                    {s.question_source_display}
                                  </span>
                                  {customQuestionsUsedCount > 0 && (
                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                                      {customQuestionsUsedCount} personalizada{customQuestionsUsedCount === 1 ? '' : 's'}
                                    </span>
                                  )}
                                  {followUpAnswersCount > 0 && (
                                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                                      {followUpAnswersCount} seguimiento{followUpAnswersCount === 1 ? '' : 's'}
                                    </span>
                                  )}
                                  <span className="text-xs text-gray-400">
                                    {s.questions.length} preguntas
                                  </span>
                                </div>
                                <p className="text-xs text-gray-500 truncate">{publicUrl}</p>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  onClick={() => copyToClipboard(publicUrl, s.token)}
                                  title="Copiar link"
                                  className="p-1.5 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-600 transition-colors text-xs"
                                >
                                  <i className={`fas ${copiedToken === s.token ? 'fa-check' : 'fa-copy'}`}></i>
                                </button>
                                <a
                                  href={publicUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-violet-100 hover:bg-violet-200 text-violet-600 transition-colors text-xs"
                                  title="Abrir"
                                >
                                  <i className="fas fa-external-link-alt"></i>
                                </a>
                                <button
                                  onClick={() => setExpandedQuestionsId(prev => prev === s.id ? null : s.id)}
                                  title="Ver preguntas"
                                  className="p-1.5 rounded-lg bg-sky-100 hover:bg-sky-200 text-sky-600 transition-colors text-xs"
                                >
                                  <i className={`fas ${expandedQuestionsId === s.id ? 'fa-eye-slash' : 'fa-list-ul'}`}></i>
                                </button>
                                {recordingUrl && (
                                  <button
                                    onClick={() => setExpandedRecordingId(prev => prev === s.id ? null : s.id)}
                                    title="Reproducir grabación"
                                    className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-600 transition-colors text-xs"
                                  >
                                    <i className={`fas ${expandedRecordingId === s.id ? 'fa-video-slash' : 'fa-play'}`}></i>
                                  </button>
                                )}
                                <button
                                  onClick={() => handleDeleteBotSession(s.id)}
                                  title="Eliminar"
                                  className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-400 transition-colors text-xs"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            </div>
                            {expandedQuestionsId === s.id && (
                              <div className="mt-3 border-t border-violet-100 pt-3">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <div>
                                    <span className="text-xs font-medium text-gray-600">Set completo de preguntas</span>
                                    <p className="text-[11px] text-gray-400 mt-0.5">Cada pregunta indica si vino de las guardadas o de Gemini.</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] text-gray-400">{s.questions.length} en total</span>
                                    <button
                                      onClick={() => handleCopyQuestionSet(s)}
                                      className="px-2 py-1 rounded-md bg-violet-100 hover:bg-violet-200 text-violet-700 text-[11px] font-medium transition-colors"
                                    >
                                      <i className="fas fa-copy mr-1"></i> Copiar
                                    </button>
                                    <button
                                      onClick={() => handleExportQuestionSet(s)}
                                      className="px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium transition-colors"
                                    >
                                      <i className="fas fa-download mr-1"></i> Exportar
                                    </button>
                                  </div>
                                </div>
                                <ol className="space-y-2 list-decimal list-inside text-sm text-gray-700 bg-slate-50 border border-slate-200 rounded-lg p-3">
                                  {s.questions.map((question, index) => (
                                    <li key={`${s.id}-question-${index}`} className="leading-relaxed">
                                      <div className="inline-flex flex-wrap items-center gap-2">
                                        <span>{question}</span>
                                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${customQuestionKeys.has(question.trim().toLocaleLowerCase()) ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}>
                                          {customQuestionKeys.has(question.trim().toLocaleLowerCase()) ? 'Personalizada' : 'Gemini'}
                                        </span>
                                      </div>
                                    </li>
                                  ))}
                                </ol>
                                {s.answers.length > 0 && (
                                  <div className="mt-3">
                                    <div className="flex items-center justify-between gap-2 mb-2">
                                      <div>
                                        <span className="text-xs font-medium text-gray-600">Línea de tiempo de la entrevista</span>
                                        <p className="text-[11px] text-gray-400 mt-0.5">La conversación alterna pregunta del bot y respuesta de la candidata, con el origen de cada intervención del asistente.</p>
                                      </div>
                                      <span className="text-[11px] text-gray-400">{s.answers.length} intercambio{s.answers.length === 1 ? '' : 's'}</span>
                                    </div>
                                    <div className="space-y-3">
                                      {buildConversationTimeline(s).map((item) => (
                                        <div
                                          key={item.id}
                                          className={`rounded-lg border p-3 ${item.role === 'assistant' ? 'border-violet-100 bg-white' : 'border-slate-200 bg-slate-50 ml-4'}`}
                                        >
                                          <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${item.className}`}>
                                              {item.label}
                                            </span>
                                            <span className="text-[11px] text-gray-400">
                                              {item.role === 'assistant' ? 'Bot entrevistador' : 'Candidata'}
                                            </span>
                                          </div>
                                          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{item.content}</p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                            {recordingUrl && expandedRecordingId === s.id && (
                              <div className="mt-3 border-t border-violet-100 pt-3">
                                <div className="flex items-center justify-between gap-2 mb-2">
                                  <span className="text-xs font-medium text-gray-600">Grabación de la entrevista</span>
                                  <a
                                    href={recordingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                                  >
                                    Abrir en pestaña nueva
                                  </a>
                                </div>
                                <video
                                  controls
                                  preload="metadata"
                                  className="w-full rounded-lg border border-violet-200 bg-black"
                                  src={recordingUrl}
                                >
                                  Tu navegador no soporta la reproducción de video.
                                </video>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                        <button
                          onClick={() => handleGenerateBotLink(true)}
                          disabled={!!generatingBotMode}
                          className="w-full py-2 border-2 border-dashed border-violet-300 hover:border-violet-400 text-violet-500 hover:text-violet-700 text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
                        >
                          {generatingBotMode === 'custom'
                            ? <><i className="fas fa-spinner fa-spin"></i> Generando...</>
                            : <><i className="fas fa-plus"></i> Generar con guardadas</>}
                        </button>
                        <button
                          onClick={() => handleGenerateBotLink(false)}
                          disabled={!!generatingBotMode}
                          className="w-full py-2 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-60"
                        >
                          {generatingBotMode === 'gemini'
                            ? <><i className="fas fa-spinner fa-spin"></i> Generando...</>
                            : <><i className="fas fa-sparkles"></i> Generar sólo con Gemini</>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Panel de análisis IA */}
              {meeting.status === 'completed' && meeting.ai_analysis_status && (
                <AiAnalysisPanel status={meeting.ai_analysis_status} result={meeting.ai_analysis_result ?? null} />
              )}

              {/* Formulario inline para agregar transcripción cuando la reunión está completada pero sin transcripción */}
              {showTranscriptionInput && (
                <div className="mb-4 bg-violet-50 border border-violet-200 rounded-xl p-4">
                  <h3 className="text-sm font-semibold text-violet-800 mb-1 flex items-center gap-2">
                    <i className="fas fa-robot"></i> Agregar transcripción para analizar con IA
                  </h3>
                  <p className="text-xs text-violet-500 mb-3">Pega aquí la transcripción o el resumen de la entrevista.</p>
                  <textarea
                    rows={6}
                    value={transcriptionInput}
                    onChange={e => setTranscriptionInput(e.target.value)}
                    placeholder="[Entrevistador]: Buenos días...&#10;[Candidato]: ..."
                    className="w-full border border-violet-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none bg-white"
                  />
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => { setShowTranscriptionInput(false); setTranscriptionInput(''); }}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveTranscriptionAndAnalyze}
                      disabled={analyzingLoading}
                      className="px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {analyzingLoading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-robot"></i>}
                      Guardar y analizar con IA
                    </button>
                  </div>
                </div>
              )}
              {feedbacks.filter(fb => !fb.is_ai_generated).length === 0 ? (
                meeting.ai_analysis_status !== 'completed' && (
                  <div className="text-center py-8 bg-gray-50 rounded-xl text-gray-400">
                    <i className="fas fa-clipboard text-2xl mb-2 block"></i>
                    <p className="text-sm">Sin evaluaciones todavía.</p>
                    {meeting.status === 'completed' && (
                      <p className="text-xs mt-1">Agrega la primera evaluación arriba.</p>
                    )}
                    {meeting.status === 'scheduled' && (
                      <p className="text-xs mt-1">Las evaluaciones se pueden agregar después de completar la reunión.</p>
                    )}
                  </div>
                )
              ) : (
                <div className="space-y-4">
                  {feedbacks.filter(fb => !fb.is_ai_generated).map(fb => {
                    const rec = RECOMMENDATION_CONFIG[fb.recommendation];
                    return (
                      <div key={fb.id} className="border border-gray-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-700">
                              {fb.interviewer_name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-800">{fb.interviewer_name}</p>
                              <p className="text-xs text-gray-400">
                                {new Date(fb.created_at).toLocaleDateString('es-MX')}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${rec.color}`}>
                              <i className={`fas ${rec.icon}`}></i> {rec.label}
                            </span>
                            <div className="flex items-center gap-1 bg-blue-50 px-2.5 py-1 rounded-full">
                              <i className="fas fa-star text-yellow-400 text-xs"></i>
                              <span className="text-sm font-bold text-blue-800">{fb.overall_rating}/10</span>
                            </div>
                            <button
                              onClick={() => { setEditFeedback(fb); setShowFeedbackForm(true); }}
                              className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            >
                              <i className="fas fa-pen text-xs"></i>
                            </button>
                          </div>
                        </div>

                        {/* Scores */}
                        {(fb.technical_score || fb.soft_skills_score || fb.communication_score) && (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                            {fb.technical_score && (
                              <div>
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                  <span>Técnico</span><span>{fb.technical_score}/10</span>
                                </div>
                                <div className="h-1.5 bg-gray-200 rounded-full"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${fb.technical_score * 10}%` }} /></div>
                              </div>
                            )}
                            {fb.soft_skills_score && (
                              <div>
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                  <span>Habilidades blandas</span><span>{fb.soft_skills_score}/10</span>
                                </div>
                                <div className="h-1.5 bg-gray-200 rounded-full"><div className="h-full bg-purple-500 rounded-full" style={{ width: `${fb.soft_skills_score * 10}%` }} /></div>
                              </div>
                            )}
                            {fb.communication_score && (
                              <div>
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                  <span>Comunicación</span><span>{fb.communication_score}/10</span>
                                </div>
                                <div className="h-1.5 bg-gray-200 rounded-full"><div className="h-full bg-teal-500 rounded-full" style={{ width: `${fb.communication_score * 10}%` }} /></div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Fortalezas / debilidades */}
                        {(fb.strengths || fb.weaknesses) && (
                          <div className="grid grid-cols-2 gap-3 mb-3">
                            {fb.strengths && (
                              <div>
                                <p className="text-xs font-medium text-green-700 mb-1"><i className="fas fa-star text-yellow-400 mr-1"></i>Fortalezas</p>
                                <p className="text-xs text-gray-600">{fb.strengths}</p>
                              </div>
                            )}
                            {fb.weaknesses && (
                              <div>
                                <p className="text-xs font-medium text-orange-700 mb-1"><i className="fas fa-exclamation-triangle text-orange-400 mr-1"></i>Áreas de mejora</p>
                                <p className="text-xs text-gray-600">{fb.weaknesses}</p>
                              </div>
                            )}
                          </div>
                        )}

                        {fb.notes && (
                          <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap">{fb.notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showFeedbackForm && (
        <InterviewFeedbackForm
          meeting={meeting}
          existingFeedback={editFeedback}
          onSave={handleFeedbackSaved}
          onClose={() => { setShowFeedbackForm(false); setEditFeedback(undefined); }}
        />
      )}

      {showEditModal && (
        <MeetingFormModal
          meeting={meeting}
          onSave={updated => { setMeeting(updated); setShowEditModal(false); onRefresh(); }}
          onClose={() => setShowEditModal(false)}
        />
      )}
    </>
  );
  return createPortal(modal, document.body);
}

'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useModal } from '@/context/ModalContext';
import { meetingsApi } from '@/lib/api-meetings';
import type { Meeting, MeetingFormData, MeetingType, MeetingFormat } from '@/types/meetings';

interface Props {
  meeting?: Meeting;
  onSave: (meeting: Meeting) => void;
  onClose: () => void;
  defaultCandidateProfileId?: number;
  defaultProfileId?: number;
}

const TYPES: { value: MeetingType; label: string }[] = [
  { value: 'initial', label: 'Primer Contacto' },
  { value: 'hr', label: 'Entrevista RH' },
  { value: 'technical', label: 'Entrevista Técnica' },
  { value: 'final', label: 'Entrevista Final' },
  { value: 'group', label: 'Entrevista Grupal' },
  { value: 'follow_up', label: 'Seguimiento' },
];

const FORMATS: { value: MeetingFormat; label: string; icon: string }[] = [
  { value: 'virtual', label: 'Virtual (Teams)', icon: 'fa-video' },
  { value: 'in_person', label: 'Presencial', icon: 'fa-building' },
  { value: 'hybrid', label: 'Híbrido', icon: 'fa-laptop-house' },
];

// Sección con tarjeta al estilo del sistema
function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200">
        <i className={`fas ${icon} text-purple-600 text-sm`}></i>
        <span className="text-sm font-semibold text-gray-700">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

interface CandidateApplication {
  id: number;
  candidate_name: string;
  candidate_email: string;
  profile_title: string;
  profile_client: string;
  status_display: string;
}

export default function MeetingFormModal({ meeting, onSave, onClose, defaultCandidateProfileId, defaultProfileId }: Props) {
  const { showError } = useModal();
  const isEdit = !!meeting;
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<{ id: number; full_name: string; email: string }[]>([]);
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [appSearch, setAppSearch] = useState('');
  const [appDropdownOpen, setAppDropdownOpen] = useState(false);
  const [candidateType, setCandidateType] = useState<'system' | 'external'>(
    meeting?.external_candidate_name ? 'external' : 'system'
  );

  const toLocalDatetimeInput = (iso?: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const [form, setForm] = useState<MeetingFormData>({
    title: meeting?.title || '',
    candidate_profile: meeting?.candidate_profile ?? defaultCandidateProfileId ?? null,
    external_candidate_name: meeting?.external_candidate_name || '',
    external_candidate_email: meeting?.external_candidate_email || '',
    profile: meeting?.profile ?? defaultProfileId ?? null,
    interviewers: meeting?.interviewers || [],
    interview_type: meeting?.interview_type || 'hr',
    format: meeting?.format || 'virtual',
    scheduled_at: toLocalDatetimeInput(meeting?.scheduled_at),
    duration_minutes: meeting?.duration_minutes || 60,
    location: meeting?.location || '',
    manual_video_url: meeting?.manual_video_url || '',
    preparation_notes: meeting?.preparation_notes || '',
    bot_custom_questions: meeting?.bot_custom_questions || [],
  });

  // Cargar usuarios para el selector de entrevistadores
  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || '/reclutamiento-api'}/accounts/users/?is_active=true`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` },
    })
      .then(r => r.json())
      .then(data => setUsers(data.results || data))
      .catch(() => {});
  }, []);

  // Cargar aplicaciones (CandidateProfile) para el selector
  useEffect(() => {
    if (candidateType !== 'system') return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL || '/reclutamiento-api'}/candidates/applications/?page_size=500`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('authToken') || ''}` },
    })
      .then(r => r.json())
      .then(data => setApplications(data.results || data))
      .catch(() => {});
  }, [candidateType]);

  const set = (key: keyof MeetingFormData, value: any) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const toggleInterviewer = (userId: number) => {
    setForm(prev => ({
      ...prev,
      interviewers: prev.interviewers.includes(userId)
        ? prev.interviewers.filter(id => id !== userId)
        : [...prev.interviewers, userId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { await showError('El título es requerido.'); return; }
    if (!form.scheduled_at) { await showError('La fecha y hora son requeridas.'); return; }
    if (candidateType === 'system' && !form.candidate_profile) {
      await showError('Selecciona una aplicación candidato-perfil o usa candidato externo.');
      return;
    }
    if (candidateType === 'external' && (!form.external_candidate_name || !form.external_candidate_email)) {
      await showError('Nombre y email del candidato externo son requeridos.');
      return;
    }

    const payload: MeetingFormData = {
      ...form,
      candidate_profile: candidateType === 'system' ? form.candidate_profile : null,
      external_candidate_name: candidateType === 'external' ? form.external_candidate_name : '',
      external_candidate_email: candidateType === 'external' ? form.external_candidate_email : '',
      scheduled_at: new Date(form.scheduled_at).toISOString(),
    };

    setLoading(true);
    try {
      const result = isEdit
        ? await meetingsApi.update(meeting!.id, payload)
        : await meetingsApi.create(payload);
      onSave(result);
    } catch (err: any) {
      await showError(err?.data?.detail || 'Error al guardar la reunión.');
    } finally {
      setLoading(false);
    }
  };

  const modal = (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── Header morado ── */}
        <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-purple-600 to-violet-700">
          <div className="flex items-center gap-3 text-white">
            <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
              <i className={`fas ${isEdit ? 'fa-pen' : 'fa-calendar-plus'} text-base`}></i>
            </div>
            <div>
              <h2 className="text-lg font-bold leading-tight">
                {isEdit ? 'Editar Reunión' : 'Programar Reunión'}
              </h2>
              <p className="text-purple-200 text-xs">
                {isEdit ? 'Modifica los datos de la reunión' : 'Configura una nueva entrevista o reunión'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/25 text-white transition-colors"
          >
            <i className="fas fa-times text-sm"></i>
          </button>
        </div>

        {/* ── Cuerpo scrollable ── */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

            {/* Sección: Información general */}
            <Section icon="fa-info-circle" title="Información general">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                    Título <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => set('title', e.target.value)}
                    placeholder="Ej: Entrevista técnica — Juan Pérez"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Tipo de entrevista
                    </label>
                    <select
                      value={form.interview_type}
                      onChange={e => set('interview_type', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    >
                      {TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Formato
                    </label>
                    <select
                      value={form.format}
                      onChange={e => set('format', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white"
                    >
                      {FORMATS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Fecha y hora <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      value={form.scheduled_at}
                      onChange={e => set('scheduled_at', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                      Duración (minutos)
                    </label>
                    <input
                      type="number"
                      min={15}
                      max={480}
                      step={15}
                      value={form.duration_minutes}
                      onChange={e => set('duration_minutes', Number(e.target.value))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </Section>

            {/* Sección: Candidato */}
            <Section icon="fa-user" title="Candidato">
              <div className="space-y-3">
                {/* Toggle sistema / externo */}
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                  {(['system', 'external'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setCandidateType(t)}
                      className={`flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-all ${
                        candidateType === t
                          ? 'bg-white text-purple-700 shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <i className={`fas ${t === 'system' ? 'fa-user-check' : 'fa-user-plus'} mr-1.5`}></i>
                      {t === 'system' ? 'Del sistema' : 'Externo'}
                    </button>
                  ))}
                </div>

                {candidateType === 'system' ? (
                  <div className="space-y-2">
                    {/* Campo de búsqueda */}
                    <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-transparent">
                      <i className="fas fa-search text-gray-400 text-xs flex-shrink-0"></i>
                      <input
                        type="text"
                        value={appSearch}
                        onChange={e => { setAppSearch(e.target.value); setAppDropdownOpen(true); }}
                        onFocus={() => setAppDropdownOpen(true)}
                        placeholder="Buscar candidato por nombre, puesto o empresa..."
                        className="flex-1 outline-none bg-transparent text-sm placeholder-gray-400"
                      />
                      {(appSearch || form.candidate_profile) && (
                        <button
                          type="button"
                          onClick={() => { set('candidate_profile', null); setAppSearch(''); setAppDropdownOpen(false); }}
                          className="text-gray-400 hover:text-red-500 transition-colors flex-shrink-0"
                        >
                          <i className="fas fa-times text-xs"></i>
                        </button>
                      )}
                    </div>

                    {/* Candidato seleccionado */}
                    {form.candidate_profile && !appDropdownOpen && (() => {
                      const sel = applications.find(a => a.id === form.candidate_profile);
                      return sel ? (
                        <div className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded-lg px-3 py-2.5">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-purple-900 truncate">{sel.candidate_name}</p>
                            <p className="text-xs text-purple-600 truncate">{sel.profile_title} · {sel.profile_client}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{sel.status_display}</span>
                            <i className="fas fa-check-circle text-purple-500"></i>
                          </div>
                        </div>
                      ) : null;
                    })()}

                    {/* Lista de resultados (inline, sin absolute) */}
                    {appDropdownOpen && (
                      <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        {applications.length === 0 ? (
                          <div className="px-4 py-5 text-center text-xs text-gray-400">
                            <i className="fas fa-spinner fa-spin mr-1"></i> Cargando candidatos...
                          </div>
                        ) : (() => {
                          const q = appSearch.toLowerCase();
                          const filtered = applications.filter(a =>
                            !q ||
                            a.candidate_name.toLowerCase().includes(q) ||
                            a.profile_title.toLowerCase().includes(q) ||
                            (a.profile_client || '').toLowerCase().includes(q) ||
                            a.candidate_email.toLowerCase().includes(q)
                          );
                          if (filtered.length === 0) return (
                            <div className="px-4 py-4 text-center text-xs text-gray-500">
                              Sin resultados para &quot;{appSearch}&quot;
                            </div>
                          );
                          return (
                            <div className="max-h-48 overflow-y-auto">
                              {filtered.map(a => (
                                <button
                                  key={a.id}
                                  type="button"
                                  onClick={() => {
                                    set('candidate_profile', a.id);
                                    setAppDropdownOpen(false);
                                    setAppSearch('');
                                  }}
                                  className={`w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-0 ${form.candidate_profile === a.id ? 'bg-purple-50' : ''}`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold text-gray-800 truncate">{a.candidate_name}</p>
                                      <p className="text-xs text-gray-500 truncate">{a.profile_title} · {a.profile_client || '—'}</p>
                                    </div>
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full flex-shrink-0">{a.status_display}</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={form.external_candidate_name}
                      onChange={e => set('external_candidate_name', e.target.value)}
                      placeholder="Nombre completo"
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <input
                      type="email"
                      value={form.external_candidate_email}
                      onChange={e => set('external_candidate_email', e.target.value)}
                      placeholder="correo@ejemplo.com"
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            </Section>

            {/* Sección: Ubicación / Enlace (condicional) */}
            {(form.format === 'in_person' || form.format === 'hybrid' || form.format === 'virtual') && (
              <Section icon="fa-map-marker-alt" title="Ubicación y enlace">
                <div className="space-y-3">
                  {(form.format === 'in_person' || form.format === 'hybrid') && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                        Dirección / Sala
                      </label>
                      <input
                        type="text"
                        value={form.location}
                        onChange={e => set('location', e.target.value)}
                        placeholder="Ej: Sala de juntas 3, Piso 4"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  )}
                  {form.format !== 'in_person' && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                        <i className="fab fa-microsoft text-blue-500 mr-1"></i> Enlace Teams (manual, opcional)
                      </label>
                      <p className="text-xs text-gray-400 mb-1.5">Si Teams está configurado en el sistema, el enlace se genera automáticamente.</p>
                      <input
                        type="url"
                        value={form.manual_video_url}
                        onChange={e => set('manual_video_url', e.target.value)}
                        placeholder="https://teams.microsoft.com/..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  )}
                </div>
              </Section>
            )}

            {/* Sección: Entrevistadores */}
            <Section icon="fa-users" title="Entrevistadores">
              <div className="max-h-36 overflow-y-auto space-y-1">
                {users.length === 0 ? (
                  <p className="text-xs text-gray-400 text-center py-3">
                    <i className="fas fa-spinner fa-spin mr-1"></i> Cargando usuarios...
                  </p>
                ) : users.map(u => (
                  <label
                    key={u.id}
                    className={`flex items-center gap-3 cursor-pointer px-3 py-2 rounded-lg transition-colors ${
                      form.interviewers.includes(u.id) ? 'bg-purple-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                      form.interviewers.includes(u.id)
                        ? 'bg-purple-600 border-purple-600'
                        : 'border-gray-300'
                    }`}>
                      {form.interviewers.includes(u.id) && (
                        <i className="fas fa-check text-white text-xs"></i>
                      )}
                    </div>
                    <input
                      type="checkbox"
                      checked={form.interviewers.includes(u.id)}
                      onChange={() => toggleInterviewer(u.id)}
                      className="sr-only"
                    />
                    <span className={`text-sm ${form.interviewers.includes(u.id) ? 'text-purple-700 font-medium' : 'text-gray-700'}`}>
                      {u.full_name || u.email}
                    </span>
                  </label>
                ))}
              </div>
              {form.interviewers.length > 0 && (
                <p className="text-xs text-purple-600 mt-2 pt-2 border-t border-purple-100">
                  <i className="fas fa-check-circle mr-1"></i>
                  {form.interviewers.length} entrevistador{form.interviewers.length > 1 ? 'es' : ''} seleccionado{form.interviewers.length > 1 ? 's' : ''}
                </p>
              )}
            </Section>

            {/* Sección: Notas de preparación */}
            <Section icon="fa-sticky-note" title="Notas de preparación (opcional)">
              <textarea
                rows={3}
                value={form.preparation_notes}
                onChange={e => set('preparation_notes', e.target.value)}
                placeholder="Temas a tratar, preguntas clave, documentos a revisar..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            </Section>

            {/* Sección: Preguntas personalizadas para bot */}
            <Section icon="fa-robot" title="Preguntas personalizadas para el bot (opcional)">
              <p className="text-xs text-gray-500 mb-2">
                Escribe una pregunta por línea. Gemini seguirá generando el resto, pero estas se incluirán forzosamente en la entrevista.
              </p>
              <textarea
                rows={5}
                value={(form.bot_custom_questions || []).join('\n')}
                onChange={e => set('bot_custom_questions', e.target.value.split('\n'))}
                placeholder="¿Qué experiencia tienes con React y Next.js?&#10;¿Has trabajado con pruebas automatizadas?&#10;¿Cómo manejas despliegues a producción?"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            </Section>

          </div>

          {/* ── Footer fijo ── */}
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-white">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-violet-700 text-white rounded-xl text-sm font-semibold hover:from-purple-700 hover:to-violet-800 disabled:opacity-50 transition-all shadow-sm shadow-purple-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <><i className="fas fa-spinner fa-spin"></i> Guardando...</>
              ) : (
                <><i className={`fas ${isEdit ? 'fa-check' : 'fa-calendar-plus'}`}></i> {isEdit ? 'Guardar cambios' : 'Programar reunión'}</>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
  return createPortal(modal, document.body);
}

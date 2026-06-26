'use client';
import { useState } from 'react';
import { useModal } from '@/context/ModalContext';
import { meetingsApi } from '@/lib/api-meetings';
import type { Meeting, MeetingStatus, MeetingType, MeetingFormat } from '@/types/meetings';
import MeetingFormModal from './MeetingFormModal';
import MeetingDetail from './MeetingDetail';

interface Props {
  meetings: Meeting[];
  loading: boolean;
  onRefresh: () => void;
}

const STATUS_COLORS: Record<MeetingStatus, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
  rescheduled: 'bg-yellow-100 text-yellow-800',
};

const TYPE_ICONS: Record<MeetingType, string> = {
  initial: 'fa-handshake',
  hr: 'fa-user-tie',
  technical: 'fa-laptop-code',
  final: 'fa-flag-checkered',
  group: 'fa-users',
  follow_up: 'fa-redo',
};

const FORMAT_ICONS: Record<MeetingFormat, string> = {
  virtual: 'fa-video',
  in_person: 'fa-building',
  hybrid: 'fa-laptop-house',
};

export default function MeetingsList({ meetings, loading, onRefresh }: Props) {
  const { showConfirm, showSuccess, showError } = useModal();
  const [editMeeting, setEditMeeting] = useState<Meeting | null>(null);
  const [detailMeeting, setDetailMeeting] = useState<Meeting | null>(null);

  const handleCancel = async (meeting: Meeting) => {
    const confirmed = await showConfirm(`¿Cancelar la reunión "${meeting.title}"?`);
    if (!confirmed) return;
    try {
      await meetingsApi.cancel(meeting.id);
      await showSuccess('Reunión cancelada.');
      onRefresh();
    } catch {
      await showError('No se pudo cancelar la reunión.');
    }
  };

  const handleComplete = async (meeting: Meeting) => {
    const confirmed = await showConfirm(`¿Marcar "${meeting.title}" como completada?`);
    if (!confirmed) return;
    try {
      await meetingsApi.complete(meeting.id);
      await showSuccess('Reunión marcada como completada.');
      onRefresh();
    } catch {
      await showError('No se pudo completar la reunión.');
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('es-MX', {
      weekday: 'short', day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <i className="fas fa-spinner fa-spin text-3xl text-blue-500"></i>
      </div>
    );
  }

  if (meetings.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <i className="fas fa-calendar-times text-5xl mb-4 block"></i>
        <p className="text-lg font-medium">No hay reuniones</p>
        <p className="text-sm mt-1">Programa la primera reunión con el botón de arriba.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-4 py-3 text-gray-500 font-medium">Reunión</th>
              <th className="px-4 py-3 text-gray-500 font-medium">Candidato</th>
              <th className="px-4 py-3 text-gray-500 font-medium">Fecha/Hora</th>
              <th className="px-4 py-3 text-gray-500 font-medium">Entrevistadores</th>
              <th className="px-4 py-3 text-gray-500 font-medium">Estado</th>
              <th className="px-4 py-3 text-gray-500 font-medium text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {meetings.map(m => (
              <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                {/* Reunión */}
                <td className="px-4 py-3">
                  <div className="flex items-start gap-2">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                      <i className={`fas ${TYPE_ICONS[m.interview_type]} text-blue-600 text-xs`}></i>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 leading-tight">{m.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {m.interview_type_display}
                        {m.profile_title && <> · {m.profile_title}</>}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Candidato */}
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{m.candidate_name}</p>
                  <p className="text-xs text-gray-400">{m.candidate_email}</p>
                </td>

                {/* Fecha */}
                <td className="px-4 py-3">
                  <p className="text-gray-800">{formatDate(m.scheduled_at)}</p>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                    <i className={`fas ${FORMAT_ICONS[m.format]}`}></i>
                    <span>{m.format_display}</span>
                    <span>· {m.duration_minutes} min</span>
                  </div>
                  {m.join_url && m.status === 'scheduled' && (
                    <a
                      href={m.join_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1"
                    >
                      <i className="fab fa-microsoft"></i> Unirse
                    </a>
                  )}
                </td>

                {/* Entrevistadores */}
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {m.interviewers_data.length === 0 ? (
                      <span className="text-xs text-gray-400">Sin asignar</span>
                    ) : m.interviewers_data.slice(0, 2).map(i => (
                      <span key={i.id} className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded-full">
                        <i className="fas fa-user text-gray-400"></i>
                        {i.full_name.split(' ')[0]}
                      </span>
                    ))}
                    {m.interviewers_data.length > 2 && (
                      <span className="text-xs text-gray-400">+{m.interviewers_data.length - 2}</span>
                    )}
                  </div>
                  {(m.feedbacks_count ?? 0) > 0 && (
                    <p className="text-xs text-emerald-600 mt-1">
                      <i className="fas fa-clipboard-check mr-1"></i>{m.feedbacks_count} feedback(s)
                    </p>
                  )}
                </td>

                {/* Estado */}
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[m.status]}`}>
                    {m.status_display}
                  </span>
                </td>

                {/* Acciones */}
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => setDetailMeeting(m)}
                      title="Ver detalle"
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    >
                      <i className="fas fa-eye text-sm"></i>
                    </button>
                    {m.status === 'scheduled' && (
                      <>
                        <button
                          onClick={() => setEditMeeting(m)}
                          title="Editar"
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                        >
                          <i className="fas fa-pen text-sm"></i>
                        </button>
                        <button
                          onClick={() => handleComplete(m)}
                          title="Marcar completada"
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                        >
                          <i className="fas fa-check text-sm"></i>
                        </button>
                        <button
                          onClick={() => handleCancel(m)}
                          title="Cancelar"
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <i className="fas fa-ban text-sm"></i>
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editMeeting && (
        <MeetingFormModal
          meeting={editMeeting}
          onSave={() => { setEditMeeting(null); onRefresh(); }}
          onClose={() => setEditMeeting(null)}
        />
      )}

      {detailMeeting && (
        <MeetingDetail
          meeting={detailMeeting}
          onClose={() => { setDetailMeeting(null); onRefresh(); }}
          onRefresh={() => { setDetailMeeting(null); onRefresh(); }}
        />
      )}
    </>
  );
}

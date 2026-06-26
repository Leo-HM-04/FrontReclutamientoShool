'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useModal } from '@/context/ModalContext';
import { meetingsApi } from '@/lib/api-meetings';
import type { Meeting, MeetingStatus, MeetingType, MeetingStats } from '@/types/meetings';
import MeetingsList from './MeetingsList';
import MeetingFormModal from './MeetingFormModal';

type Tab = 'list' | 'upcoming' | 'stats';

const STATUS_OPTIONS: { value: MeetingStatus | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'scheduled', label: 'Programadas' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'completed', label: 'Completadas' },
  { value: 'cancelled', label: 'Canceladas' },
  { value: 'rescheduled', label: 'Reprogramadas' },
];

const TYPE_OPTIONS: { value: MeetingType | ''; label: string }[] = [
  { value: '', label: 'Todos los tipos' },
  { value: 'initial', label: 'Primer Contacto' },
  { value: 'hr', label: 'Entrevista RH' },
  { value: 'technical', label: 'Técnica' },
  { value: 'final', label: 'Final' },
  { value: 'group', label: 'Grupal' },
  { value: 'follow_up', label: 'Seguimiento' },
];

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color: string }) {
  return (
    <div className={`rounded-2xl p-5 ${color} flex items-center gap-4`}>
      <div className="w-12 h-12 bg-white/30 rounded-xl flex items-center justify-center">
        <i className={`fas ${icon} text-2xl text-white`}></i>
      </div>
      <div className="text-white">
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-sm opacity-90">{label}</p>
      </div>
    </div>
  );
}

export default function MeetingsMain() {
  const { showError } = useModal();
  const [tab, setTab] = useState<Tab>('list');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [upcoming, setUpcoming] = useState<Meeting[]>([]);
  const [stats, setStats] = useState<MeetingStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filtros
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [filterStatus, setFilterStatus] = useState<MeetingStatus | ''>('');
  const [filterType, setFilterType] = useState<MeetingType | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Debounce search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setDebouncedSearch(search), 400);
    return () => { if (searchTimerRef.current) clearTimeout(searchTimerRef.current); };
  }, [search]);

  const loadMeetings = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterStatus) params.status = filterStatus;
      if (filterType) params.interview_type = filterType;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;

      const data = await meetingsApi.list(params);
      setMeetings(data.results || (data as any));
    } catch {
      await showError('Error al cargar las reuniones.');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, filterStatus, filterType, dateFrom, dateTo]);

  const loadUpcoming = useCallback(async () => {
    try {
      const data = await meetingsApi.upcoming();
      setUpcoming(data);
    } catch {}
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await meetingsApi.stats();
      setStats(data);
    } catch {}
  }, []);

  useEffect(() => {
    loadMeetings();
    loadUpcoming();
    loadStats();
  }, [loadMeetings, loadUpcoming, loadStats]);

  const handleMeetingCreated = (m: Meeting) => {
    setShowCreateModal(false);
    loadMeetings();
    loadUpcoming();
    loadStats();
  };

  const handleRefresh = () => {
    loadMeetings();
    loadUpcoming();
    loadStats();
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString('es-MX', {
      weekday: 'short', day: '2-digit', month: 'short',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <i className="fas fa-video text-white"></i>
            </div>
            Reuniones y Entrevistas
          </h1>
          <p className="text-gray-500 text-sm mt-1">Programa, gestiona y evalúa entrevistas con candidatos.</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-medium text-sm hover:shadow-lg hover:shadow-blue-500/25 transition-all flex items-center gap-2"
        >
          <i className="fas fa-plus"></i>
          Nueva reunión
        </button>
      </div>

      {/* Stats cards rápidas */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon="fa-calendar-check" label="Hoy" value={stats.today} color="bg-gradient-to-br from-blue-500 to-blue-600" />
          <StatCard icon="fa-calendar-week" label="Esta semana" value={stats.this_week} color="bg-gradient-to-br from-indigo-500 to-purple-600" />
          <StatCard icon="fa-check-circle" label="Completadas" value={stats.completed} color="bg-gradient-to-br from-emerald-500 to-teal-600" />
          <StatCard icon="fa-clock" label="Pendientes feedback" value={stats.pending_feedback} color="bg-gradient-to-br from-orange-500 to-amber-600" />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {([
          { key: 'list', label: 'Todas las reuniones', icon: 'fa-list' },
          { key: 'upcoming', label: 'Próximas (7 días)', icon: 'fa-calendar-alt', badge: upcoming.length },
          { key: 'stats', label: 'Estadísticas', icon: 'fa-chart-bar' },
        ] as { key: Tab; label: string; icon: string; badge?: number }[]).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <i className={`fas ${t.icon}`}></i>
            {t.label}
            {t.badge ? (
              <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">{t.badge}</span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Tab: Lista completa */}
      {tab === 'list' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Barra de filtros */}
          <div className="p-4 border-b bg-gray-50">
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-48">
                <div className="relative">
                  <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por título, candidato..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                </div>
              </div>
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as MeetingStatus | '')}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <select
                value={filterType}
                onChange={e => setFilterType(e.target.value as MeetingType | '')}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                {TYPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                title="Desde"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                title="Hasta"
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              {(filterStatus || filterType || dateFrom || dateTo || search) && (
                <button
                  onClick={() => { setSearch(''); setDebouncedSearch(''); setFilterStatus(''); setFilterType(''); setDateFrom(''); setDateTo(''); }}
                  className="px-3 py-2 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <i className="fas fa-times mr-1"></i>Limpiar
                </button>
              )}
            </div>
          </div>
          <MeetingsList meetings={meetings} loading={loading} onRefresh={handleRefresh} />
        </div>
      )}

      {/* Tab: Próximas reuniones */}
      {tab === 'upcoming' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <i className="fas fa-calendar-alt text-blue-500"></i>
              Próximas 7 días ({upcoming.length})
            </h3>
          </div>
          {upcoming.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <i className="fas fa-calendar-check text-5xl mb-4 block"></i>
              <p>No hay reuniones próximas en los siguientes 7 días.</p>
            </div>
          ) : (
            <div className="divide-y">
              {upcoming.map(m => (
                <div key={m.id} className="p-4 hover:bg-gray-50 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-video text-blue-600"></i>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{m.title}</p>
                      <p className="text-xs text-gray-500">{m.candidate_name} · {m.interview_type_display}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-800">{formatDate(m.scheduled_at)}</p>
                    <p className="text-xs text-gray-400">{m.duration_minutes} min · {m.format_display}</p>
                    {m.join_url && (
                      <a
                        href={m.join_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-1"
                      >
                        <i className="fab fa-microsoft"></i> Unirse
                      </a>
                    )}
                    {m.teams_join_meeting_id && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Código: <span className="font-mono font-semibold text-gray-600">{m.teams_join_meeting_id}</span>
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Estadísticas */}
      {tab === 'stats' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Resumen numérico */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <i className="fas fa-chart-pie text-blue-500"></i> Resumen general
            </h3>
            <div className="space-y-3">
              {[
                { label: 'Total reuniones', value: stats.total, icon: 'fa-calendar', color: 'text-blue-600' },
                { label: 'Programadas', value: stats.scheduled, icon: 'fa-clock', color: 'text-indigo-600' },
                { label: 'Completadas', value: stats.completed, icon: 'fa-check-circle', color: 'text-emerald-600' },
                { label: 'Canceladas', value: stats.cancelled, icon: 'fa-ban', color: 'text-red-500' },
                { label: 'Hoy', value: stats.today, icon: 'fa-calendar-day', color: 'text-purple-600' },
                { label: 'Esta semana', value: stats.this_week, icon: 'fa-calendar-week', color: 'text-teal-600' },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <i className={`fas ${row.icon} ${row.color} w-4`}></i>
                    <span className="text-sm text-gray-600">{row.label}</span>
                  </div>
                  <span className={`text-lg font-bold ${row.color}`}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Pendientes feedback */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <i className="fas fa-clipboard-check text-orange-500"></i> Pendientes de evaluación
            </h3>
            {stats.pending_feedback === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <i className="fas fa-check-double text-4xl mb-3 block text-emerald-400"></i>
                <p className="text-sm">¡Todo al día! Sin feedbacks pendientes.</p>
              </div>
            ) : (
              <div className="text-center py-10">
                <p className="text-6xl font-black text-orange-500">{stats.pending_feedback}</p>
                <p className="text-gray-600 mt-2">reuniones completadas sin evaluación</p>
                <button
                  onClick={() => { setFilterStatus('completed'); setTab('list'); }}
                  className="mt-4 px-4 py-2 bg-orange-500 text-white text-sm rounded-lg hover:bg-orange-600 transition-colors"
                >
                  Ver reuniones completadas
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de creación */}
      {showCreateModal && (
        <MeetingFormModal
          onSave={handleMeetingCreated}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
}

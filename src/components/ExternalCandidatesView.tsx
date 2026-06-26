'use client';

/**
 * ExternalCandidatesView
 * Vista de "Talento Externo" — búsqueda de candidatos vía People Data Labs.
 * Se integra en el panel de Admin como una nueva sección.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import SalaryInsightWidget from './SalaryInsightWidget';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  position_title: string;
  department?: string;
  location_city?: string;
  location_state?: string;
  status: string;
}

interface WorkHistory {
  title: string;
  company: string;
  start?: string;
  end?: string;
}

interface Education {
  school: string;
  degree?: string;
  field?: string;
  end?: string;
}

interface ExternalCandidate {
  id: string;
  full_name: string;
  first_name: string;
  last_name: string;
  job_title: string;
  company: string;
  industry: string;
  city: string;
  state: string;
  country: string;
  skills: string[];
  work_history: WorkHistory[];
  education: Education[];
  linkedin_url: string;
  match_score: number;
  status: string;
  notes: string;
  source: string;
  found_at: string;
  imported_candidate_id: string | null;
  profile_id: string;
}

interface SearchRecord {
  id: string;
  profile_id: string;
  profile_title: string;
  status: string;
  results_count: number;
  credits_used: number;
  created_at: string;
  completed_at: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function scoreConfig(score: number) {
  if (score >= 70) return {
    text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-300',
    bar: 'bg-emerald-500', accent: '#10b981', label: 'Alto',
  };
  if (score >= 40) return {
    text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-300',
    bar: 'bg-amber-400', accent: '#f59e0b', label: 'Medio',
  };
  return {
    text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-300',
    bar: 'bg-blue-400', accent: '#3b82f6', label: 'Bajo',
  };
}

function statusMeta(status: string): { label: string; cls: string; dot: string } {
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    new:       { label: 'Nuevo',       cls: 'bg-sky-50 text-sky-700 border border-sky-200',              dot: 'bg-sky-500' },
    reviewing: { label: 'En revisión', cls: 'bg-amber-50 text-amber-700 border border-amber-200',        dot: 'bg-amber-500' },
    imported:  { label: 'Importado',   cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200', dot: 'bg-emerald-500' },
    discarded: { label: 'Descartado',  cls: 'bg-red-50 text-red-600 border border-red-200',             dot: 'bg-red-400' },
  };
  return map[status] ?? { label: status, cls: 'bg-gray-100 text-gray-500 border border-gray-200', dot: 'bg-gray-400' };
}

function statusLabel(status: string) { return statusMeta(status).label; }

function avatarGradient(name: string) {
  const g = [
    'from-violet-500 to-purple-600', 'from-blue-500 to-indigo-600',
    'from-emerald-500 to-teal-600',  'from-orange-500 to-red-500',
    'from-pink-500 to-rose-600',     'from-cyan-500 to-blue-600',
    'from-amber-500 to-orange-500',  'from-indigo-500 to-violet-600',
  ];
  return g[name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % g.length];
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

function cleanLocation(...parts: unknown[]): string {
  return parts
    .filter((v): v is string =>
      typeof v === 'string' && v.length > 0 &&
      v.toLowerCase() !== 'true' && v.toLowerCase() !== 'false'
    )
    .slice(0, 2)
    .join(', ');
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ExternalCandidatesView() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [candidates, setCandidates] = useState<ExternalCandidate[]>([]);
  const [searches, setSearches] = useState<SearchRecord[]>([]);
  const [activeSearch, setActiveSearch] = useState<SearchRecord | null>(null);
  const [pollingInterval, setPollingInterval] = useState<ReturnType<typeof setInterval> | null>(null);

  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [importingId, setImportingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  // ── Progreso de búsqueda ─────────────────────────────────────────────────────
  const [searchProgress, setSearchProgress] = useState(0);
  const [searchElapsed, setSearchElapsed] = useState(0);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Cargar perfiles disponibles ──────────────────────────────────────────────

  // ── Cancelar búsqueda en curso ─────────────────────────────────────────────
  const handleCancelSearch = useCallback(() => {
    if (pollingInterval) { clearInterval(pollingInterval); setPollingInterval(null); }
    setActiveSearch(null);
    setSearching(false);
    setError('Búsqueda cancelada manualmente.');
  }, [pollingInterval]);

  // ── Timer de progreso de búsqueda ────────────────────────────────────────────
  const SEARCH_TIMEOUT_SECONDS = 180; // 3 minutos

  useEffect(() => {
    if (searching) {
      setSearchProgress(0);
      setSearchElapsed(0);
      progressTimerRef.current = setInterval(() => {
        setSearchElapsed((prev) => {
          const elapsed = prev + 1;
          // Timeout automático a los 3 minutos
          if (elapsed >= SEARCH_TIMEOUT_SECONDS) {
            if (progressTimerRef.current) clearInterval(progressTimerRef.current);
            setSearching(false);
            setActiveSearch(null);
            setSearchProgress(0);
            setError('La búsqueda tardó más de 3 minutos sin respuesta. PDL puede estar ocupado o la API key puede haber expirado. Intenta de nuevo más tarde.');
            return elapsed;
          }
          // Función asintótica: se acerca a 90% pero nunca llega hasta que complete
          const progress = Math.min(90, Math.round(90 * (1 - Math.exp(-elapsed / 50))));
          setSearchProgress(progress);
          return elapsed;
        });
      }, 1000);
    } else {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      if (searchProgress > 0) {
        // Búsqueda completada: saltar a 100%
        setSearchProgress(100);
        setTimeout(() => setSearchProgress(0), 1500);
      }
    }
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching]);

  useEffect(() => {
    (async () => {
      try {
        // Traer todos los perfiles (sin filtro de estado para asegurar que siempre haya opciones)
        const res = await fetch(`${API}/profiles/profiles/`, {
          headers: authHeaders(),
        });
        if (!res.ok) throw new Error('Error cargando perfiles');
        const data = await res.json();
        const raw = data.results ?? data;
        const list: Profile[] = Array.isArray(raw) ? raw : [];
        setProfiles(list);
        if (list.length > 0) setSelectedProfileId(list[0].id);
      } catch {
        setProfiles([]);
      } finally {
        setLoadingProfiles(false);
      }
    })();
  }, []);

  // ── Cargar candidatos y búsquedas cuando cambia el perfil ────────────────────

  const loadCandidatesAndSearches = useCallback(async (profileId: string) => {
    setLoadingCandidates(true);
    setError('');
    try {
      const [candRes, searchRes] = await Promise.all([
        fetch(`${API}/candidates/external/?profile_id=${profileId}`, { headers: authHeaders() }),
        fetch(`${API}/candidates/external-search/list/?profile_id=${profileId}`, { headers: authHeaders() }),
      ]);
      if (candRes.ok) setCandidates(await candRes.json());
      if (searchRes.ok) {
        const searchList: SearchRecord[] = await searchRes.json();
        setSearches(searchList);
        // Si la última búsqueda está en curso la marcamos como activa para polling
        const running = searchList.find((s) => s.status === 'pending' || s.status === 'running');
        if (running) setActiveSearch(running);
      }
    } catch {
      setError('No se pudieron cargar los candidatos externos.');
    } finally {
      setLoadingCandidates(false);
    }
  }, []);

  useEffect(() => {
    if (selectedProfileId) loadCandidatesAndSearches(selectedProfileId);
  }, [selectedProfileId, loadCandidatesAndSearches]);

  // ── Polling cuando hay búsqueda activa ──────────────────────────────────────

  useEffect(() => {
    if (!activeSearch) {
      if (pollingInterval) { clearInterval(pollingInterval); setPollingInterval(null); }
      return;
    }
    const iv = setInterval(async () => {
      try {
        const res = await fetch(`${API}/candidates/external-search/${activeSearch.id}/`, { headers: authHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        if (data.status === 'completed' || data.status === 'failed') {
          setActiveSearch(null);
          setSearching(false);
          if (selectedProfileId) loadCandidatesAndSearches(selectedProfileId);
        }
      } catch { /* ignorar errores de polling */ }
    }, 3000);
    setPollingInterval(iv);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSearch]);

  // ── Limpiar resultados y reiniciar ───────────────────────────────────────────

  const handleClearResults = async () => {
    if (!selectedProfileId) return;
    // Borrar candidatos externos del perfil actual vía API (DELETE bulk) o solo en UI
    // Limpiamos localmente para que el usuario pueda hacer una nueva búsqueda fresca
    setCandidates([]);
    setSearches([]);
    setActiveSearch(null);
    setFilterStatus('all');
    setError('');
    setSuccessMsg('Resultados eliminados. Puedes iniciar una nueva búsqueda.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  // ── Lanzar nueva búsqueda ────────────────────────────────────────────────────

  const handleSearch = async () => {
    if (!selectedProfileId) return;
    setSearching(true);
    setError('');
    try {
      const res = await fetch(`${API}/candidates/external-search/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ profile_id: selectedProfileId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Error al iniciar la búsqueda');
        setSearching(false);
        return;
      }
      setActiveSearch({ id: data.search_id, profile_id: selectedProfileId, profile_title: '', status: 'running', results_count: 0, credits_used: 0, created_at: new Date().toISOString(), completed_at: null });
    } catch {
      setError('Error de conexión al iniciar búsqueda');
      setSearching(false);
    }
  };

  // ── Cambiar estado de candidato ──────────────────────────────────────────────

  const handleStatusChange = async (candidateId: string, newStatus: string) => {
    try {
      await fetch(`${API}/candidates/external/${candidateId}/`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status: newStatus }),
      });
      setCandidates((prev) => prev.map((c) => c.id === candidateId ? { ...c, status: newStatus } : c));
    } catch { /* silencioso */ }
  };

  // ── Importar candidato ───────────────────────────────────────────────────────

  const handleImport = async (candidateId: string) => {
    setImportingId(candidateId);
    try {
      const res = await fetch(`${API}/candidates/external/${candidateId}/import/`, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (res.ok || res.status === 201) {
        setCandidates((prev) => prev.map((c) => c.id === candidateId ? { ...c, status: 'imported', imported_candidate_id: data.candidate_id } : c));
        setSuccessMsg('Candidato importado al proceso correctamente');
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setError(data.error || 'Error al importar');
      }
    } catch {
      setError('Error de conexión al importar');
    } finally {
      setImportingId(null);
    }
  };

  // ── Filtrado ────────────────────────────────────────────────────────────────

  const filteredCandidates = filterStatus === 'all'
    ? candidates
    : candidates.filter((c) => c.status === filterStatus);

  const selectedProfile = Array.isArray(profiles) ? profiles.find((p) => p.id === selectedProfileId) : undefined;
  const lastSearch = searches[0];

  // Conteo por estado para los filtros
  const countByStatus = candidates.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] || 0) + 1;
    return acc;
  }, {});

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-md">
              <i className="fas fa-globe text-white text-sm"></i>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 leading-tight">Talento Externo</h2>
              <p className="text-gray-500 text-xs">Búsqueda inteligente via People Data Labs</p>
            </div>
          </div>
        </div>
        {lastSearch && (
          <div className="flex items-center gap-2 text-xs bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
            <i className="fas fa-history text-gray-400"></i>
            <span className="text-gray-500">Última búsqueda:</span>
            <span className="font-semibold text-gray-700">{new Date(lastSearch.created_at).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <span className="text-gray-300">·</span>
            <span className="text-blue-600 font-semibold">{candidates.length} resultados</span>
            {lastSearch.results_count > 0 && lastSearch.results_count < candidates.length && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-emerald-600 font-semibold">+{lastSearch.results_count} nuevos</span>
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Alertas ────────────────────────────────────────────────────── */}
      {successMsg && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-sm shadow-sm">
          <i className="fas fa-check-circle text-emerald-500 text-base flex-shrink-0"></i>
          <span>{successMsg}</span>
          <button className="ml-auto text-emerald-400 hover:text-emerald-600 transition-colors" onClick={() => setSuccessMsg('')}>×</button>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm shadow-sm">
          <i className="fas fa-exclamation-circle text-red-400 text-base flex-shrink-0"></i>
          <span>{error}</span>
          <button className="ml-auto text-red-400 hover:text-red-600 transition-colors" onClick={() => setError('')}>×</button>
        </div>
      )}

      {/* ── Panel de búsqueda ──────────────────────────────────────────── */}
      <div className="bg-white border border-blue-200 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">
              <i className="fas fa-briefcase mr-1 text-blue-400"></i>Perfil de búsqueda
            </label>
            {loadingProfiles ? (
              <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
            ) : (
              <select
                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition-all"
                value={selectedProfileId}
                onChange={(e) => setSelectedProfileId(e.target.value)}
              >
                {profiles.length === 0 && <option value="">Sin perfiles disponibles</option>}
                {profiles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.position_title}{p.department ? ` · ${p.department}` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex gap-2">
            {candidates.length > 0 && !searching && (
              <button
                onClick={handleClearResults}
                title="Limpiar resultados y hacer una nueva búsqueda"
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-50 hover:border-red-300 hover:text-red-600 transition-all shadow-sm"
              >
                <i className="fas fa-redo-alt"></i>
                Nueva búsqueda
              </button>
            )}
            <button
              onClick={handleSearch}
              disabled={searching || !selectedProfileId || loadingProfiles}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {searching ? (
                <><i className="fas fa-circle-notch animate-spin"></i>Buscando…</>
              ) : (
                <><i className="fas fa-search"></i>Buscar Candidatos</>
              )}
            </button>
          </div>
        </div>
        {selectedProfile && (
          <div className="mt-3.5 flex flex-wrap gap-3 pt-3.5 border-t border-gray-100">
            <span className="flex items-center gap-1.5 text-xs text-gray-500">
              <i className="fas fa-id-badge text-blue-400"></i>{selectedProfile.position_title}
            </span>
            {selectedProfile.department && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <i className="fas fa-sitemap text-blue-400"></i>{selectedProfile.department}
              </span>
            )}
            {selectedProfile.location_city && (
              <span className="flex items-center gap-1.5 text-xs text-gray-500">
                <i className="fas fa-map-marker-alt text-blue-400"></i>
                {selectedProfile.location_city}{selectedProfile.location_state ? `, ${selectedProfile.location_state}` : ''}
              </span>
            )}
            <span className="ml-auto flex items-center gap-1 text-xs text-gray-400">
              <i className="fas fa-database text-blue-300"></i>People Data Labs
            </span>
          </div>
        )}
      </div>

      {/* ── Análisis de competitividad salarial ───────────────────────── */}
      {selectedProfileId && !loadingProfiles && (
        <SalaryInsightWidget profileId={selectedProfileId} />
      )}

      {/* ── Progreso de búsqueda ───────────────────────────────────────── */}
      {searching && (
        <div className="bg-white border border-blue-100 rounded-2xl p-5 shadow-sm overflow-hidden relative">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500 animate-pulse" />
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
                <i className="fas fa-circle-notch animate-spin text-blue-500 text-sm"></i>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {searchProgress < 15 && 'Conectando con People Data Labs…'}
                  {searchProgress >= 15 && searchProgress < 35 && 'Analizando perfil de la vacante…'}
                  {searchProgress >= 35 && searchProgress < 60 && 'Buscando candidatos en base de datos…'}
                  {searchProgress >= 60 && searchProgress < 80 && 'Calculando compatibilidad…'}
                  {searchProgress >= 80 && searchProgress < 95 && 'Finalizando resultados…'}
                  {searchProgress >= 95 && 'Cargando candidatos…'}
                </p>
                <p className="text-xs text-gray-400">
                  {searchElapsed >= 90
                    ? <span className="text-amber-500 font-medium"><i className="fas fa-clock mr-1"></i>Tomando más tiempo de lo usual…</span>
                    : 'PDL está procesando la consulta, por favor espera'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs tabular-nums text-gray-400">
                {Math.floor(searchElapsed / 60) > 0 ? `${Math.floor(searchElapsed / 60)}m ${searchElapsed % 60}s` : `${searchElapsed}s`}
              </span>
              <button
                onClick={handleCancelSearch}
                className="text-xs px-3 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2">
            <div
              className="h-2 rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-blue-500 to-indigo-500"
              style={{ width: `${searchProgress}%` }}
            />
          </div>
          <div className="mt-1.5 text-right">
            <span className="text-xs font-bold text-blue-600">{searchProgress}%</span>
          </div>
        </div>
      )}

      {/* Completado — flash 100% */}
      {!searching && searchProgress === 100 && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <i className="fas fa-check-circle text-emerald-500"></i>
            <span className="text-sm font-semibold text-emerald-700">¡Búsqueda completada!</span>
            <span className="ml-auto text-xs font-bold text-emerald-600">100%</span>
          </div>
          <div className="w-full bg-emerald-100 rounded-full h-2">
            <div className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 w-full transition-all duration-500" />
          </div>
        </div>
      )}

      {/* ── Stats + Filtros ────────────────────────────────────────────── */}
      {candidates.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Pills de filtro */}
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'new', 'reviewing', 'imported', 'discarded'] as const).map((s) => {
              const meta = s === 'all' ? null : statusMeta(s);
              const count = s === 'all' ? candidates.length : (countByStatus[s] || 0);
              return (
                <button
                  key={s}
                  onClick={() => setFilterStatus(s)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    filterStatus === s
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                  }`}
                >
                  {meta && <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />}
                  {s === 'all' ? 'Todos' : meta!.label}
                  <span className={`text-[10px] font-bold px-1 py-0.5 rounded-full ${
                    filterStatus === s ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                  }`}>{count}</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-400 mr-1">
              <span className="font-semibold text-gray-700">{filteredCandidates.length}</span> / {candidates.length}
            </p>
            {/* Toggle vista */}
            <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                title="Vista en cuadrícula"
                className={`w-7 h-7 flex items-center justify-center rounded-md text-xs transition-all ${
                  viewMode === 'grid' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <i className="fas fa-th-large"></i>
              </button>
              <button
                onClick={() => setViewMode('list')}
                title="Vista en lista"
                className={`w-7 h-7 flex items-center justify-center rounded-md text-xs transition-all ${
                  viewMode === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <i className="fas fa-list"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Lista de candidatos ────────────────────────────────────────── */}
      {loadingCandidates ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4' : 'flex flex-col gap-2'}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            viewMode === 'grid' ? (
              <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 animate-pulse shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded-full w-3/4" />
                    <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-gray-100" />
                </div>
                <div className="flex gap-1.5">
                  {[1,2,3].map((j) => <div key={j} className="h-6 bg-gray-100 rounded-full" style={{ width: `${50 + j * 15}px` }} />)}
                </div>
              </div>
            ) : (
              <div key={i} className="bg-white border border-gray-100 rounded-xl p-3 animate-pulse flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/4" />
                </div>
                <div className="w-16 h-6 bg-gray-100 rounded-full" />
                <div className="w-20 h-7 bg-gray-100 rounded-lg" />
              </div>
            )
          ))}
        </div>
      ) : filteredCandidates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center mb-4">
            <i className="fas fa-user-search text-3xl text-gray-300"></i>
          </div>
          <p className="text-base font-semibold text-gray-500">Sin candidatos externos</p>
          <p className="text-sm text-gray-400 mt-1 max-w-xs">
            {candidates.length === 0
              ? 'Selecciona un perfil y presiona "Buscar Candidatos" para encontrar talento.'
              : 'No hay candidatos con el filtro seleccionado.'}
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredCandidates.map((candidate) => (
            <CandidateCard
              key={candidate.id}
              candidate={candidate}
              expanded={expandedCard === candidate.id}
              onToggleExpand={() => setExpandedCard(expandedCard === candidate.id ? null : candidate.id)}
              onStatusChange={handleStatusChange}
              onImport={handleImport}
              importing={importingId === candidate.id}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {filteredCandidates.map((candidate) => (
            <CandidateRow
              key={candidate.id}
              candidate={candidate}
              expanded={expandedCard === candidate.id}
              onToggleExpand={() => setExpandedCard(expandedCard === candidate.id ? null : candidate.id)}
              onStatusChange={handleStatusChange}
              onImport={handleImport}
              importing={importingId === candidate.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── CandidateRow (vista lista compacta) ──────────────────────────────────────

function CandidateRow({ candidate, expanded, onToggleExpand, onStatusChange, onImport, importing }: CardProps) {
  const isImported = candidate.status === 'imported';
  const isDiscarded = candidate.status === 'discarded';
  const sc = scoreConfig(candidate.match_score);
  const sm = statusMeta(candidate.status);
  const location = cleanLocation(candidate.city, candidate.state);

  return (
    <div className={`bg-white rounded-xl border border-blue-100 overflow-hidden transition-all duration-200 hover:border-blue-300 hover:shadow-sm ${isDiscarded ? 'opacity-55 grayscale-[30%]' : ''}`}>
      {/* Fila principal */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Avatar */}
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
          <i className="fas fa-user-tie text-blue-400 text-sm"></i>
        </div>

        {/* Nombre + puesto */}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-gray-900 truncate leading-tight">{candidate.full_name}</p>
          <p className="text-xs text-gray-400 truncate">
            {[candidate.job_title, candidate.company].filter(Boolean).join(' · ')}
            {location ? <span className="ml-1.5 text-gray-300">— {location}</span> : null}
          </p>
        </div>

        {/* Skills (hidden en pantallas muy pequeñas) */}
        {candidate.skills.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 flex-shrink-0 max-w-[200px]">
            {candidate.skills.slice(0, 2).map((skill, i) => (
              <span key={`${skill}-${i}`} className="bg-slate-50 text-slate-600 text-[10px] font-medium px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[80px]">
                {skill}
              </span>
            ))}
            {candidate.skills.length > 2 && (
              <span className="text-[10px] text-gray-400 px-1 border border-dashed border-gray-200 rounded">
                +{candidate.skills.length - 2}
              </span>
            )}
          </div>
        )}

        {/* Estado */}
        <span className={`hidden md:inline-flex flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full items-center gap-1 ${sm.cls}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
          {sm.label}
        </span>

        {/* Score */}
        <div className={`flex-shrink-0 flex flex-col items-center justify-center w-10 h-10 rounded-lg ${sc.bg} border ${sc.border}`}>
          <span className={`text-sm font-extrabold leading-none ${sc.text}`}>{candidate.match_score}</span>
          <span className={`text-[8px] font-semibold uppercase ${sc.text} opacity-70`}>{sc.label}</span>
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {candidate.linkedin_url && (
            <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer"
              className="w-7 h-7 flex items-center justify-center text-[#0a66c2] hover:bg-blue-50 rounded-lg transition-colors"
              title="Ver en LinkedIn">
              <i className="fab fa-linkedin text-base"></i>
            </a>
          )}
          <button
            onClick={onToggleExpand}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-colors text-xs"
            title={expanded ? 'Colapsar' : 'Ver detalle'}
          >
            <i className={`fas fa-chevron-${expanded ? 'up' : 'down'}`}></i>
          </button>

          {isDiscarded ? (
            <button onClick={() => onStatusChange(candidate.id, 'new')}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-blue-200 text-blue-500 hover:bg-blue-50 transition-colors text-xs"
              title="Restaurar">
              <i className="fas fa-undo"></i>
            </button>
          ) : !isImported ? (
            <button onClick={() => onStatusChange(candidate.id, 'discarded')}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-100 text-red-400 hover:border-red-300 hover:bg-red-50 transition-colors text-xs"
              title="Descartar">
              <i className="fas fa-times"></i>
            </button>
          ) : null}

          {isImported ? (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg">
              <i className="fas fa-check"></i><span className="hidden sm:inline">En proceso</span>
            </span>
          ) : !isDiscarded ? (
            <button onClick={() => onImport(candidate.id)} disabled={importing}
              className="flex items-center gap-1 text-xs bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-2.5 py-1.5 rounded-lg font-semibold shadow-sm hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 transition-all">
              {importing
                ? <><i className="fas fa-circle-notch animate-spin"></i><span className="hidden sm:inline">Agregando…</span></>
                : <><i className="fas fa-user-plus"></i><span className="hidden sm:inline">Agregar</span></>}
            </button>
          ) : null}
        </div>
      </div>

      {/* Detalle expandido (reutiliza la misma lógica) */}
      {expanded && (
        <div className="mx-4 mb-3 bg-slate-50 rounded-xl p-3 space-y-3 border border-slate-100">
          {candidate.work_history.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <i className="fas fa-briefcase"></i>Experiencia
              </p>
              <ul className="space-y-1.5">
                {candidate.work_history.map((w, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></span>
                    <div>
                      <span className="text-xs font-semibold text-gray-700">{w.title}</span>
                      {w.company && <span className="text-xs text-gray-400"> · {w.company}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {candidate.education.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <i className="fas fa-graduation-cap"></i>Educación
              </p>
              <ul className="space-y-1.5">
                {candidate.education.map((e, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0"></span>
                    <div>
                      <span className="text-xs font-semibold text-gray-700">{e.school}</span>
                      {e.degree && <span className="text-xs text-gray-400"> · {e.degree}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── CandidateCard ─────────────────────────────────────────────────────────────

interface CardProps {
  candidate: ExternalCandidate;
  expanded: boolean;
  onToggleExpand: () => void;
  onStatusChange: (id: string, status: string) => void;
  onImport: (id: string) => void;
  importing: boolean;
}

function CandidateCard({ candidate, expanded, onToggleExpand, onStatusChange, onImport, importing }: CardProps) {
  const isImported = candidate.status === 'imported';
  const isDiscarded = candidate.status === 'discarded';
  const sc = scoreConfig(candidate.match_score);
  const sm = statusMeta(candidate.status);
  const location = cleanLocation(candidate.city, candidate.state);

  return (
    <div
      className={`bg-white rounded-xl border border-blue-100 overflow-hidden flex flex-col transition-all duration-200 hover:border-blue-300 hover:shadow-sm ${
        isDiscarded ? 'opacity-55 grayscale-[30%]' : ''
      }`}
    >
      {/* ── Cuerpo ── */}
      <div className="p-4 flex-1">
        <div className="flex items-start gap-3">
          {/* Avatar — icono profesional */}
          <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
            <i className="fas fa-user-tie text-blue-400 text-lg"></i>
          </div>

          {/* Nombre + título */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">{candidate.full_name}</h3>
            {candidate.job_title && (
              <p className="text-xs text-gray-500 truncate mt-0.5">{candidate.job_title}</p>
            )}
            {candidate.company && (
              <p className="text-xs text-gray-400 truncate flex items-center gap-1 mt-0.5">
                <i className="fas fa-building text-gray-300 text-[10px]"></i>{candidate.company}
              </p>
            )}
          </div>

          {/* Score */}
          <div className={`flex-shrink-0 flex flex-col items-center justify-center w-12 h-12 rounded-xl ${sc.bg} border ${sc.border}`}>
            <span className={`text-base font-extrabold leading-none ${sc.text}`}>{candidate.match_score}</span>
            <span className={`text-[9px] font-semibold uppercase tracking-wide ${sc.text} opacity-70`}>{sc.label}</span>
          </div>
        </div>

        {/* Meta: ubicación + industria */}
        <div className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1">
          {location && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <i className="fas fa-map-marker-alt text-gray-300 text-[10px]"></i>{location}
            </span>
          )}
          {candidate.industry && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <i className="fas fa-industry text-gray-300 text-[10px]"></i>{candidate.industry}
            </span>
          )}
        </div>

        {/* Skills */}
        {candidate.skills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {candidate.skills.slice(0, 4).map((skill, i) => (
              <span
                key={`${skill}-${i}`}
                className="bg-slate-50 text-slate-600 text-[11px] font-medium px-2 py-0.5 rounded-md border border-slate-200"
              >
                {skill}
              </span>
            ))}
            {candidate.skills.length > 4 && (
              <span className="text-[11px] text-gray-400 px-1.5 py-0.5 rounded-md border border-dashed border-gray-200">
                +{candidate.skills.length - 4}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Detalle expandido ── */}
      {expanded && (
        <div className="mx-4 mb-3 bg-slate-50 rounded-xl p-3 space-y-3 border border-slate-100">
          {candidate.work_history.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <i className="fas fa-briefcase"></i>Experiencia
              </p>
              <ul className="space-y-1.5">
                {candidate.work_history.map((w, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0"></span>
                    <div>
                      <span className="text-xs font-semibold text-gray-700">{w.title}</span>
                      {w.company && <span className="text-xs text-gray-400"> · {w.company}</span>}
                      {(w.start || w.end) && (
                        <span className="text-[11px] text-gray-400 ml-1">({[w.start, w.end].filter(Boolean).join('→')})</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {candidate.education.length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <i className="fas fa-graduation-cap"></i>Educación
              </p>
              <ul className="space-y-1.5">
                {candidate.education.map((e, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0"></span>
                    <div>
                      <span className="text-xs font-semibold text-gray-700">{e.school}</span>
                      {e.degree && <span className="text-xs text-gray-400"> · {e.degree}</span>}
                      {e.field && <span className="text-[11px] text-gray-400"> ({e.field})</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Barra de acciones ── */}
      <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between gap-2">
        {/* Izquierda: LinkedIn + estado */}
        <div className="flex items-center gap-2">
          {candidate.linkedin_url ? (
            <a
              href={candidate.linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[#0a66c2] hover:text-blue-900 font-semibold transition-colors"
              title="Ver en LinkedIn"
            >
              <i className="fab fa-linkedin text-base"></i>
              <span className="hidden sm:inline">LinkedIn</span>
            </a>
          ) : (
            <span className="text-xs text-gray-300 italic">Sin LinkedIn</span>
          )}
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${sm.cls} flex items-center gap-1`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sm.dot}`} />
            {sm.label}
          </span>
        </div>

        {/* Derecha: acciones */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onToggleExpand}
            className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 hover:border-gray-300 hover:text-gray-600 transition-colors text-xs"
            title={expanded ? 'Colapsar' : 'Ver detalle'}
          >
            <i className={`fas fa-chevron-${expanded ? 'up' : 'down'}`}></i>
          </button>

          {isDiscarded ? (
            <button
              onClick={() => onStatusChange(candidate.id, 'new')}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-blue-200 text-blue-500 hover:bg-blue-50 transition-colors text-xs"
              title="Restaurar candidato"
            >
              <i className="fas fa-undo"></i>
            </button>
          ) : !isImported ? (
            <button
              onClick={() => onStatusChange(candidate.id, 'discarded')}
              className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-100 text-red-400 hover:border-red-300 hover:bg-red-50 transition-colors text-xs"
              title="Descartar"
            >
              <i className="fas fa-times"></i>
            </button>
          ) : null}

          {isImported ? (
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
              <i className="fas fa-check"></i>En proceso
            </span>
          ) : !isDiscarded ? (
            <button
              onClick={() => onImport(candidate.id)}
              disabled={importing}
              className="flex items-center gap-1.5 text-xs bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-3 py-1.5 rounded-lg font-semibold shadow-sm hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 transition-all"
            >
              {importing
                ? <><i className="fas fa-circle-notch animate-spin"></i>Agregando…</>
                : <><i className="fas fa-user-plus"></i>Agregar</>}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

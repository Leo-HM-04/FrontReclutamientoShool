'use client';

/**
 * ============================================================
 * PÁGINA PÚBLICA - AVANCE DEL PERFIL
 * ============================================================
 * Página compartible sin autenticación para que los clientes
 * vean el avance de su proceso de reclutamiento en tiempo real
 * 
 * Ruta: /public/profile-progress/[token]
 * 
 * Características:
 * - Sin autenticación requerida
 * - Actualización automática cada 30 segundos
 * - Timeline completo del proceso
 * - Estadísticas de candidatos
 * - Diseño responsive y profesional
 */

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

// ============================================================
// INTERFACES
// ============================================================

interface ProfileProgress {
  profile: {
    id: number;
    position_title: string;
    department: string;
    location_city: string;
    location_state: string;
    number_of_positions: number;
    status: string;
    status_display: string;
    priority: string;
    priority_display: string;
    created_at: string;
    updated_at: string;
    deadline: string | null;
  };
  client: {
    company_name: string;
    industry: string;
  };
  timeline: TimelineEvent[];
  candidates_stats: {
    total_applied: number;
    in_screening: number;
    shortlisted: number;
    interviewed: number;
    offered: number;
    accepted: number;
    rejected: number;
  };
  top_candidates: TopCandidate[];
  selected_candidates: SelectedCandidate[];
  progress: {
    percentage: number;
    current_phase: string;
    total_phases: number;
    completed_phases: number;
  };
  generated_at: string;
}

interface TimelineEvent {
  type: string;
  title: string;
  description: string;
  timestamp: string;
  status: string;
  icon: string;
  color: string;
}

interface TopCandidate {
  id: number;
  candidate_name: string;
  status: string;
  status_display: string;
  match_percentage: number;
  applied_at: string;
}

interface SelectedCandidate extends TopCandidate {
  offer_date: string | null;
  documents_count: number;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function PublicProfileProgressPage() {
  const params = useParams();
  const token = params?.token as string;

  const [data, setData] = useState<ProfileProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // ============================================================
  // FUNCIONES DE CARGA
  // ============================================================

  const fetchProgress = async () => {
    try {
      // Use configured API base or fallback to local backend in development
      const apiBase = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:8000';
      const url = `${apiBase}/api/public/profile-progress/${token}/`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error('No se pudo cargar la información del perfil');
      }

      const result = await response.json();
      setData(result);
      setLastUpdate(new Date());
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;

    // Carga inicial
    fetchProgress();

    // Actualizar cada 30 segundos
    const interval = setInterval(fetchProgress, 30000);
    
    return () => clearInterval(interval);
  }, [token]);

  // ============================================================
  // FUNCIONES AUXILIARES
  // ============================================================

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getIconClass = (iconName: string) => {
    const icons: { [key: string]: string } = {
      'plus-circle': 'fas fa-plus-circle',
      'exchange-alt': 'fas fa-exchange-alt',
      'user-plus': 'fas fa-user-plus',
      'star': 'fas fa-star',
      'comments': 'fas fa-comments',
      'trophy': 'fas fa-trophy',
      'check-circle': 'fas fa-check-circle',
    };
    return icons[iconName] || 'fas fa-circle';
  };

  const getColorClass = (color: string) => {
    const colors: { [key: string]: string } = {
      blue: 'bg-blue-600 text-white',
      purple: 'bg-purple-600 text-white',
      green: 'bg-green-600 text-white',
      yellow: 'bg-yellow-600 text-white',
      red: 'bg-red-600 text-white',
    };
    return colors[color] || 'bg-gray-600 text-white';
  };

  // ============================================================
  // ESTADOS DE CARGA Y ERROR
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
          <p className="text-xl text-gray-600 font-medium">Cargando información del proceso...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md bg-white rounded-xl shadow-lg p-8">
          <i className="fas fa-exclamation-circle text-6xl text-red-600 mb-4"></i>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            No se pudo cargar la información
          </h1>
          <p className="text-gray-600">{error || 'Enlace inválido o expirado'}</p>
          <p className="text-sm text-gray-500 mt-4">
            Por favor, verifica el enlace o contacta con tu representante.
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER PRINCIPAL
  // ============================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* ========== HEADER ========== */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Info del perfil */}
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                {data.profile.position_title}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                <span className="flex items-center">
                  <i className="fas fa-building w-4 h-4 mr-2"></i>
                  {data.client.company_name}
                </span>
                {data.client.industry && (
                  <>
                    <span className="text-gray-300">•</span>
                    <span>{data.client.industry}</span>
                  </>
                )}
                <span className="text-gray-300">•</span>
                <span className="flex items-center">
                  <i className="fas fa-map-marker-alt w-4 h-4 mr-2"></i>
                  {data.profile.location_city}, {data.profile.location_state}
                </span>
              </div>
            </div>

            {/* Progreso */}
            <div className="text-center md:text-right">
              <div className="text-4xl md:text-5xl font-bold text-blue-600 mb-1">
                {data.progress.percentage}%
              </div>
              <div className="text-sm text-gray-500 font-medium">Progreso Total</div>
            </div>
          </div>

          {/* Barra de progreso global */}
          <div className="mt-6">
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 via-blue-600 to-purple-600 h-3 transition-all duration-500 ease-out"
                style={{ width: `${data.progress.percentage}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>Inicio del Proceso</span>
              <span className="font-semibold text-blue-600">
                {data.progress.current_phase}
              </span>
              <span>Completado</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========== CONTENIDO PRINCIPAL ========== */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* ========== COLUMNA IZQUIERDA ========== */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Información del Proceso */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <i className="fas fa-info-circle text-blue-600 mr-2"></i>
                Información del Proceso
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Departamento</label>
                  <p className="text-gray-900 mt-1">{data.profile.department}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Posiciones a Cubrir</label>
                  <p className="text-gray-900 mt-1 text-2xl font-bold text-blue-600">
                    {data.profile.number_of_positions}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500">Fecha de Inicio</label>
                  <p className="text-gray-900 flex items-center mt-1">
                    <i className="fas fa-calendar-alt w-4 h-4 mr-2 text-gray-400"></i>
                    {formatDate(data.profile.created_at)}
                  </p>
                </div>

                {data.profile.deadline && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Fecha Límite</label>
                    <p className="text-gray-900 flex items-center mt-1">
                      <i className="fas fa-clock w-4 h-4 mr-2 text-gray-400"></i>
                      {formatDate(data.profile.deadline)}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-sm font-medium text-gray-500 mb-2 block">Estado Actual</label>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                    data.profile.status === 'completed'
                      ? 'bg-green-100 text-green-800'
                      : data.profile.status === 'cancelled'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    <i className={`fas ${
                      data.profile.status === 'completed' ? 'fa-check-circle' :
                      data.profile.status === 'cancelled' ? 'fa-times-circle' :
                      'fa-sync-alt'
                    } mr-2`}></i>
                    {data.profile.status_display}
                  </span>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 mb-2 block">Prioridad</label>
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold ${
                    data.profile.priority === 'urgent'
                      ? 'bg-red-100 text-red-800'
                      : data.profile.priority === 'high'
                      ? 'bg-orange-100 text-orange-800'
                      : data.profile.priority === 'normal'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {data.profile.priority_display}
                  </span>
                </div>
              </div>
            </div>

            {/* KPIs de Candidatos */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <i className="fas fa-users text-blue-600 mr-2"></i>
                Estadísticas de Candidatos
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <div className="text-3xl font-bold text-blue-600 mb-1">
                    {data.candidates_stats.total_applied}
                  </div>
                  <div className="text-sm text-gray-600">Aplicados</div>
                </div>

                <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <div className="text-3xl font-bold text-purple-600 mb-1">
                    {data.candidates_stats.shortlisted}
                  </div>
                  <div className="text-sm text-gray-600">Pre-seleccionados</div>
                </div>

                <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                  <div className="text-3xl font-bold text-yellow-600 mb-1">
                    {data.candidates_stats.interviewed}
                  </div>
                  <div className="text-sm text-gray-600">Entrevistados</div>
                </div>

                <div className="text-center p-4 bg-green-50 rounded-lg border border-green-100">
                  <div className="text-3xl font-bold text-green-600 mb-1">
                    {data.candidates_stats.offered}
                  </div>
                  <div className="text-sm text-gray-600">Con Oferta</div>
                </div>
              </div>

              {/* Candidatos Aceptados (destacado) */}
              {data.candidates_stats.accepted > 0 && (
                <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-center">
                    <i className="fas fa-trophy text-2xl text-green-600 mr-3"></i>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600">
                        {data.candidates_stats.accepted}
                      </div>
                      <div className="text-sm text-green-700 font-medium">
                        {data.candidates_stats.accepted === 1 ? 'Candidato Aceptado' : 'Candidatos Aceptados'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ========== COLUMNA DERECHA ========== */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Timeline del Proceso */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                <i className="fas fa-chart-line text-blue-600 mr-2"></i>
                Línea de Tiempo del Proceso
              </h2>

              <div className="space-y-6">
                {data.timeline.map((event, index) => (
                  <div key={index} className="relative">
                    {/* Línea conectora */}
                    {index < data.timeline.length - 1 && (
                      <div className="absolute left-5 top-12 w-0.5 h-full bg-blue-200" />
                    )}

                    {/* Evento */}
                    <div className="flex items-start gap-4">
                      {/* Icono */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getColorClass(event.color)}`}>
                        <i className={`${getIconClass(event.icon)} w-5 h-5`}></i>
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 pb-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">{event.title}</h3>
                          <span className="text-sm text-gray-500 whitespace-nowrap">
                            {formatDate(event.timestamp)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed">{event.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Candidatos en Proceso */}
            {data.top_candidates.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <i className="fas fa-user-friends text-purple-600 mr-2"></i>
                  Candidatos en Proceso
                  <span className="ml-auto text-sm font-normal text-gray-500">
                    Top {data.top_candidates.length}
                  </span>
                </h2>

                <div className="space-y-3">
                  {data.top_candidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 mb-1">
                          {candidate.candidate_name}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            candidate.status === 'shortlisted'
                              ? 'bg-purple-100 text-purple-800'
                              : candidate.status === 'interviewed' || candidate.status === 'interview_scheduled'
                              ? 'bg-blue-100 text-blue-800'
                              : candidate.status === 'offered'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {candidate.status_display}
                          </span>
                          <span className="text-xs text-gray-500">
                            Aplicó el {formatDate(candidate.applied_at)}
                          </span>
                        </div>
                      </div>

                      {candidate.match_percentage > 0 && (
                        <div className="text-right ml-4">
                          <div className="text-2xl font-bold text-blue-600">
                            {candidate.match_percentage}%
                          </div>
                          <div className="text-xs text-gray-500">Match</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Candidatos Seleccionados */}
            {data.selected_candidates.length > 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-sm border border-green-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <i className="fas fa-trophy text-green-600 mr-2"></i>
                  Candidatos Seleccionados
                  <span className="ml-auto px-3 py-1 bg-green-600 text-white text-sm font-semibold rounded-full">
                    {data.selected_candidates.length}
                  </span>
                </h2>

                <div className="space-y-3">
                  {data.selected_candidates.map((candidate) => (
                    <div
                      key={candidate.id}
                      className="flex items-center justify-between p-4 bg-white rounded-lg border border-green-200 shadow-sm"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900 mb-1">
                          {candidate.candidate_name}
                        </div>
                        <div className="space-y-1">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                            candidate.status === 'accepted'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            <i className={`fas ${
                              candidate.status === 'accepted' ? 'fa-check-circle' : 'fa-clock'
                            } mr-1`}></i>
                            {candidate.status_display}
                          </span>
                          {candidate.offer_date && (
                            <div className="text-xs text-gray-600 mt-1">
                              <i className="fas fa-calendar-check mr-1"></i>
                              Oferta: {formatDate(candidate.offer_date)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="text-right ml-4">
                        <div className="flex items-center text-sm text-gray-600 mb-1">
                          <i className="fas fa-file-alt w-4 h-4 mr-2"></i>
                          <span className="font-semibold">{candidate.documents_count}</span>
                        </div>
                        <div className="text-xs text-gray-500">Documentos</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ========== FOOTER ========== */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center space-y-2">
          <p className="text-sm text-gray-600">
            <i className="fas fa-sync-alt mr-2"></i>
            Última actualización: {lastUpdate.toLocaleTimeString('es-ES')}
          </p>
          <p className="text-xs text-gray-500">
            Esta página se actualiza automáticamente cada 30 segundos
          </p>
        </div>
      </div>
    </div>
  );
}
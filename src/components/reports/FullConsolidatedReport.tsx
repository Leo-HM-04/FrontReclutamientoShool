'use client';

/**
 * ════════════════════════════════════════════════════════════════════
 * FULL CONSOLIDATED REPORT - VERSIÓN COMPLETA
 * ════════════════════════════════════════════════════════════════════
 * Reporte final que consolida TODA la información detallada:
 * - Resumen ejecutivo con KPIs
 * - Todos los perfiles con información completa
 * - Todos los candidatos con sus detalles
 * - Todos los clientes con historial
 * ════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useRef } from 'react';
import { useModal } from '@/context/ModalContext';
import {
  generatePDF,
  generateKPIRow,
  generateSectionTitle,
  generateInfoGrid,
  generateTable,
  generateBadge,
  wrapInPage,
  getStatusLabel,
  getStatusBadgeType,
} from '@/lib/pdf-generator';

import {
  getProfileReport,
  getProfileCandidates,
  type ProfileReportData,
  type ProfileCandidatesData,
} from '@/lib/api-reports';

import { downloadExtendedConsolidatedReportPDF } from '@/lib/pdf-consolidated-report-extended';

// ═══════════════════════════════════════════════════════════════════
// INTERFACES DETALLADAS
// ═══════════════════════════════════════════════════════════════════

interface ProfileDetail {
  id: number;
  position_title: string;
  client_name: string;
  client_id: number;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  candidates_count: number;
  shortlisted_count: number;
  interviewed_count: number;
  positions_available: number;
  salary_min: number;
  salary_max: number;
  salary_period: string;
  location_city: string;
  location_state: string;
  work_modality: string;
  years_experience: number;
  education_level: string;
  service_type: string;
  description: string;
  requirements: string;
  supervisor_name?: string;
  supervisor_email?: string;
  days_open: number;
  // Candidatos por estado
  candidates_by_status: {
    applied: number;
    screening: number;
    shortlisted: number;
    interviewing: number;
    offered: number;
    hired: number;
    rejected: number;
  };
  // Datos del cliente
  client_industry?: string;
  client_contact_name?: string;
  client_contact_email?: string;
  client_contact_phone?: string;
}

interface CandidateDetail {
  id: number;
  full_name: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: string;
  profile_id: number;
  profile_title: string;
  client_name: string;
  source: string;
  created_at: string;
  updated_at: string;
  matching_score: number;
  notes_count: number;
  documents_count: number;
  current_position: string;
  current_company: string;
  years_experience: number;
  expected_salary: number;
  linkedin_url: string;
  city: string;
  state: string;
  education_level: string;
  skills: string[];
  languages: string[];
}

interface ClientDetail {
  id: number;
  company_name: string;
  industry: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  created_at: string;
  active_profiles: number;
  total_profiles: number;
  total_candidates_hired: number;
  total_candidates: number;
  website: string;
  address: string;
  notes: string;
  profiles_completed: number;
  success_rate: number;
  avg_days_to_fill: number;
  profiles_by_status: Record<string, number>;
  profiles_list: {
    id: number;
    position_title: string;
    status: string;
    priority: string;
    candidates_count: number;
    created_at: string;
  }[];
}

interface ConsolidatedData {
  summary: {
    total_profiles: number;
    total_candidates: number;
    total_clients: number;
    profiles_by_status: Record<string, number>;
    candidates_by_status: Record<string, number>;
    profiles_completed: number;
    candidates_hired: number;
    avg_time_to_fill: number;
  };
  profiles: ProfileDetail[];
  clients: ClientDetail[];
  candidates: CandidateDetail[];
}

interface Props {
  onBack?: () => void;
}

export default function FullConsolidatedReport({ onBack }: Props) {
  const { showAlert } = useModal();
  const [data, setData] = useState<ConsolidatedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'profiles' | 'clients' | 'candidates' | 'profile-candidates'>('summary');
  const [expandedProfiles, setExpandedProfiles] = useState<Set<number>>(new Set());
  const [expandedClients, setExpandedClients] = useState<Set<number>>(new Set());
  const [expandedCandidates, setExpandedCandidates] = useState<Set<number>>(new Set());
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Filtros
  const [selectedProfileFilter, setSelectedProfileFilter] = useState<number | null>(null);
  const [selectedClientFilter, setSelectedClientFilter] = useState<number | null>(null);

  // Datos filtrados
  const getFilteredData = () => {
    if (!data) return { profiles: [], clients: [], candidates: [] };
    
    let filteredProfiles = data.profiles;
    let filteredClients = data.clients;
    let filteredCandidates = data.candidates;

    // Filtrar por cliente
    if (selectedClientFilter) {
      filteredProfiles = data.profiles.filter(p => p.client_id === selectedClientFilter);
      filteredClients = data.clients.filter(c => c.id === selectedClientFilter);
      const profileIds = new Set(filteredProfiles.map(p => Number(p.id)));
      filteredCandidates = data.candidates.filter(c => profileIds.has(Number(c.profile_id)));

    }

    // Filtrar por perfil
    if (selectedProfileFilter) {
      filteredProfiles = data.profiles.filter(p => p.id === selectedProfileFilter);
      filteredCandidates = data.candidates.filter(c => c.profile_id === selectedProfileFilter);
      // Obtener cliente del perfil seleccionado
      const selectedProfile = data.profiles.find(p => p.id === selectedProfileFilter);
      if (selectedProfile) {
        filteredClients = data.clients.filter(c => c.id === selectedProfile.client_id);
      }
    }

    return { profiles: filteredProfiles, clients: filteredClients, candidates: filteredCandidates };
  };

  const clearFilters = () => {
    setSelectedProfileFilter(null);
    setSelectedClientFilter(null);
  };

  useEffect(() => {
    loadConsolidatedData();
  }, []);

  const toggleProfile = (id: number) => {
    setExpandedProfiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleClient = (id: number) => {
    setExpandedClients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleCandidate = (id: number) => {
    setExpandedCandidates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const expandAll = (type: 'profiles' | 'clients' | 'candidates') => {
    if (!data) return;
    if (type === 'profiles') {
      setExpandedProfiles(new Set(data.profiles.map(p => p.id)));
    } else if (type === 'clients') {
      setExpandedClients(new Set(data.clients.map(c => c.id)));
    } else {
      setExpandedCandidates(new Set(data.candidates.map(c => c.id)));
    }
  };

  const collapseAll = (type: 'profiles' | 'clients' | 'candidates') => {
    if (type === 'profiles') setExpandedProfiles(new Set());
    else if (type === 'clients') setExpandedClients(new Set());
    else setExpandedCandidates(new Set());
  };


  const toInt = (v: any): number => {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
};

  const resolveCandidateProfileId = (c: any): number => {
    const a = toInt(c?.profile_id);
    if (a) return a;

    const b = toInt(c?.profile);
    if (b) return b;

    const cId = toInt(c?.profile?.id);
    if (cId) return cId;

    return 0;
  };



  const resolveMatchScore = (c: any): number => {
    const v = c?.match_percentage ?? c?.matching_score ?? c?.match_score ?? 0;
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const resolveStatusCode = (c: any): string => {
    return (c?.status ?? c?.stage ?? c?.current_status ?? 'new') as string;
  };

  const parseLocation = (loc?: string) => {
  const s = (loc || '').trim();
  if (!s) return { city: 'N/A', state: 'N/A' };
  const parts = s.split(',').map(x => x.trim()).filter(Boolean);
  if (parts.length >= 2) return { city: parts[0], state: parts.slice(1).join(', ') };
  return { city: s, state: 'N/A' };
};

const normalizeCandidateStatus = (raw?: string) => {
  const s = (raw || '').toLowerCase();

  // Normalizamos a tus llaves que sí están en getStatusColor/getStatusLabel
  if (s === 'accepted') return 'hired';
  if (s === 'interview_scheduled') return 'interviewing';

  // Deja pasar lo demás tal cual (applied, screening, shortlisted, offered, rejected, withdrawn, etc.)
  return s || 'new';
};

// mini helper para no reventar si hay muchos perfiles (limita concurrencia)
const mapWithConcurrency = async <T, R>(items: T[], limit: number, fn: (item: T, idx: number) => Promise<R>) => {
  const results: R[] = new Array(items.length);
  let i = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      results[idx] = await fn(items[idx], idx);
    }
  });

  await Promise.all(workers);
  return results;
};



  const loadConsolidatedData = async () => {
  try {
    setLoading(true);

    const token = localStorage.getItem('authToken');
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

    // 1) Listas base (perfiles + clientes) para filtros UI
    const [profilesRes, clientsRes] = await Promise.all([
      fetch(`${API_URL}/profiles/profiles/`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${API_URL}/clients/`, { headers: { Authorization: `Bearer ${token}` } }),
    ]);

    const profilesJson = profilesRes.ok ? await profilesRes.json() : [];
    const clientsJson = clientsRes.ok ? await clientsRes.json() : [];

    const profilesList = Array.isArray(profilesJson) ? profilesJson : (profilesJson.results || []);
    const clientsList = Array.isArray(clientsJson) ? clientsJson : (clientsJson.results || []);

    // 2) Por cada perfil: jalar reporte + candidatos del perfil desde /director/reports/...
    const bundles = await mapWithConcurrency(profilesList, 6, async (p: any) => {
      let profileReport: ProfileReportData | null = null;
      let profileCandidates: ProfileCandidatesData | null = null;

      try { profileReport = await getProfileReport(Number(p.id)); } catch (e) { /* ok, fallback */ }
      try { profileCandidates = await getProfileCandidates(Number(p.id)); } catch (e) { /* ok, fallback */ }

      const rp = profileReport?.profile;   // <-- puede ser undefined, ok
      const rpClient = profileReport?.client ?? null;

      const supervisor = profileReport?.supervisor || null;

      const client =
        rpClient ||
        clientsList.find((c: any) => Number(c.id) === Number(p.client_id || p.client)) ||
        null;

      const candidatesRaw = profileCandidates?.candidates || [];

      const mappedCandidates: CandidateDetail[] = candidatesRaw.map((c: any) => {
        const { city, state } = parseLocation(c.location);

        // IMPORTANTE: id único -> usa application_id (evita duplicados en React)
        const uniqueId = Number(c.application_id || c.candidate_id || `${p.id}${Math.random().toString().slice(2, 8)}`);

        return {
          id: uniqueId,
          full_name: c.full_name || 'Sin nombre',
          first_name: '',
          last_name: '',
          email: c.email || 'N/A',
          phone: c.phone || 'N/A',
          status: normalizeCandidateStatus(c.status),
          profile_id: Number(p.id),
          profile_title: (rp?.position_title || p.position_title || 'Sin perfil') as string,
          client_name: client?.company_name || 'N/A',
          source: 'Directo',
          created_at: c.applied_at || new Date().toISOString(),
          updated_at: c.applied_at || new Date().toISOString(),
          matching_score: Number(c.match_percentage || 0) || 0,
          notes_count: 0,
          documents_count: Number(c.documents_count || 0) || 0,
          current_position: c.current_position || 'N/A',
          current_company: c.current_company || 'N/A',
          years_experience: Number(c.years_of_experience || 0) || 0,
          expected_salary: 0,
          linkedin_url: '',
          city,
          state,
          education_level: c.education_level || 'N/A',
          skills: [],
          languages: [],
        };
      });

      // Conteos por estado (desde lo que realmente regresa el endpoint del perfil)
      const byStatus = {
        applied: mappedCandidates.filter(x => ['new', 'applied'].includes(x.status)).length,
        screening: mappedCandidates.filter(x => ['screening', 'in_review'].includes(x.status)).length,
        shortlisted: mappedCandidates.filter(x => ['shortlisted', 'qualified'].includes(x.status)).length,
        interviewing: mappedCandidates.filter(x => ['interviewing', 'interview', 'interviewed'].includes(x.status)).length,
        offered: mappedCandidates.filter(x => ['offered', 'offer'].includes(x.status)).length,
        hired: mappedCandidates.filter(x => x.status === 'hired').length,
        rejected: mappedCandidates.filter(x => x.status === 'rejected').length,
      };

      const daysOpen =
      profileReport?.progress?.days_open ??
      (() => {
        const created = new Date(rp?.created_at || p.created_at || Date.now());
        return Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));
      })();

    const profileDetail: ProfileDetail = {
      id: Number(p.id),
      position_title: rp?.position_title || p.position_title || 'Sin título',
      client_name: client?.company_name || p.client_name || 'N/A',
      client_id: Number(client?.id || p.client_id || p.client || 0),

      status: rp?.status || p.status || 'draft',
      priority: (rp?.priority as any) || p.priority || 'medium',

      created_at: rp?.created_at || p.created_at,
      updated_at: rp?.updated_at || p.updated_at || rp?.created_at || p.created_at,

      candidates_count: mappedCandidates.length,
      shortlisted_count: byStatus.shortlisted,
      interviewed_count: byStatus.interviewing,

      positions_available: Number(p.positions_available || 1),

      salary_min: Number(rp?.salary?.min ?? p.salary_min ?? 0),
      salary_max: Number(rp?.salary?.max ?? p.salary_max ?? 0),
      salary_period: rp?.salary?.period || p.salary_period || 'mensual',

      location_city: rp?.location?.city || p.location_city || p.city || 'N/A',
      location_state: rp?.location?.state || p.location_state || p.state || 'N/A',
      work_modality: rp?.location?.work_mode || p.work_modality || 'presencial',

      years_experience: Number(p.years_experience || 0),
      education_level: rp?.education_level || p.education_level || 'N/A',
      service_type: rp?.service_type || p.service_type || 'Normal',

      description: rp?.description || p.description || '',
      requirements: rp?.requirements || p.requirements || '',

      supervisor_name: supervisor?.name,
      supervisor_email: supervisor?.email,

      days_open: daysOpen,
      candidates_by_status: byStatus,

      client_industry: client?.industry || 'N/A',
      client_contact_name: client?.contact_name || 'N/A',
      client_contact_email: client?.contact_email || 'N/A',
      client_contact_phone: client?.contact_phone || 'N/A',
    };


      return { profileDetail, mappedCandidates };
    });

    const profilesDetailed = bundles.map(b => b.profileDetail);
    const allCandidates = bundles.flatMap(b => b.mappedCandidates);

    // 3) Stats globales (ahora sí reales)
    const profilesByStatus: Record<string, number> = {};
    profilesDetailed.forEach(p => { profilesByStatus[p.status] = (profilesByStatus[p.status] || 0) + 1; });

    const candidatesByStatus: Record<string, number> = {};
    allCandidates.forEach(c => { candidatesByStatus[c.status] = (candidatesByStatus[c.status] || 0) + 1; });

    const profilesCompleted = profilesDetailed.filter(p => p.status === 'completed').length;
    const candidatesHired = allCandidates.filter(c => c.status === 'hired').length;

    // 4) Clients detallados (usando profilesDetailed + allCandidates)
    const clientsDetailed: ClientDetail[] = clientsList.map((c: any) => {
      const clientProfiles = profilesDetailed.filter(p => Number(p.client_id) === Number(c.id));
      const clientCandidates = allCandidates.filter(cd => clientProfiles.some(p => p.id === cd.profile_id));

      const pb: Record<string, number> = {};
      clientProfiles.forEach(p => { pb[p.status] = (pb[p.status] || 0) + 1; });

      const completed = clientProfiles.filter(p => p.status === 'completed').length;
      const total = clientProfiles.length;
      const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        id: Number(c.id),
        company_name: c.company_name || 'Sin nombre',
        industry: c.industry || 'N/A',
        contact_name: c.contact_name || c.primary_contact_name || 'N/A',
        contact_email: c.contact_email || c.primary_contact_email || 'N/A',
        contact_phone: c.contact_phone || c.primary_contact_phone || 'N/A',
        created_at: c.created_at,
        active_profiles: clientProfiles.filter(p => ['active', 'approved', 'in_progress'].includes(p.status)).length,
        total_profiles: total,
        total_candidates_hired: clientCandidates.filter(x => x.status === 'hired').length,
        total_candidates: clientCandidates.length,
        website: c.website || '',
        address: c.address || '',
        notes: c.notes || '',
        profiles_completed: completed,
        success_rate: successRate,
        avg_days_to_fill: 0,
        profiles_by_status: pb,
        profiles_list: clientProfiles.map(p => ({
          id: p.id,
          position_title: p.position_title,
          status: p.status,
          priority: p.priority,
          candidates_count: allCandidates.filter(x => x.profile_id === p.id).length,
          created_at: p.created_at,
        })),
      };
    });

    // DEBUG rápido (lo puedes dejar 1 corrida)
    console.log('✅ Consolidado (reports):', {
      profiles: profilesDetailed.length,
      candidates: allCandidates.length,
      clients: clientsDetailed.length,
      sampleCandidate: allCandidates[0],
    });

    const consolidatedData: ConsolidatedData = {
      summary: {
        total_profiles: profilesDetailed.length,
        total_candidates: allCandidates.length,
        total_clients: clientsDetailed.length,
        profiles_by_status: profilesByStatus,
        candidates_by_status: candidatesByStatus,
        profiles_completed: profilesCompleted,
        candidates_hired: candidatesHired,
        avg_time_to_fill: 0,
      },
      profiles: profilesDetailed,
      clients: clientsDetailed,
      candidates: allCandidates,
    };

    setData(consolidatedData);
  } catch (error) {
    console.error('Error loading consolidated data (reports):', error);
    await showAlert('Error al cargar los datos consolidados');
  } finally {
    setLoading(false);
  }
};


  const handleExportPDF = async () => {
    if (!data) return;
    
    setExporting(true);
    try {
      // Obtener datos filtrados
      const filteredData = getFilteredData();
      
      // Calcular tasa de éxito
      const successRate = data.summary.total_profiles > 0 
        ? Math.round((data.summary.profiles_completed / data.summary.total_profiles) * 100) 
        : 0;
      
      // Determinar tipo de filtro aplicado
      let filterInfo: { type: 'all' | 'client' | 'profile'; clientId?: number; clientName?: string; profileId?: number; profileTitle?: string } = { type: 'all' };
      
      if (selectedClientFilter) {
        const client = data.clients.find(c => c.id === selectedClientFilter);
        filterInfo = {
          type: 'client',
          clientId: selectedClientFilter,
          clientName: client?.company_name || 'N/A',
        };
      } else if (selectedProfileFilter) {
        const profile = data.profiles.find(p => p.id === selectedProfileFilter);
        filterInfo = {
          type: 'profile',
          profileId: selectedProfileFilter,
          profileTitle: profile?.position_title || 'N/A',
        };
      }

      // Construir datos para el generador de PDF
      const reportData = {
        filter: filterInfo,
        summary: {
          total_profiles: filteredData.profiles.length,
          total_candidates: filteredData.candidates.length,
          total_clients: filteredData.clients.length,
          profiles_completed: filteredData.profiles.filter(p => p.status === 'completed').length,
          candidates_hired: filteredData.candidates.filter(c => c.status === 'hired').length,
          avg_time_to_fill: data.summary.avg_time_to_fill || 0,
          success_rate: successRate,
          profiles_by_status: filteredData.profiles.reduce((acc, p) => {
            acc[p.status] = (acc[p.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          candidates_by_status: filteredData.candidates.reduce((acc, c) => {
            acc[c.status] = (acc[c.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
        },
        profiles: filteredData.profiles.map(p => {
          // Construir reporte de candidatos del perfil
          const profileCandidates = filteredData.candidates.filter(c => Number(c.profile_id) === Number(p.id));
          const matchScores = profileCandidates.map(c => c.matching_score || 0);
          const matchAvg = matchScores.length > 0 ? Math.round(matchScores.reduce((a, b) => a + b, 0) / matchScores.length) : 0;
          const topMatch = matchScores.length > 0 ? Math.max(...matchScores) : 0;
          const offers = profileCandidates.filter(c => c.status === 'offered' || c.status === 'hired').length;
          
          // Distribucion de match
          const highMatch = profileCandidates.filter(c => (c.matching_score || 0) >= 70);
          const medMatch = profileCandidates.filter(c => (c.matching_score || 0) >= 40 && (c.matching_score || 0) < 70);
          const lowMatch = profileCandidates.filter(c => (c.matching_score || 0) < 40);

          // 1) Lista en el formato que pide ProfileCandidateData (INGLÉS / llaves exactas)
            const candidates_list = profileCandidates.map(c => {
            const score = c.matching_score || 0;

            const bucket =
              score >= 70 ? ('ALTO' as const) :
              score >= 40 ? ('MEDIO' as const) :
                            ('BAJO' as const);

            return {
              id: c.id,
              name: c.full_name,
              email: c.email,
              stage: getStatusLabel(c.status),

              // ✅ requeridos por ProfileCandidateData
              match: score,
              bucket,

              // los que ya traías
              match_percentage: score,   // opcional: déjalo si otras partes lo usan
              applied_date: c.created_at,
              interview_date: null,
              offer_date: null,
            };
          });


            // 2) (Opcional) Tu formato actual para no romper otras secciones del PDF
            const candidatos = profileCandidates.map(c => ({
              nombre: c.full_name,
              email: c.email,
              estado: getStatusLabel(c.status),
              match_porcentaje: c.matching_score || 0,
              applied_at: c.created_at,
              interview_date: null,
              offer_date: null,
            }));

            const candidates_report = {
              total_candidates: profileCandidates.length,
              match_avg: matchAvg,
              top_match: topMatch,
              offers: offers,
              match_distribution: [
                { bucket: 'ALTO' as const, range: '>=70%', count: highMatch.length, values: highMatch.map(c => c.matching_score || 0) },
                { bucket: 'MEDIO' as const, range: '40-69%', count: medMatch.length, values: medMatch.map(c => c.matching_score || 0) },
                { bucket: 'BAJO' as const, range: '<40%', count: lowMatch.length, values: lowMatch.map(c => c.matching_score || 0) },
              ],

              // ✅ ESTA es la propiedad que te está exigiendo el tipo
              candidates_list,

              // (opcional) conservas tu propiedad previa si el PDF la usa en otras partes
              candidatos,

              gantt_range_start: p.created_at,
              gantt_range_end: new Date().toISOString(),
            };



          // Construir timeline del proceso
          const hoursOpen = p.days_open * 24;
          const industryAvgHours = 360;
          const efficiencyVsIndustry = industryAvgHours > 0 ? Math.round((industryAvgHours / Math.max(hoursOpen, 1)) * 100) : 0;

          // Ordenar candidatos por match score para mostrar los mejores primero
          const sortedCandidates = [...profileCandidates].sort((a, b) => (b.matching_score || 0) - (a.matching_score || 0));

          // Construir eventos de timeline desde los candidatos
          const allEvents: { timestamp: Date; type: string; text: string }[] = [];
          
          // Evento de creacion del perfil
          allEvents.push({
            timestamp: new Date(p.created_at),
            type: 'Perfil Creado',
            text: `Se creo el perfil para ${p.position_title}`,
          });
          
          // Eventos de aplicacion de candidatos
          profileCandidates.forEach(c => {
            allEvents.push({
              timestamp: new Date(c.created_at),
              type: 'Candidato Aplico',
              text: `${c.full_name} aplico a la posicion`,
            });
          });

          // Ordenar eventos por fecha descendente
          allEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

          // Agrupar eventos por dia
          const eventsByDay: { [key: string]: { time: string; type: string; text: string }[] } = {};
          allEvents.forEach(event => {
            const dayKey = event.timestamp.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
            const timeStr = event.timestamp.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
            if (!eventsByDay[dayKey]) {
              eventsByDay[dayKey] = [];
            }
            eventsByDay[dayKey].push({
              time: timeStr,
              type: event.type,
              text: event.text,
            });
          });

          // Convertir a formato esperado
          const events_detail = Object.entries(eventsByDay).map(([day, items]) => ({
            day_group: day,
            items: items,
          }));

          const process_timeline = {
            time_open_days: p.days_open,
            time_open_hours: hoursOpen,
            events_count: profileCandidates.length + 1, // +1 por creacion del perfil
            pool_match_avg: matchAvg,
            efficiency_vs_industry: efficiencyVsIndustry,
            industry_avg_hours: industryAvgHours,
            process_phases: [
              { phase: 'Creacion del Perfil', duration: '1 dia', start: p.created_at, end: p.created_at },
              { phase: 'Recepcion de Candidatos', duration: `${p.days_open} dias`, start: p.created_at, end: new Date().toISOString() },
            ],
            // Mostrar los 6 mejores candidatos ordenados por match
            candidates_cards: sortedCandidates.slice(0, 6).map((c, idx) => ({
              initials: c.full_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase(),
              rank: idx + 1,
              name: c.full_name,
              match: `${c.matching_score || 0}%`,
              date: new Date(c.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }),
              stage: c.status,
            })),
            events_detail: events_detail,
            puesto: p.position_title,
            cliente: p.client_name,
            fecha_reporte: new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }),
            dias_abierto: p.days_open,
            total_candidatos: profileCandidates.length,
            match_promedio: matchAvg,
            total_eventos: allEvents.length,
            candidatos: profileCandidates.map(c => ({
              nombre: c.full_name,
              email: c.email,
              fecha_aplico: new Date(c.created_at).toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }),
              match_porcentaje: c.matching_score || 0,
              estado: getStatusLabel(c.status),
            })),
            eventos: allEvents.map(e => ({
              fecha_hora: e.timestamp.toLocaleString('es-MX', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
              tipo: e.type,
              descripcion: e.text,
            })),
          };

          return {
            id: p.id,
            position_title: p.position_title,
            client_name: p.client_name,
            client_id: p.client_id,
            status: p.status,
            priority: p.priority,
            service_type: p.service_type,
            created_at: p.created_at,
            candidates_count: p.candidates_count,
            shortlisted_count: p.shortlisted_count,
            interviewed_count: p.interviewed_count,
            salary_min: p.salary_min,
            salary_max: p.salary_max,
            salary_period: p.salary_period,
            location_city: p.location_city,
            location_state: p.location_state,
            work_modality: p.work_modality,
            years_experience: p.years_experience,
            education_level: p.education_level,
            days_open: p.days_open,
            description: p.description,
            requirements: p.requirements,
            client_industry: p.client_industry,
            client_contact_name: p.client_contact_name,
            client_contact_email: p.client_contact_email,
            supervisor_name: p.supervisor_name,
            technical_skills: [], // Se puede agregar desde el API si existe
            soft_skills: [], // Se puede agregar desde el API si existe
            candidates_by_status: p.candidates_by_status,
            // NUEVOS DATOS PARA EL REPORTE EXTENDIDO
            candidates_report: candidates_report,
            process_timeline: process_timeline,
          };
        }),
        clients: filteredData.clients.map(c => ({
          id: c.id,
          company_name: c.company_name,
          industry: c.industry,
          contact_name: c.contact_name,
          contact_email: c.contact_email,
          contact_phone: c.contact_phone,
          website: c.website || '',
          address: c.address || '',
          city: '', // Extraer de address si es necesario
          state: '', // Extraer de address si es necesario
          notes: c.notes || '',
          active_profiles: c.active_profiles,
          total_profiles: c.total_profiles,
          total_candidates_hired: c.total_candidates_hired,
          total_candidates: c.total_candidates,
          profiles_completed: c.profiles_completed,
          success_rate: c.success_rate,
          avg_days_to_complete: c.avg_days_to_fill || null,
          profiles_by_status: c.profiles_by_status,
          profiles_list: filteredData.profiles
            .filter(p => p.client_id === c.id)
            .map(p => ({
              id: p.id,
              position_title: p.position_title,
              status: p.status,
              priority: p.priority,
              candidates_count: p.candidates_count,
              created_at: p.created_at,
              end_date: undefined,
            })),
        })),
        candidates: [],
      };

      // Generar nombre de archivo
      let filename = 'Reporte_General_Consolidado';
      if (filterInfo.type === 'client') {
        filename = `Reporte_Cliente_${filterInfo.clientName?.replace(/\s+/g, '_')}`;
      } else if (filterInfo.type === 'profile') {
        filename = `Reporte_Perfil_${filterInfo.profileTitle?.substring(0, 30).replace(/\s+/g, '_')}`;
      }
      filename += `_${new Date().toISOString().split('T')[0]}.pdf`;

      // Generar PDF con el nuevo generador extendido (incluye reportes completos de perfil y cliente)
      downloadExtendedConsolidatedReportPDF(reportData, filename);
      
      await showAlert('✅ Reporte PDF generado exitosamente');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      await showAlert('❌ Error al exportar el reporte');
    } finally {
      setExporting(false);
    }
  };

  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-700',
      pending: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-blue-100 text-blue-700',
      in_progress: 'bg-purple-100 text-purple-700',
      candidates_found: 'bg-indigo-100 text-indigo-700',
      in_evaluation: 'bg-cyan-100 text-cyan-700',
      in_interview: 'bg-pink-100 text-pink-700',
      finalists: 'bg-orange-100 text-orange-700',
      completed: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
      new: 'bg-blue-100 text-blue-700',
      screening: 'bg-yellow-100 text-yellow-700',
      qualified: 'bg-green-100 text-green-700',
      shortlisted: 'bg-purple-100 text-purple-700',
      interview: 'bg-purple-100 text-purple-700',
      interviewing: 'bg-purple-100 text-purple-700',
      offer: 'bg-orange-100 text-orange-700',
      offered: 'bg-orange-100 text-orange-700',
      hired: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      withdrawn: 'bg-gray-100 text-gray-700',
      on_hold: 'bg-yellow-100 text-yellow-700',
      active: 'bg-green-100 text-green-700',
      inactive: 'bg-gray-100 text-gray-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getPriorityColor = (priority: string): string => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-700',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700',
    };
    return colors[priority] || 'bg-gray-100 text-gray-700';
  };

  const getPriorityLabel = (priority: string): string => {
    const labels: Record<string, string> = {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta',
      urgent: 'Urgente',
    };
    return labels[priority] || priority || 'Media';
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number): string => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatNumber = (value: number | string, decimals: number = 0): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando reporte consolidado...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20">
        <i className="fas fa-exclamation-triangle text-red-500 text-4xl mb-4"></i>
        <p className="text-gray-600">No se pudieron cargar los datos</p>
        <button
          onClick={loadConsolidatedData}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
            >
              <i className="fas fa-arrow-left"></i>
            </button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Reporte Final Consolidado</h1>
            <p className="text-gray-600">
              Generado el {new Date().toLocaleDateString('es-MX', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleExportPDF}
            disabled={exporting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {exporting ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Exportando...
              </>
            ) : (
              <>
                <i className="fas fa-file-pdf mr-2"></i>
                Exportar PDF
              </>
            )}
          </button>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
          >
            <i className="fas fa-print mr-2"></i>
            Imprimir
          </button>
        </div>
      </div>

      {/* Filtros Globales */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center">
            <i className="fas fa-filter text-gray-400 mr-2"></i>
            <span className="text-sm font-medium text-gray-700">Filtrar por:</span>
          </div>
          
          {/* Filtro por Cliente */}
          <div className="flex-1 min-w-[200px]">
            <select
              value={selectedClientFilter || ''}
              onChange={(e) => {
                setSelectedClientFilter(e.target.value ? parseInt(e.target.value) : null);
                setSelectedProfileFilter(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los Clientes</option>
              {data.clients.map(client => (
                <option key={client.id} value={client.id}>{client.company_name}</option>
              ))}
            </select>
          </div>

          {/* Filtro por Perfil */}
          <div className="flex-1 min-w-[200px]">
            <select
              value={selectedProfileFilter || ''}
              onChange={(e) => {
                setSelectedProfileFilter(e.target.value ? parseInt(e.target.value) : null);
                setSelectedClientFilter(null);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Todos los Perfiles</option>
              {data.profiles.map(profile => (
                <option key={profile.id} value={profile.id}>{profile.position_title} - {profile.client_name}</option>
              ))}
            </select>
          </div>

          {/* Botón limpiar filtros */}
          {(selectedClientFilter || selectedProfileFilter) && (
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 text-sm flex items-center"
            >
              <i className="fas fa-times mr-2"></i>
              Limpiar Filtros
            </button>
          )}
        </div>

        {/* Indicador de filtro activo */}
        {(selectedClientFilter || selectedProfileFilter) && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="flex items-center text-sm">
              <i className="fas fa-info-circle text-blue-500 mr-2"></i>
              <span className="text-gray-600">
                Mostrando: 
                {selectedClientFilter && (
                  <span className="ml-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-medium">
                    {data.clients.find(c => c.id === selectedClientFilter)?.company_name}
                  </span>
                )}
                {selectedProfileFilter && (
                  <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                    {data.profiles.find(p => p.id === selectedProfileFilter)?.position_title}
                  </span>
                )}
                <span className="ml-2 text-gray-500">
                  ({formatNumber(getFilteredData().profiles.length)} perfiles, {formatNumber(getFilteredData().candidates.length)} candidatos)
                </span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6 border-b border-gray-200 overflow-x-auto">
        {[
          { id: 'summary', label: 'Resumen Ejecutivo', icon: 'fa-chart-pie', count: null },
          { id: 'profiles', label: 'Perfiles', icon: 'fa-briefcase', count: getFilteredData().profiles.length },
          { id: 'clients', label: 'Clientes', icon: 'fa-building', count: getFilteredData().clients.length },
          { id: 'candidates', label: 'Candidatos', icon: 'fa-users', count: getFilteredData().candidates.length },
          { id: 'profile-candidates', label: 'Candidatos del Perfil', icon: 'fa-user-tie', count: null },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors whitespace-nowrap flex items-center space-x-2 ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <i className={`fas ${tab.icon}`}></i>
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span className={`px-2 py-0.5 text-xs rounded-full ${
                activeTab === tab.id 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {formatNumber(tab.count)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div ref={reportRef}>
        {/* ===================== TAB: RESUMEN EJECUTIVO ===================== */}
        {activeTab === 'summary' && (
          <div className="space-y-6">
            {/* KPIs principales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Total Perfiles</p>
                    <p className="text-3xl font-bold text-blue-700">{formatNumber(data.summary.total_profiles)}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-briefcase text-blue-600 text-xl"></i>
                  </div>
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  {formatNumber(data.summary.profiles_completed)} completados
                </p>
              </div>

              <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-purple-600 font-medium">Total Candidatos</p>
                    <p className="text-3xl font-bold text-purple-700">{formatNumber(data.summary.total_candidates)}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-users text-purple-600 text-xl"></i>
                  </div>
                </div>
                <p className="text-xs text-purple-600 mt-2">
                  {formatNumber(data.summary.candidates_hired)} contratados
                </p>
              </div>

              <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-600 font-medium">Total Clientes</p>
                    <p className="text-3xl font-bold text-green-700">{formatNumber(data.summary.total_clients)}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-building text-green-600 text-xl"></i>
                  </div>
                </div>
                <p className="text-xs text-green-600 mt-2">
                  Empresas activas
                </p>
              </div>

              <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-orange-600 font-medium">Tasa de Éxito</p>
                    <p className="text-3xl font-bold text-orange-700">
                      {data.summary.total_profiles > 0
                        ? Math.round((data.summary.profiles_completed / data.summary.total_profiles) * 100)
                        : 0}%
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-chart-line text-orange-600 text-xl"></i>
                  </div>
                </div>
                <p className="text-xs text-orange-600 mt-2">
                  Perfiles completados
                </p>
              </div>
            </div>

            {/* Distribución por Estatus */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Perfiles por Estatus */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  <i className="fas fa-briefcase text-blue-600 mr-2"></i>
                  Perfiles por Estatus
                </h3>
                <div className="space-y-3">
                  {Object.entries(data.summary.profiles_by_status).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                          {getStatusLabel(status)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-blue-500 rounded-full"
                            style={{ width: `${(count / data.summary.total_profiles) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold text-gray-700 w-8 text-right">{formatNumber(count)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Candidatos por Estatus */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  <i className="fas fa-users text-purple-600 mr-2"></i>
                  Candidatos por Estatus
                </h3>
                <div className="space-y-3">
                  {Object.entries(data.summary.candidates_by_status).map(([status, count]) => (
                    <div key={status} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>
                          {getStatusLabel(status)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${(count / data.summary.total_candidates) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold text-gray-700 w-8 text-right">{formatNumber(count)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top 5 Perfiles Recientes */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                <i className="fas fa-star text-yellow-500 mr-2"></i>
                Últimos Perfiles Creados
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Posición</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Cliente</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Estatus</th>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Creado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.profiles.slice(0, 5).map((profile) => (
                      <tr key={profile.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900">{profile.position_title}</td>
                        <td className="py-3 px-4 text-gray-600">{profile.client_name}</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(profile.status)}`}>
                            {getStatusLabel(profile.status)}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600">{formatDate(profile.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB: PERFILES (DETALLADO) ===================== */}
        {activeTab === 'profiles' && (
          <div className="space-y-4">
            {/* Header con acciones */}
            <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900">
                <i className="fas fa-briefcase text-blue-600 mr-2"></i>
                Todos los Perfiles ({formatNumber(data.profiles.length)})
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => expandAll('profiles')}
                  className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                >
                  <i className="fas fa-expand-alt mr-1"></i> Expandir Todo
                </button>
                <button
                  onClick={() => collapseAll('profiles')}
                  className="px-3 py-1.5 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <i className="fas fa-compress-alt mr-1"></i> Colapsar Todo
                </button>
              </div>
            </div>

            {/* Lista de Perfiles */}
            {getFilteredData().profiles.map((profile) => (
              <div key={profile.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Header del Perfil (siempre visible) */}
                <div 
                  onClick={() => toggleProfile(profile.id)}
                  className="bg-linear-to-r from-blue-600 to-blue-800 p-6 cursor-pointer hover:from-blue-700 hover:to-blue-900 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="text-white">
                      <div className="flex items-center space-x-3 mb-2">
                        <i className="fas fa-briefcase text-xl"></i>
                        <h3 className="text-xl font-bold">{profile.position_title}</h3>
                      </div>
                      <p className="text-blue-100">{profile.client_name}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(profile.status)}`}>
                          {getStatusLabel(profile.status)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(profile.priority)}`}>
                          <i className="fas fa-bolt mr-1"></i>{getPriorityLabel(profile.priority)}
                        </span>
                        <span className="px-2 py-1 bg-white/20 text-white rounded-full text-xs">
                          <i className="fas fa-calendar mr-1"></i>{formatNumber(profile.days_open)} días abierto
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {/* Mini KPIs */}
                      <div className="flex space-x-4 text-white">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{formatNumber(profile.candidates_count)}</div>
                          <div className="text-xs text-blue-200">Candidatos</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{formatNumber(profile.shortlisted_count)}</div>
                          <div className="text-xs text-blue-200">Preselec.</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{formatNumber(profile.interviewed_count)}</div>
                          <div className="text-xs text-blue-200">Entrev.</div>
                        </div>
                      </div>
                      <i className={`fas fa-chevron-${expandedProfiles.has(profile.id) ? 'up' : 'down'} text-white text-xl`}></i>
                    </div>
                  </div>
                </div>

                {/* Contenido Expandido */}
                {expandedProfiles.has(profile.id) && (
                  <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Información del Perfil */}
                      <div className="bg-gray-50 rounded-xl p-5">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                          <i className="fas fa-info-circle text-blue-600 mr-2"></i>
                          Información del Perfil
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Ubicación</p>
                            <p className="font-medium text-gray-900">{profile.location_city}, {profile.location_state}</p>
                            <p className="text-sm text-gray-600">{profile.work_modality}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Salario</p>
                            <p className="font-medium text-gray-900">
                              {profile.salary_min > 0 ? `${formatCurrency(profile.salary_min)} - ${formatCurrency(profile.salary_max)}` : 'N/A'}
                            </p>
                            <p className="text-sm text-gray-600">{profile.salary_period}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Experiencia Requerida</p>
                            <p className="font-medium text-gray-900">{formatNumber(profile.years_experience)} años</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Nivel Educativo</p>
                            <p className="font-medium text-gray-900">{profile.education_level}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Tipo de Servicio</p>
                            <p className="font-medium text-gray-900">{profile.service_type}</p>
                          </div>
                        </div>
                      </div>

                      {/* Cliente */}
                      <div className="bg-gray-50 rounded-xl p-5">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                          <i className="fas fa-building text-green-600 mr-2"></i>
                          Cliente
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Empresa</p>
                            <p className="font-medium text-gray-900">{profile.client_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Industria</p>
                            <p className="font-medium text-gray-900">{profile.client_industry || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Contacto</p>
                            <p className="font-medium text-gray-900">{profile.client_contact_name || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Email</p>
                            <p className="font-medium text-blue-600">{profile.client_contact_email || 'N/A'}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Teléfono</p>
                            <p className="font-medium text-gray-900">{profile.client_contact_phone || 'N/A'}</p>
                          </div>
                          {profile.supervisor_name && (
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Supervisor Asignado</p>
                              <p className="font-medium text-gray-900">{profile.supervisor_name}</p>
                              {profile.supervisor_email && (
                                <p className="text-sm text-blue-600">{profile.supervisor_email}</p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Candidatos por Estatus */}
                    <div className="mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                      <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                        <i className="fas fa-users text-blue-600 mr-2"></i>
                        Candidatos por Estatus
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                        <div className="bg-white rounded-lg p-3 text-center border border-gray-200 shadow-sm">
                          <div className="text-2xl font-bold text-blue-600">{formatNumber(profile.candidates_by_status?.applied || 0)}</div>
                          <div className="text-xs text-gray-600 font-medium">Aplicados</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center border border-gray-200 shadow-sm">
                          <div className="text-2xl font-bold text-yellow-600">{formatNumber(profile.candidates_by_status?.screening || 0)}</div>
                          <div className="text-xs text-gray-600 font-medium">En Revisión</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center border border-gray-200 shadow-sm">
                          <div className="text-2xl font-bold text-cyan-600">{formatNumber(profile.candidates_by_status?.shortlisted || 0)}</div>
                          <div className="text-xs text-gray-600 font-medium">Preseleccionados</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center border border-gray-200 shadow-sm">
                          <div className="text-2xl font-bold text-purple-600">{formatNumber(profile.candidates_by_status?.interviewing || 0)}</div>
                          <div className="text-xs text-gray-600 font-medium">Entrevistados</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center border border-gray-200 shadow-sm">
                          <div className="text-2xl font-bold text-orange-600">{formatNumber(profile.candidates_by_status?.offered || 0)}</div>
                          <div className="text-xs text-gray-600 font-medium">Con Oferta</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center border border-gray-200 shadow-sm">
                          <div className="text-2xl font-bold text-green-600">{formatNumber(profile.candidates_by_status?.hired || 0)}</div>
                          <div className="text-xs text-gray-600 font-medium">Aceptados</div>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center border border-gray-200 shadow-sm">
                          <div className="text-2xl font-bold text-red-600">{formatNumber(profile.candidates_by_status?.rejected || 0)}</div>
                          <div className="text-xs text-gray-600 font-medium">Rechazados</div>
                        </div>
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-3 text-center shadow-sm">
                          <div className="text-2xl font-bold text-white">{formatNumber(profile.candidates_count)}</div>
                          <div className="text-xs text-blue-100 font-medium">Total</div>
                        </div>
                      </div>
                    </div>

                    {/* Descripción */}
                    <div className="mt-4 bg-blue-50 rounded-xl p-5 border border-blue-100">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                        <i className="fas fa-file-alt text-blue-600 mr-2"></i>
                        Descripción del Puesto
                      </h4>
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {profile.description || 'No especificado'}
                      </p>
                    </div>

                    {/* Requisitos */}
                    <div className="mt-4 bg-amber-50 rounded-xl p-5 border border-amber-100">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                        <i className="fas fa-clipboard-list text-amber-600 mr-2"></i>
                        Requisitos
                      </h4>
                      <p className="text-gray-700 whitespace-pre-wrap">
                        {profile.requirements || 'No especificado'}
                      </p>
                    </div>

                    {/* Info adicional */}
                    <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-600">
                      <div className="flex items-center">
                        <i className="fas fa-calendar-plus text-gray-400 mr-2"></i>
                        <span>Creado: {formatDate(profile.created_at)}</span>
                      </div>
                      <div className="flex items-center">
                        <i className="fas fa-calendar-check text-gray-400 mr-2"></i>
                        <span>Actualizado: {formatDate(profile.updated_at)}</span>
                      </div>
                      <div className="flex items-center">
                        <i className="fas fa-briefcase text-gray-400 mr-2"></i>
                        <span>Vacantes: {formatNumber(profile.positions_available)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ===================== TAB: CLIENTES (DETALLADO) ===================== */}
        {activeTab === 'clients' && (
          <div className="space-y-4">
            {/* Header con acciones */}
            <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900">
                <i className="fas fa-building text-green-600 mr-2"></i>
                Todos los Clientes ({formatNumber(data.clients.length)})
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => expandAll('clients')}
                  className="px-3 py-1.5 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100"
                >
                  <i className="fas fa-expand-alt mr-1"></i> Expandir Todo
                </button>
                <button
                  onClick={() => collapseAll('clients')}
                  className="px-3 py-1.5 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <i className="fas fa-compress-alt mr-1"></i> Colapsar Todo
                </button>
              </div>
            </div>

            {/* Lista de Clientes */}
            {getFilteredData().clients.map((client) => (
              <div key={client.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Header del Cliente */}
                <div 
                  onClick={() => toggleClient(client.id)}
                  className="bg-linear-to-r from-green-600 to-emerald-700 p-6 cursor-pointer hover:from-green-700 hover:to-emerald-800 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="text-white">
                      <div className="flex items-center space-x-3 mb-2">
                        <i className="fas fa-building text-xl"></i>
                        <h3 className="text-xl font-bold">{client.company_name}</h3>
                      </div>
                      <p className="text-green-100">{client.industry}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      {/* Mini KPIs */}
                      <div className="flex space-x-4 text-white">
                        <div className="text-center">
                          <div className="text-2xl font-bold">{formatNumber(client.active_profiles)}</div>
                          <div className="text-xs text-green-200">Activos</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{formatNumber(client.total_profiles)}</div>
                          <div className="text-xs text-green-200">Total Perf.</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{formatNumber(client.total_candidates_hired)}</div>
                          <div className="text-xs text-green-200">Contratados</div>
                        </div>
                      </div>
                      <i className={`fas fa-chevron-${expandedClients.has(client.id) ? 'up' : 'down'} text-white text-xl`}></i>
                    </div>
                  </div>
                </div>

                {/* Contenido Expandido */}
                {expandedClients.has(client.id) && (
                  <div className="p-6">
                    {/* KPIs del Cliente */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                      <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
                        <div className="text-2xl font-bold text-blue-600">{formatNumber(client.total_profiles)}</div>
                        <div className="text-xs text-gray-600 font-medium">Total Perfiles</div>
                      </div>
                      <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                        <div className="text-2xl font-bold text-green-600">{formatNumber(client.profiles_completed)}</div>
                        <div className="text-xs text-gray-600 font-medium">Completados</div>
                      </div>
                      <div className="bg-emerald-50 rounded-xl p-4 text-center border border-emerald-100">
                        <div className="text-2xl font-bold text-emerald-600">{formatNumber(client.active_profiles)}</div>
                        <div className="text-xs text-gray-600 font-medium">Activos</div>
                      </div>
                      <div className="bg-amber-50 rounded-xl p-4 text-center border border-amber-100">
                        <div className="text-2xl font-bold text-amber-600">{client.success_rate}%</div>
                        <div className="text-xs text-gray-600 font-medium">Tasa Éxito</div>
                      </div>
                      <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-100">
                        <div className="text-2xl font-bold text-purple-600">{client.avg_days_to_fill || 'N/A'}</div>
                        <div className="text-xs text-gray-600 font-medium">Días Prom.</div>
                      </div>
                      <div className="bg-indigo-50 rounded-xl p-4 text-center border border-indigo-100">
                        <div className="text-2xl font-bold text-indigo-600">{formatNumber(client.total_candidates)}</div>
                        <div className="text-xs text-gray-600 font-medium">Candidatos</div>
                      </div>
                    </div>

                    {/* Distribución de Perfiles por Estatus */}
                    {Object.keys(client.profiles_by_status).length > 0 && (
                      <div className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                          <i className="fas fa-chart-pie text-green-600 mr-2"></i>
                          Distribución de Perfiles por Estatus
                        </h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                          {Object.entries(client.profiles_by_status).map(([status, count]) => (
                            <div key={status} className="bg-white rounded-lg p-3 text-center border border-gray-200 shadow-sm">
                              <div className="text-2xl font-bold text-gray-800">{formatNumber(count)}</div>
                              <div className="text-xs text-gray-600 font-medium capitalize">{getStatusLabel(status)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Información de la Empresa */}
                      <div className="bg-gray-50 rounded-xl p-5">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                          <i className="fas fa-info-circle text-green-600 mr-2"></i>
                          Información de la Empresa
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Empresa</p>
                            <p className="font-medium text-gray-900">{client.company_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Industria</p>
                            <p className="font-medium text-gray-900">{client.industry}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Sitio Web</p>
                            {client.website ? (
                              <a href={client.website} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                                {client.website}
                              </a>
                            ) : (
                              <p className="font-medium text-gray-400">No especificado</p>
                            )}
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Dirección</p>
                            <p className="font-medium text-gray-900">{client.address || 'No especificada'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Contacto */}
                      <div className="bg-gray-50 rounded-xl p-5">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                          <i className="fas fa-address-book text-blue-600 mr-2"></i>
                          Contacto Principal
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Nombre</p>
                            <p className="font-medium text-gray-900">{client.contact_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Email</p>
                            <p className="font-medium text-blue-600">{client.contact_email}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Teléfono</p>
                            <p className="font-medium text-gray-900">{client.contact_phone}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Cliente desde</p>
                            <p className="font-medium text-gray-900">{formatDate(client.created_at)}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Notas */}
                    <div className="mt-4 bg-yellow-50 rounded-xl p-5 border border-yellow-100">
                      <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                        <i className="fas fa-sticky-note text-yellow-600 mr-2"></i>
                        Notas
                      </h4>
                      <p className="text-gray-700 whitespace-pre-wrap">{client.notes || 'Sin notas'}</p>
                    </div>

                    {/* Lista de Perfiles del Cliente */}
                    {client.profiles_list && client.profiles_list.length > 0 && (
                      <div className="mt-6 bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="bg-gray-100 px-5 py-3 border-b border-gray-200">
                          <h4 className="font-semibold text-gray-900 flex items-center">
                            <i className="fas fa-briefcase text-blue-600 mr-2"></i>
                            Perfiles ({formatNumber(client.profiles_list.length)})
                          </h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posición</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estatus</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prioridad</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Candidatos</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Creado</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {client.profiles_list.map((profile) => (
                                <tr key={profile.id} className="hover:bg-gray-50">
                                  <td className="px-4 py-3">
                                    <span className="font-medium text-gray-900">{profile.position_title}</span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(profile.status)}`}>
                                      {getStatusLabel(profile.status)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(profile.priority)}`}>
                                      {getPriorityLabel(profile.priority)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="inline-flex items-center text-gray-600">
                                      <i className="fas fa-users mr-1 text-gray-400"></i>
                                      {formatNumber(profile.candidates_count)}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-600">
                                    {formatDate(profile.created_at)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Métricas del Fondo */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-4 text-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-green-100">Tasa de Éxito</p>
                            <p className="text-2xl font-bold">{client.success_rate}%</p>
                            <p className="text-xs text-green-200">{formatNumber(client.profiles_completed)} de {formatNumber(client.total_profiles)} perfiles completados</p>
                          </div>
                          <i className="fas fa-check-circle text-4xl text-white/30"></i>
                        </div>
                      </div>
                      <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-blue-100">Tiempo Promedio</p>
                            <p className="text-2xl font-bold">{client.avg_days_to_fill || 'N/A'}</p>
                            <p className="text-xs text-blue-200">Días promedio de cierre</p>
                          </div>
                          <i className="fas fa-clock text-4xl text-white/30"></i>
                        </div>
                      </div>
                      <div className="bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl p-4 text-white">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-purple-100">Candidatos Totales</p>
                            <p className="text-2xl font-bold">{formatNumber(client.total_candidates)}</p>
                            <p className="text-xs text-purple-200">Gestionados en todos los perfiles</p>
                          </div>
                          <i className="fas fa-users text-4xl text-white/30"></i>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ===================== TAB: CANDIDATOS (DETALLADO) ===================== */}
        {activeTab === 'candidates' && (
          <div className="space-y-4">
            {/* KPIs de Candidatos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Candidatos</p>
                    <p className="text-3xl font-bold text-purple-600">{formatNumber(data.candidates.length)}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-users text-purple-600 text-xl"></i>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Match Promedio</p>
                    <p className="text-3xl font-bold text-blue-600">
                      {data.candidates.length > 0 
                        ? Math.round(data.candidates.reduce((acc, c) => acc + (c.matching_score || 0), 0) / data.candidates.length)
                        : 0}%
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-chart-line text-blue-600 text-xl"></i>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Contratados</p>
                    <p className="text-3xl font-bold text-green-600">
                      {formatNumber(data.candidates.filter(c => c.status === 'hired').length)}
                    </p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-user-check text-green-600 text-xl"></i>
                  </div>
                </div>
              </div>
            </div>

            {/* Leyenda de Estados */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Leyenda de Estados:</p>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Aplicó</span>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">En Revisión</span>
                <span className="px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-xs font-medium">Preseleccionado</span>
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">Entrevistado</span>
                <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">Con Oferta</span>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Aceptado</span>
                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Rechazado</span>
              </div>
            </div>

            {/* Header con acciones */}
            <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="text-lg font-semibold text-gray-900">
                <i className="fas fa-users text-purple-600 mr-2"></i>
                Todos los Candidatos ({formatNumber(data.candidates.length)})
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => expandAll('candidates')}
                  className="px-3 py-1.5 text-sm bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100"
                >
                  <i className="fas fa-expand-alt mr-1"></i> Expandir Todo
                </button>
                <button
                  onClick={() => collapseAll('candidates')}
                  className="px-3 py-1.5 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <i className="fas fa-compress-alt mr-1"></i> Colapsar Todo
                </button>
              </div>
            </div>

            {/* Lista de Candidatos */}
            {getFilteredData().candidates.map((candidate) => (
              <div key={candidate.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Header del Candidato */}
                <div 
                  onClick={() => toggleCandidate(candidate.id)}
                  className="bg-linear-to-r from-purple-600 to-indigo-700 p-6 cursor-pointer hover:from-purple-700 hover:to-indigo-800 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="text-white">
                      <div className="flex items-center space-x-3 mb-2">
                        <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center text-xl font-bold">
                          {candidate.full_name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">{candidate.full_name}</h3>
                          <p className="text-purple-200">{candidate.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(candidate.status)}`}>
                          {getStatusLabel(candidate.status)}
                        </span>
                        <span className="px-2 py-1 bg-white/20 text-white rounded-full text-xs">
                          <i className="fas fa-briefcase mr-1"></i>{candidate.profile_title}
                        </span>
                        {candidate.matching_score > 0 && (
                          <span className="px-2 py-1 bg-green-500 text-white rounded-full text-xs">
                            <i className="fas fa-star mr-1"></i>{candidate.matching_score}% Match
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <i className={`fas fa-chevron-${expandedCandidates.has(candidate.id) ? 'up' : 'down'} text-white text-xl`}></i>
                    </div>
                  </div>
                </div>

                {/* Contenido Expandido */}
                {expandedCandidates.has(candidate.id) && (
                  <div className="p-6">
                    {/* Barra de Match Score */}
                    <div className="mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-5 border border-purple-100">
                      <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                        <i className="fas fa-chart-bar text-purple-600 mr-2"></i>
                        Puntuación de Match
                      </h4>
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${
                                candidate.matching_score >= 70 ? 'bg-green-500' :
                                candidate.matching_score >= 50 ? 'bg-yellow-500' :
                                candidate.matching_score >= 30 ? 'bg-orange-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${candidate.matching_score}%` }}
                            ></div>
                          </div>
                        </div>
                        <div className={`text-2xl font-bold ${
                          candidate.matching_score >= 70 ? 'text-green-600' :
                          candidate.matching_score >= 50 ? 'text-yellow-600' :
                          candidate.matching_score >= 30 ? 'text-orange-600' : 'text-red-600'
                        }`}>
                          {candidate.matching_score}%
                        </div>
                      </div>
                      <div className="mt-2 text-sm text-gray-600">
                        Posición: <span className="font-medium">{candidate.profile_title}</span>
                        {candidate.client_name !== 'N/A' && (
                          <> | Cliente: <span className="font-medium">{candidate.client_name}</span></>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Información Personal */}
                      <div className="bg-gray-50 rounded-xl p-5">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                          <i className="fas fa-user text-purple-600 mr-2"></i>
                          Información Personal
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Nombre Completo</p>
                            <p className="font-medium text-gray-900">{candidate.full_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Email</p>
                            <p className="font-medium text-blue-600">{candidate.email}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Teléfono</p>
                            <p className="font-medium text-gray-900">{candidate.phone}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Ubicación</p>
                            <p className="font-medium text-gray-900">{candidate.city}, {candidate.state}</p>
                          </div>
                          {candidate.linkedin_url && (
                            <div>
                              <p className="text-xs text-gray-500 uppercase">LinkedIn</p>
                              <a href={candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                                <i className="fab fa-linkedin mr-1"></i>Ver Perfil
                              </a>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Experiencia */}
                      <div className="bg-gray-50 rounded-xl p-5">
                        <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
                          <i className="fas fa-briefcase text-blue-600 mr-2"></i>
                          Experiencia
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Puesto Actual</p>
                            <p className="font-medium text-gray-900">{candidate.current_position}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Empresa Actual</p>
                            <p className="font-medium text-gray-900">{candidate.current_company}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Años de Experiencia</p>
                            <p className="font-medium text-gray-900">{formatNumber(candidate.years_experience)} años</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-500 uppercase">Nivel Educativo</p>
                            <p className="font-medium text-gray-900">{candidate.education_level}</p>
                          </div>
                          {candidate.expected_salary > 0 && (
                            <div>
                              <p className="text-xs text-gray-500 uppercase">Salario Esperado</p>
                              <p className="font-medium text-gray-900">{formatCurrency(candidate.expected_salary)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Habilidades e Idiomas */}
                    {(candidate.skills?.length > 0 || candidate.languages?.length > 0) && (
                      <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {candidate.skills?.length > 0 && (
                          <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                              <i className="fas fa-tools text-blue-600 mr-2"></i>
                              Habilidades
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {candidate.skills.map((skill: any, idx: number) => (
                                <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                                  {typeof skill === 'string' ? skill : skill.name || skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {candidate.languages?.length > 0 && (
                          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
                            <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                              <i className="fas fa-language text-green-600 mr-2"></i>
                              Idiomas
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {candidate.languages.map((lang: any, idx: number) => (
                                <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                                  {typeof lang === 'string' ? lang : `${lang.idioma || lang.language} (${lang.nivel || lang.level})`}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Información Adicional */}
                    <div className="mt-4 grid grid-cols-2 lg:grid-cols-5 gap-4">
                      <div className="bg-blue-50 rounded-lg p-4 text-center border border-blue-100">
                        <div className="text-2xl font-bold text-blue-600">{formatNumber(candidate.notes_count)}</div>
                        <div className="text-xs text-gray-600 font-medium">Notas</div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 text-center border border-green-100">
                        <div className="text-2xl font-bold text-green-600">{formatNumber(candidate.documents_count)}</div>
                        <div className="text-xs text-gray-600 font-medium">Documentos</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4 text-center border border-purple-100">
                        <div className="text-sm font-bold text-purple-600">{candidate.source}</div>
                        <div className="text-xs text-gray-600 font-medium">Fuente</div>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-4 text-center border border-orange-100">
                        <div className="text-sm font-bold text-orange-600">{formatDate(candidate.created_at)}</div>
                        <div className="text-xs text-gray-600 font-medium">Aplicó</div>
                      </div>
                      <div className="bg-indigo-50 rounded-lg p-4 text-center border border-indigo-100">
                        <div className="text-sm font-bold text-indigo-600">{formatNumber(candidate.years_experience)}</div>
                        <div className="text-xs text-gray-600 font-medium">Años Exp.</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ===================== TAB: CANDIDATOS DEL PERFIL ===================== */}
        {activeTab === 'profile-candidates' && (
          <div className="space-y-6">
            {/* Selector de Perfil */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <i className="fas fa-briefcase text-blue-600 mr-2"></i>
                Seleccionar Perfil para Ver Candidatos
              </h3>
              <select
                value={selectedProfileFilter || ''}
                onChange={(e) => setSelectedProfileFilter(e.target.value ? parseInt(e.target.value) : null)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">-- Seleccionar un perfil --</option>
                {data.profiles.map(profile => (
                  <option key={profile.id} value={profile.id}>
                    {profile.position_title} - {profile.client_name} ({formatNumber(profile.candidates_count)} candidatos)
                  </option>
                ))}
              </select>
            </div>

            {/* Información del Perfil Seleccionado */}
            {selectedProfileFilter && (() => {
              const profile = data.profiles.find(p => p.id === selectedProfileFilter);
              const profileCandidates = data.candidates.filter(c => Number(c.profile_id) === Number(selectedProfileFilter));

              
              if (!profile) return null;
              
              return (
                <>
                  {/* Header del Perfil */}
                  <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                          <i className="fas fa-briefcase text-2xl"></i>
                          <div>
                            <h2 className="text-2xl font-bold">{profile.position_title}</h2>
                            <p className="text-blue-200">{profile.client_name}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(profile.status)}`}>
                            {getStatusLabel(profile.status)}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(profile.priority)}`}>
                            {getPriorityLabel(profile.priority)}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold">{formatNumber(profileCandidates.length)}</div>
                        <div className="text-blue-200 text-sm">Candidatos</div>
                      </div>
                    </div>
                  </div>

                  {/* KPIs del Perfil */}
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100">
                      <div className="text-2xl font-bold text-blue-600">
                        {formatNumber(profileCandidates.filter(c => c.status === 'new' || c.status === 'applied').length)}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">Aplicados</div>
                    </div>
                    <div className="bg-yellow-50 rounded-xl p-4 text-center border border-yellow-100">
                      <div className="text-2xl font-bold text-yellow-600">
                        {formatNumber(profileCandidates.filter(c => c.status === 'screening' || c.status === 'in_review').length)}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">En Revisión</div>
                    </div>
                    <div className="bg-cyan-50 rounded-xl p-4 text-center border border-cyan-100">
                      <div className="text-2xl font-bold text-cyan-600">
                        {formatNumber(profileCandidates.filter(c => c.status === 'shortlisted' || c.status === 'qualified').length)}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">Preseleccionados</div>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-100">
                      <div className="text-2xl font-bold text-purple-600">
                        {formatNumber(profileCandidates.filter(c => c.status === 'interviewing' || c.status === 'interview').length)}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">Entrevistados</div>
                    </div>
                    <div className="bg-orange-50 rounded-xl p-4 text-center border border-orange-100">
                      <div className="text-2xl font-bold text-orange-600">
                        {formatNumber(profileCandidates.filter(c => c.status === 'offered' || c.status === 'offer').length)}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">Con Oferta</div>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
                      <div className="text-2xl font-bold text-green-600">
                        {formatNumber(profileCandidates.filter(c => c.status === 'hired').length)}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">Contratados</div>
                    </div>
                    <div className="bg-red-50 rounded-xl p-4 text-center border border-red-100">
                      <div className="text-2xl font-bold text-red-600">
                        {formatNumber(profileCandidates.filter(c => c.status === 'rejected').length)}
                      </div>
                      <div className="text-xs text-gray-600 font-medium">Rechazados</div>
                    </div>
                  </div>

                  {/* Match Promedio */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900 flex items-center">
                        <i className="fas fa-chart-line text-blue-600 mr-2"></i>
                        Match Promedio
                      </h4>
                      <span className="text-2xl font-bold text-blue-600">
                        {profileCandidates.length > 0 
                          ? Math.round(profileCandidates.reduce((acc, c) => acc + (c.matching_score || 0), 0) / profileCandidates.length)
                          : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-blue-600 h-3 rounded-full transition-all"
                        style={{ 
                          width: `${profileCandidates.length > 0 
                            ? Math.round(profileCandidates.reduce((acc, c) => acc + (c.matching_score || 0), 0) / profileCandidates.length)
                            : 0}%` 
                        }}
                      ></div>
                    </div>
                  </div>

                  {/* Tabla de Candidatos */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                      <h4 className="font-semibold text-gray-900 flex items-center">
                        <i className="fas fa-users text-purple-600 mr-2"></i>
                        Candidatos que Aplicaron ({formatNumber(profileCandidates.length)})
                      </h4>
                    </div>
                    
                    {profileCandidates.length === 0 ? (
                      <div className="p-8 text-center text-gray-500">
                        <i className="fas fa-inbox text-4xl text-gray-300 mb-3"></i>
                        <p>No hay candidatos para este perfil</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidato</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Match</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Experiencia</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aplicó</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {profileCandidates.map((candidate) => (
                              <tr key={candidate.id} className="hover:bg-gray-50">
                                <td className="px-4 py-4">
                                  <div className="flex items-center">
                                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold mr-3">
                                      {candidate.full_name.charAt(0)}
                                    </div>
                                    <div>
                                      <p className="font-medium text-gray-900">{candidate.full_name}</p>
                                      <p className="text-sm text-gray-500">{candidate.email}</p>
                                      <p className="text-xs text-gray-400">{candidate.current_position}</p>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(candidate.status)}`}>
                                    {getStatusLabel(candidate.status)}
                                  </span>
                                </td>
                                <td className="px-4 py-4 text-center">
                                  <div className="flex items-center justify-center">
                                    <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                                      <div 
                                        className={`h-2 rounded-full ${
                                          candidate.matching_score >= 70 ? 'bg-green-500' :
                                          candidate.matching_score >= 50 ? 'bg-yellow-500' :
                                          candidate.matching_score >= 30 ? 'bg-orange-500' : 'bg-red-500'
                                        }`}
                                        style={{ width: `${candidate.matching_score}%` }}
                                      ></div>
                                    </div>
                                    <span className={`text-sm font-bold ${
                                      candidate.matching_score >= 70 ? 'text-green-600' :
                                      candidate.matching_score >= 50 ? 'text-yellow-600' :
                                      candidate.matching_score >= 30 ? 'text-orange-600' : 'text-red-600'
                                    }`}>
                                      {candidate.matching_score}%
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-600">
                                  {formatNumber(candidate.years_experience)} años
                                </td>
                                <td className="px-4 py-4 text-sm text-gray-600">
                                  {formatDate(candidate.created_at)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Leyenda de Estados */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                    <p className="text-sm font-medium text-gray-700 mb-3">Leyenda de Estados:</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Aplicó</span>
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">En Revisión</span>
                      <span className="px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-xs font-medium">Preseleccionado</span>
                      <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-medium">Entrevistado</span>
                      <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">Con Oferta</span>
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Aceptado</span>
                      <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Rechazado</span>
                    </div>
                  </div>
                </>
              );
            })()}

            {/* Mensaje si no hay perfil seleccionado */}
            {!selectedProfileFilter && (
              <div className="bg-blue-50 rounded-xl p-8 text-center border border-blue-200">
                <i className="fas fa-hand-pointer text-blue-400 text-5xl mb-4"></i>
                <h3 className="text-xl font-semibold text-blue-900 mb-2">Selecciona un Perfil</h3>
                <p className="text-blue-700">
                  Selecciona un perfil del menú desplegable para ver los candidatos que han aplicado a esa posición.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pie de página del reporte */}
      <div className="mt-8 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
        <p>
          <i className="fas fa-file-alt mr-2"></i>
          Reporte Final Consolidado - Sistema de Reclutamiento
        </p>
        <p className="mt-1">
          Generado automáticamente el {new Date().toLocaleDateString('es-MX')} a las {new Date().toLocaleTimeString('es-MX')}
        </p>
      </div>
    </div>
  );
}

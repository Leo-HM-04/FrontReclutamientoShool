/**
 * ════════════════════════════════════════════════════════════════════
 * API FUNCTIONS - REPORTES INDIVIDUALES
 * ════════════════════════════════════════════════════════════════════
 * 
 * Funciones para consumir los endpoints de reportes individuales
 * 
 * Usar estas funciones O agregarlas a tu api.ts existente
 * ════════════════════════════════════════════════════════════════════
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ════════════════════════════════════════════════════════════════════
// HELPER: Get Auth Headers
// ════════════════════════════════════════════════════════════════════

function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

// ════════════════════════════════════════════════════════════════════
// 1. REPORTE DE PERFIL INDIVIDUAL
// ════════════════════════════════════════════════════════════════════

export async function getProfileReport(profileId: string | number) {
  try {
    const response = await fetch(
      `${API_URL}/director/reports/profile/${profileId}/`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching profile report:', error);
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════════
// 2. CANDIDATOS DE UN PERFIL
// ════════════════════════════════════════════════════════════════════

export async function getProfileCandidates(profileId: string | number, statusFilter?: string) {
  try {
    let url = `${API_URL}/director/reports/profile/${profileId}/candidates/`;
    
    if (statusFilter) {
      url += `?status=${statusFilter}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching profile candidates:', error);
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════════
// 3. TIMELINE DE PERFIL
// ════════════════════════════════════════════════════════════════════

export async function getProfileTimeline(profileId: string | number) {
  try {
    const response = await fetch(
      `${API_URL}/director/reports/profile/${profileId}/timeline/`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching profile timeline:', error);
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════════
// 4. REPORTE COMPLETO DE CANDIDATO
// ════════════════════════════════════════════════════════════════════

export async function getCandidateFullReport(candidateId: string | number) {
  try {
    const response = await fetch(
      `${API_URL}/director/reports/candidate/${candidateId}/`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching candidate report:', error);
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════════
// 5. REPORTE COMPLETO DE CLIENTE
// ════════════════════════════════════════════════════════════════════

export async function getClientFullReport(clientId: string | number) {
  try {
    const response = await fetch(
      `${API_URL}/director/reports/client/${clientId}/`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching client report:', error);
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════════
// HELPER: Format Date
// ════════════════════════════════════════════════════════════════════

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ════════════════════════════════════════════════════════════════════
// HELPER: Format Currency
// ════════════════════════════════════════════════════════════════════

export function formatCurrency(amount: number, currency: string = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

// ════════════════════════════════════════════════════════════════════
// HELPER: Get Status Badge Color
// ════════════════════════════════════════════════════════════════════

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Profile statuses
    'draft': 'gray',
    'pending': 'yellow',
    'approved': 'blue',
    'in_progress': 'purple',
    'candidates_found': 'indigo',
    'in_evaluation': 'orange',
    'in_interview': 'cyan',
    'finalists': 'green',
    'completed': 'green',
    'cancelled': 'red',
    
    // Candidate statuses
    'applied': 'blue',
    'screening': 'yellow',
    'shortlisted': 'purple',
    'interview_scheduled': 'indigo',
    'interviewed': 'cyan',
    'offered': 'orange',
    'accepted': 'green',
    'rejected': 'red',
    'withdrawn': 'gray',
  };
  
  return colors[status] || 'gray';
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    // Profile statuses
    'draft': 'Borrador',
    'pending': 'Pendiente de Aprobación',
    'approved': 'Aprobado',
    'in_progress': 'En Proceso',
    'candidates_found': 'Candidatos Encontrados',
    'in_evaluation': 'Aplicación de Pruebas',
    'in_interview': 'En Entrevistas',
    'finalists': 'Finalistas',
    'completed': 'Completado',
    'cancelled': 'Cancelado',
    
    // Candidate application statuses
    'applied': 'Aplicó',
    'screening': 'En Revisión',
    'shortlisted': 'Preseleccionado',
    'interview_scheduled': 'Entrevista Programada',
    'interviewed': 'Entrevistado',
    'offered': 'Oferta Extendida',
    'accepted': 'Oferta Aceptada',
    'rejected': 'Rechazado',
    'withdrawn': 'Retirado',
    
    // Additional candidate statuses
    'new': 'Nuevo',
    'qualified': 'Calificado',
    'interview': 'En Entrevista',
    'offer': 'Oferta Extendida',
    'hired': 'Contratado',
  };
  
  return labels[status] || status;
}

// ════════════════════════════════════════════════════════════════════
// TYPES (TypeScript Interfaces)
// ════════════════════════════════════════════════════════════════════

export interface ProfileReportData {
  profile: {
    id: number;
    position_title: string;
    status: string;
    status_display: string;
    priority: string;
    service_type: string;
    location: {
      city: string;
      state: string;
      work_mode: string;
    };
    salary: {
      min: number;
      max: number;
      currency: string;
      period: string;
    };
    experience_required: string;
    education_level: string;
    description: string;
    requirements: string;
    benefits: string;
    // Habilidades y competencias
    technical_skills: string[];
    soft_skills: string[];
    languages: string[];
    created_at: string;
    updated_at: string;
    completed_at: string | null;
  };
  client: {
    id: number;
    company_name: string;
    industry: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
  };
  supervisor: {
    id: number;
    name: string;
    email: string;
  } | null;
  candidates_stats: {
    total: number;
    by_status: Record<string, number>;
    applied: number;
    screening: number;
    shortlisted: number;
    interviewed: number;
    offered: number;
    accepted: number;
    rejected: number;
  };
  progress: {
    days_open: number;
    days_to_complete: number | null;
    is_completed: boolean;
    is_cancelled: boolean;
  };
  status_history: Array<{
    from_status: string;
    to_status: string;
    from_status_display: string;
    to_status_display: string;
    changed_by: string | null;
    notes: string;
    timestamp: string;
  }>;
  generated_at: string;
}

export interface ProfileCandidatesData {
  profile: {
    id: number;
    title: string;
    client: string;
  };
  summary: {
    total_candidates: number;
    by_status: Record<string, number>;
    avg_match_percentage: number;
  };
  candidates: Array<{
    application_id: number;
    candidate_id: number;
    full_name: string;
    email: string;
    phone: string;
    location: string;
    current_position: string;
    current_company: string;
    years_of_experience: number;
    education_level: string;
    status: string;
    status_display: string;
    match_percentage: number;
    overall_rating: number;
    applied_at: string;
    interview_date: string | null;
    offer_date: string | null;
    rejection_reason: string;
    documents_count: number;
    evaluations_count: number;
  }>;
  generated_at: string;
}

export interface TimelineEvent {
  type: string;
  title: string;
  description: string;
  user?: string;
  notes?: string;
  timestamp: string;
  icon: string;
  color: string;
  candidate_id?: number;
  application_id?: number;
}

export interface ProfileTimelineData {
  profile: {
    id: number;
    title: string;
    client: string;
    status: string;
    created_at: string;
    completed_at: string | null;
  };
  timeline: TimelineEvent[];
  phases: Array<{  // NUEVO
    name: string;
    status: string;
    start: string;
    end: string | null;
    duration_minutes: number;
    color: string;
    start_percent: number;
    width_percent: number;
  }>;
  candidates: Array<{  // NUEVO
    id: number;
    name: string;
    applied_at: string;
    applied_at_formatted: string;
    match: number;
    status: string;
  }>;
  metrics: {  // NUEVO
    total_duration_hours: number;
    total_duration_days: number;
    candidates_count: number;
    avg_match_score: number;
    phases_completed: number;
    efficiency_score: number;
    industry_avg_days: number;
    savings_days: number;
    savings_percent: number;
  };
  total_events: number;
  generated_at: string;
}

export interface CandidateFullReportData {
  personal_info: {
    id: number;
    full_name: string;
    email: string;
    phone: string;
    secondary_phone: string;
    location: {
      city: string;
      state: string;
    };
    current_position: string;
    current_company: string;
    years_of_experience: number;
    education_level: string;
    university: string;
    degree: string;
    skills: string[];
    certifications: string[];
    languages: string[];
    salary_expectation: {
      min: number;
      max: number;
      currency: string;
    };
    availability: string;
    linkedin_url: string;
    portfolio_url: string;
    github_url: string;
    status: string;
    created_at: string;
  };
  applications: Array<{
    id: number;
    profile: {
      id: number;
      title: string;
      client: string;
    };
    status: string;
    status_display: string;
    match_percentage: number;
    overall_rating: number;
    applied_at: string;
    interview_date: string | null;
    offer_date: string | null;
    rejection_reason: string;
  }>;
  documents: Array<{
    id: number;
    type: string;
    filename: string;
    description: string;
    uploaded_at: string;
    file_url: string | null;
  }>;
  evaluations: Array<{
    id: number;
    template: string | null;
    template_category: string | null;
    assigned_by: string | null;
    reviewed_by: string | null;
    status: string;
    status_display: string;
    final_score: number | null;
    passed: boolean | null;
    assigned_at: string | null;
    started_at: string | null;
    completed_at: string | null;
    reviewed_at: string | null;
  }>;
  notes: Array<{
    id: number;
    type: string;
    content: string;
    created_by: string | null;
    created_at: string;
  }>;
  statistics: {
    total_applications: number;
    active_applications: number;
    total_documents: number;
    total_evaluations: number;
    total_notes: number;
    avg_match_percentage: number;
  };
  generated_at: string;
}

export interface ClientFullReportData {
  client: {
    id: number;
    company_name: string;
    industry: string;
    website: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    address: string;
    city: string;
    state: string;
    postal_code: string;
    notes: string;
    created_at: string;
  };
  profiles: Array<{
    id: number;
    title: string;
    status: string;
    status_display: string;
    priority: string;
    candidates_count: number;
    created_at: string;
    completed_at: string | null;
  }>;
  statistics: {
    total_profiles: number;
    completed_profiles: number;
    active_profiles: number;
    cancelled_profiles: number;
    success_rate: number;
    avg_days_to_complete: number | null;
    total_candidates_managed: number;
  };
  profiles_by_status: Record<string, number>;
  generated_at: string;
}

// ════════════════════════════════════════════════════════════════════
// MÉTRICAS COMBINADAS PARA REPORTES
// ════════════════════════════════════════════════════════════════════

export async function getCombinedMetrics() {
  try {
    const response = await fetch(
      `${API_URL}/director/reports/combined-metrics/`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching combined metrics:', error);
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════════
// REPORTE INTERNO PARA DIRECTORES/SUPERVISORES
// ════════════════════════════════════════════════════════════════════

export async function getInternalReportData() {
  try {
    const response = await fetch(
      `${API_URL}/director/reports/internal-report/`,
      {
        method: 'GET',
        headers: getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching internal report data:', error);
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════════
// HELPERS DE CÁLCULO (NUEVOS)
// ════════════════════════════════════════════════════════════════════

export function calculateTrend(current: number, previous: number): {
  value: number;
  isPositive: boolean;
  percentage: number;
} {
  if (previous === 0) {
    return { value: current, isPositive: true, percentage: 0 };
  }
  
  const diff = current - previous;
  const percentage = (diff / previous) * 100;
  
  return {
    value: diff,
    isPositive: diff >= 0,
    percentage: Math.abs(percentage),
  };
}

export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

// ════════════════════════════════════════════════════════════════════
// ENVIAR REPORTE POR CORREO
// ════════════════════════════════════════════════════════════════════

export async function sendProfileReportEmail(profileId: string | number, pdfBlob: Blob, pdfFilename: string, message?: string) {
  try {
    const token = localStorage.getItem('authToken');
    const formData = new FormData();
    formData.append('pdf_file', pdfBlob, pdfFilename);
    if (message) formData.append('message', message);

    const response = await fetch(
      `${API_URL}/director/reports/profile/${profileId}/send-email/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `Error ${response.status}: ${response.statusText}`);
    }

    return result;
  } catch (error) {
    console.error('Error sending profile report email:', error);
    throw error;
  }
}

export async function sendCandidateReportEmail(candidateId: string | number, pdfBlob: Blob, pdfFilename: string, message?: string) {
  try {
    const token = localStorage.getItem('authToken');
    const formData = new FormData();
    formData.append('pdf_file', pdfBlob, pdfFilename);
    if (message) formData.append('message', message);

    const response = await fetch(
      `${API_URL}/director/reports/candidate/${candidateId}/send-email/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `Error ${response.status}: ${response.statusText}`);
    }

    return result;
  } catch (error) {
    console.error('Error sending candidate report email:', error);
    throw error;
  }
}

export async function sendClientReportEmail(clientId: string | number, pdfBlob: Blob, pdfFilename: string, message?: string) {
  try {
    const token = localStorage.getItem('authToken');
    const formData = new FormData();
    formData.append('pdf_file', pdfBlob, pdfFilename);
    if (message) formData.append('message', message);

    const response = await fetch(
      `${API_URL}/director/reports/client/${clientId}/send-email/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `Error ${response.status}: ${response.statusText}`);
    }

    return result;
  } catch (error) {
    console.error('Error sending client report email:', error);
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════════
// ENVIAR REPORTE CONSOLIDADO POR CORREO
// ════════════════════════════════════════════════════════════════════

export async function sendConsolidatedReportEmail(
  pdfBlob: Blob,
  pdfFilename: string,
  options: {
    clientId?: string;
    profileId?: string;
    filterType: 'all' | 'client' | 'profile' | 'client_profile';
    message?: string;
  }
) {
  try {
    const token = localStorage.getItem('authToken');
    const formData = new FormData();
    formData.append('pdf_file', pdfBlob, pdfFilename);
    formData.append('filter_type', options.filterType);
    if (options.clientId) formData.append('client_id', String(options.clientId));
    if (options.profileId) formData.append('profile_id', String(options.profileId));
    if (options.message) formData.append('message', options.message);

    const response = await fetch(
      `${API_URL}/director/reports/consolidated/send-email/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      }
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.error || `Error ${response.status}: ${response.statusText}`);
    }

    return result;
  } catch (error) {
    console.error('Error sending consolidated report email:', error);
    throw error;
  }
}

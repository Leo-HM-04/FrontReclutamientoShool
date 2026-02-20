/**
 * ════════════════════════════════════════════════════════════════════════════
 * PDF CONSOLIDATED REPORT EXTENDED - REPORTE GENERAL CONSOLIDADO COMPLETO
 * ════════════════════════════════════════════════════════════════════════════
 * Generador de PDF tipo dashboard EXTENDIDO que incluye:
 * - Resumen Ejecutivo con KPIs
 * - REPORTE COMPLETO DE PERFIL para cada perfil
 * - REPORTE COMPLETO DE CLIENTE para cada cliente
 * - Listado de candidatos
 * 
 * SIN EMOJIS - Solo texto plano para evitar caracteres raros
 * UTF-8 preservado con acentos y ñ correctos
 * ════════════════════════════════════════════════════════════════════════════
 */

import jsPDF from 'jspdf';
import { BAUSEN_LOGO_BASE64, BAUSEN_LOGO_RATIO } from './logo-base64';
import { BECHAPRA_WATERMARK_B_BASE64 } from './watermarkBase64';

// ════════════════════════════════════════════════════════════════════════════
// COLORES DEL TEMA
// ════════════════════════════════════════════════════════════════════════════
const COLORS = {
  // Primario azul corporativo
  primary: { r: 0, g: 51, b: 160 },
  primaryLight: { r: 59, g: 130, b: 246 },
  primaryDark: { r: 30, g: 64, b: 175 },
  
  // Secundario rojo (para clientes)
  secondary: { r: 220, g: 38, b: 38 },
  secondaryLight: { r: 254, g: 226, b: 226 },
  
  // Estados
  success: { r: 16, g: 185, b: 129 },
  successLight: { r: 209, g: 250, b: 229 },
  warning: { r: 245, g: 158, b: 11 },
  warningLight: { r: 254, g: 243, b: 199 },
  error: { r: 239, g: 68, b: 68 },
  errorLight: { r: 254, g: 226, b: 226 },
  info: { r: 59, g: 130, b: 246 },
  infoLight: { r: 219, g: 234, b: 254 },
  purple: { r: 139, g: 92, b: 246 },
  purpleLight: { r: 237, g: 233, b: 254 },
  orange: { r: 249, g: 115, b: 22 },
  
  // Neutrales
  white: { r: 255, g: 255, b: 255 },
  black: { r: 0, g: 0, b: 0 },
  gray900: { r: 17, g: 24, b: 39 },
  gray800: { r: 31, g: 41, b: 55 },
  gray700: { r: 55, g: 65, b: 81 },
  gray600: { r: 75, g: 85, b: 99 },
  gray500: { r: 107, g: 114, b: 128 },
  gray400: { r: 156, g: 163, b: 175 },
  gray300: { r: 209, g: 213, b: 219 },
  gray200: { r: 229, g: 231, b: 235 },
  gray100: { r: 243, g: 244, b: 246 },
  gray50: { r: 249, g: 250, b: 251 },
};

// ════════════════════════════════════════════════════════════════════════════
// INTERFACES EXTENDIDAS
// ════════════════════════════════════════════════════════════════════════════

// Candidato individual para el reporte de perfil
export interface ProfileCandidateData {
  id: number;
  name: string;
  email: string;
  applied_date: string;
  stage: string;
  match: number;
  bucket: 'ALTO' | 'MEDIO' | 'BAJO';
  days_in_process?: number;
}

// Evento del timeline
export interface TimelineEventData {
  time: string;
  type: string;
  text: string;
}

// Grupo de eventos por dia
export interface TimelineEventGroup {
  day_group: string;
  items: TimelineEventData[];
}

// Fase del proceso Gantt
export interface ProcessPhaseData {
  phase: string;
  duration: string;
  start: string;
  end: string;
}

// Card de candidato en timeline
export interface CandidateCardData {
  initials: string;
  rank: number;
  name: string;
  match: string;
  date: string;
  stage: string;
}

// Distribucion de match
export interface MatchDistributionBucket {
  bucket: 'ALTO' | 'MEDIO' | 'BAJO';
  range: string;
  count: number;
  values: number[];
}

// Reporte de candidatos del perfil
export interface ProfileCandidatesReport {
  total_candidates: number;
  match_avg: number;
  top_match: number;
  offers: number;
  match_distribution: MatchDistributionBucket[];
  candidates_list: ProfileCandidateData[];
  gantt_range_start?: string;
  gantt_range_end?: string;
}

// Reporte de timeline del proceso
export interface ProcessTimelineReport {
  time_open_days: number;
  time_open_hours: number;
  events_count: number;
  pool_match_avg: number;
  efficiency_vs_industry: number;
  industry_avg_hours?: number;
  process_phases: ProcessPhaseData[];
  candidates_cards: CandidateCardData[];
  events_detail: TimelineEventGroup[];
}

export interface ProfileDetailData {
  id: number;
  position_title: string;
  client_name: string;
  client_id: number;
  status: string;
  priority: string;
  service_type?: string;
  created_at: string;
  candidates_count: number;
  shortlisted_count: number;
  interviewed_count: number;
  salary_min: number;
  salary_max: number;
  salary_period?: string;
  location_city: string;
  location_state: string;
  work_modality: string;
  years_experience: number;
  education_level: string;
  days_open: number;
  // Datos de la empresa
  client_industry?: string;
  client_contact_name?: string;
  client_contact_email?: string;
  // Contenido del puesto
  description?: string;
  requirements?: string;
  technical_skills?: string[];
  soft_skills?: string[];
  supervisor_name?: string;
  candidates_by_status: {
    applied: number;
    screening: number;
    shortlisted: number;
    interviewing: number;
    offered: number;
    hired: number;
    rejected: number;
  };
  // NUEVO: Reporte de candidatos del perfil
  candidates_report?: ProfileCandidatesReport;
  // NUEVO: Reporte de timeline del proceso
  process_timeline?: ProcessTimelineReport;
}

export interface ClientDetailData {
  id: number;
  company_name: string;
  industry: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  notes?: string;
  active_profiles: number;
  total_profiles: number;
  total_candidates_hired: number;
  total_candidates: number;
  profiles_completed: number;
  success_rate: number;
  avg_days_to_complete?: number | null;
  profiles_by_status: Record<string, number>;
  profiles_list?: Array<{
    id: number;
    position_title: string;
    status: string;
    priority: string;
    candidates_count: number;
    created_at: string;
    end_date?: string;
  }>;
}

export interface CandidateData {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  status: string;
  profile_id: number;
  profile_title: string;
  client_name: string;
  matching_score: number;
  current_position: string;
  current_company: string;
  years_experience: number;
  city: string;
  state: string;

  // ✅ opcional (si backend la manda)
  applied_date?: string;
  created_at?: string;
}

export interface ExtendedConsolidatedReportData {
  filter?: {
    type: 'all' | 'client' | 'profile';
    clientId?: number;
    clientName?: string;
    profileId?: number;
    profileTitle?: string;
  };
  summary: {
    total_profiles: number;
    total_candidates: number;
    total_clients: number;
    profiles_completed: number;
    candidates_hired: number;
    avg_time_to_fill: number;
    success_rate: number;
    profiles_by_status: Record<string, number>;
    candidates_by_status: Record<string, number>;
  };
  profiles: ProfileDetailData[];
  clients: ClientDetailData[];
  candidates: CandidateData[];
}

// ════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ════════════════════════════════════════════════════════════════════════════

function sanitizePDFText(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s = String(value);

  // Invisibles comunes
  s = s.replace(/[\uFEFF\u200B\u200C\u200D\u2060\u00AD]/g, '');

  // Entidades HTML
  s = s
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => {
      try { return String.fromCodePoint(parseInt(hex, 16)); } catch { return ''; }
    })
    .replace(/&#(\d+);/g, (_, dec) => {
      try { return String.fromCodePoint(parseInt(dec, 10)); } catch { return ''; }
    })
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');

  // Normalizar whitespace
  s = s.replace(/[\r\n]+/g, ' ');
  s = s.replace(/\t+/g, '');
  s = s.replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ');

  // Eliminar controles
  s = s.replace(/\u0000/g, '');
  s = s.replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');

  // URL-encoded
  if (/%[0-9A-Fa-f]{2}/.test(s)) {
    try {
      const maybe = decodeURIComponent(s.replace(/\+/g, '%20'));
      if (maybe && maybe.length >= 1) s = maybe;
    } catch { /* ignore */ }
  }

  // Mojibake
  if (/Ã.|Â.|â€/g.test(s)) {
    try {
      const fixed = decodeURIComponent(escape(s));
      const score = (t: string) => (t.match(/Ã.|Â.|â€/g) || []).length;
      if (score(fixed) < score(s)) s = fixed;
    } catch { /* ignore */ }
  }

  // Proteger porcentajes reales
  const pctStore: string[] = [];
  s = s.replace(/\b\d+%/g, (m) => {
    pctStore.push(m);
    return `__PCT_${pctStore.length - 1}__`;
  });
  s = s.replace(/%+/g, '');
  s = s.replace(/__PCT_(\d+)__/g, (_, i) => pctStore[Number(i)] || '');

  // Quitar & pegados a letras
  const ampCount = (s.match(/&/g) || []).length;
  if (ampCount >= 2) {
    s = s.replace(/&([A-Za-zÁÉÍÓÚÑÜáéíóúñü])&/g, '$1');
    s = s.replace(/&(?=[A-Za-zÁÉÍÓÚÑÜáéíóúñü])/g, '');
    s = s.replace(/(?<=[A-Za-zÁÉÍÓÚÑÜáéíóúñü])&/g, '');
  }

  // Quitar basura entre letras
  try {
    s = s.replace(/(?<=\p{L})[^\p{L}\p{M}\s''\-\.]+(?=\p{L})/gu, '');
  } catch {
    s = s.replace(/(?<=[A-Za-zÁÉÍÓÚÑÜáéíóúñü])[^\w\s''\-\.]+(?=[A-Za-zÁÉÍÓÚÑÜáéíóúñü])/g, '');
  }

  // Colapsar palabras letra-por-letra
  try {
    s = s.replace(/\b(?:\p{L}\s+){2,}\p{L}\b/gu, (m) => m.replace(/\s+/g, ''));
  } catch {
    s = s.replace(
      /\b(?:[A-Za-zÁÉÍÓÚÑÜáéíóúñü]\s+){2,}[A-Za-zÁÉÍÓÚÑÜáéíóúñü]\b/g,
      (m) => m.replace(/\s+/g, '')
    );
  }

  // Normalizar comillas/guiones
  s = s
    .replace(/[""]/g, '"')
    .replace(/['']/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\uFFFD/g, '');

  // Quitar emojis
  try {
    s = s.replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu, '');
  } catch {
    s = s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '');
  }

  s = s.replace(/\s+([:;,.\-])/g, '$1').replace(/\s+/g, ' ').trim();
  return s.normalize('NFC');
}

function tint(color: { r: number; g: number; b: number }, amount = 0.86) {
  return {
    r: Math.round(color.r + (255 - color.r) * amount),
    g: Math.round(color.g + (255 - color.g) * amount),
    b: Math.round(color.b + (255 - color.b) * amount),
  };
}

function truncateText(text: string, maxLength: number): string {
  const cleaned = sanitizePDFText(text);
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength - 3) + '...';
}

function formatCurrency(min: number, max: number, period?: string): string {
  const fmt = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  });
  const periodLabel = period === 'monthly' || period === 'mensual' ? '/mensual' : '';
  if (min === max || !max) return `${fmt.format(min)} MXN${periodLabel}`;
  return `${fmt.format(min)} - ${fmt.format(max)} MXN${periodLabel}`;
}

function formatDateES(dateStr: string): string {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'N/A';
  }
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Borrador', pending: 'Pendiente', approved: 'Aprobado',
    in_progress: 'En Progreso', candidates_found: 'Candidatos',
    in_evaluation: 'Evaluacion', in_interview: 'Entrevistas',
    finalists: 'Finalistas', completed: 'Completado', cancelled: 'Cancelado',
    active: 'Activo', new: 'Nuevo', screening: 'Revision',
    qualified: 'Calificado', shortlisted: 'Preseleccion',
    interview: 'Entrevista', interviewing: 'Entrevistando',
    offer: 'Oferta', offered: 'Ofertado', hired: 'Contratado',
    rejected: 'Rechazado', withdrawn: 'Retirado', applied: 'Aplicado',
  };
  return sanitizePDFText(labels[status] || status || 'N/A');
}

function getPriorityLabel(priority: string): string {
  const p = (priority || '').toLowerCase();
  if (p === 'high' || p === 'alta' || p === 'urgent' || p === 'urgente') return 'ALTA';
  if (p === 'medium' || p === 'media') return 'MEDIA';
  return 'BAJA';
}

function getStatusColor(status: string): { r: number; g: number; b: number } {
  const s = sanitizePDFText(status).toLowerCase();
  if (s.includes('complet') || s.includes('hired') || s.includes('activ') || s.includes('aprob')) return COLORS.success;
  if (s.includes('cancel') || s.includes('reject')) return COLORS.error;
  if (s.includes('pend') || s.includes('screen') || s.includes('review')) return COLORS.warning;
  if (s.includes('interview') || s.includes('short') || s.includes('final')) return COLORS.purple;
  if (s.includes('offer')) return COLORS.orange;
  return COLORS.info;
}

function getPriorityColor(priority: string): { bg: { r: number; g: number; b: number }; text: { r: number; g: number; b: number } } {
  const p = (priority || '').toLowerCase();
  if (p === 'high' || p === 'alta' || p === 'urgent' || p === 'urgente') {
    return { bg: COLORS.errorLight, text: COLORS.error };
  }
  if (p === 'medium' || p === 'media') {
    return { bg: COLORS.warningLight, text: COLORS.warning };
  }
  return { bg: COLORS.successLight, text: COLORS.success };
}

// ════════════════════════════════════════════════════════════════════════════
// CLASE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
class ExtendedConsolidatedReportPDF {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private currentY: number;
  private contentWidth: number;
  private data: ExtendedConsolidatedReportData;

  constructor() {
    this.doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 12;
    this.currentY = this.margin;
    this.contentWidth = this.pageWidth - this.margin * 2;
    this.data = {} as ExtendedConsolidatedReportData;
  }

  private fitText(text: string, maxWidth: number): string {
    const t = sanitizePDFText(text);
    if (this.doc.getTextWidth(t) <= maxWidth) return t;
    let out = t;
    while (out.length > 0 && this.doc.getTextWidth(out + '...') > maxWidth) {
      out = out.slice(0, -1);
    }
    return out.length ? out + '...' : '...';
  }

  private addNewPageIfNeeded(requiredSpace: number): void {
    if (this.currentY + requiredSpace > this.pageHeight - 15) {
      this.doc.addPage();
      this.currentY = this.margin + 5;
    }
  }

  private normalizeData(data: ExtendedConsolidatedReportData): ExtendedConsolidatedReportData {
    const cleanDict = (dict?: Record<string, number>) => {
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(dict || {})) {
        const ck = sanitizePDFText(k) || 'Sin estado';
        out[ck] = (out[ck] || 0) + (v || 0);
      }
      return out;
    };

    return {
      filter: data.filter
        ? {
            type: data.filter.type,
            clientId: data.filter.clientId,
            clientName: sanitizePDFText(data.filter.clientName || ''),
            profileId: data.filter.profileId,
            profileTitle: sanitizePDFText(data.filter.profileTitle || ''),
          }
        : undefined,
      summary: {
        ...data.summary,
        profiles_by_status: cleanDict(data.summary?.profiles_by_status),
        candidates_by_status: cleanDict(data.summary?.candidates_by_status),
      },
      profiles: (data.profiles || []).map((p) => ({
        ...p,
        position_title: sanitizePDFText(p.position_title),
        client_name: sanitizePDFText(p.client_name),
        status: sanitizePDFText(p.status),
        priority: sanitizePDFText(p.priority),
        location_city: sanitizePDFText(p.location_city),
        location_state: sanitizePDFText(p.location_state),
        work_modality: sanitizePDFText(p.work_modality),
        education_level: sanitizePDFText(p.education_level),
        description: sanitizePDFText(p.description || ''),
        requirements: sanitizePDFText(p.requirements || ''),
        client_industry: sanitizePDFText(p.client_industry || ''),
        client_contact_name: sanitizePDFText(p.client_contact_name || ''),
        client_contact_email: sanitizePDFText(p.client_contact_email || ''),
        supervisor_name: sanitizePDFText(p.supervisor_name || ''),
        technical_skills: (p.technical_skills || []).map(s => sanitizePDFText(s)),
        soft_skills: (p.soft_skills || []).map(s => sanitizePDFText(s)),
      })),
      clients: (data.clients || []).map((c) => ({
        ...c,
        company_name: sanitizePDFText(c.company_name),
        industry: sanitizePDFText(c.industry),
        contact_name: sanitizePDFText(c.contact_name),
        contact_email: sanitizePDFText(c.contact_email),
        contact_phone: sanitizePDFText(c.contact_phone),
        website: sanitizePDFText(c.website || ''),
        address: sanitizePDFText(c.address || ''),
        city: sanitizePDFText(c.city || ''),
        state: sanitizePDFText(c.state || ''),
        notes: sanitizePDFText(c.notes || ''),
        profiles_by_status: cleanDict(c.profiles_by_status),
        profiles_list: (c.profiles_list || []).map((pl) => ({
          ...pl,
          position_title: sanitizePDFText(pl.position_title),
          status: sanitizePDFText(pl.status),
          priority: sanitizePDFText(pl.priority),
        })),
      })),
      candidates: (data.candidates || []).map((c) => ({
        ...c,
        full_name: sanitizePDFText(c.full_name),
        email: sanitizePDFText(c.email),
        phone: sanitizePDFText(c.phone),
        status: sanitizePDFText(c.status),
        profile_title: sanitizePDFText(c.profile_title),
        client_name: sanitizePDFText(c.client_name),
        current_position: sanitizePDFText(c.current_position),
        current_company: sanitizePDFText(c.current_company),
        city: sanitizePDFText(c.city),
        state: sanitizePDFText(c.state),
      })),
    };
  }


    private getCandidatesForProfile(profile: ProfileDetailData): ProfileCandidateData[] {
  // 1) Si ya viene el reporte detallado, úsalo
  const fromReport = profile.candidates_report?.candidates_list || [];
  if (fromReport.length > 0) {
    return fromReport.map((c) => ({
      ...c,
      name: sanitizePDFText(c.name),
      email: sanitizePDFText(c.email),
      applied_date: c.applied_date,
      stage: sanitizePDFText(c.stage),
      match: Number(c.match) || 0,
      bucket: c.bucket,
      days_in_process: c.days_in_process,
    }));
  }

  // 2) Fallback: filtra del listado global (BLINDADO contra string/number)
  const pid = Number(profile.id);

  const global = (this.data.candidates || []).filter((c) => {
    const cpid = Number((c as any).profile_id); // por si viene string
    return cpid === pid;
  });

  return global.map((c) => {
    const applied =
      (c as CandidateData).applied_date ||
      (c as CandidateData).created_at ||
      '';

    const match = Number(c.matching_score) || 0;
    const bucket: 'ALTO' | 'MEDIO' | 'BAJO' = match >= 70 ? 'ALTO' : match >= 40 ? 'MEDIO' : 'BAJO';

    let days_in_process: number | undefined = undefined;
    const d = applied ? new Date(applied) : null;
    if (d && !isNaN(d.getTime())) {
      const diff = Date.now() - d.getTime();
      days_in_process = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    return {
      id: Number(c.id),
      name: sanitizePDFText(c.full_name),
      email: sanitizePDFText(c.email),
      applied_date: applied,
      stage: sanitizePDFText(c.status),
      match,
      bucket,
      days_in_process,
    };
  });
}


  private computeMatchStats(list: ProfileCandidateData[]) {
    if (!list.length) return { avg: 0, top: 0, offers: 0 };

    const matches = list.map((c) => Number(c.match) || 0);
    const avg = Math.round(matches.reduce((a, b) => a + b, 0) / matches.length);
    const top = Math.max(...matches);

    const offers = list.filter((c) => {
      const s = (c.stage || '').toLowerCase();
      return s.includes('offer') || s.includes('offered') || s.includes('oferta') || s.includes('ofert');
    }).length;

    return { avg, top, offers };
  }

  private getCandidatesCountForProfile(profile: ProfileDetailData): number {
  const fromReport = Number(profile.candidates_report?.total_candidates || 0);
  const fromProfile = Number(profile.candidates_count || 0);

  const fromStatus =
    profile.candidates_by_status
      ? Object.values(profile.candidates_by_status).reduce((acc, v) => acc + Number(v || 0), 0)
      : 0;

  const fromList = this.getCandidatesForProfile(profile).length;

  return Math.max(fromReport, fromProfile, fromStatus, fromList);
}



  // ══════════════════════════════════════════════════════════════════════════
  // METODO PRINCIPAL
  // ══════════════════════════════════════════════════════════════════════════
  public generate(data: ExtendedConsolidatedReportData): jsPDF {
    this.data = this.normalizeData(data);

    // PAGINA 1: Resumen Ejecutivo
    this.drawMainHeader();
    this.drawFilterInfo();
    this.drawExecutiveSummary();
    this.drawStatusDistributions();
    this.drawTableOfContents();

    // PAGINAS DE PERFILES: Reporte completo por cada perfil
    this.data.profiles.forEach((profile, index) => {
      this.doc.addPage();
      this.currentY = this.margin;
      this.drawProfileFullReport(profile, index + 1);
    });

    // PAGINAS DE CLIENTES: Reporte completo por cada cliente
    this.data.clients.forEach((client, index) => {
      this.doc.addPage();
      this.currentY = this.margin;
      this.drawClientFullReport(client, index + 1);
    });

    // PAGINA DE CANDIDATOS (si hay)
    if (this.data.candidates.length > 0) {
      this.doc.addPage();
      this.currentY = this.margin;
      this.drawCandidatesSection();
    }

    // Aplicar footer y marca de agua a todas las paginas
    const totalPages = this.doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i);
      this.drawFooter(i, totalPages);
      this.aplicarMarcaAgua();
    }

    return this.doc;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HEADER PRINCIPAL
  // ══════════════════════════════════════════════════════════════════════════
  private drawMainHeader(): void {
    const headerHeight = 26;

    this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    this.doc.rect(0, 0, this.pageWidth, headerHeight, 'F');

    // Logo
    const logoH = 11;
    const logoW = logoH * BAUSEN_LOGO_RATIO;
    try {
      this.doc.addImage(BAUSEN_LOGO_BASE64, 'PNG', this.margin, 4, logoW, logoH);
    } catch {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(14);
      this.doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      this.doc.text('BAUSEN', this.margin, 11);
    }

    // Titulo centrado
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(15);
    this.doc.setTextColor(COLORS.gray900.r, COLORS.gray900.g, COLORS.gray900.b);
    this.doc.text('REPORTE GENERAL CONSOLIDADO', this.pageWidth / 2, 10, { align: 'center' });

    // Subtitulo
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
    this.doc.text('Informe completo de Perfiles, Clientes y Candidatos', this.pageWidth / 2, 16, { align: 'center' });

    // Fecha
    const fecha = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    this.doc.setFontSize(7);
    this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
    this.doc.text(fecha, this.pageWidth - this.margin, 22, { align: 'right' });

    // Linea decorativa
    this.doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    this.doc.rect(0, headerHeight, this.pageWidth, 1, 'F');

    this.currentY = headerHeight + 4;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // INFO DEL FILTRO
  // ══════════════════════════════════════════════════════════════════════════
  private drawFilterInfo(): void {
    const filter = this.data.filter;
    if (!filter || filter.type === 'all') {
      const bg = tint(COLORS.primaryLight, 0.92);
      this.doc.setFillColor(bg.r, bg.g, bg.b);
      this.doc.roundedRect(this.margin, this.currentY, 50, 6, 1, 1, 'F');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6);
      this.doc.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
      this.doc.text('TODOS LOS DATOS', this.margin + 2, this.currentY + 4);
      this.currentY += 10;
      return;
    }

    const cardHeight = 12;
    const bg = tint(COLORS.primaryLight, 0.92);
    this.doc.setFillColor(bg.r, bg.g, bg.b);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, cardHeight, 2, 2, 'F');
    this.doc.setDrawColor(COLORS.primaryLight.r, COLORS.primaryLight.g, COLORS.primaryLight.b);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, cardHeight, 2, 2, 'S');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7);
    this.doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);

    if (filter.type === 'client') {
      this.doc.text(`FILTRADO POR CLIENTE: ${filter.clientName || 'N/A'}`, this.margin + 4, this.currentY + 5);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6);
      this.doc.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
      this.doc.text(
        `Mostrando ${this.data.profiles.length} perfiles y ${this.data.candidates.length} candidatos`,
        this.margin + 4,
        this.currentY + 9
      );
    } else if (filter.type === 'profile') {
      this.doc.text(`FILTRADO POR PERFIL: ${truncateText(filter.profileTitle || 'N/A', 60)}`, this.margin + 4, this.currentY + 5);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6);
      this.doc.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
      this.doc.text(`Mostrando ${this.data.candidates.length} candidatos`, this.margin + 4, this.currentY + 9);
    }

    this.currentY += cardHeight + 4;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RESUMEN EJECUTIVO - KPIs
  // ══════════════════════════════════════════════════════════════════════════
  private drawExecutiveSummary(): void {
    const startY = this.currentY;
    const { summary } = this.data;

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text('RESUMEN EJECUTIVO', this.margin, startY);

    this.currentY = startY + 5;

    const successRate = summary.total_profiles > 0
      ? Math.round((summary.profiles_completed / summary.total_profiles) * 100)
      : 0;

    const kpis = [
      { label: 'Perfiles', value: summary.total_profiles.toString(), subtext: 'Total', color: COLORS.primary },
      { label: 'Candidatos', value: summary.total_candidates.toString(), subtext: 'Registrados', color: COLORS.purple },
      { label: 'Clientes', value: summary.total_clients.toString(), subtext: 'Activos', color: COLORS.success },
      { label: 'Completados', value: summary.profiles_completed.toString(), subtext: 'Perfiles', color: COLORS.info },
      { label: 'Contratados', value: summary.candidates_hired.toString(), subtext: 'Candidatos', color: COLORS.orange },
      { label: 'Tasa Exito', value: `${successRate}%`, subtext: 'Efectividad', color: COLORS.warning },
    ];

    const cardWidth = (this.contentWidth - 15) / 6;
    const cardHeight = 22;

    kpis.forEach((kpi, index) => {
      const x = this.margin + (cardWidth + 3) * index;
      const y = this.currentY;

      this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      this.doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F');
      this.doc.setDrawColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
      this.doc.setLineWidth(0.3);
      this.doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'S');

      this.doc.setFillColor(kpi.color.r, kpi.color.g, kpi.color.b);
      this.doc.roundedRect(x, y, cardWidth, 2, 2, 2, 'F');

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(13);
      this.doc.setTextColor(kpi.color.r, kpi.color.g, kpi.color.b);
      this.doc.text(kpi.value, x + cardWidth / 2, y + 11, { align: 'center' });

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5.5);
      this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
      this.doc.text(kpi.label, x + cardWidth / 2, y + 16.5, { align: 'center' });

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(5);
      this.doc.setTextColor(COLORS.gray400.r, COLORS.gray400.g, COLORS.gray400.b);
      this.doc.text(kpi.subtext, x + cardWidth / 2, y + 20, { align: 'center' });
    });

    this.currentY += cardHeight + 5;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DISTRIBUCION POR ESTADOS
  // ══════════════════════════════════════════════════════════════════════════
  private drawStatusDistributions(): void {
    const startY = this.currentY;
    const cardWidth = (this.contentWidth - 4) / 2;
    const cardHeight = 35;

    this.drawStatusCard(this.margin, startY, cardWidth, cardHeight, 'Perfiles por Estatus', this.data.summary.profiles_by_status, this.data.summary.total_profiles, COLORS.primary);
    this.drawStatusCard(this.margin + cardWidth + 4, startY, cardWidth, cardHeight, 'Candidatos por Estatus', this.data.summary.candidates_by_status, this.data.summary.total_candidates, COLORS.purple);

    this.currentY = startY + cardHeight + 5;
  }

  private drawStatusCard(
    x: number, y: number, width: number, height: number,
    title: string, data: Record<string, number>, total: number,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _accentColor: { r: number; g: number; b: number }
  ): void {
    this.doc.setFillColor(COLORS.gray50.r, COLORS.gray50.g, COLORS.gray50.b);
    this.doc.roundedRect(x, y, width, height, 2, 2, 'F');
    this.doc.setDrawColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(x, y, width, height, 2, 2, 'S');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text(title, x + 3, y + 6);

    const entries = Object.entries(data).slice(0, 5);
    let itemY = y + 11;
    const barMaxWidth = width - 35;

    entries.forEach(([status, count]) => {
      const proportion = total > 0 ? count / total : 0;
      const barWidth = barMaxWidth * proportion;
      const statusColor = getStatusColor(status);

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(5.5);
      this.doc.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
      this.doc.text(truncateText(getStatusLabel(status), 12), x + 3, itemY + 2);

      const barX = x + 28;
      const barY = itemY - 1;
      const barH = 3;

      this.doc.setFillColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
      this.doc.roundedRect(barX, barY, barMaxWidth, barH, 0.5, 0.5, 'F');

      if (barWidth > 0) {
        this.doc.setFillColor(statusColor.r, statusColor.g, statusColor.b);
        this.doc.roundedRect(barX, barY, Math.max(barWidth, 2), barH, 0.5, 0.5, 'F');
      }

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5.5);
      this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
      this.doc.text(count.toString(), x + width - 5, itemY + 2, { align: 'right' });

      itemY += 5;
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // INDICE / TABLA DE CONTENIDOS
  // ══════════════════════════════════════════════════════════════════════════
  private drawTableOfContents(): void {
    this.addNewPageIfNeeded(50);

    const startY = this.currentY;

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text('CONTENIDO DEL REPORTE', this.margin, startY);

    this.currentY = startY + 5;

    // Card de indice
    const cardHeight = 8 + this.data.profiles.length * 5 + this.data.clients.length * 5 + 15;
    this.doc.setFillColor(COLORS.gray50.r, COLORS.gray50.g, COLORS.gray50.b);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, Math.min(cardHeight, 80), 2, 2, 'F');

    let tocY = this.currentY + 6;

    // Seccion Perfiles
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7);
    this.doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    this.doc.text('[1] REPORTES DE PERFILES', this.margin + 4, tocY);
    tocY += 5;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6);
    this.doc.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);

    this.data.profiles.slice(0, 8).forEach((profile, i) => {
      const pageNum = 2 + i;
      this.doc.text(`  - ${truncateText(profile.position_title, 50)} (Pag. ${pageNum})`, this.margin + 6, tocY);
      tocY += 4;
    });

    if (this.data.profiles.length > 8) {
      this.doc.text(`  ... y ${this.data.profiles.length - 8} perfiles mas`, this.margin + 6, tocY);
      tocY += 4;
    }

    tocY += 3;

    // Seccion Clientes
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7);
    this.doc.setTextColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
    this.doc.text('[2] REPORTES DE CLIENTES', this.margin + 4, tocY);
    tocY += 5;

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6);
    this.doc.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);

    const clientStartPage = 2 + this.data.profiles.length;
    this.data.clients.slice(0, 5).forEach((client, i) => {
      const pageNum = clientStartPage + i;
      this.doc.text(`  - ${truncateText(client.company_name, 50)} (Pag. ${pageNum})`, this.margin + 6, tocY);
      tocY += 4;
    });

    if (this.data.clients.length > 5) {
      this.doc.text(`  ... y ${this.data.clients.length - 5} clientes mas`, this.margin + 6, tocY);
      tocY += 4;
    }

    tocY += 3;

    // Seccion Candidatos
    if (this.data.candidates.length > 0) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7);
      this.doc.setTextColor(COLORS.purple.r, COLORS.purple.g, COLORS.purple.b);
      const candPage = clientStartPage + this.data.clients.length;
      this.doc.text(`[3] LISTADO DE CANDIDATOS (Pag. ${candPage})`, this.margin + 4, tocY);
    }

    this.currentY += Math.min(cardHeight, 80) + 5;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // REPORTE COMPLETO DE PERFIL (MULTIPAGINA POR PERFIL)
  // ══════════════════════════════════════════════════════════════════════════
  private drawProfileFullReport(profile: ProfileDetailData, num: number): void {
    // === PAGINA 1 DEL PERFIL ===
    // Header del perfil
    this.drawProfileHeader(profile, num);

    // KPIs del perfil
    this.drawProfileKPIs(profile);

    // Pipeline visual
    this.drawProfilePipeline(profile);

    // Cards de informacion (Empresa + Puesto)
    this.drawProfileInfoCards(profile);

    // Descripcion del puesto
    this.drawProfileDescription(profile);

    // REQUISITOS (Tecnicas y Competencias) - OBLIGATORIO
    this.drawProfileRequirements(profile);

    // === SECCION CANDIDATOS DEL PERFIL ===
    const hasCandidates =
      (profile.candidates_report?.candidates_list?.length ?? 0) > 0 ||
      (profile.candidates_count ?? 0) > 0 ||
      this.data.candidates.some((c) => c.profile_id === profile.id);

    if (hasCandidates) {
      this.doc.addPage();
      this.currentY = this.margin;
      this.drawProfileCandidatesSection(profile, num);
    }

    // === SECCION TIMELINE DEL PROCESO ===
    if (profile.process_timeline || profile.days_open > 0) {
      this.doc.addPage();
      this.currentY = this.margin;
      this.drawProcessTimelineSection(profile, num);
    }
  }

  private drawProfileHeader(profile: ProfileDetailData, num: number): void {
    const headerHeight = 32;

    this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    this.doc.rect(0, 0, this.pageWidth, headerHeight, 'F');

    this.doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    this.doc.rect(0, headerHeight, this.pageWidth, 1, 'F');

    // Logo
    const logoH = 12;
    const logoW = logoH * BAUSEN_LOGO_RATIO;
    try {
      this.doc.addImage(BAUSEN_LOGO_BASE64, 'PNG', this.margin, 4, logoW, logoH);
    } catch {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(14);
      this.doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      this.doc.text('BAUSEN', this.margin, 11);
    }

    // Titulo
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
    this.doc.text(`REPORTE DE PERFIL #${num}`, this.margin, headerHeight + 8);

    // Nombre del puesto
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(16);
    this.doc.setTextColor(COLORS.gray900.r, COLORS.gray900.g, COLORS.gray900.b);
    this.doc.text(truncateText(profile.position_title.toUpperCase(), 45), this.margin, headerHeight + 16);

    // Fecha
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
    this.doc.text(formatDateES(profile.created_at), this.margin, headerHeight + 22);

    // Badges a la derecha
    let badgeX = this.pageWidth - this.margin;
    const badgeY = headerHeight + 10;

    // Badge servicio
    const svcLabel = (profile.service_type || 'normal').toUpperCase();
    badgeX = this.drawBadge(svcLabel, badgeX, badgeY, svcLabel === 'URGENTE' ? 'orange' : svcLabel === 'EXPRESS' ? 'red' : 'gray', 'right');

    // Badge prioridad
    const prioLabel = getPriorityLabel(profile.priority);
    const prioColorType = prioLabel === 'ALTA' ? 'red' : prioLabel === 'MEDIA' ? 'orange' : 'gray';
    badgeX = this.drawBadge(prioLabel, badgeX - 3, badgeY, prioColorType, 'right');

    // Badge estado
    const statusLabel = getStatusLabel(profile.status).toUpperCase();
    const statusColorType = profile.status.toLowerCase().includes('aprob') ? 'green' : profile.status.toLowerCase().includes('pend') ? 'orange' : 'blue';
    this.drawBadge(statusLabel, badgeX - 3, badgeY, statusColorType, 'right');

    this.currentY = headerHeight + 28;
  }

  private drawBadge(
    text: string,
    x: number,
    y: number,
    color: 'green' | 'orange' | 'red' | 'blue' | 'gray',
    align: 'left' | 'right' = 'left'
  ): number {
    const padding = 3;
    const height = 6;

    this.doc.setFontSize(7);
    this.doc.setFont('helvetica', 'bold');
    const textWidth = this.doc.getTextWidth(text);
    const badgeWidth = textWidth + padding * 2;

    const startX = align === 'right' ? x - badgeWidth : x;

    let bgColor, textColor;
    switch (color) {
      case 'green':
        bgColor = COLORS.successLight;
        textColor = COLORS.success;
        break;
      case 'orange':
        bgColor = COLORS.warningLight;
        textColor = COLORS.warning;
        break;
      case 'red':
        bgColor = COLORS.errorLight;
        textColor = COLORS.error;
        break;
      case 'blue':
        bgColor = COLORS.infoLight;
        textColor = COLORS.info;
        break;
      default:
        bgColor = COLORS.gray100;
        textColor = COLORS.gray700;
    }

    this.doc.setFillColor(bgColor.r, bgColor.g, bgColor.b);
    this.doc.roundedRect(startX, y - height + 2, badgeWidth, height, 1.5, 1.5, 'F');

    this.doc.setTextColor(textColor.r, textColor.g, textColor.b);
    this.doc.text(text, startX + padding, y);

    return startX;
  }

  private drawProfileKPIs(profile: ProfileDetailData): void {
    const cardGap = 4;
    const cardWidth = (this.contentWidth - cardGap * 3) / 4;
    const cardHeight = 28;

    const kpis = [
      { label: 'Dias Abierto', value: profile.days_open, color: profile.days_open <= 15 ? COLORS.success : profile.days_open <= 30 ? COLORS.warning : COLORS.error },
      { label: 'Candidatos', value: profile.candidates_count, color: COLORS.primary },
      { label: 'Preseleccionados', value: profile.shortlisted_count, color: COLORS.success },
      { label: 'Entrevistas', value: profile.interviewed_count, color: COLORS.info },
    ];

    kpis.forEach((kpi, index) => {
      const x = this.margin + index * (cardWidth + cardGap);
      const y = this.currentY;

      this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      this.doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F');
      this.doc.setDrawColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
      this.doc.setLineWidth(0.3);
      this.doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'S');

      this.doc.setFillColor(kpi.color.r, kpi.color.g, kpi.color.b);
      this.doc.roundedRect(x, y, cardWidth, 2.5, 2, 2, 'F');
      this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      this.doc.rect(x, y + 1.5, cardWidth, 1.5, 'F');

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(20);
      this.doc.setTextColor(COLORS.gray900.r, COLORS.gray900.g, COLORS.gray900.b);
      this.doc.text(String(kpi.value), x + cardWidth / 2, y + 14, { align: 'center' });

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7);
      this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
      this.doc.text(kpi.label, x + cardWidth / 2, y + 20, { align: 'center' });
    });

    this.currentY += cardHeight + 6;
  }

  private drawProfilePipeline(profile: ProfileDetailData): void {
    const pipelineHeight = 20;
    const y = this.currentY;

    this.doc.setFillColor(COLORS.gray50.r, COLORS.gray50.g, COLORS.gray50.b);
    this.doc.roundedRect(this.margin, y, this.contentWidth, pipelineHeight, 2, 2, 'F');
    this.doc.setDrawColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(this.margin, y, this.contentWidth, pipelineHeight, 2, 2, 'S');

    const stages = [
      { label: 'Candidatos', value: profile.candidates_count, color: COLORS.primary },
      { label: 'Preseleccion', value: profile.shortlisted_count, color: COLORS.warning },
      { label: 'Entrevistas', value: profile.interviewed_count, color: COLORS.success },
    ];

    const stageWidth = this.contentWidth / stages.length;
    const circleRadius = 5;
    const lineY = y + pipelineHeight / 2;

    this.doc.setDrawColor(COLORS.gray300.r, COLORS.gray300.g, COLORS.gray300.b);
    this.doc.setLineWidth(1.5);
    this.doc.line(
      this.margin + stageWidth / 2 + circleRadius,
      lineY,
      this.margin + this.contentWidth - stageWidth / 2 - circleRadius,
      lineY
    );

    stages.forEach((stage, index) => {
      const centerX = this.margin + stageWidth * index + stageWidth / 2;

      this.doc.setFillColor(stage.color.r, stage.color.g, stage.color.b);
      this.doc.circle(centerX, lineY, circleRadius, 'F');

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(8);
      this.doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      this.doc.text(String(stage.value), centerX, lineY + 1, { align: 'center' });

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7);
      this.doc.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
      this.doc.text(stage.label, centerX, y + pipelineHeight - 2, { align: 'center' });

      if (index < stages.length - 1) {
        const arrowX = centerX + stageWidth / 2;
        this.doc.setFillColor(COLORS.gray400.r, COLORS.gray400.g, COLORS.gray400.b);
        this.doc.triangle(arrowX - 2, lineY - 2, arrowX + 2, lineY, arrowX - 2, lineY + 2, 'F');
      }
    });

    this.currentY += pipelineHeight + 6;
  }

  private drawProfileInfoCards(profile: ProfileDetailData): void {
    const cardGap = 4;
    const cardWidth = (this.contentWidth - cardGap) / 2;
    const cardHeight = 48;

    // Card Empresa
    this.drawInfoCard(
      this.margin,
      this.currentY,
      cardWidth,
      cardHeight,
      'Informacion de la Empresa',
      [
        { label: 'Empresa', value: profile.client_name },
        { label: 'Industria', value: profile.client_industry || 'N/A' },
        { label: 'Contacto', value: profile.client_contact_name || 'N/A' },
        { label: 'Email', value: profile.client_contact_email || 'N/A' },
      ]
    );

    // Card Puesto
    this.drawInfoCard(
      this.margin + cardWidth + cardGap,
      this.currentY,
      cardWidth,
      cardHeight,
      'Detalles del Puesto',
      [
        { label: 'Ciudad', value: `${profile.location_city}, ${profile.location_state}` },
        { label: 'Modalidad', value: profile.work_modality || 'Presencial' },
        { label: 'Salario', value: formatCurrency(profile.salary_min, profile.salary_max, profile.salary_period) },
        { label: 'Supervisor', value: profile.supervisor_name || 'N/A' },
      ]
    );

    this.currentY += cardHeight + 6;
  }

  private drawInfoCard(
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    items: Array<{ label: string; value: string }>
  ): void {
    this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    this.doc.roundedRect(x, y, width, height, 2, 2, 'F');
    this.doc.setDrawColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(x, y, width, height, 2, 2, 'S');

    this.doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    this.doc.roundedRect(x, y, width, 2.5, 2, 2, 'F');
    this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    this.doc.rect(x, y + 1.5, width, 1.5, 'F');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text(title, x + 4, y + 9);

    let itemY = y + 16;
    items.forEach((item) => {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
      this.doc.text(`${item.label}:`, x + 4, itemY);

      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(COLORS.gray800.r, COLORS.gray800.g, COLORS.gray800.b);
      this.doc.text(truncateText(item.value, 35), x + 4 + this.doc.getTextWidth(`${item.label}: `), itemY);

      itemY += 7;
    });
  }

  private drawProfileDescription(profile: ProfileDetailData): void {
    // Card Descripcion del Puesto
    if (profile.description) {
      this.addNewPageIfNeeded(45);

      const descHeight = 40;
      this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, descHeight, 2, 2, 'F');
      this.doc.setDrawColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
      this.doc.setLineWidth(0.3);
      this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, descHeight, 2, 2, 'S');

      this.doc.setFillColor(COLORS.info.r, COLORS.info.g, COLORS.info.b);
      this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, 2.5, 2, 2, 'F');
      this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      this.doc.rect(this.margin, this.currentY + 1.5, this.contentWidth, 1.5, 'F');

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(8);
      this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
      this.doc.text('Descripcion del Puesto', this.margin + 4, this.currentY + 9);

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7);
      this.doc.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);

      const lines = this.doc.splitTextToSize(profile.description, this.contentWidth - 8);
      this.doc.text(lines.slice(0, 5), this.margin + 4, this.currentY + 17);

      this.currentY += descHeight + 4;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // REQUISITOS DEL PERFIL (Tecnicas y Competencias) - OBLIGATORIO
  // ══════════════════════════════════════════════════════════════════════════
  private drawProfileRequirements(profile: ProfileDetailData): void {
    const hasTech = profile.technical_skills && profile.technical_skills.length > 0;
    const hasSoft = profile.soft_skills && profile.soft_skills.length > 0;

    if (!hasTech && !hasSoft) return;

    this.addNewPageIfNeeded(55);

    // Card principal de Requisitos
    const cardHeight = 50;
    this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, cardHeight, 2, 2, 'F');
    this.doc.setDrawColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, cardHeight, 2, 2, 'S');

    // Barra superior morada
    this.doc.setFillColor(COLORS.purple.r, COLORS.purple.g, COLORS.purple.b);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, 2.5, 2, 2, 'F');
    this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    this.doc.rect(this.margin, this.currentY + 1.5, this.contentWidth, 1.5, 'F');

    // Titulo
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text('REQUISITOS', this.margin + 4, this.currentY + 9);

    const halfWidth = (this.contentWidth - 8) / 2;

    // Columna izquierda: Habilidades Tecnicas
    if (hasTech) {
      let techY = this.currentY + 16;
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7);
      this.doc.setTextColor(COLORS.purple.r, COLORS.purple.g, COLORS.purple.b);
      this.doc.text('Habilidades Tecnicas', this.margin + 4, techY);
      techY += 5;

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6);

      let skillX = this.margin + 4;
      profile.technical_skills!.slice(0, 8).forEach((skill) => {
        const skillText = truncateText(skill, 18);
        const skillWidth = this.doc.getTextWidth(skillText) + 5;

        if (skillX + skillWidth > this.margin + halfWidth) {
          skillX = this.margin + 4;
          techY += 6;
        }

        this.doc.setFillColor(COLORS.purpleLight.r, COLORS.purpleLight.g, COLORS.purpleLight.b);
        this.doc.roundedRect(skillX, techY - 3, skillWidth, 4.5, 1, 1, 'F');
        this.doc.setTextColor(COLORS.purple.r, COLORS.purple.g, COLORS.purple.b);
        this.doc.text(skillText, skillX + 2.5, techY);

        skillX += skillWidth + 2;
      });

      if (profile.technical_skills!.length > 8) {
        this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
        this.doc.text(`+${profile.technical_skills!.length - 8} mas`, skillX, techY);
      }
    }

    // Columna derecha: Competencias / Soft Skills
    if (hasSoft) {
      let softY = this.currentY + 16;
      const rightX = this.margin + halfWidth + 8;

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7);
      this.doc.setTextColor(COLORS.success.r, COLORS.success.g, COLORS.success.b);
      this.doc.text('Competencias', rightX, softY);
      softY += 5;

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6);

      let skillX = rightX;
      profile.soft_skills!.slice(0, 8).forEach((skill) => {
        const skillText = truncateText(skill, 18);
        const skillWidth = this.doc.getTextWidth(skillText) + 5;

        if (skillX + skillWidth > this.margin + this.contentWidth - 4) {
          skillX = rightX;
          softY += 6;
        }

        this.doc.setFillColor(COLORS.successLight.r, COLORS.successLight.g, COLORS.successLight.b);
        this.doc.roundedRect(skillX, softY - 3, skillWidth, 4.5, 1, 1, 'F');
        this.doc.setTextColor(COLORS.success.r, COLORS.success.g, COLORS.success.b);
        this.doc.text(skillText, skillX + 2.5, softY);

        skillX += skillWidth + 2;
      });

      if (profile.soft_skills!.length > 8) {
        this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
        this.doc.text(`+${profile.soft_skills!.length - 8} mas`, skillX, softY);
      }
    }

    this.currentY += cardHeight + 4;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CANDIDATOS DEL PERFIL - SECCION COMPLETA
  // ══════════════════════════════════════════════════════════════════════════
    private drawProfileCandidatesSection(profile: ProfileDetailData, num: number): void {
    this.drawSectionHeader(`CANDIDATOS DEL PERFIL #${num}`, profile.position_title, COLORS.purple);

    const list = this.getCandidatesForProfile(profile);
    const report = profile.candidates_report;

    const totalCandidates = report?.total_candidates ?? (list.length || profile.candidates_count || 0);

    const stats = this.computeMatchStats(list);
    const matchAvg = report?.match_avg ?? stats.avg;
    const topMatch = report?.top_match ?? stats.top;
    const offers = report?.offers ?? stats.offers ?? (profile.candidates_by_status?.offered ?? 0);

    this.drawCandidatesKPIs(totalCandidates, matchAvg, topMatch, offers);

    if (report?.match_distribution) {
      this.drawMatchDistribution(report.match_distribution);
    } else {
      // si hay lista, al menos ya mostrarás tabla + gantt; si no, tu distribución simple por etapa
      this.drawSimpleMatchDistribution(profile);
    }

    // ✅ Tabla: si no viene del report, se arma del global
    if (list.length > 0) {
      this.drawProfileCandidatesTable(list);
      this.drawCandidatesGantt(list, report?.gantt_range_start, report?.gantt_range_end);
    } else {
      this.drawCandidatesSummaryFromStatus(profile);
    }
  }


  private drawSectionHeader(title: string, subtitle: string, color: { r: number; g: number; b: number }): void {
    const headerHeight = 22;

    this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    this.doc.rect(0, 0, this.pageWidth, headerHeight, 'F');

    // Logo
    const logoH = 10;
    const logoW = logoH * BAUSEN_LOGO_RATIO;
    try {
      this.doc.addImage(BAUSEN_LOGO_BASE64, 'PNG', this.margin, 3, logoW, logoH);
    } catch {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(12);
      this.doc.setTextColor(color.r, color.g, color.b);
      this.doc.text('BAUSEN', this.margin, 10);
    }

    // Titulo
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.setTextColor(COLORS.gray900.r, COLORS.gray900.g, COLORS.gray900.b);
    this.doc.text(title, this.pageWidth / 2, 8, { align: 'center' });

    // Subtitulo
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(color.r, color.g, color.b);
    this.doc.text(truncateText(subtitle, 60), this.pageWidth / 2, 14, { align: 'center' });

    // Linea
    this.doc.setFillColor(color.r, color.g, color.b);
    this.doc.rect(0, headerHeight, this.pageWidth, 1, 'F');

    this.currentY = headerHeight + 5;
  }

  private drawCandidatesKPIs(total: number, matchAvg: number, topMatch: number, offers: number): void {
    const cardWidth = (this.contentWidth - 9) / 4;
    const cardHeight = 24;

    const kpis = [
      { label: 'Total Candidatos', value: total.toString(), color: COLORS.purple },
      { label: 'Match Promedio', value: `${matchAvg}%`, color: COLORS.info },
      { label: 'Top Match', value: `${topMatch}%`, color: COLORS.success },
      { label: 'Ofertas', value: offers.toString(), color: COLORS.orange },
    ];

    kpis.forEach((kpi, index) => {
      const x = this.margin + (cardWidth + 3) * index;
      const y = this.currentY;

      this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      this.doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F');
      this.doc.setDrawColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
      this.doc.setLineWidth(0.3);
      this.doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'S');

      this.doc.setFillColor(kpi.color.r, kpi.color.g, kpi.color.b);
      this.doc.roundedRect(x, y, cardWidth, 2, 2, 2, 'F');

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(14);
      this.doc.setTextColor(kpi.color.r, kpi.color.g, kpi.color.b);
      this.doc.text(kpi.value, x + cardWidth / 2, y + 12, { align: 'center' });

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6);
      this.doc.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
      this.doc.text(kpi.label, x + cardWidth / 2, y + 19, { align: 'center' });
    });

    this.currentY += cardHeight + 5;
  }

  private drawMatchDistribution(distribution: MatchDistributionBucket[]): void {
    const cardHeight = 30;
    this.doc.setFillColor(COLORS.gray50.r, COLORS.gray50.g, COLORS.gray50.b);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, cardHeight, 2, 2, 'F');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text('Distribucion de Match', this.margin + 4, this.currentY + 7);

    const bucketWidth = (this.contentWidth - 12) / 3;
    const colors = {
      ALTO: COLORS.success,
      MEDIO: COLORS.warning,
      BAJO: COLORS.error,
    };

    distribution.forEach((bucket, index) => {
      const x = this.margin + 4 + (bucketWidth + 2) * index;
      const y = this.currentY + 12;
      const color = colors[bucket.bucket] || COLORS.gray500;

      // Badge del bucket
      this.doc.setFillColor(color.r, color.g, color.b);
      this.doc.roundedRect(x, y, 25, 5, 1, 1, 'F');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5.5);
      this.doc.setTextColor(255, 255, 255);
      this.doc.text(bucket.bucket, x + 12.5, y + 3.5, { align: 'center' });

      // Rango
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(5);
      this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
      this.doc.text(bucket.range, x + 28, y + 3.5);

      // Conteo
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(10);
      this.doc.setTextColor(color.r, color.g, color.b);
      this.doc.text(bucket.count.toString(), x + 12.5, y + 14, { align: 'center' });

      // Valores
      if (bucket.values && bucket.values.length > 0) {
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(5);
        this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
        const vals = bucket.values.slice(0, 3).map(v => `${v}%`).join(', ');
        this.doc.text(vals, x + 28, y + 14);
      }
    });

    this.currentY += cardHeight + 4;
  }

  private drawSimpleMatchDistribution(profile: ProfileDetailData): void {
    // Distribucion simple basada en candidatos_by_status
    const cardHeight = 18;
    this.doc.setFillColor(COLORS.gray50.r, COLORS.gray50.g, COLORS.gray50.b);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, cardHeight, 2, 2, 'F');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text('Distribucion por Etapa', this.margin + 4, this.currentY + 6);

    const stages = [
      { label: 'Aplicados', value: profile.candidates_by_status?.applied ?? 0, color: COLORS.info },
      { label: 'Revision', value: profile.candidates_by_status?.screening ?? 0, color: COLORS.warning },
      { label: 'Preselec.', value: profile.candidates_by_status?.shortlisted ?? 0, color: COLORS.purple },
      { label: 'Entrevista', value: profile.candidates_by_status?.interviewing ?? 0, color: COLORS.success },
      { label: 'Oferta', value: profile.candidates_by_status?.offered ?? 0, color: COLORS.orange },
    ];

    const itemWidth = (this.contentWidth - 10) / stages.length;
    stages.forEach((stage, i) => {
      const x = this.margin + 4 + itemWidth * i;
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(10);
      this.doc.setTextColor(stage.color.r, stage.color.g, stage.color.b);
      this.doc.text(stage.value.toString(), x + itemWidth / 2, this.currentY + 11, { align: 'center' });

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(5);
      this.doc.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
      this.doc.text(stage.label, x + itemWidth / 2, this.currentY + 15, { align: 'center' });
    });

    this.currentY += cardHeight + 4;
  }

  private drawProfileCandidatesTable(candidates: ProfileCandidateData[]): void {
    this.addNewPageIfNeeded(50);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text('Lista de Candidatos', this.margin, this.currentY + 4);
    this.currentY += 7;

    const cols = {
      name: { x: this.margin, width: 55 },
      email: { x: this.margin + 55, width: 50 },
      date: { x: this.margin + 105, width: 30 },
      stage: { x: this.margin + 135, width: 30 },
      match: { x: this.margin + 165, width: 26 },
    };

    const headerHeight = 6;
    const rowHeight = 6;

    // Header
    this.doc.setFillColor(COLORS.purple.r, COLORS.purple.g, COLORS.purple.b);
    this.doc.rect(this.margin, this.currentY, this.contentWidth, headerHeight, 'F');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(5.5);
    this.doc.setTextColor(255, 255, 255);
    this.doc.text('NOMBRE', cols.name.x + 2, this.currentY + 4);
    this.doc.text('EMAIL', cols.email.x + 2, this.currentY + 4);
    this.doc.text('APLICO', cols.date.x + 2, this.currentY + 4);
    this.doc.text('ETAPA', cols.stage.x + 2, this.currentY + 4);
    this.doc.text('MATCH', cols.match.x + 2, this.currentY + 4);
    this.currentY += headerHeight;

    // Filas
    candidates.slice(0, 10).forEach((cand, index) => {
      if (index % 2 === 0) {
        this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      } else {
        this.doc.setFillColor(COLORS.gray50.r, COLORS.gray50.g, COLORS.gray50.b);
      }
      this.doc.rect(this.margin, this.currentY, this.contentWidth, rowHeight, 'F');

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(5.5);
      this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
      this.doc.text(this.fitText(cand.name, cols.name.width - 4), cols.name.x + 2, this.currentY + 4);
      this.doc.text(this.fitText(cand.email, cols.email.width - 4), cols.email.x + 2, this.currentY + 4);
      this.doc.text(formatDateES(cand.applied_date), cols.date.x + 2, this.currentY + 4);

      // Etapa badge
      const stageColor = getStatusColor(cand.stage);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5);
      this.doc.setTextColor(stageColor.r, stageColor.g, stageColor.b);
      this.doc.text(getStatusLabel(cand.stage).substring(0, 10), cols.stage.x + 2, this.currentY + 4);

      // Match con color
      const matchColor = cand.match >= 70 ? COLORS.success : cand.match >= 40 ? COLORS.warning : COLORS.error;
      this.doc.setTextColor(matchColor.r, matchColor.g, matchColor.b);
      this.doc.text(`${cand.match}%`, cols.match.x + 2, this.currentY + 4);

      this.currentY += rowHeight;
    });

    if (candidates.length > 10) {
      this.doc.setFont('helvetica', 'italic');
      this.doc.setFontSize(5);
      this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
      this.doc.text(`... y ${candidates.length - 10} candidatos mas`, this.margin + 2, this.currentY + 4);
      this.currentY += 6;
    }

    this.currentY += 4;
  }

  private drawCandidatesSummaryFromStatus(profile: ProfileDetailData): void {
    // Tabla resumen simple cuando no hay lista detallada
    const cardHeight = 20;
    this.doc.setFillColor(COLORS.gray50.r, COLORS.gray50.g, COLORS.gray50.b);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, cardHeight, 2, 2, 'F');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text('Resumen de Candidatos por Estatus', this.margin + 4, this.currentY + 6);

    const statuses = profile.candidates_by_status;
    const items = [
      `Aplicados: ${statuses?.applied ?? 0}`,
      `En revision: ${statuses?.screening ?? 0}`,
      `Preseleccionados: ${statuses?.shortlisted ?? 0}`,
      `Entrevistando: ${statuses?.interviewing ?? 0}`,
      `Con oferta: ${statuses?.offered ?? 0}`,
      `Contratados: ${statuses?.hired ?? 0}`,
    ];

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6);
    this.doc.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
    this.doc.text(items.join('  |  '), this.margin + 4, this.currentY + 14);

    this.currentY += cardHeight + 4;
  }

  private drawCandidatesGantt(candidates: ProfileCandidateData[], rangeStart?: string, rangeEnd?: string): void {
    this.addNewPageIfNeeded(60);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text('Timeline de Candidatos', this.margin, this.currentY + 4);
    this.currentY += 8;

    const chartHeight = 45;
    const chartWidth = this.contentWidth;
    const labelWidth = 45;
    const barAreaWidth = chartWidth - labelWidth - 8;

    // Determinar rango de fechas
    const now = new Date();
    const dates = candidates.map(c => new Date(c.applied_date).getTime());
    const minDate = rangeStart ? new Date(rangeStart).getTime() : Math.min(...dates);
    const maxDate = rangeEnd ? new Date(rangeEnd).getTime() : now.getTime();
    // totalDays se usa para calculos de escala si se necesita en el futuro
    // const totalDays = Math.max(1, Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)));

    // Fondo
    this.doc.setFillColor(COLORS.gray50.r, COLORS.gray50.g, COLORS.gray50.b);
    this.doc.roundedRect(this.margin, this.currentY, chartWidth, chartHeight, 2, 2, 'F');

    // Eje de tiempo
    const timeAxisY = this.currentY + 6;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(5);
    this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
    this.doc.text('Inicio', this.margin + labelWidth + 2, timeAxisY);
    this.doc.text('Hoy', this.margin + labelWidth + barAreaWidth - 8, timeAxisY);

    // Linea del eje
    this.doc.setDrawColor(COLORS.gray300.r, COLORS.gray300.g, COLORS.gray300.b);
    this.doc.setLineWidth(0.5);
    this.doc.line(this.margin + labelWidth, timeAxisY + 2, this.margin + labelWidth + barAreaWidth, timeAxisY + 2);

    // Marcador HOY
    const todayX = this.margin + labelWidth + barAreaWidth - 2;
    this.doc.setFillColor(COLORS.error.r, COLORS.error.g, COLORS.error.b);
    this.doc.circle(todayX, timeAxisY + 2, 1.5, 'F');

    // Barras de candidatos
    const barHeight = 4;
    const barGap = 5;
    let barY = timeAxisY + 8;

    const stageColors: Record<string, { r: number; g: number; b: number }> = {
      applied: COLORS.info,
      screening: COLORS.warning,
      shortlisted: COLORS.purple,
      interviewing: COLORS.success,
      offered: COLORS.orange,
      hired: COLORS.success,
      rejected: COLORS.error,
    };

    candidates.slice(0, 6).forEach((cand) => {
      // Nombre
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(5);
      this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
      this.doc.text(this.fitText(cand.name, labelWidth - 4), this.margin + 2, barY + 3);

      // Barra
      const startTime = new Date(cand.applied_date).getTime();
      const startOffset = ((startTime - minDate) / (maxDate - minDate)) * barAreaWidth;
      const barWidth = Math.max(5, barAreaWidth - startOffset);
      const color = stageColors[cand.stage] || COLORS.gray400;

      this.doc.setFillColor(color.r, color.g, color.b);
      this.doc.roundedRect(this.margin + labelWidth + startOffset, barY, barWidth, barHeight, 1, 1, 'F');

      // Dias
      const days = cand.days_in_process ?? Math.ceil((now.getTime() - startTime) / (1000 * 60 * 60 * 24));
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(4.5);
      this.doc.setTextColor(255, 255, 255);
      if (barWidth > 15) {
        this.doc.text(`${days}d`, this.margin + labelWidth + startOffset + 2, barY + 3);
      }

      barY += barGap;
    });

    // Leyenda
    const legendY = this.currentY + chartHeight - 6;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(4.5);
    let legendX = this.margin + 4;
    const legendItems = [
      { label: 'Aplico', color: COLORS.info },
      { label: 'Revision', color: COLORS.warning },
      { label: 'Preselec.', color: COLORS.purple },
      { label: 'Entrevista', color: COLORS.success },
      { label: 'Oferta', color: COLORS.orange },
    ];

    legendItems.forEach((item) => {
      this.doc.setFillColor(item.color.r, item.color.g, item.color.b);
      this.doc.circle(legendX, legendY, 1.5, 'F');
      this.doc.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
      this.doc.text(item.label, legendX + 3, legendY + 1);
      legendX += 22;
    });

    this.currentY += chartHeight + 5;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TIMELINE DEL PROCESO - SECCION COMPLETA
  // ══════════════════════════════════════════════════════════════════════════
  private drawProcessTimelineSection(profile: ProfileDetailData, num: number): void {
    // Header de seccion
    this.drawSectionHeader(`TIMELINE DEL PROCESO #${num}`, profile.position_title, COLORS.info);

    const timeline = profile.process_timeline;
    const daysOpen = timeline?.time_open_days ?? profile.days_open;
    const hoursOpen = timeline?.time_open_hours ?? (daysOpen * 24);
    const eventsCount = timeline?.events_count ?? 0;
    const poolMatchAvg = timeline?.pool_match_avg ?? 0;
    const efficiencyVsIndustry = timeline?.efficiency_vs_industry ?? 0;

    // KPIs del Timeline
  const candidatesInProfile = this.getCandidatesCountForProfile(profile);

this.drawTimelineKPIs(daysOpen, hoursOpen, eventsCount, poolMatchAvg, efficiencyVsIndustry, candidatesInProfile);

    // Diagrama del proceso tipo Gantt
    if (timeline?.process_phases && timeline.process_phases.length > 0) {
      this.drawProcessGantt(timeline.process_phases);
    } else {
      this.drawSimpleProcessGantt(profile);
    }

    // Cards de candidatos
    if (timeline?.candidates_cards && timeline.candidates_cards.length > 0) {
      this.drawTimelineCandidateCards(timeline.candidates_cards);
    }

    // Comparativa de eficiencia
    this.drawEfficiencyComparison(hoursOpen, timeline?.industry_avg_hours ?? 360);

    // Detalle de eventos
    if (timeline?.events_detail && timeline.events_detail.length > 0) {
      this.drawEventsDetail(timeline.events_detail);
    }
  }

  private drawTimelineKPIs(
  days: number,
  hours: number,
  events: number,
  matchAvg: number,
  efficiency: number,
  candidatesCount: number
): void {
    const cardWidth = (this.contentWidth - 12) / 5;
    const cardHeight = 22;

    const kpis = [
      { label: 'Dias Abierto', value: days.toString(), subtext: `${hours} hrs`, color: days <= 15 ? COLORS.success : days <= 30 ? COLORS.warning : COLORS.error },
      { label: 'Candidatos', value: String(candidatesCount), subtext: 'en proceso', color: COLORS.purple },
      { label: 'Match Pool', value: `${matchAvg}%`, subtext: 'promedio', color: COLORS.info },
      { label: 'Eficiencia', value: `${efficiency}%`, subtext: 'vs industria', color: efficiency >= 100 ? COLORS.success : COLORS.warning },
      { label: 'Eventos', value: events.toString(), subtext: 'registrados', color: COLORS.gray700 },
    ];

    kpis.forEach((kpi, index) => {
      const x = this.margin + (cardWidth + 3) * index;
      const y = this.currentY;

      this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      this.doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F');
      this.doc.setDrawColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
      this.doc.setLineWidth(0.3);
      this.doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'S');

      this.doc.setFillColor(kpi.color.r, kpi.color.g, kpi.color.b);
      this.doc.roundedRect(x, y, cardWidth, 2, 2, 2, 'F');

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(11);
      this.doc.setTextColor(kpi.color.r, kpi.color.g, kpi.color.b);
      this.doc.text(kpi.value, x + cardWidth / 2, y + 10, { align: 'center' });

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(5);
      this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
      this.doc.text(kpi.subtext, x + cardWidth / 2, y + 14, { align: 'center' });

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5);
      this.doc.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
      this.doc.text(kpi.label, x + cardWidth / 2, y + 19, { align: 'center' });
    });

    this.currentY += cardHeight + 5;
  }

  private drawProcessGantt(phases: ProcessPhaseData[]): void {
    const chartHeight = 52;
    this.doc.setFillColor(COLORS.gray50.r, COLORS.gray50.g, COLORS.gray50.b);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, chartHeight, 3, 3, 'F');
    this.doc.setDrawColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, chartHeight, 3, 3, 'S');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text('DIAGRAMA DEL PROCESO', this.margin + 4, this.currentY + 7);

    // Tiempo total
    const totalDays = phases.reduce((sum, p) => {
      const match = p.duration.match(/(\d+)/);
      return sum + (match ? parseInt(match[1]) : 0);
    }, 0);
    const totalHours = totalDays * 24;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6);
    this.doc.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
    this.doc.text(`Tiempo total: ${totalDays} dias (${totalHours} hrs)`, this.pageWidth - this.margin - 4, this.currentY + 7, { align: 'right' });

    const barStartY = this.currentY + 14;
    const barHeight = 10;
    const labelWidth = 55;
    const barAreaWidth = this.contentWidth - labelWidth - 30;
    const barStartX = this.margin + labelWidth;

    phases.slice(0, 3).forEach((phase, index) => {
      const phaseY = barStartY + index * (barHeight + 4);
      const colors = [COLORS.primary, COLORS.success, COLORS.purple];
      const color = colors[index % colors.length];

      // Label
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6);
      this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
      this.doc.text(this.fitText(phase.phase, labelWidth - 4), this.margin + 4, phaseY + 6);

      // Track background
      this.doc.setFillColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
      this.doc.roundedRect(barStartX, phaseY + 2, barAreaWidth, barHeight - 2, 2, 2, 'F');

      // Barra de progreso proporcional
      const match = phase.duration.match(/(\d+)/);
      const phaseDays = match ? parseInt(match[1]) : 1;
      const proportion = Math.min(phaseDays / Math.max(totalDays, 1), 1);
      const barWidth = Math.max(15, barAreaWidth * proportion);

      this.doc.setFillColor(color.r, color.g, color.b);
      this.doc.roundedRect(barStartX, phaseY + 2, barWidth, barHeight - 2, 2, 2, 'F');

      // Texto de duracion dentro de la barra o al lado
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5.5);
      if (barWidth > 30) {
        this.doc.setTextColor(255, 255, 255);
        this.doc.text(phase.duration, barStartX + 4, phaseY + 7);
      } else {
        this.doc.setTextColor(color.r, color.g, color.b);
        this.doc.text(phase.duration, barStartX + barWidth + 3, phaseY + 7);
      }
    });

    // Eje del tiempo
    const axisY = barStartY + phases.slice(0, 3).length * (barHeight + 4) + 4;
    this.doc.setDrawColor(COLORS.gray300.r, COLORS.gray300.g, COLORS.gray300.b);
    this.doc.setLineWidth(0.5);
    this.doc.line(barStartX, axisY, barStartX + barAreaWidth, axisY);

    // Marcas del eje
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(5);
    this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
    this.doc.text('Inicio', barStartX, axisY + 4);
    this.doc.text('50%', barStartX + barAreaWidth / 2, axisY + 4, { align: 'center' });
    this.doc.text('Actual', barStartX + barAreaWidth, axisY + 4, { align: 'right' });

    this.currentY += chartHeight + 5;
  }

  private drawSimpleProcessGantt(profile: ProfileDetailData): void {
    const chartHeight = 25;
    this.doc.setFillColor(COLORS.gray50.r, COLORS.gray50.g, COLORS.gray50.b);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, chartHeight, 2, 2, 'F');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text('Linea de Tiempo del Proceso', this.margin + 4, this.currentY + 6);

    // Barra simple de progreso
    const barY = this.currentY + 12;
    const barWidth = this.contentWidth - 8;
    const progress = Math.min(1, profile.days_open / 60); // Max 60 dias

    this.doc.setFillColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
    this.doc.roundedRect(this.margin + 4, barY, barWidth, 6, 1, 1, 'F');

    this.doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    this.doc.roundedRect(this.margin + 4, barY, barWidth * progress, 6, 1, 1, 'F');

    // Etiquetas
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(5);
    this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
    this.doc.text('Inicio', this.margin + 4, barY + 11);
    this.doc.text(`${profile.days_open} dias`, this.margin + barWidth - 10, barY + 11);

    this.currentY += chartHeight + 4;
  }

  private drawTimelineCandidateCards(cards: CandidateCardData[]): void {
    this.addNewPageIfNeeded(55);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text('CANDIDATOS DEL PROCESO', this.margin, this.currentY + 4);
    this.currentY += 8;

    // Layout: 3 columnas x 2 filas = 6 candidatos
    const cols = 3;
    const cardWidth = (this.contentWidth - (cols - 1) * 4) / cols;
    const cardHeight = 24;
    const gap = 4;

    cards.slice(0, 6).forEach((card, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = this.margin + col * (cardWidth + gap);
      const y = this.currentY + row * (cardHeight + gap);

      // Card background
      this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      this.doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F');
      this.doc.setDrawColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
      this.doc.setLineWidth(0.3);
      this.doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'S');

      // Avatar con iniciales
      const avatarSize = 12;
      const avatarX = x + 4;
      const avatarY = y + (cardHeight - avatarSize) / 2 - 1;
      const avatarColor = getStatusColor(card.stage);
      this.doc.setFillColor(avatarColor.r, avatarColor.g, avatarColor.b);
      this.doc.circle(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 'F');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7);
      this.doc.setTextColor(255, 255, 255);
      this.doc.text(card.initials, avatarX + avatarSize / 2, avatarY + avatarSize / 2 + 2, { align: 'center' });

      // Rank badge (esquina del avatar)
      this.doc.setFillColor(COLORS.warning.r, COLORS.warning.g, COLORS.warning.b);
      this.doc.circle(avatarX + avatarSize - 2, avatarY + 2, 3.5, 'F');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5);
      this.doc.setTextColor(255, 255, 255);
      this.doc.text(`${card.rank}`, avatarX + avatarSize - 2, avatarY + 3.5, { align: 'center' });

      // Nombre (truncado)
      const infoX = avatarX + avatarSize + 4;
      const infoWidth = cardWidth - avatarSize - 12;
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6);
      this.doc.setTextColor(COLORS.gray800.r, COLORS.gray800.g, COLORS.gray800.b);
      this.doc.text(this.fitText(card.name, infoWidth), infoX, y + 7);

      // Match % con barra visual
      const matchValue = parseInt(card.match) || 0;
      const matchColor = matchValue >= 70 ? COLORS.success : matchValue >= 40 ? COLORS.warning : COLORS.error;
      
      // Barra de match
      const barWidth = Math.min(matchValue / 100 * (infoWidth - 15), infoWidth - 15);
      this.doc.setFillColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
      this.doc.roundedRect(infoX, y + 10, infoWidth - 15, 3, 1, 1, 'F');
      this.doc.setFillColor(matchColor.r, matchColor.g, matchColor.b);
      this.doc.roundedRect(infoX, y + 10, barWidth, 3, 1, 1, 'F');
      
      // Match text
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5);
      this.doc.setTextColor(matchColor.r, matchColor.g, matchColor.b);
      this.doc.text(card.match, infoX + infoWidth - 12, y + 12.5);

      // Fecha
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(5);
      this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
      this.doc.text(card.date, infoX, y + 18);

      // Estado badge en la parte inferior
      const stageColor = getStatusColor(card.stage);
      const stageBg = tint(stageColor, 0.85);
      const stageLabel = getStatusLabel(card.stage);
      this.doc.setFontSize(4);
      const stageLabelWidth = Math.min(this.doc.getTextWidth(stageLabel) + 4, cardWidth - avatarSize - 10);
      this.doc.setFillColor(stageBg.r, stageBg.g, stageBg.b);
      this.doc.roundedRect(infoX, y + cardHeight - 6, stageLabelWidth, 4, 1, 1, 'F');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(stageColor.r, stageColor.g, stageColor.b);
      this.doc.text(stageLabel, infoX + stageLabelWidth / 2, y + cardHeight - 3.5, { align: 'center' });
    });

    // Avanzar currentY basado en cuantas filas se usaron
    const rowsUsed = Math.ceil(Math.min(cards.length, 6) / cols);
    this.currentY += rowsUsed * (cardHeight + gap) + 2;
  }

  private drawEfficiencyComparison(processHours: number, industryHours: number): void {
    const cardHeight = 32;
    this.doc.setFillColor(COLORS.gray50.r, COLORS.gray50.g, COLORS.gray50.b);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, cardHeight, 3, 3, 'F');
    this.doc.setDrawColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, cardHeight, 3, 3, 'S');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text('COMPARATIVA DE EFICIENCIA', this.margin + 4, this.currentY + 7);

    const labelWidth = 35;
    const barStartX = this.margin + labelWidth + 4;
    const barMaxWidth = this.contentWidth - labelWidth - 50;
    const maxHours = Math.max(processHours, industryHours);

    // Barra de este proceso
    const bar1Y = this.currentY + 12;
    const processWidth = (processHours / maxHours) * barMaxWidth;
    const processColor = processHours <= industryHours ? COLORS.success : COLORS.warning;
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text('Este proceso', this.margin + 4, bar1Y + 4);
    
    this.doc.setFillColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
    this.doc.roundedRect(barStartX, bar1Y, barMaxWidth, 6, 1, 1, 'F');
    this.doc.setFillColor(processColor.r, processColor.g, processColor.b);
    this.doc.roundedRect(barStartX, bar1Y, processWidth, 6, 1, 1, 'F');
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7);
    this.doc.setTextColor(processColor.r, processColor.g, processColor.b);
    this.doc.text(`${processHours} hrs`, barStartX + barMaxWidth + 4, bar1Y + 5);

    // Barra de industria
    const bar2Y = this.currentY + 22;
    const industryWidth = (industryHours / maxHours) * barMaxWidth;
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6);
    this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
    this.doc.text('Prom. industria', this.margin + 4, bar2Y + 4);
    
    this.doc.setFillColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
    this.doc.roundedRect(barStartX, bar2Y, barMaxWidth, 6, 1, 1, 'F');
    this.doc.setFillColor(COLORS.gray400.r, COLORS.gray400.g, COLORS.gray400.b);
    this.doc.roundedRect(barStartX, bar2Y, industryWidth, 6, 1, 1, 'F');
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7);
    this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
    this.doc.text(`${industryHours} hrs`, barStartX + barMaxWidth + 4, bar2Y + 5);

    this.currentY += cardHeight + 5;
  }

  private drawEventsDetail(eventsGroups: TimelineEventGroup[]): void {
    this.addNewPageIfNeeded(60);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text('DETALLE DE EVENTOS', this.margin, this.currentY + 4);
    this.currentY += 10;

    eventsGroups.slice(0, 5).forEach((group) => {
      this.addNewPageIfNeeded(25);

      // Header del dia con fondo azul
      this.doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, 6, 1, 1, 'F');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6);
      this.doc.setTextColor(255, 255, 255);
      this.doc.text(group.day_group, this.margin + 4, this.currentY + 4);
      this.currentY += 8;

      const lineX = this.margin + 8;
      const dotRadius = 1.5;

      // Eventos del dia con linea de timeline
      group.items.slice(0, 6).forEach((event, eventIdx, arr) => {
        const isLast = eventIdx === arr.length - 1 || eventIdx === 5;

        // Linea vertical del timeline
        if (!isLast) {
          this.doc.setDrawColor(COLORS.gray300.r, COLORS.gray300.g, COLORS.gray300.b);
          this.doc.setLineWidth(0.4);
          this.doc.line(lineX, this.currentY + dotRadius * 2, lineX, this.currentY + 8);
        }

        // Punto del evento con color segun tipo
        const dotColor = event.type.includes('Creado') || event.type.includes('Perfil') ? COLORS.primary :
                        event.type.includes('Aplico') || event.type.includes('Candidato') ? COLORS.success : COLORS.info;
        this.doc.setFillColor(dotColor.r, dotColor.g, dotColor.b);
        this.doc.circle(lineX, this.currentY + 2, dotRadius, 'F');

        // Hora
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(5);
        this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
        this.doc.text(event.time, lineX + 6, this.currentY + 3);

        // Badge de tipo
        const badgeX = lineX + 25;
        this.doc.setFontSize(4.5);
        const badgeWidth = Math.min(this.doc.getTextWidth(event.type) + 5, 32);
        this.doc.setFillColor(dotColor.r, dotColor.g, dotColor.b);
        this.doc.roundedRect(badgeX, this.currentY, badgeWidth, 4.5, 1, 1, 'F');
        this.doc.setFont('helvetica', 'bold');
        this.doc.setTextColor(255, 255, 255);
        this.doc.text(event.type, badgeX + 2.5, this.currentY + 3.2);

        // Descripcion
        const descX = badgeX + badgeWidth + 4;
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(5.5);
        this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
        this.doc.text(this.fitText(event.text, this.contentWidth - descX + this.margin - 4), descX, this.currentY + 3);

        this.currentY += 8;
      });

      if (group.items.length > 6) {
        this.doc.setFont('helvetica', 'italic');
        this.doc.setFontSize(5);
        this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
        this.doc.text(`... y ${group.items.length - 6} eventos mas en este dia`, this.margin + 12, this.currentY + 2);
        this.currentY += 5;
      }

      this.currentY += 4;
    });

    if (eventsGroups.length > 5) {
      this.doc.setFont('helvetica', 'italic');
      this.doc.setFontSize(6);
      this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
      this.doc.text(`... y ${eventsGroups.length - 5} dias adicionales con eventos`, this.margin, this.currentY + 3);
      this.currentY += 8;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // REPORTE COMPLETO DE CLIENTE (UNA PAGINA POR CLIENTE)
  // ══════════════════════════════════════════════════════════════════════════
  private drawClientFullReport(client: ClientDetailData, num: number): void {
    this.drawClientHeader(client, num);
    this.drawClientInfoCard(client);
    this.drawClientKPIs(client);
    this.drawClientStatusDistribution(client);
    this.drawClientProfilesTable(client);
    this.drawClientNotes(client);
  }

  private drawClientHeader(client: ClientDetailData, num: number): void {
    const headerHeight = 28;

    this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    this.doc.rect(0, 0, this.pageWidth, headerHeight, 'F');

    // Logo
    const logoH = 12;
    const logoW = logoH * BAUSEN_LOGO_RATIO;
    try {
      this.doc.addImage(BAUSEN_LOGO_BASE64, 'PNG', this.margin, 5, logoW, logoH);
    } catch {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(14);
      this.doc.setTextColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
      this.doc.text('BAUSEN', this.margin, 12);
    }

    // Titulo
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(14);
    this.doc.setTextColor(COLORS.gray900.r, COLORS.gray900.g, COLORS.gray900.b);
    this.doc.text(`REPORTE DE CLIENTE #${num}`, this.pageWidth / 2, 10, { align: 'center' });

    // Nombre del cliente
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(11);
    this.doc.setTextColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
    this.doc.text(truncateText(client.company_name, 50), this.pageWidth / 2, 17, { align: 'center' });

    // Fecha
    const fecha = new Date().toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    this.doc.setFontSize(8);
    this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
    this.doc.text(fecha, this.pageWidth - this.margin, 24, { align: 'right' });

    // Linea roja
    this.doc.setFillColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
    this.doc.rect(0, headerHeight, this.pageWidth, 1, 'F');

    this.currentY = headerHeight + 5;
  }

  private drawClientInfoCard(client: ClientDetailData): void {
    const cardHeight = 28;
    const startY = this.currentY;

    this.doc.setFillColor(COLORS.gray50.r, COLORS.gray50.g, COLORS.gray50.b);
    this.doc.roundedRect(this.margin, startY, this.contentWidth, cardHeight, 2, 2, 'F');
    this.doc.setDrawColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(this.margin, startY, this.contentWidth, cardHeight, 2, 2, 'S');

    this.doc.setFillColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
    this.doc.roundedRect(this.margin, startY, this.contentWidth, 2, 2, 2, 'F');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text('INFORMACION DEL CONTACTO', this.margin + 4, startY + 8);

    const col1X = this.margin + 4;
    const col2X = this.margin + this.contentWidth / 2 + 4;
    let itemY = startY + 14;

    this.drawClientInfoItem(col1X, itemY, 'Contacto:', client.contact_name || 'N/A');
    this.drawClientInfoItem(col2X, itemY, 'Telefono:', client.contact_phone || 'N/A');
    itemY += 7;

    this.drawClientInfoItem(col1X, itemY, 'Email:', client.contact_email || 'N/A');
    this.drawClientInfoItem(col2X, itemY, 'Industria:', client.industry || 'N/A');

    this.currentY = startY + cardHeight + 4;
  }

  private drawClientInfoItem(x: number, y: number, label: string, value: string): void {
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6.5);
    this.doc.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
    this.doc.text(label, x, y);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(COLORS.gray800.r, COLORS.gray800.g, COLORS.gray800.b);
    this.doc.text(truncateText(value, 30), x + this.doc.getTextWidth(label) + 2, y);
  }

  private drawClientKPIs(client: ClientDetailData): void {
    const startY = this.currentY;

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text('INDICADORES CLAVE', this.margin, startY);

    this.currentY = startY + 5;

    const perfilesAplicados = (client.profiles_list || []).filter((p) => p.candidates_count > 0).length;

    const kpis = [
      { label: 'Perfiles', value: client.total_profiles.toString(), subtext: 'Total', color: COLORS.secondary },
      { label: 'Con Candidatos', value: perfilesAplicados.toString(), subtext: 'Aplicados', color: COLORS.purple },
      { label: 'Activos', value: client.active_profiles.toString(), subtext: 'En proceso', color: COLORS.info },
      { label: 'Completados', value: client.profiles_completed.toString(), subtext: 'Finalizados', color: COLORS.success },
      { label: 'Tasa Exito', value: `${client.success_rate}%`, subtext: 'Completados/Total', color: COLORS.warning },
      { label: 'Candidatos', value: client.total_candidates.toString(), subtext: 'Gestionados', color: COLORS.gray700 },
    ];

    const cardWidth = (this.contentWidth - 15) / 6;
    const cardHeight = 22;

    kpis.forEach((kpi, index) => {
      const x = this.margin + (cardWidth + 3) * index;
      const y = this.currentY;

      this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      this.doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F');
      this.doc.setDrawColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
      this.doc.setLineWidth(0.3);
      this.doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'S');

      this.doc.setFillColor(kpi.color.r, kpi.color.g, kpi.color.b);
      this.doc.roundedRect(x, y, cardWidth, 2, 2, 2, 'F');

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(12);
      this.doc.setTextColor(kpi.color.r, kpi.color.g, kpi.color.b);
      this.doc.text(kpi.value, x + cardWidth / 2, y + 11, { align: 'center' });

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5.5);
      this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
      this.doc.text(kpi.label, x + cardWidth / 2, y + 16, { align: 'center' });

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(5);
      this.doc.setTextColor(COLORS.gray400.r, COLORS.gray400.g, COLORS.gray400.b);
      this.doc.text(kpi.subtext, x + cardWidth / 2, y + 20, { align: 'center' });
    });

    this.currentY += cardHeight + 4;
  }

  private drawClientStatusDistribution(client: ClientDetailData): void {
    const statusEntries = Object.entries(client.profiles_by_status || {});
    if (statusEntries.length === 0) return;

    const startY = this.currentY;

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text('DISTRIBUCION POR ESTADO', this.margin, startY);

    this.currentY = startY + 5;

    const sectionHeight = 18;
    this.doc.setFillColor(COLORS.gray50.r, COLORS.gray50.g, COLORS.gray50.b);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, sectionHeight, 2, 2, 'F');

    const total = statusEntries.reduce((sum, [, count]) => sum + count, 0);
    if (total === 0) {
      this.currentY += sectionHeight + 3;
      return;
    }

    const barHeight = 8;
    const barY = this.currentY + 5;
    let barX = this.margin + 4;
    const availableWidth = this.contentWidth - 8;

    statusEntries.forEach(([status, count]) => {
      const proportion = count / total;
      const barWidth = Math.max(availableWidth * proportion, 15);
      const statusColor = getStatusColor(status);

      this.doc.setFillColor(statusColor.r, statusColor.g, statusColor.b);
      this.doc.roundedRect(barX, barY, barWidth - 2, barHeight, 1, 1, 'F');

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5.5);
      this.doc.setTextColor(255, 255, 255);
      if (barWidth > 25) {
        this.doc.text(`${truncateText(status, 10)}: ${count}`, barX + 2, barY + 5.5);
      }

      barX += barWidth;
    });

    this.currentY += sectionHeight + 4;
  }

  private drawClientProfilesTable(client: ClientDetailData): void {
    const profiles = client.profiles_list || [];
    if (profiles.length === 0) return;

    this.addNewPageIfNeeded(50);

    const startY = this.currentY;

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text('LISTA DE PERFILES / VACANTES', this.margin, startY);

    this.currentY = startY + 4;

    const cols = {
      title: { x: this.margin, width: 70 },
      dates: { x: this.margin + 70, width: 40 },
      status: { x: this.margin + 110, width: 38 },
      priority: { x: this.margin + 148, width: 22 },
      candidates: { x: this.margin + 170, width: 21 },
    };

    const headerHeight = 6;
    const rowHeight = 8;

    // Header
    this.doc.setFillColor(COLORS.secondary.r, COLORS.secondary.g, COLORS.secondary.b);
    this.doc.rect(this.margin, this.currentY, this.contentWidth, headerHeight, 'F');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6);
    this.doc.setTextColor(255, 255, 255);

    this.doc.text('POSICION', cols.title.x + 2, this.currentY + 4);
    this.doc.text('FECHA', cols.dates.x + 2, this.currentY + 4);
    this.doc.text('ESTATUS', cols.status.x + 2, this.currentY + 4);
    this.doc.text('PRIOR.', cols.priority.x + 2, this.currentY + 4);
    this.doc.text('CAND.', cols.candidates.x + 2, this.currentY + 4);

    this.currentY += headerHeight;

    // Filas
    profiles.slice(0, 8).forEach((profile, index) => {
      if (index % 2 === 0) {
        this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      } else {
        this.doc.setFillColor(COLORS.gray50.r, COLORS.gray50.g, COLORS.gray50.b);
      }
      this.doc.rect(this.margin, this.currentY, this.contentWidth, rowHeight, 'F');

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6);
      this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);

      this.doc.text(this.fitText(profile.position_title, cols.title.width - 4), cols.title.x + 2, this.currentY + 5);
      this.doc.text(formatDateES(profile.created_at), cols.dates.x + 2, this.currentY + 5);

      // Badge estado
      const statusColor = getStatusColor(profile.status);
      const statusBg = tint(statusColor, 0.85);
      this.doc.setFillColor(statusBg.r, statusBg.g, statusBg.b);
      this.doc.roundedRect(cols.status.x + 2, this.currentY + 1.5, 34, 5, 1, 1, 'F');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5);
      this.doc.setTextColor(statusColor.r, statusColor.g, statusColor.b);
      this.doc.text(truncateText(getStatusLabel(profile.status), 12), cols.status.x + 4, this.currentY + 5);

      // Badge prioridad
      const prioColor = getPriorityColor(profile.priority);
      this.doc.setFillColor(prioColor.bg.r, prioColor.bg.g, prioColor.bg.b);
      this.doc.roundedRect(cols.priority.x + 2, this.currentY + 1.5, 18, 5, 1, 1, 'F');
      this.doc.setTextColor(prioColor.text.r, prioColor.text.g, prioColor.text.b);
      this.doc.text(getPriorityLabel(profile.priority), cols.priority.x + 4, this.currentY + 5);

      // Candidatos
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7);
      this.doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      this.doc.text(String(profile.candidates_count), cols.candidates.x + 10, this.currentY + 5, { align: 'center' });

      this.currentY += rowHeight;
    });

    this.currentY += 4;
  }

  private drawClientNotes(client: ClientDetailData): void {
    if (!client.notes) return;

    this.addNewPageIfNeeded(25);

    const cardHeight = 20;

    this.doc.setFillColor(COLORS.warningLight.r, COLORS.warningLight.g, COLORS.warningLight.b);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, cardHeight, 2, 2, 'F');
    this.doc.setDrawColor(COLORS.warning.r, COLORS.warning.g, COLORS.warning.b);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, cardHeight, 2, 2, 'S');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text('NOTAS DEL CLIENTE', this.margin + 4, this.currentY + 7);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7);
    this.doc.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
    const lines = this.doc.splitTextToSize(client.notes, this.contentWidth - 8);
    this.doc.text(lines.slice(0, 2), this.margin + 4, this.currentY + 13);

    this.currentY += cardHeight + 4;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECCION DE CANDIDATOS
  // ══════════════════════════════════════════════════════════════════════════
  private drawCandidatesSection(): void {
    // Header
    this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    this.doc.rect(0, 0, this.pageWidth, 20, 'F');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.setTextColor(COLORS.gray900.r, COLORS.gray900.g, COLORS.gray900.b);
    this.doc.text('LISTADO DE CANDIDATOS', this.margin, 12);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
    this.doc.text(`(${this.data.candidates.length} registros)`, this.margin + 55, 12);

    this.doc.setFillColor(COLORS.purple.r, COLORS.purple.g, COLORS.purple.b);
    this.doc.rect(0, 20, this.pageWidth, 1, 'F');

    this.currentY = 25;

    this.drawCandidatesTable();
  }

  private drawCandidatesTable(): void {
    const cols = {
      num: { x: this.margin, width: 8 },
      name: { x: this.margin + 8, width: 45 },
      email: { x: this.margin + 53, width: 50 },
      profile: { x: this.margin + 103, width: 45 },
      status: { x: this.margin + 148, width: 25 },
      match: { x: this.margin + 173, width: 18 },
    };

    const headerHeight = 6;
    const rowHeight = 6;

    // Header
    this.doc.setFillColor(COLORS.purple.r, COLORS.purple.g, COLORS.purple.b);
    this.doc.rect(this.margin, this.currentY, this.contentWidth, headerHeight, 'F');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(5.5);
    this.doc.setTextColor(255, 255, 255);

    this.doc.text('#', cols.num.x + 2, this.currentY + 4);
    this.doc.text('NOMBRE', cols.name.x + 2, this.currentY + 4);
    this.doc.text('EMAIL', cols.email.x + 2, this.currentY + 4);
    this.doc.text('PERFIL', cols.profile.x + 2, this.currentY + 4);
    this.doc.text('ESTATUS', cols.status.x + 2, this.currentY + 4);
    this.doc.text('MATCH', cols.match.x + 2, this.currentY + 4);

    this.currentY += headerHeight;

    // Filas
    const maxRows = 30;
    this.data.candidates.slice(0, maxRows).forEach((candidate, index) => {
      if (index % 2 === 0) {
        this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      } else {
        this.doc.setFillColor(COLORS.gray50.r, COLORS.gray50.g, COLORS.gray50.b);
      }
      this.doc.rect(this.margin, this.currentY, this.contentWidth, rowHeight, 'F');

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(5.5);
      this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);

      this.doc.text((index + 1).toString(), cols.num.x + 2, this.currentY + 4);
      this.doc.text(this.fitText(candidate.full_name, cols.name.width - 4), cols.name.x + 2, this.currentY + 4);
      this.doc.text(this.fitText(candidate.email, cols.email.width - 4), cols.email.x + 2, this.currentY + 4);
      this.doc.text(this.fitText(candidate.profile_title, cols.profile.width - 4), cols.profile.x + 2, this.currentY + 4);

      // Estado
      const statusColor = getStatusColor(candidate.status);
      this.doc.setTextColor(statusColor.r, statusColor.g, statusColor.b);
      this.doc.setFont('helvetica', 'bold');
      this.doc.text(this.fitText(getStatusLabel(candidate.status), cols.status.width - 4), cols.status.x + 2, this.currentY + 4);

      // Match
      const matchColor = candidate.matching_score >= 70 ? COLORS.success : candidate.matching_score >= 40 ? COLORS.warning : COLORS.gray500;
      this.doc.setTextColor(matchColor.r, matchColor.g, matchColor.b);
      this.doc.text(`${candidate.matching_score}%`, cols.match.x + 2, this.currentY + 4);

      this.currentY += rowHeight;
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FOOTER
  // ══════════════════════════════════════════════════════════════════════════
  private drawFooter(currentPage: number, totalPages: number): void {
    const footerY = this.pageHeight - 8;

    this.doc.setDrawColor(COLORS.gray300.r, COLORS.gray300.g, COLORS.gray300.b);
    this.doc.setLineWidth(0.3);
    this.doc.line(this.margin, footerY - 3, this.pageWidth - this.margin, footerY - 3);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6);
    this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
    this.doc.text('BAUSEN | Sistema de Gestion de Talento', this.margin, footerY);

    this.doc.setFont('helvetica', 'italic');
    this.doc.text('Documento confidencial', this.pageWidth / 2, footerY, { align: 'center' });

    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Pagina ${currentPage} de ${totalPages}`, this.pageWidth - this.margin, footerY, { align: 'right' });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MARCA DE AGUA
  // ══════════════════════════════════════════════════════════════════════════
  private aplicarMarcaAgua(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyDoc = this.doc as any;
      const imgData = BECHAPRA_WATERMARK_B_BASE64;

      const props = anyDoc.getImageProperties(imgData);
      const ratio = props.width / props.height;

      const wmW = this.pageWidth * 0.75;
      const wmH = wmW / ratio;

      const x = -18;
      const y = this.pageHeight - wmH + 12;

      const hasGState = typeof anyDoc.GState === 'function' && typeof anyDoc.setGState === 'function';

      if (typeof anyDoc.saveGraphicsState === 'function') {
        anyDoc.saveGraphicsState();
      }

      if (hasGState) {
        anyDoc.setGState(new anyDoc.GState({ opacity: 0.05 }));
      }

      anyDoc.addImage(imgData, 'PNG', x, y, wmW, wmH, `WM_CONSOLIDATED_${Date.now()}`, 'FAST');

      if (hasGState) {
        anyDoc.setGState(new anyDoc.GState({ opacity: 1 }));
      }

      if (typeof anyDoc.restoreGraphicsState === 'function') {
        anyDoc.restoreGraphicsState();
      }
    } catch {
      // Silenciar errores de marca de agua
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// FUNCION EXPORTADORA
// ════════════════════════════════════════════════════════════════════════════
export function downloadExtendedConsolidatedReportPDF(data: ExtendedConsolidatedReportData, filename?: string): void {
  const generator = new ExtendedConsolidatedReportPDF();
  const pdf = generator.generate(data);

  const finalFilename = filename || `Reporte_General_Consolidado_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(finalFilename);
}

export { ExtendedConsolidatedReportPDF };

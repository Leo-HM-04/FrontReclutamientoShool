/**
 * ════════════════════════════════════════════════════════════════════════════
 * PDF CONSOLIDATED REPORT - REPORTE GENERAL CONSOLIDADO
 * ════════════════════════════════════════════════════════════════════════════
 */

import jsPDF from 'jspdf';
import { BAUSEN_LOGO_BASE64, BAUSEN_LOGO_RATIO } from './logo-base64';
import { BECHAPRA_WATERMARK_B_BASE64 } from './watermarkBase64';

// ════════════════════════════════════════════════════════════════════════════
// COLORES DEL TEMA
// ════════════════════════════════════════════════════════════════════════════
const COLORS = {
  primary: { r: 0, g: 51, b: 160 },
  primaryLight: { r: 59, g: 130, b: 246 },
  primaryDark: { r: 30, g: 64, b: 175 },

  success: { r: 16, g: 185, b: 129 },
  warning: { r: 245, g: 158, b: 11 },
  error: { r: 239, g: 68, b: 68 },
  info: { r: 59, g: 130, b: 246 },
  purple: { r: 139, g: 92, b: 246 },
  orange: { r: 249, g: 115, b: 22 },

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
// INTERFACES
// ════════════════════════════════════════════════════════════════════════════
export interface ProfileData {
  id: number;
  position_title: string;
  client_name: string;
  client_id: number;
  status: string;
  priority: string;
  created_at: string;
  candidates_count: number;
  shortlisted_count: number;
  interviewed_count: number;
  salary_min: number;
  salary_max: number;
  location_city: string;
  location_state: string;
  work_modality: string;
  years_experience: number;
  education_level: string;
  days_open: number;
  candidates_by_status: {
    applied: number;
    screening: number;
    shortlisted: number;
    interviewing: number;
    offered: number;
    hired: number;
    rejected: number;
  };
}

export interface ClientData {
  id: number;
  company_name: string;
  industry: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  active_profiles: number;
  total_profiles: number;
  total_candidates_hired: number;
  total_candidates: number;
  profiles_completed: number;
  success_rate: number;
  profiles_by_status: Record<string, number>;
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
}

export interface ConsolidatedReportData {
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
  profiles: ProfileData[];
  clients: ClientData[];
  candidates: CandidateData[];
}

// ════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ════════════════════════════════════════════════════════════════════════════

function sanitizePDFText(value: any): string {
  if (value === null || value === undefined) return '';
  let s = String(value);

  // Invisibles comunes (BOM / ZWSP / Word-joiner / Soft hyphen)
  s = s.replace(/[\uFEFF\u200B\u200C\u200D\u2060\u00AD]/g, '');

  // Entidades HTML básicas
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
  s = s.replace(/\t+/g, ''); // tabs suelen venir entre letras
  s = s.replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ');

  // Eliminar controles (NO convertir a espacio)
  s = s
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');

  // Si viene URL-encoded (ej: Iv%C3%A1n)
  if (/%[0-9A-Fa-f]{2}/.test(s)) {
    try {
      const maybe = decodeURIComponent(s.replace(/\+/g, '%20'));
      if (maybe && maybe.length >= 1) s = maybe;
    } catch {
      // ignore
    }
  }

  // Reparar mojibake típico (Ã¡, â€™, etc.)
  const looksMojibake = /ðŸ|Ã.|Â.|â€|â€™|â€œ|â€�/g.test(s);
  if (looksMojibake) {
    try {
      const fixed = decodeURIComponent(escape(s));
      const score = (t: string) => (t.match(/ðŸ|Ã.|Â.|â€|â€™|â€œ|â€�/g) || []).length;
      if (score(fixed) < score(s)) s = fixed;
    } catch {
      // ignore
    }
  }

  // Quitar símbolos basura comunes en estos casos
  s = s.replace(/[©®™]/g, '');

  // PROTEGER porcentajes reales tipo "70%"
  const pctStore: string[] = [];
  s = s.replace(/\b\d+%/g, (m) => {
    pctStore.push(m);
    return `__PCT_${pctStore.length - 1}__`;
  });

  // Eliminar TODOS los % restantes (los que dañan nombres)
  s = s.replace(/%+/g, '');

  // Restaurar porcentajes reales
  s = s.replace(/__PCT_(\d+)__/g, (_, i) => pctStore[Number(i)] || '');

  // Quitar "&" pegados a letras (si vinieran)
  const ampCount = (s.match(/&/g) || []).length;
  if (ampCount >= 2) {
    s = s.replace(/&([A-Za-zÁÉÍÓÚÑÜáéíóúñü])&/g, '$1');
    s = s.replace(/&(?=[A-Za-zÁÉÍÓÚÑÜáéíóúñü])/g, '');
    s = s.replace(/(?<=[A-Za-zÁÉÍÓÚÑÜáéíóúñü])&/g, '');
  }

  // Quitar basura entre letras (ej: N��u�e�z)
  try {
    // entre letras Unicode, elimina símbolos raros (deja espacios, guiones, comillas)
    s = s.replace(/(?<=\p{L})[^\p{L}\p{M}\s'’\-\.]+(?=\p{L})/gu, '');
  } catch {
    // fallback sin Unicode properties
    s = s.replace(/(?<=[A-Za-zÁÉÍÓÚÑÜáéíóúñü])[^\w\s'’\-\.]+(?=[A-Za-zÁÉÍÓÚÑÜáéíóúñü])/g, '');
  }

  // Colapsar palabras letra-por-letra (ej: "J o e l" -> "Joel")
  try {
    s = s.replace(/\b(?:\p{L}\s+){2,}\p{L}\b/gu, (m) => m.replace(/\s+/g, ''));
  } catch {
    s = s.replace(
      /\b(?:[A-Za-zÁÉÍÓÚÑÜáéíóúñü]\s+){2,}[A-Za-zÁÉÍÓÚÑÜáéíóúñü]\b/g,
      (m) => m.replace(/\s+/g, '')
    );
  }

  // Normalizar comillas/guiones raros y replacement char
  s = s
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\uFFFD/g, '');

  // Quitar emojis/pictogramas
  try {
    s = s.replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu, '');
  } catch {
    s = s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '');
  }

  // Ajustes de espacios alrededor de puntuación
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

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Borrador',
    pending: 'Pendiente',
    approved: 'Aprobado',
    in_progress: 'En Progreso',
    candidates_found: 'Candidatos',
    in_evaluation: 'Evaluación',
    in_interview: 'Entrevistas',
    finalists: 'Finalistas',
    completed: 'Completado',
    cancelled: 'Cancelado',
    active: 'Activo',
    new: 'Nuevo',
    screening: 'Revisión',
    qualified: 'Calificado',
    shortlisted: 'Preselección',
    interview: 'Entrevista',
    interviewing: 'Entrevistando',
    offer: 'Oferta',
    offered: 'Ofertado',
    hired: 'Contratado',
    rejected: 'Rechazado',
    withdrawn: 'Retirado',
    applied: 'Aplicado',
  };
  return sanitizePDFText(labels[status] || status || 'N/A');
}

function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    urgent: 'Urgente',
  };
  return sanitizePDFText(labels[priority] || 'Media');
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

// ════════════════════════════════════════════════════════════════════════════
// CLASE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
class ConsolidatedReportPDF {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private currentY: number;
  private contentWidth: number;
  private currentPage: number;
  private totalPages: number;
  private data: ConsolidatedReportData;

  constructor() {
    this.doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 12;
    this.currentY = this.margin;
    this.contentWidth = this.pageWidth - this.margin * 2;
    this.currentPage = 1;
    this.totalPages = 1;
    this.data = {} as ConsolidatedReportData;
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

  private normalizeData(data: ConsolidatedReportData): ConsolidatedReportData {
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
      })),

      clients: (data.clients || []).map((c) => ({
        ...c,
        company_name: sanitizePDFText(c.company_name),
        industry: sanitizePDFText(c.industry),
        contact_name: sanitizePDFText(c.contact_name),
        contact_email: sanitizePDFText(c.contact_email),
        contact_phone: sanitizePDFText(c.contact_phone),
        profiles_by_status: cleanDict(c.profiles_by_status),
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

  public generate(data: ConsolidatedReportData): jsPDF {
    this.data = this.normalizeData(data);
    this.totalPages = this.estimatePages();

    this.drawHeader();
    this.drawFilterInfo();
    this.drawExecutiveSummary();
    this.drawStatusDistributions();

    if (this.data.profiles.length > 0) {
      this.addNewPageIfNeeded(60);
      this.drawProfilesSection();
    }

    if (this.data.clients.length > 0 && (!this.data.filter || this.data.filter.type === 'all' || this.data.filter.type === 'client')) {
      this.addNewPageIfNeeded(60);
      this.drawClientsSection();
    }

    if (this.data.candidates.length > 0) {
      this.addNewPageIfNeeded(50);
      this.drawCandidatesSection();
    }

    const totalPagesActual = this.doc.getNumberOfPages();
    for (let i = 1; i <= totalPagesActual; i++) {
      this.doc.setPage(i);
      this.drawFooter(i, totalPagesActual);
      this.aplicarMarcaAgua();
    }

    return this.doc;
  }

  private estimatePages(): number {
    const profilesPages = Math.ceil(this.data.profiles.length / 4);
    const clientsPages = Math.ceil(this.data.clients.length / 5);
    const candidatesPages = Math.ceil(this.data.candidates.length / 15);
    return 1 + profilesPages + clientsPages + candidatesPages;
  }

  private addNewPageIfNeeded(requiredSpace: number): void {
    if (this.currentY + requiredSpace > this.pageHeight - 20) {
      this.doc.addPage();
      this.currentPage++;
      this.currentY = this.margin + 5;
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HEADER
  // ══════════════════════════════════════════════════════════════════════════
  private drawHeader(): void {
    const headerHeight = 26;

    this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    this.doc.rect(0, 0, this.pageWidth, headerHeight, 'F');

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

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(15);
    this.doc.setTextColor(COLORS.gray900.r, COLORS.gray900.g, COLORS.gray900.b);
    this.doc.text('REPORTE GENERAL CONSOLIDADO', this.pageWidth / 2, 10, { align: 'center' });

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
    this.doc.text('Información detallada de Perfiles, Clientes y Candidatos', this.pageWidth / 2, 16, { align: 'center' });

    const fecha = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    this.doc.setFontSize(7);
    this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
    this.doc.text(fecha, this.pageWidth - this.margin, 22, { align: 'right' });

    this.doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    this.doc.rect(0, headerHeight, this.pageWidth, 1, 'F');

    this.currentY = headerHeight + 4;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FILTRO
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

    const maxW = this.contentWidth - 8;

    if (filter.type === 'client') {
      const line = `FILTRADO POR CLIENTE: ${filter.clientName || 'N/A'}`;
      this.doc.text(this.fitText(line, maxW), this.margin + 4, this.currentY + 5);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6);
      this.doc.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
      const sub = `Mostrando ${this.data.profiles.length} perfiles y ${this.data.candidates.length} candidatos de este cliente`;
      this.doc.text(this.fitText(sub, maxW), this.margin + 4, this.currentY + 9);
    } else if (filter.type === 'profile') {
      const line = `FILTRADO POR PERFIL: ${filter.profileTitle || 'N/A'}`;
      this.doc.text(this.fitText(line, maxW), this.margin + 4, this.currentY + 5);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6);
      this.doc.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
      const sub = `Mostrando ${this.data.candidates.length} candidatos de este perfil`;
      this.doc.text(this.fitText(sub, maxW), this.margin + 4, this.currentY + 9);
    }

    this.currentY += cardHeight + 4;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // RESUMEN EJECUTIVO
  // ══════════════════════════════════════════════════════════════════════════
  private drawExecutiveSummary(): void {
    const startY = this.currentY;
    const { summary } = this.data;

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text('RESUMEN EJECUTIVO', this.margin, startY);

    this.currentY = startY + 5;

    const successRate = summary.total_profiles > 0 ? Math.round((summary.profiles_completed / summary.total_profiles) * 100) : 0;

    const kpis = [
      { label: 'Perfiles', value: String(summary.total_profiles), subtext: 'Total', color: COLORS.primary },
      { label: 'Candidatos', value: String(summary.total_candidates), subtext: 'Registrados', color: COLORS.purple },
      { label: 'Clientes', value: String(summary.total_clients), subtext: 'Activos', color: COLORS.success },
      { label: 'Completados', value: String(summary.profiles_completed), subtext: 'Perfiles', color: COLORS.info },
      { label: 'Contratados', value: String(summary.candidates_hired), subtext: 'Candidatos', color: COLORS.orange },
      { label: 'Tasa Éxito', value: `${successRate}%`, subtext: 'Efectividad', color: COLORS.warning },
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
  // DISTRIBUCIÓN POR ESTADOS
  // ══════════════════════════════════════════════════════════════════════════
  private drawStatusDistributions(): void {
    const startY = this.currentY;
    const cardWidth = (this.contentWidth - 4) / 2;
    const cardHeight = 35;

    this.drawStatusCard(this.margin, startY, cardWidth, cardHeight, 'Perfiles por Estatus', this.data.summary.profiles_by_status, this.data.summary.total_profiles);
    this.drawStatusCard(this.margin + cardWidth + 4, startY, cardWidth, cardHeight, 'Candidatos por Estatus', this.data.summary.candidates_by_status, this.data.summary.total_candidates);

    this.currentY = startY + cardHeight + 5;
  }

  private drawStatusCard(
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    data: Record<string, number>,
    total: number
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

    const entries = Object.entries(data || {}).sort((a, b) => (b[1] || 0) - (a[1] || 0)).slice(0, 5);

    let itemY = y + 11;
    const barMaxWidth = width - 35;

    entries.forEach(([status, count]) => {
      const safeCount = count || 0;
      const proportion = total > 0 ? safeCount / total : 0;
      const barWidth = barMaxWidth * proportion;
      const statusColor = getStatusColor(status);

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(5.5);
      this.doc.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
      this.doc.text(this.fitText(getStatusLabel(status), 22), x + 3, itemY + 2);

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
      this.doc.text(String(safeCount), x + width - 5, itemY + 2, { align: 'right' });

      itemY += 5;
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PERFILES
  // ══════════════════════════════════════════════════════════════════════════
  private drawProfilesSection(): void {
    const startY = this.currentY;

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.setTextColor(COLORS.gray800.r, COLORS.gray800.g, COLORS.gray800.b);
    this.doc.text('DETALLE DE PERFILES', this.margin, startY);

    this.currentY = startY + 5;

    this.data.profiles.forEach((profile, index) => {
      this.addNewPageIfNeeded(25);
      this.drawProfileCard(profile, index + 1);
    });
  }

  private drawProfileCard(profile: ProfileData, num: number): void {
    const cardHeight = 22;
    const y = this.currentY;

    this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    this.doc.roundedRect(this.margin, y, this.contentWidth, cardHeight, 2, 2, 'F');
    this.doc.setDrawColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(this.margin, y, this.contentWidth, cardHeight, 2, 2, 'S');

    // Número
    this.doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    this.doc.roundedRect(this.margin, y, 8, cardHeight, 2, 2, 'F');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(String(num), this.margin + 4, y + 12, { align: 'center' });

    // Bloque derecho (candidatos + badges)
    const candX = this.margin + this.contentWidth - 45;

    // Título perfil (fit por ancho real)
    const leftX = this.margin + 11;
    const leftMaxW = Math.max(10, (candX - 4) - leftX);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    this.doc.setTextColor(COLORS.gray900.r, COLORS.gray900.g, COLORS.gray900.b);
    this.doc.text(this.fitText(profile.position_title, leftMaxW), leftX, y + 6);

    // Cliente (fit)
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6);
    this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
    this.doc.text(this.fitText(`Cliente: ${profile.client_name}`, leftMaxW), leftX, y + 11);

    // Info fila 2 (columnas con fit por ancho real)
    const infoY = y + 16;
    const rightLimitX = candX - 2;
    const leftW = Math.max(10, rightLimitX - leftX);
    const gap = 2;

    const col1W = Math.min(54, leftW * 0.58);
    const col2W = Math.min(24, leftW * 0.20);
    const col3W = Math.max(10, leftW - col1W - col2W - gap * 2);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(5.2);
    this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);

    const ubi = this.fitText(`UBI: ${profile.location_city}, ${profile.location_state}`, col1W);
    const exp = this.fitText(`EXP: ${profile.years_experience} años`, col2W);
    const dias = this.fitText(`DÍAS: ${profile.days_open}`, col3W);

    this.doc.text(ubi, leftX, infoY);
    this.doc.text(exp, leftX + col1W + gap, infoY);
    this.doc.text(dias, leftX + col1W + gap + col2W + gap, infoY);

    // Candidatos
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7);
    this.doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    this.doc.text(String(profile.candidates_count), candX + 5, y + 8, { align: 'center' });
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(5);
    this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
    this.doc.text('Candidatos', candX + 5, y + 12, { align: 'center' });

    // Badge estado
    const statusColor = getStatusColor(profile.status);
    const statusBg = tint(statusColor, 0.86);
    this.doc.setFillColor(statusBg.r, statusBg.g, statusBg.b);
    this.doc.roundedRect(candX + 18, y + 4, 22, 5, 1, 1, 'F');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(5);
    this.doc.setTextColor(statusColor.r, statusColor.g, statusColor.b);
    this.doc.text(this.fitText(getStatusLabel(profile.status), 20), candX + 29, y + 7.5, { align: 'center' });

    // Badge prioridad
    const prioColors: Record<string, { r: number; g: number; b: number }> = {
      high: COLORS.error,
      urgent: COLORS.error,
      medium: COLORS.warning,
      low: COLORS.success,
    };

    const prioKey = sanitizePDFText(profile.priority || '').toLowerCase();
    const prioColor =
      prioColors[prioKey] ||
      (prioKey.includes('alta') ? COLORS.error :
        prioKey.includes('media') ? COLORS.warning :
          prioKey.includes('baja') ? COLORS.success :
            COLORS.gray500);

    const prioBg = tint(prioColor, 0.86);
    this.doc.setFillColor(prioBg.r, prioBg.g, prioBg.b);
    this.doc.roundedRect(candX + 18, y + 11, 22, 5, 1, 1, 'F');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(5);
    this.doc.setTextColor(prioColor.r, prioColor.g, prioColor.b);
    this.doc.text(this.fitText(getPriorityLabel(profile.priority), 20), candX + 29, y + 14.5, { align: 'center' });

    this.currentY += cardHeight + 2;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CLIENTES
  // ══════════════════════════════════════════════════════════════════════════
  private drawClientsSection(): void {
    const startY = this.currentY;

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.setTextColor(COLORS.gray800.r, COLORS.gray800.g, COLORS.gray800.b);
    this.doc.text('DETALLE DE CLIENTES', this.margin, startY);

    this.currentY = startY + 5;

    this.data.clients.forEach((client, index) => {
      this.addNewPageIfNeeded(20);
      this.drawClientCard(client, index + 1);
    });
  }

  private drawClientCard(client: ClientData, num: number): void {
    const cardHeight = 18;
    const y = this.currentY;

    this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    this.doc.roundedRect(this.margin, y, this.contentWidth, cardHeight, 2, 2, 'F');
    this.doc.setDrawColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(this.margin, y, this.contentWidth, cardHeight, 2, 2, 'S');

    this.doc.setFillColor(COLORS.success.r, COLORS.success.g, COLORS.success.b);
    this.doc.roundedRect(this.margin, y, 8, cardHeight, 2, 2, 'F');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(String(num), this.margin + 4, y + 10, { align: 'center' });

    const statsX = this.margin + this.contentWidth - 70;
    const leftX = this.margin + 11;
    const leftMaxW = Math.max(10, (statsX - 4) - leftX);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    this.doc.setTextColor(COLORS.gray900.r, COLORS.gray900.g, COLORS.gray900.b);
    this.doc.text(this.fitText(client.company_name, leftMaxW), leftX, y + 6);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6);
    this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
    this.doc.text(this.fitText(client.industry || '', leftMaxW), leftX, y + 11);
    this.doc.text(this.fitText(`Email: ${client.contact_email || ''}`, leftMaxW), leftX, y + 15);

    // Stats derecha
    this.doc.setFontSize(5.5);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text(`Perfiles: ${client.total_profiles}`, statsX, y + 6);
    this.doc.text(`Activos: ${client.active_profiles}`, statsX + 25, y + 6);
    this.doc.text(`Completados: ${client.profiles_completed}`, statsX, y + 11);
    this.doc.text(`Contratados: ${client.total_candidates_hired}`, statsX + 25, y + 11);

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7);
    const successColor = (client.success_rate || 0) >= 50 ? COLORS.success : COLORS.warning;
    this.doc.setTextColor(successColor.r, successColor.g, successColor.b);
    this.doc.text(`${client.success_rate || 0}%`, statsX + 60, y + 10, { align: 'right' });

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(5);
    this.doc.setTextColor(COLORS.gray400.r, COLORS.gray400.g, COLORS.gray400.b);
    this.doc.text('éxito', statsX + 60, y + 14, { align: 'right' });

    this.currentY += cardHeight + 2;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CANDIDATOS
  // ══════════════════════════════════════════════════════════════════════════
  private drawCandidatesSection(): void {
    const startY = this.currentY;

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.setTextColor(COLORS.gray800.r, COLORS.gray800.g, COLORS.gray800.b);
    this.doc.text('LISTADO DE CANDIDATOS', this.margin, startY);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7);
    this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
    this.doc.text(`(${this.data.candidates.length} registros)`, this.margin + 55, startY);

    this.currentY = startY + 4;
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

    const drawTableHeader = () => {
      this.doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
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
    };

    drawTableHeader();

    const maxRows = 20;
    let rowsDrawn = 0;

    this.data.candidates.forEach((candidate, index) => {
      if (rowsDrawn >= maxRows) {
        this.doc.addPage();
        this.currentPage++;
        this.currentY = this.margin + 5;
        drawTableHeader();
        rowsDrawn = 0;
      }

      // alternado
      this.doc.setFillColor(
        index % 2 === 0 ? COLORS.white.r : COLORS.gray50.r,
        index % 2 === 0 ? COLORS.white.g : COLORS.gray50.g,
        index % 2 === 0 ? COLORS.white.b : COLORS.gray50.b
      );
      this.doc.rect(this.margin, this.currentY, this.contentWidth, rowHeight, 'F');

      // Base font (IMPORTANTE antes de fitText)
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(5.5);
      this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);

      const padX = 2;

      // ✅ PASO 3: cortar por ancho real (mm)
      const nameTxt = this.fitText(candidate.full_name, cols.name.width - padX * 2);
      const emailTxt = this.fitText(candidate.email, cols.email.width - padX * 2);
      const profTxt = this.fitText(candidate.profile_title, cols.profile.width - padX * 2);

      this.doc.text(String(index + 1), cols.num.x + padX, this.currentY + 4);
      this.doc.text(nameTxt, cols.name.x + padX, this.currentY + 4);
      this.doc.text(emailTxt, cols.email.x + padX, this.currentY + 4);
      this.doc.text(profTxt, cols.profile.x + padX, this.currentY + 4);

      // Estado (color + fit)
      const statusColor = getStatusColor(candidate.status);
      this.doc.setTextColor(statusColor.r, statusColor.g, statusColor.b);
      this.doc.setFont('helvetica', 'bold');
      const statusTxt = this.fitText(getStatusLabel(candidate.status), cols.status.width - padX * 2);
      this.doc.text(statusTxt, cols.status.x + padX, this.currentY + 4);

      // Match
      const score = Number.isFinite(candidate.matching_score) ? candidate.matching_score : 0;
      const matchColor = score >= 70 ? COLORS.success : score >= 40 ? COLORS.warning : COLORS.gray500;
      this.doc.setTextColor(matchColor.r, matchColor.g, matchColor.b);
      this.doc.text(`${score}%`, cols.match.x + padX, this.currentY + 4);

      this.currentY += rowHeight;
      rowsDrawn++;
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
    this.doc.text('BAUSEN | Sistema de Gestión de Talento', this.margin, footerY);

    this.doc.setFont('helvetica', 'italic');
    this.doc.text('Documento confidencial', this.pageWidth / 2, footerY, { align: 'center' });

    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Página ${currentPage} de ${totalPages}`, this.pageWidth - this.margin, footerY, { align: 'right' });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MARCA DE AGUA
  // ══════════════════════════════════════════════════════════════════════════
  private aplicarMarcaAgua(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyDoc = this.doc as any;

      const props = anyDoc.getImageProperties(BECHAPRA_WATERMARK_B_BASE64);
      const ratio = props.width / props.height;

      const wmW = this.pageWidth * 0.75;
      const wmH = wmW / ratio;

      const x = -18;
      const y = this.pageHeight - wmH + 12;

      if (typeof anyDoc.saveGraphicsState === 'function') anyDoc.saveGraphicsState();

      const hasGState = typeof anyDoc.GState === 'function' && typeof anyDoc.setGState === 'function';
      if (hasGState) anyDoc.setGState(new anyDoc.GState({ opacity: 0.05 }));

      anyDoc.addImage(BECHAPRA_WATERMARK_B_BASE64, 'PNG', x, y, wmW, wmH, undefined, 'FAST');

      if (hasGState) anyDoc.setGState(new anyDoc.GState({ opacity: 1 }));
      if (typeof anyDoc.restoreGraphicsState === 'function') anyDoc.restoreGraphicsState();
    } catch {
      // ignore
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// FUNCIÓN EXPORTADA
// ════════════════════════════════════════════════════════════════════════════
export function downloadConsolidatedReportPDF(data: ConsolidatedReportData, filename: string): void {
  const generator = new ConsolidatedReportPDF();
  const pdf = generator.generate(data);
  pdf.save(filename);
}

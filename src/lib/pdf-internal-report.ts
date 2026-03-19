/**
 * ════════════════════════════════════════════════════════════════════════════
 * PDF INTERNAL REPORT - REPORTE INTERNO PARA DIRECTORES Y SUPERVISORES
 * ════════════════════════════════════════════════════════════════════════════
 * Dashboard KPIs, detalle de clientes, candidatos con estado/historial,
 * perfiles con tasa de cumplimiento y días restantes, perfiles/clientes
 * estancados, resumen por estado.
 * ════════════════════════════════════════════════════════════════════════════
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { BAUSEN_LOGO_BASE64, BAUSEN_LOGO_RATIO } from './logo-base64';
import { BAUSEN_LOGO_WHITE_BASE64, BAUSEN_LOGO_WHITE_RATIO } from './logo-white-base64';
import { BECHAPRA_WATERMARK_B_BASE64 } from './watermarkBase64';
import { drawReportCover } from './pdf-cover-utils';

// ════════════════════════════════════════════════════════════════════════════
// COLORES
// ════════════════════════════════════════════════════════════════════════════
const C = {
  primary:    { r: 0,   g: 51,  b: 160 },
  primaryLt:  { r: 59,  g: 130, b: 246 },
  success:    { r: 16,  g: 185, b: 129 },
  warning:    { r: 245, g: 158, b: 11  },
  error:      { r: 239, g: 68,  b: 68  },
  purple:     { r: 139, g: 92,  b: 246 },
  orange:     { r: 249, g: 115, b: 22  },
  white:      { r: 255, g: 255, b: 255 },
  gray900:    { r: 17,  g: 24,  b: 39  },
  gray800:    { r: 31,  g: 41,  b: 55  },
  gray700:    { r: 55,  g: 65,  b: 81  },
  gray600:    { r: 75,  g: 85,  b: 99  },
  gray500:    { r: 107, g: 114, b: 128 },
  gray400:    { r: 156, g: 163, b: 175 },
  gray300:    { r: 209, g: 213, b: 219 },
  gray200:    { r: 229, g: 231, b: 235 },
  gray100:    { r: 243, g: 244, b: 246 },
  gray50:     { r: 249, g: 250, b: 251 },
};

// ════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ════════════════════════════════════════════════════════════════════════════
interface StatusHistoryEntry {
  from_status: string;
  to_status: string;
  changed_by: string;
  timestamp: string;
  notes: string;
}

interface ProfileItem {
  id: number;
  position_title: string;
  client_name: string;
  client_id: number;
  status: string;
  status_display: string;
  priority: string;
  priority_display: string;
  service_type: string;
  location: string;
  salary_range: string;
  positions: number;
  candidates_count: number;
  shortlisted_count: number;
  accepted_count: number;
  fulfillment_rate: number;
  days_open: number;
  days_remaining: number | null;
  deadline: string | null;
  assigned_to: string;
  created_at: string;
  status_history: StatusHistoryEntry[];
}

interface ClientItem {
  id: number;
  company_name: string;
  industry: string;
  contact_name: string;
  contact_email: string;
  total_profiles: number;
  active_profiles: number;
  completed_profiles: number;
  total_candidates: number;
  profiles_by_status: Record<string, number>;
  success_rate: number;
}

interface CandidateItem {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  candidate_status: string;
  candidate_status_display: string;
  application_status: string;
  application_status_display: string;
  profile_id: number;
  profile_title: string;
  client_name: string;
  match_percentage: number;
  overall_rating: number;
  applied_at: string;
  current_position: string;
  years_experience: number;
}

interface StalledProfile {
  id: number;
  position_title: string;
  client_name: string;
  status: string;
  status_display: string;
  days_stalled: number;
  deadline: string | null;
  days_overdue: number;
  assigned_to: string;
  last_update: string;
}

interface StalledClient {
  id: number;
  company_name: string;
  industry: string;
  last_profile_date: string;
  total_profiles: number;
}

export interface InternalReportData {
  kpis: {
    total_clients: number;
    total_candidates: number;
    total_profiles: number;
    active_profiles: number;
    completed_profiles: number;
    hired_candidates: number;
    compliance_rate: number;
  };
  profiles_by_status: Record<string, number>;
  candidates_by_status: Record<string, number>;
  clients: ClientItem[];
  profiles: ProfileItem[];
  candidates: CandidateItem[];
  stalled_profiles: StalledProfile[];
  stalled_clients: StalledClient[];
  generated_at: string;
  includeCover?: boolean;
  cover_subtitle?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ════════════════════════════════════════════════════════════════════════════
function safe(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s = String(value);
  s = s.replace(/[\uFEFF\u200B\u200C\u200D\u2060\u00AD]/g, '');
  s = s.replace(/[\r\n]+/g, ' ').replace(/\t+/g, '');
  s = s.replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '');
  try { s = s.replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}/gu, ''); } catch { /* ignore */ }
  return s.replace(/\s+/g, ' ').trim();
}

function tint(color: { r: number; g: number; b: number }, amount = 0.86) {
  return {
    r: Math.round(color.r + (255 - color.r) * amount),
    g: Math.round(color.g + (255 - color.g) * amount),
    b: Math.round(color.b + (255 - color.b) * amount),
  };
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: 'Borrador', pending: 'Pendiente', approved: 'Aprobado',
    in_progress: 'En Proceso', candidates_found: 'Candidatos', in_evaluation: 'Evaluación',
    in_interview: 'Entrevistas', finalists: 'Finalistas', completed: 'Completado',
    cancelled: 'Cancelado', new: 'Nuevo', screening: 'Revisión', qualified: 'Calificado',
    shortlisted: 'Preselección', interview: 'Entrevista', interview_scheduled: 'Entrevista Prog.',
    interviewed: 'Entrevistado', offer: 'Oferta', offered: 'Ofertado', hired: 'Contratado',
    rejected: 'Rechazado', withdrawn: 'Retirado', applied: 'Aplicó', accepted: 'Aceptado',
  };
  return labels[status] || status || 'N/A';
}

function statusColor(status: string): { r: number; g: number; b: number } {
  const s = (status || '').toLowerCase();
  if (s.includes('complet') || s === 'hired' || s === 'accepted') return C.success;
  if (s === 'cancelled' || s === 'rejected') return C.error;
  if (s === 'pending' || s === 'screening' || s === 'new' || s === 'applied') return C.warning;
  if (s.includes('interview') || s === 'shortlisted' || s === 'finalists') return C.purple;
  if (s.includes('offer')) return C.orange;
  if (s === 'in_progress' || s === 'approved' || s === 'qualified') return C.primaryLt;
  return C.gray500;
}

// ════════════════════════════════════════════════════════════════════════════
// CLASE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
class InternalReportPDF {
  private doc: jsPDF;
  private W: number;
  private H: number;
  private M = 12;
  private y: number;
  private cw: number;
  private page = 1;
  private includeCover: boolean = true;
  private introPages = 0;

  constructor() {
    this.doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    this.W = this.doc.internal.pageSize.getWidth();
    this.H = this.doc.internal.pageSize.getHeight();
    this.y = this.M;
    this.cw = this.W - this.M * 2;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UTILIDAD: fit text
  // ─────────────────────────────────────────────────────────────────────────
  private fit(text: string, maxW: number): string {
    const t = safe(text);
    if (this.doc.getTextWidth(t) <= maxW) return t;
    let out = t;
    while (out.length > 0 && this.doc.getTextWidth(out + '...') > maxW) out = out.slice(0, -1);
    return out.length ? out + '...' : '...';
  }

  private newPageIfNeeded(space: number): void {
    if (this.y + space > this.H - 18) {
      this.doc.addPage();
      this.page++;
      this.y = this.M + 5;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SECCIÓN TITLE helper
  // ─────────────────────────────────────────────────────────────────────────
  private sectionTitle(text: string): void {
    this.newPageIfNeeded(20);
    // Línea decorativa
    this.doc.setFillColor(C.primary.r, C.primary.g, C.primary.b);
    this.doc.rect(this.M, this.y, this.cw, 7, 'F');
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(text, this.M + 4, this.y + 5);
    this.y += 10;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // GENERAR
  // ═══════════════════════════════════════════════════════════════════════
  public generate(data: InternalReportData): jsPDF {
    // Requisito actual: reporte interno SIN portada
    this.includeCover = false;
    this.introPages = 0;
    this.page = 1;
    this.y = this.M;

    this.drawHeader();
    this.drawExecutiveSummary(data);
    this.drawKPIs(data.kpis);
    this.drawStatusSummary(data.profiles_by_status, data.candidates_by_status, data.kpis);
    this.drawClientsSection(data.clients);
    this.drawProfilesSection(data.profiles);
    this.drawProfilesStatusHistory(data.profiles);
    this.drawStalledSection(data.stalled_profiles, data.stalled_clients);
    this.drawCandidatesSection(data.candidates);
    this.drawClientExecutiveSummaryPages(data);

    // Footer + watermark en todas las páginas
    const totalPages = this.doc.getNumberOfPages();
    const totalContentPages = Math.max(totalPages, 1);

    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i);
      this.drawFooter(i, totalContentPages);
      this.drawWatermark();
    }

    return this.doc;
  }

  private drawClientExecutiveSummaryPages(data: InternalReportData): number {
    const profileCandidateMap: Record<number, CandidateItem[]> = {};
    const profileCandidateFallback: Record<string, CandidateItem[]> = {};

    (data.candidates || []).forEach((c) => {
      if (c.profile_id) {
        if (!profileCandidateMap[c.profile_id]) profileCandidateMap[c.profile_id] = [];
        profileCandidateMap[c.profile_id].push(c);
      }

      const fallbackKey = `${safe(c.client_name || 'N/D')}::${safe(c.profile_title || 'N/D')}`;
      if (!profileCandidateFallback[fallbackKey]) profileCandidateFallback[fallbackKey] = [];
      profileCandidateFallback[fallbackKey].push(c);
    });

    const complianceLabel = (profile: ProfileItem): string => {
      const st = (profile.status || '').toLowerCase();
      if (st.includes('complet') || st.includes('hired') || st.includes('cerrad')) return 'Cumplido';
      const remaining = profile.days_remaining;
      if (remaining === null || remaining === undefined) return 'Sin fecha definida';
      if (remaining < 0) return 'Atrasado';
      if (remaining === 0) return 'Vence hoy';
      if (remaining <= 7) return 'En riesgo';
      return 'En tiempo';
    };

    const details = [...(data.profiles || [])]
      .sort((a, b) => {
        const ar = a.days_remaining ?? 9999;
        const br = b.days_remaining ?? 9999;
        if (ar !== br) return ar - br;
        return safe(a.client_name).localeCompare(safe(b.client_name));
      })
      .map((profile) => {
        const fallbackKey = `${safe(profile.client_name || 'N/D')}::${safe(profile.position_title || 'N/D')}`;
        const relatedCandidates = profileCandidateMap[profile.id] || profileCandidateFallback[fallbackKey] || [];

        const avgMatch = relatedCandidates.length
          ? `${(relatedCandidates.reduce((acc, c) => acc + Number(c.match_percentage || 0), 0) / relatedCandidates.length).toFixed(1)}%`
          : 'N/D';

        return {
          client: safe(profile.client_name || 'N/D'),
          profile: safe(profile.position_title || 'N/D'),
          profileStatus: safe(profile.status_display || statusLabel(profile.status || '') || 'N/D'),
          deadline: safe(profile.deadline || 'Sin fecha'),
          candidatesApplied: String(profile.candidates_count ?? relatedCandidates.length ?? 0),
          avgMatch,
          complianceVsDate: complianceLabel(profile),
          fulfillmentRate: `${Number(profile.fulfillment_rate || 0).toFixed(1)}%`,
        };
      });

    const cardsPerPage = 5;
    const totalPages = Math.max(1, Math.ceil(details.length / cardsPerPage));

    for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
      this.doc.addPage();

      this.doc.setFillColor(C.white.r, C.white.g, C.white.b);
      this.doc.rect(0, 0, this.W, this.H, 'F');

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(22);
      this.doc.setTextColor(C.primary.r, C.primary.g, C.primary.b);
      this.doc.text('Detalles del Reporte', this.W / 2, 22, { align: 'center' });

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(10);
      this.doc.setTextColor(C.gray700.r, C.gray700.g, C.gray700.b);
      this.doc.text('Resumen con detalle de perfil por cliente', this.W / 2, 28, { align: 'center' });

      this.doc.setFillColor(255, 255, 255);
      this.doc.roundedRect(this.M, 33, this.cw, this.H - 47, 4, 4, 'F');
      this.doc.setDrawColor(224, 231, 255);
      this.doc.setLineWidth(0.5);
      this.doc.roundedRect(this.M, 33, this.cw, this.H - 47, 4, 4, 'S');

      let currentY = 40;
      const start = pageIdx * cardsPerPage;
      const end = Math.min(start + cardsPerPage, details.length);

      if (details.length === 0) {
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(10);
        this.doc.setTextColor(C.gray700.r, C.gray700.g, C.gray700.b);
        this.doc.text('No hay perfiles disponibles para mostrar.', this.W / 2, 52, { align: 'center' });
      }

      for (let i = start; i < end; i++) {
        const card = details[i];
        const cardX = this.M + 3;
        const cardW = this.cw - 6;
        const cardH = 41;

        this.doc.setFillColor(248, 250, 252);
        this.doc.roundedRect(cardX, currentY, cardW, cardH, 3, 3, 'F');
        this.doc.setDrawColor(226, 232, 240);
        this.doc.setLineWidth(0.35);
        this.doc.roundedRect(cardX, currentY, cardW, cardH, 3, 3, 'S');

        this.doc.setFillColor(235, 244, 255);
        this.doc.roundedRect(cardX, currentY, cardW, 7, 3, 3, 'F');

        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(8.5);
        this.doc.setTextColor(C.primary.r, C.primary.g, C.primary.b);
        this.doc.text(this.fit(`${card.client} • ${card.profile}`, cardW - 8), cardX + 3, currentY + 5);

        const leftX = cardX + 3;
        const rightX = cardX + cardW / 2 + 2;
        const drawField = (label: string, value: string, x: number, y: number, maxW: number) => {
          this.doc.setFont('helvetica', 'bold');
          this.doc.setFontSize(6.8);
          this.doc.setTextColor(C.gray600.r, C.gray600.g, C.gray600.b);
          this.doc.text(`${label}:`, x, y);

          this.doc.setFont('helvetica', 'normal');
          this.doc.setTextColor(C.gray800.r, C.gray800.g, C.gray800.b);
          this.doc.text(this.fit(value || 'N/D', maxW), x + 28, y);
        };

        const row1 = currentY + 12;
        drawField('Cliente', card.client, leftX, row1, 56);
        drawField('Perfil', card.profile, rightX, row1, 50);

        const row2 = currentY + 18;
        drawField('Estatus del Perfil', card.profileStatus, leftX, row2, 56);
        drawField('Fecha Cumplimiento', card.deadline, rightX, row2, 50);

        const row3 = currentY + 24;
        drawField('Candidatos Aplicados', card.candidatesApplied, leftX, row3, 56);
        drawField('Match Promedio', card.avgMatch, rightX, row3, 50);

        const row4 = currentY + 30;
        drawField('Cumplimiento vs Fecha', card.complianceVsDate, leftX, row4, 56);
        drawField('Cumplimiento Perfil', card.fulfillmentRate, rightX, row4, 50);

        currentY += cardH + 3.5;
      }

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(8);
      this.doc.setTextColor(C.gray500.r, C.gray500.g, C.gray500.b);
      this.doc.text(`Bausen Reclutamiento • Documento confidencial • ${pageIdx + 1}/${totalPages}`, this.W / 2, this.H - 7, { align: 'center' });
    }

    return totalPages;
  }

  private drawExecutiveSummary(data: InternalReportData): void {
    this.newPageIfNeeded(34);

    const x = this.M;
    const y = this.y;
    const w = this.cw;
    const h = 28;

    const companiesWithActiveProfiles = (data.clients || []).filter(c => (c.active_profiles || 0) > 0).length;

    const rows: Array<[string, string | number, string, string | number]> = [
      ['Empresas (Clientes)', data.kpis.total_clients, 'Empresas con perfiles activos', companiesWithActiveProfiles],
      ['Perfiles Totales', data.kpis.total_profiles, 'Perfiles Activos', data.kpis.active_profiles],
      ['Perfiles Completados', data.kpis.completed_profiles, 'Cumplimiento Global', `${data.kpis.compliance_rate}%`],
      ['Candidatos Totales', data.kpis.total_candidates, 'Contratados', data.kpis.hired_candidates],
    ];

    this.doc.setFillColor(C.white.r, C.white.g, C.white.b);
    this.doc.roundedRect(x, y, w, h, 2, 2, 'F');
    this.doc.setDrawColor(C.gray200.r, C.gray200.g, C.gray200.b);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(x, y, w, h, 2, 2, 'S');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    this.doc.setTextColor(C.gray800.r, C.gray800.g, C.gray800.b);
    this.doc.text('RESUMEN GENERAL', x + 3, y + 5.5);

    const leftX = x + 3;
    const rightX = x + w / 2 + 2;
    let rowY = y + 10;

    rows.forEach(([leftLabel, leftValue, rightLabel, rightValue]) => {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6.2);
      this.doc.setTextColor(C.gray600.r, C.gray600.g, C.gray600.b);
      this.doc.text(`${leftLabel}:`, leftX, rowY);
      this.doc.text(`${rightLabel}:`, rightX, rowY);

      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(C.gray800.r, C.gray800.g, C.gray800.b);
      this.doc.text(String(leftValue ?? 'N/D'), leftX + 30, rowY);
      this.doc.text(String(rightValue ?? 'N/D'), rightX + 40, rowY);

      rowY += 4.5;
    });

    this.y += h + 5;
  }

  private drawCoverPage(data: InternalReportData): void {
    const profileRef = data.profiles?.length
      ? [...data.profiles]
          .sort((a, b) => {
            const ar = a.days_remaining ?? 9999;
            const br = b.days_remaining ?? 9999;
            return ar - br;
          })[0]
      : undefined;

    const clientRef = profileRef?.client_name
      || (data.clients?.length ? [...data.clients].sort((a, b) => b.active_profiles - a.active_profiles)[0].company_name : 'N/D');

    const avgMatch = data.candidates?.length
      ? `${(data.candidates.reduce((acc, c) => acc + Number(c.match_percentage || 0), 0) / data.candidates.length).toFixed(1)}%`
      : 'N/D';

    const complianceStatus = (() => {
      const st = (profileRef?.status || '').toLowerCase();
      if (st.includes('complet') || st.includes('hired') || st.includes('cerrad')) return 'Cumplido';
      const remaining = profileRef?.days_remaining;
      if (remaining === null || remaining === undefined) return 'Sin fecha definida';
      if (remaining < 0) return 'Atrasado';
      if (remaining === 0) return 'Vence hoy';
      if (remaining <= 7) return 'En riesgo';
      return 'En tiempo';
    })();

    drawReportCover(this.doc, {
      title: 'Reporte Interno',
      subtitle: data.cover_subtitle || 'Reporte ejecutivo para dirección y supervisión de operación',
      logoBase64: BAUSEN_LOGO_WHITE_BASE64,
      logoRatio: BAUSEN_LOGO_WHITE_RATIO,
      generatedAt: new Date(),
      metadata: [
        { label: 'Cliente', value: clientRef },
        { label: 'Perfil', value: profileRef?.position_title || 'N/D' },
        { label: 'Estatus del Perfil', value: profileRef?.status_display || statusLabel(profileRef?.status || '') || 'N/D' },
        { label: 'Fecha de Cumplimiento', value: profileRef?.deadline || 'N/D' },
        { label: 'Candidatos Aplicados', value: profileRef?.candidates_count ?? data.kpis.total_candidates },
        { label: 'Match Promedio', value: avgMatch },
        { label: 'Cumplimiento vs Fecha', value: complianceStatus },
      ],
      footerText: 'Bausen Reclutamiento • Documento confidencial',
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // HEADER
  // ═══════════════════════════════════════════════════════════════════════
  private drawHeader(): void {
    const hH = 28;

    this.doc.setFillColor(C.white.r, C.white.g, C.white.b);
    this.doc.rect(0, 0, this.W, hH, 'F');

    // Logo
    const logoH = 11;
    const logoW = logoH * BAUSEN_LOGO_RATIO;
    try {
      this.doc.addImage(BAUSEN_LOGO_BASE64, 'PNG', this.M, 4, logoW, logoH);
    } catch {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(14);
      this.doc.setTextColor(C.primary.r, C.primary.g, C.primary.b);
      this.doc.text('BAUSEN', this.M, 12);
    }

    // Título
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(14);
    this.doc.setTextColor(C.gray900.r, C.gray900.g, C.gray900.b);
    this.doc.text('REPORTE INTERNO', this.W / 2, 10, { align: 'center' });

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(C.gray600.r, C.gray600.g, C.gray600.b);
    this.doc.text('Directores y Supervisores - Documento Confidencial', this.W / 2, 16, { align: 'center' });

    // Fecha
    const fecha = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    this.doc.setFontSize(7);
    this.doc.setTextColor(C.gray500.r, C.gray500.g, C.gray500.b);
    this.doc.text(fecha, this.W - this.M, 22, { align: 'right' });

    // Línea azul
    this.doc.setFillColor(C.primary.r, C.primary.g, C.primary.b);
    this.doc.rect(0, hH - 1.5, this.W, 1.5, 'F');

    this.y = hH + 3;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // KPIs DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════
  private drawKPIs(kpis: InternalReportData['kpis']): void {

    const items = [
      { label: 'Clientes',     value: String(kpis.total_clients),      sub: 'Activos',     color: C.success },
      { label: 'Perfiles',     value: String(kpis.total_profiles),     sub: 'Total',        color: C.primary },
      { label: 'Activos',      value: String(kpis.active_profiles),    sub: 'Perfiles',     color: C.primaryLt },
      { label: 'Completados',  value: String(kpis.completed_profiles), sub: 'Perfiles',     color: C.orange },
      { label: 'Candidatos',   value: String(kpis.total_candidates),   sub: 'Registrados',  color: C.purple },
      { label: 'Contratados',  value: String(kpis.hired_candidates),   sub: 'Candidatos',   color: C.success },
      { label: 'Cumplimiento', value: `${kpis.compliance_rate}%`,      sub: 'Tasa global',  color: C.warning },
    ];

    const cardW = (this.cw - (items.length - 1) * 2.5) / items.length;
    const cardH = 22;

    items.forEach((kpi, i) => {
      const x = this.M + (cardW + 2.5) * i;

      // Card bg
      this.doc.setFillColor(C.white.r, C.white.g, C.white.b);
      this.doc.roundedRect(x, this.y, cardW, cardH, 2, 2, 'F');
      this.doc.setDrawColor(C.gray200.r, C.gray200.g, C.gray200.b);
      this.doc.setLineWidth(0.3);
      this.doc.roundedRect(x, this.y, cardW, cardH, 2, 2, 'S');

      // Color top stripe
      this.doc.setFillColor(kpi.color.r, kpi.color.g, kpi.color.b);
      this.doc.roundedRect(x, this.y, cardW, 2, 2, 2, 'F');

      // Value
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(12);
      this.doc.setTextColor(kpi.color.r, kpi.color.g, kpi.color.b);
      this.doc.text(kpi.value, x + cardW / 2, this.y + 11, { align: 'center' });

      // Label
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5.5);
      this.doc.setTextColor(C.gray700.r, C.gray700.g, C.gray700.b);
      this.doc.text(kpi.label, x + cardW / 2, this.y + 16, { align: 'center' });

      // Sub
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(4.5);
      this.doc.setTextColor(C.gray400.r, C.gray400.g, C.gray400.b);
      this.doc.text(kpi.sub, x + cardW / 2, this.y + 19.5, { align: 'center' });
    });

    this.y += cardH + 5;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RESUMEN POR ESTADOS
  // ═══════════════════════════════════════════════════════════════════════
  private drawStatusSummary(
    profilesStatus: Record<string, number>,
    candidatesStatus: Record<string, number>,
    kpis: InternalReportData['kpis']
  ): void {
    const halfW = (this.cw - 4) / 2;
    const cardH = 40;

    this.drawStatusCard(this.M, this.y, halfW, cardH, 'PERFILES POR ESTATUS', profilesStatus, kpis.total_profiles);
    this.drawStatusCard(this.M + halfW + 4, this.y, halfW, cardH, 'CANDIDATOS POR ESTATUS', candidatesStatus, kpis.total_candidates);

    this.y += cardH + 5;
  }

  private drawStatusCard(
    x: number, y: number, w: number, h: number,
    title: string, data: Record<string, number>, total: number
  ): void {
    this.doc.setFillColor(C.gray50.r, C.gray50.g, C.gray50.b);
    this.doc.roundedRect(x, y, w, h, 2, 2, 'F');
    this.doc.setDrawColor(C.gray200.r, C.gray200.g, C.gray200.b);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(x, y, w, h, 2, 2, 'S');

    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7);
    this.doc.setTextColor(C.gray700.r, C.gray700.g, C.gray700.b);
    this.doc.text(title, x + 3, y + 6);

    const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]).slice(0, 6);
    let itemY = y + 11;
    const barMax = w - 35;

    entries.forEach(([status, count]) => {
      const proportion = total > 0 ? count / total : 0;
      const barW = barMax * proportion;
      const sc = statusColor(status);

      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(5.5);
      this.doc.setTextColor(C.gray600.r, C.gray600.g, C.gray600.b);
      this.doc.text(this.fit(statusLabel(status), 22), x + 3, itemY + 2);

      const barX = x + 28;
      this.doc.setFillColor(C.gray200.r, C.gray200.g, C.gray200.b);
      this.doc.roundedRect(barX, itemY - 1, barMax, 3, 0.5, 0.5, 'F');
      if (barW > 0) {
        this.doc.setFillColor(sc.r, sc.g, sc.b);
        this.doc.roundedRect(barX, itemY - 1, Math.max(barW, 2), 3, 0.5, 0.5, 'F');
      }

      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(5.5);
      this.doc.setTextColor(C.gray700.r, C.gray700.g, C.gray700.b);
      this.doc.text(String(count), x + w - 5, itemY + 2, { align: 'right' });

      itemY += 5;
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CLIENTES
  // ═══════════════════════════════════════════════════════════════════════
  private drawClientsSection(clients: ClientItem[]): void {
    if (!clients.length) return;
    this.sectionTitle('DETALLE DE CLIENTES');

    const body = clients.map((c, i) => [
      String(i + 1),
      safe(c.company_name),
      safe(c.industry),
      String(c.total_profiles),
      String(c.active_profiles),
      String(c.completed_profiles),
      String(c.total_candidates),
      `${c.success_rate}%`,
    ]);

    autoTable(this.doc, {
      startY: this.y,
      head: [['#', 'Empresa', 'Industria', 'Perfiles', 'Activos', 'Complet.', 'Candidatos', 'Éxito']],
      body,
      theme: 'grid',
      styles: { fontSize: 6.5, cellPadding: 1.5, textColor: [C.gray800.r, C.gray800.g, C.gray800.b] },
      headStyles: {
        fillColor: [C.primary.r, C.primary.g, C.primary.b],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 6.5,
      },
      alternateRowStyles: { fillColor: [C.gray50.r, C.gray50.g, C.gray50.b] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 40 },
        2: { cellWidth: 28 },
        3: { cellWidth: 16, halign: 'center' },
        4: { cellWidth: 16, halign: 'center' },
        5: { cellWidth: 16, halign: 'center' },
        6: { cellWidth: 20, halign: 'center' },
        7: { cellWidth: 16, halign: 'center' },
      },
      margin: { left: this.M, right: this.M },
      didDrawPage: () => { this.page++; },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.y = (this.doc as any).lastAutoTable.finalY + 5;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PERFILES
  // ═══════════════════════════════════════════════════════════════════════
  private drawProfilesSection(profiles: ProfileItem[]): void {
    if (!profiles.length) return;
    this.sectionTitle('PERFILES DE RECLUTAMIENTO');

    const body = profiles.map((p, i) => [
      String(i + 1),
      safe(p.position_title),
      safe(p.client_name),
      safe(p.status_display),
      safe(p.priority_display),
      String(p.candidates_count),
      `${p.fulfillment_rate}%`,
      p.days_remaining !== null ? `${p.days_remaining}d` : '-',
      p.deadline ? safe(p.deadline) : '-',
      safe(p.assigned_to),
    ]);

    autoTable(this.doc, {
      startY: this.y,
      head: [['#', 'Posición', 'Cliente', 'Estatus', 'Prioridad', 'Cand.', 'Cumpl.', 'Resta', 'Fecha límite', 'Supervisor']],
      body,
      theme: 'grid',
      styles: { fontSize: 6, cellPadding: 1.5, textColor: [C.gray800.r, C.gray800.g, C.gray800.b] },
      headStyles: {
        fillColor: [C.primary.r, C.primary.g, C.primary.b],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 6,
      },
      alternateRowStyles: { fillColor: [C.gray50.r, C.gray50.g, C.gray50.b] },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 33 },
        2: { cellWidth: 28 },
        3: { cellWidth: 20, halign: 'center' },
        4: { cellWidth: 17, halign: 'center' },
        5: { cellWidth: 11, halign: 'center' },
        6: { cellWidth: 12, halign: 'center' },
        7: { cellWidth: 12, halign: 'center' },
        8: { cellWidth: 18, halign: 'center' },
        9: { cellWidth: 22 },
      },
      margin: { left: this.M, right: this.M },
      willDrawCell: (data) => {
        if (data.section !== 'body') return;
        // Color de estatus
        if (data.column.index === 3) {
          const profile = profiles[data.row.index];
          if (profile) {
            const sc = statusColor(profile.status);
            data.cell.styles.textColor = [sc.r, sc.g, sc.b];
            data.cell.styles.fontStyle = 'bold';
          }
        }
        // Color de prioridad
        if (data.column.index === 4) {
          const profile = profiles[data.row.index];
          if (profile) {
            const prio = (profile.priority || '').toLowerCase();
            const pc = prio === 'urgent' || prio === 'high' ? C.error
              : prio === 'medium' ? C.warning : C.success;
            data.cell.styles.textColor = [pc.r, pc.g, pc.b];
            data.cell.styles.fontStyle = 'bold';
          }
        }
        // Color de cumplimiento
        if (data.column.index === 6) {
          const profile = profiles[data.row.index];
          if (profile) {
            const rate = profile.fulfillment_rate;
            const rc = rate >= 100 ? C.success : rate >= 50 ? C.warning : C.gray500;
            data.cell.styles.textColor = [rc.r, rc.g, rc.b];
            data.cell.styles.fontStyle = 'bold';
          }
        }
        // Color de días restantes
        if (data.column.index === 7) {
          const profile = profiles[data.row.index];
          if (profile && profile.days_remaining !== null) {
            const dc = profile.days_remaining <= 0 ? C.error
              : profile.days_remaining <= 7 ? C.warning : C.success;
            data.cell.styles.textColor = [dc.r, dc.g, dc.b];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      didDrawPage: () => { this.page++; },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.y = (this.doc as any).lastAutoTable.finalY + 3;
  }

  private drawProfilesStatusHistory(profiles: ProfileItem[]): void {
    // Historial de cambios de estado (solo perfiles con historial)
    const profilesWithHistory = profiles.filter(p => p.status_history && p.status_history.length > 0);
    if (profilesWithHistory.length > 0) {
      this.newPageIfNeeded(20);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(8);
      this.doc.setTextColor(C.gray700.r, C.gray700.g, C.gray700.b);
      this.doc.text('HISTORIAL DE CAMBIOS DE ESTATUS (ÚLTIMOS 5 POR PERFIL)', this.M, this.y);
      this.y += 4;

      const historyBody: string[][] = [];
      profilesWithHistory.forEach(p => {
        p.status_history.forEach(h => {
          historyBody.push([
            safe(p.position_title),
            statusLabel(h.from_status),
            statusLabel(h.to_status),
            safe(h.changed_by),
            safe(h.timestamp),
          ]);
        });
      });

      autoTable(this.doc, {
        startY: this.y,
        head: [['Perfil', 'Estatus Anterior', 'Nuevo Estatus', 'Cambió', 'Fecha']],
        body: historyBody.slice(0, 50),
        theme: 'grid',
        styles: { fontSize: 5.5, cellPadding: 1.2, textColor: [C.gray800.r, C.gray800.g, C.gray800.b] },
        headStyles: {
          fillColor: [C.purple.r, C.purple.g, C.purple.b],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 5.5,
        },
        alternateRowStyles: { fillColor: [C.gray50.r, C.gray50.g, C.gray50.b] },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 30 },
          2: { cellWidth: 30 },
          3: { cellWidth: 35 },
          4: { cellWidth: 30 },
        },
        margin: { left: this.M, right: this.M },
        didDrawPage: () => { this.page++; },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.y = (this.doc as any).lastAutoTable.finalY + 5;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CANDIDATOS
  // ═══════════════════════════════════════════════════════════════════════
  private drawCandidatesSection(candidates: CandidateItem[]): void {
    if (!candidates.length) return;
    this.sectionTitle(`CANDIDATOS (${candidates.length} registros)`);

    const shortDate = (value: string): string => {
      const raw = safe(value);
      if (!raw) return '-';
      if (raw.includes('T')) return raw.split('T')[0];
      if (raw.length > 10 && raw.includes('-')) return raw.slice(0, 10);
      return raw;
    };

    const contact = (c: CandidateItem): string => {
      const e = safe(c.email);
      const p = safe(c.phone);
      if (e && p) return `${e}\n${p}`;
      return e || p || 'N/D';
    };

    const body = candidates.map((c, i) => [
      String(i + 1),
      safe(c.full_name),
      contact(c),
      safe(c.current_position || '-'),
      safe(c.profile_title),
      safe(c.client_name),
      safe(c.candidate_status_display || statusLabel(c.candidate_status || '')),
      safe(c.application_status_display),
      Number(c.match_percentage || 0) > 0 ? `${Number(c.match_percentage || 0)}%` : 'ND',
      String(c.overall_rating ?? '-'),
      String(c.years_experience),
      shortDate(c.applied_at),
    ]);

    autoTable(this.doc, {
      startY: this.y,
      head: [['#', 'Candidato', 'Contacto', 'Posición actual', 'Perfil aplicado', 'Cliente', 'Estatus candidato', 'Estatus aplicación', 'Match', 'Rating', 'Exp.', 'Fecha apl.']],
      body,
      theme: 'grid',
      rowPageBreak: 'avoid',
      styles: { fontSize: 5, cellPadding: 1.1, textColor: [C.gray800.r, C.gray800.g, C.gray800.b], overflow: 'linebreak' },
      headStyles: {
        fillColor: [C.primary.r, C.primary.g, C.primary.b],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 4.9,
      },
      alternateRowStyles: { fillColor: [C.gray50.r, C.gray50.g, C.gray50.b] },
      columnStyles: {
        0: { cellWidth: 6, halign: 'center' },
        1: { cellWidth: 22 },
        2: { cellWidth: 21 },
        3: { cellWidth: 17 },
        4: { cellWidth: 21 },
        5: { cellWidth: 16 },
        6: { cellWidth: 17, halign: 'center' },
        7: { cellWidth: 17, halign: 'center' },
        8: { cellWidth: 10, halign: 'center' },
        9: { cellWidth: 10, halign: 'center' },
        10: { cellWidth: 8, halign: 'center' },
        11: { cellWidth: 13, halign: 'center' },
      },
      margin: { left: this.M, right: this.M },
      willDrawCell: (data) => {
        if (data.section !== 'body') return;
        if (data.column.index === 6) {
          const cand = candidates[data.row.index];
          if (cand) {
            const sc = statusColor(cand.candidate_status);
            data.cell.styles.textColor = [sc.r, sc.g, sc.b];
            data.cell.styles.fontStyle = 'bold';
          }
        }
        if (data.column.index === 7) {
          const cand = candidates[data.row.index];
          if (cand) {
            const sc = statusColor(cand.application_status);
            data.cell.styles.textColor = [sc.r, sc.g, sc.b];
            data.cell.styles.fontStyle = 'bold';
          }
        }
        if (data.column.index === 8) {
          const cand = candidates[data.row.index];
          if (cand) {
            const mc = cand.match_percentage >= 70 ? C.success
              : cand.match_percentage >= 40 ? C.warning : C.gray500;
            data.cell.styles.textColor = [mc.r, mc.g, mc.b];
            data.cell.styles.fontStyle = 'bold';
          }
        }
        if (data.column.index === 9) {
          const cand = candidates[data.row.index];
          if (cand) {
            const rating = Number(cand.overall_rating || 0);
            const rc = rating >= 4 ? C.success : rating >= 2.5 ? C.warning : C.gray500;
            data.cell.styles.textColor = [rc.r, rc.g, rc.b];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
      didDrawPage: () => { this.page++; },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.y = (this.doc as any).lastAutoTable.finalY + 5;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PERFILES/CLIENTES ESTANCADOS
  // ═══════════════════════════════════════════════════════════════════════
  private drawStalledSection(stalledProfiles: StalledProfile[], stalledClients: StalledClient[]): void {
    if (!stalledProfiles.length && !stalledClients.length) return;

    this.sectionTitle('ALERTAS: PERFILES Y CLIENTES ESTANCADOS');

    // Perfiles estancados
    if (stalledProfiles.length > 0) {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7);
      this.doc.setTextColor(C.error.r, C.error.g, C.error.b);
      this.doc.text(`Perfiles sin movimiento (${stalledProfiles.length})`, this.M, this.y);
      this.y += 3;

      const body = stalledProfiles.map(p => [
        safe(p.position_title),
        safe(p.client_name),
        safe(p.status_display),
        `${p.days_stalled} días`,
        p.deadline ? safe(p.deadline) : 'Sin fecha',
        p.days_overdue > 0 ? `${p.days_overdue} días` : '-',
        safe(p.assigned_to),
        safe(p.last_update),
      ]);

      autoTable(this.doc, {
        startY: this.y,
        head: [['Posición', 'Cliente', 'Estatus', 'Estancado', 'Fecha Límite', 'Días Retraso', 'Supervisor', 'Últ. Actualización']],
        body,
        theme: 'grid',
        styles: { fontSize: 5.5, cellPadding: 1.5, textColor: [C.gray800.r, C.gray800.g, C.gray800.b] },
        headStyles: {
          fillColor: [C.error.r, C.error.g, C.error.b],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 5.5,
        },
        alternateRowStyles: { fillColor: [249, 240, 240] },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 25 },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 20, halign: 'center' },
          5: { cellWidth: 18, halign: 'center' },
          6: { cellWidth: 28 },
          7: { cellWidth: 24, halign: 'center' },
        },
        margin: { left: this.M, right: this.M },
        willDrawCell: (data) => {
          if (data.section === 'body' && data.column.index === 5) {
            const sp = stalledProfiles[data.row.index];
            if (sp && sp.days_overdue > 0) {
              data.cell.styles.textColor = [C.error.r, C.error.g, C.error.b];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        },
        didDrawPage: () => { this.page++; },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.y = (this.doc as any).lastAutoTable.finalY + 5;
    }

    // Clientes sin actividad
    if (stalledClients.length > 0) {
      this.newPageIfNeeded(20);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7);
      this.doc.setTextColor(C.warning.r, C.warning.g, C.warning.b);
      this.doc.text(`Clientes sin perfiles activos (${stalledClients.length})`, this.M, this.y);
      this.y += 3;

      const body = stalledClients.map(c => [
        safe(c.company_name),
        safe(c.industry),
        String(c.total_profiles),
        safe(c.last_profile_date),
      ]);

      autoTable(this.doc, {
        startY: this.y,
        head: [['Empresa', 'Industria', 'Total Perfiles', 'Último Perfil']],
        body,
        theme: 'grid',
        styles: { fontSize: 6, cellPadding: 1.5, textColor: [C.gray800.r, C.gray800.g, C.gray800.b] },
        headStyles: {
          fillColor: [C.warning.r, C.warning.g, C.warning.b],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 6,
        },
        alternateRowStyles: { fillColor: [255, 251, 235] },
        margin: { left: this.M, right: this.M },
        didDrawPage: () => { this.page++; },
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.y = (this.doc as any).lastAutoTable.finalY + 5;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FOOTER
  // ═══════════════════════════════════════════════════════════════════════
  private drawFooter(current: number, total: number): void {
    const footerY = this.H - 8;

    this.doc.setDrawColor(C.gray300.r, C.gray300.g, C.gray300.b);
    this.doc.setLineWidth(0.3);
    this.doc.line(this.M, footerY - 3, this.W - this.M, footerY - 3);

    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6);
    this.doc.setTextColor(C.gray500.r, C.gray500.g, C.gray500.b);
    this.doc.text('BAUSEN | Sistema de Gestión de Talento', this.M, footerY);

    this.doc.setFont('helvetica', 'italic');
    this.doc.text('Documento confidencial - Solo para uso interno', this.W / 2, footerY, { align: 'center' });

    this.doc.setFont('helvetica', 'normal');
    this.doc.text(`Página ${current} de ${total}`, this.W - this.M, footerY, { align: 'right' });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MARCA DE AGUA
  // ═══════════════════════════════════════════════════════════════════════
  private drawWatermark(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d = this.doc as any;
      const props = d.getImageProperties(BECHAPRA_WATERMARK_B_BASE64);
      const ratio = props.width / props.height;
      const wmW = this.W * 0.75;
      const wmH = wmW / ratio;
      const x = -18;
      const y = this.H - wmH + 12;

      if (typeof d.saveGraphicsState === 'function') d.saveGraphicsState();
      const hasGState = typeof d.GState === 'function' && typeof d.setGState === 'function';
      if (hasGState) d.setGState(new d.GState({ opacity: 0.05 }));
      d.addImage(BECHAPRA_WATERMARK_B_BASE64, 'PNG', x, y, wmW, wmH, undefined, 'FAST');
      if (hasGState) d.setGState(new d.GState({ opacity: 1 }));
      if (typeof d.restoreGraphicsState === 'function') d.restoreGraphicsState();
    } catch {
      // ignore
    }
  }
}

// ════════════════════════════════════════════════════════════════════════════
// FUNCIONES EXPORTADAS
// ════════════════════════════════════════════════════════════════════════════
export function downloadInternalReportPDF(data: InternalReportData): void {
  const generator = new InternalReportPDF();
  const pdf = generator.generate(data);
  const fecha = new Date().toISOString().slice(0, 10);
  pdf.save(`Reporte_Interno_Bausen_${fecha}.pdf`);
}

export function generateInternalReportPDF(data: InternalReportData): jsPDF {
  const generator = new InternalReportPDF();
  return generator.generate(data);
}

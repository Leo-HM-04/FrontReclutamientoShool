/**
 * ════════════════════════════════════════════════════════════════════════════
 * PDF CLIENT REPORT - REPORTE DE CLIENTE (DASHBOARD MODERNO)
 * ════════════════════════════════════════════════════════════════════════════
 * Generador de PDF tipo dashboard para reportes de clientes
 * Diseño moderno con:
 * - Header blanco con logo y título centrado
 * - Cards KPI con barra superior de color
 * - Bloque de información del cliente
 * - Tabla de perfiles con badges
 * - Sección de notas
 * - Visualización de distribución por estado
 * - Footer corporativo
 * - Marca de agua
 * ════════════════════════════════════════════════════════════════════════════
 */

import jsPDF from 'jspdf';
import { BAUSEN_LOGO_BASE64, BAUSEN_LOGO_RATIO } from './logo-base64';
import { BAUSEN_LOGO_WHITE_BASE64, BAUSEN_LOGO_WHITE_RATIO } from './logo-white-base64';
import { BECHAPRA_WATERMARK_B_BASE64 } from './watermarkBase64';
import { drawReportCover } from './pdf-cover-utils';

// ════════════════════════════════════════════════════════════════════════════
// COLORES DEL TEMA (ESTILO DASHBOARD MODERNO)
// ════════════════════════════════════════════════════════════════════════════
const COLORS = {
  // Primarios (rojo corporativo para clientes)
  primary: { r: 220, g: 38, b: 38 },
  primaryDark: { r: 185, g: 28, b: 28 },
  primaryLight: { r: 254, g: 226, b: 226 },
  
  // Estados
  success: { r: 16, g: 185, b: 129 },
  successLight: { r: 209, g: 250, b: 229 },
  warning: { r: 245, g: 158, b: 11 },
  warningLight: { r: 254, g: 243, b: 199 },
  info: { r: 59, g: 130, b: 246 },
  infoLight: { r: 219, g: 234, b: 254 },
  purple: { r: 139, g: 92, b: 246 },
  purpleLight: { r: 237, g: 233, b: 254 },
  
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
// INTERFACES
// ════════════════════════════════════════════════════════════════════════════
export interface ClientReportData {
  client: {
    company_name: string;
    industry: string;
    website?: string;
    contact_name: string;
    contact_email: string;
    contact_phone: string;
    address?: string;
    city?: string;
    state?: string;
    notes?: string;
  };
  statistics: {
    total_profiles: number;
    completed_profiles: number;
    active_profiles: number;
    success_rate: number;
    avg_days_to_complete: number | null;
    total_candidates_managed: number;
  };
  profiles: Array<{
    title: string;
    status_display: string;
    priority: string;
    candidates_count: number;
    created_at: string;
    end_date?: string;
  }>;
  profiles_by_status: Record<string, number>;
  includeCover?: boolean;
  cover_subtitle?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// UTILIDADES
// ════════════════════════════════════════════════════════════════════════════

/**
 * Normaliza texto preservando acentos y ñ (UTF-8 correcto)
 */
function sanitizePDFText(value: any): string {
  if (value === null || value === undefined) return '';
  let s = String(value);

  // Entidades HTML
  s = s
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&');

  // Quitar NUL y caracteres de control (el % que te aparece)
  s = s
    .replace(/\u0000/g, '')
    .replace(/[\u0001-\u001F\u007F-\u009F]/g, ' ')
    .replace(/[\r\n\t]+/g, ' ');

  // Quitar emojis/pictogramas (evita "Ø=Ü..." por fuentes estándar)
  try {
    s = s.replace(/\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Emoji}\uFE0F/gu, '');
  } catch {
    // Fallback si tu runtime no soporta property escapes
    s = s.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '');
  }

  // Patrón típico de emoji ya roto: "Ø=Üx"
  s = s.replace(/Ø=Ü./g, '');

  // Mojibake CP437/CP850 que te sale seguido
  const map: Record<string, string> = {
    '├í': 'á', '├®': 'é', '├¡': 'í', '├ó': 'ó', '├│': 'ó', '├ú': 'ú', '├║': 'ú',
    '├ñ': 'ñ', '├▒': 'ñ',
    '├ü': 'Á', '├ë': 'É', '├ì': 'Í', '├ô': 'Ó', '├Ü': 'Ú', '├Ñ': 'Ñ',
  };
  s = s.replace(/├./g, (m) => map[m] ?? m);

  // Normalización final
  return s.normalize('NFC').replace(/\s+/g, ' ').trim();
}


/**
 * Trunca texto si excede longitud máxima
 */
function truncateText(text: string, maxLength: number): string {
  const cleaned = sanitizePDFText(text);
  if (cleaned.length <= maxLength) return cleaned;
  return cleaned.substring(0, maxLength - 3) + '...';
}

/**
 * Formatea fecha en formato español
 */
function formatDateES(dateStr: string): string {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-MX', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  } catch {
    return 'N/A';
  }
}

/**
 * Obtiene color según prioridad
 */
function getPriorityColor(priority: string): { bg: {r: number, g: number, b: number}, text: {r: number, g: number, b: number}, label: string } {
  const p = (priority || '').toLowerCase();
  if (p === 'high' || p === 'alta') {
    return { bg: { r: 254, g: 226, b: 226 }, text: { r: 185, g: 28, b: 28 }, label: 'ALTA' };
  }
  if (p === 'medium' || p === 'media') {
    return { bg: { r: 254, g: 243, b: 199 }, text: { r: 146, g: 64, b: 14 }, label: 'MEDIA' };
  }
  return { bg: { r: 220, g: 252, b: 231 }, text: { r: 22, g: 101, b: 52 }, label: 'BAJA' };
}

/**
 * Obtiene color según estado del perfil
 */
function getStatusColor(status: string): { bg: {r: number, g: number, b: number}, text: {r: number, g: number, b: number} } {
  const s = (status || '').toLowerCase();
  if (s.includes('activo') || s.includes('active') || s.includes('aprobado')) {
    return { bg: { r: 220, g: 252, b: 231 }, text: { r: 22, g: 101, b: 52 } };
  }
  if (s.includes('completado') || s.includes('completed') || s.includes('cerrado')) {
    return { bg: { r: 219, g: 234, b: 254 }, text: { r: 30, g: 64, b: 175 } };
  }
  if (s.includes('pendiente') || s.includes('pending')) {
    return { bg: { r: 254, g: 243, b: 199 }, text: { r: 146, g: 64, b: 14 } };
  }
  if (s.includes('cancelado') || s.includes('cancelled')) {
    return { bg: { r: 254, g: 226, b: 226 }, text: { r: 185, g: 28, b: 28 } };
  }
  return { bg: { r: 243, g: 244, b: 246 }, text: { r: 55, g: 65, b: 81 } };
}

/**
 * Obtiene nivel semáforo para días promedio
 */
function getDaysLevel(days: number | null): { color: {r: number, g: number, b: number}, label: string } {
  if (days === null || days === undefined) {
    return { color: COLORS.gray500, label: 'N/A' };
  }
  if (days <= 15) {
    return { color: COLORS.success, label: 'Rápido' };
  }
  if (days <= 30) {
    return { color: COLORS.warning, label: 'Normal' };
  }
  return { color: COLORS.primary, label: 'Lento' };
}

// ════════════════════════════════════════════════════════════════════════════
// CLASE PRINCIPAL
// ════════════════════════════════════════════════════════════════════════════
class ClientReportPDF {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private currentY: number;
  private contentWidth: number;
  private includeCover: boolean = true;

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
    });

    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.margin = 12;
    this.currentY = this.margin;
    this.contentWidth = this.pageWidth - this.margin * 2;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MÉTODO PRINCIPAL
  // ══════════════════════════════════════════════════════════════════════════
  public generate(data: ClientReportData): jsPDF {
    this.includeCover = data.includeCover !== false;

    // Normalizar datos
    const cleanData = this.normalizeData(data);

    if (this.includeCover) {
      this.drawCoverPage(cleanData);
      this.doc.addPage();
      this.currentY = this.margin;
    }
    
    // Dibujar secciones
    this.drawHeader(cleanData);
    this.drawClientInfoCard(cleanData);
    this.drawKPIDashboard(cleanData);
    this.drawStatusDistribution(cleanData);
    this.drawProfilesTable(cleanData);
    this.drawNotesSection(cleanData);
    this.drawFooter();
    this.aplicarMarcaAgua();

    return this.doc;
  }

  private drawCoverPage(data: ClientReportData): void {
    drawReportCover(this.doc, {
      title: 'Reporte de Cliente',
      subtitle: data.cover_subtitle || 'Reporte ejecutivo de desempeño, perfiles y resultados del cliente',
      logoBase64: BAUSEN_LOGO_WHITE_BASE64,
      logoRatio: BAUSEN_LOGO_WHITE_RATIO,
      generatedAt: new Date(),
      metadata: [
        { label: 'Cliente', value: data.client.company_name },
        { label: 'Industria', value: data.client.industry },
        { label: 'Perfiles', value: data.statistics.total_profiles },
        { label: 'Éxito', value: `${data.statistics.success_rate}%` },
      ],
      footerText: 'Bausen Reclutamiento • Documento ejecutivo',
    });
  }

  /**
   * Normaliza todos los datos para UTF-8 correcto
   */
  private normalizeData(data: ClientReportData): ClientReportData {
  // limpiar keys de status (y sumar si se duplican al sanear)
  const cleanedByStatus: Record<string, number> = {};
  for (const [k, v] of Object.entries(data.profiles_by_status || {})) {
    const ck = sanitizePDFText(k) || 'Sin estado';
    cleanedByStatus[ck] = (cleanedByStatus[ck] || 0) + (v || 0);
  }

  return {
    client: {
      company_name: sanitizePDFText(data.client.company_name),
      industry: sanitizePDFText(data.client.industry),
      website: sanitizePDFText(data.client.website || ''),
      contact_name: sanitizePDFText(data.client.contact_name),
      contact_email: sanitizePDFText(data.client.contact_email),
      contact_phone: sanitizePDFText(data.client.contact_phone),
      address: sanitizePDFText(data.client.address || ''),
      city: sanitizePDFText(data.client.city || ''),
      state: sanitizePDFText(data.client.state || ''),
      notes: sanitizePDFText(data.client.notes || ''),
    },
    statistics: { ...data.statistics },
    profiles: (data.profiles || []).map(p => ({
      title: sanitizePDFText(p.title),
      status_display: sanitizePDFText(p.status_display),
      priority: sanitizePDFText(p.priority),
      candidates_count: p.candidates_count || 0,
      created_at: p.created_at,
      end_date: p.end_date,
    })),
    profiles_by_status: cleanedByStatus,
  };
}


  // ══════════════════════════════════════════════════════════════════════════
  // HEADER - Estilo dashboard con logo y título centrado
  // ══════════════════════════════════════════════════════════════════════════
  private drawHeader(data: ClientReportData): void {
    const headerHeight = 28;
    
    // Fondo blanco
    this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    this.doc.rect(0, 0, this.pageWidth, headerHeight, 'F');
    
    // Logo a la izquierda
    const logoH = 12;
    const logoW = logoH * BAUSEN_LOGO_RATIO;
    try {
      this.doc.addImage(BAUSEN_LOGO_BASE64, 'PNG', this.margin, 5, logoW, logoH);
    } catch {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(14);
      this.doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      this.doc.text('BAUSEN', this.margin, 12);
    }
    
    // Título centrado
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(16);
    this.doc.setTextColor(COLORS.gray900.r, COLORS.gray900.g, COLORS.gray900.b);
    this.doc.text('REPORTE DE CLIENTE', this.pageWidth / 2, 10, { align: 'center' });
    
    // Nombre del cliente debajo del título
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(11);
    this.doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    this.doc.text(data.client.company_name, this.pageWidth / 2, 17, { align: 'center' });
    
    // Fecha a la derecha
    const fecha = new Date().toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    this.doc.setFontSize(8);
    this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
    this.doc.text(fecha, this.pageWidth - this.margin, 24, { align: 'right' });
    
    // Línea decorativa roja
    this.doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    this.doc.rect(0, headerHeight, this.pageWidth, 1, 'F');
    
    this.currentY = headerHeight + 5;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // BLOQUE DE INFORMACIÓN DEL CLIENTE (Card con 2 columnas)
  // ══════════════════════════════════════════════════════════════════════════
  private drawClientInfoCard(data: ClientReportData): void {
    const { client } = data;
    const cardHeight = 32;
    const startY = this.currentY;
    
    // Card background con borde sutil
    this.doc.setFillColor(COLORS.gray50.r, COLORS.gray50.g, COLORS.gray50.b);
    this.doc.roundedRect(this.margin, startY, this.contentWidth, cardHeight, 2, 2, 'F');
    this.doc.setDrawColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(this.margin, startY, this.contentWidth, cardHeight, 2, 2, 'S');
    
    // Barra superior roja
    this.doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    this.doc.roundedRect(this.margin, startY, this.contentWidth, 2, 2, 2, 'F');
    
    // Título de sección
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text('INFORMACIÓN DEL CONTACTO', this.margin + 4, startY + 8);
    
    // Columna izquierda
    const col1X = this.margin + 4;
    const col2X = this.margin + this.contentWidth / 2 + 4;
    let itemY = startY + 14;
    
    // Fila 1: Contacto y Teléfono
    this.drawInfoItem(col1X, itemY, 'C', 'Contacto:', client.contact_name || 'N/A');
    this.drawInfoItem(col2X, itemY, 'T', 'Teléfono:', client.contact_phone || 'N/A');
    itemY += 8;
    
    // Fila 2: Email e Industria
    this.drawInfoItem(col1X, itemY, '@', 'Email:', client.contact_email || 'N/A');
    this.drawInfoItem(col2X, itemY, 'I', 'Industria:', client.industry || 'N/A');
    itemY += 8;
    
    // Fila 3: Ubicación y Sitio web
    const ubicacion = [client.city, client.state].filter(Boolean).join(', ') || 'N/A';
    this.drawInfoItem(col1X, itemY, 'U', 'Ubicación:', ubicacion);
    this.drawInfoItem(col2X, itemY, 'W', 'Web:', client.website || 'N/A');
    
    this.currentY = startY + cardHeight + 4;
  }
  
  /**
   * Dibuja un item de información con icono
   */
  private drawInfoItem(x: number, y: number, icon: string, label: string, value: string): void {
  const safeLabel = sanitizePDFText(label);
  const safeValue = sanitizePDFText(value);

  // Mini badge circular (icono)
  this.doc.setFillColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
  this.doc.circle(x + 1.8, y - 1.8, 2.1, 'F');

  this.doc.setFont('helvetica', 'bold');
  this.doc.setFontSize(6);
  this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
  this.doc.text(icon, x + 1.8, y - 0.7, { align: 'center' });

  // Label
  this.doc.setFont('helvetica', 'bold');
  this.doc.setFontSize(6.5);
  this.doc.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
  this.doc.text(safeLabel, x + 6, y);

  // Value
  this.doc.setFont('helvetica', 'normal');
  this.doc.setTextColor(COLORS.gray800.r, COLORS.gray800.g, COLORS.gray800.b);
  const truncatedValue = truncateText(safeValue, 35);
  this.doc.text(truncatedValue, x + 6 + this.doc.getTextWidth(safeLabel) + 2, y);
}


  // ══════════════════════════════════════════════════════════════════════════
  // DASHBOARD KPI - 6 Cards con barra superior de color
  // ══════════════════════════════════════════════════════════════════════════
  private drawKPIDashboard(data: ClientReportData): void {
    const startY = this.currentY;
    const { statistics } = data;
    
    // Título de sección
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text('INDICADORES CLAVE', this.margin, startY);
    
    this.currentY = startY + 5;
    
    // Calcular KPIs derivados
    const perfilesAplicados = data.profiles.filter(p => p.candidates_count > 0).length;
    const daysLevel = getDaysLevel(statistics.avg_days_to_complete);
    
    // Definir 6 KPIs
    const kpis = [
      { 
        label: 'Perfiles', 
        value: statistics.total_profiles.toString(), 
        subtext: 'Total',
        color: COLORS.primary 
      },
      { 
        label: 'Con Candidatos', 
        value: perfilesAplicados.toString(), 
        subtext: 'Aplicados',
        color: COLORS.purple 
      },
      { 
        label: 'Activos', 
        value: statistics.active_profiles.toString(), 
        subtext: 'En proceso',
        color: COLORS.info 
      },
      { 
        label: 'Completados', 
        value: statistics.completed_profiles.toString(), 
        subtext: 'Finalizados',
        color: COLORS.success 
      },
      { 
        label: 'Tasa Éxito', 
        value: `${statistics.success_rate}%`, 
        subtext: 'Completados/Total',
        color: COLORS.warning 
      },
      { 
        label: 'Candidatos', 
        value: statistics.total_candidates_managed.toString(), 
        subtext: 'Gestionados',
        color: COLORS.gray700 
      },
    ];
    
    // Layout: 6 cards en una fila
    const cardWidth = (this.contentWidth - 15) / 6;
    const cardHeight = 24;
    
    kpis.forEach((kpi, index) => {
      const x = this.margin + (cardWidth + 3) * index;
      const y = this.currentY;
      
      // Card background
      this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      this.doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F');
      
      // Border
      this.doc.setDrawColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
      this.doc.setLineWidth(0.3);
      this.doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'S');
      
      // Barra superior de color
      this.doc.setFillColor(kpi.color.r, kpi.color.g, kpi.color.b);
      this.doc.roundedRect(x, y, cardWidth, 2, 2, 2, 'F');
      
      // Valor grande
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(14);
      this.doc.setTextColor(kpi.color.r, kpi.color.g, kpi.color.b);
      this.doc.text(kpi.value, x + cardWidth / 2, y + 12, { align: 'center' });
      
      // Label
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6);
      this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
      this.doc.text(kpi.label, x + cardWidth / 2, y + 18, { align: 'center' });
      
      // Subtext
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(5);
      this.doc.setTextColor(COLORS.gray400.r, COLORS.gray400.g, COLORS.gray400.b);
      this.doc.text(kpi.subtext, x + cardWidth / 2, y + 22, { align: 'center' });
    });
    
    this.currentY += cardHeight + 4;
    
    // Card extra: Días promedio con semáforo
    this.drawDaysCard(daysLevel, statistics.avg_days_to_complete);
  }
  
  /**
   * Dibuja card de días promedio con indicador semáforo
   */
  private drawDaysCard(daysLevel: { color: {r: number, g: number, b: number}, label: string }, days: number | null): void {
    const cardWidth = 60;
    const cardHeight = 14;
    const x = this.margin;
    const y = this.currentY;
    
    // Card background
    this.doc.setFillColor(COLORS.gray50.r, COLORS.gray50.g, COLORS.gray50.b);
    this.doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'F');
    this.doc.setDrawColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(x, y, cardWidth, cardHeight, 2, 2, 'S');
    
    // Indicador circular (semáforo)
    const circleX = x + 7;
    const circleY = y + cardHeight / 2;
    this.doc.setFillColor(daysLevel.color.r, daysLevel.color.g, daysLevel.color.b);
    this.doc.circle(circleX, circleY, 3, 'F');
    
    // Texto
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    const daysText = days !== null ? `${days} días promedio` : 'Sin datos';
    this.doc.text(daysText, x + 13, y + 6);
    
    // Label semáforo
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6);
    this.doc.setTextColor(daysLevel.color.r, daysLevel.color.g, daysLevel.color.b);
    this.doc.text(`(${daysLevel.label})`, x + 13, y + 11);
    
    this.currentY += cardHeight + 4;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DISTRIBUCIÓN POR ESTADO - Visual tipo barras
  // ══════════════════════════════════════════════════════════════════════════
  private drawStatusDistribution(data: ClientReportData): void {
    const statusEntries = Object.entries(data.profiles_by_status || {});
    if (statusEntries.length === 0) return;
    
    const startY = this.currentY;
    const sectionHeight = 22;
    
    // Título
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text('DISTRIBUCIÓN POR ESTADO', this.margin, startY);
    
    this.currentY = startY + 5;
    
    // Container
    this.doc.setFillColor(COLORS.gray50.r, COLORS.gray50.g, COLORS.gray50.b);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, sectionHeight, 2, 2, 'F');
    
    // Calcular total
    const total = statusEntries.reduce((sum, [, count]) => sum + count, 0);
    if (total === 0) {
      this.currentY += sectionHeight + 3;
      return;
    }
    
    // Dibujar barras proporcionales
    const barHeight = 10;
    const barY = this.currentY + 4;
    let barX = this.margin + 4;
    const availableWidth = this.contentWidth - 8;
    
    // Colores para estados
    const statusColors: Record<string, {r: number, g: number, b: number}> = {
      'activo': COLORS.success,
      'active': COLORS.success,
      'aprobado': COLORS.success,
      'completado': COLORS.info,
      'completed': COLORS.info,
      'cerrado': COLORS.info,
      'pendiente': COLORS.warning,
      'pending': COLORS.warning,
      'cancelado': COLORS.primary,
      'cancelled': COLORS.primary,
    };
    
    statusEntries.forEach(([status, count], index) => {
      const proportion = count / total;
      const barWidth = Math.max(availableWidth * proportion, 15);
      
      // Obtener color
      const statusLower = status.toLowerCase();
      let color = COLORS.gray400;
      for (const [key, col] of Object.entries(statusColors)) {
        if (statusLower.includes(key)) {
          color = col;
          break;
        }
      }
      
      // Barra
      this.doc.setFillColor(color.r, color.g, color.b);
      this.doc.roundedRect(barX, barY, barWidth - 2, barHeight, 1, 1, 'F');
      
      // Texto dentro de la barra
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6);
      this.doc.setTextColor(255, 255, 255);
      const label = `${truncateText(status, 12)}: ${count}`;
      if (barWidth > 25) {
        this.doc.text(label, barX + 3, barY + 6.5);
      }
      
      barX += barWidth;
    });
    
    // Leyenda debajo
    this.currentY += sectionHeight - 4;
    let legendX = this.margin + 4;
    this.doc.setFontSize(5.5);
    
    statusEntries.forEach(([status, count]) => {
      const statusLower = status.toLowerCase();
      let color = COLORS.gray400;
      for (const [key, col] of Object.entries(statusColors)) {
        if (statusLower.includes(key)) {
          color = col;
          break;
        }
      }
      
      // Cuadrito de color
      this.doc.setFillColor(color.r, color.g, color.b);
      this.doc.rect(legendX, this.currentY, 3, 3, 'F');
      
      // Texto
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
      const legendText = `${status} (${count})`;
      this.doc.text(legendText, legendX + 4, this.currentY + 2.5);
      
      legendX += this.doc.getTextWidth(legendText) + 12;
    });
    
    this.currentY += 8;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TABLA DE PERFILES - Diseño tipo dashboard con badges
  // ══════════════════════════════════════════════════════════════════════════
  private drawProfilesTable(data: ClientReportData): void {
    const startY = this.currentY;
    
    // Título de sección
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text('LISTA DE PERFILES / VACANTES', this.margin, startY);
    
    this.currentY = startY + 4;
    
    // Columnas
    const cols = {
      title: { x: this.margin, width: 65 },
      dates: { x: this.margin + 65, width: 42 },
      status: { x: this.margin + 107, width: 38 },
      priority: { x: this.margin + 145, width: 24 },
      candidates: { x: this.margin + 169, width: 22 },
    };
    
    const headerHeight = 7;
    const rowHeight = 9;
    
    // Header de tabla
    this.doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    this.doc.rect(this.margin, this.currentY, this.contentWidth, headerHeight, 'F');
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6.5);
    this.doc.setTextColor(255, 255, 255);
    
    this.doc.text('POSICIÓN', cols.title.x + 2, this.currentY + 5);
    this.doc.text('FECHAS', cols.dates.x + 2, this.currentY + 5);
    this.doc.text('ESTATUS', cols.status.x + 2, this.currentY + 5);
    this.doc.text('PRIOR.', cols.priority.x + 2, this.currentY + 5);
    this.doc.text('CAND.', cols.candidates.x + 2, this.currentY + 5);
    
    this.currentY += headerHeight;
    
    // Ordenar perfiles: activos primero, luego por prioridad
    const priorityOrder: Record<string, number> = { 'high': 0, 'alta': 0, 'medium': 1, 'media': 1, 'low': 2, 'baja': 2 };
    const sortedProfiles = [...data.profiles].sort((a, b) => {
      // Activos primero
      const aActive = a.status_display.toLowerCase().includes('activ') ? 0 : 1;
      const bActive = b.status_display.toLowerCase().includes('activ') ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      // Por prioridad
      const aPrio = priorityOrder[(a.priority || 'low').toLowerCase()] ?? 2;
      const bPrio = priorityOrder[(b.priority || 'low').toLowerCase()] ?? 2;
      return aPrio - bPrio;
    });
    
    // Máximo de filas
    const maxRows = 8;
    const profilesToShow = sortedProfiles.slice(0, maxRows);
    
    profilesToShow.forEach((profile, index) => {
      // Fila alternada
      if (index % 2 === 0) {
        this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      } else {
        this.doc.setFillColor(COLORS.gray50.r, COLORS.gray50.g, COLORS.gray50.b);
      }
      this.doc.rect(this.margin, this.currentY, this.contentWidth, rowHeight, 'F');
      
      // Línea inferior
      this.doc.setDrawColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
      this.doc.setLineWidth(0.1);
      this.doc.line(this.margin, this.currentY + rowHeight, this.margin + this.contentWidth, this.currentY + rowHeight);
      
      // Título
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6.5);
      this.doc.setTextColor(COLORS.gray800.r, COLORS.gray800.g, COLORS.gray800.b);
      const title = truncateText(profile.title || 'Sin título', 38);
      this.doc.text(title, cols.title.x + 2, this.currentY + 6);
      
      // Fechas (inicio - término)
      this.doc.setFontSize(5.5);
      this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
      const fechaInicio = formatDateES(profile.created_at);
      const fechaFin = profile.end_date ? formatDateES(profile.end_date) : 'En curso';
      this.doc.text(`${fechaInicio}`, cols.dates.x + 2, this.currentY + 4.5);
      this.doc.text(`-> ${fechaFin}`, cols.dates.x + 2, this.currentY + 7.5);
      
      // Badge de Estado
      this.drawStatusBadge(profile.status_display, cols.status.x + 2, this.currentY + 2.5);
      
      // Badge de Prioridad
      this.drawPriorityBadge(profile.priority, cols.priority.x + 2, this.currentY + 2.5);
      
      // Candidatos (número con círculo)
      this.drawCandidatesCount(profile.candidates_count, cols.candidates.x + 2, this.currentY + 2);
      
      this.currentY += rowHeight;
    });
    
    // Indicador de más perfiles
    if (data.profiles.length > maxRows) {
      this.doc.setFont('helvetica', 'italic');
      this.doc.setFontSize(6);
      this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
      this.doc.text(
        `... y ${data.profiles.length - maxRows} perfiles más`, 
        this.margin + this.contentWidth / 2, 
        this.currentY + 4, 
        { align: 'center' }
      );
      this.currentY += 7;
    }
    
    this.currentY += 4;
  }
  
  /**
   * Dibuja badge de estado con color
   */
  private drawStatusBadge(status: string, x: number, y: number): void {
    const colors = getStatusColor(status);
    const text = truncateText(status, 16);
    
    this.doc.setFontSize(5.5);
    const textWidth = this.doc.getTextWidth(text);
    const badgeWidth = Math.min(textWidth + 4, 36);
    
    // Background
    this.doc.setFillColor(colors.bg.r, colors.bg.g, colors.bg.b);
    this.doc.roundedRect(x, y, badgeWidth, 5, 1, 1, 'F');
    
    // Texto
    this.doc.setFont('helvetica', 'bold');
    this.doc.setTextColor(colors.text.r, colors.text.g, colors.text.b);
    this.doc.text(text, x + 2, y + 3.5);
  }
  
  /**
   * Dibuja badge de prioridad con texto legible en B/N
   */
  private drawPriorityBadge(priority: string, x: number, y: number): void {
    const prio = getPriorityColor(priority);
    
    // Background
    this.doc.setFillColor(prio.bg.r, prio.bg.g, prio.bg.b);
    this.doc.roundedRect(x, y, 18, 5, 1, 1, 'F');
    
    // Texto
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(5);
    this.doc.setTextColor(prio.text.r, prio.text.g, prio.text.b);
    this.doc.text(prio.label, x + 9, y + 3.5, { align: 'center' });
  }
  
  /**
   * Dibuja contador de candidatos con círculo
   */
  private drawCandidatesCount(count: number, x: number, y: number): void {
    const size = 6;
    const centerX = x + size / 2;
    const centerY = y + size / 2;
    
    // Círculo de fondo
    if (count > 0) {
      this.doc.setFillColor(COLORS.info.r, COLORS.info.g, COLORS.info.b);
    } else {
      this.doc.setFillColor(COLORS.gray300.r, COLORS.gray300.g, COLORS.gray300.b);
    }
    this.doc.circle(centerX, centerY, size / 2, 'F');
    
    // Número
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(5);
    this.doc.setTextColor(255, 255, 255);
    this.doc.text(count.toString(), centerX, centerY + 1.5, { align: 'center' });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECCIÓN DE NOTAS DEL CLIENTE
  // ══════════════════════════════════════════════════════════════════════════
  private drawNotesSection(data: ClientReportData): void {
    const notes = data.client.notes || '';
    const startY = this.currentY;
    const minHeight = 20;
    
    // Título
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.doc.text('NOTAS DEL CLIENTE', this.margin, startY);
    
    this.currentY = startY + 4;
    
    // Card de notas
    this.doc.setFillColor(COLORS.gray50.r, COLORS.gray50.g, COLORS.gray50.b);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, minHeight, 2, 2, 'F');
    this.doc.setDrawColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, minHeight, 2, 2, 'S');
    
    // Icono de nota
    this.doc.setFillColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
this.doc.circle(this.margin + 6, this.currentY + 7, 3, 'F');
this.doc.setFont('helvetica', 'bold');
this.doc.setFontSize(7);
this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
this.doc.text('N', this.margin + 6, this.currentY + 9, { align: 'center' });
    
    // Contenido
    this.doc.setFontSize(7);
    if (notes && notes.trim().length > 0) {
      this.doc.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
      // Dividir en líneas si es muy largo
      const maxWidth = this.contentWidth - 16;
      const lines = this.doc.splitTextToSize(notes, maxWidth);
      const displayLines = lines.slice(0, 3); // Máximo 3 líneas
      displayLines.forEach((line: string, i: number) => {
        this.doc.text(line, this.margin + 12, this.currentY + 6 + (i * 4.5));
      });
      if (lines.length > 3) {
        this.doc.setTextColor(COLORS.gray400.r, COLORS.gray400.g, COLORS.gray400.b);
        this.doc.text('...', this.margin + 12, this.currentY + 6 + (3 * 4.5));
      }
    } else {
      this.doc.setFont('helvetica', 'italic');
      this.doc.setTextColor(COLORS.gray400.r, COLORS.gray400.g, COLORS.gray400.b);
      this.doc.text('Sin notas registradas.', this.margin + 12, this.currentY + 10);
    }
    
    this.currentY += minHeight + 4;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FOOTER CORPORATIVO
  // ══════════════════════════════════════════════════════════════════════════
  private drawFooter(): void {
    const footerY = this.pageHeight - 10;
    
    // Línea superior
    this.doc.setDrawColor(COLORS.gray300.r, COLORS.gray300.g, COLORS.gray300.b);
    this.doc.setLineWidth(0.3);
    this.doc.line(this.margin, footerY - 3, this.pageWidth - this.margin, footerY - 3);
    
    // Texto izquierda
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7);
    this.doc.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
    this.doc.text('BAUSEN | Sistema de Gestión de Talento', this.margin, footerY);
    
    // Texto centro
    this.doc.setFont('helvetica', 'italic');
    this.doc.setFontSize(6);
    this.doc.text('Documento confidencial', this.pageWidth / 2, footerY, { align: 'center' });
    
    // Paginación derecha
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7);
    this.doc.text('Página 1 de 1', this.pageWidth - this.margin, footerY, { align: 'right' });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MARCA DE AGUA - Inferior izquierda con opacidad sutil
  // ══════════════════════════════════════════════════════════════════════════
  private aplicarMarcaAgua(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anyDoc = this.doc as any;
      
      // Obtener propiedades de la imagen
      const props = anyDoc.getImageProperties(BECHAPRA_WATERMARK_B_BASE64);
      const ratio = props.width / props.height;
      
      // Tamaño: 75% del ancho de página
      const wmW = this.pageWidth * 0.75;
      const wmH = wmW / ratio;
      
      // Posición: INFERIOR IZQUIERDA
      const x = -18;
      const y = this.pageHeight - wmH + 12;
      
      // Guardar estado
      if (typeof anyDoc.saveGraphicsState === 'function') {
        anyDoc.saveGraphicsState();
      }
      
      // Aplicar opacidad 5%
      const hasGState = typeof anyDoc.GState === 'function' && typeof anyDoc.setGState === 'function';
      if (hasGState) {
        anyDoc.setGState(new anyDoc.GState({ opacity: 0.05 }));
      }
      
      // Dibujar marca de agua
      anyDoc.addImage(BECHAPRA_WATERMARK_B_BASE64, 'PNG', x, y, wmW, wmH, 'WM_CLIENT', 'FAST');
      
      // Restaurar estado
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
// FUNCIÓN EXPORTADA
// ════════════════════════════════════════════════════════════════════════════
export function downloadClientReportPDF(data: ClientReportData, filename: string): void {
  const generator = new ClientReportPDF();
  const pdf = generator.generate(data);
  pdf.save(filename);
}

export function generateClientReportPDF(data: ClientReportData): jsPDF {
  const generator = new ClientReportPDF();
  return generator.generate(data);
}

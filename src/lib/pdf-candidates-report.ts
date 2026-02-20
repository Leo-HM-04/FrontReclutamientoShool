/**
 * ════════════════════════════════════════════════════════════════════════════
 * PDF CANDIDATES REPORT - DISEÑO DASHBOARD MODERNO
 * ════════════════════════════════════════════════════════════════════════════
 * Generador de PDF tipo dashboard para reportes de candidatos por perfil
 * Diseño moderno con cards, badges, KPIs, tabla y visualización de match
 * 
 * Características:
 * - Layout tipo dashboard en 1 página tamaño carta
 * - KPIs con indicadores visuales
 * - Visualización de distribución de match
 * - Tabla de candidatos con badges
 * - Soporte UTF-8 completo
 * ════════════════════════════════════════════════════════════════════════════
 */

import jsPDF from 'jspdf';
import { BAUSEN_LOGO_BASE64, BAUSEN_LOGO_RATIO } from './logo-base64';
import { BECHAPRA_WATERMARK_B_BASE64 } from './watermarkBase64';

// ═══════════════════════════════════════════════════════════════════════════
// COLORES DEL TEMA
// ═══════════════════════════════════════════════════════════════════════════
const COLORS = {
  // Primarios
  primary: { r: 0, g: 51, b: 160 },
  primaryLight: { r: 59, g: 130, b: 246 },
  primaryDark: { r: 0, g: 40, b: 120 },
  
  // Estados
  success: { r: 34, g: 197, b: 94 },
  warning: { r: 245, g: 158, b: 11 },
  error: { r: 239, g: 68, b: 68 },
  info: { r: 59, g: 130, b: 246 },
  
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
  
  // Match levels
  matchHigh: { r: 34, g: 197, b: 94 },
  matchMedium: { r: 245, g: 158, b: 11 },
  matchLow: { r: 239, g: 68, b: 68 },
  
  // Badges
  badgeGreen: { r: 220, g: 252, b: 231 },
  badgeGreenText: { r: 22, g: 101, b: 52 },
  badgeOrange: { r: 255, g: 237, b: 213 },
  badgeOrangeText: { r: 154, g: 52, b: 18 },
  badgeBlue: { r: 219, g: 234, b: 254 },
  badgeBlueText: { r: 30, g: 64, b: 175 },
  badgeGray: { r: 243, g: 244, b: 246 },
  badgeGrayText: { r: 55, g: 65, b: 81 },
  badgePurple: { r: 243, g: 232, b: 255 },
  badgePurpleText: { r: 107, g: 33, b: 168 },
};

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS E INTERFACES
// ═══════════════════════════════════════════════════════════════════════════

// Historial de estado para el Gantt
export interface StatusHistoryItem {
  from_status: string;
  to_status: string;
  timestamp: string;
}

export interface CandidateData {
  nombre: string;
  email: string;
  estado: string;
  match_porcentaje: number;
  // Nuevos campos para fecha y Gantt
  applied_at?: string;
  interview_date?: string;
  offer_date?: string;
  status_history?: StatusHistoryItem[];
}

export interface CandidatesReportData {
  puesto: string;
  fecha: string;
  cliente: string;
  candidatos: CandidateData[];
  incluirMarcaAgua?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILIDADES DE LIMPIEZA DE TEXTO UTF-8
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Limpia y normaliza texto con problemas de encoding
 */
function cleanText(text: string): string {
  if (!text) return '';
  
  let cleaned = text;
  
  // Paso 1: Arreglar encoding UTF-8 corrupto (├ + caracter)
  // Estos son caracteres UTF-8 que se muestran como CP-1252/Latin-1
  const utf8Fixes: [RegExp, string][] = [
    // Vocales minúsculas con acento
    [/├í/g, 'a'],  // á
    [/├®/g, 'e'],  // é
    [/├¡/g, 'i'],  // í
    [/├│/g, 'o'],  // ó
    [/├║/g, 'u'],  // ú
    [/├▒/g, 'n'],  // ñ
    
    // Vocales mayúsculas con acento
    [/├ü/g, 'A'],  // Á
    [/├ë/g, 'E'],  // É
    [/├ì/g, 'I'],  // Í
    [/├ô/g, 'O'],  // Ó
    [/├Ü/g, 'U'],  // Ú
    [/├æ/g, 'N'],  // Ñ
    
    // Variantes adicionales de encoding corrupto
    [/Ã¡/g, 'a'],  // á
    [/Ã©/g, 'e'],  // é
    [/Ã­/g, 'i'],  // í
    [/Ã³/g, 'o'],  // ó
    [/Ãº/g, 'u'],  // ú
    [/Ã±/g, 'n'],  // ñ
    [/Ã¼/g, 'u'],  // ü
    
    // Mayúsculas
    [/Ã/g, 'A'],  // Á
    [/Ã‰/g, 'E'],  // É
    [/Ã/g, 'I'],  // Í
    [/Ã"/g, 'O'],  // Ó
    [/Ãš/g, 'U'],  // Ú
    [/Ã'/g, 'N'],  // Ñ
  ];
  
  for (const [pattern, replacement] of utf8Fixes) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  
  // Paso 2: Limpiar caracteres ├ residuales que no matchearon
  cleaned = cleaned.replace(/├/g, '');
  
  // Paso 3: Mapa de reemplazos adicionales
  const replacements: [RegExp, string][] = [
    // Patrón &letra& → letra (para encoding muy corrupto)
    [/&([a-zA-Z])&/g, '$1'],
    [/&([a-zA-Z])/g, '$1'],
    [/([a-zA-Z])&/g, '$1'],
    
    // HTML entities
    [/&aacute;/gi, 'a'],
    [/&eacute;/gi, 'e'],
    [/&iacute;/gi, 'i'],
    [/&oacute;/gi, 'o'],
    [/&uacute;/gi, 'u'],
    [/&ntilde;/gi, 'n'],
    [/&amp;/g, '&'],
    [/&nbsp;/g, ' '],
    
    // URL encoding
    [/%C3%A1/g, 'a'],
    [/%C3%A9/g, 'e'],
    [/%C3%AD/g, 'i'],
    [/%C3%B3/g, 'o'],
    [/%C3%BA/g, 'u'],
    [/%C3%B1/g, 'n'],
    [/%40/g, '@'],
    [/%20/g, ' '],
    
    // Limpiar % sueltos
    [/%(?![0-9A-Fa-f]{2})/g, ''],
    
    // Caracteres de control
    [/[\x00-\x1F\x7F]/g, ''],
    
    // Ampersands sueltos múltiples
    [/&{2,}/g, ''],
  ];
  
  for (const [pattern, replacement] of replacements) {
    cleaned = cleaned.replace(pattern, replacement);
  }
  
  // Paso 4: Normalizar espacios múltiples
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  
  return cleaned;
}

/**
 * Trunca texto si excede longitud máxima
 */
function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

/**
 * Obtiene color de match según porcentaje
 */
function getMatchColor(percentage: number): { r: number; g: number; b: number } {
  if (percentage >= 70) return COLORS.matchHigh;
  if (percentage >= 40) return COLORS.matchMedium;
  return COLORS.matchLow;
}

/**
 * Obtiene nivel de match como texto
 */
function getMatchLevel(percentage: number): string {
  if (percentage >= 70) return 'ALTO';
  if (percentage >= 40) return 'MEDIO';
  return 'BAJO';
}

// ═══════════════════════════════════════════════════════════════════════════
// CLASE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════
export class CandidatesReportPDF {
  private pdf: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number = 12;
  private contentWidth: number;
  private yPos: number = 0;
  private incluirMarcaAgua: boolean = true;
  
  constructor() {
    this.pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });
    
    this.pageWidth = this.pdf.internal.pageSize.getWidth();
    this.pageHeight = this.pdf.internal.pageSize.getHeight();
    this.contentWidth = this.pageWidth - (this.margin * 2);
  }
  
  /**
   * Aplica marca de agua con el logo de Bausen
   * Se renderiza con opacidad sutil ENCIMA del contenido
   * Posicionada en la parte inferior izquierda del documento
   */
  private aplicarMarcaAgua(): void {
    if (!this.incluirMarcaAgua) return;
    
    const anyDoc = this.pdf as any;
    const imgData = BECHAPRA_WATERMARK_B_BASE64;
    
    try {
      // Obtener propiedades de la imagen para mantener aspect ratio
      const props = anyDoc.getImageProperties(imgData);
      const ratio = props.width / props.height;
      
      // Tamaño para marca de agua (75% del ancho de página)
      const wmW = this.pageWidth * 0.75;
      const wmH = wmW / ratio;
      
      // Posición: INFERIOR IZQUIERDA
      const x = -18;
      const y = this.pageHeight - wmH + 12;
      
      // Verificar si soporta estados gráficos para opacidad
      const hasGState = typeof anyDoc.GState === 'function' && typeof anyDoc.setGState === 'function';
      
      // Guardar estado gráfico actual
      if (typeof anyDoc.saveGraphicsState === 'function') {
        anyDoc.saveGraphicsState();
      }
      
      // Aplicar opacidad muy sutil (5%)
      if (hasGState) {
        anyDoc.setGState(new anyDoc.GState({ opacity: 0.05 }));
      }
      
      // Dibujar marca de agua ENCIMA del contenido
      anyDoc.addImage(imgData, 'PNG', x, y, wmW, wmH, 'WM_BAUSEN_CANDIDATES', 'FAST');
      
      // Restaurar estado gráfico a opacidad completa
      if (hasGState) {
        anyDoc.setGState(new anyDoc.GState({ opacity: 1 }));
      }
      if (typeof anyDoc.restoreGraphicsState === 'function') {
        anyDoc.restoreGraphicsState();
      }
      
      console.log('✅ [PDF Candidates] Marca de agua aplicada correctamente');
    } catch (e) {
      console.warn('⚠️ [PDF Candidates] Marca de agua no pudo renderizarse:', e);
    }
  }
  
  /**
   * Genera el reporte completo
   */
  generate(data: CandidatesReportData): jsPDF {
    // Configurar opción de marca de agua
    this.incluirMarcaAgua = data.incluirMarcaAgua !== false;
    
    // Limpiar datos
    const cleanData: CandidatesReportData = {
      puesto: cleanText(data.puesto),
      fecha: cleanText(data.fecha),
      cliente: cleanText(data.cliente),
      candidatos: data.candidatos.map(c => ({
        nombre: cleanText(c.nombre),
        email: cleanText(c.email),
        estado: cleanText(c.estado),
        match_porcentaje: c.match_porcentaje,
        applied_at: c.applied_at,
        interview_date: c.interview_date,
        offer_date: c.offer_date,
        status_history: c.status_history || []
      }))
    };
    
    // Calcular estadísticas
    const stats = this.calculateStats(cleanData.candidatos);
    
    this.yPos = this.margin;
    
    // 1. Header
    this.drawHeader(cleanData);
    
    // 2. KPI Cards
    this.drawKPICards(stats, cleanData.cliente);
    
    // 3. Match Distribution
    this.drawMatchDistribution(cleanData.candidatos);
    
    // 4. Candidates Table
    this.drawCandidatesTable(cleanData.candidatos);
    
    // 5. Gantt Chart (Timeline de candidatos)
    this.drawGanttChart(cleanData.candidatos);
    
    // 6. Footer
    this.drawFooter();
    
    // 7. Aplicar marca de agua AL FINAL (se dibuja encima con opacidad)
    this.aplicarMarcaAgua();
    
    return this.pdf;
  }
  
  /**
   * Calcula estadísticas de candidatos
   */
  private calculateStats(candidatos: CandidateData[]) {
    const total = candidatos.length;
    const matchSum = candidatos.reduce((sum, c) => sum + c.match_porcentaje, 0);
    const matchPromedio = total > 0 ? matchSum / total : 0;
    const topMatch = Math.max(...candidatos.map(c => c.match_porcentaje));
    const ofertasExtendidas = candidatos.filter(c => 
      c.estado.toLowerCase().includes('oferta')
    ).length;
    
    return {
      total,
      matchPromedio: Math.round(matchPromedio * 10) / 10,
      topMatch,
      ofertasExtendidas
    };
  }
  
  /**
   * Header con logo, título, puesto y fecha
   */
  private drawHeader(data: CandidatesReportData): void {
    const headerHeight = 28;
    
    // Fondo blanco
    this.pdf.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    this.pdf.rect(0, 0, this.pageWidth, headerHeight, 'F');
    
    // Línea decorativa azul
    this.pdf.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    this.pdf.rect(0, headerHeight, this.pageWidth, 1, 'F');
    
    // Logo
    const logoX = this.margin;
    const logoY = 4;
    const logoH = 14;
    const logoW = logoH * BAUSEN_LOGO_RATIO;
    
    try {
      this.pdf.addImage(BAUSEN_LOGO_BASE64, 'PNG', logoX, logoY, logoW, logoH);
    } catch {
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(16);
      this.pdf.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      this.pdf.text('BAUSEN', logoX, logoY + 10);
    }
    
    // Título centrado
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(14);
    this.pdf.setTextColor(COLORS.gray900.r, COLORS.gray900.g, COLORS.gray900.b);
    this.pdf.text('CANDIDATOS DEL PERFIL', this.pageWidth / 2, 10, { align: 'center' });
    
    // Puesto
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(11);
    this.pdf.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
    this.pdf.text(data.puesto, this.pageWidth / 2, 17, { align: 'center' });
    
    // Fecha a la derecha
    this.pdf.setFontSize(8);
    this.pdf.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
    this.pdf.text(data.fecha, this.pageWidth - this.margin, 24, { align: 'right' });
    
    this.yPos = headerHeight + 5;
  }
  
  /**
   * Cards de KPIs
   */
  private drawKPICards(stats: { total: number; matchPromedio: number; topMatch: number; ofertasExtendidas: number }, cliente: string): void {
    const cardWidth = (this.contentWidth - 9) / 4; // 4 cards con 3mm entre ellas
    const cardHeight = 22;
    const startX = this.margin;
    const startY = this.yPos;
    
    const kpis = [
      { label: 'Total Candidatos', value: stats.total.toString(), icon: '👥' },
      { label: 'Match Promedio', value: `${stats.matchPromedio}%`, icon: '📊' },
      { label: 'Top Match', value: `${stats.topMatch}%`, icon: '⭐' },
      { label: 'Ofertas', value: stats.ofertasExtendidas.toString(), icon: '📋' }
    ];
    
    kpis.forEach((kpi, index) => {
      const x = startX + (cardWidth + 3) * index;
      
      // Card background
      this.pdf.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      this.pdf.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, 'F');
      
      // Border
      this.pdf.setDrawColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
      this.pdf.setLineWidth(0.3);
      this.pdf.roundedRect(x, startY, cardWidth, cardHeight, 2, 2, 'S');
      
      // Top accent line
      const accentColor = index === 0 ? COLORS.primary : 
                          index === 1 ? COLORS.info :
                          index === 2 ? COLORS.success : COLORS.warning;
      this.pdf.setFillColor(accentColor.r, accentColor.g, accentColor.b);
      this.pdf.rect(x, startY, cardWidth, 1.5, 'F');
      
      // Value (big number)
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(16);
      this.pdf.setTextColor(COLORS.gray900.r, COLORS.gray900.g, COLORS.gray900.b);
      this.pdf.text(kpi.value, x + cardWidth / 2, startY + 11, { align: 'center' });
      
      // Label
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(7);
      this.pdf.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
      this.pdf.text(kpi.label, x + cardWidth / 2, startY + 18, { align: 'center' });
    });
    
    // Cliente badge debajo de los KPIs
    this.yPos = startY + cardHeight + 4;
    
    // Cliente card
    this.pdf.setFillColor(COLORS.badgeBlue.r, COLORS.badgeBlue.g, COLORS.badgeBlue.b);
    const clienteText = `Cliente: ${cliente}`;
    this.pdf.setFontSize(8);
    const clienteWidth = this.pdf.getTextWidth(clienteText) + 8;
    this.pdf.roundedRect(this.margin, this.yPos, clienteWidth, 6, 1, 1, 'F');
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(COLORS.badgeBlueText.r, COLORS.badgeBlueText.g, COLORS.badgeBlueText.b);
    this.pdf.text(clienteText, this.margin + 4, this.yPos + 4.2);
    
    this.yPos += 10;
  }
  
  /**
   * Visualización de distribución de match
   */
  private drawMatchDistribution(candidatos: CandidateData[]): void {
    const startY = this.yPos;
    const barHeight = 18;
    
    // Título de sección
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(9);
    this.pdf.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.pdf.text('DISTRIBUCION DE MATCH', this.margin, startY);
    
    this.yPos = startY + 5;
    
    // Container
    this.pdf.setFillColor(COLORS.gray50.r, COLORS.gray50.g, COLORS.gray50.b);
    this.pdf.roundedRect(this.margin, this.yPos, this.contentWidth, barHeight, 2, 2, 'F');
    
    // Ordenar candidatos por match
    const sorted = [...candidatos].sort((a, b) => b.match_porcentaje - a.match_porcentaje);
    const barWidth = (this.contentWidth - 10) / sorted.length;
    const maxBarHeight = barHeight - 6;
    
    sorted.forEach((candidato, index) => {
      const x = this.margin + 5 + (barWidth * index);
      const heightRatio = candidato.match_porcentaje / 100;
      const currentBarHeight = maxBarHeight * heightRatio;
      const barY = this.yPos + (barHeight - 3) - currentBarHeight;
      
      // Bar
      const color = getMatchColor(candidato.match_porcentaje);
      this.pdf.setFillColor(color.r, color.g, color.b);
      this.pdf.roundedRect(x, barY, barWidth - 2, currentBarHeight, 1, 1, 'F');
      
      // Percentage label on top
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(5);
      this.pdf.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
      this.pdf.text(`${candidato.match_porcentaje}%`, x + (barWidth - 2) / 2, barY - 1, { align: 'center' });
    });
    
    // Leyenda
    this.yPos += barHeight + 2;
    const legendY = this.yPos;
    
    const legends = [
      { label: 'Alto (>=70%)', color: COLORS.matchHigh },
      { label: 'Medio (40-69%)', color: COLORS.matchMedium },
      { label: 'Bajo (<40%)', color: COLORS.matchLow }
    ];
    
    let legendX = this.margin;
    this.pdf.setFontSize(6);
    
    legends.forEach((legend) => {
      // Color box
      this.pdf.setFillColor(legend.color.r, legend.color.g, legend.color.b);
      this.pdf.rect(legendX, legendY, 3, 3, 'F');
      
      // Label
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
      this.pdf.text(legend.label, legendX + 4, legendY + 2.5);
      
      legendX += this.pdf.getTextWidth(legend.label) + 10;
    });
    
    this.yPos += 8;
  }
  
  /**
   * Tabla de candidatos con fecha de aplicación
   */
  private drawCandidatesTable(candidatos: CandidateData[]): void {
    const startY = this.yPos;
    const rowHeight = 9;
    const headerHeight = 8;
    
    // Título de sección
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(9);
    this.pdf.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.pdf.text('LISTADO DE CANDIDATOS', this.margin, startY);
    
    this.yPos = startY + 4;
    
    // Columnas (reorganizadas para incluir fecha)
    const cols = {
      nombre: { x: this.margin, width: 48 },
      email: { x: this.margin + 48, width: 52 },
      fecha: { x: this.margin + 100, width: 25 },
      estado: { x: this.margin + 125, width: 30 },
      match: { x: this.margin + 155, width: this.contentWidth - 155 }
    };
    
    // Header
    this.pdf.setFillColor(COLORS.gray100.r, COLORS.gray100.g, COLORS.gray100.b);
    this.pdf.rect(this.margin, this.yPos, this.contentWidth, headerHeight, 'F');
    
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(7);
    this.pdf.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    
    this.pdf.text('NOMBRE', cols.nombre.x + 2, this.yPos + 5);
    this.pdf.text('EMAIL', cols.email.x + 2, this.yPos + 5);
    this.pdf.text('APLICÓ', cols.fecha.x + 2, this.yPos + 5);
    this.pdf.text('ESTATUS', cols.estado.x + 2, this.yPos + 5);
    this.pdf.text('MATCH', cols.match.x + 2, this.yPos + 5);
    
    this.yPos += headerHeight;
    
    // Ordenar por match desc
    const sorted = [...candidatos].sort((a, b) => b.match_porcentaje - a.match_porcentaje);
    
    sorted.forEach((candidato, index) => {
      // Fila alternada
      if (index % 2 === 0) {
        this.pdf.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      } else {
        this.pdf.setFillColor(COLORS.gray50.r, COLORS.gray50.g, COLORS.gray50.b);
      }
      this.pdf.rect(this.margin, this.yPos, this.contentWidth, rowHeight, 'F');
      
      // Border inferior
      this.pdf.setDrawColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
      this.pdf.setLineWidth(0.1);
      this.pdf.line(this.margin, this.yPos + rowHeight, this.margin + this.contentWidth, this.yPos + rowHeight);
      
      // Nombre
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(7);
      this.pdf.setTextColor(COLORS.gray900.r, COLORS.gray900.g, COLORS.gray900.b);
      this.pdf.text(truncateText(candidato.nombre, 26), cols.nombre.x + 2, this.yPos + 5.5);
      
      // Email
      this.pdf.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
      this.pdf.text(truncateText(candidato.email, 28), cols.email.x + 2, this.yPos + 5.5);
      
      // Fecha de aplicación
      this.pdf.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
      const fechaAplicacion = candidato.applied_at 
        ? this.formatShortDate(candidato.applied_at)
        : '-';
      this.pdf.text(fechaAplicacion, cols.fecha.x + 2, this.yPos + 5.5);
      
      // Estado Badge
      this.drawStateBadge(candidato.estado, cols.estado.x + 2, this.yPos + 2);
      
      // Match con barra visual
      this.drawMatchBar(candidato.match_porcentaje, cols.match.x + 2, this.yPos + 2, cols.match.width - 6);
      
      this.yPos += rowHeight;
    });
    
    this.yPos += 3;
  }
  
  /**
   * Badge de estado
   */
  private drawStateBadge(estado: string, x: number, y: number): void {
    const isOferta = estado.toLowerCase().includes('oferta');
    
    const bgColor = isOferta ? COLORS.badgeGreen : COLORS.badgeGray;
    const textColor = isOferta ? COLORS.badgeGreenText : COLORS.badgeGrayText;
    
    const text = truncateText(estado, 15);
    this.pdf.setFontSize(6);
    const textWidth = this.pdf.getTextWidth(text);
    const badgeWidth = textWidth + 4;
    
    this.pdf.setFillColor(bgColor.r, bgColor.g, bgColor.b);
    this.pdf.roundedRect(x, y, badgeWidth, 5, 1, 1, 'F');
    
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setTextColor(textColor.r, textColor.g, textColor.b);
    this.pdf.text(text, x + 2, y + 3.5);
  }
  
  /**
   * Barra de match con porcentaje
   */
  private drawMatchBar(percentage: number, x: number, y: number, width: number): void {
    const barHeight = 5;
    const barWidth = width - 20;
    
    // Background
    this.pdf.setFillColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
    this.pdf.roundedRect(x, y, barWidth, barHeight, 1, 1, 'F');
    
    // Progress
    const color = getMatchColor(percentage);
    const progressWidth = (barWidth * percentage) / 100;
    this.pdf.setFillColor(color.r, color.g, color.b);
    this.pdf.roundedRect(x, y, progressWidth, barHeight, 1, 1, 'F');
    
    // Percentage text
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(7);
    this.pdf.setTextColor(COLORS.gray900.r, COLORS.gray900.g, COLORS.gray900.b);
    this.pdf.text(`${percentage}%`, x + barWidth + 2, y + 3.8);
    
    // Level indicator (for B/W printing)
    const level = getMatchLevel(percentage);
    this.pdf.setFontSize(5);
    this.pdf.setTextColor(color.r, color.g, color.b);
    this.pdf.text(level, x + barWidth / 2, y + 3.5, { align: 'center' });
  }
  
  /**
   * Formatea fecha corta (dd/mm)
   */
  private formatShortDate(dateStr: string): string {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      return `${day}/${month}`;
    } catch {
      return '-';
    }
  }
  
  /**
   * Gráfico Gantt del timeline de candidatos - Diseño Profesional
   */
  private drawGanttChart(candidatos: CandidateData[]): void {
    const candidatosConFecha = candidatos.filter(c => c.applied_at);
    if (candidatosConFecha.length === 0) {
      return; // No dibujar si no hay datos
    }
    
    // Calcular altura necesaria
    const maxCandidates = Math.min(candidatosConFecha.length, 6);
    const rowHeight = 8;
    const headerHeight = 12;
    const legendHeight = 10;
    const requiredHeight = headerHeight + (maxCandidates * rowHeight) + legendHeight + 15;
    
    // Verificar si hay espacio suficiente
    if (this.yPos + requiredHeight > this.pageHeight - 15) {
      this.pdf.addPage();
      this.yPos = this.margin;
    }
    
    const startY = this.yPos + 4;
    const nameColWidth = 45;
    const statusColWidth = 22;
    const daysColWidth = 18;
    const chartStartX = this.margin + nameColWidth;
    const chartEndX = this.pageWidth - this.margin - statusColWidth - daysColWidth;
    const chartWidth = chartEndX - chartStartX;
    
    // ═══════════════════════════════════════════════════════════════
    // TÍTULO
    // ═══════════════════════════════════════════════════════════════
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(8);
    this.pdf.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
    this.pdf.text('TIMELINE DEL PROCESO', this.margin, startY);
    
    // ═══════════════════════════════════════════════════════════════
    // CALCULAR RANGO DE FECHAS
    // ═══════════════════════════════════════════════════════════════
    const fechas = candidatosConFecha.map(c => new Date(c.applied_at!).getTime());
    const minDate = new Date(Math.min(...fechas));
    const maxDate = new Date(); // Hoy
    const totalDays = Math.max(7, Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)));
    
    // ═══════════════════════════════════════════════════════════════
    // HEADER DE LA TABLA/GANTT
    // ═══════════════════════════════════════════════════════════════
    const headerY = startY + 5;
    
    // Fondo del header
    this.pdf.setFillColor(COLORS.gray100.r, COLORS.gray100.g, COLORS.gray100.b);
    this.pdf.rect(this.margin, headerY, this.contentWidth, headerHeight, 'F');
    
    // Textos del header
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(6);
    this.pdf.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
    
    this.pdf.text('CANDIDATO', this.margin + 2, headerY + 5);
    
    // Escala de tiempo en el header
    const timelineLabels = this.getTimelineLabels(minDate, maxDate, chartWidth);
    timelineLabels.forEach(label => {
      this.pdf.text(label.text, chartStartX + label.x, headerY + 5);
    });
    
    this.pdf.text('ESTATUS', chartEndX + 2, headerY + 5);
    this.pdf.text('DIAS', chartEndX + statusColWidth + 2, headerY + 5);
    
    // Línea inferior del header
    this.pdf.setDrawColor(COLORS.gray300.r, COLORS.gray300.g, COLORS.gray300.b);
    this.pdf.setLineWidth(0.3);
    this.pdf.line(this.margin, headerY + headerHeight, this.margin + this.contentWidth, headerY + headerHeight);
    
    // ═══════════════════════════════════════════════════════════════
    // FILAS DE CANDIDATOS
    // ═══════════════════════════════════════════════════════════════
    const sorted = [...candidatosConFecha].sort((a, b) => 
      new Date(a.applied_at!).getTime() - new Date(b.applied_at!).getTime()
    );
    
    sorted.slice(0, maxCandidates).forEach((candidato, index) => {
      const rowY = headerY + headerHeight + (index * rowHeight);
      
      // Fondo alternado
      if (index % 2 === 0) {
        this.pdf.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      } else {
        this.pdf.setFillColor(249, 250, 251);
      }
      this.pdf.rect(this.margin, rowY, this.contentWidth, rowHeight, 'F');
      
      // Línea separadora sutil
      this.pdf.setDrawColor(COLORS.gray200.r, COLORS.gray200.g, COLORS.gray200.b);
      this.pdf.setLineWidth(0.1);
      this.pdf.line(this.margin, rowY + rowHeight, this.margin + this.contentWidth, rowY + rowHeight);
      
      // Nombre del candidato
      this.pdf.setFont('helvetica', 'normal');
      this.pdf.setFontSize(6);
      this.pdf.setTextColor(COLORS.gray800.r, COLORS.gray800.g, COLORS.gray800.b);
      this.pdf.text(truncateText(candidato.nombre, 22), this.margin + 2, rowY + 5);
      
      // ═══════════════════════════════════════════════════════════════
      // BARRA DEL GANTT
      // ═══════════════════════════════════════════════════════════════
      const appliedDate = new Date(candidato.applied_at!);
      const daysFromStart = Math.ceil((appliedDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysInProcess = Math.ceil((maxDate.getTime() - appliedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      const barStartX = chartStartX + (daysFromStart / totalDays) * chartWidth;
      const barEndX = chartEndX - 1;
      const barWidth = Math.max(3, barEndX - barStartX);
      
      // Color según estado
      const color = this.getStatusColor(candidato.estado);
      
      // Dibujar barra con gradiente visual (barra principal + highlight)
      this.pdf.setFillColor(color.r, color.g, color.b);
      this.pdf.roundedRect(barStartX, rowY + 2, barWidth, rowHeight - 4, 1, 1, 'F');
      
      // Highlight superior para efecto 3D sutil
      this.pdf.setFillColor(
        Math.min(255, color.r + 40),
        Math.min(255, color.g + 40),
        Math.min(255, color.b + 40)
      );
      this.pdf.rect(barStartX + 1, rowY + 2, barWidth - 2, 1.5, 'F');
      
      // Marcador de inicio (punto)
      this.pdf.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      this.pdf.circle(barStartX + 2, rowY + rowHeight / 2, 1.2, 'F');
      this.pdf.setFillColor(color.r, color.g, color.b);
      this.pdf.circle(barStartX + 2, rowY + rowHeight / 2, 0.8, 'F');
      
      // Fecha de inicio dentro de la barra (si hay espacio)
      if (barWidth > 25) {
        this.pdf.setFont('helvetica', 'normal');
        this.pdf.setFontSize(5);
        this.pdf.setTextColor(255, 255, 255);
        this.pdf.text(this.formatShortDate(candidato.applied_at!), barStartX + 5, rowY + 5.5);
      }
      
      // ═══════════════════════════════════════════════════════════════
      // BADGE DE ESTADO
      // ═══════════════════════════════════════════════════════════════
      const badgeX = chartEndX + 2;
      const badgeY = rowY + 1.5;
      const badgeColor = this.getStatusBadgeColors(candidato.estado);
      
      this.pdf.setFillColor(badgeColor.bg.r, badgeColor.bg.g, badgeColor.bg.b);
      this.pdf.roundedRect(badgeX, badgeY, statusColWidth - 3, rowHeight - 3, 1, 1, 'F');
      
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(4.5);
      this.pdf.setTextColor(badgeColor.text.r, badgeColor.text.g, badgeColor.text.b);
      const statusText = this.getShortStatus(candidato.estado);
      this.pdf.text(statusText, badgeX + (statusColWidth - 3) / 2, rowY + 5, { align: 'center' });
      
      // ═══════════════════════════════════════════════════════════════
      // DÍAS EN PROCESO
      // ═══════════════════════════════════════════════════════════════
      this.pdf.setFont('helvetica', 'bold');
      this.pdf.setFontSize(6);
      this.pdf.setTextColor(COLORS.gray700.r, COLORS.gray700.g, COLORS.gray700.b);
      this.pdf.text(`${daysInProcess}d`, chartEndX + statusColWidth + 5, rowY + 5);
    });
    
    // ═══════════════════════════════════════════════════════════════
    // LÍNEA DE "HOY"
    // ═══════════════════════════════════════════════════════════════
    const todayX = chartEndX - 1;
    const chartTopY = headerY + headerHeight;
    const chartBottomY = headerY + headerHeight + (maxCandidates * rowHeight);
    
    this.pdf.setDrawColor(COLORS.error.r, COLORS.error.g, COLORS.error.b);
    this.pdf.setLineWidth(0.5);
    this.pdf.setLineDashPattern([1, 1], 0);
    this.pdf.line(todayX, chartTopY, todayX, chartBottomY);
    this.pdf.setLineDashPattern([], 0);
    
    // Etiqueta "Hoy"
    this.pdf.setFillColor(COLORS.error.r, COLORS.error.g, COLORS.error.b);
    this.pdf.roundedRect(todayX - 6, chartTopY - 4, 12, 4, 1, 1, 'F');
    this.pdf.setFont('helvetica', 'bold');
    this.pdf.setFontSize(5);
    this.pdf.setTextColor(255, 255, 255);
    this.pdf.text('HOY', todayX, chartTopY - 1.5, { align: 'center' });
    
    // ═══════════════════════════════════════════════════════════════
    // LEYENDA COMPACTA
    // ═══════════════════════════════════════════════════════════════
    const legendY = chartBottomY + 4;
    this.drawCompactLegend(this.margin, legendY);
    
    this.yPos = legendY + 8;
  }
  
  /**
   * Genera etiquetas de tiempo para el eje X
   */
  private getTimelineLabels(minDate: Date, maxDate: Date, chartWidth: number): Array<{text: string, x: number}> {
    const labels: Array<{text: string, x: number}> = [];
    const totalDays = Math.ceil((maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Inicio
    labels.push({ text: this.formatShortDate(minDate.toISOString()), x: 2 });
    
    // Punto medio si hay más de 14 días
    if (totalDays > 14) {
      const midDate = new Date(minDate.getTime() + (maxDate.getTime() - minDate.getTime()) / 2);
      labels.push({ text: this.formatShortDate(midDate.toISOString()), x: chartWidth / 2 - 5 });
    }
    
    return labels;
  }
  
  /**
   * Obtiene color según el estado del candidato
   */
  private getStatusColor(estado: string): { r: number; g: number; b: number } {
    const estadoLower = estado.toLowerCase();
    if (estadoLower.includes('aceptad')) {
      return { r: 16, g: 185, b: 129 }; // Verde esmeralda
    } else if (estadoLower.includes('oferta')) {
      return { r: 34, g: 197, b: 94 }; // Verde claro
    } else if (estadoLower.includes('entrevista')) {
      return { r: 59, g: 130, b: 246 }; // Azul
    } else if (estadoLower.includes('preseleccion') || estadoLower.includes('shortlist')) {
      return { r: 139, g: 92, b: 246 }; // Púrpura
    } else if (estadoLower.includes('rechazad') || estadoLower.includes('retirad')) {
      return { r: 239, g: 68, b: 68 }; // Rojo
    } else if (estadoLower.includes('revision') || estadoLower.includes('screening')) {
      return { r: 245, g: 158, b: 11 }; // Naranja
    }
    return { r: 0, g: 102, b: 204 }; // Azul corporativo (Aplicó)
  }
  
  /**
   * Colores para badges de estado
   */
  private getStatusBadgeColors(estado: string): { bg: {r: number, g: number, b: number}, text: {r: number, g: number, b: number} } {
    const estadoLower = estado.toLowerCase();
    if (estadoLower.includes('aceptad') || estadoLower.includes('oferta')) {
      return { bg: { r: 220, g: 252, b: 231 }, text: { r: 22, g: 101, b: 52 } };
    } else if (estadoLower.includes('entrevista')) {
      return { bg: { r: 219, g: 234, b: 254 }, text: { r: 30, g: 64, b: 175 } };
    } else if (estadoLower.includes('preseleccion') || estadoLower.includes('shortlist')) {
      return { bg: { r: 237, g: 233, b: 254 }, text: { r: 91, g: 33, b: 182 } };
    } else if (estadoLower.includes('rechazad') || estadoLower.includes('retirad')) {
      return { bg: { r: 254, g: 226, b: 226 }, text: { r: 153, g: 27, b: 27 } };
    } else if (estadoLower.includes('revision') || estadoLower.includes('screening')) {
      return { bg: { r: 255, g: 237, b: 213 }, text: { r: 154, g: 52, b: 18 } };
    }
    return { bg: { r: 219, g: 234, b: 254 }, text: { r: 30, g: 64, b: 175 } };
  }
  
  /**
   * Versión corta del estado para el badge
   */
  private getShortStatus(estado: string): string {
    const estadoLower = estado.toLowerCase();
    if (estadoLower.includes('aceptad')) return 'ACEPTADO';
    if (estadoLower.includes('oferta')) return 'OFERTA';
    if (estadoLower.includes('entrevista')) return 'ENTREV.';
    if (estadoLower.includes('preseleccion') || estadoLower.includes('shortlist')) return 'PRESEL.';
    if (estadoLower.includes('rechazad')) return 'RECHAZ.';
    if (estadoLower.includes('retirad')) return 'RETIRADO';
    if (estadoLower.includes('revision') || estadoLower.includes('screening')) return 'REVISIÓN';
    return 'APLICÓ';
  }
  
  /**
   * Leyenda compacta y profesional
   */
  private drawCompactLegend(x: number, y: number): void {
    const items = [
      { label: 'Aplicó', color: { r: 0, g: 102, b: 204 } },
      { label: 'Revisión', color: { r: 245, g: 158, b: 11 } },
      { label: 'Preselec.', color: { r: 139, g: 92, b: 246 } },
      { label: 'Entrevista', color: { r: 59, g: 130, b: 246 } },
      { label: 'Oferta', color: { r: 34, g: 197, b: 94 } },
      { label: 'Rechazado', color: { r: 239, g: 68, b: 68 } },
    ];
    
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(5);
    
    let currentX = x;
    const spacing = 28;
    
    items.forEach((item) => {
      // Cuadro de color con borde redondeado
      this.pdf.setFillColor(item.color.r, item.color.g, item.color.b);
      this.pdf.roundedRect(currentX, y, 3, 3, 0.5, 0.5, 'F');
      
      // Texto
      this.pdf.setTextColor(COLORS.gray600.r, COLORS.gray600.g, COLORS.gray600.b);
      this.pdf.text(item.label, currentX + 4, y + 2.5);
      
      currentX += spacing;
    });
  }
  
  /**
   * Footer
   */
  private drawFooter(): void {
    const footerY = this.pageHeight - 10;
    
    // Línea separadora
    this.pdf.setDrawColor(COLORS.gray300.r, COLORS.gray300.g, COLORS.gray300.b);
    this.pdf.setLineWidth(0.3);
    this.pdf.line(this.margin, footerY - 3, this.pageWidth - this.margin, footerY - 3);
    
    // Texto izquierdo
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.setFontSize(7);
    this.pdf.setTextColor(COLORS.gray500.r, COLORS.gray500.g, COLORS.gray500.b);
    this.pdf.text('BAUSEN | Sistema de Gestion de Talento', this.margin, footerY);
    
    // Centro
    this.pdf.setFont('helvetica', 'italic');
    this.pdf.text('Documento confidencial', this.pageWidth / 2, footerY, { align: 'center' });
    
    // Derecha
    this.pdf.setFont('helvetica', 'normal');
    this.pdf.text('Pagina 1 de 1', this.pageWidth - this.margin, footerY, { align: 'right' });
  }
  
  /**
   * Guarda el PDF
   */
  save(filename: string = 'candidatos-perfil.pdf'): void {
    this.pdf.save(filename);
  }
  
  /**
   * Retorna el PDF como blob
   */
  toBlob(): Blob {
    return this.pdf.output('blob');
  }
  
  /**
   * Retorna el PDF como data URI
   */
  toDataUri(): string {
    return this.pdf.output('datauristring');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FUNCIÓN DE UTILIDAD PARA EXPORTAR
// ═══════════════════════════════════════════════════════════════════════════
export function generateCandidatesReportPDF(data: CandidatesReportData): jsPDF {
  const generator = new CandidatesReportPDF();
  return generator.generate(data);
}

export function downloadCandidatesReportPDF(data: CandidatesReportData, filename?: string): void {
  const generator = new CandidatesReportPDF();
  generator.generate(data);
  generator.save(filename || `candidatos-${data.puesto.toLowerCase().replace(/\s+/g, '-')}.pdf`);
}

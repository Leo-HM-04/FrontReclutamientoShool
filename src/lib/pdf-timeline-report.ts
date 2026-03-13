/**
 * ════════════════════════════════════════════════════════════════════════════
 * PDF TIMELINE REPORT - DISEÑO DASHBOARD AVANZADO
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Genera PDF tipo dashboard para timeline de proceso de reclutamiento.
 * Diseño inspirado en reportes ejecutivos con:
 * - Header con banda de color
 * - KPI Cards con métricas clave
 * - Diagrama tipo Gantt del proceso
 * - Tarjetas de candidatos con match%
 * - Comparativa de eficiencia vs industria
 * - Timeline de eventos agrupado por día
 * 
 * ════════════════════════════════════════════════════════════════════════════
 */

import jsPDF from 'jspdf';
import { BAUSEN_LOGO_BASE64 } from './logo-base64';
import { BAUSEN_LOGO_WHITE_BASE64, BAUSEN_LOGO_WHITE_RATIO } from './logo-white-base64';
import { BECHAPRA_WATERMARK_B_BASE64 } from './watermarkBase64';
import { drawReportCover } from './pdf-cover-utils';

// ════════════════════════════════════════════════════════════════════════════
// COLORES CORPORATIVOS (Sistema del PDF de referencia)
// ════════════════════════════════════════════════════════════════════════════
const COLORS = {
  headerBand: { r: 11, g: 58, b: 110 },      // #0B3A6E - Azul oscuro header
  primary: { r: 11, g: 58, b: 110 },          // #0B3A6E
  success: { r: 34, g: 160, b: 107 },         // #22A06B - Verde
  accent: { r: 107, g: 116, b: 242 },         // #6B74F2 - Púrpura
  warning: { r: 245, g: 165, b: 36 },         // #F5A524 - Amarillo/Naranja
  danger: { r: 239, g: 68, b: 68 },           // Rojo
  ganttTrack: { r: 233, g: 237, b: 243 },     // #E9EDF3 - Gris claro
  textPrimary: { r: 11, g: 18, b: 32 },       // #0B1220
  textSecondary: { r: 91, g: 103, b: 122 },   // #5B677A
  white: { r: 255, g: 255, b: 255 },
  lightBg: { r: 248, g: 250, b: 252 },
  border: { r: 229, g: 231, b: 235 },
};

// ════════════════════════════════════════════════════════════════════════════
// FUNCIÓN PARA CORREGIR MOJIBAKE
// ════════════════════════════════════════════════════════════════════════════
function fixMojibake(text: string): string {
  if (!text) return '';
  
  const mojibakeMap: { [key: string]: string } = {
    // Vocales acentuadas (patrón ├X)
    '├í': 'á', '├®': 'é', '├¡': 'í', '├│': 'ó', '├║': 'ú',
    '├ü': 'Á', '├ë': 'É', '├ì': 'Í', '├ô': 'Ó', '├Ü': 'Ú',
    // Ñ
    '├▒': 'ñ', '├æ': 'Ñ',
    // Diéresis
    '├╝': 'ü', '├£': 'Ü',
    // Patrones con %
    '%í': 'á', '%®': 'é', '%¡': 'í', '%ó': 'ó', '%ú': 'ú',
    '%ñ': 'ñ', '%Ñ': 'Ñ', '%Q%': 'ú', "%%'": '',
    // Patrones URL encoded
    '%C3%A1': 'á', '%C3%A9': 'é', '%C3%AD': 'í', '%C3%B3': 'ó', '%C3%BA': 'ú',
    '%C3%B1': 'ñ', '%C3%91': 'Ñ',
    // Unicode escapes
    '\u00c3\u00a1': 'á', '\u00c3\u00a9': 'é', '\u00c3\u00ad': 'í',
    '\u00c3\u00b3': 'ó', '\u00c3\u00ba': 'ú', '\u00c3\u00b1': 'ñ',
  };
  
  let result = text;
  for (const [corrupted, correct] of Object.entries(mojibakeMap)) {
    result = result.split(corrupted).join(correct);
  }
  
  return result;
}

// ════════════════════════════════════════════════════════════════════════════
// INTERFACES
// ════════════════════════════════════════════════════════════════════════════
export interface TimelineCandidato {
  nombre: string;
  email: string;
  fecha_aplico: string;
  match_porcentaje: number;
  estado: string;
}

export interface TimelineEvento {
  fecha_hora: string;
  tipo: string;
  descripcion: string;
}

export interface TimelineReportData {
  puesto: string;
  cliente: string;
  fecha_reporte: string;
  
  // KPIs
  dias_abierto: number;
  total_candidatos: number;
  match_promedio: number;
  total_eventos: number;
  
  // Candidatos
  candidatos: TimelineCandidato[];
  
  // Eventos
  eventos: TimelineEvento[];
  
  // Opciones de diseño
  incluirMarcaAgua?: boolean;
  includeCover?: boolean;
  cover_subtitle?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// CLASE GENERADORA DEL PDF
// ════════════════════════════════════════════════════════════════════════════
export class TimelineReportPDF {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private contentWidth: number;
  private currentY: number;
  private pageNumber: number;
  private totalPages: number;
  private incluirMarcaAgua: boolean = true;
  private includeCover: boolean = true;

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter',
    });
    
    this.pageWidth = 215.9;
    this.pageHeight = 279.4;
    this.margin = 12;
    this.contentWidth = this.pageWidth - (this.margin * 2);
    this.currentY = this.margin;
    this.pageNumber = 1;
    this.totalPages = 2;
  }

  /**
   * Aplica marca de agua con el logo de Bausen
   * Se renderiza con opacidad sutil ENCIMA del contenido
   * Posicionada en la parte inferior izquierda del documento
   */
  private aplicarMarcaAgua(): void {
    if (!this.incluirMarcaAgua) return;
    
    const anyDoc = this.doc as any;
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
      anyDoc.addImage(imgData, 'PNG', x, y, wmW, wmH, `WM_BAUSEN_TIMELINE_${this.pageNumber}`, 'FAST');
      
      // Restaurar estado gráfico a opacidad completa
      if (hasGState) {
        anyDoc.setGState(new anyDoc.GState({ opacity: 1 }));
      }
      if (typeof anyDoc.restoreGraphicsState === 'function') {
        anyDoc.restoreGraphicsState();
      }
      
      console.log(`✅ [PDF Timeline] Marca de agua aplicada correctamente en página ${this.pageNumber}`);
    } catch (e) {
      console.warn(`⚠️ [PDF Timeline] Marca de agua no pudo renderizarse en página ${this.pageNumber}:`, e);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GENERAR PDF COMPLETO
  // ══════════════════════════════════════════════════════════════════════════
  generate(data: TimelineReportData): jsPDF {
    // Configurar opción de marca de agua
    this.incluirMarcaAgua = data.incluirMarcaAgua !== false;
    this.includeCover = data.includeCover !== false;
    
    // Limpiar datos
    const cleanData = this.cleanAllData(data);

    if (this.includeCover) {
      this.drawCoverPage(cleanData);
      this.doc.addPage();
      this.currentY = this.margin;
      this.pageNumber = 2;
    } else {
      this.pageNumber = 1;
    }
    
    // Calcular métricas derivadas
    const metrics = this.calculateMetrics(cleanData);
    
    // ─── PÁGINA 1: Dashboard + KPIs + Gantt ───
    this.drawHeaderBand(cleanData);
    this.drawKPICards(cleanData, metrics);
    this.drawGanttDiagram(cleanData, metrics);
    this.drawFooter();
    
    // Aplicar marca de agua a la página 1
    this.aplicarMarcaAgua();
    
    // ─── PÁGINA 2: Candidatos + Eficiencia + Eventos ───
    this.doc.addPage();
    this.pageNumber += 1;
    this.currentY = this.margin;
    
    this.drawPageHeader('CANDIDATOS Y ANÁLISIS', cleanData);
    this.drawCandidateCards(cleanData);
    this.drawEfficiencyComparison(metrics);
    this.drawEventsTimeline(cleanData);
    this.drawFooter();
    
    // Aplicar marca de agua a la página 2
    this.aplicarMarcaAgua();
    
    return this.doc;
  }

  private drawCoverPage(data: TimelineReportData): void {
    drawReportCover(this.doc, {
      title: 'Timeline del Proceso',
      subtitle: data.cover_subtitle || 'Reporte ejecutivo de avance temporal, hitos y eficiencia del proceso',
      logoBase64: BAUSEN_LOGO_WHITE_BASE64,
      logoRatio: BAUSEN_LOGO_WHITE_RATIO,
      generatedAt: new Date(),
      metadata: [
        { label: 'Vacante', value: data.puesto },
        { label: 'Cliente', value: data.cliente },
        { label: 'Días Abierto', value: data.dias_abierto },
        { label: 'Eventos', value: data.total_eventos },
      ],
      footerText: 'Bausen Reclutamiento • Documento ejecutivo',
    });
  }

  private cleanAllData(data: TimelineReportData): TimelineReportData {
    return {
      ...data,
      puesto: fixMojibake(data.puesto),
      cliente: fixMojibake(data.cliente),
      candidatos: data.candidatos.map(c => ({
        ...c,
        nombre: fixMojibake(c.nombre),
        email: fixMojibake(c.email),
      })),
      eventos: data.eventos.map(e => ({
        ...e,
        tipo: fixMojibake(e.tipo),
        descripcion: fixMojibake(e.descripcion),
      })),
    };
  }

  private calculateMetrics(data: TimelineReportData) {
    // Calcular tiempo total del proceso
    const tiempoTotalHoras = data.dias_abierto * 24;
    const benchmarkHoras = 360; // 15 días promedio industria
    const ahorroHoras = benchmarkHoras - tiempoTotalHoras;
    const ahorroDias = Math.max(0, ahorroHoras / 24);
    const eficienciaPorcentaje = Math.min(100, (benchmarkHoras / Math.max(tiempoTotalHoras, 1)) * 50);
    
    // Fases del proceso (sintéticas basadas en eventos)
    const fases = [
      { nombre: 'Creación del Perfil', duracion: 5, color: COLORS.primary },
      { nombre: 'Recepción de Candidatos', duracion: data.dias_abierto * 24 - 5, color: COLORS.success },
    ];
    
    return {
      tiempoTotalHoras,
      benchmarkHoras,
      ahorroHoras,
      ahorroDias,
      eficienciaPorcentaje,
      fases,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HEADER LIMPIO (FONDO BLANCO)
  // ══════════════════════════════════════════════════════════════════════════
  private drawHeaderBand(data: TimelineReportData): void {
    const headerHeight = 32;
    
    // Fondo blanco del header
    this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    this.doc.rect(0, 0, this.pageWidth, headerHeight, 'F');
    
    // Línea decorativa inferior azul
    this.doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    this.doc.rect(0, headerHeight, this.pageWidth, 1, 'F');
    
    // Logo Bausen (a la izquierda)
    try {
      const logoHeight = 14;
      const logoWidth = logoHeight * 3.46;
      this.doc.addImage(BAUSEN_LOGO_BASE64, 'PNG', this.margin, 5, logoWidth, logoHeight);
    } catch {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(16);
      this.doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      this.doc.text('BAUSEN', this.margin, 14);
    }
    
    // Etiqueta "TIMELINE DEL PROCESO" (pequeña, arriba)
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.setTextColor(COLORS.textSecondary.r, COLORS.textSecondary.g, COLORS.textSecondary.b);
    this.doc.text('TIMELINE DEL PROCESO', this.margin, headerHeight + 8);
    
    // Nombre del puesto (grande)
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(16);
    this.doc.setTextColor(COLORS.textPrimary.r, COLORS.textPrimary.g, COLORS.textPrimary.b);
    this.doc.text(data.puesto.toUpperCase(), this.margin, headerHeight + 16);
    
    // Cliente y fecha (debajo del puesto)
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.setTextColor(COLORS.textSecondary.r, COLORS.textSecondary.g, COLORS.textSecondary.b);
    this.doc.text(`${data.cliente} • ${data.fecha_reporte}`, this.margin, headerHeight + 22);
    
    this.currentY = headerHeight + 30;
  }

  private drawPageHeader(title: string, data: TimelineReportData): void {
    const headerHeight = 22;
    
    // Fondo blanco
    this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    this.doc.rect(0, 0, this.pageWidth, headerHeight, 'F');
    
    // Línea decorativa inferior azul
    this.doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    this.doc.rect(0, headerHeight, this.pageWidth, 1, 'F');
    
    // Logo pequeño
    try {
      const logoHeight = 10;
      const logoWidth = logoHeight * 3.46;
      this.doc.addImage(BAUSEN_LOGO_BASE64, 'PNG', this.margin, 6, logoWidth, logoHeight);
    } catch {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(12);
      this.doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      this.doc.text('BAUSEN', this.margin, 14);
    }
    
    // Título centrado
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(14);
    this.doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    this.doc.text(title, this.pageWidth / 2, 14, { align: 'center' });
    
    // Puesto (derecha)
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.setTextColor(COLORS.textSecondary.r, COLORS.textSecondary.g, COLORS.textSecondary.b);
    this.doc.text(data.puesto, this.pageWidth - this.margin, 14, { align: 'right' });
    
    this.currentY = headerHeight + 10;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // KPI CARDS (4 cards con barra de color superior)
  // ══════════════════════════════════════════════════════════════════════════
  private drawKPICards(data: TimelineReportData, metrics: ReturnType<typeof this.calculateMetrics>): void {
    const cardWidth = (this.contentWidth - 12) / 4;
    const cardHeight = 36;
    const gap = 4;
    
    const kpis = [
      {
        value: `${data.dias_abierto}`,
        unit: 'días',
        label: 'Tiempo Abierto',
        subtext: `${metrics.tiempoTotalHoras.toFixed(0)} hrs`,
        color: COLORS.primary,
      },
      {
        value: `${data.total_candidatos}`,
        unit: '',
        label: 'Candidatos',
        subtext: `${data.total_eventos} eventos`,
        color: COLORS.success,
      },
      {
        value: `${data.match_promedio.toFixed(1)}`,
        unit: '%',
        label: 'Match Promedio',
        subtext: 'del pool',
        color: COLORS.accent,
      },
      {
        value: `${metrics.eficienciaPorcentaje.toFixed(0)}`,
        unit: '%',
        label: 'Eficiencia',
        subtext: 'vs industria',
        color: COLORS.warning,
      },
    ];
    
    kpis.forEach((kpi, index) => {
      const x = this.margin + (cardWidth + gap) * index;
      this.drawKPICard(x, this.currentY, cardWidth, cardHeight, kpi);
    });
    
    this.currentY += cardHeight + 10;
  }

  private drawKPICard(
    x: number,
    y: number,
    width: number,
    height: number,
    kpi: { value: string; unit: string; label: string; subtext: string; color: { r: number; g: number; b: number } }
  ): void {
    // Fondo blanco con sombra sutil (borde)
    this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    this.doc.roundedRect(x, y, width, height, 2, 2, 'F');
    
    // Borde
    this.doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(x, y, width, height, 2, 2, 'S');
    
    // Barra superior de color
    this.doc.setFillColor(kpi.color.r, kpi.color.g, kpi.color.b);
    this.doc.roundedRect(x, y, width, 4, 2, 2, 'F');
    this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    this.doc.rect(x, y + 3, width, 2, 'F');
    
    // Valor grande
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(18);
    this.doc.setTextColor(kpi.color.r, kpi.color.g, kpi.color.b);
    
    const valueText = kpi.value + kpi.unit;
    this.doc.text(valueText, x + width / 2, y + 16, { align: 'center' });
    
    // Label
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7);
    this.doc.setTextColor(COLORS.textPrimary.r, COLORS.textPrimary.g, COLORS.textPrimary.b);
    this.doc.text(kpi.label, x + width / 2, y + 23, { align: 'center' });
    
    // Subtext
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6);
    this.doc.setTextColor(COLORS.textSecondary.r, COLORS.textSecondary.g, COLORS.textSecondary.b);
    this.doc.text(kpi.subtext, x + width / 2, y + 29, { align: 'center' });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DIAGRAMA TIPO GANTT
  // ══════════════════════════════════════════════════════════════════════════
  private drawGanttDiagram(data: TimelineReportData, metrics: ReturnType<typeof this.calculateMetrics>): void {
    const ganttY = this.currentY + 4;
    const ganttHeight = 80;
    
    // Título de sección
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.setTextColor(COLORS.textPrimary.r, COLORS.textPrimary.g, COLORS.textPrimary.b);
    this.doc.text('DIAGRAMA DEL PROCESO', this.margin, ganttY);
    
    // Contenedor con borde sutil
    const containerY = ganttY + 8;
    this.doc.setFillColor(COLORS.lightBg.r, COLORS.lightBg.g, COLORS.lightBg.b);
    this.doc.roundedRect(this.margin, containerY, this.contentWidth, ganttHeight - 8, 4, 4, 'F');
    this.doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(this.margin, containerY, this.contentWidth, ganttHeight - 8, 4, 4, 'S');
    
    // Eje horizontal (timeline)
    const axisY = containerY + ganttHeight - 22;
    const axisStartX = this.margin + 55;
    const axisEndX = this.pageWidth - this.margin - 35;
    const axisWidth = axisEndX - axisStartX;
    
    // Línea del eje
    this.doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    this.doc.setLineWidth(0.5);
    this.doc.line(axisStartX, axisY, axisEndX, axisY);
    
    // Marcas del eje
    const marks = [
      { pos: 0, label: 'Inicio' },
      { pos: 0.5, label: '50%' },
      { pos: 1, label: 'Actual' },
    ];
    
    marks.forEach(mark => {
      const markX = axisStartX + axisWidth * mark.pos;
      this.doc.line(markX, axisY - 2, markX, axisY + 2);
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6);
      this.doc.setTextColor(COLORS.textSecondary.r, COLORS.textSecondary.g, COLORS.textSecondary.b);
      this.doc.text(mark.label, markX, axisY + 7, { align: 'center' });
    });
    
    // Fases del proceso (barras Gantt)
    const trackHeight = 14;
    const trackGap = 6;
    let trackY = containerY + 14;
    
    const totalDuration = metrics.fases.reduce((sum, f) => sum + f.duracion, 0);
    let currentOffset = 0;
    
    metrics.fases.forEach((fase) => {
      // Track gris de fondo
      this.doc.setFillColor(COLORS.ganttTrack.r, COLORS.ganttTrack.g, COLORS.ganttTrack.b);
      this.doc.roundedRect(axisStartX, trackY, axisWidth, trackHeight, 2, 2, 'F');
      
      // Barra de progreso de la fase
      const barStart = (currentOffset / totalDuration) * axisWidth;
      const barWidth = (fase.duracion / totalDuration) * axisWidth;
      
      this.doc.setFillColor(fase.color.r, fase.color.g, fase.color.b);
      this.doc.roundedRect(axisStartX + barStart, trackY, barWidth, trackHeight, 2, 2, 'F');
      
      // Nombre de la fase (izquierda)
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7);
      this.doc.setTextColor(COLORS.textPrimary.r, COLORS.textPrimary.g, COLORS.textPrimary.b);
      this.doc.text(fase.nombre, this.margin + 4, trackY + 8);
      
      // Duración (derecha)
      const duracionText = fase.duracion < 60 ? `${fase.duracion} min` : `${(fase.duracion / 24).toFixed(1)} días`;
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7);
      this.doc.setTextColor(COLORS.textSecondary.r, COLORS.textSecondary.g, COLORS.textSecondary.b);
      this.doc.text(duracionText, this.pageWidth - this.margin - 4, trackY + 8, { align: 'right' });
      
      currentOffset += fase.duracion;
      trackY += trackHeight + trackGap;
    });
    
    // Leyenda del tiempo total
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    this.doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    this.doc.text(
      `Tiempo total: ${data.dias_abierto} días (${metrics.tiempoTotalHoras.toFixed(0)} hrs)`,
      this.pageWidth - this.margin,
      containerY + 8,
      { align: 'right' }
    );
    
    this.currentY = containerY + ganttHeight;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TARJETAS DE CANDIDATOS
  // ══════════════════════════════════════════════════════════════════════════
  private drawCandidateCards(data: TimelineReportData): void {
    // Título de sección
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.setTextColor(COLORS.textPrimary.r, COLORS.textPrimary.g, COLORS.textPrimary.b);
    this.doc.text('CANDIDATOS DEL PROCESO', this.margin, this.currentY);
    
    this.currentY += 6;
    
    // Ordenar por match descendente
    const sortedCandidatos = [...data.candidatos].sort((a, b) => b.match_porcentaje - a.match_porcentaje);
    
    // Grid de 3 columnas - tarjetas bien proporcionadas
    const cardWidth = (this.contentWidth - 6) / 3;
    const cardHeight = 24;
    const gap = 3;
    
    sortedCandidatos.forEach((candidato, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = this.margin + (cardWidth + gap) * col;
      const y = this.currentY + row * (cardHeight + gap);
      
      const isTop = index < 2; // Resaltar top 2
      
      this.drawCandidateCard(x, y, cardWidth, cardHeight, candidato, isTop, index + 1);
    });
    
    const rows = Math.ceil(data.candidatos.length / 3);
    this.currentY += rows * (cardHeight + gap) + 6;
  }

  private drawCandidateCard(
    x: number,
    y: number,
    width: number,
    height: number,
    candidato: TimelineCandidato,
    isTop: boolean,
    rank: number
  ): void {
    // Fondo
    const bgColor = isTop ? { r: 240, g: 253, b: 244 } : COLORS.white;
    this.doc.setFillColor(bgColor.r, bgColor.g, bgColor.b);
    this.doc.roundedRect(x, y, width, height, 2, 2, 'F');
    
    // Borde
    const borderColor = isTop ? COLORS.success : COLORS.border;
    this.doc.setDrawColor(borderColor.r, borderColor.g, borderColor.b);
    this.doc.setLineWidth(isTop ? 0.6 : 0.3);
    this.doc.roundedRect(x, y, width, height, 2, 2, 'S');
    
    // Avatar con iniciales
    const avatarSize = 10;
    const avatarX = x + 8;
    const avatarY = y + height / 2;
    
    const avatarColor = isTop ? COLORS.success : COLORS.primary;
    this.doc.setFillColor(avatarColor.r, avatarColor.g, avatarColor.b);
    this.doc.circle(avatarX, avatarY, avatarSize / 2, 'F');
    
    const initials = this.getInitials(candidato.nombre);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6);
    this.doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    this.doc.text(initials, avatarX, avatarY + 1, { align: 'center' });
    
    // Badge de ranking (top 2)
    if (isTop) {
      this.doc.setFillColor(COLORS.warning.r, COLORS.warning.g, COLORS.warning.b);
      this.doc.circle(avatarX + avatarSize / 2 - 1, avatarY - avatarSize / 2 + 1, 2.5, 'F');
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(4);
      this.doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      this.doc.text(`${rank}`, avatarX + avatarSize / 2 - 1, avatarY - avatarSize / 2 + 2, { align: 'center' });
    }
    
    // ═══════════════════════════════════════════════════════════════
    // CONTENIDO A LA DERECHA DEL AVATAR
    // ═══════════════════════════════════════════════════════════════
    const textStartX = avatarX + avatarSize / 2 + 3;
    const cardPadding = 3;
    const availableWidth = width - (textStartX - x) - cardPadding;
    
    // FILA 1: Nombre + Barra de Match (en la misma línea)
    const row1Y = y + 7;
    
    // Calcular espacio para la barra y porcentaje
    const percentTextWidth = 12; // espacio para "78%"
    const matchBarWidth = 20;
    const matchSectionWidth = matchBarWidth + percentTextWidth;
    const nameMaxWidth = availableWidth - matchSectionWidth - 2;
    
    // Nombre (truncado para que quepa)
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6);
    this.doc.setTextColor(COLORS.textPrimary.r, COLORS.textPrimary.g, COLORS.textPrimary.b);
    const truncatedName = this.truncateText(candidato.nombre, nameMaxWidth, 6);
    this.doc.text(truncatedName, textStartX, row1Y);
    
    // Barra de Match % (alineada a la derecha del card)
    const matchBarX = x + width - cardPadding - percentTextWidth - matchBarWidth;
    const matchBarY = row1Y - 2.5;
    const matchBarHeight = 3;
    
    // Fondo de la barra
    this.doc.setFillColor(COLORS.ganttTrack.r, COLORS.ganttTrack.g, COLORS.ganttTrack.b);
    this.doc.roundedRect(matchBarX, matchBarY, matchBarWidth, matchBarHeight, 1, 1, 'F');
    
    // Progreso
    const progressColor = candidato.match_porcentaje >= 70 ? COLORS.success :
                         candidato.match_porcentaje >= 50 ? COLORS.warning : COLORS.danger;
    const progressWidth = (candidato.match_porcentaje / 100) * matchBarWidth;
    this.doc.setFillColor(progressColor.r, progressColor.g, progressColor.b);
    this.doc.roundedRect(matchBarX, matchBarY, progressWidth, matchBarHeight, 1, 1, 'F');
    
    // Porcentaje texto (pegado a la barra, dentro del card)
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(5);
    this.doc.setTextColor(progressColor.r, progressColor.g, progressColor.b);
    this.doc.text(`${candidato.match_porcentaje}%`, matchBarX + matchBarWidth + 1, row1Y);
    
    // FILA 2: Fecha
    const row2Y = y + 13;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(5);
    this.doc.setTextColor(COLORS.textSecondary.r, COLORS.textSecondary.g, COLORS.textSecondary.b);
    const shortDate = this.extractShortDate(candidato.fecha_aplico);
    this.doc.text(shortDate, textStartX, row2Y);
    
    // FILA 3: Estado badge
    const row3Y = y + 17;
    this.drawMiniStateBadge(textStartX, row3Y, candidato.estado);
  }

  private drawMiniStateBadge(x: number, y: number, estado: string): void {
    this.doc.setFontSize(4);
    const badgeWidth = Math.min(this.doc.getTextWidth(estado) + 3, 22);
    const badgeHeight = 4;
    
    this.doc.setFillColor(224, 231, 255);
    this.doc.roundedRect(x, y, badgeWidth, badgeHeight, 1, 1, 'F');
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(4);
    this.doc.setTextColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
    this.doc.text(estado, x + 1.5, y + 3);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // COMPARATIVA DE EFICIENCIA
  // ══════════════════════════════════════════════════════════════════════════
  private drawEfficiencyComparison(metrics: ReturnType<typeof this.calculateMetrics>): void {
    const sectionY = this.currentY;
    const sectionHeight = 42;
    
    // Título
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.setTextColor(COLORS.textPrimary.r, COLORS.textPrimary.g, COLORS.textPrimary.b);
    this.doc.text('COMPARATIVA DE EFICIENCIA', this.margin, sectionY);
    
    // Contenedor con borde
    const containerY = sectionY + 6;
    this.doc.setFillColor(COLORS.lightBg.r, COLORS.lightBg.g, COLORS.lightBg.b);
    this.doc.roundedRect(this.margin, containerY, this.contentWidth, sectionHeight - 6, 3, 3, 'F');
    this.doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(this.margin, containerY, this.contentWidth, sectionHeight - 6, 3, 3, 'S');
    
    // Calcular escala proporcional (el mayor valor = 100% del ancho)
    const maxHoras = Math.max(metrics.tiempoTotalHoras, metrics.benchmarkHoras);
    const barMaxWidth = this.contentWidth - 95;
    const barHeight = 10;
    const barX = this.margin + 60;
    
    // Barra: Este proceso
    const bar1Y = containerY + 10;
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7);
    this.doc.setTextColor(COLORS.textPrimary.r, COLORS.textPrimary.g, COLORS.textPrimary.b);
    this.doc.text('Este proceso', this.margin + 4, bar1Y + 7);
    
    // Fondo de la barra
    this.doc.setFillColor(COLORS.ganttTrack.r, COLORS.ganttTrack.g, COLORS.ganttTrack.b);
    this.doc.roundedRect(barX, bar1Y, barMaxWidth, barHeight, 2, 2, 'F');
    
    // Progreso proporcional
    const progress1Width = (metrics.tiempoTotalHoras / maxHoras) * barMaxWidth;
    const processColor = metrics.tiempoTotalHoras <= metrics.benchmarkHoras ? COLORS.success : COLORS.warning;
    this.doc.setFillColor(processColor.r, processColor.g, processColor.b);
    this.doc.roundedRect(barX, bar1Y, progress1Width, barHeight, 2, 2, 'F');
    
    // Valor a la derecha
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(8);
    this.doc.setTextColor(processColor.r, processColor.g, processColor.b);
    this.doc.text(`${metrics.tiempoTotalHoras.toFixed(0)} hrs`, barX + barMaxWidth + 4, bar1Y + 7);
    
    // Barra: Promedio industria
    const bar2Y = containerY + 24;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7);
    this.doc.setTextColor(COLORS.textSecondary.r, COLORS.textSecondary.g, COLORS.textSecondary.b);
    this.doc.text('Prom. industria', this.margin + 4, bar2Y + 7);
    
    // Fondo de la barra
    this.doc.setFillColor(COLORS.ganttTrack.r, COLORS.ganttTrack.g, COLORS.ganttTrack.b);
    this.doc.roundedRect(barX, bar2Y, barMaxWidth, barHeight, 2, 2, 'F');
    
    // Barra proporcional del benchmark
    const progress2Width = (metrics.benchmarkHoras / maxHoras) * barMaxWidth;
    this.doc.setFillColor(COLORS.textSecondary.r, COLORS.textSecondary.g, COLORS.textSecondary.b);
    this.doc.roundedRect(barX, bar2Y, progress2Width, barHeight, 2, 2, 'F');
    
    // Valor a la derecha
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(8);
    this.doc.text(`${metrics.benchmarkHoras} hrs`, barX + barMaxWidth + 4, bar2Y + 7);
    
    this.currentY = containerY + sectionHeight;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TIMELINE DE EVENTOS
  // ══════════════════════════════════════════════════════════════════════════
  private drawEventsTimeline(data: TimelineReportData): void {
    // Título
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.setTextColor(COLORS.textPrimary.r, COLORS.textPrimary.g, COLORS.textPrimary.b);
    this.doc.text('DETALLE DE EVENTOS', this.margin, this.currentY);
    
    this.currentY += 6;
    
    // Altura máxima disponible (dejar espacio para el footer)
    const maxY = this.pageHeight - 20;
    
    // Agrupar eventos por día
    const eventosPorDia = this.groupEventsByDay(data.eventos);
    
    Object.entries(eventosPorDia).forEach(([dia, eventos]) => {
      // Verificar si hay espacio para el header del día + al menos 1 evento
      if (this.currentY + 16 > maxY) {
        return; // Saltar si no hay espacio
      }
      
      // Separador de día
      this.doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, 5, 1, 1, 'F');
      
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6);
      this.doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      this.doc.text(dia, this.margin + 3, this.currentY + 3.5);
      
      this.currentY += 7;
      
      // Eventos del día (limitar para que no se desborde)
      eventos.forEach((evento, index) => {
        if (this.currentY + 10 > maxY) {
          return; // No dibujar si no hay espacio
        }
        this.drawEventItem(evento, index === eventos.length - 1);
      });
      
      this.currentY += 2;
    });
  }

  private groupEventsByDay(eventos: TimelineEvento[]): { [key: string]: TimelineEvento[] } {
    const grupos: { [key: string]: TimelineEvento[] } = {};
    
    eventos.forEach(evento => {
      // Extraer fecha (ej: "25 de noviembre de 2025")
      const match = evento.fecha_hora.match(/(\d+ de \w+ de \d+)/);
      const dia = match ? match[1] : 'Sin fecha';
      
      if (!grupos[dia]) grupos[dia] = [];
      grupos[dia].push(evento);
    });
    
    return grupos;
  }

  private drawEventItem(evento: TimelineEvento, isLast: boolean): void {
    const itemHeight = 10;
    const dotSize = 3;
    const lineX = this.margin + 5;
    
    // Línea vertical del timeline
    if (!isLast) {
      this.doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
      this.doc.setLineWidth(0.4);
      this.doc.line(lineX, this.currentY + dotSize, lineX, this.currentY + itemHeight);
    }
    
    // Punto del evento
    const dotColor = evento.tipo.includes('Creado') ? COLORS.primary :
                    evento.tipo.includes('Aplicó') ? COLORS.success : COLORS.accent;
    this.doc.setFillColor(dotColor.r, dotColor.g, dotColor.b);
    this.doc.circle(lineX, this.currentY + 2, dotSize / 2, 'F');
    
    // Hora
    const horaMatch = evento.fecha_hora.match(/(\d+:\d+ [ap]\.m\.)/);
    const hora = horaMatch ? horaMatch[1] : '';
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(5);
    this.doc.setTextColor(COLORS.textSecondary.r, COLORS.textSecondary.g, COLORS.textSecondary.b);
    this.doc.text(hora, lineX + 5, this.currentY + 3);
    
    // Tipo (badge más compacto)
    const badgeX = lineX + 26;
    this.doc.setFontSize(4);
    const badgeWidth = Math.min(this.doc.getTextWidth(evento.tipo) + 4, 35);
    this.doc.setFillColor(dotColor.r, dotColor.g, dotColor.b);
    this.doc.roundedRect(badgeX, this.currentY, badgeWidth, 4, 1, 1, 'F');
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(4);
    this.doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    this.doc.text(evento.tipo, badgeX + 2, this.currentY + 3);
    
    // Descripción
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(6);
    this.doc.setTextColor(COLORS.textPrimary.r, COLORS.textPrimary.g, COLORS.textPrimary.b);
    const descX = badgeX + badgeWidth + 3;
    const maxDescWidth = this.contentWidth - (descX - this.margin) - 2;
    const truncatedDesc = this.truncateText(evento.descripcion, maxDescWidth, 6);
    this.doc.text(truncatedDesc, descX, this.currentY + 3);
    
    this.currentY += itemHeight;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FOOTER
  // ══════════════════════════════════════════════════════════════════════════
  private drawFooter(): void {
    const footerY = this.pageHeight - 10;
    
    // Línea superior
    this.doc.setDrawColor(COLORS.border.r, COLORS.border.g, COLORS.border.b);
    this.doc.setLineWidth(0.3);
    this.doc.line(this.margin, footerY - 3, this.pageWidth - this.margin, footerY - 3);
    
    // Texto izquierda
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7);
    this.doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    this.doc.text('BAUSEN', this.margin, footerY);
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(COLORS.textSecondary.r, COLORS.textSecondary.g, COLORS.textSecondary.b);
    this.doc.text(' | Sistema de Gestión de Talento', this.margin + 14, footerY);
    
    // Centro
    this.doc.setFont('helvetica', 'italic');
    this.doc.setFontSize(6);
    this.doc.text('Documento confidencial', this.pageWidth / 2, footerY, { align: 'center' });
    
    // Derecha
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(7);
    this.doc.text(`Página ${this.pageNumber} de ${this.totalPages}`, this.pageWidth - this.margin, footerY, { align: 'right' });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ══════════════════════════════════════════════════════════════════════════
  private getInitials(name: string): string {
    return name
      .split(' ')
      .filter(word => word.length > 0)
      .slice(0, 2)
      .map(word => word[0].toUpperCase())
      .join('');
  }

  private truncateText(text: string, maxWidth: number, fontSize: number): string {
    this.doc.setFontSize(fontSize);
    if (this.doc.getTextWidth(text) <= maxWidth) {
      return text;
    }
    
    let truncated = text;
    while (this.doc.getTextWidth(truncated + '...') > maxWidth && truncated.length > 0) {
      truncated = truncated.slice(0, -1);
    }
    return truncated + '...';
  }

  private extractShortDate(fechaHora: string): string {
    // De "26 de noviembre de 2025, 05:27 p.m." extraer "26 nov 05:27"
    const match = fechaHora.match(/(\d+) de (\w+) de \d+, (\d+:\d+)/);
    if (match) {
      const meses: { [key: string]: string } = {
        enero: 'ene', febrero: 'feb', marzo: 'mar', abril: 'abr',
        mayo: 'may', junio: 'jun', julio: 'jul', agosto: 'ago',
        septiembre: 'sep', octubre: 'oct', noviembre: 'nov', diciembre: 'dic',
      };
      const mesCorto = meses[match[2].toLowerCase()] || match[2].substring(0, 3);
      return `${match[1]} ${mesCorto} ${match[3]}`;
    }
    return fechaHora.substring(0, 15);
  }
}

// ════════════════════════════════════════════════════════════════════════════
// FUNCIONES EXPORTABLES
// ════════════════════════════════════════════════════════════════════════════
export function generateTimelineReportPDF(data: TimelineReportData): jsPDF {
  const generator = new TimelineReportPDF();
  return generator.generate(data);
}

export function downloadTimelineReportPDF(data: TimelineReportData, filename?: string): void {
  const generator = new TimelineReportPDF();
  const pdf = generator.generate(data);
  const defaultFilename = `Timeline_${data.puesto.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename || defaultFilename);
}

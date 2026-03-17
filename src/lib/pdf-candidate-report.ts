/**
 * ════════════════════════════════════════════════════════════════════════════
 * PDF CANDIDATE REPORT - DISEÑO DASHBOARD MODERNO
 * ════════════════════════════════════════════════════════════════════════════
 * 
 * Genera PDF tipo dashboard para reporte individual de candidato.
 * Diseño consistente con los demás PDFs del sistema.
 * 
 * Features:
 * - Header blanco con logo Bausen
 * - Avatar con iniciales del candidato
 * - KPIs: Aplicaciones, Documentos, Evaluaciones, Experiencia
 * - Info de contacto e info profesional en 2 columnas
 * - Skills como badges
 * - Tabla de historial de aplicaciones
 * - Corrección de mojibake UTF-8
 * 
 * ════════════════════════════════════════════════════════════════════════════
 */

import jsPDF from 'jspdf';
import { BAUSEN_LOGO_BASE64 } from './logo-base64';
import { BAUSEN_LOGO_WHITE_BASE64, BAUSEN_LOGO_WHITE_RATIO } from './logo-white-base64';
import { BECHAPRA_WATERMARK_B_BASE64 } from './watermarkBase64';
import { drawReportCover } from './pdf-cover-utils';

// ════════════════════════════════════════════════════════════════════════════
// COLORES CORPORATIVOS
// ════════════════════════════════════════════════════════════════════════════
const COLORS = {
  primary: { r: 0, g: 71, b: 171 },      // Azul corporativo
  accent: { r: 255, g: 107, b: 0 },       // Naranja Bausen
  success: { r: 16, g: 185, b: 129 },     // Verde
  warning: { r: 245, g: 158, b: 11 },     // Amarillo
  danger: { r: 239, g: 68, b: 68 },       // Rojo
  dark: { r: 31, g: 41, b: 55 },          // Gris oscuro
  gray: { r: 107, g: 114, b: 128 },       // Gris medio
  light: { r: 243, g: 244, b: 246 },      // Gris claro
  white: { r: 255, g: 255, b: 255 },      // Blanco
  black: { r: 0, g: 0, b: 0 },            // Negro
};

// ════════════════════════════════════════════════════════════════════════════
// FUNCIÓN PARA CORREGIR MOJIBAKE (UTF-8 mal interpretado como Latin-1)
// ════════════════════════════════════════════════════════════════════════════
function fixMojibake(value: any): string {
  if (value === null || value === undefined) return '';

  let result = String(value);

  // 1) Decodificar entidades HTML comunes (si vienen del backend)
  result = result
    .replace(/&#x([0-9A-Fa-f]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(parseInt(code, 10)))
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&');

  // 2) Quitar NULs y controles (ESTO es lo que te estaba separando letras)
  //    - Antes tú los convertías a " " y quedaba "L e o n a r d o"
  result = result
    .replace(/\u0000/g, '') // NUL intercalado típico de UTF-16 mal interpretado
    .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // otros controles
    .replace(/[\r\n\t]+/g, ' '); // normalizar saltos/ tabs a espacio

  // 3) Mojibake común "Ã¡" (UTF-8 leído como Latin-1)
  //    Intento seguro usando TextDecoder si existe
  if (/[ÃÂ][\x80-\xBF]/.test(result) && typeof TextDecoder !== 'undefined') {
    try {
      const bytes = Uint8Array.from(result, c => c.charCodeAt(0) & 0xff);
      const decoded = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      // solo usar si realmente mejora (heurística simple)
      if (decoded && decoded.length >= result.length * 0.6) result = decoded;
    } catch {
      // ignore
    }
  }

  // 4) Mojibake tipo "├í", "├®", "├▒" (CP437/CP850) — tu caso histórico
  const map: Record<string, string> = {
    // minúsculas (variantes cp437/cp850)
    '├í': 'á',
    '├®': 'é',
    '├¡': 'í',
    '├ó': 'ó',
    '├│': 'ó',
    '├ú': 'ú',
    '├║': 'ú',
    '├ñ': 'ñ',
    '├▒': 'ñ',

    // mayúsculas comunes
    '├ü': 'Á',
    '├ë': 'É',
    '├ì': 'Í',
    '├ô': 'Ó',
    '├Ü': 'Ú',
    '├Ñ': 'Ñ',
  };

  result = result.replace(/├./g, (m) => map[m] ?? m);

  // 5) Normalizar espacios finales
  result = result.replace(/\s+/g, ' ').trim();

  return result;
}



// INTERFACES
// ════════════════════════════════════════════════════════════════════════════
export interface CandidateReportData {
  nombre: string;
  fecha_reporte: string;
  
  // Info de contacto
  contacto: {
    email: string;
    telefono: string;
    ciudad: string;
    estado: string;
  };
  
  // Info profesional
  profesional: {
    empresa_actual?: string;
    posicion_actual?: string;
    educacion: string;
    universidad?: string;
    experiencia_anios: number;
  };
  
  // KPIs
  estadisticas: {
    aplicaciones: number;
    documentos: number;
    evaluaciones: number;
  };
  
  // Habilidades
  habilidades: string[];
  
  // Historial de aplicaciones (con match)
  aplicaciones: Array<{
    perfil: string;
    cliente: string;
    estado: string;
    fecha: string;
    match_porcentaje?: number;
  }>;
  
  // Evaluaciones
  evaluaciones?: Array<{
    template: string;
    categoria?: string;
    estado: string;
    puntaje?: number | null;
    aprobado?: boolean | null;
    fecha?: string;
  }>;
  
  // Documentos
  documentos?: Array<{
    nombre: string;
    tipo: string;
    fecha: string;
  }>;
  
  // Notas internas
  notas?: Array<{
    tipo: string;
    contenido: string;
    autor?: string;
    fecha: string;
  }>;
  
  // Opciones de diseño
  incluirMarcaAgua?: boolean;
  includeCover?: boolean;
  cover_subtitle?: string;
}

// ════════════════════════════════════════════════════════════════════════════
// CLASE GENERADORA DEL PDF
// ════════════════════════════════════════════════════════════════════════════
export class CandidateReportPDF {
  private doc: jsPDF;
  private pageWidth: number;
  private pageHeight: number;
  private margin: number;
  private contentWidth: number;
  private currentY: number;
  private incluirMarcaAgua: boolean = true;
  private includeCover: boolean = true;
  private pageNumber: number = 1;

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter', // 215.9 x 279.4 mm
    });
    
    this.pageWidth = 215.9;
    this.pageHeight = 279.4;
    this.margin = 12;
    this.contentWidth = this.pageWidth - (this.margin * 2);
    this.currentY = this.margin;
  }
  
  /**
   * Aplica marca de agua con el logo de Bausen
   * Se renderiza con opacidad sutil ENCIMA del contenido
   */
  private aplicarMarcaAgua(): void {
    if (!this.incluirMarcaAgua) return;
    
    const anyDoc = this.doc as any;
    const imgData = BECHAPRA_WATERMARK_B_BASE64;
    
    try {
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
      
      anyDoc.addImage(imgData, 'PNG', x, y, wmW, wmH, `WM_BAUSEN_CANDIDATE_${this.pageNumber}`, 'FAST');
      
      if (hasGState) {
        anyDoc.setGState(new anyDoc.GState({ opacity: 1 }));
      }
      if (typeof anyDoc.restoreGraphicsState === 'function') {
        anyDoc.restoreGraphicsState();
      }
      
      console.log(`✅ [PDF Candidate] Marca de agua aplicada en página ${this.pageNumber}`);
    } catch (e) {
      console.warn(`⚠️ [PDF Candidate] Error al aplicar marca de agua:`, e);
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // GENERAR PDF COMPLETO
  // ══════════════════════════════════════════════════════════════════════════
  generate(data: CandidateReportData): jsPDF {
    // Configurar marca de agua
    this.incluirMarcaAgua = data.incluirMarcaAgua !== false;
    this.includeCover = data.includeCover !== false;
    
    // Limpiar todos los textos
    const cleanData: CandidateReportData = {
      nombre: fixMojibake(data.nombre),
      fecha_reporte: data.fecha_reporte,
      contacto: {
        email: fixMojibake(data.contacto.email),
        telefono: fixMojibake(data.contacto.telefono),
        ciudad: fixMojibake(data.contacto.ciudad),
        estado: fixMojibake(data.contacto.estado),
      },
      profesional: {
        empresa_actual: data.profesional.empresa_actual ? fixMojibake(data.profesional.empresa_actual) : undefined,
        posicion_actual: data.profesional.posicion_actual ? fixMojibake(data.profesional.posicion_actual) : undefined,
        educacion: fixMojibake(data.profesional.educacion),
        universidad: data.profesional.universidad ? fixMojibake(data.profesional.universidad) : undefined,
        experiencia_anios: data.profesional.experiencia_anios,
      },
      estadisticas: data.estadisticas,
      habilidades: data.habilidades.map(h => fixMojibake(h)),
      aplicaciones: data.aplicaciones.map(a => ({
        perfil: fixMojibake(a.perfil),
        cliente: fixMojibake(a.cliente),
        estado: fixMojibake(a.estado),
        fecha: a.fecha,
        match_porcentaje: a.match_porcentaje,
      })),
      evaluaciones: data.evaluaciones?.map(e => ({
        template: fixMojibake(e.template || 'Sin nombre'),
        categoria: e.categoria ? fixMojibake(e.categoria) : undefined,
        estado: fixMojibake(e.estado),
        puntaje: e.puntaje,
        aprobado: e.aprobado,
        fecha: e.fecha,
      })),
      documentos: data.documentos?.map(d => ({
        nombre: fixMojibake(d.nombre),
        tipo: fixMojibake(d.tipo),
        fecha: d.fecha,
      })),
      notas: data.notas?.map(n => ({
        tipo: fixMojibake(n.tipo),
        contenido: fixMojibake(n.contenido),
        autor: n.autor ? fixMojibake(n.autor) : undefined,
        fecha: n.fecha,
      })),
      includeCover: data.includeCover,
      cover_subtitle: data.cover_subtitle ? fixMojibake(data.cover_subtitle) : undefined,
    };

    if (this.includeCover) {
      this.drawCoverPage(cleanData);
      this.doc.addPage();
      this.pageNumber = 2;
      this.currentY = this.margin;
    }
    
    // Página 1
    this.drawHeader(cleanData);
    this.drawHeroSection(cleanData);
    this.drawKPIs(cleanData);
    this.drawInfoCards(cleanData);
    this.drawSkills(cleanData);
    this.drawApplicationsTable(cleanData);
    
    // Aplicar marca de agua en página 1
    this.aplicarMarcaAgua();
    
    // Página 2 (si hay contenido adicional)
    const hasAdditionalContent = 
      (cleanData.evaluaciones && cleanData.evaluaciones.length > 0) ||
      (cleanData.documentos && cleanData.documentos.length > 0) ||
      (cleanData.notas && cleanData.notas.length > 0);
    
    if (hasAdditionalContent) {
      this.doc.addPage();
      this.pageNumber += 1;
      this.currentY = this.margin;
      this.drawSecondaryHeader(cleanData);
      this.drawEvaluationsSection(cleanData);
      this.drawDocumentsSection(cleanData);
      this.drawNotesSection(cleanData);
      
      // Aplicar marca de agua en página 2
      this.aplicarMarcaAgua();
    }
    
    this.drawFooter();
    
    return this.doc;
  }

  private drawCoverPage(data: CandidateReportData): void {
    const appRef = data.aplicaciones?.length
      ? [...data.aplicaciones].sort((a, b) => {
          const da = new Date(a.fecha || '').getTime() || 0;
          const db = new Date(b.fecha || '').getTime() || 0;
          return db - da;
        })[0]
      : undefined;

    drawReportCover(this.doc, {
      title: 'Reporte de Candidato',
      subtitle: data.cover_subtitle || 'Reporte ejecutivo de perfil, experiencia y trazabilidad del candidato',
      logoBase64: BAUSEN_LOGO_WHITE_BASE64,
      logoRatio: BAUSEN_LOGO_WHITE_RATIO,
      generatedAt: new Date(),
      metadata: [
        { label: 'Cliente', value: appRef?.cliente || 'N/D' },
        { label: 'Perfil', value: appRef?.perfil || 'N/D' },
        { label: 'Estatus del Perfil', value: appRef?.estado || 'N/D' },
        { label: 'Fecha de Cumplimiento', value: 'N/D' },
        { label: 'Candidatos Aplicados', value: data.aplicaciones?.length || 0 },
        { label: 'Match Promedio', value: appRef?.match_porcentaje !== undefined ? `${appRef.match_porcentaje}%` : 'N/D' },
        { label: 'Cumplimiento vs Fecha', value: 'N/D' },
      ],
      footerText: 'Bausen Reclutamiento • Documento ejecutivo',
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HEADER BLANCO CON LOGO
  // ══════════════════════════════════════════════════════════════════════════
  private drawHeader(data: CandidateReportData): void {
    const headerHeight = 22;
    
    // Fondo blanco
    this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    this.doc.rect(0, 0, this.pageWidth, headerHeight, 'F');
    
    // Línea de acento azul en la parte inferior del header
    this.doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    this.doc.rect(0, headerHeight, this.pageWidth, 1.5, 'F');
    
    // Logo Bausen (izquierda)
    try {
      const logoHeight = 12;
      const logoWidth = logoHeight * 3.46;
      this.doc.addImage(BAUSEN_LOGO_BASE64, 'PNG', this.margin, 5, logoWidth, logoHeight);
    } catch (e) {
      // Fallback: texto BAUSEN
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(16);
      this.doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      this.doc.text('BAUSEN', this.margin, 14);
    }
    
    // Título centrado
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(14);
    this.doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
    this.doc.text('REPORTE DE CANDIDATO', this.pageWidth / 2, 12, { align: 'center' });
    
    // Fecha (derecha)
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
    this.doc.text(data.fecha_reporte, this.pageWidth - this.margin, 12, { align: 'right' });
    
    this.currentY = headerHeight + 6;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HERO SECTION CON NOMBRE Y AVATAR
  // ══════════════════════════════════════════════════════════════════════════
  private drawHeroSection(data: CandidateReportData): void {
    const heroHeight = 28;
    const heroY = this.currentY;
    
    // Fondo sutil
    this.doc.setFillColor(248, 250, 252);
    this.doc.roundedRect(this.margin, heroY, this.contentWidth, heroHeight, 3, 3, 'F');
    
    // Avatar circular con iniciales
    const avatarSize = 20;
    const avatarX = this.margin + 10;
    const avatarY = heroY + heroHeight / 2;
    
    // Círculo del avatar
    this.doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    this.doc.circle(avatarX, avatarY, avatarSize / 2, 'F');
    
    // Iniciales
    const initials = this.getInitials(data.nombre);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    this.doc.text(initials, avatarX, avatarY + 1, { align: 'center' });
    
    // Nombre grande
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(16);
    this.doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
    this.doc.text(data.nombre, avatarX + avatarSize / 2 + 8, heroY + 11);
    
    // Subtítulo (email + ubicación)
    const subtitle = `${data.contacto.email} • ${data.contacto.ciudad}, ${data.contacto.estado}`;
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
    this.doc.text(subtitle, avatarX + avatarSize / 2 + 8, heroY + 19);
    
    this.currentY = heroY + heroHeight + 6;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FILA DE KPIs
  // ══════════════════════════════════════════════════════════════════════════
  private drawKPIs(data: CandidateReportData): void {
    const kpiY = this.currentY;
    const kpiHeight = 20; // Reducido de 22 a 20
    const kpiWidth = (this.contentWidth - 9) / 4;
    const gap = 3;
    
    const kpis = [
      { label: 'Aplicaciones', value: data.estadisticas.aplicaciones.toString(), color: COLORS.primary },
      { label: 'Documentos', value: data.estadisticas.documentos.toString(), color: COLORS.success },
      { label: 'Evaluaciones', value: data.estadisticas.evaluaciones.toString(), color: COLORS.accent },
      { label: 'Experiencia', value: `${data.profesional.experiencia_anios} años`, color: COLORS.warning },
    ];
    
    kpis.forEach((kpi, index) => {
      const x = this.margin + (kpiWidth + gap) * index;
      
      // Fondo de la card
      this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      this.doc.roundedRect(x, kpiY, kpiWidth, kpiHeight, 2, 2, 'F');
      
      // Borde superior con color
      this.doc.setFillColor(kpi.color.r, kpi.color.g, kpi.color.b);
      this.doc.roundedRect(x, kpiY, kpiWidth, 3, 2, 2, 'F');
      this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      this.doc.rect(x, kpiY + 2, kpiWidth, 2, 'F');
      
      // Borde sutil
      this.doc.setDrawColor(229, 231, 235);
      this.doc.setLineWidth(0.3);
      this.doc.roundedRect(x, kpiY, kpiWidth, kpiHeight, 2, 2, 'S');
      
      // Valor grande
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(13); // Reducido de 14 a 13
      this.doc.setTextColor(kpi.color.r, kpi.color.g, kpi.color.b);
      this.doc.text(kpi.value, x + kpiWidth / 2, kpiY + 11, { align: 'center' }); // Ajustado de 12 a 11
      
      // Label
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7);
      this.doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
      this.doc.text(kpi.label, x + kpiWidth / 2, kpiY + 17.5, { align: 'center' }); // Ajustado de 19 a 17.5
    });
    
    this.currentY = kpiY + kpiHeight + 6;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // CARDS DE INFO EN 2 COLUMNAS
  // ══════════════════════════════════════════════════════════════════════════
  private drawInfoCards(data: CandidateReportData): void {
    const cardWidth = (this.contentWidth - 6) / 2;
    const cardHeight = 42; // Altura ajustada para 4 items
    const cardY = this.currentY;
    
    // ─────────────────────────────────────────────────────────
    // CARD 1: Información de Contacto (izquierda)
    // ─────────────────────────────────────────────────────────
    this.drawInfoCard(
      this.margin,
      cardY,
      cardWidth,
      cardHeight,
      'Información de Contacto',
      COLORS.primary,
      [
        { icon: '✉', label: 'Email', value: data.contacto.email },
        { icon: '☎', label: 'Teléfono', value: data.contacto.telefono },
        { icon: '📍', label: 'Ciudad', value: data.contacto.ciudad },
        { icon: '🏛', label: 'Estado', value: data.contacto.estado },
      ]
    );
    
    // ─────────────────────────────────────────────────────────
    // CARD 2: Información Profesional (derecha)
    // ─────────────────────────────────────────────────────────
    const professionalItems = [];
    if (data.profesional.empresa_actual) {
      professionalItems.push({ icon: '🏢', label: 'Empresa', value: data.profesional.empresa_actual });
    }
    if (data.profesional.posicion_actual) {
      professionalItems.push({ icon: '💼', label: 'Posición', value: data.profesional.posicion_actual });
    }
    professionalItems.push({ icon: '🎓', label: 'Educación', value: data.profesional.educacion });
    if (data.profesional.universidad) {
      professionalItems.push({ icon: '🏫', label: 'Universidad', value: data.profesional.universidad });
    }
    
    this.drawInfoCard(
      this.margin + cardWidth + 4,
      cardY,
      cardWidth,
      cardHeight,
      'Información Profesional',
      COLORS.accent,
      professionalItems.slice(0, 4)
    );
    
    this.currentY = cardY + cardHeight + 6;
  }

  private drawInfoCard(
    x: number,
    y: number,
    width: number,
    height: number,
    title: string,
    titleColor: { r: number; g: number; b: number },
    items: Array<{ icon: string; label: string; value: string }>
  ): void {
    // Fondo
    this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    this.doc.roundedRect(x, y, width, height, 2, 2, 'F');
    
    // Borde
    this.doc.setDrawColor(229, 231, 235);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(x, y, width, height, 2, 2, 'S');
    
    // Título
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(9);
    this.doc.setTextColor(titleColor.r, titleColor.g, titleColor.b);
    this.doc.text(title, x + 6, y + 8);
    
    // Línea separadora
    this.doc.setDrawColor(229, 231, 235);
    this.doc.line(x + 6, y + 11, x + width - 6, y + 11);
    
    // Items
    let itemY = y + 14; // Más compacto
    const itemGap = 7; // Gap reducido para que quepan 4 items
    
    items.forEach((item) => {
      // Label + Value en una sola línea
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6);
      this.doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
      this.doc.text(item.label + ':', x + 6, itemY);
      
      // Value al lado del label
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7);
      this.doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
      const maxValueWidth = width - 35;
      const truncatedValue = this.truncateText(item.value, maxValueWidth, 7);
      this.doc.text(truncatedValue, x + 28, itemY);
      
      itemY += itemGap;
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECCIÓN DE HABILIDADES (BADGES)
  // ══════════════════════════════════════════════════════════════════════════
  private drawSkills(data: CandidateReportData): void {
    const skillsY = this.currentY;
    
    // Título de sección
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
    this.doc.text('Habilidades', this.margin, skillsY);
    
    this.currentY = skillsY + 5;
    
    if (data.habilidades.length === 0) {
      // Estado vacío elegante
      this.doc.setFillColor(248, 250, 252);
      this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, 12, 2, 2, 'F');
      
      this.doc.setFont('helvetica', 'italic');
      this.doc.setFontSize(8);
      this.doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
      this.doc.text('Sin habilidades registradas', this.pageWidth / 2, this.currentY + 7, { align: 'center' });
      
      this.currentY += 16;
      return;
    }
    
    // Dibujar badges
    const badgeHeight = 6;
    const badgePadding = 4;
    const badgeGap = 3;
    let badgeX = this.margin;
    let badgeY = this.currentY;
    const maxSkills = 10;
    const displaySkills = data.habilidades.slice(0, maxSkills);
    const remaining = data.habilidades.length - maxSkills;
    
    displaySkills.forEach((skill) => {
      const textWidth = this.doc.getTextWidth(skill);
      const badgeWidth = textWidth + badgePadding * 2;
      
      // Si no cabe en la línea actual, saltar a la siguiente
      if (badgeX + badgeWidth > this.margin + this.contentWidth) {
        badgeX = this.margin;
        badgeY += badgeHeight + 3;
      }
      
      // Fondo del badge
      this.doc.setFillColor(224, 231, 255); // Azul muy claro
      this.doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 2, 2, 'F');
      
      // Texto del badge
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7);
      this.doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      this.doc.text(skill, badgeX + badgePadding, badgeY + 4.5);
      
      badgeX += badgeWidth + badgeGap;
    });
    
    // Indicador de "más"
    if (remaining > 0) {
      const moreText = `+${remaining} más`;
      const moreWidth = this.doc.getTextWidth(moreText) + badgePadding * 2;
      
      if (badgeX + moreWidth > this.margin + this.contentWidth) {
        badgeX = this.margin;
        badgeY += badgeHeight + 3;
      }
      
      this.doc.setFillColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
      this.doc.roundedRect(badgeX, badgeY, moreWidth, badgeHeight, 2, 2, 'F');
      
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7);
      this.doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
      this.doc.text(moreText, badgeX + badgePadding, badgeY + 4.5);
    }
    
    this.currentY = badgeY + badgeHeight + 8;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TABLA DE HISTORIAL DE APLICACIONES
  // ══════════════════════════════════════════════════════════════════════════
  private drawApplicationsTable(data: CandidateReportData): void {
    const tableY = this.currentY;
    
    // Título de sección
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
    this.doc.text('Historial de Aplicaciones', this.margin, tableY);
    
    this.currentY = tableY + 5;
    
    if (data.aplicaciones.length === 0) {
      // Estado vacío
      this.doc.setFillColor(248, 250, 252);
      this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, 12, 2, 2, 'F');
      
      this.doc.setFont('helvetica', 'italic');
      this.doc.setFontSize(8);
      this.doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
      this.doc.text('Sin aplicaciones registradas', this.pageWidth / 2, this.currentY + 7, { align: 'center' });
      
      this.currentY += 16;
      return;
    }
    
    // Columnas (ahora con Match%)
    const cols = [
      { header: 'Perfil/Vacante', width: 60, key: 'perfil' },
      { header: 'Cliente', width: 45, key: 'cliente' },
      { header: 'Match', width: 22, key: 'match' },
      { header: 'Estado', width: 30, key: 'estado' },
      { header: 'Fecha', width: 33, key: 'fecha' },
    ];
    
    const rowHeight = 8;
    const headerHeight = 8;
    
    // Header de la tabla
    let colX = this.margin;
    this.doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, headerHeight, 1, 1, 'F');
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(7);
    this.doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    
    cols.forEach((col) => {
      this.doc.text(col.header, colX + 3, this.currentY + 5.5);
      colX += col.width;
    });
    
    this.currentY += headerHeight;
    
    // Filas de datos (máximo 6 para que quepan en la página)
    const maxRows = 6;
    const displayApps = data.aplicaciones.slice(0, maxRows);
    
    displayApps.forEach((app, index) => {
      // Fondo alternado
      if (index % 2 === 0) {
        this.doc.setFillColor(248, 250, 252);
        this.doc.rect(this.margin, this.currentY, this.contentWidth, rowHeight, 'F');
      }
      
      // Datos
      colX = this.margin;
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7);
      this.doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
      
      // Perfil
      const truncatedPerfil = this.truncateText(app.perfil, cols[0].width - 6, 7);
      this.doc.text(truncatedPerfil, colX + 3, this.currentY + 5);
      colX += cols[0].width;
      
      // Cliente
      const truncatedCliente = this.truncateText(app.cliente, cols[1].width - 6, 7);
      this.doc.text(truncatedCliente, colX + 3, this.currentY + 5);
      colX += cols[1].width;
      
      // Match % (con barra visual)
      if (app.match_porcentaje !== undefined) {
        this.drawMatchBar(colX + 2, this.currentY + 2, cols[2].width - 4, app.match_porcentaje);
      } else {
        this.doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
        this.doc.text('-', colX + 3, this.currentY + 5);
      }
      colX += cols[2].width;
      
      // Estado (como badge)
      this.drawStatusBadge(colX + 2, this.currentY + 2, app.estado);
      colX += cols[3].width;
      
      // Fecha
      this.doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
      this.doc.text(app.fecha, colX + 2, this.currentY + 5);
      
      this.currentY += rowHeight;
    });
    
    // Indicador si hay más aplicaciones
    if (data.aplicaciones.length > maxRows) {
      this.doc.setFont('helvetica', 'italic');
      this.doc.setFontSize(7);
      this.doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
      this.doc.text(
        `Y ${data.aplicaciones.length - maxRows} aplicaciones más...`,
        this.pageWidth / 2,
        this.currentY + 4,
        { align: 'center' }
      );
      this.currentY += 8;
    }
    
    this.currentY += 4;
  }
  
  private drawMatchBar(x: number, y: number, width: number, percentage: number): void {
    const barHeight = 4;
    const barWidth = width - 12;
    
    // Fondo de la barra
    this.doc.setFillColor(229, 231, 235);
    this.doc.roundedRect(x, y, barWidth, barHeight, 1, 1, 'F');
    
    // Progreso
    const progressColor = percentage >= 70 ? COLORS.success :
                         percentage >= 50 ? COLORS.warning : COLORS.danger;
    const progressWidth = (percentage / 100) * barWidth;
    this.doc.setFillColor(progressColor.r, progressColor.g, progressColor.b);
    this.doc.roundedRect(x, y, progressWidth, barHeight, 1, 1, 'F');
    
    // Porcentaje texto
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6);
    this.doc.setTextColor(progressColor.r, progressColor.g, progressColor.b);
    this.doc.text(`${percentage}%`, x + barWidth + 1, y + 3);
  }

  private drawStatusBadge(x: number, y: number, status: string): void {
    // Colores según estado
    let bgColor = { r: 229, g: 231, b: 235 };
    let textColor = COLORS.dark;
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('contratado') || statusLower.includes('aprobado')) {
      bgColor = { r: 209, g: 250, b: 229 };
      textColor = { r: 5, g: 150, b: 105 };
    } else if (statusLower.includes('rechazado') || statusLower.includes('descartado')) {
      bgColor = { r: 254, g: 226, b: 226 };
      textColor = { r: 185, g: 28, b: 28 };
    } else if (statusLower.includes('entrevista') || statusLower.includes('proceso')) {
      bgColor = { r: 254, g: 243, b: 199 };
      textColor = { r: 161, g: 98, b: 7 };
    } else if (statusLower.includes('aplicó') || statusLower.includes('nuevo')) {
      bgColor = { r: 224, g: 231, b: 255 };
      textColor = { r: 79, g: 70, b: 229 };
    }
    
    const badgeWidth = Math.min(this.doc.getTextWidth(status) + 6, 28);
    const badgeHeight = 5;
    
    this.doc.setFillColor(bgColor.r, bgColor.g, bgColor.b);
    this.doc.roundedRect(x, y, badgeWidth, badgeHeight, 1, 1, 'F');
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6);
    this.doc.setTextColor(textColor.r, textColor.g, textColor.b);
    
    const truncatedStatus = this.truncateText(status, badgeWidth - 4, 6);
    this.doc.text(truncatedStatus, x + 3, y + 3.5);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // HEADER SECUNDARIO (PÁGINA 2)
  // ══════════════════════════════════════════════════════════════════════════
  private drawSecondaryHeader(data: CandidateReportData): void {
    const headerHeight = 18;
    
    // Fondo blanco
    this.doc.setFillColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    this.doc.rect(0, 0, this.pageWidth, headerHeight, 'F');
    
    // Línea azul inferior
    this.doc.setFillColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    this.doc.rect(0, headerHeight, this.pageWidth, 1, 'F');
    
    // Logo
    try {
      const logoHeight = 10;
      const logoWidth = logoHeight * 3.46;
      this.doc.addImage(BAUSEN_LOGO_BASE64, 'PNG', this.margin, 4, logoWidth, logoHeight);
    } catch {
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(12);
      this.doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      this.doc.text('BAUSEN', this.margin, 11);
    }
    
    // Título
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(12);
    this.doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    this.doc.text('INFORMACIÓN ADICIONAL', this.pageWidth / 2, 11, { align: 'center' });
    
    // Nombre del candidato
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(9);
    this.doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
    this.doc.text(data.nombre, this.pageWidth - this.margin, 11, { align: 'right' });
    
    this.currentY = headerHeight + 8;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECCIÓN DE EVALUACIONES
  // ══════════════════════════════════════════════════════════════════════════
  private drawEvaluationsSection(data: CandidateReportData): void {
    if (!data.evaluaciones || data.evaluaciones.length === 0) return;
    
    // Título de sección
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
    this.doc.text('Evaluaciones', this.margin, this.currentY);
    
    this.currentY += 5;
    
    // Header de la tabla
    const cols = [
      { header: 'Evaluación', width: 70 },
      { header: 'Categoría', width: 40 },
      { header: 'Estado', width: 30 },
      { header: 'Puntaje', width: 25 },
      { header: 'Resultado', width: 25 },
    ];
    
    let colX = this.margin;
    this.doc.setFillColor(COLORS.accent.r, COLORS.accent.g, COLORS.accent.b);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, 7, 1, 1, 'F');
    
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(6);
    this.doc.setTextColor(COLORS.white.r, COLORS.white.g, COLORS.white.b);
    
    cols.forEach((col) => {
      this.doc.text(col.header, colX + 2, this.currentY + 5);
      colX += col.width;
    });
    
    this.currentY += 7;
    
    // Filas
    const maxRows = 5;
    data.evaluaciones.slice(0, maxRows).forEach((evalItem, index) => {
      if (index % 2 === 0) {
        this.doc.setFillColor(248, 250, 252);
        this.doc.rect(this.margin, this.currentY, this.contentWidth, 7, 'F');
      }
      
      colX = this.margin;
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6);
      this.doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
      
      // Evaluación
      this.doc.text(this.truncateText(evalItem.template, cols[0].width - 4, 6), colX + 2, this.currentY + 5);
      colX += cols[0].width;
      
      // Categoría
      this.doc.text(this.truncateText(evalItem.categoria || '-', cols[1].width - 4, 6), colX + 2, this.currentY + 5);
      colX += cols[1].width;
      
      // Estado
      this.drawMiniStatusBadge(colX + 2, this.currentY + 1.5, evalItem.estado);
      colX += cols[2].width;
      
      // Puntaje
      const puntajeValido = evalItem.puntaje !== null && evalItem.puntaje !== undefined;
      this.doc.text(puntajeValido ? `${evalItem.puntaje}%` : '-', colX + 2, this.currentY + 5);

      // Resultado (sin ✓ ✗ porque también se rompen con fuentes estándar)
      const aprobadoValido = evalItem.aprobado !== null && evalItem.aprobado !== undefined;
      if (aprobadoValido) {
        const resultColor = evalItem.aprobado ? COLORS.success : COLORS.danger;
        this.doc.setTextColor(resultColor.r, resultColor.g, resultColor.b);
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(evalItem.aprobado ? 'Aprobado' : 'Reprobado', colX + 2, this.currentY + 5);
      } else {
        this.doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
        this.doc.setFont('helvetica', 'normal');
        this.doc.text('-', colX + 2, this.currentY + 5);
      }

      
      this.currentY += 7;
    });
    
    if (data.evaluaciones.length > maxRows) {
      this.doc.setFont('helvetica', 'italic');
      this.doc.setFontSize(6);
      this.doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
      this.doc.text(`Y ${data.evaluaciones.length - maxRows} evaluaciones más...`, this.pageWidth / 2, this.currentY + 3, { align: 'center' });
      this.currentY += 6;
    }
    
    this.currentY += 6;
  }

  private drawMiniStatusBadge(x: number, y: number, status: string): void {
    const badgeWidth = Math.min(this.doc.getTextWidth(status) + 4, 26);
    const badgeHeight = 4;
    
    this.doc.setFillColor(224, 231, 255);
    this.doc.roundedRect(x, y, badgeWidth, badgeHeight, 1, 1, 'F');
    
    this.doc.setFont('helvetica', 'normal');
    this.doc.setFontSize(5);
    this.doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
    this.doc.text(this.truncateText(status, badgeWidth - 2, 5), x + 2, y + 3);
  }

  private getDocTypePrefix(tipo: string): string {
    const t = (tipo || '').toLowerCase();
    if (t.includes('cv') || t.includes('curr')) return '[CV]';
    if (t.includes('cert')) return '[CERT]';
    if (t.includes('foto') || t.includes('imagen')) return '[IMG]';
    if (t.includes('titulo') || t.includes('diploma')) return '[DIP]';
    return '[DOC]';
  }


  // ══════════════════════════════════════════════════════════════════════════
  // SECCIÓN DE DOCUMENTOS
  // ══════════════════════════════════════════════════════════════════════════
  private drawDocumentsSection(data: CandidateReportData): void {
    if (!data.documentos || data.documentos.length === 0) return;
    
    // Título de sección
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
    this.doc.text('Documentos', this.margin, this.currentY);
    
    this.currentY += 5;
    
    // Contenedor
    const containerHeight = Math.min(data.documentos.length * 8 + 4, 50);
    this.doc.setFillColor(248, 250, 252);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, containerHeight, 2, 2, 'F');
    this.doc.setDrawColor(229, 231, 235);
    this.doc.setLineWidth(0.3);
    this.doc.roundedRect(this.margin, this.currentY, this.contentWidth, containerHeight, 2, 2, 'S');
    
    let itemY = this.currentY + 4;
    const maxDocs = 5;
    
    data.documentos.slice(0, maxDocs).forEach((doc) => {
      // Ícono según tipo
      const icon = doc.tipo.toLowerCase().includes('cv') || doc.tipo.toLowerCase().includes('currículum') ? '📄' :
                   doc.tipo.toLowerCase().includes('certificado') ? '🏆' :
                   doc.tipo.toLowerCase().includes('foto') || doc.tipo.toLowerCase().includes('imagen') ? '🖼️' :
                   doc.tipo.toLowerCase().includes('titulo') || doc.tipo.toLowerCase().includes('diploma') ? '🎓' : '📎';
      
      // Nombre del documento
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7);
      this.doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
      const prefix = this.getDocTypePrefix(doc.tipo);
      this.doc.text(`${prefix} ${this.truncateText(doc.nombre, 100, 7)}`, this.margin + 4, itemY + 3);
      
      // Tipo
      this.doc.setFontSize(6);
      this.doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
      this.doc.text(doc.tipo, this.margin + 120, itemY + 3);
      
      // Fecha (alineada a la derecha dentro del contenedor)
      this.doc.text(doc.fecha, this.margin + this.contentWidth - 4, itemY + 3, { align: 'right' });
      
      itemY += 8;
    });
    
    if (data.documentos.length > maxDocs) {
      this.doc.setFont('helvetica', 'italic');
      this.doc.setFontSize(6);
      this.doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
      this.doc.text(`Y ${data.documentos.length - maxDocs} documentos más...`, this.margin + this.contentWidth / 2, itemY + 2, { align: 'center' });
    }
    
    this.currentY += containerHeight + 6;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SECCIÓN DE NOTAS INTERNAS
  // ══════════════════════════════════════════════════════════════════════════
  private drawNotesSection(data: CandidateReportData): void {
    if (!data.notas || data.notas.length === 0) return;
    
    // Verificar espacio disponible
    if (this.currentY > this.pageHeight - 60) return;
    
    // Título de sección
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(10);
    this.doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
    this.doc.text('Notas Internas', this.margin, this.currentY);
    
    this.currentY += 5;
    
    const maxNotes = 4;
    const noteHeight = 20;
    const noteWidth = (this.contentWidth - 4) / 2;
    
    data.notas.slice(0, maxNotes).forEach((nota, index) => {
      const col = index % 2;
      const row = Math.floor(index / 2);
      const x = this.margin + (noteWidth + 4) * col;
      const y = this.currentY + row * (noteHeight + 4);
      
      // Fondo estilo post-it
      const noteColors = [
        { r: 255, g: 251, b: 235 }, // Amarillo claro
        { r: 240, g: 253, b: 244 }, // Verde claro
        { r: 239, g: 246, b: 255 }, // Azul claro
        { r: 254, g: 242, b: 242 }, // Rosa claro
      ];
      const bgColor = noteColors[index % noteColors.length];
      
      this.doc.setFillColor(bgColor.r, bgColor.g, bgColor.b);
      this.doc.roundedRect(x, y, noteWidth, noteHeight, 2, 2, 'F');
      
      // Borde sutil
      this.doc.setDrawColor(229, 231, 235);
      this.doc.setLineWidth(0.3);
      this.doc.roundedRect(x, y, noteWidth, noteHeight, 2, 2, 'S');
      
      // Tipo de nota (header)
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(6);
      this.doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
      this.doc.text(nota.tipo.toUpperCase(), x + 3, y + 4);
      
      // Contenido
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(6);
      this.doc.setTextColor(COLORS.dark.r, COLORS.dark.g, COLORS.dark.b);
      const lines = this.splitTextToLines(nota.contenido, noteWidth - 6, 6);
      lines.slice(0, 2).forEach((line, lineIndex) => {
        this.doc.text(line, x + 3, y + 9 + lineIndex * 4);
      });
      
      // Autor y fecha
      this.doc.setFont('helvetica', 'italic');
      this.doc.setFontSize(5);
      this.doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
      const metaText = nota.autor ? `${nota.autor} • ${nota.fecha}` : nota.fecha;
      this.doc.text(metaText, x + 3, y + noteHeight - 2);
    });
    
    const rows = Math.ceil(Math.min(data.notas.length, maxNotes) / 2);
    this.currentY += rows * (noteHeight + 4) + 4;
    
    if (data.notas.length > maxNotes) {
      this.doc.setFont('helvetica', 'italic');
      this.doc.setFontSize(6);
      this.doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
      this.doc.text(`Y ${data.notas.length - maxNotes} notas más...`, this.pageWidth / 2, this.currentY, { align: 'center' });
    }
  }

  private splitTextToLines(text: string, maxWidth: number, fontSize: number): string[] {
    this.doc.setFontSize(fontSize);
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    words.forEach(word => {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      if (this.doc.getTextWidth(testLine) <= maxWidth) {
        currentLine = testLine;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    if (currentLine) lines.push(currentLine);
    
    return lines;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // FOOTER
  // ══════════════════════════════════════════════════════════════════════════
  private drawFooter(): void {
    const totalPages = this.doc.getNumberOfPages();
    
    for (let i = 1; i <= totalPages; i++) {
      this.doc.setPage(i);
      const footerY = this.pageHeight - 10;
      
      // Línea superior
      this.doc.setDrawColor(229, 231, 235);
      this.doc.setLineWidth(0.3);
      this.doc.line(this.margin, footerY - 3, this.pageWidth - this.margin, footerY - 3);
      
      // Texto izquierda
      this.doc.setFont('helvetica', 'bold');
      this.doc.setFontSize(7);
      this.doc.setTextColor(COLORS.primary.r, COLORS.primary.g, COLORS.primary.b);
      this.doc.text('BAUSEN', this.margin, footerY);
      
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(COLORS.gray.r, COLORS.gray.g, COLORS.gray.b);
      this.doc.text(' | Sistema de Gestión de Talento', this.margin + 14, footerY);
      
      // Texto centro
      this.doc.setFont('helvetica', 'italic');
      this.doc.setFontSize(6);
      this.doc.text('Documento confidencial', this.pageWidth / 2, footerY, { align: 'center' });
      
      // Texto derecha - número de página
      this.doc.setFont('helvetica', 'normal');
      this.doc.setFontSize(7);
      this.doc.text(`Página ${i} de ${totalPages}`, this.pageWidth - this.margin, footerY, { align: 'right' });
    }
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
}

// ════════════════════════════════════════════════════════════════════════════
// FUNCIONES EXPORTABLES
// ════════════════════════════════════════════════════════════════════════════
export function generateCandidateReportPDF(data: CandidateReportData): jsPDF {
  const generator = new CandidateReportPDF();
  return generator.generate(data);
}

export function downloadCandidateReportPDF(data: CandidateReportData, filename?: string): void {
  const generator = new CandidateReportPDF();
  const pdf = generator.generate(data);
  const safeName = fixMojibake(data.nombre).replace(/\s+/g, '_');
  const defaultFilename = `Reporte_Candidato_${safeName}_${new Date().toISOString().split('T')[0]}.pdf`;

  pdf.save(filename || defaultFilename);
}

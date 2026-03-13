/**
 * ════════════════════════════════════════════════════════════════════════════
 * PDF UTILITIES - DISEÑO INSTITUCIONAL BAUSEN
 * ════════════════════════════════════════════════════════════════════════════
 * Utilidades profesionales para generar PDFs corporativos
 * Colores institucionales: Azul Bausen #0033A0, #003DA5, #1E3A8A
 * ════════════════════════════════════════════════════════════════════════════
 */

import jsPDF from 'jspdf';

// ═══════════════════════════════════════════════════════════════════════════
// COLORES CORPORATIVOS BAUSEN
// ═══════════════════════════════════════════════════════════════════════════
export const BAUSEN_COLORS = {
  // Azules institucionales
  primary: { r: 0, g: 51, b: 160 },        // #0033A0 - Azul principal Bausen
  primaryDark: { r: 0, g: 40, b: 130 },    // Azul oscuro
  primaryLight: { r: 30, g: 80, b: 180 },  // Azul claro
  secondary: { r: 0, g: 61, b: 165 },      // #003DA5 - Azul secundario (alias)
  
  // Colores de acento
  accent: { r: 59, g: 130, b: 246 },       // #3B82F6 - Azul acento
  
  // Grises profesionales
  dark: { r: 31, g: 41, b: 55 },           // #1F2937 - Gris muy oscuro
  darkGray: { r: 55, g: 65, b: 81 },       // #374151 - Gris oscuro (para compat)
  gray: { r: 75, g: 85, b: 99 },           // #4B5563 - Gris medio
  grayLight: { r: 156, g: 163, b: 175 },   // #9CA3AF - Gris claro
  grayLighter: { r: 229, g: 231, b: 235 }, // #E5E7EB - Gris muy claro
  light: { r: 239, g: 246, b: 255 },       // #EFF6FF - Azul muy claro (alias)
  
  // Estados
  success: { r: 16, g: 185, b: 129 },      // #10B981 - Verde
  warning: { r: 245, g: 158, b: 11 },      // #F59E0B - Amarillo
  error: { r: 239, g: 68, b: 68 },         // #EF4444 - Rojo
  
  // Neutros
  white: { r: 255, g: 255, b: 255 },
  black: { r: 0, g: 0, b: 0 },
  
  // Fondos sutiles
  bgLight: { r: 248, g: 250, b: 252 },     // #F8FAFC
  bgBlue: { r: 239, g: 246, b: 255 },      // #EFF6FF
};

// ═══════════════════════════════════════════════════════════════════════════
// LOGO BAUSEN - VERSIÓN VECTORIAL PROFESIONAL
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Dibuja el logo de Bausen directamente en el PDF usando formas vectoriales
 * Versión profesional que replica el isotipo del logo original
 */
function drawBausenLogo(pdf: jsPDF, x: number, y: number, scale: number = 1): void {
  const s = scale;
  const primaryColor = { r: 0, g: 51, b: 160 }; // Azul Bausen
  const accentColor = { r: 30, g: 70, b: 180 };  // Azul más claro
  
  // ─────────────────────────────────────────────────────────────────────────
  // ISOTIPO: Forma estilizada del "8" / infinito
  // ─────────────────────────────────────────────────────────────────────────
  
  // Parte superior del 8 (curva superior)
  pdf.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  pdf.ellipse(x + 8*s, y + 5*s, 6*s, 5*s, 'F');
  
  // Parte inferior del 8 (curva inferior más grande)
  pdf.ellipse(x + 8*s, y + 12*s, 7*s, 5.5*s, 'F');
  
  // Centro conector (parte central del 8)
  pdf.setFillColor(255, 255, 255);
  pdf.ellipse(x + 8*s, y + 5*s, 3*s, 2.5*s, 'F');
  pdf.ellipse(x + 8*s, y + 12*s, 3.5*s, 2.8*s, 'F');
  
  // Diamantes/cuadrados decorativos (esquina inferior izquierda)
  pdf.setFillColor(accentColor.r, accentColor.g, accentColor.b);
  
  // Cuadrado rotado 45° (diamante grande)
  const diamondX = x + 2*s;
  const diamondY = y + 13*s;
  const diamondSize = 3*s;
  pdf.setFillColor(primaryColor.r, primaryColor.g, primaryColor.b);
  // Dibujar diamante como polígono
  const diamond1 = [
    [diamondX, diamondY + diamondSize/2],
    [diamondX + diamondSize/2, diamondY],
    [diamondX + diamondSize, diamondY + diamondSize/2],
    [diamondX + diamondSize/2, diamondY + diamondSize]
  ];
  // Usamos un cuadrado simple como aproximación
  pdf.rect(diamondX, diamondY, diamondSize * 0.7, diamondSize * 0.7, 'F');
  
  // Cuadrado pequeño adicional
  pdf.setFillColor(accentColor.r, accentColor.g, accentColor.b);
  pdf.rect(x + 4.5*s, y + 15*s, 2*s, 2*s, 'F');
  
  // ─────────────────────────────────────────────────────────────────────────
  // LOGOTIPO: Texto "Bausen"
  // ─────────────────────────────────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16 * s);
  pdf.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
  pdf.text('Bausen', x + 17*s, y + 12*s);
}

/**
 * Dibuja el logo blanco para usar sobre fondo azul
 */
export function drawBausenLogoWhite(pdf: jsPDF, x: number, y: number, scale: number = 1): void {
  const s = scale;
  
  // ─────────────────────────────────────────────────────────────────────────
  // ISOTIPO en blanco
  // ─────────────────────────────────────────────────────────────────────────
  
  // Parte superior del 8
  pdf.setFillColor(255, 255, 255);
  pdf.ellipse(x + 8*s, y + 5*s, 6*s, 5*s, 'F');
  
  // Parte inferior del 8
  pdf.ellipse(x + 8*s, y + 12*s, 7*s, 5.5*s, 'F');
  
  // Huecos centrales (color del fondo azul)
  pdf.setFillColor(BAUSEN_COLORS.primary.r, BAUSEN_COLORS.primary.g, BAUSEN_COLORS.primary.b);
  pdf.ellipse(x + 8*s, y + 5*s, 3*s, 2.5*s, 'F');
  pdf.ellipse(x + 8*s, y + 12*s, 3.5*s, 2.8*s, 'F');
  
  // Diamantes decorativos en blanco
  pdf.setFillColor(255, 255, 255);
  pdf.rect(x + 2*s, y + 13*s, 2.1*s, 2.1*s, 'F');
  pdf.setFillColor(220, 230, 255);
  pdf.rect(x + 4.5*s, y + 15*s, 1.7*s, 1.7*s, 'F');
  
  // ─────────────────────────────────────────────────────────────────────────
  // LOGOTIPO en blanco
  // ─────────────────────────────────────────────────────────────────────────
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16 * s);
  pdf.setTextColor(255, 255, 255);
  pdf.text('Bausen', x + 17*s, y + 12*s);
}

/**
 * Dibuja marca de agua sutil del isotipo en las páginas
 * Versión simplificada y compatible sin usar GState
 */
export function drawWatermark(pdf: jsPDF): void {
  const totalPages = pdf.getNumberOfPages();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    
    // Usar un color muy claro para simular marca de agua
    // Gris muy suave que parece transparente
    pdf.setFillColor(240, 243, 248);
    
    // Dibujar isotipo grande centrado (forma del 8)
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;
    const scale = 4;
    
    // Círculos del 8 muy sutiles
    pdf.ellipse(centerX - 15*scale, centerY - 10*scale, 20*scale, 18*scale, 'F');
    pdf.ellipse(centerX - 15*scale, centerY + 15*scale, 18*scale, 16*scale, 'F');
    
    // Cuadrados decorativos
    pdf.rect(centerX - 35*scale, centerY + 15*scale, 8*scale, 8*scale, 'F');
    pdf.rect(centerX - 25*scale, centerY + 25*scale, 6*scale, 6*scale, 'F');
  }
}

/**
 * Dibuja marca de agua sutil de texto en todas las páginas
 * La marca de agua aparece ANTES del contenido para no interferir
 */
export function drawTextWatermark(pdf: jsPDF, text: string = 'BAUSEN'): void {
  const totalPages = pdf.getNumberOfPages();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    
    // Color muy suave - casi invisible pero legible
    pdf.setTextColor(245, 248, 252);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(100);
    
    // Texto diagonal centrado - muy sutil
    pdf.text(text, pageWidth / 2, pageHeight / 2 + 20, { 
      align: 'center',
      angle: 35
    });
  }
}

/**
 * Inicializa un PDF con diseño institucional Bausen
 */
export function createBausenPDF(orientation: 'portrait' | 'landscape' = 'portrait'): jsPDF {
  const pdf = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });
  
  return pdf;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HEADER PROFESIONAL BAUSEN - DISEÑO EJECUTIVO
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function drawBausenHeader(pdf: jsPDF, title: string, subtitle?: string): number {
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  // ─────────────────────────────────────────────────────────────────────────
  // FONDO DEL HEADER - Diseño elegante con gradiente simulado
  // ─────────────────────────────────────────────────────────────────────────
  
  // Capa base azul oscuro
  pdf.setFillColor(0, 40, 130);
  pdf.rect(0, 0, pageWidth, 32, 'F');
  
  // Capa superior azul principal (gradiente simulado)
  pdf.setFillColor(BAUSEN_COLORS.primary.r, BAUSEN_COLORS.primary.g, BAUSEN_COLORS.primary.b);
  pdf.rect(0, 0, pageWidth, 28, 'F');
  
  // Línea de acento dorada/amarilla elegante
  pdf.setFillColor(218, 165, 32); // Oro
  pdf.rect(0, 28, pageWidth, 1.5, 'F');
  
  // Sombra sutil bajo el header
  pdf.setFillColor(200, 200, 200);
  pdf.rect(0, 29.5, pageWidth, 0.5, 'F');
  
  // ─────────────────────────────────────────────────────────────────────────
  // LOGO BAUSEN - Lado izquierdo con fondo blanco elegante
  // ─────────────────────────────────────────────────────────────────────────
  
  // Fondo blanco redondeado para el logo
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(8, 4, 48, 20, 2, 2, 'F');
  
  // Sombra sutil del contenedor del logo
  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.1);
  pdf.roundedRect(8, 4, 48, 20, 2, 2, 'S');
  
  // Dibujar logo Bausen
  drawBausenLogo(pdf, 10, 5, 0.9);
  
  // ─────────────────────────────────────────────────────────────────────────
  // TÍTULO DEL REPORTE - Lado derecho
  // ─────────────────────────────────────────────────────────────────────────
  
  // Título principal en blanco
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text(title.toUpperCase(), pageWidth - 12, 12, { align: 'right' });
  
  // Línea decorativa bajo el título
  pdf.setDrawColor(255, 255, 255);
  pdf.setLineWidth(0.3);
  const titleWidth = pdf.getTextWidth(title.toUpperCase());
  pdf.line(pageWidth - 12 - titleWidth, 14, pageWidth - 12, 14);
  
  // Subtítulo o fecha
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(200, 215, 255);
  const displaySubtitle = subtitle || new Date().toLocaleDateString('es-MX', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  pdf.text(displaySubtitle, pageWidth - 12, 22, { align: 'right' });
  
  // ─────────────────────────────────────────────────────────────────────────
  // ELEMENTOS DECORATIVOS - Detalles profesionales
  // ─────────────────────────────────────────────────────────────────────────
  
  // Pequeño diamante decorativo (estilo del isotipo)
  pdf.setFillColor(218, 165, 32); // Oro
  pdf.rect(pageWidth - 12 - titleWidth - 8, 10.5, 3, 3, 'F');
  
  return 40; // Posición Y donde comienza el contenido
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FOOTER PROFESIONAL BAUSEN
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function drawBausenFooter(pdf: jsPDF): void {
  const totalPages = pdf.getNumberOfPages();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    
    // ─────────────────────────────────────────────────────────────────────────
    // Barra inferior
    // ─────────────────────────────────────────────────────────────────────────
    
    // Línea superior del footer
    pdf.setDrawColor(BAUSEN_COLORS.primary.r, BAUSEN_COLORS.primary.g, BAUSEN_COLORS.primary.b);
    pdf.setLineWidth(0.5);
    pdf.line(15, pageHeight - 18, pageWidth - 15, pageHeight - 18);
    
    // ─────────────────────────────────────────────────────────────────────────
    // Contenido del footer
    // ─────────────────────────────────────────────────────────────────────────
    
    pdf.setFontSize(7);
    pdf.setFont('helvetica', 'normal');
    
    // Lado izquierdo - Marca
    pdf.setTextColor(BAUSEN_COLORS.primary.r, BAUSEN_COLORS.primary.g, BAUSEN_COLORS.primary.b);
    pdf.setFont('helvetica', 'bold');
    pdf.text('BAUSEN', 15, pageHeight - 12);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(BAUSEN_COLORS.gray.r, BAUSEN_COLORS.gray.g, BAUSEN_COLORS.gray.b);
    pdf.text(' | Sistema de Gestión de Talento', 15 + pdf.getTextWidth('BAUSEN'), pageHeight - 12);
    
    // Centro - Paginación
    pdf.setTextColor(BAUSEN_COLORS.dark.r, BAUSEN_COLORS.dark.g, BAUSEN_COLORS.dark.b);
    pdf.text(`Página ${i} de ${totalPages}`, pageWidth / 2, pageHeight - 12, { align: 'center' });
    
    // Lado derecho - Fecha y confidencialidad
    pdf.setTextColor(BAUSEN_COLORS.grayLight.r, BAUSEN_COLORS.grayLight.g, BAUSEN_COLORS.grayLight.b);
    pdf.text(new Date().toLocaleDateString('es-MX'), pageWidth - 15, pageHeight - 12, { align: 'right' });
    
    // Texto de confidencialidad
    pdf.setFontSize(6);
    pdf.setTextColor(BAUSEN_COLORS.grayLight.r, BAUSEN_COLORS.grayLight.g, BAUSEN_COLORS.grayLight.b);
    pdf.text('Este documento es confidencial y de uso exclusivo de Bausen', pageWidth / 2, pageHeight - 7, { align: 'center' });
  }
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TÍTULO DE SECCIÓN - DISEÑO EJECUTIVO
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function drawSectionTitle(pdf: jsPDF, title: string, y: number): number {
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  // Fondo sutil de la sección
  pdf.setFillColor(248, 250, 252);
  pdf.roundedRect(15, y - 3, pageWidth - 30, 11, 1, 1, 'F');
  
  // Barra lateral azul con degradado simulado
  pdf.setFillColor(0, 40, 130);
  pdf.rect(15, y - 3, 2, 11, 'F');
  pdf.setFillColor(BAUSEN_COLORS.primary.r, BAUSEN_COLORS.primary.g, BAUSEN_COLORS.primary.b);
  pdf.rect(17, y - 3, 2, 11, 'F');
  
  // Texto del título
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(BAUSEN_COLORS.dark.r, BAUSEN_COLORS.dark.g, BAUSEN_COLORS.dark.b);
  pdf.text(title.toUpperCase(), 24, y + 4);
  
  // Línea horizontal sutil
  pdf.setDrawColor(BAUSEN_COLORS.grayLighter.r, BAUSEN_COLORS.grayLighter.g, BAUSEN_COLORS.grayLighter.b);
  pdf.setLineWidth(0.3);
  const titleWidth = pdf.getTextWidth(title.toUpperCase());
  pdf.line(22 + titleWidth + 5, y + 3, pageWidth - 15, y + 3);
  
  return y + 14;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TABLA PROFESIONAL
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function drawTable(
  pdf: jsPDF,
  headers: string[],
  rows: string[][],
  startY: number,
  columnWidths?: number[]
): number {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const tableWidth = pageWidth - 30;
  const numColumns = headers.length;
  const defaultColWidth = tableWidth / numColumns;
  const colWidths = columnWidths || Array(numColumns).fill(defaultColWidth);
  const rowHeight = 7;
  const headerHeight = 9;
  
  let y = startY;
  let x = 15;
  
  // ─────────────────────────────────────────────────────────────────────────
  // Header de la tabla
  // ─────────────────────────────────────────────────────────────────────────
  
  // Fondo del header
  pdf.setFillColor(BAUSEN_COLORS.primary.r, BAUSEN_COLORS.primary.g, BAUSEN_COLORS.primary.b);
  pdf.roundedRect(15, y, tableWidth, headerHeight, 1, 1, 'F');
  
  // Texto del header
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(255, 255, 255);
  
  headers.forEach((header, i) => {
    const cellX = x + 3;
    pdf.text(header.toUpperCase(), cellX, y + 6);
    x += colWidths[i];
  });
  
  y += headerHeight;
  
  // ─────────────────────────────────────────────────────────────────────────
  // Filas de datos
  // ─────────────────────────────────────────────────────────────────────────
  
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  
  rows.forEach((row, rowIndex) => {
    // Verificar salto de página
    if (y + rowHeight > pageHeight - 30) {
      pdf.addPage();
      y = 40;
      
      // Redibujar header de tabla en nueva página
      x = 15;
      pdf.setFillColor(BAUSEN_COLORS.primary.r, BAUSEN_COLORS.primary.g, BAUSEN_COLORS.primary.b);
      pdf.roundedRect(15, y, tableWidth, headerHeight, 1, 1, 'F');
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(255, 255, 255);
      headers.forEach((header, i) => {
        pdf.text(header.toUpperCase(), x + 3, y + 6);
        x += colWidths[i];
      });
      y += headerHeight;
      pdf.setFont('helvetica', 'normal');
    }
    
    // Fondo alternado
    if (rowIndex % 2 === 0) {
      pdf.setFillColor(BAUSEN_COLORS.bgLight.r, BAUSEN_COLORS.bgLight.g, BAUSEN_COLORS.bgLight.b);
    } else {
      pdf.setFillColor(255, 255, 255);
    }
    pdf.rect(15, y, tableWidth, rowHeight, 'F');
    
    // Datos de la fila
    x = 15;
    pdf.setTextColor(BAUSEN_COLORS.dark.r, BAUSEN_COLORS.dark.g, BAUSEN_COLORS.dark.b);
    row.forEach((cell, i) => {
      // Truncar texto si es muy largo
      let displayText = cell || '';
      const maxWidth = colWidths[i] - 6;
      while (pdf.getTextWidth(displayText) > maxWidth && displayText.length > 0) {
        displayText = displayText.slice(0, -1);
      }
      if (displayText !== cell && displayText.length > 0) {
        displayText = displayText.slice(0, -2) + '...';
      }
      pdf.text(displayText, x + 3, y + 5);
      x += colWidths[i];
    });
    
    // Línea separadora sutil
    pdf.setDrawColor(BAUSEN_COLORS.grayLighter.r, BAUSEN_COLORS.grayLighter.g, BAUSEN_COLORS.grayLighter.b);
    pdf.setLineWidth(0.1);
    pdf.line(15, y + rowHeight, 15 + tableWidth, y + rowHeight);
    
    y += rowHeight;
  });
  
  // Borde exterior de la tabla
  pdf.setDrawColor(BAUSEN_COLORS.primary.r, BAUSEN_COLORS.primary.g, BAUSEN_COLORS.primary.b);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(15, startY, tableWidth, y - startY, 1, 1, 'S');
  
  return y + 8;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * TARJETA KPI - DISEÑO EJECUTIVO MODERNO
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function drawKPICard(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string | number,
  color: { r: number; g: number; b: number },
  icon?: string
): void {
  const height = 24;
  
  // Sombra más pronunciada para efecto 3D
  pdf.setFillColor(220, 220, 225);
  pdf.roundedRect(x + 1, y + 1, width, height, 2, 2, 'F');
  
  // Fondo de la tarjeta (blanco)
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(x, y, width, height, 2, 2, 'F');
  
  // Barra lateral de color (estilo moderno)
  pdf.setFillColor(color.r, color.g, color.b);
  pdf.roundedRect(x, y, 4, height, 2, 0, 'F');
  pdf.rect(x + 2, y, 2, height, 'F'); // Completar esquinas
  
  // Indicador circular pequeño con el color
  pdf.setFillColor(color.r, color.g, color.b);
  pdf.circle(x + width - 8, y + 6, 3, 'F');
  
  // Valor grande (más prominente)
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(BAUSEN_COLORS.dark.r, BAUSEN_COLORS.dark.g, BAUSEN_COLORS.dark.b);
  pdf.text(String(value), x + 10, y + 14);
  
  // Label pequeño debajo del valor
  pdf.setFontSize(6.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(BAUSEN_COLORS.gray.r, BAUSEN_COLORS.gray.g, BAUSEN_COLORS.gray.b);
  pdf.text(label.toUpperCase(), x + 10, y + 20);
  
  // Borde sutil elegante
  pdf.setDrawColor(230, 230, 235);
  pdf.setLineWidth(0.3);
  pdf.roundedRect(x, y, width, height, 2, 2, 'S');
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * FILA DE KPIs
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function drawKPIRow(
  pdf: jsPDF,
  y: number,
  kpis: Array<{ label: string; value: string | number; color: { r: number; g: number; b: number } }>
): number {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 15;
  const gap = 5;
  const availableWidth = pageWidth - (margin * 2) - (gap * (kpis.length - 1));
  const cardWidth = availableWidth / kpis.length;
  
  kpis.forEach((kpi, index) => {
    const x = margin + (index * (cardWidth + gap));
    drawKPICard(pdf, x, y, cardWidth, kpi.label, kpi.value, kpi.color);
  });
  
  return y + 30;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * PAR LABEL-VALOR PROFESIONAL
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function drawLabelValue(
  pdf: jsPDF,
  x: number,
  y: number,
  label: string,
  value: string,
  labelWidth: number = 45
): number {
  // Label
  pdf.setFontSize(8);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(BAUSEN_COLORS.gray.r, BAUSEN_COLORS.gray.g, BAUSEN_COLORS.gray.b);
  pdf.text(label + ':', x, y);
  
  // Valor
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(BAUSEN_COLORS.dark.r, BAUSEN_COLORS.dark.g, BAUSEN_COLORS.dark.b);
  pdf.text(value || 'N/A', x + labelWidth, y);
  
  return y + 5;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BLOQUE DE INFORMACIÓN
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function drawInfoBlock(
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  title: string,
  items: Array<{ label: string; value: string }>
): number {
  // Fondo del bloque
  pdf.setFillColor(BAUSEN_COLORS.bgLight.r, BAUSEN_COLORS.bgLight.g, BAUSEN_COLORS.bgLight.b);
  const height = 8 + (items.length * 6);
  pdf.roundedRect(x, y, width, height, 2, 2, 'F');
  
  // Título del bloque
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(BAUSEN_COLORS.primary.r, BAUSEN_COLORS.primary.g, BAUSEN_COLORS.primary.b);
  pdf.text(title, x + 5, y + 6);
  
  // Línea bajo el título
  pdf.setDrawColor(BAUSEN_COLORS.primary.r, BAUSEN_COLORS.primary.g, BAUSEN_COLORS.primary.b);
  pdf.setLineWidth(0.3);
  pdf.line(x + 5, y + 8, x + width - 5, y + 8);
  
  // Items
  let itemY = y + 14;
  items.forEach(item => {
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(BAUSEN_COLORS.gray.r, BAUSEN_COLORS.gray.g, BAUSEN_COLORS.gray.b);
    pdf.text(item.label + ':', x + 5, itemY);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(BAUSEN_COLORS.dark.r, BAUSEN_COLORS.dark.g, BAUSEN_COLORS.dark.b);
    pdf.text(item.value || 'N/A', x + 40, itemY);
    itemY += 6;
  });
  
  return y + height + 5;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * BADGE/ETIQUETA DE ESTADO
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function drawStatusBadge(
  pdf: jsPDF,
  x: number,
  y: number,
  text: string,
  color: { r: number; g: number; b: number }
): number {
  const padding = 3;
  pdf.setFontSize(7);
  const textWidth = pdf.getTextWidth(text);
  const badgeWidth = textWidth + (padding * 2);
  
  // Fondo del badge
  pdf.setFillColor(color.r, color.g, color.b);
  pdf.roundedRect(x, y - 3, badgeWidth, 6, 1, 1, 'F');
  
  // Texto
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text(text.toUpperCase(), x + padding, y + 1);
  
  return x + badgeWidth + 3;
}

/**
 * ═══════════════════════════════════════════════════════════════════════════
 * UTILIDADES DE FORMATO
 * ═══════════════════════════════════════════════════════════════════════════
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(dateString: string): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

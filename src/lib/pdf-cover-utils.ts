import jsPDF from 'jspdf';
import { drawBausenLogoWhite } from './pdf-utils';

export interface PdfCoverMetadataItem {
  label: string;
  value?: string | number | null;
}

export interface PdfCoverOptions {
  title: string;
  subtitle?: string;
  generatedAt?: Date;
  logoBase64?: string;
  logoRatio?: number;
  useWhiteVectorLogo?: boolean;
  metadata?: PdfCoverMetadataItem[];
  footerText?: string;
  primaryColor?: { r: number; g: number; b: number };
  secondaryColor?: { r: number; g: number; b: number };
}

export function drawVerticalGradient(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  startRGB: [number, number, number],
  endRGB: [number, number, number],
  steps: number = 80
): void {
  const [sr, sg, sb] = startRGB;
  const [er, eg, eb] = endRGB;
  const stepHeight = height / steps;

  for (let i = 0; i < steps; i++) {
    const t = steps === 1 ? 0 : i / (steps - 1);
    const r = Math.round(sr + (er - sr) * t);
    const g = Math.round(sg + (eg - sg) * t);
    const b = Math.round(sb + (eb - sb) * t);

    doc.setFillColor(r, g, b);
    doc.rect(x, y + i * stepHeight, width, stepHeight + 0.2, 'F');
  }
}

export function drawReportCover(doc: jsPDF, options: PdfCoverOptions): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;
  const centerX = pageWidth / 2;

  const primary = options.primaryColor ?? { r: 0, g: 51, b: 160 };
  const secondary = options.secondaryColor ?? { r: 37, g: 99, b: 235 };

  drawVerticalGradient(
    doc,
    0,
    0,
    pageWidth,
    pageHeight,
    [primary.r, primary.g, primary.b],
    [secondary.r, secondary.g, secondary.b],
    90
  );

  const logoAreaW = 108;
  const logoAreaH = 30;
  const logoAreaX = centerX - logoAreaW / 2;
  const logoAreaY = 33;

  if (options.useWhiteVectorLogo) {
    drawBausenLogoWhite(doc, centerX - 42, logoAreaY - 2, 1.15);
  } else if (options.logoBase64) {
    try {
      const ratio = options.logoRatio && options.logoRatio > 0 ? options.logoRatio : 3.2;
      const maxW = logoAreaW;
      const maxH = logoAreaH;
      let logoW = maxW;
      let logoH = logoW / ratio;

      if (logoH > maxH) {
        logoH = maxH;
        logoW = logoH * ratio;
      }

      const logoX = logoAreaX + (logoAreaW - logoW) / 2;
      const logoY = logoAreaY + (logoAreaH - logoH) / 2;
      doc.addImage(options.logoBase64, 'PNG', logoX, logoY, logoW, logoH, 'BAUSEN_LOGO_COVER', 'FAST');
    } catch {
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('BAUSEN', centerX, logoAreaY + 18, { align: 'center' });
    }
  }

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(30);
  doc.text(options.title, centerX, pageHeight / 2 - 8, { align: 'center' });

  if (options.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.text(options.subtitle, centerX, pageHeight / 2 + 7, { align: 'center' });
  }

  const metadata = (options.metadata ?? []).filter((item) => item.value !== undefined && item.value !== null && String(item.value).trim() !== '');

  if (metadata.length > 0) {
    const cardH = Math.min(92, 16 + metadata.length * 8);
    const cardX = margin;
    const cardY = pageHeight - margin - cardH;
    const cardW = pageWidth - margin * 2;

    doc.setFillColor(255, 255, 255);
    doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.5);
    doc.roundedRect(cardX, cardY, cardW, cardH, 4, 4, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(31, 41, 55);
    doc.text('Detalles del Reporte', cardX + 8, cardY + 10);

    let y = cardY + 18;
    const split = Math.ceil(metadata.length / 2);
    const left = metadata.slice(0, split);
    const right = metadata.slice(split);

    const padX = 8;
    const gap = 8;
    const lineH = 8;
    const colW = (cardW - padX * 2 - gap) / 2;
    const leftX = cardX + padX;
    const rightX = leftX + colW + gap;

    const fitText = (text: string, maxWidth: number): string => {
      let out = text;
      while (out.length > 1 && doc.getTextWidth(out) > maxWidth) {
        out = `${out.slice(0, -2)}…`;
      }
      return out;
    };

    const drawColumn = (items: PdfCoverMetadataItem[], x: number) => {
      items.forEach((item, index) => {
        const yy = y + index * lineH;
        const label = `${item.label}:`;

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(75, 85, 99);
        const labelWidth = Math.min(doc.getTextWidth(label), colW * 0.58);
        doc.text(fitText(label, colW * 0.58), x, yy);

        const valueX = x + labelWidth + 2;
        const maxValueW = Math.max(12, colW - (valueX - x));

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(55, 65, 81);
        doc.text(fitText(String(item.value), maxValueW), valueX, yy);
      });
    };

    drawColumn(left, leftX);
    drawColumn(right, rightX);
  }

  const generatedAt = options.generatedAt ?? new Date();
  const generatedAtText = generatedAt.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(229, 231, 235);
  doc.text(options.footerText || `Bausen Reclutamiento • Generado el ${generatedAtText}`, centerX, pageHeight - 8, { align: 'center' });
}

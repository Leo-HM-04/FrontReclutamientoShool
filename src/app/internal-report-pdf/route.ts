import { NextRequest, NextResponse } from 'next/server';

import { generateInternalReportPDF, type InternalReportData } from '@/lib/pdf-internal-report';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const expectedToken = process.env.INTERNAL_REPORT_TOKEN;
    if (expectedToken) {
      const receivedToken = request.headers.get('x-internal-report-token');
      if (!receivedToken || receivedToken !== expectedToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const data = (await request.json()) as InternalReportData;
    const pdf = generateInternalReportPDF(data);
    const pdfArrayBuffer = pdf.output('arraybuffer');
    const pdfBuffer = Buffer.from(pdfArrayBuffer);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="Reporte_Interno_Bausen.pdf"',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('Error generating internal report PDF in route:', error);
    return NextResponse.json({ error: 'Error generating PDF' }, { status: 500 });
  }
}

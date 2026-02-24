import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

// ════════════════════════════════════════════════════════════════════
// HELPERS PARA FORMATEO
// ════════════════════════════════════════════════════════════════════

const formatDate = (date: Date): string => {
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(value);
};

// ════════════════════════════════════════════════════════════════════
// 1. REPORTE MENSUAL
// ════════════════════════════════════════════════════════════════════

export async function generateMonthlyReportPDF(data: any) {
  const doc = new jsPDF();
  let yPos = 20;

  // Header
  doc.setFontSize(20);
  doc.setTextColor(59, 130, 246); // Blue
  doc.text('Reporte Mensual de Reclutamiento', 20, yPos);
  
  yPos += 10;
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(`${data.period.month_name} ${data.period.year}`, 20, yPos);
  
  yPos += 15;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, yPos, 190, yPos);
  
  // Summary Section
  yPos += 15;
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('Resumen del Período', 20, yPos);
  
  yPos += 10;
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  
  const summaryData = [
    ['Perfiles Creados', data.summary.profiles_created],
    ['Perfiles Completados', data.summary.profiles_completed],
    ['Candidatos Agregados', data.summary.candidates_added],
    ['Candidatos Contratados', data.summary.candidates_hired],
    ['Evaluaciones Completadas', data.summary.evaluations_completed],
    ['CVs Analizados (IA)', data.summary.cv_analyses],
    ['Documentos Generados', data.summary.documents_generated],
    ['Nuevos Clientes', data.summary.new_clients],
  ];
  
  summaryData.forEach(([label, value]) => {
    yPos += 8;
    doc.text(`• ${label}:`, 25, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(String(value), 120, yPos);
    doc.setFont('helvetica', 'normal');
  });
  
  // Top Clients
  if (data.top_clients && data.top_clients.length > 0) {
    yPos += 15;
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Top 5 Clientes Más Activos', 20, yPos);
    
    yPos += 10;
    doc.setFontSize(11);
    
    data.top_clients.slice(0, 5).forEach((client: any, index: number) => {
      yPos += 8;
      doc.text(`${index + 1}. ${client.client__company_name}`, 25, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(`${client.count} perfil(es)`, 120, yPos);
      doc.setFont('helvetica', 'normal');
    });
  }
  
  // Top Supervisors
  if (data.top_supervisors && data.top_supervisors.length > 0) {
    yPos += 15;
    doc.setFontSize(16);
    doc.setTextColor(0, 0, 0);
    doc.text('Top 5 Supervisores', 20, yPos);
    
    yPos += 10;
    doc.setFontSize(11);
    
    data.top_supervisors.slice(0, 5).forEach((sup: any, index: number) => {
      yPos += 8;
      const name = `${sup.assigned_to__first_name} ${sup.assigned_to__last_name}`;
      doc.text(`${index + 1}. ${name}`, 25, yPos);
      doc.setFont('helvetica', 'bold');
      doc.text(`${sup.count} perfil(es)`, 120, yPos);
      doc.setFont('helvetica', 'normal');
    });
  }
  
  // Footer
  yPos = 280;
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generado el ${formatDate(new Date())}`, 20, yPos);
  doc.text('Sistema de Reclutamiento - Confidencial', 105, yPos, { align: 'center' });
  
  // Save
  doc.save(`Reporte_Mensual_${data.period.month_name}_${data.period.year}.pdf`);
}

export async function generateMonthlyReportExcel(data: any) {
  // Preparar datos para Excel
  const summaryData = [
    ['REPORTE MENSUAL DE RECLUTAMIENTO', ''],
    ['Período', `${data.period.month_name} ${data.period.year}`],
    ['Generado', formatDate(new Date())],
    ['', ''],
    ['RESUMEN DEL PERÍODO', ''],
    ['Métrica', 'Valor'],
    ['Perfiles Creados', data.summary.profiles_created],
    ['Perfiles Completados', data.summary.profiles_completed],
    ['Candidatos Agregados', data.summary.candidates_added],
    ['Candidatos Contratados', data.summary.candidates_hired],
    ['Evaluaciones Completadas', data.summary.evaluations_completed],
    ['CVs Analizados (IA)', data.summary.cv_analyses],
    ['Documentos Generados', data.summary.documents_generated],
    ['Nuevos Clientes', data.summary.new_clients],
  ];
  
  const clientsData = [
    ['', ''],
    ['TOP 5 CLIENTES MÁS ACTIVOS', ''],
    ['Cliente', 'Perfiles'],
    ...data.top_clients.slice(0, 5).map((c: any) => [
      c.client__company_name,
      c.count
    ])
  ];
  
  const supervisorsData = [
    ['', ''],
    ['TOP 5 SUPERVISORES', ''],
    ['Supervisor', 'Perfiles Gestionados'],
    ...data.top_supervisors.slice(0, 5).map((s: any) => [
      `${s.assigned_to__first_name} ${s.assigned_to__last_name}`,
      s.count
    ])
  ];
  
  // Combinar todo
  const allData = [...summaryData, ...clientsData, ...supervisorsData];
  
  // Crear workbook
  const ws = XLSX.utils.aoa_to_sheet(allData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte Mensual');
  
  // Descargar
  XLSX.writeFile(wb, `Reporte_Mensual_${data.period.month_name}_${data.period.year}.xlsx`);
}

// ════════════════════════════════════════════════════════════════════
// 2. DASHBOARD COMPLETO
// ════════════════════════════════════════════════════════════════════

export async function generateDashboardPDF(data: any) {
  const doc = new jsPDF();
  let yPos = 20;

  // Header
  doc.setFontSize(20);
  doc.setTextColor(59, 130, 246);
  doc.text('Dashboard Completo del Sistema', 20, yPos);
  
  yPos += 10;
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(formatDate(new Date()), 20, yPos);
  
  yPos += 15;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, yPos, 190, yPos);
  
  // KPIs Section
  yPos += 15;
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text('Indicadores Clave de Desempeño', 20, yPos);
  
  yPos += 10;
  doc.setFontSize(11);
  
  const kpis = [
    ['Eficiencia del Sistema', `${data.kpis.system_efficiency}%`],
    ['Conversión del Pipeline', `${data.kpis.pipeline_conversion}%`],
    ['ROI de IA', formatCurrency(data.kpis.ai_roi)],
    ['Satisfacción del Cliente', `${data.kpis.client_satisfaction}/5`],
  ];
  
  kpis.forEach(([label, value]) => {
    yPos += 8;
    doc.text(`• ${label}:`, 25, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(String(value), 120, yPos);
    doc.setFont('helvetica', 'normal');
  });
  
  // Overview
  yPos += 15;
  doc.setFontSize(16);
  doc.text('Vista General', 20, yPos);
  
  yPos += 10;
  doc.setFontSize(11);
  
  const overview = [
    ['Total de Perfiles', data.dashboard.overview.total_profiles],
    ['Perfiles Activos', data.dashboard.overview.active_profiles],
    ['Total de Candidatos', data.dashboard.overview.total_candidates],
    ['Candidatos Activos', data.dashboard.overview.active_candidates],
    ['Total de Clientes', data.dashboard.overview.total_clients],
  ];
  
  overview.forEach(([label, value]) => {
    yPos += 8;
    doc.text(`• ${label}:`, 25, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(String(value), 120, yPos);
    doc.setFont('helvetica', 'normal');
  });
  
  // Funnel
  yPos += 15;
  doc.setFontSize(16);
  doc.text('Embudo de Reclutamiento', 20, yPos);
  
  yPos += 10;
  doc.setFontSize(11);
  
  const funnel = [
    ['Perfiles Creados', data.funnel.total_profiles],
    ['Perfiles Aprobados', data.funnel.approved_profiles],
    ['Candidatos Activos', data.funnel.active_candidates],
    ['Aplicación de Pruebas', data.funnel.in_evaluation],
    ['En Entrevistas', data.funnel.in_interview],
    ['Con Oferta', data.funnel.with_offer],
    ['Contratados', data.funnel.hired],
  ];
  
  funnel.forEach(([label, value]) => {
    yPos += 8;
    doc.text(`• ${label}:`, 25, yPos);
    doc.setFont('helvetica', 'bold');
    doc.text(String(value), 120, yPos);
    doc.setFont('helvetica', 'normal');
  });
  
  // Footer
  yPos = 280;
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generado el ${formatDate(new Date())}`, 20, yPos);
  
  doc.save(`Dashboard_Completo_${new Date().toISOString().split('T')[0]}.pdf`);
}

export async function generateDashboardExcel(data: any) {
  // KPIs
  const kpisData = [
    ['DASHBOARD COMPLETO DEL SISTEMA', ''],
    ['Generado', formatDate(new Date())],
    ['', ''],
    ['INDICADORES CLAVE', ''],
    ['KPI', 'Valor'],
    ['Eficiencia del Sistema', `${data.kpis.system_efficiency}%`],
    ['Conversión del Pipeline', `${data.kpis.pipeline_conversion}%`],
    ['ROI de IA', formatCurrency(data.kpis.ai_roi)],
    ['Satisfacción del Cliente', `${data.kpis.client_satisfaction}/5`],
  ];
  
  // Overview
  const overviewData = [
    ['', ''],
    ['VISTA GENERAL', ''],
    ['Métrica', 'Valor'],
    ['Total de Perfiles', data.dashboard.overview.total_profiles],
    ['Perfiles Activos', data.dashboard.overview.active_profiles],
    ['Total de Candidatos', data.dashboard.overview.total_candidates],
    ['Candidatos Activos', data.dashboard.overview.active_candidates],
    ['Total de Clientes', data.dashboard.overview.total_clients],
  ];
  
  // Funnel
  const funnelData = [
    ['', ''],
    ['EMBUDO DE RECLUTAMIENTO', ''],
    ['Etapa', 'Cantidad'],
    ['Perfiles Creados', data.funnel.total_profiles],
    ['Perfiles Aprobados', data.funnel.approved_profiles],
    ['Candidatos Activos', data.funnel.active_candidates],
    ['Aplicación de Pruebas', data.funnel.in_evaluation],
    ['En Entrevistas', data.funnel.in_interview],
    ['Con Oferta', data.funnel.with_offer],
    ['Contratados', data.funnel.hired],
  ];
  
  const allData = [...kpisData, ...overviewData, ...funnelData];
  
  const ws = XLSX.utils.aoa_to_sheet(allData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Dashboard');
  
  XLSX.writeFile(wb, `Dashboard_Completo_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ════════════════════════════════════════════════════════════════════
// 3. RENDIMIENTO DEL EQUIPO
// ════════════════════════════════════════════════════════════════════

export async function generateTeamReportPDF(data: any) {
  const doc = new jsPDF();
  let yPos = 20;

  doc.setFontSize(20);
  doc.setTextColor(59, 130, 246);
  doc.text('Reporte de Rendimiento del Equipo', 20, yPos);
  
  yPos += 10;
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(formatDate(new Date()), 20, yPos);
  
  yPos += 15;
  doc.line(20, yPos, 190, yPos);
  
  yPos += 15;
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(`Tamaño del Equipo: ${data.team_performance.team_size} Supervisores`, 20, yPos);
  
  if (data.team_performance.performance && data.team_performance.performance.length > 0) {
    yPos += 15;
    doc.setFontSize(14);
    doc.text('Desempeño por Supervisor', 20, yPos);
    
    data.team_performance.performance.forEach((member: any) => {
      yPos += 12;
      
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(member.supervisor.name, 25, yPos);
      doc.setFont('helvetica', 'normal');
      
      yPos += 7;
      doc.setFontSize(10);
      doc.text(`Perfiles Asignados: ${member.metrics.total_profiles}`, 30, yPos);
      
      yPos += 5;
      doc.text(`Perfiles Completados: ${member.metrics.completed_profiles}`, 30, yPos);
      
      yPos += 5;
      doc.text(`Tasa de Éxito: ${member.metrics.success_rate}%`, 30, yPos);
      
      yPos += 5;
      doc.text(`Candidatos Gestionados: ${member.metrics.candidates_managed}`, 30, yPos);
      
      yPos += 5;
      doc.text(`Tiempo Promedio de Cierre: ${member.metrics.avg_closure_days} días`, 30, yPos);
    });
  } else {
    yPos += 15;
    doc.setFontSize(11);
    doc.setTextColor(100, 100, 100);
    doc.text('No hay datos de supervisores disponibles', 25, yPos);
  }
  
  yPos = 280;
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generado el ${formatDate(new Date())}`, 20, yPos);
  
  doc.save(`Rendimiento_Equipo_${new Date().toISOString().split('T')[0]}.pdf`);
}

export async function generateTeamReportExcel(data: any) {
  const headerData = [
    ['REPORTE DE RENDIMIENTO DEL EQUIPO', ''],
    ['Generado', formatDate(new Date())],
    ['Tamaño del Equipo', data.team_performance.team_size],
    ['', ''],
    ['DESEMPEÑO POR SUPERVISOR', ''],
    ['Supervisor', 'Perfiles Asignados', 'Completados', 'Tasa Éxito %', 'Candidatos', 'Días Promedio'],
  ];
  
  const performanceData = data.team_performance.performance.map((member: any) => [
    member.supervisor.name,
    member.metrics.total_profiles,
    member.metrics.completed_profiles,
    member.metrics.success_rate,
    member.metrics.candidates_managed,
    member.metrics.avg_closure_days,
  ]);
  
  const allData = [...headerData, ...performanceData];
  
  const ws = XLSX.utils.aoa_to_sheet(allData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rendimiento Equipo');
  
  XLSX.writeFile(wb, `Rendimiento_Equipo_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// ════════════════════════════════════════════════════════════════════
// 4. ANALYTICS DE CLIENTES
// ════════════════════════════════════════════════════════════════════

export async function generateClientsReportPDF(data: any) {
  const doc = new jsPDF();
  let yPos = 20;

  doc.setFontSize(20);
  doc.setTextColor(59, 130, 246);
  doc.text('Reporte de Analytics de Clientes', 20, yPos);
  
  yPos += 10;
  doc.setFontSize(12);
  doc.setTextColor(100, 100, 100);
  doc.text(formatDate(new Date()), 20, yPos);
  
  yPos += 15;
  doc.line(20, yPos, 190, yPos);
  
  yPos += 15;
  doc.setFontSize(16);
  doc.setTextColor(0, 0, 0);
  doc.text(`Total de Clientes: ${data.dashboard.overview.total_clients}`, 20, yPos);
  
  yPos += 15;
  doc.setFontSize(11);
  doc.setTextColor(60, 60, 60);
  doc.text('Este reporte muestra un resumen de todos los clientes activos', 20, yPos);
  doc.text('y su actividad en el sistema de reclutamiento.', 20, yPos + 5);
  
  yPos += 20;
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Métricas Generales', 20, yPos);
  
  yPos += 10;
  doc.setFontSize(11);
  doc.text(`• Total de Perfiles Gestionados: ${data.dashboard.overview.total_profiles}`, 25, yPos);
  yPos += 7;
  doc.text(`• Perfiles Activos: ${data.dashboard.overview.active_profiles}`, 25, yPos);
  yPos += 7;
  doc.text(`• Candidatos Gestionados: ${data.dashboard.overview.total_candidates}`, 25, yPos);
  
  yPos = 280;
  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text(`Generado el ${formatDate(new Date())}`, 20, yPos);
  doc.text('Para reportes detallados por cliente, use la función de reporte individual', 105, yPos, { align: 'center' });
  
  doc.save(`Analytics_Clientes_${new Date().toISOString().split('T')[0]}.pdf`);
}

export async function generateClientsReportExcel(data: any) {
  const allData = [
    ['REPORTE DE ANALYTICS DE CLIENTES', ''],
    ['Generado', formatDate(new Date())],
    ['', ''],
    ['MÉTRICAS GENERALES', ''],
    ['Total de Clientes', data.dashboard.overview.total_clients],
    ['Total de Perfiles', data.dashboard.overview.total_profiles],
    ['Perfiles Activos', data.dashboard.overview.active_profiles],
    ['Total de Candidatos', data.dashboard.overview.total_candidates],
    ['Candidatos Activos', data.dashboard.overview.active_candidates],
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(allData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Analytics Clientes');
  
  XLSX.writeFile(wb, `Analytics_Clientes_${new Date().toISOString().split('T')[0]}.xlsx`);
}

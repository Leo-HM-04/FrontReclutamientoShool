'use client';

import React, { useState, useEffect } from 'react';
import { useModal } from '@/context/ModalContext';
import { getCombinedMetrics, calculateTrend, formatPercentage } from '@/lib/api-reports';
import KPICard from './KPICard';
import FunnelChart from './FunnelChart';
import AlertsPanel from './AlertsPanel';
import ReportGenerator from './ReportGenerator';

export default function DirectorReportsHub() {
  const { showAlert } = useModal();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper local para formatear moneda en USD
  const formatCurrencyUSD = (value: number): string => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getCombinedMetrics();
      setData(response);
      console.log('✅ Datos combinados cargados:', response);
    } catch (err: any) {
      console.error('❌ Error cargando datos:', err);
      setError(err.message || 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateReport = async (type: string, format: string) => {
    console.log(`Generando reporte: ${type} en formato ${format}`);
    // TODO: Implementar generación de reportes
    await showAlert(`Generando reporte ${type} en ${format}...`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4" />
          <p className="text-gray-600">Cargando Centro de Inteligencia...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <i className="fas fa-exclamation-triangle text-4xl text-red-600 mb-4" />
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  // Preparar datos para KPIs
  const kpis = data?.kpis || {};

  // Preparar datos para Funnel
  const funnelData = data?.funnel || {};
  const funnelStages = [
    { label: 'Perfiles Creados', value: funnelData.total_profiles || 0, percentage: 100, color: '#3B82F6' },
    { label: 'Perfiles Aprobados', value: funnelData.approved_profiles || 0, percentage: 0, color: '#8B5CF6' },
    { label: 'Candidatos Activos', value: funnelData.active_candidates || 0, percentage: 0, color: '#06B6D4' },
    { label: 'Aplicación de Pruebas', value: funnelData.in_evaluation || 0, percentage: 0, color: '#F59E0B' },
    { label: 'En Entrevistas', value: funnelData.in_interview || 0, percentage: 0, color: '#EC4899' },
    { label: 'Con Oferta', value: funnelData.with_offer || 0, percentage: 0, color: '#6366F1' },
    { label: 'Contratados', value: funnelData.hired || 0, percentage: 0, color: '#10B981' },
  ];

  // Calcular porcentajes
  const totalProfiles = funnelStages[0].value || 1;
  funnelStages.forEach((stage, index) => {
    if (index > 0) {
      stage.percentage = (stage.value / totalProfiles) * 100;
    }
  });

  // Preparar alertas
  const pendingData = data?.pending_actions || {};
  const alerts = [
    {
      id: 1,
      type: 'urgent' as const,
      title: 'Perfiles Próximos a Vencer',
      description: 'Perfiles que vencen en menos de 7 días',
      count: pendingData.near_deadline?.count || 0,
    },
    {
      id: 2,
      type: 'important' as const,
      title: 'Perfiles Pendientes de Aprobación',
      description: 'Esperando revisión del director',
      count: pendingData.pending_approval?.count || 0,
    },
    {
      id: 3,
      type: 'important' as const,
      title: 'Evaluaciones Pendientes',
      description: 'Evaluaciones completadas sin revisar',
      count: pendingData.pending_review?.count || 0,
    },
    {
      id: 4,
      type: 'info' as const,
      title: 'Perfiles Sin Supervisor',
      description: 'Requieren asignación de responsable',
      count: pendingData.unassigned_profiles?.count || 0,
    },
  ].filter(alert => alert.count > 0);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            <i className="fas fa-chart-bar text-blue-600 mr-3" />
            Centro de Inteligencia de Reclutamiento
          </h1>
          <p className="text-gray-600 mt-1">
            Análisis completo del sistema y métricas de desempeño
          </p>
        </div>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <i className="fas fa-sync mr-2" />
          Actualizar
        </button>
      </div>

      {/* SECCIÓN 1: KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Eficiencia del Sistema"
          value={formatPercentage(kpis.system_efficiency || 0)}
          subtitle="Rendimiento global del sistema"
          icon="fas fa-tachometer-alt"
          iconBgColor="bg-blue-100"
          iconColor="text-blue-600"
          tooltip="Calcula la eficiencia basada en tasa de finalización y tiempo promedio"
        />
        
        <KPICard
          title="Conversión del Pipeline"
          value={formatPercentage(kpis.pipeline_conversion || 0)}
          subtitle="Candidatos contratados vs iniciales"
          icon="fas fa-filter"
          iconBgColor="bg-purple-100"
          iconColor="text-purple-600"
          tooltip="Porcentaje de candidatos que llegan hasta la contratación"
        />
        
        <KPICard
          title="ROI de IA"
          value={formatCurrencyUSD(kpis.ai_roi || 0)}
          subtitle="Ahorro por automatización"
          icon="fas fa-robot"
          iconBgColor="bg-green-100"
          iconColor="text-green-600"
          tooltip="Valor en USD del tiempo ahorrado con análisis automático de CVs"
        />
        
        <KPICard
          title="Satisfacción del Cliente"
          value={`${kpis.client_satisfaction || 0}/5`}
          subtitle="Score promedio de satisfacción"
          icon="fas fa-star"
          iconBgColor="bg-yellow-100"
          iconColor="text-yellow-600"
          tooltip="Basado en feedback y tiempo de respuesta"
        />
      </div>

      {/* SECCIÓN 2 y 3: Funnel + Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Embudo de Conversión */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">
              <i className="fas fa-funnel-dollar text-blue-600 mr-2" />
              Embudo de Conversión
            </h2>
            <div className="text-sm text-gray-600">
              Tasa global: {formatPercentage((funnelData.hired || 0) / (funnelData.total_profiles || 1) * 100)}
            </div>
          </div>
          <FunnelChart stages={funnelStages} />
        </div>

        {/* Panel de Alertas */}
        <div>
          <AlertsPanel alerts={alerts} />
        </div>
      </div>

      {/* SECCIÓN 8: Generador de Reportes */}
      <div className="max-w-md">
        <ReportGenerator onGenerate={handleGenerateReport} />
      </div>
    </div>
  );
}

'use client';

import React, { useState } from 'react';
import { useModal } from '@/context/ModalContext';
import { getCombinedMetrics } from '@/lib/api-reports';
import { 
  generateMonthlyReportPDF, 
  generateMonthlyReportExcel,
  generateDashboardPDF,
  generateDashboardExcel,
  generateTeamReportPDF,
  generateTeamReportExcel,
  generateClientsReportPDF,
  generateClientsReportExcel
} from '@/lib/report-generators';

interface ReportGeneratorProps {
  onGenerate?: (type: string, format: string) => void;
}

export default function ReportGenerator({ onGenerate }: ReportGeneratorProps) {
  const { showAlert } = useModal();
  const [selectedType, setSelectedType] = useState('monthly');
  const [selectedFormat, setSelectedFormat] = useState('pdf');
  const [loading, setLoading] = useState(false);

  const reportTypes = [
    { value: 'monthly', label: 'Reporte Mensual', icon: 'fa-calendar' },
    { value: 'dashboard', label: 'Dashboard Completo', icon: 'fa-chart-line' },
    { value: 'team', label: 'Rendimiento del Equipo', icon: 'fa-users' },
    { value: 'clients', label: 'Analytics de Clientes', icon: 'fa-building' },
  ];

  const formats = [
    { value: 'pdf', label: 'PDF', icon: 'fa-file-pdf', color: 'text-red-600' },
    { value: 'excel', label: 'Excel', icon: 'fa-file-excel', color: 'text-green-600' },
  ];

  const handleGenerate = async () => {
    setLoading(true);
    try {
      console.log(`🔵 Generando reporte: ${selectedType} en formato ${selectedFormat}`);
      
      // Obtener datos del sistema
      const data = await getCombinedMetrics();
      
      // Obtener reporte mensual si es necesario
      let monthlyData = null;
      if (selectedType === 'monthly') {
        const now = new Date();
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/director/reports/monthly/?month=${now.getMonth() + 1}&year=${now.getFullYear()}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            }
          }
        );
        monthlyData = await response.json();
      }
      
      // Generar reporte según tipo y formato
      if (selectedFormat === 'pdf') {
        switch (selectedType) {
          case 'monthly':
            await generateMonthlyReportPDF(monthlyData);
            break;
          case 'dashboard':
            await generateDashboardPDF(data);
            break;
          case 'team':
            await generateTeamReportPDF(data);
            break;
          case 'clients':
            await generateClientsReportPDF(data);
            break;
        }
      } else {
        // Excel
        switch (selectedType) {
          case 'monthly':
            await generateMonthlyReportExcel(monthlyData);
            break;
          case 'dashboard':
            await generateDashboardExcel(data);
            break;
          case 'team':
            await generateTeamReportExcel(data);
            break;
          case 'clients':
            await generateClientsReportExcel(data);
            break;
        }
      }
      
      console.log('✅ Reporte generado exitosamente');
      
      // Callback opcional
      if (onGenerate) {
        onGenerate(selectedType, selectedFormat);
      }
      
    } catch (error) {
      console.error('❌ Error generando reporte:', error);
      await showAlert('Error al generar el reporte. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-2 mb-6">
        <i className="fas fa-file-download text-blue-600 text-xl" />
        <h3 className="text-lg font-semibold text-gray-900">
          Generar Reporte
        </h3>
      </div>

      {/* Tipo de reporte */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tipo de Reporte
        </label>
        <div className="grid grid-cols-2 gap-2">
          {reportTypes.map((type) => (
            <button
              key={type.value}
              onClick={() => setSelectedType(type.value)}
              disabled={loading}
              className={`p-3 rounded-lg border-2 transition-all text-left ${
                selectedType === type.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <i className={`fas ${type.icon} mr-2 text-gray-600`} />
              <span className="text-sm font-medium">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Formato */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Formato
        </label>
        <div className="flex gap-2">
          {formats.map((format) => (
            <button
              key={format.value}
              onClick={() => setSelectedFormat(format.value)}
              disabled={loading}
              className={`flex-1 p-3 rounded-lg border-2 transition-all ${
                selectedFormat === format.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              } ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <i className={`fas ${format.icon} mr-2 ${format.color}`} />
              <span className="text-sm font-medium">{format.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Botón generar */}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className={`w-full py-3 rounded-lg font-semibold transition-all ${
          loading
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        {loading ? (
          <>
            <i className="fas fa-spinner fa-spin mr-2" />
            Generando...
          </>
        ) : (
          <>
            <i className="fas fa-download mr-2" />
            Generar Reporte
          </>
        )}
      </button>

      {/* Información */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600">
          <i className="fas fa-info-circle mr-1" />
          El reporte se descargará automáticamente al completar la generación
        </p>
      </div>
    </div>
  );
}

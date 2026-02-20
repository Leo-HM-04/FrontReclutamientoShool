/**
 * ════════════════════════════════════════════════════════════════════════════
 * DEMO: Profile Report PDF Generator
 * ════════════════════════════════════════════════════════════════════════════
 * Componente para demostrar y probar el generador de PDFs de reportes de perfil
 * ════════════════════════════════════════════════════════════════════════════
 */

'use client';

import React, { useState } from 'react';
import { 
  ProfileReportPDF, 
  ProfileReportData, 
  EXAMPLE_PROFILE_DATA,
  generateProfileReport 
} from '@/lib/pdf-profile-report';

export default function ProfileReportDemo() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Estado editable para los datos
  const [formData, setFormData] = useState<ProfileReportData>(EXAMPLE_PROFILE_DATA);
  
  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    try {
      const report = new ProfileReportPDF();
      const pdf = report.generate(formData);
      
      // Crear URL para preview
      const blob = pdf.output('blob');
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar el PDF');
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleDownloadPDF = () => {
    generateProfileReport(formData, `reporte-${formData.puesto.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  };
  
  const updateFormData = (field: keyof ProfileReportData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const updateKPI = (field: keyof ProfileReportData['kpis'], value: number) => {
    setFormData(prev => ({
      ...prev,
      kpis: { ...prev.kpis, [field]: value }
    }));
  };
  
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            📄 Generador de Reportes de Perfil
          </h1>
          <p className="text-gray-600 mt-2">
            Diseño tipo dashboard moderno para reportes de reclutamiento
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel de Configuración */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 border-b pb-3">
              Configuración del Reporte
            </h2>
            
            {/* Información Básica */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700">📋 Información Básica</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Puesto
                </label>
                <input
                  type="text"
                  value={formData.puesto}
                  onChange={(e) => updateFormData('puesto', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  Fecha
                </label>
                <input
                  type="text"
                  value={formData.fecha}
                  onChange={(e) => updateFormData('fecha', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Estatus
                  </label>
                  <select
                    value={formData.estado}
                    onChange={(e) => updateFormData('estado', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Aprobado">Aprobado</option>
                    <option value="Pendiente">Pendiente</option>
                    <option value="En Revisión">En Revisión</option>
                    <option value="Rechazado">Rechazado</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Prioridad
                  </label>
                  <select
                    value={formData.prioridad}
                    onChange={(e) => updateFormData('prioridad', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="high">Alta</option>
                    <option value="medium">Media</option>
                    <option value="low">Baja</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Servicio
                  </label>
                  <select
                    value={formData.servicio}
                    onChange={(e) => updateFormData('servicio', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="urgente">Urgente</option>
                    <option value="express">Express</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* KPIs */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700">📊 KPIs</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Días Abierto
                  </label>
                  <input
                    type="number"
                    value={formData.kpis.dias_abierto}
                    onChange={(e) => updateKPI('dias_abierto', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Candidatos
                  </label>
                  <input
                    type="number"
                    value={formData.kpis.candidatos}
                    onChange={(e) => updateKPI('candidatos', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Preseleccionados
                  </label>
                  <input
                    type="number"
                    value={formData.kpis.preseleccionados}
                    onChange={(e) => updateKPI('preseleccionados', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Entrevistas
                  </label>
                  <input
                    type="number"
                    value={formData.kpis.entrevistas}
                    onChange={(e) => updateKPI('entrevistas', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Empresa */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700">🏢 Información de Empresa</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Empresa
                  </label>
                  <input
                    type="text"
                    value={formData.empresa}
                    onChange={(e) => updateFormData('empresa', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Industria
                  </label>
                  <input
                    type="text"
                    value={formData.industria}
                    onChange={(e) => updateFormData('industria', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Contacto
                  </label>
                  <input
                    type="text"
                    value={formData.contacto}
                    onChange={(e) => updateFormData('contacto', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateFormData('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Detalles del Puesto */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700">💼 Detalles del Puesto</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Ciudad
                  </label>
                  <input
                    type="text"
                    value={formData.ciudad}
                    onChange={(e) => updateFormData('ciudad', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Modalidad
                  </label>
                  <select
                    value={formData.modalidad}
                    onChange={(e) => updateFormData('modalidad', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="presencial">Presencial</option>
                    <option value="remoto">Remoto</option>
                    <option value="híbrido">Híbrido</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Salario
                  </label>
                  <input
                    type="text"
                    value={formData.salario}
                    onChange={(e) => updateFormData('salario', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    Supervisor
                  </label>
                  <input
                    type="text"
                    value={formData.supervisor}
                    onChange={(e) => updateFormData('supervisor', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            
            {/* Resumen */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700">📝 Resumen del Rol</h3>
              
              <textarea
                value={formData.resumen_rol}
                onChange={(e) => updateFormData('resumen_rol', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            {/* Botones */}
            <div className="flex gap-3 pt-4 border-t">
              <button
                onClick={handleGeneratePDF}
                disabled={isGenerating}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Generando...
                  </>
                ) : (
                  <>
                    👁️ Vista Previa
                  </>
                )}
              </button>
              
              <button
                onClick={handleDownloadPDF}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
              >
                ⬇️ Descargar PDF
              </button>
            </div>
          </div>
          
          {/* Panel de Vista Previa */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 border-b pb-3 mb-4">
              Vista Previa
            </h2>
            
            {previewUrl ? (
              <div className="h-[700px] border border-gray-200 rounded-lg overflow-hidden">
                <iframe
                  src={previewUrl}
                  className="w-full h-full"
                  title="Vista previa del PDF"
                />
              </div>
            ) : (
              <div className="h-[700px] border border-gray-200 rounded-lg flex items-center justify-center bg-gray-50">
                <div className="text-center text-gray-500">
                  <div className="text-6xl mb-4">📄</div>
                  <p className="text-lg font-medium">Sin vista previa</p>
                  <p className="text-sm mt-1">
                    Haz clic en "Vista Previa" para generar el PDF
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Especificaciones del Diseño */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 border-b pb-3 mb-4">
            📐 Especificaciones del Layout
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Tamaño y Márgenes</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Tamaño: Carta (215.9mm × 279.4mm)</li>
                <li>• Márgenes: 12mm (todos los lados)</li>
                <li>• Área de contenido: 191.9mm × 255.4mm</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Header</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Altura: 32mm</li>
                <li>• Fondo: Gradiente azul corporativo</li>
                <li>• Logo: 35mm × 14mm (placeholder)</li>
                <li>• Badges: Alineados a la derecha</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">KPI Cards</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• 4 tarjetas equidistantes</li>
                <li>• Altura: 28mm</li>
                <li>• Gap: 4mm</li>
                <li>• Borde de color según tipo</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Pipeline</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Altura: 20mm</li>
                <li>• 3 etapas con círculos</li>
                <li>• Líneas conectoras</li>
                <li>• Flechas direccionales</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Info Cards</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• 2 columnas</li>
                <li>• Altura: 52mm</li>
                <li>• 4 items por card</li>
                <li>• Iconos placeholder</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Resumen + Footer</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• Resumen: ~60mm (flexible)</li>
                <li>• Barra azul lateral</li>
                <li>• Footer: 10mm desde borde</li>
                <li>• "Documento confidencial"</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

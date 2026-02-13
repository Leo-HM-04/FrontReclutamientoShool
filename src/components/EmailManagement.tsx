'use client';

/**
 * ============================================================
 * EMAIL MANAGEMENT COMPONENT
 * ============================================================
 * Panel de gestión de plantillas de correo electrónico
 * - Visualización de todas las plantillas del sistema
 * - Información de cuándo y cómo se envían
 * - Previsualización HTML de las plantillas
 * - Sistema de pestañas para navegación
 */

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

// ============================================================
// INTERFACES
// ============================================================

interface TriggerInfo {
  when: string;
  frequency: string;
  trigger_events: string[];
  automatic: boolean;
  scheduled?: boolean;
}

interface RecipientsInfo {
  primary: string;
  cc: string[];
  description: string;
}

interface VariableInfo {
  name: string;
  description: string;
}

interface EmailTemplate {
  id: number;
  name: string;
  title: string;
  description: string;
  category: string;
  notification_type: string;
  email_subject: string;
  email_body_html: string;
  is_active: boolean;
  priority: string;
  trigger_info: TriggerInfo;
  recipients_info: RecipientsInfo;
  variables_info: VariableInfo[];
  preview_html: string;
  created_at: string;
  updated_at: string;
}

interface TemplatePreview {
  template_id: number;
  template_name: string;
  subject: string;
  rendered_html: string;
  context_used: any;
}

interface Statistics {
  total_templates: number;
  active_templates: number;
  inactive_templates: number;
  by_category: { [key: string]: number };
  last_updated: string | null;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function EmailManagement() {
  // Estado
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [preview, setPreview] = useState<TemplatePreview | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'variables' | 'preview'>('info');

  // ============================================================
  // EFECTOS
  // ============================================================

  useEffect(() => {
    loadTemplates();
    loadStatistics();
  }, []);

  useEffect(() => {
    if (selectedTemplate) {
      loadPreview(selectedTemplate.id);
    }
  }, [selectedTemplate]);

  // ============================================================
  // FUNCIONES DE CARGA
  // ============================================================

  const loadTemplates = async () => {
    try {
      const data: any = await apiClient['makeRequest'](
        '/notifications/email-templates/',
        { method: 'GET' }
      );
      
      setTemplates(data.templates || []);
      if (data.templates && data.templates.length > 0) {
        setSelectedTemplate(data.templates[0]);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadPreview = async (templateId: number) => {
    setPreviewLoading(true);
    try {
      const data: any = await apiClient['makeRequest'](
        `/notifications/email-templates/${templateId}/preview/`,
        { method: 'POST' }
      );
      
      setPreview(data);
    } catch (error) {
      console.error('Error loading preview:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const data: any = await apiClient['makeRequest'](
        '/notifications/email-templates/statistics/',
        { method: 'GET' }
      );
      
      setStatistics(data);
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  // ============================================================
  // FUNCIONES AUXILIARES
  // ============================================================

  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      'evaluation': 'fa-clipboard-check',
      'candidate': 'fa-user',
      'profile': 'fa-briefcase',
      'system': 'fa-cog',
      'reminder': 'fa-bell',
      'alert': 'fa-exclamation-triangle'
    };
    return icons[category] || 'fa-envelope';
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      'evaluation': 'bg-blue-100 text-blue-800',
      'candidate': 'bg-green-100 text-green-800',
      'profile': 'bg-purple-100 text-purple-800',
      'system': 'bg-gray-100 text-gray-800',
      'reminder': 'bg-yellow-100 text-yellow-800',
      'alert': 'bg-red-100 text-red-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityBadge = (priority: string) => {
    const badges: { [key: string]: { color: string; text: string } } = {
      'high': { color: 'bg-red-100 text-red-800', text: 'Alta' },
      'normal': { color: 'bg-blue-100 text-blue-800', text: 'Normal' },
      'low': { color: 'bg-gray-100 text-gray-800', text: 'Baja' }
    };
    return badges[priority] || badges['normal'];
  };

  // ============================================================
  // RENDERIZADO DE LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
          <p className="text-gray-600">Cargando plantillas...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDERIZADO PRINCIPAL
  // ============================================================

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <i className="fas fa-envelope mr-3 text-blue-600"></i>
              Gestión de Correos
            </h1>
            <p className="text-gray-600 mt-1">
              Visualiza y gestiona las plantillas de correo electrónico del sistema
            </p>
          </div>
        </div>
          
        {/* Stats Cards */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="text-blue-600 text-sm font-medium">Total Plantillas</div>
              <div className="text-xl font-bold text-gray-900">{statistics.total_templates}</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-green-600 text-sm font-medium">Activas</div>
              <div className="text-xl font-bold text-gray-900">{statistics.active_templates}</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <div className="text-yellow-600 text-sm font-medium">Inactivas</div>
              <div className="text-xl font-bold text-gray-900">{statistics.total_templates - statistics.active_templates}</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <div className="text-purple-600 text-sm font-medium">Categorías</div>
              <div className="text-xl font-bold text-gray-900">{Object.keys(statistics.by_category || {}).length}</div>
            </div>
          </div>
        )}
      </div>

      {/* Layout de dos columnas */}
      <div className="grid grid-cols-12 gap-6">
        {/* Lista de Plantillas (Izquierda) */}
        <div className="col-span-4">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Plantillas de Correo
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                {templates.length} plantillas disponibles
              </p>
            </div>
            
            <div className="divide-y divide-gray-200 max-h-[calc(100vh-300px)] overflow-y-auto">
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                    selectedTemplate?.id === template.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <i className={`fas ${getCategoryIcon(template.category)} text-gray-400`}></i>
                        <span className="font-medium text-gray-900 truncate">
                          {template.title}
                        </span>
                      </div>
                      
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(template.category)}`}>
                          {template.category}
                        </span>
                        {template.is_active ? (
                          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800">
                            Activa
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                            Inactiva
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Detalles de Plantilla (Derecha) */}
        <div className="col-span-8">
          {selectedTemplate ? (
            <div className="bg-white rounded-lg shadow">
              {/* Header de la plantilla */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedTemplate.title}
                    </h2>
                    <p className="text-gray-600 mb-4">
                      {selectedTemplate.description}
                    </p>
                    <div className="flex items-center space-x-3">
                      <span className={`px-3 py-1 rounded-full text-sm ${getCategoryColor(selectedTemplate.category)}`}>
                        <i className={`fas ${getCategoryIcon(selectedTemplate.category)} mr-2`}></i>
                        {selectedTemplate.category}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm ${getPriorityBadge(selectedTemplate.priority).color}`}>
                        {getPriorityBadge(selectedTemplate.priority).text}
                      </span>
                      {selectedTemplate.is_active ? (
                        <span className="px-3 py-1 rounded-full text-sm bg-green-100 text-green-800">
                          <i className="fas fa-check-circle mr-2"></i>
                          Activa
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                          <i className="fas fa-times-circle mr-2"></i>
                          Inactiva
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex space-x-1 border-b border-gray-200">
                  <button
                    onClick={() => setActiveTab('info')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === 'info'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <i className="fas fa-info-circle mr-2"></i>
                    Información
                  </button>
                  <button
                    onClick={() => setActiveTab('variables')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === 'variables'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <i className="fas fa-code mr-2"></i>
                    Variables
                  </button>
                  <button
                    onClick={() => setActiveTab('preview')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      activeTab === 'preview'
                        ? 'text-blue-600 border-b-2 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    <i className="fas fa-eye mr-2"></i>
                    Previsualización
                  </button>
                </div>
              </div>

              {/* Contenido de los tabs */}
              <div className="p-6 max-h-[calc(100vh-400px)] overflow-y-auto">
                {/* Tab: Información */}
                {activeTab === 'info' && (
                  <div className="space-y-6">
                    {/* Cuándo se envía */}
                    <div className="bg-blue-50 border-l-4 border-blue-600 p-4 rounded">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <i className="fas fa-clock mr-2 text-blue-600"></i>
                        ¿Cuándo se envía?
                      </h3>
                      <p className="text-gray-700 mb-3">
                        <strong>Momento:</strong> {selectedTemplate.trigger_info.when}
                      </p>
                      <p className="text-gray-700 mb-3">
                        <strong>Frecuencia:</strong> {selectedTemplate.trigger_info.frequency}
                      </p>
                      <p className="text-gray-700 mb-2">
                        <strong>Eventos que lo activan:</strong>
                      </p>
                      <ul className="list-disc list-inside space-y-1 ml-4">
                        {selectedTemplate.trigger_info.trigger_events.map((event, idx) => (
                          <li key={idx} className="text-gray-700">{event}</li>
                        ))}
                      </ul>
                      <div className="mt-3 flex items-center space-x-4">
                        {selectedTemplate.trigger_info.automatic && (
                          <span className="text-sm px-3 py-1 bg-green-100 text-green-800 rounded-full">
                            <i className="fas fa-check-circle mr-1"></i>
                            Envío Automático
                          </span>
                        )}
                        {selectedTemplate.trigger_info.scheduled && (
                          <span className="text-sm px-3 py-1 bg-purple-100 text-purple-800 rounded-full">
                            <i className="fas fa-calendar-alt mr-1"></i>
                            Programado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* A quién se envía */}
                    <div className="bg-green-50 border-l-4 border-green-600 p-4 rounded">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <i className="fas fa-users mr-2 text-green-600"></i>
                        ¿A quién se envía?
                      </h3>
                      <p className="text-gray-700 mb-2">
                        <strong>Destinatario principal:</strong> {selectedTemplate.recipients_info.primary}
                      </p>
                      {selectedTemplate.recipients_info.cc.length > 0 && (
                        <p className="text-gray-700 mb-2">
                          <strong>Con copia (CC):</strong> {selectedTemplate.recipients_info.cc.join(', ')}
                        </p>
                      )}
                      <p className="text-gray-700 mt-3">
                        {selectedTemplate.recipients_info.description}
                      </p>
                    </div>

                    {/* Asunto del correo */}
                    <div className="bg-purple-50 border-l-4 border-purple-600 p-4 rounded">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                        <i className="fas fa-envelope mr-2 text-purple-600"></i>
                        Asunto del Correo
                      </h3>
                      <p className="text-gray-700 font-mono text-sm bg-white p-3 rounded border border-gray-200">
                        {selectedTemplate.email_subject}
                      </p>
                    </div>
                  </div>
                )}

                {/* Tab: Variables */}
                {activeTab === 'variables' && (
                  <div>
                    <div className="mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">
                        Variables Disponibles
                      </h3>
                      <p className="text-gray-600">
                        Estas variables se pueden usar en la plantilla y serán reemplazadas con datos reales al enviar el correo.
                      </p>
                    </div>

                    {selectedTemplate.variables_info.length > 0 ? (
                      <div className="space-y-3">
                        {selectedTemplate.variables_info.map((variable, idx) => (
                          <div key={idx} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                            <div className="flex items-start">
                              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                <i className="fas fa-code text-blue-600 text-sm"></i>
                              </div>
                              <div className="flex-1 min-w-0">
                                <code className="text-sm font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                                  {'{{ ' + variable.name + ' }}'}
                                </code>
                                <p className="text-sm text-gray-700 mt-2">
                                  {variable.description}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <i className="fas fa-info-circle text-gray-400 text-4xl mb-4"></i>
                        <p className="text-gray-600">No hay variables definidas para esta plantilla</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tab: Previsualización */}
                {activeTab === 'preview' && (
                  <div>
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          Previsualización del Correo
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          Vista previa con datos de ejemplo
                        </p>
                      </div>
                      {preview && (
                        <div className="text-sm text-gray-600">
                          <i className="fas fa-envelope mr-2"></i>
                          Asunto: <span className="font-medium">{preview.subject}</span>
                        </div>
                      )}
                    </div>

                    {previewLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <i className="fas fa-spinner fa-spin text-3xl text-blue-600"></i>
                      </div>
                    ) : preview ? (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <iframe
                          srcDoc={preview.rendered_html}
                          className="w-full h-[600px] bg-white"
                          title="Email Preview"
                          sandbox="allow-same-origin"
                        />
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <i className="fas fa-exclamation-circle text-gray-400 text-4xl mb-4"></i>
                        <p className="text-gray-600">No se pudo cargar la previsualización</p>
                      </div>
                    )}

                    {preview && preview.context_used && (
                      <div className="mt-4">
                        <details className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                          <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                            <i className="fas fa-code mr-2"></i>
                            Ver contexto de datos de ejemplo
                          </summary>
                          <pre className="mt-3 text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                            {JSON.stringify(preview.context_used, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <i className="fas fa-envelope-open-text text-6xl text-gray-300 mb-4"></i>
              <p className="text-gray-600">Selecciona una plantilla para ver sus detalles</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

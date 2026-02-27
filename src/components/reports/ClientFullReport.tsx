'use client';

/**
 * ════════════════════════════════════════════════════════════════════
 * CLIENT FULL REPORT
 * ════════════════════════════════════════════════════════════════════
 * Reporte completo de un cliente con todos sus perfiles
 * ════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { useModal } from '@/context/ModalContext';
import { getClientFullReport, sendClientReportEmail, formatDate, getStatusColor, type ClientFullReportData } from '@/lib/api-reports';
import * as XLSX from 'xlsx';
import { downloadClientReportPDF } from '@/lib/pdf-client-report';

interface Props {
  clientId: number;
  onBack?: () => void;
  onViewProfile?: (profileId: number) => void;
}

export default function ClientFullReport({ clientId, onBack, onViewProfile }: Props) {
  const { showAlert, showConfirm } = useModal();
  const [data, setData] = useState<ClientFullReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [exporting, setExporting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    loadData();
  }, [clientId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getClientFullReport(clientId);
      setData(result);
    } catch (err) {
      setError('Error al cargar el reporte');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filtrar perfiles por estado
  const filteredProfiles = statusFilter
    ? data?.profiles.filter(profile => profile.status === statusFilter) || []
    : data?.profiles || [];

  // ═══════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-red-600 mb-4"></i>
          <p className="text-gray-600">Cargando reporte...</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // ERROR STATE
  // ═══════════════════════════════════════════════
  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <i className="fas fa-exclamation-triangle text-red-600 text-2xl mb-2"></i>
        <p className="text-red-800 font-semibold">{error || 'No se pudo cargar el reporte'}</p>
        <button onClick={loadData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
          Reintentar
        </button>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // EXPORTAR A PDF
  // ═══════════════════════════════════════════════
  const handleExportPDF = async () => {
    if (!data) return;
    
    setExporting(true);
    try {
      // Preparar datos para el generador
      const reportData = {
        client: {
          company_name: data.client.company_name,
          industry: data.client.industry,
          website: data.client.website,
          contact_name: data.client.contact_name,
          contact_email: data.client.contact_email,
          contact_phone: data.client.contact_phone,
          address: data.client.address,
          city: data.client.city,
          state: data.client.state,
          notes: data.client.notes || '',
        },
        statistics: {
          total_profiles: data.statistics.total_profiles,
          completed_profiles: data.statistics.completed_profiles,
          active_profiles: data.statistics.active_profiles,
          success_rate: data.statistics.success_rate,
          avg_days_to_complete: data.statistics.avg_days_to_complete,
          total_candidates_managed: data.statistics.total_candidates_managed,
        },
        profiles: data.profiles.map(profile => ({
          title: profile.title || 'Sin título',
          status_display: profile.status_display || 'N/A',
          priority: profile.priority || 'N/A',
          candidates_count: profile.candidates_count || 0,
          created_at: profile.created_at,
          end_date: profile.completed_at || undefined,
        })),
        profiles_by_status: data.profiles_by_status,
      };

      // Generar nombre de archivo
      const filename = `Cliente_${data.client.company_name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Generar PDF
      downloadClientReportPDF(reportData, filename);

      await showAlert('✅ PDF generado exitosamente');
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      await showAlert('❌ Error al generar el PDF');
    } finally {
      setExporting(false);
    }
  };


  // ═══════════════════════════════════════════════
  // EXPORTAR A EXCEL
  // ═══════════════════════════════════════════════
  const handleExportExcel = async () => {
    if (!data) return;
    
    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      // ============================================
      // HOJA 1: INFORMACIÓN DEL CLIENTE
      // ============================================
      const clientData = [
        ['INFORMACIÓN DEL CLIENTE'],
        [''],
        ['Empresa', data.client.company_name],
        ['Industria', data.client.industry],
        ['Sitio Web', data.client.website || 'N/A'],
        [''],
        ['CONTACTO PRINCIPAL'],
        ['Nombre', data.client.contact_name],
        ['Email', data.client.contact_email],
        ['Teléfono', data.client.contact_phone],
        [''],
        ['DIRECCIÓN'],
        ['Dirección', data.client.address],
        ['Ciudad', data.client.city],
        ['Estado', data.client.state],
        ['CP', data.client.postal_code],
      ];

      const ws1 = XLSX.utils.aoa_to_sheet(clientData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Cliente');

      // ============================================
      // HOJA 2: ESTADÍSTICAS
      // ============================================
      const statsData = [
        ['ESTADÍSTICAS'],
        [''],
        ['Métrica', 'Valor'],
        ['Perfiles Totales', data.statistics.total_profiles],
        ['Perfiles Activos', data.statistics.active_profiles],
        ['Perfiles Completados', data.statistics.completed_profiles],
        ['Total de Candidatos', data.statistics.total_candidates_managed],
        ['Tasa de Éxito (%)', data.statistics.success_rate],
        ['Tiempo Promedio (días)', data.statistics.avg_days_to_complete || 0],
      ];

      const ws2 = XLSX.utils.aoa_to_sheet(statsData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Estadísticas');

      // ============================================
      // HOJA 3: PERFILES/VACANTES
      // ============================================
      const profilesData = [
        ['PERFILES / VACANTES'],
        [''],
        ['Posición', 'Estado', 'Prioridad', 'Candidatos', 'Fecha Creación'],
        ...data.profiles.map((profile: any) => [
          profile.position_title,
          profile.status_display,
          profile.priority_display,
          profile.candidates_count,
          new Date(profile.created_at).toLocaleDateString('es-MX'),
        ])
      ];

      const ws3 = XLSX.utils.aoa_to_sheet(profilesData);
      XLSX.utils.book_append_sheet(wb, ws3, 'Perfiles');

      // ============================================
      // HOJA 4: CONTACTOS ADICIONALES
      // ============================================
      

      XLSX.writeFile(wb, `Reporte_Cliente_${data.client.company_name}_${new Date().toISOString().split('T')[0]}.xlsx`);
      await showAlert('✅ Excel generado exitosamente');
    } catch (error) {
      console.error('Error al exportar Excel:', error);
      await showAlert('❌ Error al generar Excel');
    } finally {
      setExporting(false);
    }
  };

  // ═══════════════════════════════════════════════
  // ENVIAR POR CORREO
  // ═══════════════════════════════════════════════
  const handleSendEmail = async () => {
    if (!data) return;

    const confirmed = await showConfirm(
      `¿Enviar el reporte de "${data.client.company_name}" por correo al cliente?\n\nSe enviará al contacto principal y contactos adicionales.`
    );
    if (!confirmed) return;

    setSendingEmail(true);
    try {
      const result = await sendClientReportEmail(clientId);
      const sentList = result.sent_to?.join(', ') || 'destinatarios';
      await showAlert(`✅ Reporte enviado exitosamente a: ${sentList}`);
    } catch (error: unknown) {
      console.error('Error al enviar reporte por correo:', error);
      const message = error instanceof Error ? error.message : 'Error desconocido';
      await showAlert(`❌ Error al enviar el reporte: ${message}`);
    } finally {
      setSendingEmail(false);
    }
  };

  const { client, profiles, statistics, profiles_by_status } = data;

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-4 mb-3">
              <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
                <i className="fas fa-building text-4xl"></i>
              </div>
              <div>
                <h1 className="text-3xl font-bold">{client.company_name}</h1>
                <p className="text-red-100 text-lg">{client.industry}</p>
                {client.website && (
                  <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-red-200 text-sm hover:underline">
                    <i className="fas fa-globe mr-1"></i>{client.website}
                  </a>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {onBack && (
              <button onClick={onBack} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
                <i className="fas fa-arrow-left mr-2"></i>
                Volver
              </button>
            )}
            <button 
              onClick={handleExportPDF}
              disabled={exporting}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
            >
              <i className="fas fa-file-pdf mr-2"></i>
              {exporting ? 'Generando...' : 'PDF'}
            </button>
            <button 
              onClick={handleExportExcel}
              disabled={exporting}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
            >
              <i className="fas fa-file-excel mr-2"></i>
              {exporting ? 'Generando...' : 'Excel'}
            </button>
            <button
              onClick={handleSendEmail}
              disabled={sendingEmail}
              className="px-4 py-2 bg-emerald-500/80 hover:bg-emerald-500 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Enviar reporte por correo al cliente"
            >
              <i className={`fas ${sendingEmail ? 'fa-spinner fa-spin' : 'fa-envelope'} mr-2`}></i>
              {sendingEmail ? 'Enviando...' : 'Enviar'}
            </button>
            <button onClick={() => window.print()} className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors">
              <i className="fas fa-print"></i>
            </button>
          </div>
        </div>

        {/* Contact Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-red-200 text-xs mb-1">Contacto Principal</p>
            <p className="font-semibold">{client.contact_name}</p>
          </div>
          <div>
            <p className="text-red-200 text-xs mb-1">Email</p>
            <p>{client.contact_email}</p>
          </div>
          <div>
            <p className="text-red-200 text-xs mb-1">Teléfono</p>
            <p>{client.contact_phone}</p>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* STATS CARDS */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{statistics.total_profiles}</div>
          <div className="text-sm text-gray-600">Total Perfiles</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-green-600">{statistics.completed_profiles}</div>
          <div className="text-sm text-gray-600">Completados</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{statistics.active_profiles}</div>
          <div className="text-sm text-gray-600">Activos</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">{statistics.success_rate}%</div>
          <div className="text-sm text-gray-600">Tasa Éxito</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{statistics.avg_days_to_complete || 'N/A'}</div>
          <div className="text-sm text-gray-600">Días Prom.</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-center">
          <div className="text-2xl font-bold text-cyan-600">{statistics.total_candidates_managed}</div>
          <div className="text-sm text-gray-600">Candidatos</div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* PERFILES POR ESTADO - CHART */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <i className="fas fa-chart-pie text-red-600 mr-2"></i>
          Distribución de Perfiles por Estado
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(profiles_by_status).map(([status, count]) => (
            <div key={status} className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{count}</div>
              <div className="text-xs text-gray-600 mt-1">{status}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* INFORMACIÓN DEL CLIENTE */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <i className="fas fa-info-circle text-red-600 mr-2"></i>
          Información del Cliente
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-gray-500">Dirección</label>
              <p className="text-gray-900">{client.address}</p>
              <p className="text-sm text-gray-600">{client.city}, {client.state} {client.postal_code}</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-500">Cliente desde</label>
              <p className="text-gray-900">{formatDate(client.created_at)}</p>
            </div>
          </div>

          {client.notes && (
            <div>
              <label className="text-sm font-medium text-gray-500">Notas</label>
              <p className="text-gray-700 whitespace-pre-line">{client.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* FILTROS */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <i className="fas fa-filter mr-2"></i>
          Filtrar Perfiles por Estado
        </label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
        >
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobado</option>
          <option value="in_progress">En Proceso</option>
          <option value="candidates_found">Candidatos Encontrados</option>
          <option value="in_evaluation">Aplicación de Pruebas</option>
          <option value="in_interview">En Entrevistas</option>
          <option value="finalists">Finalistas</option>
          <option value="completed">Completado</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* LISTA DE PERFILES */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <i className="fas fa-briefcase text-red-600 mr-2"></i>
          Perfiles ({filteredProfiles.length})
        </h2>

        {filteredProfiles.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <i className="fas fa-inbox text-4xl mb-4"></i>
            <p>No hay perfiles para mostrar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Posición
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prioridad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidatos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Creado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProfiles.map((profile) => (
                  <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{profile.title}</div>
                      {profile.completed_at && (
                        <div className="text-xs text-green-600">
                          <i className="fas fa-check-circle mr-1"></i>
                          Completado: {formatDate(profile.completed_at)}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-${getStatusColor(profile.status)}-100 text-${getStatusColor(profile.status)}-800`}>
                        {profile.status_display}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {profile.priority === 'urgent' ? (
                        <span className="text-red-600 font-semibold">🔥 Urgente</span>
                      ) : profile.priority === 'high' ? (
                        <span className="text-orange-600 font-semibold">⚡ Alta</span>
                      ) : (
                        <span className="text-gray-600">Normal</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <i className="fas fa-users text-gray-400 mr-2"></i>
                        <span className="text-sm text-gray-900">{profile.candidates_count}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(profile.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {onViewProfile && (
                        <button
                          onClick={() => onViewProfile(profile.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <i className="fas fa-eye mr-1"></i>
                          Ver Detalle
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* MÉTRICAS DE RENDIMIENTO */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 border border-green-200">
          <div className="flex items-center justify-between mb-2">
            <i className="fas fa-check-double text-3xl text-green-600"></i>
            <div className="text-right">
              <div className="text-3xl font-bold text-green-700">{statistics.success_rate}%</div>
              <div className="text-sm text-green-600">Tasa de Éxito</div>
            </div>
          </div>
          <p className="text-xs text-green-700 mt-2">
            {statistics.completed_profiles} de {statistics.total_profiles} perfiles completados
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <i className="fas fa-clock text-3xl text-blue-600"></i>
            <div className="text-right">
              <div className="text-3xl font-bold text-blue-700">{statistics.avg_days_to_complete || 'N/A'}</div>
              <div className="text-sm text-blue-600">Días Promedio</div>
            </div>
          </div>
          <p className="text-xs text-blue-700 mt-2">
            Tiempo promedio de cierre de perfiles
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between mb-2">
            <i className="fas fa-users text-3xl text-purple-600"></i>
            <div className="text-right">
              <div className="text-3xl font-bold text-purple-700">{statistics.total_candidates_managed}</div>
              <div className="text-sm text-purple-600">Candidatos Totales</div>
            </div>
          </div>
          <p className="text-xs text-purple-700 mt-2">
            Candidatos gestionados en todos los perfiles
          </p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* FOOTER */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600 text-center">
        <p>Reporte generado el {formatDate(data.generated_at)}</p>
      </div>
    </div>
  );
}

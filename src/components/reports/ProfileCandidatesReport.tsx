'use client';

/**
 * ════════════════════════════════════════════════════════════════════
 * PROFILE CANDIDATES REPORT
 * ════════════════════════════════════════════════════════════════════
 * Lista de todos los candidatos que aplicaron a un perfil
 * ════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import { useModal } from '@/context/ModalContext';
import { getProfileCandidates, sendProfileReportEmail, formatDate, getStatusColor, getStatusLabel, type ProfileCandidatesData } from '@/lib/api-reports';
import { downloadCandidatesReportPDF, type CandidatesReportData, type CandidateData } from '@/lib/pdf-candidates-report';
import * as XLSX from 'xlsx';

interface Props {
  profileId: number;
  onBack?: () => void;
  onViewCandidate?: (candidateId: number) => void;
}

export default function ProfileCandidatesReport({ profileId, onBack, onViewCandidate }: Props) {
  const [data, setData] = useState<ProfileCandidatesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [exporting, setExporting] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const { showAlert, showConfirm } = useModal();



  useEffect(() => {
    loadData();
  }, [profileId, statusFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getProfileCandidates(profileId, statusFilter || undefined);
      setData(result);
    } catch (err) {
      setError('Error al cargar candidatos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════
  // EXPORTAR A PDF (USANDO GENERADOR MODERNO)
  // ═══════════════════════════════════════════════
  const handleExportPDF = async () => {

    if (!data) return;
    
    setExporting(true);
    try {
      // Mapear datos al formato esperado por el generador de PDF moderno
      const candidatosData: CandidateData[] = data.candidates.map(candidate => ({
        nombre: candidate.full_name,
        email: candidate.email,
        estado: candidate.status_display,
        match_porcentaje: candidate.match_percentage || 0,
        applied_at: candidate.applied_at,
        interview_date: candidate.interview_date || undefined,
        offer_date: candidate.offer_date || undefined,
        status_history: [] // El historial se puede agregar si está disponible
      }));

      const reportData: CandidatesReportData = {
        puesto: data.profile.title,
        cliente: data.profile.client,
        fecha: new Date().toLocaleDateString('es-MX', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        candidatos: candidatosData,
        incluirMarcaAgua: true
      };

      // Generar y descargar el PDF con el diseño moderno tipo dashboard
      const filename = `Candidatos_${data.profile.title.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      downloadCandidatesReportPDF(reportData, filename);

      await showAlert('✅ PDF generado exitosamente');
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      await showAlert('❌ Error al generar PDF');
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

      // HOJA 1: Lista de Candidatos
      const candidatesData = [
        ['CANDIDATOS DEL PERFIL'],
        ['Perfil:', data.profile.title],
        ['Cliente:', data.profile.client],
        [''],
        ['#', 'Nombre', 'Email', 'Teléfono', 'Estatus', 'Match %', 'Rating', 'Posición Actual', 'Empresa Actual', 'Experiencia (años)'],
        ...data.candidates.map((c, i) => [
          i + 1,
          c.full_name,
          c.email,
          c.phone || '',
          c.status_display,
          c.match_percentage || '',
          c.overall_rating || '',
          c.current_position || '',
          c.current_company || '',
          c.years_of_experience
        ])
      ];

      const ws1 = XLSX.utils.aoa_to_sheet(candidatesData);
      XLSX.utils.book_append_sheet(wb, ws1, 'Candidatos');

      // HOJA 2: Resumen
      const summaryData = [
        ['RESUMEN'],
        [''],
        ['Métrica', 'Valor'],
        ['Total de Candidatos', data.summary.total_candidates],
        ['Match Promedio', `${data.summary.avg_match_percentage}%`],
        [''],
        ['Por Estado'],
        ...Object.entries(data.summary.by_status).map(([status, count]) => [status, count])
      ];

      const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Resumen');

      XLSX.writeFile(wb, `Candidatos_${data.profile.title}_${new Date().toISOString().split('T')[0]}.xlsx`);
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
      `¿Enviar el reporte del perfil "${data.profile.title}" por correo al cliente?\n\nSe enviará al contacto principal y contactos adicionales con el PDF adjunto.`
    );
    if (!confirmed) return;

    setSendingEmail(true);
    try {
      const result = await sendProfileReportEmail(profileId);
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

  // Filtrar por búsqueda
  const filteredCandidates = data?.candidates.filter(candidate =>
    candidate.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    candidate.current_company?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // ═══════════════════════════════════════════════
  // LOADING STATE
  // ═══════════════════════════════════════════════
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-purple-600 mb-4"></i>
          <p className="text-gray-600">Cargando candidatos...</p>
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
        <p className="text-red-800 font-semibold">{error || 'No se pudieron cargar los candidatos'}</p>
        <button onClick={loadData} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
          Reintentar
        </button>
      </div>
    );
  }

  const { profile, summary, candidates } = data;

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════ */}
      {/* HEADER */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl shadow-lg p-6 text-white">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <i className="fas fa-users text-3xl"></i>
              <div>
                <h1 className="text-3xl font-bold">Candidatos</h1>
                <p className="text-purple-100 text-lg">{profile.title}</p>
                <p className="text-purple-200 text-sm">{profile.client}</p>
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
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <i className="fas fa-file-pdf mr-2"></i>
              {exporting ? 'Generando...' : 'PDF'}
            </button>
            <button 
              onClick={handleExportExcel}
              disabled={exporting}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* RESUMEN */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <i className="fas fa-users text-2xl text-purple-600"></i>
            <span className="text-3xl font-bold text-gray-900">{summary.total_candidates}</span>
          </div>
          <p className="text-gray-600 text-sm">Total Candidatos</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <i className="fas fa-chart-line text-2xl text-green-600"></i>
            <span className="text-3xl font-bold text-gray-900">{summary.avg_match_percentage.toFixed(0)}%</span>
          </div>
          <p className="text-gray-600 text-sm">Match Promedio</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <i className="fas fa-filter text-2xl text-blue-600"></i>
            <span className="text-3xl font-bold text-gray-900">{filteredCandidates.length}</span>
          </div>
          <p className="text-gray-600 text-sm">Mostrando</p>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* FILTROS */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Búsqueda */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <i className="fas fa-search mr-2"></i>
              Buscar
            </label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nombre, email o empresa..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Filtro por estatus */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <i className="fas fa-filter mr-2"></i>
              Filtrar por Estatus
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">Todos los estatus</option>
              <option value="applied">Aplicados</option>
              <option value="screening">En Revisión</option>
              <option value="shortlisted">Preseleccionados</option>
              <option value="interviewed">Entrevistados</option>
              <option value="offered">Con Oferta</option>
              <option value="accepted">Aceptados</option>
              <option value="rejected">Rechazados</option>
            </select>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════ */}
      {/* TABLA DE CANDIDATOS */}
      {/* ═══════════════════════════════════════════════ */}
      {filteredCandidates.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <i className="fas fa-inbox text-4xl text-gray-400 mb-4"></i>
          <p className="text-gray-600">No se encontraron candidatos</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Candidato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estatus
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Match
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Experiencia
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aplicó
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCandidates.map((candidate) => (
                  <tr key={candidate.application_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-semibold mr-3">
                          {candidate.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-gray-900">{candidate.full_name}</div>
                          <div className="text-sm text-gray-500">{candidate.email}</div>
                          {candidate.current_company && (
                            <div className="text-xs text-gray-400">{candidate.current_position} en {candidate.current_company}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-${getStatusColor(candidate.status)}-100 text-${getStatusColor(candidate.status)}-800`}>
                        {getStatusLabel(candidate.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className={`h-2 rounded-full ${candidate.match_percentage >= 80 ? 'bg-green-500' : candidate.match_percentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${candidate.match_percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-900">{candidate.match_percentage}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {candidate.years_of_experience} años
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(candidate.applied_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {onViewCandidate && (
                        <button
                          onClick={() => onViewCandidate(candidate.candidate_id)}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          <i className="fas fa-eye mr-1"></i>
                          Ver
                        </button>
                      )}
                      <button className="text-blue-600 hover:text-blue-900">
                        <i className="fas fa-file-alt mr-1"></i>
                        Docs ({candidate.documents_count})
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* LEYENDA DE ESTADOS */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Leyenda de Estados:</p>
        <div className="flex flex-wrap gap-3">
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Aplicó</span>
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">En Revisión</span>
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Preseleccionado</span>
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-cyan-100 text-cyan-800">Entrevistado</span>
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">Con Oferta</span>
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Aceptado</span>
          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Rechazado</span>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useModal } from '@/context/ModalContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CandidateEvaluation {
  id: number;
  candidate: number;
  candidate_name?: string;
  template: number;
  template_name?: string;
  status: string;
  started_at?: string;
  completed_at?: string;
  expires_at?: string;
  final_score?: number;
  passed?: boolean;
  assigned_by_name?: string;
}

interface Template {
  id: number;
  title: string;
  description: string;
  category: string;
  duration_minutes: number;
  passing_score: number;
}

interface Candidate {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export default function CandidateEvaluations() {
  const { showConfirm, showAlert } = useModal();
  const [evaluations, setEvaluations] = useState<CandidateEvaluation[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedEvaluation, setSelectedEvaluation] = useState<CandidateEvaluation | null>(null);

  const statusOptions = [
    { value: "pending", label: "Pendiente", color: "yellow" },
    { value: "in_progress", label: "En Progreso", color: "blue" },
    { value: "completed", label: "Completada", color: "green" },
    { value: "reviewed", label: "Revisada", color: "purple" },
    { value: "expired", label: "Expirada", color: "red" }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");

      // Fetch evaluations
      const evalRes = await fetch(
        `${API_URL}/evaluations/candidate-evaluations/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (evalRes.ok) {
        const evalData = await evalRes.json();
        setEvaluations(Array.isArray(evalData) ? evalData : evalData.results || []);
      }

      // Fetch templates
      const templatesRes = await fetch(
        `${API_URL}/evaluations/templates/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(Array.isArray(templatesData) ? templatesData : templatesData.results || []);
      }

      // Fetch candidates
      const candidatesRes = await fetch(
        `${API_URL}/candidates/candidates/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (candidatesRes.ok) {
        const candidatesData = await candidatesRes.json();
        setCandidates(Array.isArray(candidatesData) ? candidatesData : candidatesData.results || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showConfirm("¿Estás seguro de eliminar esta evaluación?");
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${API_URL}/evaluations/candidate-evaluations/${id}/`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        setEvaluations(evaluations.filter((e) => e.id !== id));
      }
    } catch (error) {
      console.error("Error deleting evaluation:", error);
    }
  };

  const handleView = (evaluation: CandidateEvaluation) => {
    setSelectedEvaluation(evaluation);
    setShowDetailModal(true);
  };

  const filteredEvaluations = evaluations.filter((evaluation) => {
    const matchesSearch =
      evaluation.candidate_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evaluation.template_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || evaluation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusInfo = statusOptions.find((s) => s.value === status);
    const colors = {
      yellow: "bg-yellow-100 text-yellow-700",
      blue: "bg-blue-100 text-blue-700",
      green: "bg-green-100 text-green-700",
      purple: "bg-purple-100 text-purple-700",
      red: "bg-red-100 text-red-700"
    };
    const colorClass = colors[statusInfo?.color as keyof typeof colors] || colors.yellow;
    
    return (
      <span className={`px-2 py-1 text-xs rounded ${colorClass}`}>
        {statusInfo?.label || status}
      </span>
    );
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
          <p className="text-gray-600">Cargando evaluaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Evaluaciones de Candidatos</h3>
            <p className="text-sm text-gray-600 mt-1">
              {evaluations.length} evaluaciones asignadas
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 sm:mt-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <i className="fas fa-plus mr-2"></i>
            Asignar Evaluación
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar por candidato o plantilla..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los estados</option>
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Evaluations Table */}
      {filteredEvaluations.length === 0 ? (
        <div className="text-center py-12">
          <i className="fas fa-clipboard-list text-6xl text-gray-300 mb-4"></i>
          <p className="text-gray-500 text-lg">No se encontraron evaluaciones</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Candidato
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Plantilla
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Calificación
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha Límite
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEvaluations.map((evaluation) => (
                <tr key={evaluation.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{evaluation.candidate_name}</p>
                    {evaluation.assigned_by_name && (
                      <p className="text-xs text-gray-500">
                        Asignado por: {evaluation.assigned_by_name}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-900">{evaluation.template_name}</p>
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(evaluation.status)}</td>
                  <td className="px-4 py-3">
                    {evaluation.final_score !== undefined && evaluation.final_score !== null ? (
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-gray-900">
                          {Number(evaluation.final_score).toFixed(1)}%
                        </span>
                        {evaluation.passed !== undefined && (
                          <span>
                            {evaluation.passed ? (
                              <i className="fas fa-check-circle text-green-600"></i>
                            ) : (
                              <i className="fas fa-times-circle text-red-600"></i>
                            )}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Pendiente</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600">{formatDate(evaluation.expires_at)}</p>
                    {evaluation.completed_at && (
                      <p className="text-xs text-gray-500">
                        Completada: {formatDate(evaluation.completed_at)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleView(evaluation)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Ver detalles"
                      >
                        <i className="fas fa-eye"></i>
                      </button>
                      <button
                        onClick={() => handleDelete(evaluation.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Eliminar"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para Asignar Evaluación */}
      {showModal && (
        <div className="fixed top-16 left-0 right-0 bottom-0  flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Asignar Evaluación a Candidato</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);

                  // Calcular fecha de expiración (7 días desde ahora)
                  const expiresAt = new Date();
                  const daysToExpire = parseInt(formData.get("days_to_expire") as string) || 7;
                  expiresAt.setDate(expiresAt.getDate() + daysToExpire);

                  const data = {
                    template: parseInt(formData.get("template") as string),
                    candidate: parseInt(formData.get("candidate") as string),
                    expires_at: expiresAt.toISOString(),
                  };

                  try {
                    const token = localStorage.getItem("authToken");
                    const response = await fetch(
                      `${API_URL}/evaluations/candidate-evaluations/`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify(data),
                      }
                    );

                    if (response.ok) {
                      await fetchData();
                      setShowModal(false);
                      await showAlert("Evaluación asignada exitosamente");
                    } else {
                      const error = await response.json();
                      await showAlert("Error: " + JSON.stringify(error));
                    }
                  } catch (error) {
                    console.error("Error:", error);
                    await showAlert("Error al asignar evaluación");
                  }
                }}
              >
                <div className="space-y-4">
                  {/* Seleccionar Plantilla */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Plantilla de Evaluación *
                    </label>
                    <select
                      name="template"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar plantilla...</option>
                      {templates.map((template) => (
                        <option key={template.id} value={template.id}>
                          {template.title} ({template.duration_minutes} min - {template.category})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Seleccionar Candidato */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Candidato *
                    </label>
                    <select
                      name="candidate"
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar candidato...</option>
                      {candidates.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.first_name} {candidate.last_name} - {candidate.email}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Días para expirar */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Días para completar la evaluación
                    </label>
                    <input
                      type="number"
                      name="days_to_expire"
                      defaultValue={7}
                      min="1"
                      max="90"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      El candidato tendrá este número de días para completar la evaluación
                    </p>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Asignar Evaluación
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}


      {/* Modal de Detalle de Evaluación */}
      {showDetailModal && selectedEvaluation && (
        <div className="fixed top-16 left-0 right-0 bottom-0  flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    Detalles de Evaluación
                  </h3>
                  <p className="text-sm text-gray-600">
                    ID: {selectedEvaluation.id}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedEvaluation(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              {/* Información Principal */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Candidato */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <i className="fas fa-user text-blue-600 mr-2"></i>
                    <h4 className="font-semibold text-gray-900">Candidato</h4>
                  </div>
                  <p className="text-lg text-gray-900">
                    {selectedEvaluation.candidate_name || 'No disponible'}
                  </p>
                </div>

                {/* Plantilla */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <i className="fas fa-file-alt text-purple-600 mr-2"></i>
                    <h4 className="font-semibold text-gray-900">Plantilla</h4>
                  </div>
                  <p className="text-lg text-gray-900">
                    {selectedEvaluation.template_name || 'No disponible'}
                  </p>
                </div>

                {/* Estado */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <i className="fas fa-info-circle text-gray-600 mr-2"></i>
                    <h4 className="font-semibold text-gray-900">Estado</h4>
                  </div>
                  {(() => {
                    const status = selectedEvaluation.status;
                    const statusConfig: Record<string, { label: string; color: string }> = {
                      pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-800" },
                      in_progress: { label: "En Progreso", color: "bg-blue-100 text-blue-800" },
                      completed: { label: "Completada", color: "bg-green-100 text-green-800" },
                      reviewed: { label: "Revisada", color: "bg-purple-100 text-purple-800" },
                      expired: { label: "Expirada", color: "bg-red-100 text-red-800" }
                    };
                    const config = statusConfig[status] || { label: status, color: "bg-gray-100 text-gray-800" };
                    return (
                      <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${config.color}`}>
                        {config.label}
                      </span>
                    );
                  })()}
                </div>

                {/* Calificación */}
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <i className="fas fa-chart-line text-green-600 mr-2"></i>
                    <h4 className="font-semibold text-gray-900">Calificación</h4>
                  </div>
                  {selectedEvaluation.final_score !== undefined && selectedEvaluation.final_score !== null ? (
                    <div>
                      <p className="text-2xl font-bold text-gray-900">
                        {Number(selectedEvaluation.final_score).toFixed(1)}%
                      </p>
                      {selectedEvaluation.passed !== undefined && (
                        <p className={`text-sm font-medium mt-1 ${
                          selectedEvaluation.passed ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {selectedEvaluation.passed ? '✅ Aprobado' : '❌ No Aprobado'}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500">Pendiente</p>
                  )}
                </div>
              </div>

              {/* Fechas */}
              <div className="border-t pt-4 mb-6">
                <h4 className="font-semibold text-gray-900 mb-3">
                  <i className="fas fa-calendar-alt text-gray-600 mr-2"></i>
                  Fechas Importantes
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {selectedEvaluation.started_at && (
                    <div>
                      <p className="text-sm text-gray-600">Iniciada</p>
                      <p className="font-medium text-gray-900">
                        {new Date(selectedEvaluation.started_at).toLocaleString('es-MX')}
                      </p>
                    </div>
                  )}
                  {selectedEvaluation.completed_at && (
                    <div>
                      <p className="text-sm text-gray-600">Completada</p>
                      <p className="font-medium text-gray-900">
                        {new Date(selectedEvaluation.completed_at).toLocaleString('es-MX')}
                      </p>
                    </div>
                  )}
                  {selectedEvaluation.expires_at && (
                    <div>
                      <p className="text-sm text-gray-600">Fecha Límite</p>
                      <p className="font-medium text-gray-900">
                        {new Date(selectedEvaluation.expires_at).toLocaleString('es-MX')}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Información Adicional */}
              {selectedEvaluation.assigned_by_name && (
                <div className="border-t pt-4">
                  <h4 className="font-semibold text-gray-900 mb-2">
                    <i className="fas fa-user-tie text-gray-600 mr-2"></i>
                    Información Adicional
                  </h4>
                  <p className="text-sm text-gray-600">
                    Asignado por: <span className="font-medium text-gray-900">{selectedEvaluation.assigned_by_name}</span>
                  </p>
                </div>
              )}

              {/* Botones de acción */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedEvaluation(null);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cerrar
                </button>
                {selectedEvaluation.status === 'completed' && (
                  <button
                    onClick={async () => {
                      // Aquí puedes agregar navegación a la vista de respuestas
                      await showAlert('Funcionalidad de ver respuestas por implementar');
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <i className="fas fa-eye mr-2"></i>
                    Ver Respuestas
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

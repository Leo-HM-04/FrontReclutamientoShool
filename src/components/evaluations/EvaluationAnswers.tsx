"use client";

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface CandidateEvaluation {
  id: number;
  candidate: number;
  candidate_name: string;
  template: number;
  template_title: string;
  status: string;
  status_display: string;
  final_score: number | null;
  passed: boolean | null;
  assigned_at: string;
  completed_at: string | null;
  progress_percentage: number | null;
}

interface Answer {
  id: number;
  question: number;
  question_text: string;
  question_type: string;
  question_points: number;
  answer_text: string;
  selected_option: string;
  is_correct: boolean | null;
  points_earned: number;
  feedback: string | null;
}

export default function EvaluationAnswers() {
  const [evaluations, setEvaluations] = useState<CandidateEvaluation[]>([]);
  const [selectedEvaluation, setSelectedEvaluation] = useState<CandidateEvaluation | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAnswers, setLoadingAnswers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchEvaluations();
  }, []);

  const fetchEvaluations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}/evaluations/candidate-evaluations/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("Response status:", response.status);
      const data = await response.json();
      console.log("API Response:", data);
      
      if (response.ok) {
        const evaluationsList = Array.isArray(data) ? data : data.results || [];
        console.log("Evaluations list:", evaluationsList);
        setEvaluations(evaluationsList);
      } else {
        console.error("Error response:", data);
      }
    } catch (error) {
      console.error("Error fetching evaluations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnswers = async (evaluationId: number) => {
    setLoadingAnswers(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${API_URL}/evaluations/answers/?evaluation=${evaluationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const answersList = Array.isArray(data) ? data : data.results || [];
        setAnswers(answersList);
      }
    } catch (error) {
      console.error("Error fetching answers:", error);
    } finally {
      setLoadingAnswers(false);
    }
  };

  const handleViewAnswers = async (evaluation: CandidateEvaluation) => {
    setSelectedEvaluation(evaluation);
    await fetchAnswers(evaluation.id);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: { label: "Completada", color: "bg-green-100 text-green-800" },
      in_progress: { label: "En Progreso", color: "bg-yellow-100 text-yellow-800" },
      pending: { label: "Pendiente", color: "bg-gray-100 text-gray-800" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>{config.label}</span>;
  };

  const filteredEvaluations = evaluations.filter((evaluation) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      (evaluation.candidate_name?.toLowerCase().includes(searchLower)) ||
      (evaluation.template_title?.toLowerCase().includes(searchLower)) ||
      !searchTerm;
    const matchesStatus = statusFilter === "all" || evaluation.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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

  if (selectedEvaluation) {
    return (
      <div>
        <div className="mb-6">
          <button
            onClick={() => {
              setSelectedEvaluation(null);
              setAnswers([]);
            }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <i className="fas fa-arrow-left"></i>
            Volver a la lista
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            {selectedEvaluation.template_title || 'Evaluación'}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <p className="text-sm text-gray-600">Candidato</p>
              <p className="font-semibold text-gray-900">
                {selectedEvaluation.candidate_name || 'N/A'}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Puntuación Final</p>
              <p className="text-3xl font-bold text-blue-600">
                {selectedEvaluation.final_score !== null ? `${parseFloat(selectedEvaluation.final_score.toString()).toFixed(2)}%` : "N/A"}
              </p>
              {selectedEvaluation.passed !== null && (
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  selectedEvaluation.passed ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}>
                  {selectedEvaluation.passed ? "Aprobado" : "No Aprobado"}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Estado</p>
              {getStatusBadge(selectedEvaluation.status)}
            </div>
            <div>
              <p className="text-gray-600">Asignada</p>
              <p className="font-semibold">{selectedEvaluation.assigned_at ? new Date(selectedEvaluation.assigned_at).toLocaleString('es-MX') : 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-600">Completada</p>
              <p className="font-semibold">
                {selectedEvaluation.completed_at 
                  ? new Date(selectedEvaluation.completed_at).toLocaleString('es-MX')
                  : "En progreso"}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h4 className="text-xl font-bold text-gray-900 mb-4">Respuestas</h4>
          
          {loadingAnswers ? (
            <div className="text-center py-8">
              <i className="fas fa-spinner fa-spin text-3xl text-blue-600 mb-2"></i>
              <p className="text-gray-600">Cargando respuestas...</p>
            </div>
          ) : answers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <i className="fas fa-inbox text-4xl mb-3"></i>
              <p>No hay respuestas registradas</p>
            </div>
          ) : (
            <div className="space-y-6">
              {answers.map((answer, index) => (
                <div key={answer.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 mb-2">
                        {index + 1}. {answer.question_text}
                      </p>
                      <span className="text-xs text-gray-500">
                        Tipo: {answer.question_type}
                      </span>
                    </div>
                    <div className="text-right ml-4">
                      <p className="text-sm font-semibold text-blue-600">
                        {answer.points_earned} / {answer.question_points} pts
                      </p>
                      {answer.is_correct !== null && (
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          answer.is_correct ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}>
                          {answer.is_correct ? "Correcta" : "Incorrecta"}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-600 mb-1">Respuesta:</p>
                    <p className="text-gray-900 font-medium">
                      {answer.answer_text || answer.selected_option || "Sin respuesta"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Respuestas de Evaluación</h3>
        <p className="text-gray-600 mb-4">
          Revisa las respuestas de las evaluaciones completadas por los candidatos
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <i className="fas fa-search mr-2"></i>
              Buscar
            </label>
            <input
              type="text"
              placeholder="Buscar por candidato o plantilla..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <i className="fas fa-filter mr-2"></i>
              Estado
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Todos</option>
              <option value="completed">Completadas</option>
              <option value="in_progress">En Progreso</option>
              <option value="pending">Pendientes</option>
            </select>
          </div>
        </div>
      </div>

      {filteredEvaluations.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <i className="fas fa-clipboard-check text-6xl text-gray-300 mb-4"></i>
          <p className="text-gray-500 text-lg">No se encontraron evaluaciones</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Candidato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Evaluación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Puntuación
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEvaluations.map((evaluation) => (
                  <tr key={evaluation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {evaluation.candidate_name || 'N/A'}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-gray-900">{evaluation.template_title || 'N/A'}</p>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(evaluation.status)}
                    </td>
                    <td className="px-6 py-4">
                      {evaluation.final_score !== null ? (
                        <div>
                          <p className="font-semibold text-blue-600">
                            {parseFloat(evaluation.final_score.toString()).toFixed(2)}%
                          </p>
                          {evaluation.passed !== null && (
                            <span className={`text-xs ${
                              evaluation.passed ? "text-green-600" : "text-red-600"
                            }`}>
                              {evaluation.passed ? "✓ Aprobado" : "✗ No aprobado"}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-900">
                        {evaluation.assigned_at ? new Date(evaluation.assigned_at).toLocaleDateString('es-MX') : 'N/A'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {evaluation.assigned_at ? new Date(evaluation.assigned_at).toLocaleTimeString('es-MX') : ''}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleViewAnswers(evaluation)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
                      >
                        <i className="fas fa-eye"></i>
                        Ver Respuestas
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

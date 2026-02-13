"use client";

import { useState, useEffect } from "react";
import { useModal } from '@/context/ModalContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface EvaluationComment {
  id: number;
  evaluation: number;
  evaluation_info?: string;
  user_name?: string;
  comment: string;
  is_internal: boolean;
  created_at: string;
}

interface CandidateEvaluation {
  id: number;
  candidate_name?: string;
  template_name?: string;
}

export default function EvaluationComments() {
  const [comments, setComments] = useState<EvaluationComment[]>([]);
  const [evaluations, setEvaluations] = useState<CandidateEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedComment, setSelectedComment] = useState<EvaluationComment | null>(null);
  const [filterEvaluation, setFilterEvaluation] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { showAlert, showConfirm } = useModal();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");

      // Fetch comments
      const commentsRes = await fetch(`${API_URL}/evaluations/comments/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (commentsRes.ok) {
        const commentsData = await commentsRes.json();
        setComments(Array.isArray(commentsData) ? commentsData : commentsData.results || []);
      }

      // Fetch evaluations
      const evalRes = await fetch(
        `${API_URL}/evaluations/candidate-evaluations/`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (evalRes.ok) {
        const evalData = await evalRes.json();
        setEvaluations(Array.isArray(evalData) ? evalData : evalData.results || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showConfirm("¿Estás seguro de eliminar este comentario?");
    if (!confirmed) return;

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${API_URL}/evaluations/comments/${id}/`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.ok) {
        setComments(comments.filter((c) => c.id !== id));
      }
    } catch (error) {
      console.error("Error deleting comment:", error);
    }
  };

  const filteredComments = comments.filter((comment) => {
    const matchesSearch = comment.comment.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comment.user_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEvaluation =
      filterEvaluation === "all" || comment.evaluation === parseInt(filterEvaluation);
    const matchesType =
      filterType === "all" ||
      (filterType === "internal" && comment.is_internal) ||
      (filterType === "public" && !comment.is_internal);
    return matchesSearch && matchesEvaluation && matchesType;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
          <p className="text-gray-600">Cargando comentarios...</p>
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
            <h3 className="text-xl font-bold text-gray-900">Comentarios de Evaluación</h3>
            <p className="text-sm text-gray-600 mt-1">
              {comments.length} comentarios registrados
            </p>
          </div>
          <button
            onClick={() => {
              setSelectedComment(null);
              setShowModal(true);
            }}
            className="mt-4 sm:mt-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <i className="fas fa-plus mr-2"></i>
            Nuevo Comentario
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Buscar comentarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterEvaluation}
            onChange={(e) => setFilterEvaluation(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todas las evaluaciones</option>
            {evaluations.map((evaluation) => (
              <option key={evaluation.id} value={evaluation.id}>
                {evaluation.candidate_name} - {evaluation.template_name}
              </option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos los tipos</option>
            <option value="public">Públicos</option>
            <option value="internal">Internos</option>
          </select>
        </div>
      </div>

      {/* Comments List */}
      {filteredComments.length === 0 ? (
        <div className="text-center py-12">
          <i className="fas fa-comments text-6xl text-gray-300 mb-4"></i>
          <p className="text-gray-500 text-lg">No se encontraron comentarios</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredComments.map((comment) => (
            <div
              key={comment.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <i className="fas fa-user text-blue-600"></i>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{comment.user_name || "Usuario"}</p>
                    <p className="text-xs text-gray-500">{formatDate(comment.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {comment.is_internal ? (
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                      <i className="fas fa-lock mr-1"></i>
                      Interno
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">
                      <i className="fas fa-eye mr-1"></i>
                      Público
                    </span>
                  )}
                  <button
                    onClick={() => {
                      setSelectedComment(comment);
                      setShowModal(true);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    title="Editar"
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    onClick={() => handleDelete(comment.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Eliminar"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
              {comment.evaluation_info && (
                <p className="text-xs text-gray-500 mt-2">
                  <i className="fas fa-clipboard-list mr-1"></i>
                  {comment.evaluation_info}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal para Crear/Editar Comentario */}
      {showModal && (
        <div className="fixed top-16 left-0 right-0 bottom-0  flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedComment ? "Editar Comentario" : "Nuevo Comentario"}
                </h3>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedComment(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);

                  const data = {
                    evaluation: parseInt(formData.get("evaluation") as string),
                    comment: formData.get("comment"),
                    is_internal: formData.get("is_internal") === "on",
                  };

                  try {
                    const token = localStorage.getItem("authToken");
                    const url = selectedComment
                      ? `${API_URL}/evaluations/comments/${selectedComment.id}/`
                      : `${API_URL}/evaluations/comments/`;

                    const method = selectedComment ? "PUT" : "POST";

                    const response = await fetch(url, {
                      method,
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                      },
                      body: JSON.stringify(data),
                    });

                    if (response.ok) {
                      await fetchData();
                      setShowModal(false);
                      setSelectedComment(null);
                    } else {
                      const error = await response.json();
                      await showAlert("Error: " + JSON.stringify(error));
                    }
                  } catch (error) {
                    console.error("Error:", error);
                    await showAlert("Error al guardar el comentario");
                  }
                }}
              >
                <div className="space-y-4">
                  {/* Seleccionar Evaluación */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Evaluación *
                    </label>
                    <select
                      name="evaluation"
                      defaultValue={selectedComment?.evaluation || ""}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Seleccionar evaluación...</option>
                      {evaluations.map((evaluation) => (
                        <option key={evaluation.id} value={evaluation.id}>
                          {evaluation.candidate_name} - {evaluation.template_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Comentario */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Comentario *
                    </label>
                    <textarea
                      name="comment"
                      defaultValue={selectedComment?.comment || ""}
                      required
                      rows={5}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Escribe tu comentario aquí..."
                    />
                  </div>

                  {/* Es interno */}
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        name="is_internal"
                        id="is_internal"
                        defaultChecked={selectedComment?.is_internal || false}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3">
                      <label htmlFor="is_internal" className="text-sm font-medium text-gray-700">
                        Comentario interno
                      </label>
                      <p className="text-xs text-gray-500">
                        Los comentarios internos solo son visibles para el equipo de reclutamiento
                      </p>
                    </div>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex justify-end gap-3 mt-6 pt-6 border-t">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setSelectedComment(null);
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    {selectedComment ? "Actualizar" : "Crear"} Comentario
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

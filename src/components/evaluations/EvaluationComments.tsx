"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  const formRef = useRef<HTMLFormElement>(null);

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
      {showModal && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setShowModal(false); setSelectedComment(null); } }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl flex flex-col"
            style={{ width: '95vw', height: '92vh', maxWidth: '800px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-8 py-5 flex justify-between items-center rounded-t-2xl">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <i className="fas fa-comment-dots"></i>
                  {selectedComment ? "Editar Comentario" : "Nuevo Comentario"}
                </h2>
                <p className="text-orange-100 text-sm mt-1">
                  {selectedComment ? "Modifica el contenido del comentario" : "Agrega un comentario a una evaluación"}
                </p>
              </div>
              <button
                onClick={() => { setShowModal(false); setSelectedComment(null); }}
                className="text-white hover:bg-orange-700 rounded-full w-10 h-10 flex items-center justify-center transition"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8">
              <form ref={formRef}
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
                {/* Evaluation Selection */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200 mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <i className="fas fa-clipboard-list text-orange-600"></i>
                    Evaluación Asociada
                  </h3>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      <i className="fas fa-file-alt mr-1 text-orange-500"></i> Evaluación *
                    </label>
                    <select
                      name="evaluation"
                      defaultValue={selectedComment?.evaluation || ""}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                    >
                      <option value="">Seleccionar evaluación...</option>
                      {evaluations.map((evaluation) => (
                        <option key={evaluation.id} value={evaluation.id}>
                          {evaluation.candidate_name} - {evaluation.template_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Comment Content */}
                <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200 mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <i className="fas fa-pen text-gray-600"></i>
                    Contenido del Comentario
                  </h3>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      <i className="fas fa-comment mr-1 text-orange-500"></i> Comentario *
                    </label>
                    <textarea
                      name="comment"
                      defaultValue={selectedComment?.comment || ""}
                      required
                      rows={6}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition"
                      placeholder="Escribe tu comentario aquí..."
                    />
                  </div>
                </div>

                {/* Visibility Settings */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <i className="fas fa-eye text-blue-600"></i>
                    Visibilidad
                  </h3>
                  <label className="flex items-start gap-4 px-4 py-4 bg-white rounded-xl border border-gray-300 cursor-pointer hover:bg-gray-50 transition">
                    <input
                      type="checkbox"
                      name="is_internal"
                      id="is_internal"
                      defaultChecked={selectedComment?.is_internal || false}
                      className="h-5 w-5 rounded text-orange-600 focus:ring-orange-500 mt-0.5"
                    />
                    <div>
                      <span className="text-sm font-semibold text-gray-700">Comentario interno</span>
                      <p className="text-xs text-gray-500 mt-1">
                        <i className="fas fa-lock mr-1"></i>
                        Los comentarios internos solo son visibles para el equipo de reclutamiento
                      </p>
                    </div>
                  </label>
                </div>
              </form>
            </div>

            {/* Fixed Footer */}
            <div className="flex-shrink-0 px-8 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end gap-4">
              <button
                type="button"
                onClick={() => { setShowModal(false); setSelectedComment(null); }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => formRef.current?.requestSubmit()}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 font-semibold shadow-lg transition"
              >
                <i className="fas fa-save mr-2"></i>
                {selectedComment ? "Actualizar" : "Crear"} Comentario
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

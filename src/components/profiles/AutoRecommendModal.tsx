"use client";

import { useState, useEffect } from "react";
import { getAutoRecommendations } from "@/lib/api";

interface RecommendedCandidate {
  candidate_id: string | number;
  candidate_name: string;
  candidate_email: string;
  current_position: string;
  current_company: string;
  years_of_experience: number;
  education_level: string;
  city: string;
  state: string;
  skills: string[];
  local_score: number;
  ai_score: number | null;
  analysis: string;
  strengths: string[];
  gaps: string[];
  recommendations: string;
  cached: boolean;
}

interface RecommendationResult {
  profile_id: string | number;
  profile_title: string;
  candidates_analyzed: number;
  recommendations: RecommendedCandidate[];
  total_candidates_in_db: number;
  tokens_used: number;
  execution_time_seconds: number;
  used_ai: boolean;
}

interface AutoRecommendModalProps {
  profileId: string | number;
  profileTitle: string;
  isOpen: boolean;
  onClose: () => void;
  onViewCandidate?: (candidateId: string | number) => void;
}

export default function AutoRecommendModal({
  profileId,
  profileTitle,
  isOpen,
  onClose,
  onViewCandidate,
}: AutoRecommendModalProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<RecommendationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useAI, setUseAI] = useState(true);
  const [limit, setLimit] = useState(5);
  const [expandedCandidate, setExpandedCandidate] = useState<string | number | null>(null);

  useEffect(() => {
    if (isOpen && !result) {
      fetchRecommendations();
    }
  }, [isOpen]);

  const fetchRecommendations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAutoRecommendations(profileId, limit, useAI);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Error al obtener recomendaciones");
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "bg-gray-100 text-gray-700";
    if (score >= 80) return "bg-green-100 text-green-700";
    if (score >= 60) return "bg-yellow-100 text-yellow-700";
    if (score >= 40) return "bg-orange-100 text-orange-700";
    return "bg-red-100 text-red-700";
  };

  const formatScore = (score: number | null) => {
    if (score === null) return "N/A";
    return `${Math.round(score)}%`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <i className="fas fa-magic text-xl"></i>
              </div>
              <div>
                <h2 className="text-xl font-bold">Recomendación Automática</h2>
                <p className="text-white/80 text-sm">Perfil: {profileTitle}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-purple-200 rounded-full animate-spin"></div>
                <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
              </div>
              <p className="mt-6 text-gray-600 font-medium">Analizando candidatos...</p>
              <p className="mt-2 text-gray-400 text-sm">
                {useAI ? "Usando IA para análisis profundo" : "Analizando con criterios básicos"}
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <i className="fas fa-exclamation-triangle text-red-600 text-2xl"></i>
              </div>
              <p className="text-red-600 font-medium mb-4">{error}</p>
              <button
                onClick={fetchRecommendations}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                <i className="fas fa-redo mr-2"></i>
                Reintentar
              </button>
            </div>
          ) : result ? (
            <div>
              {/* Stats Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-purple-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-purple-700">{result.recommendations.length}</p>
                  <p className="text-sm text-purple-600">Recomendaciones</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-blue-700">{result.candidates_analyzed}</p>
                  <p className="text-sm text-blue-600">Analizados</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-indigo-700">{result.execution_time_seconds}s</p>
                  <p className="text-sm text-indigo-600">Tiempo</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">{result.tokens_used}</p>
                  <p className="text-sm text-green-600">Tokens usados</p>
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={useAI}
                      onChange={(e) => setUseAI(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-700">Usar análisis IA</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-700">Cantidad:</span>
                    <select
                      value={limit}
                      onChange={(e) => setLimit(Number(e.target.value))}
                      className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value={3}>3</option>
                      <option value={5}>5</option>
                      <option value={7}>7</option>
                      <option value={10}>10</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={fetchRecommendations}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                >
                  <i className="fas fa-sync-alt mr-2"></i>
                  Recalcular
                </button>
              </div>

              {/* Recommendations List */}
              {result.recommendations.length === 0 ? (
                <div className="text-center py-10 text-gray-500">
                  <i className="fas fa-search text-4xl mb-4"></i>
                  <p>No se encontraron candidatos que cumplan con el perfil.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {result.recommendations.map((candidate, index) => (
                    <div
                      key={candidate.candidate_id}
                      className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                    >
                      {/* Candidate Header */}
                      <div
                        className="flex items-center justify-between p-4 bg-white cursor-pointer"
                        onClick={() =>
                          setExpandedCandidate(
                            expandedCandidate === candidate.candidate_id ? null : candidate.candidate_id
                          )
                        }
                      >
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900">{candidate.candidate_name}</h3>
                            <p className="text-sm text-gray-500">
                              {candidate.current_position}
                              {candidate.current_company && ` en ${candidate.current_company}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          {/* Score Badge */}
                          <div className="text-center">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${getScoreColor(
                                candidate.ai_score ?? candidate.local_score
                              )}`}
                            >
                              {formatScore(candidate.ai_score ?? candidate.local_score)}
                            </span>
                            <p className="text-xs text-gray-400 mt-1">
                              {candidate.ai_score !== null ? "Score IA" : "Score Local"}
                            </p>
                          </div>
                          {candidate.cached && (
                            <span className="text-xs text-gray-400">
                              <i className="fas fa-history mr-1"></i>Cache
                            </span>
                          )}
                          <i
                            className={`fas fa-chevron-${
                              expandedCandidate === candidate.candidate_id ? "up" : "down"
                            } text-gray-400`}
                          ></i>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {expandedCandidate === candidate.candidate_id && (
                        <div className="border-t border-gray-100 bg-gray-50 p-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Left Column - Info */}
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                  <i className="fas fa-user text-purple-500 mr-2"></i>
                                  Información General
                                </h4>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                  <div>
                                    <span className="text-gray-500">Experiencia:</span>
                                    <span className="ml-2 font-medium">{candidate.years_of_experience} años</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Educación:</span>
                                    <span className="ml-2 font-medium">{candidate.education_level || "N/A"}</span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Ubicación:</span>
                                    <span className="ml-2 font-medium">
                                      {candidate.city}, {candidate.state}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Email:</span>
                                    <span className="ml-2 font-medium text-blue-600">{candidate.candidate_email}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Skills */}
                              {candidate.skills && candidate.skills.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                    <i className="fas fa-tools text-purple-500 mr-2"></i>
                                    Habilidades
                                  </h4>
                                  <div className="flex flex-wrap gap-1">
                                    {candidate.skills.slice(0, 8).map((skill, i) => (
                                      <span
                                        key={i}
                                        className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                                      >
                                        {skill}
                                      </span>
                                    ))}
                                    {candidate.skills.length > 8 && (
                                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                        +{candidate.skills.length - 8} más
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* Right Column - AI Analysis */}
                            <div className="space-y-4">
                              {candidate.analysis && (
                                <div>
                                  <h4 className="text-sm font-semibold text-gray-700 mb-2">
                                    <i className="fas fa-robot text-purple-500 mr-2"></i>
                                    Análisis IA
                                  </h4>
                                  <p className="text-sm text-gray-600 bg-white rounded p-3 border border-gray-200">
                                    {candidate.analysis}
                                  </p>
                                </div>
                              )}

                              {/* Strengths */}
                              {candidate.strengths && candidate.strengths.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-green-700 mb-2">
                                    <i className="fas fa-check-circle mr-2"></i>
                                    Fortalezas
                                  </h4>
                                  <ul className="text-sm text-gray-600 space-y-1">
                                    {candidate.strengths.map((strength, i) => (
                                      <li key={i} className="flex items-start">
                                        <i className="fas fa-plus text-green-500 mr-2 mt-1 text-xs"></i>
                                        {strength}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Gaps */}
                              {candidate.gaps && candidate.gaps.length > 0 && (
                                <div>
                                  <h4 className="text-sm font-semibold text-orange-700 mb-2">
                                    <i className="fas fa-exclamation-circle mr-2"></i>
                                    Brechas
                                  </h4>
                                  <ul className="text-sm text-gray-600 space-y-1">
                                    {candidate.gaps.map((gap, i) => (
                                      <li key={i} className="flex items-start">
                                        <i className="fas fa-minus text-orange-500 mr-2 mt-1 text-xs"></i>
                                        {gap}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end space-x-2">
                            {onViewCandidate && (
                              <button
                                onClick={() => onViewCandidate(candidate.candidate_id)}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm"
                              >
                                <i className="fas fa-eye mr-2"></i>
                                Ver Candidato
                              </button>
                            )}
                            <a
                              href={`mailto:${candidate.candidate_email}`}
                              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                            >
                              <i className="fas fa-envelope mr-2"></i>
                              Contactar
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            <i className="fas fa-info-circle mr-2"></i>
            Los resultados se basan en el análisis de compatibilidad con el perfil
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

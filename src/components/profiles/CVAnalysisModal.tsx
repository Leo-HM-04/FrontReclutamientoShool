"use client";

import { useState, useEffect } from "react";
import { useModal } from '@/context/ModalContext';
import { analyzeCVWithAI, getCandidates, apiClient } from "@/lib/api";

interface Candidate {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
}

interface AnalysisResult {
  status: string;
  analysis_method?: string;
  method_display?: string;
  confidence_score?: number;
  ai_summary?: string;
  strengths?: string[];
  weaknesses?: string[];
  recommended_positions?: string[];
  parsed_data?: any;
  error_message?: string;
}

interface CVAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export default function CVAnalysisModal({ isOpen, onClose, onSuccess }: CVAnalysisModalProps) {
  const { showAlert } = useModal();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<string>("");
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [processingStatus, setProcessingStatus] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [analysisId, setAnalysisId] = useState<number | null>(null);
  const [pollingActive, setPollingActive] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCandidates();
    }
  }, [isOpen]);

  const loadCandidates = async () => {
    setLoadingCandidates(true);
    try {
      const response = await getCandidates({ ordering: '-created_at' });
      const candidatesList = (response as any).results || (Array.isArray(response) ? response : []);
      setCandidates(candidatesList);
    } catch (error) {
      console.error('Error loading candidates:', error);
      if (onSuccess) {
        onSuccess('⚠️ Error al cargar candidatos');
      }
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!validTypes.includes(file.type)) {
        await showAlert('Por favor selecciona un archivo PDF o DOCX');
        e.target.value = '';
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        await showAlert('El archivo es demasiado grande. Máximo 10MB');
        e.target.value = '';
        return;
      }
      
      setCvFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedCandidate) {
      await showAlert('Por favor selecciona un candidato');
      return;
    }
    
    if (!cvFile) {
      await showAlert('Por favor selecciona un archivo CV');
      return;
    }

    setLoading(true);
    setProcessingStatus("📤 Enviando CV al servidor...");
    setAnalysisResult(null);

    try {
      const formData = new FormData();
      formData.append('candidate_id', selectedCandidate);
      formData.append('document_file', cvFile);

      const result = await analyzeCVWithAI(formData);
      const newAnalysisId = result.analysis_id;
      setAnalysisId(newAnalysisId);
      setProcessingStatus("🔄 Procesando CV con sistema híbrido (Claude AI + Reglas)...");
      setPollingActive(true);

      // Poll for result
      let attempts = 0;
      const maxAttempts = 30; // 30 * 2s = 60s timeout
      const pollInterval = 2000;

      const poll = async () => {
        while (attempts < maxAttempts) {
          attempts++;
          await new Promise(resolve => setTimeout(resolve, pollInterval));

          try {
            const analysisData = await apiClient.getCVAnalysis(newAnalysisId);
            
            if (analysisData.status === 'completed') {
              setProcessingStatus("");
              setPollingActive(false);
              setLoading(false);
              setAnalysisResult({
                status: 'completed',
                analysis_method: analysisData.analysis_method,
                method_display: analysisData.method_display,
                confidence_score: analysisData.confidence_score,
                ai_summary: analysisData.ai_summary,
                strengths: analysisData.strengths,
                weaknesses: analysisData.weaknesses,
                recommended_positions: analysisData.recommended_positions,
                parsed_data: analysisData.parsed_data,
              });
              return;
            } else if (analysisData.status === 'failed') {
              setProcessingStatus("");
              setPollingActive(false);
              setLoading(false);
              setAnalysisResult({
                status: 'failed',
                error_message: analysisData.error_message || 'Error en el análisis',
              });
              return;
            }
            
            // Still processing
            if (attempts < 5) {
              setProcessingStatus("🔍 Extrayendo texto del documento...");
            } else if (attempts < 10) {
              setProcessingStatus("🤖 Analizando contenido con IA...");
            } else {
              setProcessingStatus("⏳ Procesando... (sistema de respaldo activo)");
            }
          } catch (pollErr) {
            console.warn('Error polling result:', pollErr);
          }
        }

        // Timeout
        setProcessingStatus("");
        setPollingActive(false);
        setLoading(false);
        setAnalysisResult({
          status: 'timeout',
          error_message: 'El análisis está tomando más tiempo del esperado. Podrás ver el resultado en el listado de análisis.',
        });
      };

      await poll();

    } catch (error: any) {
      console.error('Error analyzing CV:', error);
      setProcessingStatus("");
      setPollingActive(false);
      setLoading(false);
      setAnalysisResult({
        status: 'failed',
        error_message: error.message || 'Error al enviar el CV para análisis',
      });
    }
  };

  const handleClose = () => {
    if (analysisResult?.status === 'completed' && onSuccess) {
      const methodLabel = analysisResult.method_display || 'IA';
      onSuccess(`✅ CV analizado exitosamente con ${methodLabel} (${analysisResult.confidence_score || 0}% confianza)`);
    }
    // Reset everything
    setSelectedCandidate("");
    setCvFile(null);
    setAnalysisResult(null);
    setAnalysisId(null);
    setProcessingStatus("");
    setPollingActive(false);
    setLoading(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
      <div className="fixed top-16 left-0 right-0 bottom-0  flex items-center justify-center z-35 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-6 flex justify-between items-center rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold">Analizar CV con IA</h2>
            <p className="text-blue-100 text-sm mt-1">Sistema Híbrido: Claude AI + Fallback OCR/Reglas</p>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:bg-blue-800 rounded-full w-10 h-10 flex items-center justify-center transition"
            disabled={loading}
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* ===== RESULTADO DEL ANÁLISIS ===== */}
        {analysisResult ? (
          <div className="p-8">
            {analysisResult.status === 'completed' ? (
              <div className="space-y-6">
                {/* Header de éxito */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-5">
                  <div className="flex items-center mb-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <i className="fas fa-check-circle text-green-600 text-xl"></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-green-800 text-lg">Análisis Completado</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          analysisResult.analysis_method === 'claude_ai' 
                            ? 'bg-purple-100 text-purple-700' 
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {analysisResult.analysis_method === 'claude_ai' ? '🤖' : '🔧'} {analysisResult.method_display || 'IA'}
                        </span>
                        <span className="text-sm text-green-600">
                          Confianza: {analysisResult.confidence_score?.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Resumen */}
                {analysisResult.ai_summary && (
                  <div className="bg-white border border-gray-200 rounded-xl p-5">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center">
                      <i className="fas fa-file-alt text-blue-600 mr-2"></i>
                      Resumen del CV
                    </h4>
                    <p className="text-gray-700 text-sm leading-relaxed">{analysisResult.ai_summary}</p>
                  </div>
                )}

                {/* Datos extraídos */}
                {analysisResult.parsed_data && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Datos personales */}
                    {analysisResult.parsed_data.datos_personales && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h5 className="font-semibold text-gray-700 mb-2 text-sm">
                          <i className="fas fa-user text-blue-500 mr-1"></i> Datos Personales
                        </h5>
                        <div className="space-y-1 text-sm text-gray-600">
                          {analysisResult.parsed_data.datos_personales.nombre && (
                            <p><strong>Nombre:</strong> {analysisResult.parsed_data.datos_personales.nombre}</p>
                          )}
                          {analysisResult.parsed_data.datos_personales.email && (
                            <p><strong>Email:</strong> {analysisResult.parsed_data.datos_personales.email}</p>
                          )}
                          {analysisResult.parsed_data.datos_personales.telefono && (
                            <p><strong>Tel:</strong> {analysisResult.parsed_data.datos_personales.telefono}</p>
                          )}
                          {analysisResult.parsed_data.datos_personales.ciudad && (
                            <p><strong>Ciudad:</strong> {analysisResult.parsed_data.datos_personales.ciudad}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Habilidades */}
                    {analysisResult.parsed_data.habilidades_tecnicas?.length > 0 && (
                      <div className="bg-gray-50 rounded-xl p-4">
                        <h5 className="font-semibold text-gray-700 mb-2 text-sm">
                          <i className="fas fa-code text-purple-500 mr-1"></i> Habilidades Técnicas
                        </h5>
                        <div className="flex flex-wrap gap-1">
                          {analysisResult.parsed_data.habilidades_tecnicas.slice(0, 10).map((skill: string, i: number) => (
                            <span key={i} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                              {skill}
                            </span>
                          ))}
                          {analysisResult.parsed_data.habilidades_tecnicas.length > 10 && (
                            <span className="px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full text-xs">
                              +{analysisResult.parsed_data.habilidades_tecnicas.length - 10} más
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Fortalezas y Debilidades */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {analysisResult.strengths && analysisResult.strengths.length > 0 && (
                    <div className="bg-green-50 rounded-xl p-4">
                      <h5 className="font-semibold text-green-700 mb-2 text-sm">
                        <i className="fas fa-star text-green-500 mr-1"></i> Fortalezas
                      </h5>
                      <ul className="space-y-1">
                        {analysisResult.strengths.slice(0, 5).map((s, i) => (
                          <li key={i} className="text-sm text-green-600 flex items-start">
                            <i className="fas fa-check text-green-400 mr-1 mt-1 text-xs"></i>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysisResult.weaknesses && analysisResult.weaknesses.length > 0 && (
                    <div className="bg-orange-50 rounded-xl p-4">
                      <h5 className="font-semibold text-orange-700 mb-2 text-sm">
                        <i className="fas fa-exclamation-triangle text-orange-500 mr-1"></i> Áreas de Mejora
                      </h5>
                      <ul className="space-y-1">
                        {analysisResult.weaknesses.slice(0, 5).map((w, i) => (
                          <li key={i} className="text-sm text-orange-600 flex items-start">
                            <i className="fas fa-minus text-orange-400 mr-1 mt-1 text-xs"></i>
                            {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Posiciones recomendadas */}
                {analysisResult.recommended_positions && analysisResult.recommended_positions.length > 0 && (
                  <div className="bg-blue-50 rounded-xl p-4">
                    <h5 className="font-semibold text-blue-700 mb-2 text-sm">
                      <i className="fas fa-briefcase text-blue-500 mr-1"></i> Posiciones Recomendadas
                    </h5>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.recommended_positions.map((pos, i) => (
                        <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                          {pos}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Botón cerrar */}
                <button
                  onClick={handleClose}
                  className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 font-semibold shadow-lg transition"
                >
                  <i className="fas fa-check mr-2"></i>
                  Cerrar y Ver Resultados
                </button>
              </div>
            ) : (
              /* Estado de error o timeout */
              <div className="space-y-6">
                <div className={`border rounded-xl p-5 ${
                  analysisResult.status === 'timeout' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-center mb-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                      analysisResult.status === 'timeout' ? 'bg-yellow-100' : 'bg-red-100'
                    }`}>
                      <i className={`fas ${
                        analysisResult.status === 'timeout' ? 'fa-clock text-yellow-600' : 'fa-exclamation-circle text-red-600'
                      } text-xl`}></i>
                    </div>
                    <div>
                      <h3 className={`font-bold text-lg ${
                        analysisResult.status === 'timeout' ? 'text-yellow-800' : 'text-red-800'
                      }`}>
                        {analysisResult.status === 'timeout' ? 'Análisis en Progreso' : 'Error en el Análisis'}
                      </h3>
                      <p className={`text-sm ${
                        analysisResult.status === 'timeout' ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {analysisResult.error_message}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={handleClose}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={() => { setAnalysisResult(null); setAnalysisId(null); }}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition"
                  >
                    <i className="fas fa-redo mr-2"></i>
                    Reintentar
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ===== FORMULARIO DE ANÁLISIS ===== */
          <form onSubmit={handleSubmit} className="p-8">
            {/* Processing status */}
            {loading && processingStatus && (
              <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-5">
                <div className="flex items-center">
                  <div className="relative mr-4">
                    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                  </div>
                  <div>
                    <p className="font-semibold text-blue-800">{processingStatus}</p>
                    <p className="text-sm text-blue-600 mt-1">
                      El sistema intentará Claude AI primero, con fallback automático a OCR/Reglas
                    </p>
                  </div>
                </div>
                <div className="mt-4 w-full bg-blue-200 rounded-full h-1.5">
                  <div className="bg-blue-600 h-1.5 rounded-full animate-pulse" style={{ width: '70%' }}></div>
                </div>
              </div>
            )}
          {/* Candidate Selection */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              <i className="fas fa-user mr-2 text-blue-600"></i>
              Candidato
            </label>
            {loadingCandidates ? (
              <div className="flex items-center justify-center py-4">
                <i className="fas fa-spinner fa-spin text-blue-600 mr-2"></i>
                <span className="text-gray-600">Cargando candidatos...</span>
              </div>
            ) : (
              <select
                value={selectedCandidate}
                onChange={(e) => setSelectedCandidate(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={loading}
              >
                <option value="">Seleccionar candidato...</option>
                {candidates.map((candidate) => (
                  <option key={candidate.id} value={candidate.id}>
                    {candidate.full_name} - {candidate.email}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">
              <i className="fas fa-file-pdf mr-2 text-blue-600"></i>
              Archivo CV (PDF o DOCX)
            </label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={handleFileChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              disabled={loading}
            />
            {cvFile && (
              <p className="mt-2 text-sm text-gray-600">
                <i className="fas fa-check-circle text-green-600 mr-1"></i>
                Archivo seleccionado: {cvFile.name} ({(cvFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <i className="fas fa-info-circle text-blue-500 text-xl"></i>
              </div>
              <div className="ml-3">
                <p className="text-sm text-blue-700">
                  <strong>Sistema Híbrido</strong> — Intentará <strong>Claude AI</strong> (95% precisión), con respaldo automático de <strong>OCR + Reglas</strong> (70% precisión):
                </p>
                <ul className="list-disc list-inside text-sm text-blue-600 mt-2 space-y-1">
                  <li>Información personal (nombre, email, teléfono)</li>
                  <li>Experiencia laboral completa</li>
                  <li>Educación y certificaciones</li>
                  <li>Habilidades técnicas y blandas</li>
                  <li>Idiomas</li>
                  <li>Análisis y recomendaciones</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !selectedCandidate || !cvFile}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Analizando...
                </>
              ) : (
                <>
                  <i className="fas fa-robot mr-2"></i>
                  Analizar con IA
                </>
              )}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}

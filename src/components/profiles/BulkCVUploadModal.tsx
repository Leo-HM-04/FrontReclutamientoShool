"use client";

import { useState, useEffect } from "react";
import { useModal } from '@/context/ModalContext';
import { bulkUploadCVs, getBulkUploadStatus, getProfiles } from "@/lib/api";

interface Profile {
  id: number;
  position_title: string;
  client_name?: string;
}

interface BulkCVUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

interface UploadResult {
  success: boolean;
  filename: string;
  candidate_name?: string;
  candidate_email?: string;
  candidate_id?: number;
  error?: string;
  created?: boolean;
  matching_score?: number | null;
  matching_details?: {
    overall: number;
    technical: number;
    experience: number;
    education: number;
    method: string;
  } | null;
  analysis_method?: string;
  method_label?: string;
  confidence_score?: number;
  summary?: string;
  strengths?: string[];
  recommended_positions?: string[];
  processing_time?: number;
}

export default function BulkCVUploadModal({ 
  isOpen, 
  onClose, 
  onSuccess 
}: BulkCVUploadModalProps) {
  const { showAlert } = useModal();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>("");
  const [cvFiles, setCvFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [results, setResults] = useState<UploadResult[] | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [isAsyncProcessing, setIsAsyncProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadProfiles();
      resetForm();
    }
  }, [isOpen]);

  // Poll para procesamiento asíncrono
  // Poll para procesamiento asíncrono
  useEffect(() => {
    if (isAsyncProcessing && taskId) {
      const interval = setInterval(async () => {
        try {
          const response = await getBulkUploadStatus(taskId);
          console.log('Bulk upload status:', response);
          
          // El backend devuelve 'status' no 'state' cuando la tarea termina
          if (response.status === 'completed') {
            const allResults = [
              ...(response.result?.successful_details || []),
              ...(response.result?.failed_details || [])
            ];
            setResults(allResults);
            setUploadProgress(`Procesamiento completado: ${response.result?.successful || 0} exitosos, ${response.result?.failed || 0} fallidos`);
            setIsAsyncProcessing(false);
            setLoading(false);
            clearInterval(interval);
            
            if (onSuccess) {
              onSuccess(`${response.result?.successful || 0} candidatos procesados exitosamente`);
            }
          } else if (response.status === 'failed') {
            setUploadProgress(`Error en el procesamiento: ${response.error || 'Error desconocido'}`);
            setIsAsyncProcessing(false);
            setLoading(false);
            clearInterval(interval);
          } else if (response.status === 'processing') {
            // Mientras está en proceso, mostrar el estado de Celery
            const celeryState = response.state || 'PENDING';
            setUploadProgress(`Procesando CVs... Estado: ${celeryState}`);
          }
        } catch (error) {
          console.error('Error checking status:', error);
          // No detener el polling por un error de red temporal
        }
      }, 3000);

      return () => clearInterval(interval);
    }
  }, [isAsyncProcessing, taskId, onSuccess]);

  const loadProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const response = await getProfiles();
      const profilesList = (response as any).results || (Array.isArray(response) ? response : []);
      setProfiles(profilesList);
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setLoadingProfiles(false);
    }
  };

  const resetForm = () => {
    setSelectedProfile("");
    setCvFiles([]);
    setResults(null);
    setUploadProgress("");
    setTaskId(null);
    setIsAsyncProcessing(false);
  };

  const handleFilesChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const filesArray = Array.from(files);
      
      if (filesArray.length > 50) {
        await showAlert('Máximo 50 archivos por carga');
        e.target.value = '';
        return;
      }
      
      // Validar tipos y tamaños
      const validFiles: File[] = [];
      const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      for (const file of filesArray) {
        if (!validTypes.includes(file.type)) {
          await showAlert(`${file.name}: Tipo de archivo no válido. Solo PDF o DOCX`);
          continue;
        }
        
        if (file.size > maxSize) {
          await showAlert(`${file.name}: Archivo muy grande. Máximo 10MB`);
          continue;
        }
        
        validFiles.push(file);
      }
      
      setCvFiles(validFiles);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (cvFiles.length === 0) {
      await showAlert('Por favor selecciona al menos un archivo CV');
      return;
    }

    setLoading(true);
    setUploadProgress(`Subiendo ${cvFiles.length} CVs...`);
    setResults(null);

    try {
      const formData = new FormData();
      
      // Agregar archivos
      cvFiles.forEach((file) => {
        formData.append('files', file);
      });
      
      // Agregar profile_id si está seleccionado
      if (selectedProfile) {
        formData.append('profile_id', selectedProfile);
      }

      const result = await bulkUploadCVs(formData);

      // Procesamiento síncrono (≤3 archivos)
      if (result.status === undefined || result.total_processed !== undefined) {
        const allResults = [
          ...(result.results?.successful || []),
          ...(result.results?.failed || [])
        ];
        setResults(allResults);
        setUploadProgress(
          `${result.message || 'Procesamiento completado'}\n` +
          `Total: ${result.total_processed} | Exitosos: ${result.successful} | Fallidos: ${result.failed}`
        );
        setLoading(false);
        
        if (onSuccess) {
          onSuccess(`${result.successful} candidatos creados exitosamente`);
        }
      } 
      // Procesamiento asíncrono (3 archivos)
      else if (result.task_id) {
        setTaskId(result.task_id);
        setIsAsyncProcessing(true);
        setUploadProgress(`Procesando ${result.total_files} CVs en segundo plano...`);
      }
    } catch (error: any) {
      console.error('Error uploading CVs:', error);
      setUploadProgress(`Error: ${error.message || 'Error al subir los CVs'}`);
      setLoading(false);
      
      if (onSuccess) {
        onSuccess(`Error: ${error.message}`);
      }
    }
  };

  const handleClose = () => {
    if (!loading && !isAsyncProcessing) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed top-16 left-0 right-0 bottom-0  flex items-center justify-center z-35 p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full my-8">
        <div className="sticky top-0 bg-gradient-to-r from-green-600 to-green-700 text-white px-8 py-6 flex justify-between items-center rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold">Carga Masiva de CVs con IA</h2>
            <p className="text-green-100 text-sm mt-1">Analiza múltiples CVs automáticamente y crea candidatos</p>
          </div>
          <button
            onClick={handleClose}
            className="text-white hover:bg-green-800 rounded-full w-10 h-10 flex items-center justify-center transition"
            disabled={loading || isAsyncProcessing}
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        <div className="p-8">
          {!results ? (
            <form onSubmit={handleSubmit}>
              {/* Profile Selection */}
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">
                  <i className="fas fa-briefcase mr-2 text-green-600"></i>
                  Perfil / Vacante (Opcional)
                </label>
                {loadingProfiles ? (
                  <div className="flex items-center justify-center py-4">
                    <i className="fas fa-spinner fa-spin text-green-600 mr-2"></i>
                    <span className="text-gray-600">Cargando perfiles...</span>
                  </div>
                ) : (
                  <select
                    value={selectedProfile}
                    onChange={(e) => setSelectedProfile(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    disabled={loading || isAsyncProcessing}
                  >
                    <option value="">Sin asignar a perfil (solo crear candidatos)</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        {profile.position_title} {profile.client_name ? `- ${profile.client_name}` : ''}
                      </option>
                    ))}
                  </select>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  Si seleccionas un perfil, se calculará el matching automáticamente
                </p>
              </div>

              {/* File Upload */}
              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">
                  <i className="fas fa-file-upload mr-2 text-green-600"></i>
                  Archivos CV (PDF o DOCX)
                </label>
                <div className="border-2 border-dashed border-green-300 rounded-lg p-8 text-center bg-green-50 hover:bg-green-100 transition">
                  <i className="fas fa-cloud-upload-alt text-5xl text-green-600 mb-4"></i>
                  <p className="text-gray-700 font-semibold mb-2">
                    Arrastra archivos aquí o haz clic para seleccionar
                  </p>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.docx"
                    onChange={handleFilesChange}
                    className="hidden"
                    id="cv-files-input"
                    disabled={loading || isAsyncProcessing}
                  />
                  <label
                    htmlFor="cv-files-input"
                    className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg cursor-pointer hover:bg-green-700 transition"
                  >
                    Seleccionar CVs
                  </label>
                  <p className="text-sm text-gray-500 mt-3">
                    Máximo 50 archivos | 10MB por archivo | Formatos: PDF, DOCX
                  </p>
                </div>

                {cvFiles.length > 0 && (
                  <div className="mt-4">
                    <p className="font-semibold text-gray-700 mb-2">
                      <i className="fas fa-check-circle text-green-600 mr-2"></i>
                      {cvFiles.length} archivo(s) seleccionado(s):
                    </p>
                    <div className="max-h-40 overflow-y-auto bg-gray-50 rounded-lg p-4">
                      <ul className="space-y-1">
                        {cvFiles.map((file, index) => (
                          <li key={index} className="text-sm text-gray-600 flex items-center">
                            <i className="fas fa-file-pdf text-red-500 mr-2"></i>
                            {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <i className="fas fa-robot text-green-500 text-xl"></i>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">
                      <strong>¿Cómo funciona?</strong>
                    </p>
                    <ul className="list-disc list-inside text-sm text-green-600 mt-2 space-y-1">
                      <li>Claude AI extrae automáticamente toda la información de cada CV</li>
                      <li>Crea candidatos completos con experiencia, educación y habilidades</li>
                      <li>Si asignas un perfil, calcula el matching con IA</li>
                      <li>Procesa ≤3 CVs inmediatamente, 3 en segundo plano</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Progress */}
              {uploadProgress && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-blue-800 whitespace-pre-line">{uploadProgress}</p>
                  {(loading || isAsyncProcessing) && (
                    <div className="mt-3">
                      <div className="w-full bg-blue-200 rounded-full h-2">
                        <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition"
                  disabled={loading || isAsyncProcessing}
                >
                  {loading || isAsyncProcessing ? 'Procesando...' : 'Cancelar'}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 font-semibold shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={loading || isAsyncProcessing || cvFiles.length === 0}
                >
                  {loading || isAsyncProcessing ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2"></i>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-rocket mr-2"></i>
                      Procesar {cvFiles.length} CV(s) con IA
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Results View - Enhanced */
            <div>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <div className="bg-green-50 rounded-xl p-4 text-center border border-green-200">
                  <div className="text-2xl font-bold text-green-700">{results.filter(r => r.success).length}</div>
                  <div className="text-xs text-green-600 font-medium">Exitosos</div>
                </div>
                <div className="bg-red-50 rounded-xl p-4 text-center border border-red-200">
                  <div className="text-2xl font-bold text-red-700">{results.filter(r => !r.success).length}</div>
                  <div className="text-xs text-red-600 font-medium">Fallidos</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-200">
                  <div className="text-2xl font-bold text-blue-700">{results.filter(r => r.created).length}</div>
                  <div className="text-xs text-blue-600 font-medium">Nuevos Candidatos</div>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 text-center border border-purple-200">
                  <div className="text-2xl font-bold text-purple-700">
                    {results.filter(r => r.matching_score != null && r.matching_score > 0).length}
                  </div>
                  <div className="text-xs text-purple-600 font-medium">Con Matching</div>
                </div>
              </div>

              <h3 className="text-lg font-bold text-gray-900 mb-3">
                <i className="fas fa-list-check text-green-600 mr-2"></i>
                Detalle por CV
              </h3>

              <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-1">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`rounded-xl border shadow-sm overflow-hidden ${
                      result.success
                        ? 'bg-white border-green-200'
                        : 'bg-red-50 border-red-300'
                    }`}
                  >
                    {/* Header */}
                    <div className={`px-4 py-3 flex items-center justify-between ${
                      result.success ? 'bg-green-50' : 'bg-red-100'
                    }`}>
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <i className="fas fa-check-circle text-green-600"></i>
                        ) : (
                          <i className="fas fa-times-circle text-red-600"></i>
                        )}
                        <span className="font-semibold text-gray-900 text-sm">{result.filename}</span>
                        {result.created !== undefined && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            result.created
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}>
                            {result.created ? 'Nuevo' : 'Actualizado'}
                          </span>
                        )}
                      </div>
                      {result.analysis_method && (
                        <span className={`text-xs px-2 py-1 rounded-lg font-medium ${
                          result.analysis_method === 'claude_ai'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {result.analysis_method === 'claude_ai' ? 'Claude AI' : 'Reglas+OCR'}
                          {result.confidence_score ? ` ${result.confidence_score}%` : ''}
                        </span>
                      )}
                    </div>

                    {result.success ? (
                      <div className="px-4 py-3">
                        {/* Candidate Info */}
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-700 mb-2">
                          <span>
                            <i className="fas fa-user text-gray-400 mr-1"></i>
                            <strong>{result.candidate_name || 'N/A'}</strong>
                          </span>
                          {result.candidate_email && (
                            <span>
                              <i className="fas fa-envelope text-gray-400 mr-1"></i>
                              {result.candidate_email}
                            </span>
                          )}
                          {result.processing_time !== undefined && (
                            <span className="text-gray-400 text-xs">
                              <i className="fas fa-clock mr-1"></i>
                              {result.processing_time.toFixed(1)}s
                            </span>
                          )}
                        </div>

                        {/* Matching Score */}
                        {result.matching_score != null && result.matching_score > 0 && (
                          <div className="mt-2 p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-blue-100">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-sm font-semibold text-gray-700">
                                <i className="fas fa-chart-bar text-blue-500 mr-1"></i>
                                Matching:
                              </span>
                              <span className={`text-lg font-bold ${
                                result.matching_score >= 80 ? 'text-green-600' :
                                result.matching_score >= 60 ? 'text-yellow-600' :
                                result.matching_score >= 40 ? 'text-orange-600' :
                                'text-red-600'
                              }`}>
                                {result.matching_score}%
                              </span>
                              <div className="flex-1">
                                <div className="w-full bg-gray-200 rounded-full h-2.5">
                                  <div
                                    className={`h-2.5 rounded-full transition-all ${
                                      result.matching_score >= 80 ? 'bg-green-500' :
                                      result.matching_score >= 60 ? 'bg-yellow-500' :
                                      result.matching_score >= 40 ? 'bg-orange-500' :
                                      'bg-red-500'
                                    }`}
                                    style={{ width: `${result.matching_score}%` }}
                                  ></div>
                                </div>
                              </div>
                            </div>
                            {result.matching_details && (
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                <div className="text-center">
                                  <div className="font-bold text-blue-700">{result.matching_details.technical}%</div>
                                  <div className="text-gray-500">Técnico</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-bold text-purple-700">{result.matching_details.experience}%</div>
                                  <div className="text-gray-500">Experiencia</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-bold text-teal-700">{result.matching_details.education}%</div>
                                  <div className="text-gray-500">Educación</div>
                                </div>
                                <div className="text-center">
                                  <div className="font-bold text-indigo-700">{result.matching_details.overall}%</div>
                                  <div className="text-gray-500">General</div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Summary */}
                        {result.summary && (
                          <p className="text-xs text-gray-600 mt-2 italic line-clamp-2">
                            <i className="fas fa-quote-left text-gray-300 mr-1"></i>
                            {result.summary}
                          </p>
                        )}

                        {/* Strengths + Positions */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {result.strengths?.map((s, i) => (
                            <span key={`s-${i}`} className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                              {s}
                            </span>
                          ))}
                          {result.recommended_positions?.map((p, i) => (
                            <span key={`p-${i}`} className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-3">
                        <p className="text-sm text-red-700">
                          <i className="fas fa-exclamation-triangle mr-1"></i>
                          {result.error}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {results.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <i className="fas fa-inbox text-4xl mb-3"></i>
                  <p>No se obtuvieron resultados del procesamiento</p>
                </div>
              )}

              <div className="mt-6 flex gap-4">
                <button
                  onClick={() => { setResults(null); setCvFiles([]); }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold transition"
                >
                  <i className="fas fa-redo mr-2"></i>
                  Cargar más CVs
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 font-semibold shadow-lg transition"
                >
                  <i className="fas fa-check mr-2"></i>
                  Finalizar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

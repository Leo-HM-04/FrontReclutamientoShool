"use client";

import { useState, useEffect } from "react";
import { useModal } from '@/context/ModalContext';
import { apiClient } from "@/lib/api";

interface ApplicationFormData {
  candidato: string;
  perfil: string;
  estadoAplicacion: string;
  fechaAplicacion: string;
  porcentajeCoincidencia: string;
  calificacionGeneral: string;
  notas: string;
  fechaEntrevista: string;
  horaEntrevista: string;
  fechaOferta: string;
  horaOferta: string;
  razonRechazo: string;
}

interface ApplicationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ApplicationFormData) => void;
  onSuccess?: (message: string) => void;
}

interface Candidate {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
}

interface Profile {
  id: number;
  position_title: string;
  client_name?: string;
}

export default function ApplicationFormModal({ 
  isOpen, 
  onClose, 
  onSubmit,
  onSuccess 
}: ApplicationFormModalProps) {
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const { showAlert } = useModal();
  
  const [formData, setFormData] = useState<ApplicationFormData>({
    candidato: '',
    perfil: '',
    estadoAplicacion: 'Aplicó',
    fechaAplicacion: '',
    porcentajeCoincidencia: '',
    calificacionGeneral: '',
    notas: '',
    fechaEntrevista: '',
    horaEntrevista: '',
    fechaOferta: '',
    horaOferta: '',
    razonRechazo: ''
  });

  // Cargar candidatos y perfiles al abrir el modal
  useEffect(() => {
    if (isOpen) {
      loadInitialData();
    }
  }, [isOpen]);

  const loadInitialData = async () => {
    setLoadingData(true);
    try {
      console.log('📥 Cargando candidatos y perfiles...');
      
      // Cargar candidatos y perfiles en paralelo
      const [candidatesResponse, profilesResponse] = await Promise.all([
        apiClient.getCandidates({ ordering: '-created_at' }),
        apiClient.getProfiles({ ordering: '-created_at' }) // Sin filtro de status
      ]);

      console.log('📦 Respuesta completa de candidatos:', candidatesResponse);
      console.log('📦 Respuesta completa de perfiles:', profilesResponse);

      const candidatesList = (candidatesResponse as any).results || (candidatesResponse as any).data || (Array.isArray(candidatesResponse) ? candidatesResponse : []);
      const profilesList = (profilesResponse as any).results || (profilesResponse as any).data || (Array.isArray(profilesResponse) ? profilesResponse : []);
      
      console.log('✅ Candidatos cargados:', candidatesList.length);
      console.log('📋 Lista de candidatos:', candidatesList);
      console.log('✅ Perfiles cargados:', profilesList.length);
      console.log('📋 Lista de perfiles:', profilesList);
      
      setCandidates(candidatesList);
      setProfiles(profilesList);
    } catch (error: any) {
      console.error('❌ Error al cargar datos:', error);
      console.error('📋 Detalles del error:', error.details);
      if (onSuccess) {
        onSuccess(`⚠️ Error al cargar datos: ${error.message || 'Error desconocido'}`);
      }
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Mapear estados del formulario a los estados del backend
      const statusMap: Record<string, string> = {
        'Aplicó': 'applied',
        'Preseleccionado': 'shortlisted',
        'Entrevista': 'interview_scheduled',
        'Oferta': 'offered',
        'Contratado': 'accepted',
        'Rechazado': 'rejected'
      };

      // Combinar fecha y hora para interview_date y offer_date
      let interviewDate = null;
      if (formData.fechaEntrevista && formData.horaEntrevista) {
        interviewDate = `${formData.fechaEntrevista}T${formData.horaEntrevista}:00`;
      }

      let offerDate = null;
      if (formData.fechaOferta && formData.horaOferta) {
        offerDate = `${formData.fechaOferta}T${formData.horaOferta}:00`;
      }

      // Preparar datos para enviar al backend
      const applicationData = {
        candidate: formData.candidato,
        profile: formData.perfil,
        status: statusMap[formData.estadoAplicacion] || 'applied',
        match_percentage: formData.porcentajeCoincidencia ? parseInt(formData.porcentajeCoincidencia) : null,
        overall_rating: formData.calificacionGeneral ? parseFloat(formData.calificacionGeneral) : null,
        notes: formData.notas,
        rejection_reason: formData.razonRechazo,
        interview_date: interviewDate,
        offer_date: offerDate,
      };

      // Crear la aplicación en el backend
      const response = await apiClient.createCandidateApplication(applicationData);
      
      console.log('Aplicación creada:', response);
      
      if (onSuccess) {
        onSuccess("✅ Aplicación creada exitosamente en la base de datos");
      }
      
      onSubmit(formData);
      onClose();
      
      // Resetear formulario
      setShowRejectReason(false);
      setFormData({
        candidato: '',
        perfil: '',
        estadoAplicacion: 'Aplicó',
        fechaAplicacion: '',
        porcentajeCoincidencia: '',
        calificacionGeneral: '',
        notas: '',
        fechaEntrevista: '',
        horaEntrevista: '',
        fechaOferta: '',
        horaOferta: '',
        razonRechazo: ''
      });
      
    } catch (error: any) {
      console.error('Error al crear aplicación:', error);
      if (onSuccess) {
        onSuccess(`❌ Error: ${error.message || 'No se pudo crear la aplicación'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0  flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden">
        {/* Header mejorado - Degradado azul suave con texto oscuro */}
        <div className="bg-gradient-to-r from-blue-50 via-blue-100 to-indigo-50 px-6 py-5 shadow-lg border-b-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 p-4 rounded-xl shadow-lg">
                <i className="fas fa-user-plus text-3xl text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  Agregar Aplicación de Candidato
                </h2>
                <p className="text-gray-600 text-sm mt-1 font-semibold">
                  Registrar candidato en proceso de selección
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white bg-red-500 hover:bg-red-600 p-3 rounded-lg transition-all duration-200 group shadow-lg"
              title="Cerrar"
            >
              <i className="fas fa-times text-xl group-hover:rotate-90 transition-transform duration-200" />
            </button>
          </div>
        </div>

        <div className="p-6 bg-gray-50 overflow-y-auto max-h-[calc(95vh-100px)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Sección 1: Aplicación */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-blue-500/10 border-b-2 border-blue-500 px-5 py-3.5">
                <h3 className="text-lg font-bold text-blue-800 tracking-wide flex items-center">
                  <i className="fas fa-file-alt mr-2" />
                  APLICACIÓN
                </h3>
              </div>
              
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Campo Candidato */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-user text-blue-500 mr-1.5" />
                      Candidato <span className="text-red-500">*</span>
                    </label>
                    <div className="flex rounded-lg border-2 border-gray-300 focus-within:border-blue-500 transition-colors overflow-hidden shadow-sm">
                      <select
                        value={formData.candidato}
                        onChange={(e) => setFormData({...formData, candidato: e.target.value})}
                        className="flex-1 px-3 py-2.5 focus:outline-none bg-white text-gray-800"
                        required
                        disabled={loadingData}
                      >
                        <option value="">
                          {loadingData ? 'Cargando candidatos...' : 'Seleccionar candidato...'}
                        </option>
                        {candidates.map((candidate) => (
                          <option key={candidate.id} value={candidate.id}>
                            {candidate.full_name || `${candidate.first_name} ${candidate.last_name}`} - {candidate.email}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="px-3 bg-green-500 text-white hover:bg-green-600 transition-colors"
                        title="Agregar nuevo candidato"
                        onClick={async () => await showAlert('Función de agregar candidato próximamente')}
                      >
                        <i className="fas fa-plus" />
                      </button>
                    </div>
                  </div>

                  {/* Campo Perfil */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-briefcase text-blue-500 mr-1.5" />
                      Perfil <span className="text-red-500">*</span>
                    </label>
                    <div className="flex rounded-lg border-2 border-gray-300 focus-within:border-blue-500 transition-colors overflow-hidden shadow-sm">
                      <select
                        value={formData.perfil}
                        onChange={(e) => setFormData({...formData, perfil: e.target.value})}
                        className="flex-1 px-3 py-2.5 focus:outline-none bg-white text-gray-800"
                        required
                        disabled={loadingData}
                      >
                        <option value="">
                          {loadingData ? 'Cargando perfiles...' : 'Seleccionar perfil...'}
                        </option>
                        {profiles.map((profile) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.position_title}
                            {profile.client_name ? ` - ${profile.client_name}` : ''}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="px-3 bg-green-500 text-white hover:bg-green-600 transition-colors"
                        title="Agregar nuevo perfil"
                        onClick={async () => await showAlert('Función de agregar perfil próximamente')}
                      >
                        <i className="fas fa-plus" />
                      </button>
                    </div>
                  </div>

                  {/* Campo Estado */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-flag text-blue-500 mr-1.5" />
                      Estado de la Aplicación
                    </label>
                    <select
                      value={formData.estadoAplicacion}
                      onChange={(e) => {
                        setFormData({...formData, estadoAplicacion: e.target.value});
                        if (e.target.value === 'Rechazado') {
                          setShowRejectReason(true);
                        }
                      }}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none bg-white text-gray-800 shadow-sm transition-colors"
                    >
                      <option value="Aplicó">🔄 Aplicó</option>
                      <option value="Preseleccionado">⭐ Preseleccionado</option>
                      <option value="Entrevista">🎯 Entrevista</option>
                      <option value="Oferta">💼 Oferta</option>
                      <option value="Contratado">✅ Contratado</option>
                      <option value="Rechazado">❌ Rechazado</option>
                    </select>
                  </div>

                  {/* Campo Fecha */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-calendar text-blue-500 mr-1.5" />
                      Fecha de Aplicación
                    </label>
                    <input
                      type="date"
                      value={formData.fechaAplicacion}
                      onChange={(e) => setFormData({...formData, fechaAplicacion: e.target.value})}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none text-gray-800 shadow-sm transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 2: Evaluación */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-purple-500/10 border-b-2 border-purple-500 px-5 py-3.5">
                <h3 className="text-lg font-bold text-purple-800 tracking-wide flex items-center">
                  <i className="fas fa-star mr-2" />
                  EVALUACIÓN
                </h3>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Campo Porcentaje */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-percentage text-purple-500 mr-1.5" />
                      % de Coincidencia
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.porcentajeCoincidencia}
                        onChange={(e) => setFormData({...formData, porcentajeCoincidencia: e.target.value})}
                        className="w-full px-3 py-2.5 pr-10 rounded-lg border-2 border-gray-300 focus:border-purple-500 focus:outline-none text-gray-800 shadow-sm transition-colors"
                        placeholder="85"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-purple-600 font-semibold">%</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5 flex items-center">
                      <i className="fas fa-info-circle mr-1" />
                      Rango: 0-100
                    </p>
                  </div>

                  {/* Campo Calificación */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-star text-purple-500 mr-1.5" />
                      Calificación General
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={formData.calificacionGeneral}
                        onChange={(e) => setFormData({...formData, calificacionGeneral: e.target.value})}
                        className="w-full px-3 py-2.5 pr-10 rounded-lg border-2 border-gray-300 focus:border-purple-500 focus:outline-none text-gray-800 shadow-sm transition-colors"
                        placeholder="4.5"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <span className="text-purple-600 font-semibold">★</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5 flex items-center">
                      <i className="fas fa-info-circle mr-1" />
                      Rango: 0.0 - 5.0
                    </p>
                  </div>

                  {/* Campo Notas */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-comment-alt text-purple-500 mr-1.5" />
                      Notas y Comentarios
                    </label>
                    <textarea
                      value={formData.notas}
                      onChange={(e) => setFormData({...formData, notas: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-purple-500 focus:outline-none resize-none text-gray-800 shadow-sm transition-colors"
                      placeholder="Agregar observaciones, puntos fuertes, áreas de mejora..."
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 3: Fechas */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-emerald-500/10 border-b-2 border-emerald-500 px-5 py-3.5">
                <h3 className="text-lg font-bold text-emerald-800 tracking-wide flex items-center">
                  <i className="fas fa-calendar-alt mr-2" />
                  FECHAS
                </h3>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Sección Entrevista */}
                  <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-200">
                    <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-emerald-200">
                      <div className="bg-emerald-500 p-2 rounded-lg">
                        <i className="fas fa-comments text-white text-sm" />
                      </div>
                      <h4 className="text-base font-bold text-gray-800">Entrevista</h4>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Fecha Entrevista */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          <i className="fas fa-calendar text-emerald-600 mr-1" />
                          Fecha:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={formData.fechaEntrevista}
                            onChange={(e) => setFormData({...formData, fechaEntrevista: e.target.value})}
                            className="flex-1 px-3 py-2 rounded-lg border-2 border-emerald-300 focus:border-emerald-500 focus:outline-none text-gray-800 shadow-sm transition-colors text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const today = new Date().toISOString().split('T')[0];
                              setFormData({...formData, fechaEntrevista: today});
                            }}
                            className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 transition-colors text-xs font-bold text-white rounded-lg"
                          >
                            Hoy
                          </button>
                        </div>
                      </div>
                      
                      {/* Hora Entrevista */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          <i className="fas fa-clock text-emerald-600 mr-1" />
                          Hora:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="time"
                            value={formData.horaEntrevista}
                            onChange={(e) => setFormData({...formData, horaEntrevista: e.target.value})}
                            className="flex-1 px-3 py-2 rounded-lg border-2 border-emerald-300 focus:border-emerald-500 focus:outline-none text-gray-800 shadow-sm transition-colors text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const now = new Date();
                              const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                              setFormData({...formData, horaEntrevista: currentTime});
                            }}
                            className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 transition-colors text-xs font-bold text-white rounded-lg"
                          >
                            Ahora
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sección Oferta */}
                  <div className="bg-blue-50/50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-blue-200">
                      <div className="bg-blue-500 p-2 rounded-lg">
                        <i className="fas fa-handshake text-white text-sm" />
                      </div>
                      <h4 className="text-base font-bold text-gray-800">Oferta Laboral</h4>
                    </div>
                    
                    <div className="space-y-3">
                      {/* Fecha Oferta */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          <i className="fas fa-calendar text-blue-600 mr-1" />
                          Fecha:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={formData.fechaOferta}
                            onChange={(e) => setFormData({...formData, fechaOferta: e.target.value})}
                            className="flex-1 px-3 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500 focus:outline-none text-gray-800 shadow-sm transition-colors text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const today = new Date().toISOString().split('T')[0];
                              setFormData({...formData, fechaOferta: today});
                            }}
                            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 transition-colors text-xs font-bold text-white rounded-lg"
                          >
                            Hoy
                          </button>
                        </div>
                      </div>
                      
                      {/* Hora Oferta */}
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                          <i className="fas fa-clock text-blue-600 mr-1" />
                          Hora:
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="time"
                            value={formData.horaOferta}
                            onChange={(e) => setFormData({...formData, horaOferta: e.target.value})}
                            className="flex-1 px-3 py-2 rounded-lg border-2 border-blue-300 focus:border-blue-500 focus:outline-none text-gray-800 shadow-sm transition-colors text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const now = new Date();
                              const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
                              setFormData({...formData, horaOferta: currentTime});
                            }}
                            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 transition-colors text-xs font-bold text-white rounded-lg"
                          >
                            Ahora
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección Razón de Rechazo - Más intuitiva */}
            {(formData.estadoAplicacion === 'Rechazado' || showRejectReason) && (
              <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden animate-fade-in">
                <div className="bg-red-500/10 border-b-2 border-red-500 px-5 py-3.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="bg-red-500 p-2 rounded-lg">
                        <i className="fas fa-exclamation-triangle text-white text-lg" />
                      </div>
                      <h3 className="text-lg font-bold text-red-800 tracking-wide">RAZÓN DE RECHAZO</h3>
                    </div>
                    {formData.estadoAplicacion !== 'Rechazado' && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowRejectReason(false);
                          setFormData({...formData, razonRechazo: ''});
                        }}
                        className="bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-lg text-sm font-bold text-white transition-all"
                      >
                        <i className="fas fa-times mr-1 text-white" />
                        Cancelar Rechazo
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-5 bg-white">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    <i className="fas fa-comment-dots text-red-500 mr-2" />
                    Motivo del rechazo <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={formData.razonRechazo}
                    onChange={(e) => setFormData({...formData, razonRechazo: e.target.value})}
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg border-2 border-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 focus:outline-none resize-none text-gray-800 shadow-sm transition-all"
                    placeholder="Describe detalladamente las razones por las cuales se rechaza al candidato (experiencia insuficiente, expectativas salariales, competencias técnicas, etc.)..."
                    required={formData.estadoAplicacion === 'Rechazado' || showRejectReason}
                  />
                  <p className="text-xs text-gray-500 mt-2 flex items-center">
                    <i className="fas fa-info-circle text-red-500 mr-1.5" />
                    Este campo es obligatorio cuando se marca al candidato como rechazado
                  </p>
                </div>
              </div>
            )}

            {/* Botones de acción */}
            <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 p-4 -mx-6 -mb-6 shadow-lg">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                {/* Botón izquierda */}
                <div className="flex gap-2">
                  {formData.estadoAplicacion !== 'Rechazado' && !showRejectReason && (
                    <button
                      type="button"
                      onClick={() => setShowRejectReason(true)}
                      className="px-4 py-2 text-red-600 bg-white border-2 border-red-300 rounded-lg hover:bg-red-50 transition-all text-sm font-medium"
                    >
                      <i className="fas fa-ban mr-1.5" />
                      Rechazar
                    </button>
                  )}
                </div>
                
                {/* Botones derecha */}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={loading || loadingData}
                    className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-1.5" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-check-circle mr-1.5" />
                        Guardar Aplicación
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

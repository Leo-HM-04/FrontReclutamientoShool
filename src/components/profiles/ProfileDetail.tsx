"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useModal } from '@/context/ModalContext';
import { getProfile, approveProfile, changeProfileStatus } from "@/lib/api";
import AutoRecommendModal from "./AutoRecommendModal";

interface ProfileDetailProps {
  profileId: number;
  onBack?: () => void;
}

interface Profile {
  id: number;
  position_title: string;
  client: number;
  client_name?: string;
  status: string;
  priority: string;
  service_type: string;
  positions_available: number;
  responsibilities: string;
  requirements: string;
  benefits: string;
  min_age?: number;
  max_age?: number;
  education_level: string;
  years_experience: number;
  years_experience_required: number;            
  salary_min?: number;
  salary_max?: number;
  salary_currency: string;
  salary_period: string;
  location_city: string;              
  location_state: string;             
  is_remote: boolean;                 
  is_hybrid: boolean;                 
  modality: string;
  work_schedule: string;
  technical_skills: string[];
  soft_skills: string[];
  languages_required: string[];
  certifications_required: string[];
  deadline_date?: string;
  expected_start_date?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  internal_notes: string;
  ai_profile_text?: string;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  published_platforms?: string[];
}

export default function ProfileDetail({ profileId, onBack }: ProfileDetailProps) {
  const { showAlert } = useModal();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showAutoRecommendModal, setShowAutoRecommendModal] = useState(false);
  const [approvalFeedback, setApprovalFeedback] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");

  useEffect(() => {
    loadProfile();
  }, [profileId]);

 const loadProfile = async () => {
  setLoading(true);
  try {
    const profile = await getProfile(profileId);
    setProfile(profile);
  } catch (error) {
      console.error("Error loading profile:", error);
      await showAlert("Error al cargar el perfil");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approved: boolean) => {
    try {
      await approveProfile(profileId, {
        approved,
        feedback: approvalFeedback
      });
      await showAlert(approved ? "Perfil aprobado exitosamente" : "Perfil rechazado");
      setShowApprovalModal(false);
      loadProfile();
    } catch (error) {
      console.error("Error approving profile:", error);
      await showAlert("Error al procesar la aprobación");
    }
  };

  const handleChangeStatus = async () => {
    if (!newStatus) {
      await showAlert("Por favor seleccione un estado");
      return;
    }

    try {
      await changeProfileStatus(profileId, {
        status: newStatus,
        notes: statusNotes
      });
      await showAlert("Estado actualizado exitosamente");
      setShowStatusModal(false);
      setNewStatus("");
      setStatusNotes("");
      loadProfile();
    } catch (error) {
      console.error("Error changing status:", error);
      await showAlert("Error al cambiar el estado");
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { bg: string; text: string; label: string } } = {
      draft: { bg: "bg-gray-100", text: "text-gray-700", label: "Borrador" },
      pending: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pendiente" },
      approved: { bg: "bg-green-100", text: "text-green-700", label: "Aprobado" },
      in_progress: { bg: "bg-blue-100", text: "text-blue-700", label: "En Proceso" },
      candidates_found: { bg: "bg-indigo-100", text: "text-indigo-700", label: "Candidatos Encontrados" },
      in_evaluation: { bg: "bg-purple-100", text: "text-purple-700", label: "Aplicación de Pruebas" },
      in_interview: { bg: "bg-pink-100", text: "text-pink-700", label: "En Entrevista" },
      finalists: { bg: "bg-orange-100", text: "text-orange-700", label: "Finalistas" },
      completed: { bg: "bg-green-100", text: "text-green-700", label: "Completado" },
      cancelled: { bg: "bg-red-100", text: "text-red-700", label: "Cancelado" },
    };

    const config = statusConfig[status] || statusConfig.draft;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig: { [key: string]: { bg: string; text: string; label: string } } = {
      urgent: { bg: "bg-red-100", text: "text-red-700", label: "Urgente" },
      high: { bg: "bg-orange-100", text: "text-orange-700", label: "Alta" },
      medium: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Media" },
      low: { bg: "bg-green-100", text: "text-green-700", label: "Baja" },
    };

    const config = priorityConfig[priority] || priorityConfig.medium;
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (loading || !profile) {
    return (
      <div className="flex justify-center items-center py-12">
        <i className="fas fa-spinner fa-spin text-4xl text-orange-600"></i>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <i className="fas fa-arrow-left"></i>
              </button>
            )}
            <div>
              <h3 className="text-2xl font-bold text-gray-900">{profile.position_title}</h3>
              <p className="text-gray-600">ID: #{profile.id}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getStatusBadge(profile.status)}
            {getPriorityBadge(profile.priority)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowStatusModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <i className="fas fa-edit mr-2"></i>
            Cambiar Estado
          </button>
          
          {profile.status === "pending" && (
            <button
              onClick={() => setShowApprovalModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <i className="fas fa-check mr-2"></i>
              Aprobar/Rechazar
            </button>
          )}
          
          <button
            onClick={() => setShowAutoRecommendModal(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 shadow-md"
          >
            <i className="fas fa-magic mr-2"></i>
            Recomendación Automática
          </button>
          
          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
            <i className="fas fa-users mr-2"></i>
            Ver Candidatos
          </button>
          
          <button className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
            <i className="fas fa-file-alt mr-2"></i>
            Ver Documentos
          </button>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Información Básica */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <i className="fas fa-info-circle text-orange-600 mr-2"></i>
              Información Básica
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Cliente</p>
                <p className="font-medium">{profile.client_name || `Cliente #${profile.client}`}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Posiciones Disponibles</p>
                <p className="font-medium">{profile.positions_available}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Tipo de Servicio</p>
                <p className="font-medium">
                  {profile.service_type === "normal" ? "Normal" : "Especializado"}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Asignado a</p>
                <p className="font-medium">{profile.assigned_to_name || "Sin asignar"}</p>
              </div>
              {/* Plataformas de Publicación - AL FINAL */}
              {profile.published_platforms && profile.published_platforms.length > 0 && (
                <div className="pt-3 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    <i className="fas fa-globe text-orange-600 mr-1"></i>
                    Plataformas de Publicación
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profile.published_platforms.map((platform: string, index: number) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-600 text-white"
                      >
                        <i className="fas fa-check-circle mr-1"></i>
                        {platform}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          

          {/* Descripción */}
          {profile.responsibilities && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <i className="fas fa-tasks text-orange-600 mr-2"></i>
                Responsabilidades
              </h4>
              <p className="text-gray-700 whitespace-pre-line">{profile.responsibilities}</p>
            </div>
          )}

          {profile.requirements && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <i className="fas fa-clipboard-check text-orange-600 mr-2"></i>
                Requisitos
              </h4>
              <p className="text-gray-700 whitespace-pre-line">{profile.requirements}</p>
            </div>
          )}

          {profile.benefits && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                <i className="fas fa-gift text-orange-600 mr-2"></i>
                Beneficios
              </h4>
              <p className="text-gray-700 whitespace-pre-line">{profile.benefits}</p>
            </div>
          )}

          {/* Habilidades */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <i className="fas fa-brain text-orange-600 mr-2"></i>
              Habilidades y Competencias
            </h4>
            
            {profile.technical_skills && profile.technical_skills.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Habilidades Técnicas:</p>
                <div className="flex flex-wrap gap-2">
                  {profile.technical_skills.map((skill, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.soft_skills && profile.soft_skills.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Habilidades Blandas:</p>
                <div className="flex flex-wrap gap-2">
                  {profile.soft_skills.map((skill, idx) => (
                    <span key={idx} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.languages_required && profile.languages_required.length > 0 && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Idiomas:</p>
                <div className="flex flex-wrap gap-2">
                  {profile.languages_required.map((lang, idx) => (
                    <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                      {lang}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {profile.certifications_required && profile.certifications_required.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Certificaciones:</p>
                <div className="flex flex-wrap gap-2">
                  {profile.certifications_required.map((cert, idx) => (
                    <span key={idx} className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Requisitos */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Requisitos</h4>
            <div className="space-y-3">
              {(profile.min_age || profile.max_age) && (
                <div>
                  <p className="text-sm text-gray-500">Edad</p>
                  <p className="font-medium">
                    {profile.min_age && profile.max_age
                      ? `${profile.min_age} - ${profile.max_age} años`
                      : profile.min_age
                      ? `${profile.min_age}+ años`
                      : `Hasta ${profile.max_age} años`}
                  </p>
                </div>
              )}
              {profile.education_level && (
                <div>
                  <p className="text-sm text-gray-500">Educación</p>
                  <p className="font-medium capitalize">{profile.education_level}</p>
                </div>
              )}
              {profile.years_experience_required !== null && (
                <div>
                  <p className="text-sm text-gray-500">Experiencia</p>
                  <p className="font-medium">{profile.years_experience} años</p>
                </div>
              )}
            </div>
          </div>

          {/* Salario */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Salario</h4>
            <div className="space-y-2">
              <p className="text-2xl font-bold text-gray-900">
                ${profile.salary_min?.toLocaleString()} - ${profile.salary_max?.toLocaleString()}
              </p>
              <p className="text-sm text-gray-500">
                {profile.salary_currency} / {profile.salary_period}
              </p>
            </div>
          </div>

          {/* Ubicación */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Ubicación</h4>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Lugar</p>
                <p className="font-medium">{profile.location_city}, {profile.location_state}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Modalidad</p>
                <p className="font-medium capitalize">{profile.is_remote ? 'Remoto' : profile.is_hybrid ? 'Híbrido' : 'Presencial'}</p>
              </div>
              {profile.work_schedule && (
                <div>
                  <p className="text-sm text-gray-500">Horario</p>
                  <p className="font-medium">{profile.work_schedule}</p>
                </div>
              )}
            </div>
          </div>

          {/* Fechas */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h4 className="text-lg font-semibold text-gray-900 mb-4">Fechas</h4>
            <div className="space-y-3">
              {profile.deadline_date && (
                <div>
                  <p className="text-sm text-gray-500">Fecha Límite</p>
                  <p className="font-medium">
                    {new Date(profile.deadline_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              {profile.expected_start_date && (
                <div>
                  <p className="text-sm text-gray-500">Inicio Esperado</p>
                  <p className="font-medium">
                    {new Date(profile.expected_start_date).toLocaleDateString()}
                  </p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-500">Creado</p>
                <p className="font-medium">
                  {new Date(profile.created_at).toLocaleDateString()}
                </p>
                {profile.created_by_name && (
                  <p className="text-xs text-gray-500">por {profile.created_by_name}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Approval Modal */}
      {showApprovalModal && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={() => setShowApprovalModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl flex flex-col"
            style={{ width: '95vw', height: '92vh', maxWidth: '700px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-5 flex justify-between items-center rounded-t-2xl">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <i className="fas fa-clipboard-check"></i>
                  Aprobar / Rechazar Perfil
                </h2>
                <p className="text-green-100 text-sm mt-1">Revisa y emite tu decisión sobre este perfil</p>
              </div>
              <button
                onClick={() => setShowApprovalModal(false)}
                className="text-white hover:bg-green-800 rounded-full w-10 h-10 flex items-center justify-center transition"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {/* Feedback */}
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <i className="fas fa-comment-dots text-gray-600"></i>
                  Retroalimentación
                </h3>
                <textarea
                  value={approvalFeedback}
                  onChange={(e) => setApprovalFeedback(e.target.value)}
                  rows={7}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  placeholder="Comentarios sobre la decisión..."
                />
              </div>

              {/* Info cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border border-green-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-green-200 flex items-center justify-center">
                      <i className="fas fa-check text-green-700"></i>
                    </div>
                    <span className="font-bold text-green-900">Aprobar</span>
                  </div>
                  <p className="text-xs text-green-800">El perfil es correcto y el proceso de reclutamiento puede continuar.</p>
                </div>
                <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-xl p-5 border border-red-200">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-9 h-9 rounded-full bg-red-200 flex items-center justify-center">
                      <i className="fas fa-times text-red-700"></i>
                    </div>
                    <span className="font-bold text-red-900">Rechazar</span>
                  </div>
                  <p className="text-xs text-red-800">El perfil regresará al equipo con tus comentarios para correcciones.</p>
                </div>
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex-shrink-0 px-8 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end gap-4">
              <button
                onClick={() => setShowApprovalModal(false)}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleApprove(false)}
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl hover:from-red-600 hover:to-rose-700 font-semibold shadow-lg transition flex items-center gap-2"
              >
                <i className="fas fa-times"></i>
                Rechazar Perfil
              </button>
              <button
                onClick={() => handleApprove(true)}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 font-semibold shadow-lg transition flex items-center gap-2"
              >
                <i className="fas fa-check"></i>
                Aprobar Perfil
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed top-16 left-0 right-0 bottom-0  flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold mb-4">Cambiar Estado</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nuevo Estado
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Seleccionar...</option>
                <option value="draft">Borrador</option>
                <option value="pending">Pendiente</option>
                <option value="approved">Aprobado</option>
                <option value="in_progress">En Proceso</option>
                <option value="candidates_found">Candidatos Encontrados</option>
                <option value="in_evaluation">Aplicación de Pruebas</option>
                <option value="in_interview">En Entrevista</option>
                <option value="finalists">Finalistas</option>
                <option value="completed">Completado</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas
              </label>
              <textarea
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="Notas sobre el cambio de estado..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowStatusModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleChangeStatus}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Auto Recommend Modal */}
      <AutoRecommendModal
        profileId={profileId}
        profileTitle={profile?.position_title || ""}
        isOpen={showAutoRecommendModal}
        onClose={() => setShowAutoRecommendModal(false)}
      />
    </div>
  );
}

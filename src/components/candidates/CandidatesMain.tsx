"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useModal } from '@/context/ModalContext';
import { apiClient } from "@/lib/api";
import CandidateDetail from "./CandidateDetail";
import CandidateForm from "./CandidateForm";
import NotesPostItView from "../NotesPostItView";
import CandidateNoteFormModal from "../CandidateNoteFormModal";
import ProfileDetail from "../profiles/ProfileDetail";
import ProfileForm from "../profiles/ProfileForm";
import ApplicationDetailView from "./ApplicationDetailView";
import UploadDocumentModal from "./UploadDocumentModal";
import ShareDocumentLinkModal from "@/components/ShareDocumentLinkModal";
import DocumentShareLinksDashboard from '@/components/DocumentShareLinksDashboard';
import Pagination from "../ui/Pagination";

type CandidateView = 
  | "candidates-list" 
  | "candidate-create"
  | "candidate-detail"
  | "applications" 
  | "application-detail"
  | "documents" 
  | "links"
  | "notes"
  | "history"
  | "statistics";

interface MenuItem {
  id: CandidateView;
  label: string;
  icon: string;
  description: string;
}

interface CandidatesMainProps {
  onClose?: () => void;
}

export default function CandidatesMain({ onClose }: CandidatesMainProps) {
  const { showAlert, showSuccess, showError, showConfirm } = useModal();
  const [currentView, setCurrentView] = useState<CandidateView>("candidates-list");
  const [selectedCandidateId, setSelectedCandidateId] = useState<number | null>(null);
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showShareLinkModal, setShowShareLinkModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  
  // Data states
  const [candidates, setCandidates] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  // Modal state
  const [showNoteModal, setShowNoteModal] = useState(false);
  
  // Filtros para candidates-list
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [applicationFilter, setApplicationFilter] = useState("all");
  const [selectedCandidates, setSelectedCandidates] = useState<Set<number>>(new Set());
  const [showBulkApplyModal, setShowBulkApplyModal] = useState(false);
  const [selectedProfileForBulkApply, setSelectedProfileForBulkApply] = useState<string>("");
  const [bulkApplyNotes, setBulkApplyNotes] = useState("");
  const [bulkApplying, setBulkApplying] = useState(false);
  
  // Pagination states
  const [candidatesPage, setCandidatesPage] = useState(1);
  const [candidatesPerPage, setCandidatesPerPage] = useState(10);
  const [applicationsPage, setApplicationsPage] = useState(1);
  const [applicationsPerPage, setApplicationsPerPage] = useState(10);
  const [documentsPage, setDocumentsPage] = useState(1);
  const [documentsPerPage, setDocumentsPerPage] = useState(10);
  const [documentsTab, setDocumentsTab] = useState<'documents'|'links'>('documents');
  const [notesPage, setNotesPage] = useState(1);
  const [notesPerPage, setNotesPerPage] = useState(12);
  
  // Lista de perfiles para el filtro
  const [profiles, setProfiles] = useState<any[]>([]);

  // Load data when view changes
  useEffect(() => {
    loadData();
  }, [currentView]);

  useEffect(() => {
    loadProfiles();
  }, []);

  const loadProfiles = async () => {
    try {
      const profilesData = await apiClient.getProfiles();
      setProfiles(profilesData as any[]);
    } catch (error) {
      console.error("Error loading profiles:", error);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      switch (currentView) {
        case "candidates-list":
          const candidatesData = await apiClient.getCandidates();
          setCandidates(candidatesData as any[]);
          break;
        case "applications":
          const applicationsData = await apiClient.getCandidateApplications();
          setApplications(applicationsData as any[]);
          break;
        case "documents":
          const documentsData = await apiClient.getCandidateDocuments();
          setDocuments(documentsData as any[]);
          break;
        case "notes":
          const notesData = await apiClient.getCandidateNotes();
          setNotes(notesData as any[]);
          break;
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCandidates = useMemo(() => {
    return candidates.filter(candidate => {
      const matchesSearch = searchTerm === "" ||
        `${candidate.first_name} ${candidate.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        candidate.email?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || candidate.latest_application_status === statusFilter;
      const matchesApplication = applicationFilter === "all" ||
        (candidate.candidate_profiles && candidate.candidate_profiles.some((app: any) => String(app.profile) === applicationFilter));

      return matchesSearch && matchesStatus && matchesApplication;
    });
  }, [candidates, searchTerm, statusFilter, applicationFilter]);

  useEffect(() => {
    // Mantener solo seleccionados que aún existan tras filtros/recargas
    setSelectedCandidates(prev => {
      const filteredIds = new Set(filteredCandidates.map((c) => c.id));
      const next = new Set<number>();
      prev.forEach((id) => {
        if (filteredIds.has(id)) next.add(id);
      });
      return next;
    });
  }, [filteredCandidates]);

  const handleSelectCandidate = (candidateId: number) => {
    setSelectedCandidates(prev => {
      const next = new Set(prev);
      if (next.has(candidateId)) {
        next.delete(candidateId);
      } else {
        next.add(candidateId);
      }
      return next;
    });
  };

  const handleSelectAllCandidates = () => {
    if (filteredCandidates.length > 0 && selectedCandidates.size === filteredCandidates.length) {
      setSelectedCandidates(new Set());
      return;
    }
    setSelectedCandidates(new Set(filteredCandidates.map((c) => c.id)));
  };

  const availableProfiles = useMemo(() => {
    const nonFinalStatuses = new Set(['completed', 'cancelled']);
    const filtered = profiles.filter((p: any) => !nonFinalStatuses.has(String(p.status || '').toLowerCase()));
    return filtered.length > 0 ? filtered : profiles;
  }, [profiles]);

  const handleBulkApplyToProfile = async () => {
    const profileId = selectedProfileForBulkApply;
    if (!profileId) {
      await showAlert('Selecciona una vacante para continuar.');
      return;
    }

    const candidateIds = Array.from(selectedCandidates);
    if (candidateIds.length === 0) {
      await showAlert('Selecciona al menos un candidato.');
      return;
    }

    try {
      setBulkApplying(true);
      const response: any = await apiClient.bulkAssignCandidatesToProfile({
        candidate_ids: candidateIds,
        profile_id: profileId,
        notes: bulkApplyNotes,
        skip_existing: true,
      });

      const createdCount = Number(response?.created_count || 0);
      const skippedCount = Array.isArray(response?.skipped_existing_candidate_ids)
        ? response.skipped_existing_candidate_ids.length
        : 0;
      const missingCount = Array.isArray(response?.missing_candidate_ids)
        ? response.missing_candidate_ids.length
        : 0;

      const message = `Aplicaciones creadas: ${createdCount}. Omitidos por ya existentes: ${skippedCount}. No encontrados: ${missingCount}.`;
      await showSuccess(message);

      setShowBulkApplyModal(false);
      setSelectedProfileForBulkApply("");
      setBulkApplyNotes("");
      setSelectedCandidates(new Set());
      await loadData();
    } catch (error) {
      console.error('Error en asignación masiva de candidatos:', error);
      await showError('No se pudo aplicar candidatos a la vacante seleccionada.');
    } finally {
      setBulkApplying(false);
    }
  };

  const handleViewCandidate = (candidateId: number) => {
    setSelectedCandidateId(candidateId);
    setCurrentView("candidate-detail");
  };

  const handleEditCandidate = (candidateId: number) => {
    setSelectedCandidateId(candidateId);
    setCurrentView("candidate-create");
  };

  const handleDeleteCandidate = async (candidateId: number) => {
    const confirmed = await showConfirm('¿Estás seguro de que deseas eliminar este candidato?');
    if (confirmed) {
      try {
        await apiClient.deleteCandidate(candidateId);
        await showSuccess('Candidato eliminado exitosamente');
        loadData();
      } catch (error) {
        console.error('Error deleting candidate:', error);
        await showError('Error al eliminar el candidato');
      }
    }
  };

  


  const handleBackToList = () => {
    setSelectedCandidateId(null);
    setCurrentView("candidates-list");
  };

  const handleViewProfile = (profileId: number, candidateId: number) => {
    setSelectedProfileId(profileId);
    setSelectedCandidateId(candidateId);
    setCurrentView("application-detail");
  };


  const getDocumentIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'fa-file-pdf';
    if (['doc', 'docx'].includes(ext || '')) return 'fa-file-word';
    if (['xls', 'xlsx'].includes(ext || '')) return 'fa-file-excel';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return 'fa-file-image';
    return 'fa-file-alt';
  };

  const getDocumentColor = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'pdf') return 'text-red-600';
    if (['doc', 'docx'].includes(ext || '')) return 'text-blue-600';
    if (['xls', 'xlsx'].includes(ext || '')) return 'text-green-600';
    if (['jpg', 'jpeg', 'png', 'gif'].includes(ext || '')) return 'text-purple-600';
    return 'text-gray-600';
  };

  const handleDeleteDocument = async (documentId: number) => {
    const confirmed = await showConfirm('¿Estás seguro de que deseas eliminar este documento?');
    if (!confirmed) return;
    
    try {
      await apiClient.deleteCandidateDocument(documentId);
      await loadData();
      await showSuccess('Documento eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting document:', error);
      await showError('Error al eliminar el documento');
    }
  };

  const menuItems: MenuItem[] = [
    {
      id: "candidates-list",
      label: "Ver Candidatos",
      icon: "fa-users",
      description: "Ver y gestionar todos los candidatos"
    },
    {
      id: "applications",
      label: "Aplicaciones",
      icon: "fa-briefcase",
      description: "Gestionar aplicaciones de candidatos"
    },
    {
      id: "documents",
      label: "Documentos",
      icon: "fa-folder-open",
      description: "CVs y documentos de candidatos"
    },
    {
      id: "links",
      label: "Links de Documentos",
      icon: "fa-link",
      description: "Enlaces públicos para entrega de documentos"
    },
    {
      id: "notes",
      label: "Notas",
      icon: "fa-sticky-note",
      description: "Notas y observaciones"
    },
    {
      id: "history",
      label: "Historial",
      icon: "fa-history",
      description: "Historial de cambios y actividad"
    }
  ];

  const getNavClass = (view: CandidateView) => {
    return currentView === view
      ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600"
      : "text-gray-700 hover:bg-gray-50 border-l-4 border-transparent";
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Gestión de Candidatos</h2>
            <p className="text-gray-600 mt-1">
              Sistema completo para gestionar candidatos y aplicaciones
            </p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="mt-4 sm:mt-0 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              <i className="fas fa-arrow-left mr-2"></i>
              Volver
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Menu */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Menú de Candidatos
            </h3>
            <nav className="space-y-1">
              {menuItems.map((item, index) => (
                <React.Fragment key={item.id}>
                  <button
                    onClick={() => {
                      setCurrentView(item.id);
                      setSelectedCandidateId(null);
                      // ensure documents tab is default when navigating to documents
                      if (item.id === 'documents') setDocumentsTab('documents');
                    }}
                    className={`w-full flex items-start px-3 py-3 text-sm font-medium rounded-lg transition-all ${getNavClass(
                      item.id
                    )}`}
                  >
                    <i className={`fas ${item.icon} mt-0.5 mr-3 w-5`}></i>
                    <div className="text-left">
                      <div>{item.label}</div>
                      <div className="text-xs text-gray-500 mt-0.5 font-normal">
                        {item.description}
                      </div>
                    </div>
                  </button>



                  {/* Botón Crear Nuevo Candidato después del primer item */}
                  {index === 0 && (
                    <button
                      onClick={() => setCurrentView("candidate-create")}
                      className={`w-full flex items-start px-3 py-3 text-sm font-medium rounded-lg transition-all ${getNavClass(
                        "candidate-create"
                      )}`}
                    >
                      <i className="fas fa-plus-circle mt-0.5 mr-3 w-5"></i>
                      <div className="text-left">
                        <div>Crear Nuevo Candidato</div>
                        <div className="text-xs text-gray-500 mt-0.5 font-normal">
                          Agregar un nuevo candidato
                        </div>
                      </div>
                    </button>
                  )}
                </React.Fragment>
              ))}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {/* CANDIDATE DETAIL */}
            {currentView === "candidate-detail" && selectedCandidateId && (
              <CandidateDetail 
                candidateId={selectedCandidateId} 
                onBack={handleBackToList}
              />
            )}

            {/* CANDIDATE CREATE/EDIT FORM */}
            {currentView === "candidate-create" && (
              <CandidateForm 
                candidateId={selectedCandidateId || undefined}
                onSuccess={() => {
                  handleBackToList();
                  loadData();
                }}
              />
            )}

            {/* APPLICATION DETAIL - CON PESTAÑAS */}
            {currentView === "application-detail" && selectedProfileId && selectedCandidateId && (
              <ApplicationDetailView 
                profileId={selectedProfileId}
                candidateId={selectedCandidateId}
                onBack={handleBackToList}
              />
            )}

            {/* CANDIDATES LIST */}
            {currentView === "candidates-list" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-2xl font-bold text-gray-900">Todos los Candidatos</h3>
                  <button 
                    onClick={loadData}
                    className="px-6 py-2.5 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium flex items-center gap-2"
                  >
                    <i className="fas fa-sync"></i>
                    Actualizar
                  </button>
                </div>

                {/* Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <i className="fas fa-search mr-2"></i>
                      Buscar
                    </label>
                    <input
                      type="text"
                      placeholder="Buscar por nombre o email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <i className="fas fa-filter mr-2"></i>
                      Estatus
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">Seleccionar estatus...</option>
                      <option value="applied">Aplicó</option>
                      <option value="screening">En Revisión</option>
                      <option value="shortlisted">Pre-seleccionado</option>
                      <option value="interview_scheduled">Entrevista Agendada</option>
                      <option value="interviewed">Entrevistado</option>
                      <option value="offered">Oferta Extendida</option>
                      <option value="accepted">Oferta Aceptada</option>
                      <option value="rejected">Rechazado</option>
                      <option value="withdrawn">Retirado</option>
                    </select>
                  </div>
                  <div>
                    <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
                      <i className="fas fa-briefcase mr-2"></i>
                      Aplicaciones
                    </label>
                    <select
                      value={applicationFilter}
                      onChange={(e) => setApplicationFilter(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">Todas las aplicaciones</option>
                      {profiles.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.position_title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Estadísticas */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-orange-50 rounded-lg p-4">
                    <h4 className="text-orange-900 font-semibold text-sm mb-1">Total Candidatos</h4>
                    <p className="text-3xl font-bold text-orange-900">
                      {candidates.length}
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-blue-900 font-semibold text-sm mb-1">Aplicados</h4>
                    <p className="text-3xl font-bold text-blue-900">
                      {candidates.filter(c => c.latest_application_status === 'applied').length}
                    </p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <h4 className="text-yellow-900 font-semibold text-sm mb-1">En Proceso</h4>
                    <p className="text-3xl font-bold text-yellow-900">
                      {candidates.filter(c => ['screening', 'shortlisted', 'interview_scheduled', 'interviewed'].includes(c.latest_application_status)).length}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="text-green-900 font-semibold text-sm mb-1">Ofertas</h4>
                    <p className="text-3xl font-bold text-green-900">
                      {candidates.filter(c => ['offered', 'accepted'].includes(c.latest_application_status)).length}
                    </p>
                  </div>
                </div>

                {/* Barra de selección */}
                {selectedCandidates.size > 0 && (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center justify-between mb-6">
                    <div className="flex items-center space-x-4">
                      <span className="text-sm font-medium text-blue-900">
                        {selectedCandidates.size} candidato(s) seleccionado(s)
                      </span>
                      <button
                        onClick={() => setSelectedCandidates(new Set())}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Limpiar selección
                      </button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setShowBulkApplyModal(true)}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        <i className="fas fa-briefcase mr-2" />
                        Aplicar a vacante
                      </button>
                    </div>
                  </div>
                )}
                
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Cargando candidatos...</p>
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <i className="fas fa-users text-5xl mb-4 text-gray-300"></i>
                    <p className="text-lg">No hay candidatos registrados</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left w-10">
                              <button
                                onClick={handleSelectAllCandidates}
                                className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110"
                                style={{
                                  borderColor: selectedCandidates.size === filteredCandidates.length && filteredCandidates.length > 0 ? '#3B82F6' : '#D1D5DB',
                                  backgroundColor: selectedCandidates.size === filteredCandidates.length && filteredCandidates.length > 0 ? '#3B82F6' : 'transparent',
                                }}
                                title="Seleccionar todos"
                              >
                                {selectedCandidates.size === filteredCandidates.length && filteredCandidates.length > 0 && (
                                  <i className="fas fa-check text-white text-[10px]" />
                                )}
                              </button>
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              NOMBRE
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              EMAIL
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              ESTATUS
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              POSICIÓN ACTUAL
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              VACANTE / POSICIÓN APLICADA
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              UBICACIÓN
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              EXPERIENCIA
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              TELÉFONO
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                              ACCIONES
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {(() => {
                            const startIndex = (candidatesPage - 1) * candidatesPerPage;
                            const paginatedCandidates = filteredCandidates.slice(startIndex, startIndex + candidatesPerPage);
                            return paginatedCandidates.map((candidate) => (
                            <tr
                              key={candidate.id}
                              className={`group cursor-pointer transition-all duration-200 ${
                                selectedCandidates.has(candidate.id)
                                  ? 'bg-blue-50/70 hover:bg-blue-100/70'
                                  : 'hover:bg-gray-50'
                              }`}
                              onClick={() => handleSelectCandidate(candidate.id)}
                              title={selectedCandidates.has(candidate.id) ? 'Click para deseleccionar' : 'Click para seleccionar'}
                            >
                              <td className="px-4 py-4">
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                                  selectedCandidates.has(candidate.id)
                                    ? 'border-blue-500 bg-blue-500 scale-110'
                                    : 'border-gray-300 group-hover:border-blue-400 group-hover:scale-105'
                                }`}>
                                  {selectedCandidates.has(candidate.id) ? (
                                    <i className="fas fa-check text-white text-[10px]" />
                                  ) : (
                                    <i className="fas fa-plus text-gray-400 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity" />
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="shrink-0 h-10 w-10">
                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold">
                                      {(candidate.first_name?.[0] || 'C').toUpperCase()}{(candidate.last_name?.[0] || '').toUpperCase()}
                                    </div>
                                  </div>
                                  <div className="ml-4">
                                    <div className="text-sm font-medium text-gray-900">
                                      {candidate.first_name} {candidate.last_name}
                                    </div>
                                    <div className="text-sm text-gray-500">
                                      {candidate.current_position || 'Sin posición'}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{candidate.email || '-'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  (candidate.latest_application_status === 'accepted' || candidate.latest_application_status === 'offered') ? 'bg-green-100 text-green-800' :
                                  candidate.latest_application_status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  candidate.latest_application_status === 'withdrawn' ? 'bg-gray-100 text-gray-800' :
                                  candidate.latest_application_status === 'screening' ? 'bg-yellow-100 text-yellow-800' :
                                  candidate.latest_application_status === 'shortlisted' ? 'bg-blue-100 text-blue-800' :
                                  (candidate.latest_application_status === 'interview_scheduled' || candidate.latest_application_status === 'interviewed') ? 'bg-purple-100 text-purple-800' :
                                  candidate.latest_application_status === 'applied' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {{
                                    applied: 'Aplicó',
                                    screening: 'En Revisión',
                                    shortlisted: 'Preseleccionado',
                                    interview_scheduled: 'Entrevista Programada',
                                    interviewed: 'Entrevistado',
                                    offered: 'Oferta Extendida',
                                    accepted: 'Oferta Aceptada',
                                    rejected: 'Rechazado',
                                    withdrawn: 'Retirado',
                                    new: 'Nuevo',
                                    qualified: 'Calificado',
                                    interview: 'En Entrevista',
                                    offer: 'Oferta Extendida',
                                    hired: 'Contratado',
                                  }[(candidate.latest_application_status || candidate.status || '') as string] || candidate.status_display || 'Nuevo'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {candidate.current_position || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {candidate.current_applied_position || 'Sin aplicación'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm text-gray-900">{candidate.city || '-'}</div>
                                <div className="text-sm text-gray-500">{candidate.state || '-'}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {candidate.years_of_experience || 0} años
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {candidate.phone || '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                <div className="flex items-center justify-center gap-3">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleViewCandidate(candidate.id); }}
                                    className="text-blue-600 hover:text-blue-900 transition-colors"
                                    title="Ver detalles"
                                  >
                                    <i className="fas fa-eye"></i>
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleEditCandidate(candidate.id); }}
                                    className="text-orange-600 hover:text-orange-900 transition-colors"
                                    title="Editar"
                                  >
                                    <i className="fas fa-edit"></i>
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeleteCandidate(candidate.id); }}
                                    className="text-red-600 hover:text-red-900 transition-colors"
                                    title="Eliminar"
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                    {/* Pagination for candidates */}
                    <Pagination
                      currentPage={candidatesPage}
                      totalItems={filteredCandidates.length}
                      itemsPerPage={candidatesPerPage}
                      onPageChange={setCandidatesPage}
                      onItemsPerPageChange={setCandidatesPerPage}
                      className="border-t border-gray-200 px-4"
                    />
                  </div>
                )}
              </div>
            )}

            {/* APPLICATIONS */}
            {currentView === "applications" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Aplicaciones</h3>
                  <button 
                    onClick={loadData}
                    className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <i className="fas fa-sync mr-2"></i>
                    Actualizar
                  </button>
                </div>
                
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Cargando aplicaciones...</p>
                  </div>
                ) : applications.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <i className="fas fa-briefcase text-5xl mb-4 text-gray-300"></i>
                    <p className="text-lg">No hay aplicaciones registradas</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidato</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Perfil</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estatus</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {applications
                            .slice((applicationsPage - 1) * applicationsPerPage, applicationsPage * applicationsPerPage)
                            .map((app) => (
                            <tr key={app.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-900">{app.candidate_name || `Candidato #${app.candidate}`}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{app.profile_title || `Perfil #${app.profile}`}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  app.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                  app.status === 'offered' ? 'bg-orange-100 text-orange-800' :
                                  app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  app.status === 'shortlisted' ? 'bg-blue-100 text-blue-800' :
                                  app.status === 'screening' ? 'bg-yellow-100 text-yellow-800' :
                                  app.status === 'interview_scheduled' ? 'bg-purple-100 text-purple-800' :
                                  app.status === 'interviewed' ? 'bg-indigo-100 text-indigo-800' :
                                  app.status === 'applied' ? 'bg-blue-100 text-blue-800' :
                                  app.status === 'withdrawn' ? 'bg-gray-100 text-gray-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {{
                                    applied: 'Aplicó',
                                    screening: 'En Revisión',
                                    shortlisted: 'Preseleccionado',
                                    interview_scheduled: 'Entrevista Programada',
                                    interviewed: 'Entrevistado',
                                    offered: 'Oferta Extendida',
                                    accepted: 'Oferta Aceptada',
                                    rejected: 'Rechazado',
                                    withdrawn: 'Retirado',
                                  }[(app.status || '') as string] || app.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {new Date(app.applied_at || app.created_at).toLocaleDateString('es-MX')}
                              </td>
                              <td className="px-4 py-3 text-right text-sm">
                                <button 
                                  onClick={() => handleViewProfile(app.profile, app.candidate)}
                                  className="text-blue-600 hover:text-blue-800 mr-3"
                                  title="Ver detalles"
                                >
                                  <i className="fas fa-eye"></i>
                                </button>
                                <button 
                                  className="text-green-600 hover:text-green-800"
                                  title="Editar"
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {/* Pagination for applications */}
                    <Pagination
                      currentPage={applicationsPage}
                      totalItems={applications.length}
                      itemsPerPage={applicationsPerPage}
                      onPageChange={setApplicationsPage}
                      onItemsPerPageChange={setApplicationsPerPage}
                      className="border-t border-gray-200 px-4"
                    />
                  </div>
                )}
              </div>
            )}

            {/* DOCUMENTS */}
            {currentView === "documents" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Documentos de Candidatos</h3>
                    {/* Small breadcrumb/context */}
                    <div className="mt-2 text-xs text-gray-500">
                      Candidatos / <span className="text-gray-700">Documentos</span>{documentsTab === 'links' && <span className="text-gray-400"> / Links de Documentos</span>}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    {documentsTab === 'documents' && (
                      <>
                        <button 
                          onClick={() => setShowUploadModal(true)}
                          className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center gap-2"
                        >
                          <i className="fas fa-upload"></i>
                          Subir Documento
                        </button>
                        <button 
                          onClick={loadData}
                          className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
                        >
                          <i className="fas fa-sync"></i>
                          Actualizar
                        </button>
                      </>
                    )}

                    {documentsTab === 'links' && (
                      <button 
                        onClick={() => setShowShareLinkModal(true)}
                        className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center gap-2"
                      >
                        <i className="fas fa-link"></i>
                        Crear Link
                      </button>
                    )}
                  </div>
                </div>
                
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="text-gray-500 mt-4">Cargando documentos...</p>
                  </div>
                ) : documents.length === 0 && documentsTab === 'documents' ? (
                  <div className="text-center py-12 text-gray-500">
                    <i className="fas fa-folder-open text-5xl mb-4 text-gray-300"></i>
                    <p className="text-lg">No hay documentos registrados</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidato</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {documents
                            .slice((documentsPage - 1) * documentsPerPage, documentsPage * documentsPerPage)
                            .map((doc: any) => (
                            <tr key={doc.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3">
                                <div className="flex items-center">
                                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-sm">
                                    {doc.candidate_name ? doc.candidate_name.charAt(0).toUpperCase() : 'C'}
                                  </div>
                                  <div className="ml-3">
                                    <div className="text-sm font-medium text-gray-900">
                                      {doc.candidate_name || `Candidato #${doc.candidate}`}
                                    </div>
                                    {doc.candidate_current_position && (
                                      <div className="text-xs text-gray-500">{doc.candidate_current_position}</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <i className={`fas ${getDocumentIcon(doc.original_filename || '')} ${getDocumentColor(doc.original_filename || '')} text-2xl`}></i>
                                  <div>
                                    <div className="text-sm font-semibold text-gray-900">
                                      {doc.original_filename || 'Documento sin nombre'}
                                    </div>
                                    {doc.description && (
                                      <div className="text-xs text-gray-500">{doc.description}</div>
                                    )}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                                  {doc.document_type || 'Otro'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500">
                                {new Date(doc.uploaded_at).toLocaleDateString('es-MX', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {doc.file_url && (
                                    <button
                                      onClick={() => window.open(doc.file_url, '_blank')}
                                      className="text-blue-600 hover:text-blue-800"
                                      title="Ver documento"
                                    >
                                      <i className="fas fa-eye"></i>
                                    </button>
                                  )}
                                  {doc.file_url && (
                                    <button
                                      onClick={() => {
                                        const link = document.createElement('a');
                                        link.href = doc.file_url;
                                        link.download = doc.original_filename || 'documento';
                                        link.click();
                                      }}
                                      className="text-green-600 hover:text-green-800"
                                      title="Descargar"
                                    >
                                      <i className="fas fa-download"></i>
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteDocument(doc.id)}
                                    className="text-red-600 hover:text-red-800"
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
                    {/* Pagination for documents */}
                    <Pagination
                      currentPage={documentsPage}
                      totalItems={documents.length}
                      itemsPerPage={documentsPerPage}
                      onPageChange={setDocumentsPage}
                      onItemsPerPageChange={setDocumentsPerPage}
                      className="border-t border-gray-200 px-4"
                    />
                  </div>
                )}
              </div>
            )}

            {/* LINKS */}
            {currentView === "links" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">Links de Documentos</h3>
                    <div className="mt-2 text-xs text-gray-500">Candidatos / <span className="text-gray-700">Links de Documentos</span></div>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={() => setShowShareLinkModal(true)}
                      className="px-6 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium flex items-center gap-2"
                    >
                      <i className="fas fa-link"></i>
                      Crear Link
                    </button>
                    <button 
                      onClick={loadData}
                      className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2"
                    >
                      <i className="fas fa-sync"></i>
                      Actualizar
                    </button>
                  </div>
                </div>

                <div>
                  <DocumentShareLinksDashboard />
                </div>
              </div>
            )}

            {/* NOTES */}
            {currentView === "notes" && (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-gray-900">Notas</h3>
                  
                  <div className="flex gap-3">
                    <button 
                      onClick={loadData}
                      className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all"
                    >
                      <i className="fas fa-sync mr-2"></i>
                      Actualizar
                    </button>
                    
                    <button 
                      onClick={() => setShowNoteModal(true)}
                      className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-md hover:shadow-lg flex items-center gap-2"
                    >
                      <i className="fas fa-plus"></i>
                      Nueva Nota
                    </button>
                  </div>
                </div>
                
                {loading ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                  </div>
                ) : notes.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <i className="fas fa-sticky-note text-5xl mb-4 text-gray-300"></i>
                    <p className="text-lg">No hay notas registradas</p>
                  </div>
                ) : (
                  <>
                    <NotesPostItView
                      notes={notes.slice((notesPage - 1) * notesPerPage, notesPage * notesPerPage)}
                      onEdit={async (note: any) => {
                        console.log('Editar nota:', note);
                        await showAlert('Función de edición en construcción');
                      }}
                      onDelete={async (noteId: number) => {
                        try {
                          const confirmed = await showConfirm('¿Eliminar esta nota?');
                          if (!confirmed) return;
                          await apiClient.deleteCandidateNote(noteId);
                          await loadData();
                          await showSuccess('Nota eliminada exitosamente');
                        } catch (error: any) {
                          console.error('Error:', error);
                          await showAlert('Error al eliminar la nota');
                        }
                      }}
                      onToggleImportant={async (note: any) => {
                        try {
                          await apiClient.updateCandidateNote(note.id, {
                            candidate: note.candidate,
                            note: note.note,
                            is_important: !note.is_important
                          });
                          await loadData();
                        } catch (error: any) {
                          console.error('Error:', error);
                          await showAlert('Error al actualizar la nota');
                        }
                      }}
                    />
                    {/* Pagination for notes */}
                    <Pagination
                      currentPage={notesPage}
                      totalItems={notes.length}
                      itemsPerPage={notesPerPage}
                      onPageChange={setNotesPage}
                      onItemsPerPageChange={setNotesPerPage}
                      itemsPerPageOptions={[6, 12, 24, 48]}
                      className="mt-4"
                    />
                  </>
                )}
              </div>
            )}

            {/* Upload Document Modal */}
            {showUploadModal && (
              <UploadDocumentModal
                onClose={() => setShowUploadModal(false)}
                onSuccess={() => {
                  setShowUploadModal(false);
                  loadData();
                }}
              />
            )}

            {/* Share Document Link Modal */}
            <ShareDocumentLinkModal
              isOpen={showShareLinkModal}
              onClose={() => setShowShareLinkModal(false)}
              onSuccess={() => {
                // NO cerrar el modal aquí - dejar que el usuario vea el link generado
                // El modal se cerrará cuando el usuario haga clic en "Cerrar"
                setSuccessMessage('Link de documento generado exitosamente');
                setTimeout(() => setSuccessMessage(''), 3000);
              }}
            />

            {/* Modal: Aplicación masiva a vacante */}
            {showBulkApplyModal && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Aplicar candidatos a vacante</h3>
                    <button
                      onClick={() => {
                        if (bulkApplying) return;
                        setShowBulkApplyModal(false);
                      }}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      <i className="fas fa-times" />
                    </button>
                  </div>

                  <div className="px-6 py-5 space-y-4">
                    <div className="text-sm text-gray-700">
                      Se aplicarán <span className="font-semibold">{selectedCandidates.size}</span> candidato(s) a la vacante seleccionada.
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Vacante / Perfil</label>
                      <select
                        value={selectedProfileForBulkApply}
                        onChange={(e) => setSelectedProfileForBulkApply(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Seleccionar vacante...</option>
                        {availableProfiles.map((profile: any) => (
                          <option key={profile.id} value={profile.id}>
                            {profile.position_title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Notas (opcional)</label>
                      <textarea
                        value={bulkApplyNotes}
                        onChange={(e) => setBulkApplyNotes(e.target.value)}
                        rows={3}
                        placeholder="Escribe una nota para esta asignación masiva..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                    <button
                      onClick={() => setShowBulkApplyModal(false)}
                      disabled={bulkApplying}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleBulkApplyToProfile}
                      disabled={bulkApplying}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {bulkApplying ? 'Aplicando...' : 'Aplicar candidatos'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* HISTORY */}
            {currentView === "history" && (
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Historial</h3>
                <div className="text-center py-12 text-gray-500">
                  <i className="fas fa-history text-5xl mb-4 text-gray-300"></i>
                  <p className="text-lg">Vista de historial en desarrollo</p>
                  <p className="text-sm mt-2">Aquí se mostrará el historial de actividad</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-4 right-4 z-50 animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl border-l-4 border-green-500 p-4 max-w-md">
            <div className="flex items-center">
              <i className="fas fa-check-circle text-green-500 text-xl mr-3"></i>
              <p className="text-gray-800">{successMessage}</p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nueva Nota */}
        <CandidateNoteFormModal
          isOpen={showNoteModal}
          onClose={() => setShowNoteModal(false)}
          onSuccess={async (message) => {
            await showAlert(message);
            loadData(); // Recargar notas
          }}
        />

       
    </div>
  );
}

'use client';

/**
 * ============================================================
 * SHORTLISTED CANDIDATES DASHBOARD
 * ============================================================
 * Dashboard para gestión de candidatos preseleccionados
 * - Vista detallada completa de cada candidato
 * - Upload de documentos directamente desde el dashboard
 * - Actualización de estado masiva
 * - Diseño de dos columnas
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useModal } from '@/context/ModalContext';
import Pagination from './ui/Pagination';

// ============================================================
// INTERFACES
// ============================================================

interface Profile {
  id: number;
  position_title: string;
  client_name: string;
  status: string;
  status_display: string;
  location_city: string;
  location_state: string;
  number_of_positions: number;
  created_at: string;
}

interface CandidateApplication {
  id: number;
  candidate: number;
  profile: number;
  status: string;
  status_display: string;
  match_percentage: number | null;
  overall_rating: number | null;
  notes: string;
  rejection_reason: string;
  applied_at: string;
  interview_date: string | null;
  offer_date: string | null;
}

interface CandidateDetail {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone: string;
  alternative_phone: string;
  city: string;
  state: string;
  country: string;
  address: string;
  current_position: string;
  current_company: string;
  years_of_experience: number;
  education_level: string;
  university: string;
  degree: string;
  skills: string[];
  languages: any[];
  certifications: string[];
  salary_expectation_min: number;
  salary_expectation_max: number;
  salary_currency: string;
  linkedin_url: string;
  portfolio_url: string;
  github_url: string;
  status: string;
  status_display: string;
  available_from: string;
  notice_period_days: number;
  internal_notes: string;
}

interface CandidateDocument {
  id: number;
  document_type: string;
  file: string;
  file_url: string;
  original_filename: string;
  description: string;
  uploaded_at: string;
  uploaded_by_name: string;
}

interface CandidateWithApplication {
  application: CandidateApplication;
  candidate: CandidateDetail;
  documents: CandidateDocument[];
  expanded: boolean;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function ShortlistedCandidatesDashboard() {
  const { showAlert } = useModal();
  // Estado de datos
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [candidatesData, setCandidatesData] = useState<CandidateWithApplication[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<number>>(new Set());
  
  // Estado de UI
  const [loading, setLoading] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadingFile, setUploadingFile] = useState<number | null>(null);
  
  // Búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [candidateSearchTerm, setCandidateSearchTerm] = useState('');
  
  // Modales
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [selectedCandidateForUpload, setSelectedCandidateForUpload] = useState<number | null>(null);
  const [previewDocument, setPreviewDocument] = useState<CandidateDocument | null>(null);
  
  // Formularios
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [uploadForm, setUploadForm] = useState({
    document_type: 'cv',
    description: '',
    file: null as File | null,
  });
  
  // Pagination
  const [profilesPage, setProfilesPage] = useState(1);
  const [profilesPerPage, setProfilesPerPage] = useState(10);
  const [candidatesPage, setCandidatesPage] = useState(1);
  const [candidatesPerPage, setCandidatesPerPage] = useState(10);

  // ============================================================
  // LIFECYCLE
  // ============================================================
  
  useEffect(() => {
    loadProfiles();
  }, []);
  
  useEffect(() => {
    if (selectedProfile) {
      loadShortlistedCandidates(selectedProfile.id);
    }
  }, [selectedProfile]);

  // ============================================================
  // DATA LOADING
  // ============================================================
  
  const loadProfiles = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/profiles/profiles/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        const allProfiles = data.results || data;
        
        // Filtrar perfiles que tengan al menos un candidato preseleccionado
        const profilesWithShortlisted = await filterProfilesWithShortlisted(allProfiles, token);
        
        setProfiles(profilesWithShortlisted);
        
        if (profilesWithShortlisted.length > 0 && !selectedProfile) {
          setSelectedProfile(profilesWithShortlisted[0]);
        }
      } else {
        console.error('Error loading profiles:', response.status);
        showNotification('Error al cargar perfiles', 'error');
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
      showNotification('Error al cargar perfiles', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const filterProfilesWithShortlisted = async (profiles: Profile[], token: string | null) => {
    const profilesWithCandidates: Profile[] = [];
    
    for (const profile of profiles) {
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/candidates/applications/?profile=${profile.id}&status=shortlisted`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (response.ok) {
          const data = await response.json();
          const apps = data.results || data;
          if (apps.length > 0) {
            profilesWithCandidates.push(profile);
          }
        }
      } catch (error) {
        console.error(`Error checking profile ${profile.id}:`, error);
      }
    }
    
    return profilesWithCandidates;
  };
  
  const loadShortlistedCandidates = async (profileId: number) => {
    setLoadingCandidates(true);
    setCandidatesData([]);
    
    try {
      const token = localStorage.getItem('authToken');
      
      // Cargar aplicaciones preseleccionadas
      const appsResponse = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/candidates/applications/?profile=${profileId}&status=shortlisted`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      if (appsResponse.ok) {
        const appsData = await appsResponse.json();
        const applications = appsData.results || appsData;
        
        // Cargar detalles completos de cada candidato
        const candidatesWithData = await Promise.all(
          applications.map(async (app: CandidateApplication) => {
            // Cargar candidato
            const candidateResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/candidates/candidates/${app.candidate}/`,
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            
            // Cargar documentos
            const docsResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/candidates/candidates/${app.candidate}/documents/`,
              {
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              }
            );
            
            const candidate = candidateResponse.ok ? await candidateResponse.json() : null;
            const documents = docsResponse.ok ? await docsResponse.json() : [];
            
            return {
              application: app,
              candidate: candidate,
              documents: documents,
              expanded: true, // Expandido por defecto
            };
          })
        );
        
        setCandidatesData(candidatesWithData.filter(c => c.candidate !== null));
      }
    } catch (error) {
      console.error('Error loading shortlisted candidates:', error);
      showNotification('Error al cargar candidatos preseleccionados', 'error');
    } finally {
      setLoadingCandidates(false);
    }
  };

  // ============================================================
  // ACTIONS - CANDIDATOS
  // ============================================================
  
  const handleSelectCandidate = (appId: number) => {
    const newSelected = new Set(selectedCandidates);
    if (newSelected.has(appId)) {
      newSelected.delete(appId);
    } else {
      newSelected.add(appId);
    }
    setSelectedCandidates(newSelected);
  };
  
  const handleSelectAll = () => {
    const filteredCandidates = getFilteredCandidates();
    const allSelected = filteredCandidates.every(c => selectedCandidates.has(c.application.id));
    
    const newSelected = new Set(selectedCandidates);
    
    if (allSelected) {
      filteredCandidates.forEach(c => newSelected.delete(c.application.id));
    } else {
      filteredCandidates.forEach(c => newSelected.add(c.application.id));
    }
    
    setSelectedCandidates(newSelected);
  };
  
  const toggleExpand = (appId: number) => {
    setCandidatesData(candidatesData.map(c =>
      c.application.id === appId ? { ...c, expanded: !c.expanded } : c
    ));
  };
  
  const handleUpdateStatus = async () => {
    if (!newStatus) {
      showNotification('Selecciona un estado', 'error');
      return;
    }
    
    const appsToUpdate = Array.from(selectedCandidates);
    
    if (appsToUpdate.length === 0) {
      showNotification('Selecciona al menos un candidato', 'error');
      return;
    }
    
    if (newStatus === 'rejected' && !rejectionReason) {
      showNotification('Debes agregar un motivo de rechazo', 'error');
      return;
    }
    
    setActionLoading(true);
    
    try {
      const token = localStorage.getItem('authToken');
      const promises = appsToUpdate.map(appId =>
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/candidates/applications/${appId}/`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: newStatus,
            notes: statusNotes,
            rejection_reason: newStatus === 'rejected' ? rejectionReason : '',
          }),
        })
      );
      
      const results = await Promise.all(promises);
      const allSuccess = results.every(r => r.ok);
      
      if (allSuccess) {
        showNotification(`${appsToUpdate.length} candidato(s) actualizado(s)`, 'success');
        if (selectedProfile) {
          await loadShortlistedCandidates(selectedProfile.id);
        }
        setShowStatusModal(false);
        setNewStatus('');
        setStatusNotes('');
        setRejectionReason('');
        setSelectedCandidates(new Set());
      } else {
        showNotification('Error al actualizar algunos candidatos', 'error');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showNotification('Error al actualizar estado', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================
  // ACTIONS - DOCUMENTOS
  // ============================================================
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadForm({ ...uploadForm, file: e.target.files[0] });
    }
  };
  
  const handleUploadDocument = async () => {
    if (!uploadForm.file || !selectedCandidateForUpload) {
      showNotification('Selecciona un archivo', 'error');
      return;
    }
    
    setUploadingFile(selectedCandidateForUpload);
    
    try {
      const token = localStorage.getItem('authToken');
      const formData = new FormData();
      formData.append('file', uploadForm.file);
      formData.append('document_type', uploadForm.document_type);
      formData.append('description', uploadForm.description);
      
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/candidates/candidates/${selectedCandidateForUpload}/upload_document/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        }
      );
      
      if (response.ok) {
        showNotification('Documento subido exitosamente', 'success');
        if (selectedProfile) {
          await loadShortlistedCandidates(selectedProfile.id);
        }
        setShowUploadModal(false);
        setUploadForm({
          document_type: 'cv',
          description: '',
          file: null,
        });
        setSelectedCandidateForUpload(null);
      } else {
        showNotification('Error al subir documento', 'error');
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      showNotification('Error al subir documento', 'error');
    } finally {
      setUploadingFile(null);
    }
  };
  
  const handlePreviewDocument = (doc: CandidateDocument) => {
    setPreviewDocument(doc);
    setShowDocumentPreview(true);
  };

  // ============================================================
  // FILTERS
  // ============================================================
  
  const filteredProfiles = profiles.filter(profile => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return profile.position_title.toLowerCase().includes(searchLower) ||
             profile.client_name.toLowerCase().includes(searchLower);
    }
    return true;
  });
  
  const getFilteredCandidates = () => {
    return candidatesData.filter(c => {
      if (candidateSearchTerm) {
        const searchLower = candidateSearchTerm.toLowerCase();
        return c.candidate.full_name.toLowerCase().includes(searchLower) ||
               c.candidate.email.toLowerCase().includes(searchLower);
      }
      return true;
    });
  };

  // ============================================================
  // HELPERS
  // ============================================================
  
  const showNotification = async (message: string, type: 'success' | 'error') => {
    console.log(`[${type}] ${message}`);
    await showAlert(message);
  };
  
  const getDocumentIcon = (docType: string) => {
    const icons: Record<string, string> = {
      cv: 'fa-file-pdf',
      cover_letter: 'fa-file-alt',
      certificate: 'fa-certificate',
      portfolio: 'fa-folder',
      other: 'fa-file',
    };
    return icons[docType] || 'fa-file';
  };
  
  const getDocumentColor = (docType: string) => {
    const colors: Record<string, string> = {
      cv: 'text-red-600',
      cover_letter: 'text-blue-600',
      certificate: 'text-green-600',
      portfolio: 'text-purple-600',
      other: 'text-gray-600',
    };
    return colors[docType] || 'text-gray-600';
  };

  const filteredCandidates = getFilteredCandidates();

  // ============================================================
  // RENDER
  // ============================================================
  
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Candidatos Preseleccionados</h1>
            <p className="text-gray-600 mt-1">Gestiona los candidatos en etapa de preselección</p>
          </div>
          <button
            onClick={loadProfiles}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <i className="fas fa-sync mr-2" />
            Actualizar
          </button>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-purple-50 p-3 rounded-lg">
            <div className="text-purple-600 text-sm font-medium">Perfiles Activos</div>
            <div className="text-xl font-bold text-gray-900">{profiles.length}</div>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-blue-600 text-sm font-medium">Preseleccionados</div>
            <div className="text-xl font-bold text-gray-900">{candidatesData.length}</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-green-600 text-sm font-medium">Entrevistados</div>
            <div className="text-xl font-bold text-gray-900">{candidatesData.filter(c => c.application.status === 'interview_scheduled').length}</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg">
            <div className="text-orange-600 text-sm font-medium">Seleccionados</div>
            <div className="text-xl font-bold text-gray-900">{selectedCandidates.size}</div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Perfiles */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">PERFILES CON PRESELECCIONADOS</h2>
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Profiles List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
              </div>
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center py-12 px-4">
                <i className="fas fa-inbox text-gray-400 text-4xl mb-3" />
                <p className="text-gray-600 text-sm">No hay perfiles con candidatos preseleccionados</p>
              </div>
            ) : (
              <div className="p-2">
                {filteredProfiles
                  .slice((profilesPage - 1) * profilesPerPage, profilesPage * profilesPerPage)
                  .map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => setSelectedProfile(profile)}
                    className={`w-full text-left p-4 rounded-lg mb-2 transition-colors ${
                      selectedProfile?.id === profile.id
                        ? 'bg-purple-50 border-2 border-purple-500'
                        : 'bg-white border border-gray-200 hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900 text-sm leading-tight flex-1">
                        {profile.position_title}
                      </h3>
                      <span className="ml-2 px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded-full">
                        {candidatesData.filter(c => c.application.profile === profile.id).length}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{profile.client_name}</p>
                    <p className="text-xs text-gray-500">
                      {profile.location_city}, {profile.location_state}
                    </p>
                  </button>
                ))}
                {/* Pagination for profiles sidebar */}
                {filteredProfiles.length > profilesPerPage && (
                  <Pagination
                    currentPage={profilesPage}
                    totalItems={filteredProfiles.length}
                    itemsPerPage={profilesPerPage}
                    onPageChange={setProfilesPage}
                    showItemsPerPage={false}
                    className="mt-2 text-xs"
                  />
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Candidatos */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedProfile ? (
            <>
              {/* Panel Header */}
              <div className="bg-white border-b border-gray-200 p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900">{selectedProfile.position_title}</h2>
                    <p className="text-sm text-gray-600 mt-1">
                      {selectedProfile.client_name} • {selectedProfile.location_city}, {selectedProfile.location_state}
                    </p>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={candidateSearchTerm}
                    onChange={(e) => setCandidateSearchTerm(e.target.value)}
                    placeholder="Buscar por nombre o email..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Actions Bar */}
              {selectedCandidates.size > 0 && (
                <div className="bg-purple-50 border-b border-purple-200 px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-purple-900">
                      {selectedCandidates.size} candidato(s) seleccionado(s)
                    </span>
                    <button
                      onClick={() => setSelectedCandidates(new Set())}
                      className="text-sm text-purple-600 hover:text-purple-800"
                    >
                      Limpiar selección
                    </button>
                  </div>
                  <button
                    onClick={() => setShowStatusModal(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  >
                    <i className="fas fa-edit mr-2" />
                    Cambiar Estado
                  </button>
                </div>
              )}

              {/* Candidates List */}
              <div className="flex-1 overflow-y-auto p-6">
                {loadingCandidates ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                    <span className="ml-3 text-gray-600">Cargando candidatos...</span>
                  </div>
                ) : filteredCandidates.length === 0 ? (
                  <div className="text-center py-12">
                    <i className="fas fa-users text-gray-400 text-5xl mb-4" />
                    <p className="text-gray-600">No hay candidatos preseleccionados para este perfil</p>
                  </div>
                ) : (
                  <>
                    {/* Select All */}
                    <div className="mb-4">
                      <button
                        onClick={handleSelectAll}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-purple-50 text-gray-600 hover:text-purple-700"
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          filteredCandidates.length > 0 && filteredCandidates.every(c => selectedCandidates.has(c.application.id))
                            ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                        }`}>
                          {filteredCandidates.length > 0 && filteredCandidates.every(c => selectedCandidates.has(c.application.id)) && (
                            <i className="fas fa-check text-white text-[9px]" />
                          )}
                        </div>
                        Seleccionar todos
                      </button>
                    </div>

                    {/* Candidates Detailed Cards */}
                    <div className="space-y-4">
                      {filteredCandidates
                        .slice((candidatesPage - 1) * candidatesPerPage, candidatesPage * candidatesPerPage)
                        .map((candidateData) => (
                        <div
                          key={candidateData.application.id}
                          className={`group bg-white rounded-xl border-2 overflow-hidden transition-all duration-200 cursor-pointer ${
                            selectedCandidates.has(candidateData.application.id)
                              ? 'border-purple-500 shadow-lg scale-[1.01]'
                              : 'border-gray-200 hover:border-purple-300 hover:shadow-md hover:scale-[1.005]'
                          }`}
                          onClick={() => handleSelectCandidate(candidateData.application.id)}
                          title={selectedCandidates.has(candidateData.application.id) ? 'Click para deseleccionar' : 'Click para seleccionar'}
                        >
                          {/* Card Header */}
                          <div className={`p-6 border-b border-gray-200 transition-colors duration-200 ${
                            selectedCandidates.has(candidateData.application.id)
                              ? 'bg-gradient-to-r from-purple-100 to-purple-50'
                              : 'bg-gradient-to-r from-purple-50 to-white'
                          }`}>
                            <div className="flex items-start">
                              {/* Selection circle */}
                              <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 shrink-0 mt-1 ${
                                selectedCandidates.has(candidateData.application.id)
                                  ? 'border-purple-500 bg-purple-500 scale-110'
                                  : 'border-gray-300 opacity-0 group-hover:opacity-100 group-hover:border-purple-400 group-hover:scale-105'
                              }`}>
                                {selectedCandidates.has(candidateData.application.id) ? (
                                  <i className="fas fa-check text-white text-[10px]" />
                                ) : (
                                  <i className="fas fa-plus text-purple-400 text-[10px]" />
                                )}
                              </div>
                              
                              <div className="flex-1 ml-4">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <h3 className="text-2xl font-bold text-gray-900">
                                      {candidateData.candidate.full_name}
                                    </h3>
                                    <p className="text-purple-600 font-medium mt-1">
                                      {candidateData.candidate.current_position} en {candidateData.candidate.current_company}
                                    </p>
                                  </div>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); toggleExpand(candidateData.application.id); }}
                                    className="text-gray-400 hover:text-gray-600 ml-4"
                                  >
                                    <i className={`fas fa-chevron-${candidateData.expanded ? 'up' : 'down'}`} />
                                  </button>
                                </div>

                                {/* Quick Stats */}
                                <div className="flex items-center space-x-6 mt-4">
                                  {candidateData.application.match_percentage && (
                                    <div className="flex items-center">
                                      <i className="fas fa-chart-line text-purple-600 mr-2" />
                                      <span className="text-sm font-semibold text-gray-900">
                                        Match: {candidateData.application.match_percentage}%
                                      </span>
                                    </div>
                                  )}
                                  <div className="flex items-center">
                                    <i className="fas fa-briefcase text-purple-600 mr-2" />
                                    <span className="text-sm font-semibold text-gray-900">
                                      {candidateData.candidate.years_of_experience} años de experiencia
                                    </span>
                                  </div>
                                  <div className="flex items-center">
                                    <i className="fas fa-calendar text-purple-600 mr-2" />
                                    <span className="text-sm text-gray-600">
                                      Aplicó: {new Date(candidateData.application.applied_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Expanded Content */}
                          {candidateData.expanded && (
                            <div className="p-6" onClick={(e) => e.stopPropagation()}>
                              {/* Grid de Información */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                                {/* Contacto */}
                                <div className="space-y-3">
                                  <h4 className="font-bold text-gray-900 flex items-center mb-4">
                                    <i className="fas fa-address-card text-purple-600 mr-2" />
                                    Información de Contacto
                                  </h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex items-center">
                                      <i className="fas fa-envelope text-gray-400 w-5 mr-2" />
                                      <span className="text-gray-900">{candidateData.candidate.email}</span>
                                    </div>
                                    <div className="flex items-center">
                                      <i className="fas fa-phone text-gray-400 w-5 mr-2" />
                                      <span className="text-gray-900">{candidateData.candidate.phone || 'N/A'}</span>
                                    </div>
                                    {candidateData.candidate.alternative_phone && (
                                      <div className="flex items-center">
                                        <i className="fas fa-mobile text-gray-400 w-5 mr-2" />
                                        <span className="text-gray-900">{candidateData.candidate.alternative_phone}</span>
                                      </div>
                                    )}
                                    <div className="flex items-center">
                                      <i className="fas fa-map-marker-alt text-gray-400 w-5 mr-2" />
                                      <span className="text-gray-900">
                                        {candidateData.candidate.city}, {candidateData.candidate.state}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Links */}
                                  {(candidateData.candidate.linkedin_url || candidateData.candidate.portfolio_url || candidateData.candidate.github_url) && (
                                    <div className="pt-3 border-t border-gray-200">
                                      <p className="text-xs font-semibold text-gray-700 mb-2">Enlaces</p>
                                      <div className="space-y-2">
                                        {candidateData.candidate.linkedin_url && (
                                          <a href={candidateData.candidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-blue-600 hover:underline">
                                            <i className="fab fa-linkedin w-5 mr-2" />
                                            LinkedIn
                                          </a>
                                        )}
                                        {candidateData.candidate.portfolio_url && (
                                          <a href={candidateData.candidate.portfolio_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-blue-600 hover:underline">
                                            <i className="fas fa-globe w-5 mr-2" />
                                            Portafolio
                                          </a>
                                        )}
                                        {candidateData.candidate.github_url && (
                                          <a href={candidateData.candidate.github_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-sm text-blue-600 hover:underline">
                                            <i className="fab fa-github w-5 mr-2" />
                                            GitHub
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Educación y Experiencia */}
                                <div className="space-y-3">
                                  <h4 className="font-bold text-gray-900 flex items-center mb-4">
                                    <i className="fas fa-graduation-cap text-purple-600 mr-2" />
                                    Educación y Experiencia
                                  </h4>
                                  <div className="space-y-3 text-sm">
                                    <div>
                                      <p className="text-xs font-semibold text-gray-700">Nivel de Educación</p>
                                      <p className="text-gray-900">{candidateData.candidate.education_level}</p>
                                    </div>
                                    {candidateData.candidate.university && (
                                      <div>
                                        <p className="text-xs font-semibold text-gray-700">Universidad</p>
                                        <p className="text-gray-900">{candidateData.candidate.university}</p>
                                      </div>
                                    )}
                                    {candidateData.candidate.degree && (
                                      <div>
                                        <p className="text-xs font-semibold text-gray-700">Carrera</p>
                                        <p className="text-gray-900">{candidateData.candidate.degree}</p>
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-xs font-semibold text-gray-700">Expectativa Salarial</p>
                                      <p className="text-gray-900">
                                        ${candidateData.candidate.salary_expectation_min?.toLocaleString()} - 
                                        ${candidateData.candidate.salary_expectation_max?.toLocaleString()} {candidateData.candidate.salary_currency}
                                      </p>
                                    </div>
                                    {candidateData.candidate.available_from && (
                                      <div>
                                        <p className="text-xs font-semibold text-gray-700">Disponibilidad</p>
                                        <p className="text-gray-900">
                                          Desde: {new Date(candidateData.candidate.available_from).toLocaleDateString()}
                                          {candidateData.candidate.notice_period_days > 0 && 
                                            ` (${candidateData.candidate.notice_period_days} días de aviso)`
                                          }
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Habilidades */}
                              {candidateData.candidate.skills.length > 0 && (
                                <div className="mb-6">
                                  <h4 className="font-bold text-gray-900 flex items-center mb-3">
                                    <i className="fas fa-code text-purple-600 mr-2" />
                                    Habilidades
                                  </h4>
                                  <div className="flex flex-wrap gap-2">
                                    {candidateData.candidate.skills.map((skill, idx) => (
                                      <span key={idx} className="px-3 py-1 bg-purple-100 text-purple-800 text-sm font-medium rounded-full">
                                        {skill}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Certificaciones */}
                              {candidateData.candidate.certifications.length > 0 && (
                                <div className="mb-6">
                                  <h4 className="font-bold text-gray-900 flex items-center mb-3">
                                    <i className="fas fa-certificate text-purple-600 mr-2" />
                                    Certificaciones
                                  </h4>
                                  <div className="space-y-1">
                                    {candidateData.candidate.certifications.map((cert, idx) => (
                                      <div key={idx} className="flex items-center text-sm text-gray-700">
                                        <i className="fas fa-check-circle text-green-500 mr-2" />
                                        {cert}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Documentos */}
                              <div className="mb-6">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-bold text-gray-900 flex items-center">
                                    <i className="fas fa-folder-open text-purple-600 mr-2" />
                                    Documentos ({candidateData.documents.length})
                                  </h4>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedCandidateForUpload(candidateData.candidate.id);
                                      setShowUploadModal(true);
                                    }}
                                    className="px-3 py-1 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                                  >
                                    <i className="fas fa-upload mr-2" />
                                    Subir Archivo
                                  </button>
                                </div>
                                
                                {candidateData.documents.length === 0 ? (
                                  <p className="text-sm text-gray-500 italic">No hay documentos disponibles</p>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {candidateData.documents.map((doc) => (
                                      <div key={doc.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-200">
                                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                                          <i className={`fas ${getDocumentIcon(doc.document_type)} ${getDocumentColor(doc.document_type)} text-xl`} />
                                          <div className="flex-1 min-w-0">
                                            <p className="font-medium text-gray-900 text-sm truncate">{doc.original_filename}</p>
                                            <p className="text-xs text-gray-500">{doc.description || 'Sin descripción'}</p>
                                          </div>
                                        </div>
                                        <div className="flex space-x-2 ml-3">
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handlePreviewDocument(doc); }}
                                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                            title="Vista previa"
                                          >
                                            <i className="fas fa-eye" />
                                          </button>
                                          <a
                                            href={doc.file_url}
                                            download
                                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                            title="Descargar"
                                          >
                                            <i className="fas fa-download" />
                                          </a>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Notas de la Aplicación */}
                              {candidateData.application.notes && (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                  <h4 className="font-bold text-gray-900 flex items-center mb-2">
                                    <i className="fas fa-sticky-note text-blue-600 mr-2" />
                                    Notas de la Aplicación
                                  </h4>
                                  <p className="text-sm text-gray-700">{candidateData.application.notes}</p>
                                </div>
                              )}

                              {/* Notas Internas */}
                              {candidateData.candidate.internal_notes && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                                  <h4 className="font-bold text-gray-900 flex items-center mb-2">
                                    <i className="fas fa-lock text-yellow-600 mr-2" />
                                    Notas Internas
                                  </h4>
                                  <p className="text-sm text-gray-700">{candidateData.candidate.internal_notes}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {/* Pagination for candidates */}
                    <Pagination
                      currentPage={candidatesPage}
                      totalItems={filteredCandidates.length}
                      itemsPerPage={candidatesPerPage}
                      onPageChange={setCandidatesPage}
                      onItemsPerPageChange={setCandidatesPerPage}
                      className="mt-6"
                    />
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <i className="fas fa-arrow-left text-gray-400 text-5xl mb-4" />
                <p className="text-gray-600">Selecciona un perfil para ver candidatos preseleccionados</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Cambiar Estado de Candidatos */}
      {showStatusModal && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={() => { setShowStatusModal(false); setNewStatus(''); setStatusNotes(''); setRejectionReason(''); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl flex flex-col"
            style={{ width: '95vw', height: '92vh', maxWidth: '750px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Header */}
            <div className={`flex-shrink-0 text-white px-8 py-5 flex justify-between items-center rounded-t-2xl ${
              newStatus === 'rejected'
                ? 'bg-gradient-to-r from-red-500 to-rose-600'
                : 'bg-gradient-to-r from-purple-600 to-violet-700'
            }`}>
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <i className="fas fa-users-cog"></i>
                  Cambiar Estado de Candidatos
                </h2>
                <p className={`text-sm mt-1 ${newStatus === 'rejected' ? 'text-red-100' : 'text-purple-100'}`}>
                  Actualizando <strong>{selectedCandidates.size}</strong> candidato(s) seleccionado(s)
                </p>
              </div>
              <button
                onClick={() => { setShowStatusModal(false); setNewStatus(''); setStatusNotes(''); setRejectionReason(''); }}
                className={`text-white rounded-full w-10 h-10 flex items-center justify-center transition ${
                  newStatus === 'rejected' ? 'hover:bg-red-700' : 'hover:bg-purple-800'
                }`}
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {/* New Status */}
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <i className="fas fa-list-alt text-purple-600"></i>
                  Nuevo Estatus
                </h3>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                >
                  <option value="">Seleccionar estatus...</option>
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

              {/* Rejection Reason (conditional) */}
              {newStatus === 'rejected' && (
                <div className="bg-gradient-to-r from-red-50 to-rose-50 rounded-xl p-6 border border-red-300">
                  <h3 className="text-lg font-bold text-red-900 mb-4 flex items-center gap-2">
                    <i className="fas fa-exclamation-triangle text-red-600"></i>
                    Motivo de Rechazo <span className="text-sm font-semibold text-red-600">(requerido)</span>
                  </h3>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-3 border border-red-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition"
                    placeholder="Explica el motivo del rechazo..."
                  />
                </div>
              )}

              {/* Notes */}
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <i className="fas fa-sticky-note text-gray-600"></i>
                  Notas <span className="text-sm font-normal text-gray-500">(opcional)</span>
                </h3>
                <textarea
                  value={statusNotes}
                  onChange={(e) => setStatusNotes(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  placeholder="Agrega notas sobre este cambio..."
                />
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex-shrink-0 px-8 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end gap-4">
              <button
                onClick={() => { setShowStatusModal(false); setNewStatus(''); setStatusNotes(''); setRejectionReason(''); }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateStatus}
                disabled={actionLoading}
                className={`px-6 py-3 text-white rounded-xl font-semibold shadow-lg transition flex items-center gap-2 disabled:opacity-50 ${
                  newStatus === 'rejected'
                    ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                    : 'bg-gradient-to-r from-purple-600 to-violet-700 hover:from-purple-700 hover:to-violet-800'
                }`}
              >
                <i className={`fas ${actionLoading ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
                {actionLoading ? 'Actualizando...' : 'Actualizar Estado'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Subir Documento */}
      {showUploadModal && (
        <div className="fixed top-16 left-0 right-0 bottom-0  flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Subir Documento</h3>
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadForm({
                      document_type: 'cv',
                      description: '',
                      file: null,
                    });
                    setSelectedCandidateForUpload(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Documento</label>
                  <select
                    value={uploadForm.document_type}
                    onChange={(e) => setUploadForm({ ...uploadForm, document_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="cv">CV / Currículum</option>
                    <option value="cover_letter">Carta de Presentación</option>
                    <option value="certificate">Certificado</option>
                    <option value="portfolio">Portafolio</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Descripción (opcional)</label>
                  <input
                    type="text"
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                    placeholder="Ej: CV actualizado 2024"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Archivo</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-purple-500 transition-colors">
                    <div className="space-y-1 text-center">
                      <i className="fas fa-cloud-upload-alt text-gray-400 text-4xl mb-3" />
                      <div className="flex text-sm text-gray-600">
                        <label className="relative cursor-pointer bg-white rounded-md font-medium text-purple-600 hover:text-purple-500">
                          <span>Seleccionar archivo</span>
                          <input
                            type="file"
                            className="sr-only"
                            onChange={handleFileSelect}
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          />
                        </label>
                      </div>
                      {uploadForm.file && (
                        <p className="text-sm text-gray-500 mt-2">
                          <i className="fas fa-file mr-2" />
                          {uploadForm.file.name}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        PDF, DOC, DOCX, JPG, PNG hasta 10MB
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowUploadModal(false);
                    setUploadForm({
                      document_type: 'cv',
                      description: '',
                      file: null,
                    });
                    setSelectedCandidateForUpload(null);
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUploadDocument}
                  disabled={!uploadForm.file || uploadingFile !== null}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {uploadingFile !== null ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-upload mr-2" />
                      Subir Documento
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Vista Previa de Documento */}
      {showDocumentPreview && previewDocument && (
        <div className="fixed top-16 left-0 right-0 bottom-0  flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Vista Previa: {previewDocument.original_filename}</h3>
                <button
                  onClick={() => {
                    setShowDocumentPreview(false);
                    setPreviewDocument(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times" />
                </button>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 min-h-[400px]">
                {previewDocument.file_url.endsWith('.pdf') ? (
                  <iframe
                    src={previewDocument.file_url}
                    className="w-full h-[600px] rounded-lg"
                    title="Vista previa PDF"
                  />
                ) : previewDocument.file_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                  <img
                    src={previewDocument.file_url}
                    alt={previewDocument.original_filename}
                    className="max-w-full h-auto rounded-lg mx-auto"
                  />
                ) : (
                  <div className="text-center py-12">
                    <i className="fas fa-file text-gray-400 text-5xl mb-4" />
                    <p className="text-gray-600">Vista previa no disponible para este tipo de archivo</p>
                    <a
                      href={previewDocument.file_url}
                      download
                      className="mt-4 inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                      <i className="fas fa-download mr-2" />
                      Descargar Archivo
                    </a>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end mt-4">
                <a
                  href={previewDocument.file_url}
                  download
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <i className="fas fa-download mr-2" />
                  Descargar
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

/**
 * ============================================================
 * CANDIDATES STATUS DASHBOARD - TWO COLUMN LAYOUT
 * ============================================================
 * Diseño de dos columnas similar al sistema de evaluaciones:
 * - Sidebar izquierdo: Lista de perfiles
 * - Panel derecho: Candidatos del perfil seleccionado
 */

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useModal } from '@/context/ModalContext';

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
  candidate_name: string;
  candidate_email: string;
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
  city: string;
  state: string;
  current_position: string;
  current_company: string;
  years_of_experience: number;
  education_level: string;
  skills: string[];
  languages: any[];
  salary_expectation_min: number;
  salary_expectation_max: number;
  salary_currency: string;
  linkedin_url: string;
  status: string;
  status_display: string;
}

interface CandidateDocument {
  id: number;
  document_type: string;
  file: string;
  file_url: string;
  original_filename: string;
  description: string;
  uploaded_at: string;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function CandidatesStatusDashboard() {
  // Estado de datos
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [selectedApplications, setSelectedApplications] = useState<Set<number>>(new Set());
  
  // Estado de candidato
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateDetail | null>(null);
  const [candidateDocuments, setCandidateDocuments] = useState<CandidateDocument[]>([]);
  
  // Estado de UI
  const [loading, setLoading] = useState(true);
  const [loadingApplications, setLoadingApplications] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { showAlert } = useModal();
  
  // Búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [candidateSearchTerm, setCandidateSearchTerm] = useState('');
  
  // Modales
  const [showCandidateModal, setShowCandidateModal] = useState(false);
  const [showProfileStatusModal, setShowProfileStatusModal] = useState(false);
  const [showCandidateStatusModal, setShowCandidateStatusModal] = useState(false);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<CandidateDocument | null>(null);
  
  // Formularios
  const [profileNewStatus, setProfileNewStatus] = useState('');
  const [profileStatusNotes, setProfileStatusNotes] = useState('');
  const [candidateNewStatus, setCandidateNewStatus] = useState('');
  const [candidateStatusNotes, setCandidateStatusNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================
  
  const formatNumber = (value: number | string, decimals: number = 0): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return '0';
    return new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(num);
  };

  // ============================================================
  // LIFECYCLE
  // ============================================================
  
  useEffect(() => {
    loadProfiles();
  }, []);
  
  useEffect(() => {
    if (selectedProfile) {
      loadApplications(selectedProfile.id);
    }
  }, [selectedProfile]);

  // ============================================================
  // DATA LOADING
  // ============================================================
  
  const loadProfiles = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      console.log('🔵 Cargando perfiles...');
      console.log('🔑 Token:', token ? 'Presente' : 'NO PRESENTE');
      
      // Primero intentar sin filtro para ver qué hay
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/profiles/profiles/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Data recibida:', data);
        
        const profilesList = data.results || data;
        console.log('📋 Total de perfiles:', profilesList.length);
        console.log('📋 Perfiles:', profilesList);
        
        // Filtrar localmente por status candidates_found si existen
        const candidatesFoundProfiles = profilesList.filter((p: Profile) => p.status === 'candidates_found');
        console.log('🎯 Perfiles con candidatos encontrados:', candidatesFoundProfiles.length);
        
        // Si no hay perfiles con candidatos, mostrar todos para debug
        if (candidatesFoundProfiles.length === 0) {
          console.warn('⚠️ No hay perfiles con status "candidates_found", mostrando todos');
          setProfiles(profilesList);
        } else {
          setProfiles(candidatesFoundProfiles);
        }
        
        // Seleccionar el primero automáticamente
        const profilesToShow = candidatesFoundProfiles.length > 0 ? candidatesFoundProfiles : profilesList;
        if (profilesToShow.length > 0 && !selectedProfile) {
          setSelectedProfile(profilesToShow[0]);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Error loading profiles:', response.status, errorText);
        showNotification('Error al cargar perfiles', 'error');
      }
    } catch (error) {
      console.error('💥 Exception loading profiles:', error);
      showNotification('Error al cargar perfiles', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const loadApplications = async (profileId: number) => {
    setLoadingApplications(true);
    setApplications([]);
    console.log('🔵 Cargando aplicaciones para perfil:', profileId);
    
    try {
      const token = localStorage.getItem('authToken');
      const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/candidates/applications/?profile=${profileId}`;
      console.log('📡 URL:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Applications data:', data);
        
        const apps = data.results || data;
        console.log('📋 Total aplicaciones:', apps.length);
        
        if (apps.length === 0) {
          console.warn('⚠️ No hay candidatos para este perfil');
          setApplications([]);
          setLoadingApplications(false);
          return;
        }
        
        // Enriquecer con nombre del candidato
        console.log('🔄 Enriqueciendo aplicaciones con datos de candidatos...');
        const enrichedApps = await Promise.all(
          apps.map(async (app: CandidateApplication) => {
            console.log(`  📥 Cargando candidato ${app.candidate}...`);
            const candidateResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/candidates/candidates/${app.candidate}/`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (candidateResponse.ok) {
              const candidate = await candidateResponse.json();
              console.log(`  ✅ Candidato cargado:`, candidate.full_name);
              return {
                ...app,
                candidate_name: candidate.full_name,
                candidate_email: candidate.email,
              };
            }
            console.warn(`  ⚠️ No se pudo cargar candidato ${app.candidate}`);
            return app;
          })
        );
        
        console.log('✅ Aplicaciones enriquecidas:', enrichedApps);
        setApplications(enrichedApps);
      } else {
        const errorText = await response.text();
        console.error('❌ Error loading applications:', response.status, errorText);
      }
    } catch (error) {
      console.error('💥 Exception loading applications:', error);
      showNotification('Error al cargar candidatos', 'error');
    } finally {
      setLoadingApplications(false);
    }
  };
  
  const loadCandidateDetail = async (candidateId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/candidates/candidates/${candidateId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedCandidate(data);
        await loadCandidateDocuments(candidateId);
      }
    } catch (error) {
      console.error('Error loading candidate detail:', error);
    }
  };
  
  const loadCandidateDocuments = async (candidateId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/candidates/candidates/${candidateId}/documents/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setCandidateDocuments(data);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  // ============================================================
  // ACTIONS - PERFIL
  // ============================================================
  
  const handleUpdateProfileStatus = async () => {
    if (!profileNewStatus || !selectedProfile) {
      showNotification('Selecciona un estado', 'error');
      return;
    }
    
    setActionLoading(true);
    
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/profiles/profiles/${selectedProfile.id}/change_status/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: profileNewStatus,
          notes: profileStatusNotes,
        }),
      });
      
      if (response.ok) {
        showNotification('Estatus del perfil actualizado', 'success');
        await loadProfiles();
        setShowProfileStatusModal(false);
        setProfileNewStatus('');
        setProfileStatusNotes('');
      } else {
        showNotification('Error al actualizar estatus del perfil', 'error');
      }
    } catch (error) {
      console.error('Error updating profile status:', error);
      showNotification('Error al actualizar estatus del perfil', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================
  // ACTIONS - CANDIDATOS
  // ============================================================
  
  const handleSelectApplication = (appId: number) => {
    const newSelected = new Set(selectedApplications);
    if (newSelected.has(appId)) {
      newSelected.delete(appId);
    } else {
      newSelected.add(appId);
    }
    setSelectedApplications(newSelected);
  };
  
  const handleSelectAllApplications = () => {
    const filteredApps = applications.filter(app => {
      if (candidateSearchTerm) {
        const searchLower = candidateSearchTerm.toLowerCase();
        return app.candidate_name?.toLowerCase().includes(searchLower) ||
               app.candidate_email?.toLowerCase().includes(searchLower);
      }
      return true;
    });
    
    const allSelected = filteredApps.every(app => selectedApplications.has(app.id));
    const newSelected = new Set(selectedApplications);
    
    if (allSelected) {
      filteredApps.forEach(app => newSelected.delete(app.id));
    } else {
      filteredApps.forEach(app => newSelected.add(app.id));
    }
    
    setSelectedApplications(newSelected);
  };
  
  const handleViewCandidate = async (candidateId: number) => {
    await loadCandidateDetail(candidateId);
    setShowCandidateModal(true);
  };
  
  const handleUpdateCandidateStatus = async () => {
    if (!candidateNewStatus) {
      showNotification('Selecciona un estado', 'error');
      return;
    }
    
    const appsToUpdate = Array.from(selectedApplications);
    
    if (appsToUpdate.length === 0) {
      showNotification('Selecciona al menos un candidato', 'error');
      return;
    }
    
    if (candidateNewStatus === 'rejected' && !rejectionReason) {
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
            status: candidateNewStatus,
            notes: candidateStatusNotes,
            rejection_reason: candidateNewStatus === 'rejected' ? rejectionReason : '',
          }),
        })
      );
      
      const results = await Promise.all(promises);
      const allSuccess = results.every(r => r.ok);
      
      if (allSuccess) {
        showNotification(`${appsToUpdate.length} candidato(s) actualizado(s)`, 'success');
        if (selectedProfile) {
          await loadApplications(selectedProfile.id);
        }
        setShowCandidateStatusModal(false);
        setCandidateNewStatus('');
        setCandidateStatusNotes('');
        setRejectionReason('');
        setSelectedApplications(new Set());
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
  
  const filteredApplications = applications.filter(app => {
    if (candidateSearchTerm) {
      const searchLower = candidateSearchTerm.toLowerCase();
      return app.candidate_name?.toLowerCase().includes(searchLower) ||
             app.candidate_email?.toLowerCase().includes(searchLower);
    }
    return true;
  });

  // ============================================================
  // HELPERS
  // ============================================================
  
  const showNotification = async (message: string, type: 'success' | 'error') => {
    console.log(`[${type}] ${message}`);
    await showAlert(message);
  };
  
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      applied: 'bg-blue-100 text-blue-800',
      screening: 'bg-yellow-100 text-yellow-800',
      shortlisted: 'bg-purple-100 text-purple-800',
      interview_scheduled: 'bg-indigo-100 text-indigo-800',
      interviewed: 'bg-cyan-100 text-cyan-800',
      offered: 'bg-green-100 text-green-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      withdrawn: 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };
  
  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      applied: 'Aplicó',
      screening: 'En Revisión',
      shortlisted: 'Preseleccionado',
      interview_scheduled: 'Entrevista Programada',
      interviewed: 'Entrevistado',
      offered: 'Oferta Extendida',
      accepted: 'Oferta Aceptada',
      rejected: 'Rechazado',
      withdrawn: 'Retirado',
    };
    return labels[status] || status;
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

  // ============================================================
  // RENDER
  // ============================================================
  
  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Estatus de Candidatos</h1>
            <p className="text-gray-600 mt-1">Gestiona los candidatos aplicando a los perfiles</p>
          </div>
          <button
            onClick={loadProfiles}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <i className="fas fa-sync mr-2" />
            Actualizar
          </button>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-blue-600 text-sm font-medium">Perfiles Activos</div>
            <div className="text-xl font-bold text-gray-900">{formatNumber(profiles.length)}</div>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg">
            <div className="text-orange-600 text-sm font-medium">Aplicaciones</div>
            <div className="text-xl font-bold text-gray-900">{formatNumber(applications.length)}</div>
          </div>
          <div className="bg-green-50 p-3 rounded-lg">
            <div className="text-green-600 text-sm font-medium">Contratados</div>
            <div className="text-xl font-bold text-gray-900">{formatNumber(applications.filter(a => a.status === 'hired').length)}</div>
          </div>
          <div className="bg-yellow-50 p-3 rounded-lg">
            <div className="text-yellow-600 text-sm font-medium"></div>
            <div className="text-xl font-bold text-gray-900">{formatNumber(applications.filter(a => a.status === 'in_evaluation').length)}</div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Perfiles */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-sm font-semibold text-gray-900 mb-3">PERFILES CON CANDIDATOS</h2>
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Profiles List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : filteredProfiles.length === 0 ? (
              <div className="text-center py-12 px-4">
                <i className="fas fa-inbox text-gray-400 text-4xl mb-3" />
                <p className="text-gray-600 text-sm">No se encontraron perfiles</p>
              </div>
            ) : (
              <div className="p-2">
                {filteredProfiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => setSelectedProfile(profile)}
                    className={`w-full text-left p-4 rounded-lg mb-2 transition-colors ${
                      selectedProfile?.id === profile.id
                        ? 'bg-blue-50 border-2 border-blue-500'
                        : 'bg-white border border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-medium text-gray-900 text-sm leading-tight flex-1">
                        {profile.position_title}
                      </h3>
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
                        {formatNumber(applications.filter(app => app.profile === profile.id).length || 0)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{profile.client_name}</p>
                    <p className="text-xs text-gray-500">
                      {profile.location_city}, {profile.location_state}
                    </p>
                  </button>
                ))}
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
                  <button
                    onClick={() => setShowProfileStatusModal(true)}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                  >
                    <i className="fas fa-edit mr-2" />
                    Estatus del Perfil
                  </button>
                </div>

                {/* Search Bar */}
                <div className="relative">
                  <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={candidateSearchTerm}
                    onChange={(e) => setCandidateSearchTerm(e.target.value)}
                    placeholder="Buscar por nombre o email..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Actions Bar */}
              {selectedApplications.size > 0 && (
                <div className="bg-blue-50 border-b border-blue-200 px-6 py-3 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm font-medium text-blue-900">
                      {formatNumber(selectedApplications.size)} candidato(s) seleccionado(s)
                    </span>
                    <button
                      onClick={() => setSelectedApplications(new Set())}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      Limpiar selección
                    </button>
                  </div>
                  <button
                    onClick={() => setShowCandidateStatusModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <i className="fas fa-edit mr-2" />
                    Cambiar Estatus
                  </button>
                </div>
              )}

              {/* Candidates List */}
              <div className="flex-1 overflow-y-auto p-6">
                {loadingApplications ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Cargando candidatos...</span>
                  </div>
                ) : filteredApplications.length === 0 ? (
                  <div className="text-center py-12">
                    <i className="fas fa-users text-gray-400 text-5xl mb-4" />
                    <p className="text-gray-600">No hay candidatos para este perfil</p>
                  </div>
                ) : (
                  <>
                    {/* Select All */}
                    <div className="mb-4">
                      <button
                        onClick={handleSelectAllApplications}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-blue-50 text-gray-600 hover:text-blue-700"
                      >
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          filteredApplications.length > 0 && filteredApplications.every(app => selectedApplications.has(app.id))
                            ? 'border-blue-500 bg-blue-500' : 'border-gray-300'
                        }`}>
                          {filteredApplications.length > 0 && filteredApplications.every(app => selectedApplications.has(app.id)) && (
                            <i className="fas fa-check text-white text-[9px]" />
                          )}
                        </div>
                        Seleccionar todos
                      </button>
                    </div>

                    {/* Candidates Grid */}
                    <div className="grid grid-cols-1 gap-4">
                      {filteredApplications.map((app) => (
                        <div
                          key={app.id}
                          className={`group bg-white rounded-lg border-2 p-4 transition-all duration-200 cursor-pointer ${
                            selectedApplications.has(app.id)
                              ? 'border-blue-500 shadow-md bg-blue-50/50 scale-[1.01]'
                              : 'border-gray-200 hover:border-blue-300 hover:shadow-sm hover:scale-[1.005]'
                          }`}
                          onClick={() => handleSelectApplication(app.id)}
                          title={selectedApplications.has(app.id) ? 'Click para deseleccionar' : 'Click para seleccionar'}
                        >
                          <div className="flex items-start space-x-3">

                            {/* Selection indicator */}
                            <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200 shrink-0 mt-0.5 ${
                              selectedApplications.has(app.id)
                                ? 'border-blue-500 bg-blue-500 scale-110'
                                : 'border-gray-300 opacity-0 group-hover:opacity-100 group-hover:border-blue-400 group-hover:scale-105'
                            }`}>
                              {selectedApplications.has(app.id) ? (
                                <i className="fas fa-check text-white text-[10px]" />
                              ) : (
                                <i className="fas fa-plus text-blue-400 text-[10px]" />
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                  <h3 className="font-semibold text-gray-900 text-lg">
                                    {app.candidate_name}
                                  </h3>
                                  <p className="text-sm text-gray-600">{app.candidate_email}</p>
                                </div>
                                <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getStatusColor(app.status)}`}>
                                  {getStatusLabel(app.status)}
                                </span>
                              </div>

                              <div className="flex items-center space-x-6 mt-3">
                                {app.match_percentage && (
                                  <div className="flex items-center">
                                    <i className="fas fa-chart-line text-blue-600 mr-2" />
                                    <span className="text-sm font-medium text-gray-900">
                                      Match: {app.match_percentage}%
                                    </span>
                                  </div>
                                )}
                                {app.overall_rating && (
                                  <div className="flex items-center">
                                    <i className="fas fa-star text-yellow-500 mr-2" />
                                    <span className="text-sm font-medium text-gray-900">
                                      Rating: {formatNumber(app.overall_rating)}/10
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center text-sm text-gray-500">
                                  <i className="fas fa-calendar mr-2" />
                                  Aplicó: {new Date(app.applied_at).toLocaleDateString()}
                                </div>
                              </div>

                              {app.notes && (
                                <p className="mt-3 text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                  <i className="fas fa-sticky-note mr-2 text-gray-400" />
                                  {app.notes}
                                </p>
                              )}

                              {app.rejection_reason && (
                                <p className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded">
                                  <i className="fas fa-exclamation-triangle mr-2" />
                                  <strong>Rechazado:</strong> {app.rejection_reason}
                                </p>
                              )}
                            </div>

                            {/* Action Button */}
                            <button
                              onClick={(e) => { e.stopPropagation(); handleViewCandidate(app.candidate); }}
                              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                              title="Ver perfil completo"
                            >
                              <i className="fas fa-eye mr-2" />
                              Ver Perfil
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <i className="fas fa-arrow-left text-gray-400 text-5xl mb-4" />
                <p className="text-gray-600">Selecciona un perfil para ver sus candidatos</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Cambiar Estatus del Perfil */}
      {showProfileStatusModal && selectedProfile && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={() => { setShowProfileStatusModal(false); setProfileNewStatus(''); setProfileStatusNotes(''); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl flex flex-col"
            style={{ width: '95vw', height: '92vh', maxWidth: '750px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-purple-600 to-violet-700 text-white px-8 py-5 flex justify-between items-center rounded-t-2xl">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <i className="fas fa-exchange-alt"></i>
                  Cambiar Estatus del Perfil
                </h2>
                <p className="text-purple-100 text-sm mt-1">Selecciona el nuevo estado para este perfil de reclutamiento</p>
              </div>
              <button
                onClick={() => { setShowProfileStatusModal(false); setProfileNewStatus(''); setProfileStatusNotes(''); }}
                className="text-white hover:bg-purple-800 rounded-full w-10 h-10 flex items-center justify-center transition"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {/* Profile Info */}
              <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <i className="fas fa-briefcase text-purple-600"></i>
                  Información del Perfil
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Perfil</label>
                    <p className="text-base font-semibold text-gray-900">{selectedProfile.position_title}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Estado Actual</label>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-purple-100 text-purple-800">
                      {selectedProfile.status_display}
                    </span>
                  </div>
                </div>
              </div>

              {/* New Status */}
              <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <i className="fas fa-list-alt text-gray-600"></i>
                  Nuevo Estado
                </h3>
                <select
                  value={profileNewStatus}
                  onChange={(e) => setProfileNewStatus(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                >
                  <option value="">Seleccionar estado...</option>
                  <option value="draft">Borrador</option>
                  <option value="pending">Pendiente</option>
                  <option value="approved">Aprobado</option>
                  <option value="in_progress">En Proceso</option>
                  <option value="candidates_found">Candidatos Encontrados</option>
                  <option value="in_evaluation">Aplicación de Pruebas</option>
                  <option value="in_interview">En Entrevistas</option>
                  <option value="finalists">Finalistas</option>
                  <option value="completed">Completado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>

              {/* Notes */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <i className="fas fa-sticky-note text-blue-600"></i>
                  Notas <span className="text-sm font-normal text-gray-500">(opcional)</span>
                </h3>
                <textarea
                  value={profileStatusNotes}
                  onChange={(e) => setProfileStatusNotes(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  placeholder="Agrega notas sobre este cambio..."
                />
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex-shrink-0 px-8 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end gap-4">
              <button
                onClick={() => { setShowProfileStatusModal(false); setProfileNewStatus(''); setProfileStatusNotes(''); }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateProfileStatus}
                disabled={actionLoading}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-violet-700 text-white rounded-xl hover:from-purple-700 hover:to-violet-800 font-semibold shadow-lg transition flex items-center gap-2 disabled:opacity-50"
              >
                <i className={`fas ${actionLoading ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
                {actionLoading ? 'Actualizando...' : 'Actualizar Estatus'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Cambiar Estatus de Candidatos */}
      {showCandidateStatusModal && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={() => { setShowCandidateStatusModal(false); setCandidateNewStatus(''); setCandidateStatusNotes(''); setRejectionReason(''); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl flex flex-col"
            style={{ width: '95vw', height: '92vh', maxWidth: '750px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Header */}
            <div className={`flex-shrink-0 text-white px-8 py-5 flex justify-between items-center rounded-t-2xl ${
              candidateNewStatus === 'rejected'
                ? 'bg-gradient-to-r from-red-500 to-rose-600'
                : 'bg-gradient-to-r from-blue-600 to-indigo-700'
            }`}>
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <i className="fas fa-users-cog"></i>
                  Cambiar Estatus de Candidatos
                </h2>
                <p className={`text-sm mt-1 ${candidateNewStatus === 'rejected' ? 'text-red-100' : 'text-blue-100'}`}>
                  Actualizando <strong>{formatNumber(selectedApplications.size)}</strong> candidato(s) seleccionado(s)
                </p>
              </div>
              <button
                onClick={() => { setShowCandidateStatusModal(false); setCandidateNewStatus(''); setCandidateStatusNotes(''); setRejectionReason(''); }}
                className={`text-white rounded-full w-10 h-10 flex items-center justify-center transition ${
                  candidateNewStatus === 'rejected' ? 'hover:bg-red-700' : 'hover:bg-blue-800'
                }`}
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {/* New Status */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <i className="fas fa-list-alt text-blue-600"></i>
                  Nuevo Estatus
                </h3>
                <select
                  value={candidateNewStatus}
                  onChange={(e) => setCandidateNewStatus(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
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

              {/* Rejection reason (conditional) */}
              {candidateNewStatus === 'rejected' && (
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
                  value={candidateStatusNotes}
                  onChange={(e) => setCandidateStatusNotes(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder="Agrega notas sobre este cambio..."
                />
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex-shrink-0 px-8 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end gap-4">
              <button
                onClick={() => { setShowCandidateStatusModal(false); setCandidateNewStatus(''); setCandidateStatusNotes(''); setRejectionReason(''); }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleUpdateCandidateStatus}
                disabled={actionLoading}
                className={`px-6 py-3 text-white rounded-xl font-semibold shadow-lg transition flex items-center gap-2 disabled:opacity-50 ${
                  candidateNewStatus === 'rejected'
                    ? 'bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700'
                    : 'bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800'
                }`}
              >
                <i className={`fas ${actionLoading ? 'fa-spinner fa-spin' : 'fa-check'}`}></i>
                {actionLoading ? 'Actualizando...' : 'Actualizar Estatus'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Perfil de Candidato */}
      {showCandidateModal && selectedCandidate && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={() => { setShowCandidateModal(false); setSelectedCandidate(null); setCandidateDocuments([]); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl flex flex-col"
            style={{ width: '95vw', height: '92vh', maxWidth: '1000px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-slate-700 to-slate-900 text-white px-8 py-5 flex justify-between items-center rounded-t-2xl">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center">
                    <i className="fas fa-user text-lg"></i>
                  </div>
                  {selectedCandidate.full_name}
                </h2>
                <p className="text-slate-300 text-sm mt-1 ml-14">{selectedCandidate.current_position} en {selectedCandidate.current_company}</p>
              </div>
              <button
                onClick={() => { setShowCandidateModal(false); setSelectedCandidate(null); setCandidateDocuments([]); }}
                className="text-white hover:bg-slate-600 rounded-full w-10 h-10 flex items-center justify-center transition"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {/* Info Grid — 2 cards side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Contact Info Card */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <i className="fas fa-address-card text-blue-600"></i>
                    Información de Contacto
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <i className="fas fa-envelope text-blue-600 text-sm"></i>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</p>
                        <p className="font-medium text-gray-900 break-all">{selectedCandidate.email}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <i className="fas fa-phone text-blue-600 text-sm"></i>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Teléfono</p>
                        <p className="font-medium text-gray-900">{selectedCandidate.phone || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <i className="fas fa-map-marker-alt text-blue-600 text-sm"></i>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ubicación</p>
                        <p className="font-medium text-gray-900">{selectedCandidate.city}, {selectedCandidate.state}</p>
                      </div>
                    </div>
                    {selectedCandidate.linkedin_url && (
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <i className="fab fa-linkedin text-blue-600 text-sm"></i>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">LinkedIn</p>
                          <a href={selectedCandidate.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                            Ver perfil <i className="fas fa-external-link-alt text-xs ml-1"></i>
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Experience & Education Card */}
                <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-6 border border-purple-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
                    <i className="fas fa-graduation-cap text-purple-600"></i>
                    Experiencia y Educación
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <i className="fas fa-clock text-purple-600 text-sm"></i>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Años de Experiencia</p>
                        <p className="font-medium text-gray-900">{formatNumber(selectedCandidate.years_of_experience)} años</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <i className="fas fa-user-graduate text-purple-600 text-sm"></i>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nivel de Educación</p>
                        <p className="font-medium text-gray-900">{selectedCandidate.education_level}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <i className="fas fa-dollar-sign text-purple-600 text-sm"></i>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Expectativa Salarial</p>
                        <p className="font-medium text-gray-900">
                          ${formatNumber(selectedCandidate.salary_expectation_min ?? 0)} - ${formatNumber(selectedCandidate.salary_expectation_max ?? 0)} {selectedCandidate.salary_currency}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Skills */}
              {selectedCandidate.skills.length > 0 && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <i className="fas fa-tools text-green-600"></i>
                    Habilidades
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedCandidate.skills.map((skill, idx) => (
                      <span key={idx} className="px-4 py-1.5 bg-white border border-green-300 text-green-800 text-sm rounded-full font-medium shadow-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <i className="fas fa-folder-open text-amber-600"></i>
                  Documentos
                  {candidateDocuments.length > 0 && (
                    <span className="ml-2 px-2.5 py-0.5 bg-amber-200 text-amber-800 text-xs rounded-full font-bold">
                      {candidateDocuments.length}
                    </span>
                  )}
                </h3>
                {candidateDocuments.length === 0 ? (
                  <div className="text-center py-8">
                    <i className="fas fa-file-excel text-amber-300 text-4xl mb-3"></i>
                    <p className="text-gray-500 font-medium">No hay documentos disponibles</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {candidateDocuments.map((doc) => (
                      <div key={doc.id} className="flex items-center justify-between bg-white p-4 rounded-xl border border-amber-200 hover:shadow-md transition">
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <i className={`fas ${getDocumentIcon(doc.document_type)} ${getDocumentColor(doc.document_type)} text-lg`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate text-sm">{doc.original_filename}</p>
                            <p className="text-xs text-gray-500">{doc.description || 'Sin descripción'}</p>
                          </div>
                        </div>
                        <div className="flex space-x-1 ml-2">
                          <button
                            onClick={() => handlePreviewDocument(doc)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Vista previa"
                          >
                            <i className="fas fa-eye" />
                          </button>
                          <a
                            href={doc.file_url}
                            download
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition"
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
            </div>

            {/* Fixed Footer */}
            <div className="flex-shrink-0 px-8 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end gap-4">
              <button
                onClick={() => { setShowCandidateModal(false); setSelectedCandidate(null); setCandidateDocuments([]); }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-semibold transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Vista Previa de Documento */}
      {showDocumentPreview && previewDocument && createPortal(
        <div
          className="fixed inset-0 flex items-center justify-center p-4"
          style={{ zIndex: 10000, backgroundColor: 'rgba(0, 0, 0, 0.7)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={() => { setShowDocumentPreview(false); setPreviewDocument(null); }}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl flex flex-col"
            style={{ width: '95vw', height: '92vh', maxWidth: '1000px' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Fixed Header */}
            <div className="flex-shrink-0 bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-8 py-5 flex justify-between items-center rounded-t-2xl">
              <div className="min-w-0 flex-1 mr-4">
                <h2 className="text-2xl font-bold flex items-center gap-2 truncate">
                  <i className="fas fa-file-alt"></i>
                  Vista Previa
                </h2>
                <p className="text-teal-100 text-sm mt-1 truncate">{previewDocument.original_filename}</p>
              </div>
              <button
                onClick={() => { setShowDocumentPreview(false); setPreviewDocument(null); }}
                className="text-white hover:bg-teal-800 rounded-full w-10 h-10 flex items-center justify-center transition flex-shrink-0"
              >
                <i className="fas fa-times text-xl"></i>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="bg-gray-50 rounded-xl border border-gray-200 min-h-[400px] flex items-center justify-center">
                {previewDocument.file_url.endsWith('.pdf') ? (
                  <iframe
                    src={previewDocument.file_url}
                    className="w-full h-[65vh] rounded-xl"
                    title="Vista previa PDF"
                  />
                ) : previewDocument.file_url.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                  <img
                    src={previewDocument.file_url}
                    alt={previewDocument.original_filename}
                    className="max-w-full max-h-[65vh] rounded-xl mx-auto object-contain"
                  />
                ) : (
                  <div className="text-center py-12">
                    <i className="fas fa-file text-gray-300 text-6xl mb-4"></i>
                    <p className="text-gray-500 font-medium mb-4">Vista previa no disponible para este tipo de archivo</p>
                    <a
                      href={previewDocument.file_url}
                      download
                      className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl hover:from-teal-700 hover:to-cyan-700 font-semibold shadow-lg transition"
                    >
                      <i className="fas fa-download"></i>
                      Descargar Archivo
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex-shrink-0 px-8 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end gap-4">
              <button
                onClick={() => { setShowDocumentPreview(false); setPreviewDocument(null); }}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-semibold transition"
              >
                Cerrar
              </button>
              <a
                href={previewDocument.file_url}
                download
                className="px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl hover:from-teal-700 hover:to-cyan-700 font-semibold shadow-lg transition flex items-center gap-2"
              >
                <i className="fas fa-download"></i>
                Descargar
              </a>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

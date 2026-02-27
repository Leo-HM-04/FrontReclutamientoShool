'use client';

/**
 * ============================================================
 * PROFILES STATUS DASHBOARD
 * ============================================================
 * Dashboard para gestión de estados de perfiles de reclutamiento
 * - Tabla con vista expandible
 * - Actualización masiva de estados
 * - Aprobación de cliente (individual y masiva)
 * - Campo de plataformas de publicación (solo cuando status = 'in_progress')
 */

import React, { useState, useEffect } from 'react';
import { useModal } from '@/context/ModalContext';
import Pagination from './ui/Pagination';

// ============================================================
// INTERFACES
// ============================================================

interface Profile {
  id: number;
  position_title: string;
  client: number;
  client_name: string;
  status: string;
  status_display: string;
  priority: string;
  priority_display: string;
  service_type: string;
  service_type_display: string;
  location_city: string;
  location_state: string;
  salary_min: string;
  salary_max: string;
  salary_currency: string;
  number_of_positions: number;
  client_approved: boolean;
  published_platforms: (string | PublishedPlatform)[];
  assigned_to?: number;
  assigned_to_name?: string;
  created_at: string;
  updated_at: string;
}

interface PublishedPlatform {
  platform: string;
  url: string;
  published_date: string;
  published_by: number;
  status: string;
}

interface ProfileDetail extends Profile {
  department: string;
  position_description: string;
  is_remote: boolean;
  is_hybrid: boolean;
  education_level: string;
  years_experience: number;
  technical_skills: string[];
  soft_skills: string[];
  languages: any[];
  benefits: string;
  deadline: string;
  internal_notes: string;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function ProfilesStatusDashboard() {
  const { showAlert } = useModal();
  // Estado de datos
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [selectedProfiles, setSelectedProfiles] = useState<Set<number>>(new Set());
  const [expandedProfile, setExpandedProfile] = useState<number | null>(null);
  const [profileDetail, setProfileDetail] = useState<ProfileDetail | null>(null);
  
  // Estado de UI
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Filtros
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    priority: 'all',
    client_approved: 'all',
  });
  
  // Modales
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showPlatformModal, setShowPlatformModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedProfileForPlatform, setSelectedProfileForPlatform] = useState<number | null>(null);
  
  // Formularios
  const [newStatus, setNewStatus] = useState('');
  const [statusNotes, setStatusNotes] = useState('');
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalFeedback, setApprovalFeedback] = useState('');
  const [platformForm, setPlatformForm] = useState({
    platform: '',
    url: '',
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
        setProfiles(data.results || data);
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
  
  const loadProfileDetail = async (profileId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/profiles/profiles/${profileId}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfileDetail(data);
      }
    } catch (error) {
      console.error('Error loading profile detail:', error);
    }
  };

  // ============================================================
  // ACTIONS
  // ============================================================
  
  const handleSelectProfile = (profileId: number) => {
    const newSelected = new Set(selectedProfiles);
    if (newSelected.has(profileId)) {
      newSelected.delete(profileId);
    } else {
      newSelected.add(profileId);
    }
    setSelectedProfiles(newSelected);
  };
  
  const handleSelectAll = () => {
    if (selectedProfiles.size === filteredProfiles.length) {
      setSelectedProfiles(new Set());
    } else {
      setSelectedProfiles(new Set(filteredProfiles.map(p => p.id)));
    }
  };
  
  const handleExpandProfile = async (profileId: number) => {
    if (expandedProfile === profileId) {
      setExpandedProfile(null);
      setProfileDetail(null);
    } else {
      setExpandedProfile(profileId);
      await loadProfileDetail(profileId);
    }
  };
  
  // Actualizar estado (individual o masivo)
  const handleUpdateStatus = async () => {
    if (!newStatus) {
      showNotification('Selecciona un estado', 'error');
      return;
    }
    
    const profilesToUpdate = selectedProfiles.size > 0 
      ? Array.from(selectedProfiles) 
      : expandedProfile ? [expandedProfile] : [];
    
    if (profilesToUpdate.length === 0) {
      showNotification('Selecciona al menos un perfil', 'error');
      return;
    }
    
    setActionLoading(true);
    
    try {
      const token = localStorage.getItem('authToken');
      
      // Si el estado es "in_progress" y hay datos de plataforma, actualizar ambos
      if (newStatus === 'in_progress' && platformForm.platform) {
        const promises = profilesToUpdate.map(async (profileId) => {
          // Primero cambiar el estado
          const statusResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/profiles/profiles/${profileId}/change_status/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: newStatus,
              notes: statusNotes,
            }),
          });
          
          if (!statusResponse.ok) return statusResponse;
          
          // Luego agregar la plataforma
          const profile = profiles.find(p => p.id === profileId);
          const newPlatform: PublishedPlatform = {
            platform: platformForm.platform,
            url: platformForm.url,
            published_date: new Date().toISOString(),
            published_by: parseInt(localStorage.getItem('userId') || '0'),
            status: 'active',
          };
          
          const currentPlatforms = profile?.published_platforms || [];
          const updatedPlatforms = [...currentPlatforms, newPlatform];
          
          return fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/profiles/profiles/${profileId}/`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              published_platforms: updatedPlatforms,
            }),
          });
        });
        
        const results = await Promise.all(promises);
        const allSuccess = results.every(r => r.ok);
        
        if (allSuccess) {
          showNotification(`${profilesToUpdate.length} perfil(es) actualizado(s) con plataforma`, 'success');
          await loadProfiles();
          setShowStatusModal(false);
          setNewStatus('');
          setStatusNotes('');
          setPlatformForm({ platform: '', url: '' });
          setSelectedProfiles(new Set());
        } else {
          showNotification('Error al actualizar algunos perfiles', 'error');
        }
      } else {
        // Solo cambiar el estado
        const promises = profilesToUpdate.map(profileId =>
          fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/profiles/profiles/${profileId}/change_status/`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: newStatus,
              notes: statusNotes,
            }),
          })
        );
        
        const results = await Promise.all(promises);
        const allSuccess = results.every(r => r.ok);
        
        if (allSuccess) {
          showNotification(`${profilesToUpdate.length} perfil(es) actualizado(s)`, 'success');
          await loadProfiles();
          setShowStatusModal(false);
          setNewStatus('');
          setStatusNotes('');
          setSelectedProfiles(new Set());
        } else {
          showNotification('Error al actualizar algunos perfiles', 'error');
        }
      }
    } catch (error) {
      console.error('Error updating status:', error);
      showNotification('Error al actualizar estado', 'error');
    } finally {
      setActionLoading(false);
    }
  };
  
  // Aprobar/Rechazar por cliente (individual o masivo)
  const handleToggleClientApproval = async (profileId?: number) => {
    const profilesToUpdate = profileId 
      ? [profileId] 
      : Array.from(selectedProfiles);
    
    if (profilesToUpdate.length === 0) {
      showNotification('Selecciona al menos un perfil', 'error');
      return;
    }
    
    setActionLoading(true);
    
    try {
      const token = localStorage.getItem('authToken');
      const promises = profilesToUpdate.map(async (id) => {
        return fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/profiles/profiles/${id}/approve/`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            approved: approvalAction === 'approve',
            feedback: approvalFeedback,
          }),
        });
      });
      
      const results = await Promise.all(promises);
      const allSuccess = results.every(r => r.ok);
      
      if (allSuccess) {
        showNotification(`${profilesToUpdate.length} perfil(es) actualizado(s)`, 'success');
        await loadProfiles();
        setShowApprovalModal(false);
        setApprovalFeedback('');
        setSelectedProfiles(new Set());
      } else {
        showNotification('Error al actualizar algunos perfiles', 'error');
      }
    } catch (error) {
      console.error('Error updating approval:', error);
      showNotification('Error al actualizar aprobación', 'error');
    } finally {
      setActionLoading(false);
    }
  };
  
  // Agregar plataforma de publicación
  const handleAddPlatform = async () => {
    if (!platformForm.platform || !selectedProfileForPlatform) {
      showNotification('Completa todos los campos', 'error');
      return;
    }
    
    const profile = profiles.find(p => p.id === selectedProfileForPlatform);
    if (profile?.status !== 'in_progress') {
      showNotification('Solo puedes agregar plataformas cuando el perfil está "En Proceso"', 'error');
      return;
    }
    
    setActionLoading(true);
    
    try {
      const token = localStorage.getItem('authToken');
      const newPlatform: PublishedPlatform = {
        platform: platformForm.platform,
        url: platformForm.url,
        published_date: new Date().toISOString(),
        published_by: parseInt(localStorage.getItem('userId') || '0'),
        status: 'active',
      };
      
      const currentPlatforms = profile?.published_platforms || [];
      const updatedPlatforms = [...currentPlatforms, newPlatform];
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/profiles/profiles/${selectedProfileForPlatform}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          published_platforms: updatedPlatforms,
        }),
      });
      
      if (response.ok) {
        showNotification('Plataforma agregada correctamente', 'success');
        await loadProfiles();
        setShowPlatformModal(false);
        setPlatformForm({ platform: '', url: '' });
        setSelectedProfileForPlatform(null);
      } else {
        showNotification('Error al agregar plataforma', 'error');
      }
    } catch (error) {
      console.error('Error adding platform:', error);
      showNotification('Error al agregar plataforma', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // ============================================================
  // FILTERS
  // ============================================================
  
  const filteredProfiles = profiles.filter(profile => {
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      if (!profile.position_title.toLowerCase().includes(searchLower) &&
          !profile.client_name.toLowerCase().includes(searchLower)) {
        return false;
      }
    }
    
    if (filters.status !== 'all' && profile.status !== filters.status) {
      return false;
    }
    
    if (filters.priority !== 'all' && profile.priority !== filters.priority) {
      return false;
    }
    
    if (filters.client_approved !== 'all') {
      const approved = filters.client_approved === 'true';
      if (profile.client_approved !== approved) {
        return false;
      }
    }
    
    return true;
  });

  // ============================================================
  // HELPERS
  // ============================================================
  
  const showNotification = async (message: string, type: 'success' | 'error') => {
    // Implementar tu sistema de notificaciones aquí
    console.log(`[${type}] ${message}`);
    await showAlert(message);
  };
  
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      draft: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      in_progress: 'bg-blue-100 text-blue-800',
      candidates_found: 'bg-purple-100 text-purple-800',
      in_evaluation: 'bg-orange-100 text-orange-800',
      in_interview: 'bg-indigo-100 text-indigo-800',
      finalists: 'bg-pink-100 text-pink-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };
  
  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'text-gray-600',
      medium: 'text-blue-600',
      high: 'text-orange-600',
      urgent: 'text-red-600',
    };
    return colors[priority] || 'text-gray-600';
  };

  // ============================================================
  // RENDER
  // ============================================================
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Estatus de Perfiles</h2>
          <p className="text-gray-600 mt-1">Gestiona el estatus y aprobación de perfiles de reclutamiento</p>
        </div>
        <button
          onClick={loadProfiles}
          className="mt-4 sm:mt-0 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <i className="fas fa-sync mr-2" />
          Actualizar
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-blue-600 text-sm font-medium">Total Perfiles</div>
          <div className="text-2xl font-bold text-gray-900">{formatNumber(profiles.length)}</div>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-green-600 text-sm font-medium">En Proceso</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatNumber(profiles.filter(p => p.status === 'in_progress').length)}
          </div>
        </div>
        
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="text-purple-600 text-sm font-medium">Aprobados por Cliente</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatNumber(profiles.filter(p => p.client_approved).length)}
          </div>
        </div>
        
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-orange-600 text-sm font-medium">Seleccionados</div>
          <div className="text-2xl font-bold text-gray-900">{formatNumber(selectedProfiles.size)}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Título o cliente..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Estatus</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos</option>
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
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Prioridad</label>
            <select
              value={filters.priority}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas</option>
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="urgent">Urgente</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Aprobación</label>
            <select
              value={filters.client_approved}
              onChange={(e) => setFilters({ ...filters, client_approved: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos</option>
              <option value="true">Aprobados</option>
              <option value="false">Pendientes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Actions Bar */}
      {selectedProfiles.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-blue-900">
              {selectedProfiles.size} perfil(es) seleccionado(s)
            </span>
            <button
              onClick={() => setSelectedProfiles(new Set())}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Limpiar selección
            </button>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowStatusModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <i className="fas fa-edit mr-2" />
              Cambiar Estado
            </button>
            <button
              onClick={() => setShowApprovalModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <i className="fas fa-check mr-2" />
              Aprobar/Rechazar
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Cargando perfiles...</span>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="text-center py-12">
            <i className="fas fa-inbox text-gray-400 text-5xl mb-4" />
            <p className="text-gray-600">No se encontraron perfiles</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left w-10">
                    <button
                      onClick={handleSelectAll}
                      className="w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110"
                      style={{
                        borderColor: selectedProfiles.size === filteredProfiles.length && filteredProfiles.length > 0 ? '#3B82F6' : '#D1D5DB',
                        backgroundColor: selectedProfiles.size === filteredProfiles.length && filteredProfiles.length > 0 ? '#3B82F6' : 'transparent',
                      }}
                      title="Seleccionar todos"
                    >
                      {selectedProfiles.size === filteredProfiles.length && filteredProfiles.length > 0 && (
                        <i className="fas fa-check text-white text-[10px]" />
                      )}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Posición
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estatus
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prioridad
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aprobado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vacantes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProfiles
                  .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                  .map((profile) => (
                  <React.Fragment key={profile.id}>
                    <tr
                      className={`group cursor-pointer transition-all duration-200 ${
                        selectedProfiles.has(profile.id)
                          ? 'bg-blue-50 hover:bg-blue-100'
                          : 'hover:bg-gray-50'
                      }`}
                      onClick={() => handleSelectProfile(profile.id)}
                      title={selectedProfiles.has(profile.id) ? 'Click para deseleccionar' : 'Click para seleccionar'}
                    >
                      <td className="px-4 py-4">
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                          selectedProfiles.has(profile.id)
                            ? 'border-blue-500 bg-blue-500 scale-110'
                            : 'border-gray-300 group-hover:border-blue-400 group-hover:scale-105'
                        }`}>
                          {selectedProfiles.has(profile.id) ? (
                            <i className="fas fa-check text-white text-[10px]" />
                          ) : (
                            <i className="fas fa-plus text-gray-400 text-[9px] opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{profile.position_title}</p>
                          <p className="text-xs text-gray-500">{profile.location_city}, {profile.location_state}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{profile.client_name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(profile.status)}`}>
                          {profile.status_display}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-medium ${getPriorityColor(profile.priority)}`}>
                          <i className="fas fa-flag mr-1" />
                          {profile.priority_display}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {profile.client_approved ? (
                          <span className="text-green-600">
                            <i className="fas fa-check-circle mr-1" />
                            Aprobado
                          </span>
                        ) : (
                          <span className="text-gray-400">
                            <i className="fas fa-clock mr-1" />
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{formatNumber(profile.number_of_positions)}</td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleExpandProfile(profile.id)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Ver detalles"
                          >
                            <i className={`fas fa-chevron-${expandedProfile === profile.id ? 'up' : 'down'}`} />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedProfiles(new Set([profile.id]));
                              setApprovalAction(profile.client_approved ? 'reject' : 'approve');
                              setShowApprovalModal(true);
                            }}
                            className="text-green-600 hover:text-green-800"
                            title="Aprobar/Rechazar"
                          >
                            <i className="fas fa-check" />
                          </button>
                          {profile.status === 'in_progress' && (
                            <button
                              onClick={() => {
                                setSelectedProfileForPlatform(profile.id);
                                setPlatformForm({ platform: '', url: '' });
                                setShowPlatformModal(true);
                              }}
                              className="text-purple-600 hover:text-purple-800"
                              title="Agregar plataforma"
                            >
                              <i className="fas fa-plus-circle" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expanded Detail Row */}
                    {expandedProfile === profile.id && profileDetail && (
                      <tr className="bg-gray-50">
                        <td colSpan={8} className="px-6 py-4">
                          <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Información General</h4>
                                <div className="space-y-2 text-sm">
                                  <p><span className="font-medium">Departamento:</span> {profileDetail.department || 'N/A'}</p>
                                  <p><span className="font-medium">Tipo de Servicio:</span> {profileDetail.service_type_display}</p>
                                  <p><span className="font-medium">Educación:</span> {profileDetail.education_level}</p>
                                  <p><span className="font-medium">Experiencia:</span> {formatNumber(profileDetail.years_experience)} años</p>
                                  <p><span className="font-medium">Salario:</span> ${formatNumber(parseFloat(profileDetail.salary_min))} - ${formatNumber(parseFloat(profileDetail.salary_max))} {profileDetail.salary_currency}</p>
                                </div>
                              </div>
                              
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Habilidades</h4>
                                <div className="space-y-2">
                                  {profileDetail.technical_skills.length > 0 && (
                                    <div>
                                      <p className="text-sm font-medium text-gray-700">Técnicas:</p>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {profileDetail.technical_skills.map((skill, idx) => (
                                          <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                                            {skill}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {profileDetail.soft_skills.length > 0 && (
                                    <div className="mt-2">
                                      <p className="text-sm font-medium text-gray-700">Blandas:</p>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {profileDetail.soft_skills.map((skill, idx) => (
                                          <span key={idx} className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                            {skill}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {profile.status === 'in_progress' && profile.published_platforms.length > 0 && (
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Plataformas de Publicación</h4>
                                <div className="flex flex-wrap gap-2">
                                  {profile.published_platforms.map((platform, idx) => (
                                    <span
                                      key={idx}
                                      className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium bg-blue-600 text-white"
                                    >
                                      <i className="fas fa-check-circle mr-1.5"></i>
                                      {typeof platform === 'string' ? platform : platform.platform}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {profileDetail.internal_notes && (
                              <div>
                                <h4 className="font-semibold text-gray-900 mb-2">Notas Internas</h4>
                                <p className="text-sm text-gray-700 bg-white p-3 rounded-lg border border-gray-200">
                                  {profileDetail.internal_notes}
                                </p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
            {/* Pagination for profiles */}
            <Pagination
              currentPage={currentPage}
              totalItems={filteredProfiles.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              className="border-t border-gray-200 px-4"
            />
          </div>
        )}
      </div>

      {/* Modal: Cambiar Estado */}
      {showStatusModal && (
        <div className="fixed top-16 left-0 right-0 bottom-0  flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Cambiar Estado</h3>
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nuevo Estatus</label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccionar estatus...</option>
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
                
                {newStatus === 'in_progress' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <i className="fas fa-globe mr-2 text-blue-600" />
                      Plataforma de Publicación
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Plataforma
                        </label>
                        <input
                          type="text"
                          value={platformForm.platform}
                          onChange={(e) => setPlatformForm({ ...platformForm, platform: e.target.value })}
                          placeholder="Ej: LinkedIn, Indeed, Computrabajo..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          URL (opcional)
                        </label>
                        <input
                          type="url"
                          value={platformForm.url}
                          onChange={(e) => setPlatformForm({ ...platformForm, url: e.target.value })}
                          placeholder="https://..."
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notas (opcional)</label>
                  <textarea
                    value={statusNotes}
                    onChange={(e) => setStatusNotes(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Agrega notas sobre este cambio..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateStatus}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Actualizando...' : 'Actualizar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Aprobar/Rechazar */}
      {showApprovalModal && (
        <div className="fixed top-16 left-0 right-0 bottom-0  flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Aprobar/Rechazar Perfil</h3>
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setApprovalFeedback('');
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Acción</label>
                  <select
                    value={approvalAction}
                    onChange={(e) => setApprovalAction(e.target.value as 'approve' | 'reject')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="approve">Aprobar</option>
                    <option value="reject">Rechazar</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Comentarios del Cliente
                  </label>
                  <textarea
                    value={approvalFeedback}
                    onChange={(e) => setApprovalFeedback(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Agrega comentarios o retroalimentación del cliente..."
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setApprovalFeedback('');
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleToggleClientApproval()}
                  disabled={actionLoading}
                  className={`px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 ${
                    approvalAction === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {actionLoading ? 'Procesando...' : approvalAction === 'approve' ? 'Aprobar' : 'Rechazar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Agregar Plataforma */}
      {showPlatformModal && (
        <div className="fixed top-16 left-0 right-0 bottom-0  flex items-center justify-center z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Agregar Plataforma de Publicación</h3>
                <button
                  onClick={() => setShowPlatformModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <i className="fas fa-times" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Plataforma</label>
                  <input
                    type="text"
                    value={platformForm.platform}
                    onChange={(e) => setPlatformForm({ ...platformForm, platform: e.target.value })}
                    placeholder="Ej: LinkedIn, Indeed, Computrabajo..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">URL (opcional)</label>
                  <input
                    type="url"
                    value={platformForm.url}
                    onChange={(e) => setPlatformForm({ ...platformForm, url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowPlatformModal(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddPlatform}
                  disabled={actionLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Agregando...' : 'Agregar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useModal } from '@/context/ModalContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFileAlt,
  faPlus,
  faSearch,
  faFilter,
  faEye,
  faEdit,
  faTrash,
  faUser,
  faBriefcase,
  faCalendarAlt,
  faPercent,
  faSort,
  faSortUp,
  faSortDown,
  faCheckCircle,
  faTimesCircle,
  faClock,
  faTimes,
  faSave,
  faStar
} from '@fortawesome/free-solid-svg-icons';
import { apiClient } from '@/lib/api';
import ApplicationFormModal from '@/components/ApplicationFormModal';

// Interfaz actualizada según el backend
interface Application {
  id: number;
  candidate: number;
  profile: number;
  
  // ========== DATOS DEL CANDIDATO ========== ← AGREGAR
  candidate_name?: string;
  candidate_email?: string;
  
  // ========== DATOS DEL PERFIL ==========
  profile_title?: string;
  profile_client?: string;
  
  // ========== DATOS DE LA APLICACIÓN ==========
  status: string;
  status_display?: string;
  match_percentage: number | null;
  overall_rating: number | null;
  notes: string;
  rejection_reason: string;
  applied_at: string;
  interview_date: string | null;
  offer_date: string | null;
}



// Interfaz para candidato expandido (cuando se hace join)
interface CandidateInfo {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  current_position?: string;
}

// Interfaz para perfil expandido
interface ProfileInfo {
  id: number;
  position_title: string;
  client_name?: string;
}

const STATUS_OPTIONS = [
  { value: 'applied', label: 'Aplicó', color: 'bg-blue-100 text-blue-800', icon: faClock },
  { value: 'screening', label: 'En Revisión', color: 'bg-yellow-100 text-yellow-800', icon: faEye },
  { value: 'shortlisted', label: 'Preseleccionado', color: 'bg-green-100 text-green-800', icon: faCheckCircle },
  { value: 'interview_scheduled', label: 'Entrevista Programada', color: 'bg-purple-100 text-purple-800', icon: faCalendarAlt },
  { value: 'interviewed', label: 'Entrevistado', color: 'bg-indigo-100 text-indigo-800', icon: faUser },
  { value: 'offered', label: 'Oferta Extendida', color: 'bg-orange-100 text-orange-800', icon: faBriefcase },
  { value: 'accepted', label: 'Oferta Aceptada', color: 'bg-green-100 text-green-800', icon: faCheckCircle },
  { value: 'rejected', label: 'Rechazado', color: 'bg-red-100 text-red-800', icon: faTimesCircle },
  { value: 'withdrawn', label: 'Retirado', color: 'bg-gray-100 text-gray-800', icon: faTimes },
];

export default function ApplicationsPage() {
  const { showConfirm } = useModal();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortField, setSortField] = useState('applied_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingApplication, setEditingApplication] = useState<Application | null>(null);
  
  // Toast notifications
  const [toast, setToast] = useState<{show: boolean, message: string, type: 'success' | 'error'}>({
    show: false,
    message: '',
    type: 'success'
  });

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      console.log('🔵 Cargando aplicaciones...');
      
      const response = await apiClient.getCandidateApplications();
      console.log('🟢 Respuesta del servidor:', response);
      
      // El backend puede devolver los datos directamente o en .results (paginado)
      const applicationsData = (response as any)?.results || (response as any) || [];
      
      console.log('✅ Aplicaciones procesadas:', applicationsData);
      setApplications(applicationsData);
    } catch (error: any) {
      console.error('❌ Error fetching applications:', error);
      showToast(`Error al cargar aplicaciones: ${error.message || 'Error desconocido'}`, 'error');
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showConfirm('¿Estás seguro de que deseas eliminar esta aplicación?');
    if (!confirmed) {
      return;
    }

    try {
      console.log('🗑️ Eliminando aplicación:', id);
      await apiClient.deleteCandidateApplication(id);
      
      // Actualizar lista localmente
      setApplications(apps => apps.filter(app => app.id !== id));
      showToast('Aplicación eliminada exitosamente', 'success');
    } catch (error: any) {
      console.error('❌ Error al eliminar:', error);
      showToast(`Error al eliminar: ${error.message || 'Error desconocido'}`, 'error');
    }
  };

  const handleEdit = (application: Application) => {
    setEditingApplication(application);
    setShowEditModal(true);
  };

  const handleSaveEdit = async (updatedData: Partial<Application>) => {
    if (!editingApplication) return;

    try {
      console.log('💾 Actualizando aplicación:', editingApplication.id, updatedData);
      
      await apiClient.updateCandidateApplication(editingApplication.id, updatedData);
      
      // Recargar lista
      await fetchApplications();
      
      setShowEditModal(false);
      setEditingApplication(null);
      showToast('Aplicación actualizada exitosamente', 'success');
    } catch (error: any) {
      console.error('❌ Error al actualizar:', error);
      showToast(`Error al actualizar: ${error.message || 'Error desconocido'}`, 'error');
    }
  };

  const handleViewProfile = (profileId: number) => {
    // Navegar a la vista de perfiles
    window.location.href = `/reclutamiento/director?view=profiles&profile=${profileId}`;
  };

  const handleEditProfile = (profileId: number) => {
    // Navegar a editar el perfil
    window.location.href = `/reclutamiento/director?view=profiles&edit=${profileId}`;
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const getStatusConfig = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status) || STATUS_OPTIONS[0];
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filtrado y ordenamiento
  const filteredAndSortedApplications = React.useMemo(() => {
    let filtered = [...applications];

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(app => 
        app.profile_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.profile_client?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por estado
    if (statusFilter) {
      filtered = filtered.filter(app => app.status === statusFilter);
    }

    // Ordenar
    filtered.sort((a, b) => {
      let aVal: any = a[sortField as keyof Application];
      let bVal: any = b[sortField as keyof Application];

      // Manejar valores nulos
      if (aVal === null) aVal = sortDirection === 'asc' ? Number.MAX_VALUE : Number.MIN_VALUE;
      if (bVal === null) bVal = sortDirection === 'asc' ? Number.MAX_VALUE : Number.MIN_VALUE;

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [applications, searchTerm, statusFilter, sortField, sortDirection]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return faSort;
    return sortDirection === 'asc' ? faSortUp : faSortDown;
  };

  return (
    <div className="p-6">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Aplicaciones de Candidatos</h1>
            <p className="text-gray-600 mt-1">Gestiona las aplicaciones de candidatos a las posiciones</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faPlus} />
            Nueva Aplicación
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <FontAwesomeIcon 
              icon={faSearch} 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Buscar por posición, cliente, notas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Todos los estados</option>
            {STATUS_OPTIONS.map(status => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          {/* Clear Filters */}
          {(searchTerm || statusFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Limpiar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{applications.length}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <FontAwesomeIcon icon={faFileAlt} className="text-purple-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">En Proceso</p>
              <p className="text-2xl font-bold text-gray-900">
                {applications.filter(a => !['rejected', 'withdrawn', 'accepted'].includes(a.status)).length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <FontAwesomeIcon icon={faClock} className="text-blue-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Aceptadas</p>
              <p className="text-2xl font-bold text-gray-900">
                {applications.filter(a => a.status === 'accepted').length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <FontAwesomeIcon icon={faCheckCircle} className="text-green-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rechazadas</p>
              <p className="text-2xl font-bold text-gray-900">
                {applications.filter(a => a.status === 'rejected').length}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <FontAwesomeIcon icon={faTimesCircle} className="text-red-600 text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            <p className="mt-4 text-gray-600">Cargando aplicaciones...</p>
          </div>
        ) : filteredAndSortedApplications.length === 0 ? (
          <div className="p-12 text-center">
            <FontAwesomeIcon icon={faFileAlt} className="text-gray-300 text-6xl mb-4" />
            <p className="text-gray-600 text-lg">No se encontraron aplicaciones</p>
            <p className="text-gray-500 mt-2">
              {searchTerm || statusFilter 
                ? 'Intenta ajustar los filtros de búsqueda' 
                : 'Comienza creando una nueva aplicación'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    ID
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('profile_title')}
                  >
                    <div className="flex items-center gap-2">
                      Posición
                      <FontAwesomeIcon icon={getSortIcon('profile_title')} className="text-gray-400" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-2">
                      Estado
                      <FontAwesomeIcon icon={getSortIcon('status')} className="text-gray-400" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('match_percentage')}
                  >
                    <div className="flex items-center gap-2">
                      Match %
                      <FontAwesomeIcon icon={getSortIcon('match_percentage')} className="text-gray-400" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('overall_rating')}
                  >
                    <div className="flex items-center gap-2">
                      Calificación
                      <FontAwesomeIcon icon={getSortIcon('overall_rating')} className="text-gray-400" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('applied_at')}
                  >
                    <div className="flex items-center gap-2">
                      Fecha Aplicación
                      <FontAwesomeIcon icon={getSortIcon('applied_at')} className="text-gray-400" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedApplications.map((application) => {
                  const statusConfig = getStatusConfig(application.status);
                  return (
                    <tr key={application.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{application.id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {application.profile_title || 'N/A'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {application.profile_client || 'N/A'}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleViewProfile(application.profile)}
                              className="text-blue-600 hover:text-blue-900"
                              title="Ver perfil"
                            >
                              <FontAwesomeIcon icon={faEye} className="text-sm" />
                            </button>
                            <button
                              onClick={() => handleEditProfile(application.profile)}
                              className="text-green-600 hover:text-green-900"
                              title="Editar perfil"
                            >
                              <FontAwesomeIcon icon={faEdit} className="text-sm" />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {application.profile_client || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                          <FontAwesomeIcon icon={statusConfig.icon} />
                          {application.status_display || statusConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {application.match_percentage !== null ? (
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-purple-600 h-2 rounded-full"
                                style={{ width: `${application.match_percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {application.match_percentage}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {application.overall_rating !== null ? (
                          <div className="flex items-center gap-1">
                            <FontAwesomeIcon icon={faStar} className="text-yellow-400" />
                            <span className="text-sm font-medium text-gray-900">
                              {application.overall_rating.toFixed(1)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(application.applied_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEdit(application)}
                          className="text-purple-600 hover:text-purple-900 mr-3"
                          title="Editar"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button
                          onClick={() => handleDelete(application.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Eliminar"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <ApplicationFormModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={async (data) => {
          // Esta función se ejecuta cuando se envía el formulario
          await fetchApplications(); // Recargar lista
        }}
        onSuccess={(message: string) => {
          showToast(message, 'success');
          fetchApplications();
        }}
      />

      {/* Edit Modal */}
      {showEditModal && editingApplication && (
        <EditApplicationModal
          application={editingApplication}
          onClose={() => {
            setShowEditModal(false);
            setEditingApplication(null);
          }}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}

// ====== EDIT MODAL COMPONENT ======

interface EditApplicationModalProps {
  application: Application;
  onClose: () => void;
  onSave: (data: Partial<Application>) => void;
}

function EditApplicationModal({ application, onClose, onSave }: EditApplicationModalProps) {
  const [formData, setFormData] = useState({
    status: application.status,
    match_percentage: application.match_percentage || 0,
    overall_rating: application.overall_rating || 0,
    notes: application.notes || '',
    rejection_reason: application.rejection_reason || '',
    interview_date: application.interview_date || '',
    offer_date: application.offer_date || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Preparar datos para enviar
    const dataToSend: any = {
      status: formData.status,
      notes: formData.notes,
      rejection_reason: formData.rejection_reason,
    };

    // Solo incluir valores numéricos si son mayores a 0
    if (formData.match_percentage > 0) {
      dataToSend.match_percentage = formData.match_percentage;
    }
    if (formData.overall_rating > 0) {
      dataToSend.overall_rating = formData.overall_rating;
    }

    // Solo incluir fechas si no están vacías
    if (formData.interview_date) {
      dataToSend.interview_date = formData.interview_date;
    }
    if (formData.offer_date) {
      dataToSend.offer_date = formData.offer_date;
    }

    onSave(dataToSend);
  };

  // Agregar después de la función handleDelete (línea ~200 aprox):

  const handleViewProfile = (profileId: number) => {
    // Navegar a la vista de perfiles
    window.location.href = `/reclutamiento/director?view=profiles&profile=${profileId}`;
  };

  const handleEditProfile = (profileId: number) => {
    // Navegar a editar el perfil
    window.location.href = `/reclutamiento/director?view=profiles&edit=${profileId}`;
  };

  return (
    <div className="fixed top-16 left-0 right-0 bottom-0  flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Editar Aplicación #{application.id}</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <FontAwesomeIcon icon={faTimes} className="text-xl" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado de la Aplicación
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              required
            >
              {STATUS_OPTIONS.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>

          {/* Match Percentage */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Porcentaje de Coincidencia (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.match_percentage}
              onChange={(e) => setFormData({ ...formData, match_percentage: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Overall Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Calificación General (0-5)
            </label>
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={formData.overall_rating}
              onChange={(e) => setFormData({ ...formData, overall_rating: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Interview Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Entrevista
            </label>
            <input
              type="date"
              value={formData.interview_date ? formData.interview_date.split('T')[0] : ''}
              onChange={(e) => setFormData({ ...formData, interview_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Offer Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Fecha de Oferta
            </label>
            <input
              type="date"
              value={formData.offer_date ? formData.offer_date.split('T')[0] : ''}
              onChange={(e) => setFormData({ ...formData, offer_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              placeholder="Notas adicionales sobre la aplicación..."
            />
          </div>

          {/* Rejection Reason */}
          {formData.status === 'rejected' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Razón de Rechazo
              </label>
              <textarea
                rows={2}
                value={formData.rejection_reason}
                onChange={(e) => setFormData({ ...formData, rejection_reason: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                placeholder="Explica la razón del rechazo..."
              />
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faSave} />
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

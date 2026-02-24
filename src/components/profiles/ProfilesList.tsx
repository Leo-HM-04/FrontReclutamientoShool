"use client";

import { useState, useEffect } from "react";
import { getProfiles } from "@/lib/api";
import Pagination from "../ui/Pagination";

interface Profile {
  id: number;
  position_title: string;
  client: number;
  client_name?: string;
  status: string;
  priority: string;
  service_type: string;
  positions_available: number;
  salary_min: number;
  salary_max: number;
  salary_currency: string;
  location: string;
  modality: string;
  assigned_to?: number;
  assigned_to_name?: string;
  created_at: string;
  deadline_date?: string;
}

interface ProfilesListProps {
  filterStatus?: string;
  onViewProfile?: (profileId: number) => void;
  onEditProfile?: (profileId: number) => void;
  onDeleteProfile?: (profileId: number) => void;
  highlightId?: number | undefined;
}

export default function ProfilesList({ filterStatus, onViewProfile, onEditProfile, onDeleteProfile, highlightId }: ProfilesListProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState(filterStatus || "");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [activeHighlight, setActiveHighlight] = useState<number | null>(null);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    loadProfiles();
  }, [statusFilter, priorityFilter, filterStatus]);

  // Si se pasa un highlightId (p.ej. desde notificación), hacer scroll y resaltar temporalmente
  useEffect(() => {
    if (!highlightId) return;

    const attempt = () => {
      const exists = profiles.some(p => p.id === highlightId);
      if (!exists) return false;

      const el = document.getElementById(`profile-row-${highlightId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-2', 'ring-orange-400', 'bg-orange-50');
        setActiveHighlight(highlightId);
        // Remove highlight after 5s
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-orange-400', 'bg-orange-50');
          setActiveHighlight(null);
        }, 5000);
        return true;
      }
      return false;
    };

    // Si la lista no está cargada aún, esperar un poco y reintentar
    if (!attempt()) {
      const t = setTimeout(() => attempt(), 300);
      return () => clearTimeout(t);
    }
  }, [highlightId, profiles]);

  const loadProfiles = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      
      const response = await getProfiles(params);
      const profilesList = response.results || (Array.isArray(response) ? response : []);
      setProfiles(profilesList);
    } catch (error) {
      console.error("Error loading profiles:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProfiles = profiles.filter((profile) =>
    profile.position_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (profile.client_name && profile.client_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
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
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h3 className="text-xl font-semibold text-gray-900">
          {filterStatus === "pending" ? "Perfiles Pendientes de Aprobación" : "Todos los Perfiles"}
        </h3>
        <button
          onClick={loadProfiles}
          className="mt-3 sm:mt-0 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
        >
          <i className="fas fa-sync-alt mr-2"></i>
          Actualizar
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <i className="fas fa-search mr-2"></i>Buscar
          </label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título o cliente..."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        {!filterStatus && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <i className="fas fa-filter mr-2"></i>Estatus
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">Todos los estatus</option>
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
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <i className="fas fa-flag mr-2"></i>Prioridad
          </label>
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="">Todas las prioridades</option>
            <option value="urgent">Urgente</option>
            <option value="high">Alta</option>
            <option value="medium">Media</option>
            <option value="low">Baja</option>
          </select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="text-orange-600 text-sm font-medium">Total Perfiles</div>
          <div className="text-2xl font-bold text-gray-900">{filteredProfiles.length}</div>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="text-blue-600 text-sm font-medium">En Proceso</div>
          <div className="text-2xl font-bold text-gray-900">
            {filteredProfiles.filter(p => p.status === "in_progress").length}
          </div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="text-yellow-600 text-sm font-medium">Pendientes</div>
          <div className="text-2xl font-bold text-gray-900">
            {filteredProfiles.filter(p => p.status === "pending").length}
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="text-green-600 text-sm font-medium">Completados</div>
          <div className="text-2xl font-bold text-gray-900">
            {filteredProfiles.filter(p => p.status === "completed").length}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <i className="fas fa-spinner fa-spin text-4xl text-orange-600"></i>
          </div>
        ) : filteredProfiles.length === 0 ? (
          <div className="text-center py-12">
            <i className="fas fa-briefcase text-gray-300 text-5xl mb-4"></i>
            <p className="text-gray-500 text-lg">No se encontraron perfiles</p>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
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
                    Salario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ubicación
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
                <tr key={profile.id} id={`profile-row-${profile.id}`} className={`hover:bg-gray-50 ${activeHighlight === profile.id ? 'ring-2 ring-orange-400 bg-orange-50' : ''}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{profile.position_title}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{profile.client_name || `Cliente #${profile.client}`}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(profile.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPriorityBadge(profile.priority)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      ${profile.salary_min?.toLocaleString()} - ${profile.salary_max?.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">{profile.salary_currency}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{profile.location}</div>
                    <div className="text-xs text-gray-500">{profile.modality}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => onViewProfile && onViewProfile(profile.id)}
                      className="text-orange-600 hover:text-orange-900 mr-3"
                      title="Ver detalle"
                    >
                      <i className="fas fa-eye"></i>
                    </button>
                    <button
                      onClick={() => onEditProfile && onEditProfile(profile.id)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                      title="Editar"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button
                      onClick={() => onDeleteProfile && onDeleteProfile(profile.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Eliminar"
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </td>
                </tr>
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
              className="mt-4"
            />
          </>
        )}
      </div>
    </div>
  );
}

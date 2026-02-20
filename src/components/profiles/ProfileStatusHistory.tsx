"use client";

import { useState, useEffect } from "react";
import { getProfiles, getProfileHistory } from "@/lib/api";

interface StatusHistory {
  id: number;
  profile: number;
  profile_title?: string;
  from_status: string;
  to_status: string;
  changed_by: number;
  changed_by_name?: string;
  notes: string;
  timestamp: string;
}

export default function ProfileStatusHistory() {
  const [histories, setHistories] = useState<StatusHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<number | null>(null);
  const [profiles, setProfiles] = useState<any[]>([]);

  useEffect(() => {
    loadProfiles();
  }, []);

  useEffect(() => {
    if (selectedProfile) {
      loadHistory();
    }
  }, [selectedProfile]);

  const loadProfiles = async () => {
    try {
      const response = await getProfiles();
      const profilesList = response.results || (Array.isArray(response) ? response : []);
      setProfiles(profilesList);
    } catch (error) {
      console.error("Error loading profiles:", error);
    }
  };

  const loadHistory = async () => {
    if (!selectedProfile) return;
    
    setLoading(true);
    try {
      const response = await getProfileHistory(selectedProfile);
      // ✅ El API devuelve directamente el array o un objeto con results
      const historyList = response.results || (Array.isArray(response) ? response : []);
      setHistories(historyList);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: { [key: string]: string } = {
      draft: "Borrador",
      pending: "Pendiente",
      approved: "Aprobado",
      in_progress: "En Proceso",
      candidates_found: "Candidatos Encontrados",
      in_evaluation: "En Evaluación",
      in_interview: "En Entrevista",
      finalists: "Finalistas",
      completed: "Completado",
      cancelled: "Cancelado",
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      draft: "text-gray-600",
      pending: "text-yellow-600",
      approved: "text-green-600",
      in_progress: "text-blue-600",
      candidates_found: "text-indigo-600",
      in_evaluation: "text-purple-600",
      in_interview: "text-pink-600",
      finalists: "text-orange-600",
      completed: "text-green-600",
      cancelled: "text-red-600",
    };
    return colors[status] || "text-gray-600";
  };

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          Historial de Cambios de Estatus
        </h3>
        <p className="text-gray-600">
          Consulta el historial completo de cambios de estatus de los perfiles
        </p>
      </div>

      {/* Profile Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <i className="fas fa-briefcase mr-2"></i>
          Seleccionar Perfil
        </label>
        <select
          value={selectedProfile || ""}
          onChange={(e) => setSelectedProfile(Number(e.target.value))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
        >
          <option value="">Seleccione un perfil...</option>
          {profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.position_title} - {profile.client_name || `Cliente #${profile.client}`}
            </option>
          ))}
        </select>
      </div>

      {/* History Timeline */}
      {selectedProfile && (
        <div>
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <i className="fas fa-spinner fa-spin text-4xl text-orange-600"></i>
            </div>
          ) : histories.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-lg">
              <i className="fas fa-history text-gray-300 text-5xl mb-4"></i>
              <p className="text-gray-500 text-lg">No hay historial de cambios para este perfil</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-200"></div>

              {/* History Items */}
              <div className="space-y-6">
                {histories.map((history, index) => (
                  <div key={history.id} className="relative pl-16">
                    {/* Timeline Dot */}
                    <div className="absolute left-6 top-2 w-4 h-4 bg-orange-600 rounded-full border-4 border-white"></div>

                    {/* Content Card */}
                    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`font-medium ${getStatusColor(history.from_status)}`}>
                              {getStatusLabel(history.from_status)}
                            </span>
                            <i className="fas fa-arrow-right text-gray-400"></i>
                            <span className={`font-medium ${getStatusColor(history.to_status)}`}>
                              {getStatusLabel(history.to_status)}
                            </span>
                          </div>
                          
                          {history.notes && (
                            <p className="text-sm text-gray-600 mt-2">{history.notes}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center">
                          <i className="fas fa-user mr-1"></i>
                          {history.changed_by_name || `Usuario #${history.changed_by}`}
                        </div>
                        <div className="flex items-center">
                          <i className="fas fa-clock mr-1"></i>
                          {new Date(history.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { getProfileStats } from "@/lib/api";

interface ProfileStats {
  total_profiles: number;
  by_status: { [key: string]: any };
  by_priority: { [key: string]: any };
  by_service_type: { [key: string]: any };
  by_modality: { [key: string]: any };
  avg_positions_per_profile: number;
  avg_salary_range: {
    min: number;
    max: number;
    currency: string;
  };
  pending_approval: number;
  near_deadline: number;
  active_profiles: number;
  completed_profiles: number;
  top_clients: Array<{
    client_id: number;
    client_name: string;
    profile_count: number;
  }>;
}

// 🔧 Helper para extraer count si viene como objeto
const extractCount = (item: any): number => {
  if (typeof item === "number") return item;
  if (typeof item === "object" && item !== null) {
    return item.count ?? 0;
  }
  return 0;
};

export default function ProfileStats() {
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await getProfileStats();
      console.log("📊 Stats recibidas:", response);
      setStats(response);
    } catch (error) {
      console.error("Error loading stats:", error);
      setStats({
        total_profiles: 0,
        by_status: {},
        by_priority: {},
        by_service_type: {},
        by_modality: {},
        avg_positions_per_profile: 0,
        avg_salary_range: { min: 0, max: 0, currency: "MXN" },
        pending_approval: 0,
        near_deadline: 0,
        active_profiles: 0,
        completed_profiles: 0,
        top_clients: [],
      });
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

  const getPriorityLabel = (priority: string) => {
    const labels: { [key: string]: string } = {
      low: "Baja",
      medium: "Media",
      high: "Alta",
      urgent: "Urgente",
    };
    return labels[priority] || priority;
  };

  if (loading || !stats) {
    return (
      <div className="flex justify-center items-center py-12">
        <i className="fas fa-spinner fa-spin text-4xl text-orange-600"></i>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-semibold text-gray-900">
              Estadísticas de Perfiles
            </h3>
            <p className="text-gray-600 mt-1">
              Métricas y análisis de los perfiles de reclutamiento
            </p>
          </div>
          <button
            onClick={loadStats}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            <i className="fas fa-sync-alt mr-2"></i>
            Actualizar
          </button>
        </div>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Perfiles</p>
              <p className="text-3xl font-bold mt-2">
                {stats?.total_profiles || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <i className="fas fa-briefcase text-2xl"></i>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Activos</p>
              <p className="text-3xl font-bold mt-2">
                {stats?.active_profiles || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <i className="fas fa-play-circle text-2xl"></i>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium">Pendientes</p>
              <p className="text-3xl font-bold mt-2">
                {stats?.pending_approval || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <i className="fas fa-clock text-2xl"></i>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Completados</p>
              <p className="text-3xl font-bold mt-2">
                {stats?.completed_profiles || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
              <i className="fas fa-check-circle text-2xl"></i>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(stats?.near_deadline || 0) > 0 && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex items-center">
            <i className="fas fa-exclamation-triangle text-red-500 mr-3"></i>
            <p className="text-red-700">
              <span className="font-semibold">{stats?.near_deadline}</span>{" "}
              perfiles próximos a vencer
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* By Status */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <i className="fas fa-chart-pie text-orange-600 mr-2"></i>
            Perfiles por Estatus
          </h4>
          <div className="space-y-3">
            {stats?.by_status &&
              Object.entries(stats.by_status).map(([status, data]) => {
                const count = extractCount(data);
                return (
                  <div
                    key={status}
                    className="flex items-center justify-between"
                  >
                    <span className="text-gray-700">
                      {getStatusLabel(status)}
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-orange-600 h-2 rounded-full"
                          style={{
                            width: `${
                              (count / (stats.total_profiles || 1)) * 100
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="font-semibold text-gray-900 w-8 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* By Priority */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <i className="fas fa-flag text-orange-600 mr-2"></i>
            Perfiles por Prioridad
          </h4>
          <div className="space-y-3">
            {stats?.by_priority &&
              Object.entries(stats.by_priority).map(([priority, data]) => {
                const count = extractCount(data);
                return (
                  <div
                    key={priority}
                    className="flex items-center justify-between"
                  >
                    <span className="text-gray-700">
                      {getPriorityLabel(priority)}
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            priority === "urgent"
                              ? "bg-red-600"
                              : priority === "high"
                              ? "bg-orange-600"
                              : priority === "medium"
                              ? "bg-yellow-600"
                              : "bg-green-600"
                          }`}
                          style={{
                            width: `${
                              (count / (stats.total_profiles || 1)) * 100
                            }%`,
                          }}
                        ></div>
                      </div>
                      <span className="font-semibold text-gray-900 w-8 text-right">
                        {count}
                      </span>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Service Type */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <i className="fas fa-cogs text-orange-600 mr-2"></i>
            Por Tipo de Servicio
          </h4>
          <div className="space-y-3">
            {stats?.by_service_type &&
              Object.entries(stats.by_service_type).map(([type, data]) => {
                const count = extractCount(data);
                return (
                  <div
                    key={type}
                    className="flex items-center justify-between"
                  >
                    <span className="text-gray-700 capitalize">
                      {type === "normal"
                        ? "Servicio Normal"
                        : "Servicio Especializado"}
                    </span>
                    <span className="font-semibold text-gray-900">{count}</span>
                  </div>
                );
              })}
          </div>
        </div>

        {/* By Modality */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <i className="fas fa-map-marker-alt text-orange-600 mr-2"></i>
            Por Modalidad
          </h4>
          <div className="space-y-3">
            {stats?.by_modality &&
              Object.entries(stats.by_modality).map(([modality, data]) => {
                const count = extractCount(data);
                return (
                  <div
                    key={modality}
                    className="flex items-center justify-between"
                  >
                    <span className="text-gray-700 capitalize">
                      {modality}
                    </span>
                    <span className="font-semibold text-gray-900">
                      {count}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Average Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <i className="fas fa-users text-orange-600 mr-2"></i>
            Promedio de Posiciones
          </h4>
          <p className="text-3xl font-bold text-gray-900">
            {(stats?.avg_positions_per_profile || 0).toFixed(1)}
          </p>
          <p className="text-sm text-gray-600 mt-2">posiciones por perfil</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <i className="fas fa-dollar-sign text-orange-600 mr-2"></i>
            Rango Salarial Promedio
          </h4>
          <p className="text-xl font-bold text-gray-900">
            $
            {(stats?.avg_salary_range?.min || 0).toLocaleString()} - $
            {(stats?.avg_salary_range?.max || 0).toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 mt-2">
            {stats?.avg_salary_range?.currency || "MXN"}
          </p>
        </div>
      </div>

      {/* Top Clients */}
      {stats?.top_clients && stats.top_clients.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mt-6">
          <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <i className="fas fa-building text-orange-600 mr-2"></i>
            Top Clientes con Más Perfiles
          </h4>
          <div className="space-y-3">
            {stats.top_clients.map((client, index) => (
              <div
                key={client.client_id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>
                  <span className="font-medium text-gray-900">
                    {client.client_name}
                  </span>
                </div>
                <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                  {client.profile_count}{" "}
                  {client.profile_count === 1 ? "perfil" : "perfiles"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

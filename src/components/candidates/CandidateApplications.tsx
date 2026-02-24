"use client";

import { useState, useEffect } from "react";
import { apiClient } from "@/lib/api";

interface CandidateApplicationsProps {
  candidateId: number;
}

export default function CandidateApplications({ candidateId }: CandidateApplicationsProps) {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadApplications();
  }, [candidateId]);

  const loadApplications = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/candidates/candidates/${candidateId}/applications/`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setApplications(data);
      }
    } catch (error) {
      console.error("Error loading applications:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { bg: string; text: string; label: string } } = {
      applied: { bg: "bg-blue-100", text: "text-blue-700", label: "Aplicado" },
      in_evaluation: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Aplicación de Pruebas" },
      shortlisted: { bg: "bg-purple-100", text: "text-purple-700", label: "Preseleccionado" },
      interview_scheduled: { bg: "bg-indigo-100", text: "text-indigo-700", label: "Entrevista Programada" },
      interviewed: { bg: "bg-pink-100", text: "text-pink-700", label: "Entrevistado" },
      offered: { bg: "bg-green-100", text: "text-green-700", label: "Oferta Realizada" },
      accepted: { bg: "bg-green-100", text: "text-green-700", label: "Oferta Aceptada" },
      rejected: { bg: "bg-red-100", text: "text-red-700", label: "Rechazado" },
      withdrawn: { bg: "bg-gray-100", text: "text-gray-700", label: "Retirado" },
    };

    const config = statusConfig[status] || { bg: "bg-gray-100", text: "text-gray-700", label: status };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex justify-center items-center py-8">
          <i className="fas fa-spinner fa-spin text-2xl text-blue-600"></i>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <i className="fas fa-file-alt text-purple-600 mr-2"></i>
        Aplicaciones ({applications.length})
      </h4>

      {applications.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <i className="fas fa-inbox text-4xl mb-2"></i>
          <p>No hay aplicaciones registradas</p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div key={app.id} className="border border-gray-200 rounded-lg p-4 hover:border-purple-300 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h5 className="font-semibold text-gray-900">{app.profile_title || 'Perfil sin título'}</h5>
                  <p className="text-sm text-gray-600">{app.client_name || 'Cliente no especificado'}</p>
                </div>
                {getStatusBadge(app.status)}
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Aplicado:</span>
                  <span className="ml-2 font-medium">
                    {app.applied_at ? new Date(app.applied_at).toLocaleDateString() : '-'}
                  </span>
                </div>
                {app.notes && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Notas:</span>
                    <p className="text-gray-700 mt-1">{app.notes}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

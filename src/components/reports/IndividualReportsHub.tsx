'use client';

/**
 * ════════════════════════════════════════════════════════════════════
 * INDIVIDUAL REPORTS HUB
 * ════════════════════════════════════════════════════════════════════
 * 
 * Hub principal para acceder a todos los reportes individuales:
 * - Reporte de Perfil
 * - Candidatos de un Perfil
 * - Timeline de Perfil
 * - Reporte de Candidato
 * - Reporte de Cliente
 * 
 * ════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect } from 'react';
import ProfileReport from './ProfileReport';
import ProfileCandidatesReport from './ProfileCandidatesReport';
import ProfileTimelineReport from './ProfileTimelineReport';
import CandidateFullReport from './CandidateFullReport';
import ClientFullReport from './ClientFullReport';
import FullConsolidatedReport from './FullConsolidatedReport';
import ReportCard from '../ui/ReportCard';
import SearchableSelect from '../ui/SearchableSelect';

interface Profile {
  id: number;
  position_title: string;
  client_name: string;
  status: string;
}

interface Candidate {
  id: number;
  full_name: string;
  email: string;
}

interface Client {
  id: number;
  company_name: string;
  industry: string;
}

export default function IndividualReportsHub() {
  // Estado
  const [view, setView] = useState<'selector' | 'profile' | 'candidates' | 'timeline' | 'candidate' | 'client' | 'consolidated'>('selector');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  
  // Listas para los selectores
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  
  const [loading, setLoading] = useState(false);

  // ============================================================
  // CARGAR LISTAS
  // ============================================================

  useEffect(() => {
    loadProfiles();
    loadCandidates();
    loadClients();
  }, []);

  const loadProfiles = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/profiles/profiles/`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setProfiles(data);
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
    }
  };

  const loadCandidates = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/candidates/candidates/`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCandidates(data);
      }
    } catch (error) {
      console.error('Error loading candidates:', error);
    }
  };

  const loadClients = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/clients/`,  // ✅ CORRECTO
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (error) {
      console.error('Error loading clients:', error);
    }
  };

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleViewProfile = (id: number) => {
    setSelectedId(id);
    setView('profile');
  };

  const handleViewCandidates = (id: number) => {
    setSelectedId(id);
    setView('candidates');
  };

  const handleViewTimeline = (id: number) => {
    setSelectedId(id);
    setView('timeline');
  };

  const handleViewCandidate = (id: number) => {
    setSelectedId(id);
    setView('candidate');
  };

  const handleViewClient = (id: number) => {
    setSelectedId(id);
    setView('client');
  };

  const handleViewConsolidated = () => {
    setView('consolidated');
  };

  const handleBack = () => {
    setView('selector');
    setSelectedId(null);
  };

  // ============================================================
  // RENDER SELECTOR
  // ============================================================

  if (view === 'selector') {
    return (
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Reportes Individuales
          </h1>
          <p className="text-gray-600">
            Selecciona el tipo de reporte que deseas generar
          </p>
        </div>

        {/* Grid de opciones */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Reporte de Perfil */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <i className="fas fa-briefcase text-blue-600 text-xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Reporte de Perfil
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Ve toda la información de una vacante específica
            </p>
            <SearchableSelect
              options={profiles.map(p => ({
                value: p.id,
                label: p.position_title,
                searchText: `${p.position_title} - ${p.client_name}`
              }))}
              onChange={(val) => handleViewProfile(Number(val))}
              placeholder="Buscar perfil..."
              emptyMessage="Sin resultados"
              loading={loading}
            />
          </div>

          {/* Candidatos de Perfil */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <i className="fas fa-users text-purple-600 text-xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Candidatos del Perfil
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Lista de candidatos que aplicaron a una vacante
            </p>
            <SearchableSelect
              options={profiles.map(p => ({
                value: p.id,
                label: p.position_title,
                searchText: `${p.position_title} - ${p.client_name}`
              }))}
              onChange={(val) => handleViewCandidates(Number(val))}
              placeholder="Buscar perfil..."
              emptyMessage="Sin resultados"
              loading={loading}
            />
          </div>

          {/* Timeline de Perfil */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <i className="fas fa-history text-green-600 text-xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Timeline del Proceso
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Línea de tiempo completa de un perfil
            </p>
            <SearchableSelect
              options={profiles.map(p => ({
                value: p.id,
                label: p.position_title,
                searchText: `${p.position_title} - ${p.client_name}`
              }))}
              onChange={(val) => handleViewTimeline(Number(val))}
              placeholder="Buscar perfil..."
              emptyMessage="Sin resultados"
              loading={loading}
            />
          </div>

          {/* Reporte de Candidato */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
              <i className="fas fa-user text-orange-600 text-xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Reporte de Candidato
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Información completa de un candidato
            </p>
            <SearchableSelect
              options={candidates.map(c => ({
                value: c.id,
                label: c.full_name,
                searchText: `${c.full_name} - ${c.email}`
              }))}
              onChange={(val) => handleViewCandidate(Number(val))}
              placeholder="Buscar candidato por nombre o email..."
              emptyMessage="Sin resultados"
              loading={loading}
            />
          </div>

          {/* Reporte de Cliente */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mb-4">
              <i className="fas fa-building text-red-600 text-xl"></i>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Reporte de Cliente
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Historial completo de un cliente
            </p>
            <SearchableSelect
              options={clients.map(c => ({
                value: c.id,
                label: c.company_name,
                searchText: `${c.company_name} - ${c.industry || ''}`
              }))}
              onChange={(val) => handleViewClient(Number(val))}
              placeholder="Buscar cliente por nombre..."
              emptyMessage="Sin resultados"
              loading={loading}
            />
          </div>

          {/* Reporte Final Consolidado - ahora card reutilizable (variant: featured) */}
          <ReportCard
            variant="featured"
            badge="RECOMENDADO"
            icon={<i className="fas fa-file-contract text-purple-600 text-xl"></i>}
            title="Reporte Final Consolidado"
            subtitle="Toda la información en un solo documento"
            description={"Genera un reporte ejecutivo completo con todas las métricas, perfiles, candidatos y clientes. Ideal para presentaciones y análisis gerencial."}
            chips={[
              { icon: 'fa-chart-pie', label: 'Resumen Ejecutivo' },
              { icon: 'fa-briefcase', label: 'Todos los Perfiles' },
              { icon: 'fa-users', label: 'Todos los Candidatos' },
              { icon: 'fa-building', label: 'Todos los Clientes' }
            ]}
            cta={{ label: 'Generar Reporte', onClick: handleViewConsolidated }}
          />

        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER VISTAS
  // ============================================================

  return (
    <div className="p-6">
      {view === 'profile' && selectedId && (
        <ProfileReport profileId={selectedId} onBack={handleBack} />
      )}

      {view === 'candidates' && selectedId && (
        <ProfileCandidatesReport 
          profileId={selectedId} 
          onBack={handleBack}
          onViewCandidate={handleViewCandidate}
        />
      )}

      {view === 'timeline' && selectedId && (
        <ProfileTimelineReport profileId={selectedId} onBack={handleBack} />
      )}

      {view === 'candidate' && selectedId && (
        <CandidateFullReport candidateId={selectedId} onBack={handleBack} />
      )}

      {view === 'client' && selectedId && (
        <ClientFullReport 
          clientId={selectedId} 
          onBack={handleBack}
          onViewProfile={handleViewProfile}
        />
      )}

      {view === 'consolidated' && (
        <FullConsolidatedReport onBack={handleBack} />
      )}
    </div>
  );
}

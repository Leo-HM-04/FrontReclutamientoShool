'use client';

import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faSearch,
  faEye,
  faEdit,
  faTrash,
  faDownload,
  faFilter,
} from '@fortawesome/free-solid-svg-icons';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const mockCandidates = [
  {
    id: 1,
    name: 'Ana García Rodríguez',
    email: 'ana.garcia@email.com',
    phone: '+34 123 456 789',
    position: 'Desarrollador Frontend',
    experience: '3 años',
    skills: ['React', 'TypeScript', 'CSS'],
    status: 'Activo',
    appliedDate: '2024-01-15',
  },
  {
    id: 2,
    name: 'Carlos López Martín',
    email: 'carlos.lopez@email.com',
    phone: '+34 987 654 321',
    position: 'Diseñador UX/UI',
    experience: '5 años',
    skills: ['Figma', 'Adobe XD', 'Sketch'],
    status: 'En Proceso',
    appliedDate: '2024-01-14',
  },
  {
    id: 3,
    name: 'María Rodríguez Silva',
    email: 'maria.rodriguez@email.com',
    phone: '+34 555 123 456',
    position: 'Project Manager',
    experience: '7 años',
    skills: ['Agile', 'Scrum', 'Jira'],
    status: 'Contratado',
    appliedDate: '2024-01-12',
  },
  {
    id: 4,
    name: 'Juan Pérez González',
    email: 'juan.perez@email.com',
    phone: '+34 777 888 999',
    position: 'Backend Developer',
    experience: '4 años',
    skills: ['Node.js', 'Python', 'MongoDB'],
    status: 'Rechazado',
    appliedDate: '2024-01-10',
  },
];

export default function CandidatesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos');

  const filteredCandidates = mockCandidates.filter(candidate => {
    const matchesSearch = candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         candidate.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         candidate.position.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'Todos' || candidate.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Activo': return 'bg-green-100 text-green-800';
      case 'En Proceso': return 'bg-blue-100 text-blue-800';
      case 'Contratado': return 'bg-purple-100 text-purple-800';
      case 'Rechazado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Candidatos</h1>
          <p className="text-gray-600 mt-2">
            Gestiona todos los candidatos del sistema
          </p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <FontAwesomeIcon icon={faPlus} className="w-4 h-4 mr-2" />
          Añadir Candidato
        </Button>
      </div>

      {/* Filtros y búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <FontAwesomeIcon 
                  icon={faSearch} 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4"
                />
                <input
                  type="text"
                  placeholder="Buscar candidatos..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <select
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option>Todos</option>
                <option>Activo</option>
                <option>En Proceso</option>
                <option>Contratado</option>
                <option>Rechazado</option>
              </select>
            </div>
            <Button variant="outline">
              <FontAwesomeIcon icon={faFilter} className="w-4 h-4 mr-2" />
              Más Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de candidatos */}
      <Card>
        <CardHeader>
          <CardTitle>
            Candidatos ({filteredCandidates.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Candidato</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Posición</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Experiencia</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Habilidades</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Estatus</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Fecha</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredCandidates.map((candidate) => (
                  <tr key={candidate.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-4 px-4">
                      <div>
                        <div className="font-medium text-gray-900">{candidate.name}</div>
                        <div className="text-sm text-gray-500">{candidate.email}</div>
                        <div className="text-sm text-gray-500">{candidate.phone}</div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-900">{candidate.position}</td>
                    <td className="py-4 px-4 text-gray-600">{candidate.experience}</td>
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {candidate.skills.slice(0, 2).map((skill) => (
                          <span
                            key={skill}
                            className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full"
                          >
                            {skill}
                          </span>
                        ))}
                        {candidate.skills.length > 2 && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                            +{candidate.skills.length - 2}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(candidate.status)}`}>
                        {candidate.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-600">
                      {new Date(candidate.appliedDate).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex space-x-2">
                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                          <FontAwesomeIcon icon={faEye} className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-green-600 hover:bg-green-50 rounded">
                          <FontAwesomeIcon icon={faEdit} className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-gray-600 hover:bg-gray-50 rounded">
                          <FontAwesomeIcon icon={faDownload} className="w-4 h-4" />
                        </button>
                        <button className="p-2 text-red-600 hover:bg-red-50 rounded">
                          <FontAwesomeIcon icon={faTrash} className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

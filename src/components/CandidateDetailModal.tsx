'use client';

import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faTimes,
  faUser,
  faEnvelope,
  faPhoneAlt,
  faMapMarkerAlt,
  faBriefcase,
  faGraduationCap,
  faDollarSign,
  faLanguage,
  faCertificate,
  faCalendarAlt,
  faFileAlt,
  faEdit,
  faEye,
  faDownload,
  faCommentAlt,
  faPlus
} from '@fortawesome/free-solid-svg-icons';

interface CandidateDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: any;
  onEdit: () => void;
}

const STATUS_CONFIG = {
  'new': { label: 'Nuevo', color: 'bg-blue-100 text-blue-800' },
  'screening': { label: 'En Revisión', color: 'bg-yellow-100 text-yellow-800' },
  'qualified': { label: 'Calificado', color: 'bg-green-100 text-green-800' },
  'interview': { label: 'En Entrevista', color: 'bg-purple-100 text-purple-800' },
  'offer': { label: 'Oferta Extendida', color: 'bg-orange-100 text-orange-800' },
  'hired': { label: 'Contratado', color: 'bg-green-100 text-green-800' },
  'rejected': { label: 'Rechazado', color: 'bg-red-100 text-red-800' },
  'withdrawn': { label: 'Retirado', color: 'bg-gray-100 text-gray-800' },
};

export default function CandidateDetailModal({ isOpen, onClose, candidate, onEdit }: CandidateDetailModalProps) {
  if (!isOpen || !candidate) return null;

  const statusConfig = STATUS_CONFIG[candidate.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.new;

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return 'No especificado';
    if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
    if (min) return `Desde $${min.toLocaleString()}`;
    if (max) return `Hasta $${max.toLocaleString()}`;
    return 'No especificado';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Mock data for documents and notes - replace with real API calls
  const mockDocuments = [
    { id: 1, name: 'CV_Juan_Perez.pdf', type: 'CV', uploadedAt: '2024-11-01T10:00:00Z' },
    { id: 2, name: 'Carta_Presentacion.pdf', type: 'Carta de Presentación', uploadedAt: '2024-11-01T10:15:00Z' },
  ];

  const mockNotes = [
    {
      id: 1,
      content: 'Candidato muy promisorio, buena experiencia en React y Node.js. Disponible para entrevista la próxima semana.',
      createdAt: '2024-11-01T14:30:00Z',
      author: 'María González'
    },
    {
      id: 2,
      content: 'Entrevista telefónica completada. Buena comunicación y conocimientos técnicos sólidos.',
      createdAt: '2024-11-02T09:15:00Z',
      author: 'Carlos Martínez'
    },
  ];

  return (
    <div className="fixed top-16 left-0 right-0 bottom-0  flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div className="flex items-center">
            <div className="w-16 h-16 bg-linear-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold mr-4">
              {candidate.first_name.charAt(0)}{candidate.last_name.charAt(0)}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {candidate.first_name} {candidate.last_name}
              </h2>
              <p className="text-gray-600">{candidate.current_position} en {candidate.current_company}</p>
              <div className="mt-2">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${statusConfig.color}`}>
                  {statusConfig.label}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FontAwesomeIcon icon={faEdit} className="mr-2" />
              Editar
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <FontAwesomeIcon icon={faTimes} className="text-xl" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column */}
            <div className="space-y-6">
              {/* Personal Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FontAwesomeIcon icon={faUser} className="mr-2 text-blue-600" />
                  Información Personal
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center">
                    <FontAwesomeIcon icon={faEnvelope} className="w-4 h-4 text-gray-400 mr-3" />
                    <span className="text-gray-700">{candidate.email}</span>
                  </div>
                  <div className="flex items-center">
                    <FontAwesomeIcon icon={faPhoneAlt} className="w-4 h-4 text-gray-400 mr-3" />
                    <span className="text-gray-700">{candidate.phone}</span>
                  </div>
                  <div className="flex items-center">
                    <FontAwesomeIcon icon={faMapMarkerAlt} className="w-4 h-4 text-gray-400 mr-3" />
                    <span className="text-gray-700">{candidate.city}, {candidate.state}</span>
                  </div>
                  <div className="flex items-center">
                    <FontAwesomeIcon icon={faCalendarAlt} className="w-4 h-4 text-gray-400 mr-3" />
                    <span className="text-gray-700">Registrado el {formatDate(candidate.created_at)}</span>
                  </div>
                </div>
              </div>

              {/* Professional Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FontAwesomeIcon icon={faBriefcase} className="mr-2 text-blue-600" />
                  Información Profesional
                </h3>
                <div className="space-y-4">
                  {candidate.work_history && candidate.work_history.length > 0 ? (
                    candidate.work_history.map((work: any, index: number) => (
                      <div key={index} className={`space-y-2 ${index > 0 ? 'border-t border-gray-200 pt-3' : ''}`}>
                        {candidate.work_history.length > 1 && (
                          <span className="text-xs font-semibold text-emerald-600 uppercase">Experiencia {index + 1}</span>
                        )}
                        <div>
                          <span className="text-sm font-medium text-gray-500">Posición:</span>
                          <p className="text-gray-900">{work.position || 'No especificado'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Empresa:</span>
                          <p className="text-gray-900">{work.company || 'No especificado'}</p>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-500">Años de Experiencia:</span>
                          <p className="text-gray-900">{work.years} años</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Posición Actual:</span>
                        <p className="text-gray-900">{candidate.current_position || 'No especificado'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Empresa:</span>
                        <p className="text-gray-900">{candidate.current_company || 'No especificado'}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-500">Años de Experiencia:</span>
                        <p className="text-gray-900">{candidate.years_of_experience} años</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Education */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FontAwesomeIcon icon={faGraduationCap} className="mr-2 text-blue-600" />
                  Educación
                </h3>
                <div className="space-y-4">
                  {candidate.education_history && candidate.education_history.length > 0 ? (
                    candidate.education_history.map((edu: any, index: number) => (
                      <div key={index} className={`space-y-2 ${index > 0 ? 'border-t border-gray-200 pt-3' : ''}`}>
                        {candidate.education_history.length > 1 && (
                          <span className="text-xs font-semibold text-blue-600 uppercase">Educación {index + 1}</span>
                        )}
                        <div>
                          <span className="text-sm font-medium text-gray-500">Nivel de Estudios:</span>
                          <p className="text-gray-900">{edu.level || 'No especificado'}</p>
                        </div>
                        {edu.university && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">Universidad:</span>
                            <p className="text-gray-900">{edu.university}</p>
                          </div>
                        )}
                        {edu.degree && (
                          <div>
                            <span className="text-sm font-medium text-gray-500">Título/Carrera:</span>
                            <p className="text-gray-900">{edu.degree}</p>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm font-medium text-gray-500">Nivel de Estudios:</span>
                        <p className="text-gray-900">{candidate.education_level || 'No especificado'}</p>
                      </div>
                      {candidate.university && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Universidad:</span>
                          <p className="text-gray-900">{candidate.university}</p>
                        </div>
                      )}
                      {candidate.degree && (
                        <div>
                          <span className="text-sm font-medium text-gray-500">Título/Carrera:</span>
                          <p className="text-gray-900">{candidate.degree}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Salary Expectations */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <FontAwesomeIcon icon={faDollarSign} className="mr-2 text-blue-600" />
                  Expectativas Salariales
                </h3>
                <p className="text-gray-900">
                  {formatSalary(candidate.salary_expectation_min, candidate.salary_expectation_max)}
                </p>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-6">
              {/* Skills */}
              {candidate.skills && candidate.skills.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FontAwesomeIcon icon={faCertificate} className="mr-2 text-blue-600" />
                    Habilidades
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {candidate.skills.map((skill: string, index: number) => (
                      <span
                        key={index}
                        className="inline-flex px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Languages */}
              {candidate.languages && candidate.languages.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FontAwesomeIcon icon={faLanguage} className="mr-2 text-blue-600" />
                    Idiomas
                  </h3>
                  <div className="space-y-2">
                    {candidate.languages.map((language: any, index: number) => (
                      <div key={index} className="flex justify-between">
                        <span className="text-gray-900">{language.name}</span>
                        <span className="text-gray-500">{language.level}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Documents */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <FontAwesomeIcon icon={faFileAlt} className="mr-2 text-blue-600" />
                    Documentos
                  </h3>
                  <button className="text-blue-600 hover:text-blue-700 text-sm">
                    <FontAwesomeIcon icon={faPlus} className="mr-1" />
                    Subir Documento
                  </button>
                </div>
                <div className="space-y-2">
                  {mockDocuments.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center">
                        <FontAwesomeIcon icon={faFileAlt} className="text-red-500 mr-2" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{doc.name}</p>
                          <p className="text-xs text-gray-500">{doc.type}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-700" title="Ver">
                          <FontAwesomeIcon icon={faEye} />
                        </button>
                        <button className="text-green-600 hover:text-green-700" title="Descargar">
                          <FontAwesomeIcon icon={faDownload} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <FontAwesomeIcon icon={faCommentAlt} className="mr-2 text-blue-600" />
                    Notas
                  </h3>
                  <button className="text-blue-600 hover:text-blue-700 text-sm">
                    <FontAwesomeIcon icon={faPlus} className="mr-1" />
                    Agregar Nota
                  </button>
                </div>
                <div className="space-y-3">
                  {mockNotes.map((note) => (
                    <div key={note.id} className="bg-white p-3 rounded border">
                      <p className="text-gray-900 text-sm">{note.content}</p>
                      <div className="flex justify-between items-center mt-2 text-xs text-gray-500">
                        <span>Por {note.author}</span>
                        <span>{formatDate(note.createdAt)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

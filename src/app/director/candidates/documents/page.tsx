'use client';

import React, { useState, useEffect } from 'react';
import { useModal } from '@/context/ModalContext';
import ProfessionalLicenseVerificationSummary, {
  getProfessionalLicenseStatusClass,
  getProfessionalLicenseStatusDescription,
  type ProfessionalLicenseVerificationData,
} from '@/components/candidates/ProfessionalLicenseVerificationSummary';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faFolderOpen,
  faPlus,
  faSearch,
  faFilter,
  faDownload,
  faTrash,
  faFilePdf,
  faFileWord,
  faFileImage,
  faFile,
  faUser,
  faCalendarAlt,
  faTimes,
  faUpload,
  faFileAlt,
  faSort,
  faSortUp,
  faSortDown,
  faEye,
  faCertificate,
  faLink
} from '@fortawesome/free-solid-svg-icons';
import { apiClient } from '@/lib/api';
import ShareDocumentLinkModal from '@/components/ShareDocumentLinkModal';

// Tipos de documentos según el backend
const DOCUMENT_TYPES = [
  // DOCUMENTACION
  { value: 'estudio_socioeconomico', label: 'Estudio socioeconómico', icon: faFileAlt, color: 'text-blue-600', category: 'DOCUMENTACION' },
  { value: 'estudio_laboratorio', label: 'Estudio de laboratorio', icon: faFileAlt, color: 'text-blue-600', category: 'DOCUMENTACION' },
  { value: 'estudio_psicometrico', label: 'Estudio psicométrico', icon: faFileAlt, color: 'text-blue-600', category: 'DOCUMENTACION' },
  { value: 'entrevistas_examenes', label: 'Entrevistas y exámenes', icon: faFileAlt, color: 'text-blue-600', category: 'DOCUMENTACION' },
  
  // INFORMACIÓN PERSONAL
  { value: 'ine_pasaporte', label: 'Identificación oficial INE o pasaporte (no IFE)', icon: faCertificate, color: 'text-green-600', category: 'INFORMACIÓN PERSONAL' },
  { value: 'acta_nacimiento', label: 'Acta de nacimiento', icon: faCertificate, color: 'text-green-600', category: 'INFORMACIÓN PERSONAL' },
  { value: 'comprobante_domicilio', label: 'Comprobante de domicilio', icon: faFile, color: 'text-purple-600', category: 'INFORMACIÓN PERSONAL' },
  { value: 'situacion_fiscal', label: 'Constancia de situación fiscal', icon: faFile, color: 'text-purple-600', category: 'INFORMACIÓN PERSONAL' },
  { value: 'curp', label: 'CURP', icon: faCertificate, color: 'text-green-600', category: 'INFORMACIÓN PERSONAL' },
  { value: 'nss', label: 'Numero de Seguridad Social NSS', icon: faCertificate, color: 'text-green-600', category: 'INFORMACIÓN PERSONAL' },
  { value: 'estado_cuenta', label: 'Estado de cuenta bancario', icon: faFile, color: 'text-purple-600', category: 'INFORMACIÓN PERSONAL' },
  { value: 'cartas_recomendacion', label: 'Dos cartas de recomendación con números telefónicos', icon: faFile, color: 'text-purple-600', category: 'INFORMACIÓN PERSONAL' },
  
  // INFORMACIÓN DE GRADO ACADÉMICO
  { value: 'titulo_profesional', label: 'Título profesional', icon: faCertificate, color: 'text-orange-600', category: 'INFORMACIÓN DE GRADO ACADÉMICO' },
  { value: 'cedula_profesional', label: 'Cedula profesional', icon: faCertificate, color: 'text-orange-600', category: 'INFORMACIÓN DE GRADO ACADÉMICO' },
  { value: 'cv', label: 'CV', icon: faFileAlt, color: 'text-orange-600', category: 'INFORMACIÓN DE GRADO ACADÉMICO' },
  { value: 'cartas_trabajos_anteriores', label: 'Cartas de anteriores trabajos', icon: faFile, color: 'text-orange-600', category: 'INFORMACIÓN DE GRADO ACADÉMICO' },
];

interface Document {
  id: number;
  candidate: number;
  document_type: string;
  file: string;
  file_url: string;
  original_filename: string;
  description: string;
  ai_extracted_text?: string;
  ai_parsed_data?: any;
  professional_license_verification?: ProfessionalLicenseVerificationData | null;
  uploaded_by: number;
  uploaded_by_name: string;
  uploaded_at: string;
}

interface Candidate {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export default function DocumentsPage() {
  const { showConfirm } = useModal();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [candidateFilter, setCandidateFilter] = useState('');
  const [documentTypeFilter, setDocumentTypeFilter] = useState('');
  const [sortField, setSortField] = useState('uploaded_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Modales
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showShareLinkModal, setShowShareLinkModal] = useState(false);
  
  // Toast
  const [toast, setToast] = useState<{show: boolean, message: string, type: 'success' | 'error'}>({
    show: false,
    message: '',
    type: 'success'
  });

  useEffect(() => {
    fetchDocuments();
    fetchCandidates();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      console.log('🔵 Cargando documentos...');
      
      const response = await apiClient.getCandidateDocuments();
      console.log('🟢 Respuesta del servidor:', response);
      
      const documentsData = (response as any)?.results || (response as any) || [];
      console.log('✅ Documentos procesados:', documentsData);
      
      setDocuments(documentsData);
    } catch (error: any) {
      console.error('❌ Error fetching documents:', error);
      showToast(`Error al cargar documentos: ${error.message || 'Error desconocido'}`, 'error');
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCandidates = async () => {
    try {
      setLoadingCandidates(true);
      const response = await apiClient.getCandidates();
      const candidatesData = (response as any)?.results || (response as any) || [];
      setCandidates(candidatesData);
    } catch (error) {
      console.error('❌ Error loading candidates:', error);
    } finally {
      setLoadingCandidates(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showConfirm('¿Estás seguro de que deseas eliminar este documento?');
    if (!confirmed) {
      return;
    }

    try {
      console.log('🗑️ Eliminando documento:', id);
      await apiClient.deleteCandidateDocument(id);
      
      setDocuments(docs => docs.filter(doc => doc.id !== id));
      showToast('Documento eliminado exitosamente', 'success');
    } catch (error: any) {
      console.error('❌ Error al eliminar:', error);
      showToast(`Error al eliminar: ${error.message || 'Error desconocido'}`, 'error');
    }
  };

  const handleDownload = (doc: Document) => {
    // Abrir el archivo en una nueva pestaña
    window.open(doc.file_url, '_blank');
  };

  const handleViewDetails = (doc: Document) => {
    setSelectedDocument(doc);
    setShowDetailModal(true);
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const getDocumentTypeConfig = (type: string) => {
    return DOCUMENT_TYPES.find(t => t.value === type) || DOCUMENT_TYPES[4]; // 'other' por defecto
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf':
        return { icon: faFilePdf, color: 'text-red-600' };
      case 'doc':
      case 'docx':
        return { icon: faFileWord, color: 'text-blue-600' };
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return { icon: faFileImage, color: 'text-green-600' };
      default:
        return { icon: faFile, color: 'text-gray-600' };
    }
  };

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filtrado y ordenamiento
  const filteredAndSortedDocuments = React.useMemo(() => {
    let filtered = [...documents];

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(doc => 
        doc.original_filename?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.uploaded_by_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por candidato
    if (candidateFilter) {
      filtered = filtered.filter(doc => String(doc.candidate) === candidateFilter);
    }

    // Filtrar por tipo de documento
    if (documentTypeFilter) {
      filtered = filtered.filter(doc => doc.document_type === documentTypeFilter);
    }

    // Ordenar
    filtered.sort((a, b) => {
      let aVal: any = a[sortField as keyof Document];
      let bVal: any = b[sortField as keyof Document];

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [documents, searchTerm, candidateFilter, documentTypeFilter, sortField, sortDirection]);

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

  const getCandidateName = (candidateId: number) => {
    const candidate = candidates.find(c => c.id === candidateId);
    return candidate ? `${candidate.first_name} ${candidate.last_name}` : `ID: ${candidateId}`;
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
            <h1 className="text-3xl font-bold text-gray-900">Documentos de Candidatos</h1>
            <p className="text-gray-600 mt-1">Gestiona CVs, certificados y documentos de los candidatos</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowShareLinkModal(true)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faLink} />
              Compartir Link
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faPlus} />
              Subir Documento
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <FontAwesomeIcon 
              icon={faSearch} 
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              placeholder="Buscar por nombre, descripción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Candidate Filter */}
          <select
            value={candidateFilter}
            onChange={(e) => setCandidateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            disabled={loadingCandidates}
          >
            <option value="">Todos los candidatos</option>
            {candidates.map(candidate => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.first_name} {candidate.last_name}
              </option>
            ))}
          </select>

          {/* Document Type Filter */}
          <select
            value={documentTypeFilter}
            onChange={(e) => setDocumentTypeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los tipos</option>
            {DOCUMENT_TYPES.map(type => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          {/* Clear Filters */}
          {(searchTerm || candidateFilter || documentTypeFilter) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCandidateFilter('');
                setDocumentTypeFilter('');
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Limpiar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{documents.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <FontAwesomeIcon icon={faFolderOpen} className="text-blue-600 text-xl" />
            </div>
          </div>
        </div>

        {DOCUMENT_TYPES.slice(0, 4).map(type => (
          <div key={type.value} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{type.label}</p>
                <p className="text-2xl font-bold text-gray-900">
                  {documents.filter(d => d.document_type === type.value).length}
                </p>
              </div>
              <div className={`p-3 bg-${type.color.split('-')[1]}-100 rounded-lg`}>
                <FontAwesomeIcon icon={type.icon} className={`${type.color} text-xl`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Documents Grid/List */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando documentos...</p>
        </div>
      ) : filteredAndSortedDocuments.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <FontAwesomeIcon icon={faFolderOpen} className="text-gray-300 text-6xl mb-4" />
          <p className="text-gray-600 text-lg">No se encontraron documentos</p>
          <p className="text-gray-500 mt-2">
            {searchTerm || candidateFilter || documentTypeFilter
              ? 'Intenta ajustar los filtros de búsqueda' 
              : 'Comienza subiendo un nuevo documento'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    ID
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('original_filename')}
                  >
                    <div className="flex items-center gap-2">
                      Archivo
                      <FontAwesomeIcon icon={getSortIcon('original_filename')} className="text-gray-400" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Candidato
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('document_type')}
                  >
                    <div className="flex items-center gap-2">
                      Tipo
                      <FontAwesomeIcon icon={getSortIcon('document_type')} className="text-gray-400" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Subido por
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('uploaded_at')}
                  >
                    <div className="flex items-center gap-2">
                      Fecha
                      <FontAwesomeIcon icon={getSortIcon('uploaded_at')} className="text-gray-400" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedDocuments.map((document) => {
                  const typeConfig = getDocumentTypeConfig(document.document_type);
                  const fileIcon = getFileIcon(document.original_filename);
                  
                  return (
                    <tr key={document.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{document.id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <FontAwesomeIcon icon={fileIcon.icon} className={`${fileIcon.color} text-2xl`} />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {document.original_filename}
                            </div>
                            {document.professional_license_verification && (
                              <span
                                title={
                                  document.professional_license_verification.evidence_summary ||
                                  getProfessionalLicenseStatusDescription(document.professional_license_verification.status)
                                }
                                className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${getProfessionalLicenseStatusClass(document.professional_license_verification.status)}`}
                              >
                                <FontAwesomeIcon icon={faCertificate} className="text-[10px]" />
                                Cédula: {document.professional_license_verification.status_display || 'En verificación'}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <FontAwesomeIcon icon={faUser} className="text-gray-400" />
                          {getCandidateName(document.candidate)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-${typeConfig.color.split('-')[1]}-100 ${typeConfig.color}`}>
                          <FontAwesomeIcon icon={typeConfig.icon} />
                          {typeConfig.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                        {document.description || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {document.uploaded_by_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400" />
                          {formatDate(document.uploaded_at)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewDetails(document)}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                          title="Ver detalles"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </button>
                        <button
                          onClick={() => handleDownload(document)}
                          className="text-green-600 hover:text-green-900 mr-3"
                          title="Descargar"
                        >
                          <FontAwesomeIcon icon={faDownload} />
                        </button>
                        <button
                          onClick={() => handleDelete(document.id)}
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
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <UploadDocumentModal
          candidates={candidates}
          onClose={() => setShowUploadModal(false)}
          onSuccess={(message: string) => {
            showToast(message, 'success');
            fetchDocuments();
          }}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedDocument && (
        <DocumentDetailModal
          document={selectedDocument}
          candidateName={getCandidateName(selectedDocument.candidate)}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedDocument(null);
          }}
        />
      )}

      {/* Share Document Link Modal */}
      <ShareDocumentLinkModal
        isOpen={showShareLinkModal}
        onClose={() => setShowShareLinkModal(false)}
        onSuccess={(link) => {
          setShowShareLinkModal(false);
          showToast('Link generado exitosamente', 'success');
        }}
      />
    </div>
  );
}

// ====== UPLOAD MODAL COMPONENT ======

interface UploadDocumentModalProps {
  candidates: Candidate[];
  onClose: () => void;
  onSuccess: (message: string) => void;
}

function UploadDocumentModal({ candidates, onClose, onSuccess }: UploadDocumentModalProps) {
  const [formData, setFormData] = useState({
    candidate: '',
    document_type: 'estudio_socioeconomico',
    description: '',
    file: null as File | null,
  });
  const [uploading, setUploading] = useState(false);
  const { showAlert } = useModal();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, file: e.target.files[0] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.candidate || !formData.file) {
      await showAlert('Por favor completa todos los campos obligatorios');
      return;
    }

    try {
      setUploading(true);
      console.log('📤 Subiendo documento...');

      const uploadFormData = new FormData();
      uploadFormData.append('candidate', formData.candidate);
      uploadFormData.append('document_type', formData.document_type);
      uploadFormData.append('description', formData.description);
      uploadFormData.append('file', formData.file);

      await apiClient.uploadCandidateDocument(uploadFormData);
      
      console.log('✅ Documento subido exitosamente');
      onSuccess('Documento subido exitosamente');
      onClose();
    } catch (error: any) {
      console.error('❌ Error al subir:', error);
      await showAlert(`Error al subir documento: ${error.message || 'Error desconocido'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed top-16 left-0 right-0 bottom-0  flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Subir Documento</h2>
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
          {/* Candidato */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Candidato <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.candidate}
              onChange={(e) => setFormData({ ...formData, candidate: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Seleccionar candidato...</option>
              {candidates.map(candidate => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.first_name} {candidate.last_name} - {candidate.email}
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de Documento */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Documento <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.document_type}
              onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <optgroup label="━━━ DOCUMENTACIÓN ━━━">
                {DOCUMENT_TYPES.filter(type => type.category === 'DOCUMENTACION').map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="━━━ INFORMACIÓN PERSONAL ━━━">
                {DOCUMENT_TYPES.filter(type => type.category === 'INFORMACIÓN PERSONAL').map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="━━━ INFORMACIÓN DE GRADO ACADÉMICO ━━━">
                {DOCUMENT_TYPES.filter(type => type.category === 'INFORMACIÓN DE GRADO ACADÉMICO').map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Descripción opcional del documento..."
            />
          </div>

          {/* Archivo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Archivo <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className="hidden"
                id="file-upload"
                required
              />
              <label 
                htmlFor="file-upload" 
                className="cursor-pointer"
              >
                <FontAwesomeIcon icon={faUpload} className="text-4xl text-gray-400 mb-3" />
                <p className="text-sm text-gray-600">
                  {formData.file 
                    ? `Seleccionado: ${formData.file.name}` 
                    : 'Click para seleccionar un archivo'}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  PDF, Word, o imágenes (máx. 10MB)
                </p>
              </label>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={uploading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Subiendo...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faUpload} />
                  Subir Documento
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ====== DETAIL MODAL COMPONENT ======

interface DocumentDetailModalProps {
  document: Document;
  candidateName: string;
  onClose: () => void;
}

function DocumentDetailModal({ document, candidateName, onClose }: DocumentDetailModalProps) {
  const typeConfig = DOCUMENT_TYPES.find(t => t.value === document.document_type) || DOCUMENT_TYPES[4];

  return (
    <div className="fixed top-16 left-0 right-0 bottom-0  flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Detalles del Documento</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <FontAwesomeIcon icon={faTimes} className="text-xl" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Información Principal */}
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Nombre del Archivo</label>
              <p className="text-gray-900 font-medium">{document.original_filename}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Tipo de Documento</label>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-${typeConfig.color.split('-')[1]}-100 ${typeConfig.color}`}>
                <FontAwesomeIcon icon={typeConfig.icon} />
                {typeConfig.label}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Candidato</label>
              <p className="text-gray-900 font-medium">{candidateName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Subido por</label>
              <p className="text-gray-900 font-medium">{document.uploaded_by_name}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Fecha de Subida</label>
            <p className="text-gray-900 font-medium">
              {new Date(document.uploaded_at).toLocaleString('es-MX', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>

          {/* Descripción */}
          {document.description && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Descripción</label>
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{document.description}</p>
            </div>
          )}

          {/* Texto Extraído por IA */}
          {document.ai_extracted_text && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Texto Extraído por IA
              </label>
              <div className="bg-gray-50 p-4 rounded-lg max-h-60 overflow-y-auto">
                <p className="text-gray-700 text-sm whitespace-pre-wrap">
                  {document.ai_extracted_text}
                </p>
              </div>
            </div>
          )}

          {/* Datos Parseados por IA */}
          {document.ai_parsed_data && Object.keys(document.ai_parsed_data).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Datos Estructurados (IA)
              </label>
              <div className="bg-gray-50 p-4 rounded-lg">
                <pre className="text-xs text-gray-700 overflow-x-auto">
                  {JSON.stringify(document.ai_parsed_data, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Verificación de Cédula Profesional (OCR + consulta oficial SEP/RNP) */}
          {document.document_type === 'cedula_profesional' && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2 flex items-center gap-2">
                <FontAwesomeIcon icon={faCertificate} className="text-orange-600" />
                Análisis de Cédula Profesional
              </label>
              <ProfessionalLicenseVerificationSummary
                verification={document.professional_license_verification}
                showComparisonDetails
                title="Verificación oficial SEP/RNP"
                description="Extracción OCR de la cédula y cotejo automático contra el Registro Nacional de Profesionistas."
                emptyLabel="La verificación aún no se ha inicializado para esta cédula."
              />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={() => window.open(document.file_url, '_blank')}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faDownload} />
              Descargar Documento
            </button>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

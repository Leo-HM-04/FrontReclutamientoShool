'use client';

import { useState } from 'react';
import { useModal } from '@/context/ModalContext';
import { apiClient } from '@/lib/api';
import AIMethodBadge from '@/components/ui/AIMethodBadge';

interface DirectorCandidateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export default function DirectorCandidateFormModal({ isOpen, onClose, onSuccess }: DirectorCandidateFormModalProps) {
  const { showAlert } = useModal();
  const [showSocialNetworks, setShowSocialNetworks] = useState(false);
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [showMetadata, setShowMetadata] = useState(false);

  const [candidateForm, setCandidateForm] = useState({
    nombres: '', apellidos: '', fullName: '', correoElectronico: '', telefono: '', telefonoAlternativo: '',
    ciudad: '', estado: '', pais: 'México', direccionCompleta: '',
    posicionActual: '', empresaActual: '', anosExperiencia: 0, nivelEstudios: '', universidad: '', carreraTitulo: '', habilidades: '', idiomas: '', certificaciones: '',
    expectativaSalarialMinima: '', expectativaSalarialMaxima: '', moneda: 'MXN', salaryExpectationRange: 'No especificado',
    disponibleDesde: '', diasPreviso: '',
    estadoCandidato: 'Nuevo', asignadoA: '', fuenteReclutamiento: '', notasInternas: '',
    linkedin: '', portfolio: '', github: '',
    resumenGeneradoIA: '', puntuacionCoincidenciaIA: '', analisisCompletoIA: '',
    creadoPor: '', fechaCreacion: '', ultimaActualizacion: '', activeApplications: ''
  });

  const resetForm = () => {
    setShowSocialNetworks(false);
    setShowAIAnalysis(false);
    setShowMetadata(false);
    setCandidateForm({
      nombres: '', apellidos: '', fullName: '', correoElectronico: '', telefono: '', telefonoAlternativo: '',
      ciudad: '', estado: '', pais: 'México', direccionCompleta: '',
      posicionActual: '', empresaActual: '', anosExperiencia: 0, nivelEstudios: '', universidad: '', carreraTitulo: '', habilidades: '', idiomas: '', certificaciones: '',
      expectativaSalarialMinima: '', expectativaSalarialMaxima: '', moneda: 'MXN', salaryExpectationRange: 'No especificado',
      disponibleDesde: '', diasPreviso: '',
      estadoCandidato: 'Nuevo', asignadoA: '', fuenteReclutamiento: '', notasInternas: '',
      linkedin: '', portfolio: '', github: '',
      resumenGeneradoIA: '', puntuacionCoincidenciaIA: '', analisisCompletoIA: '',
      creadoPor: '', fechaCreacion: '', ultimaActualizacion: '', activeApplications: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validaciones básicas
      if (!candidateForm.nombres.trim()) {
        await showAlert('El nombre es requerido');
        return;
      }
      if (!candidateForm.apellidos.trim()) {
        await showAlert('Los apellidos son requeridos');
        return;
      }
      if (!candidateForm.correoElectronico.trim()) {
        await showAlert('El correo electrónico es requerido');
        return;
      }

      // Mapear estados del frontend a backend
      const statusMap: Record<string, string> = {
        'Nuevo': 'new',
        'En Proceso': 'screening',
        'Calificado': 'qualified',
        'No Calificado': 'rejected'
      };

      // ========================================
      // PREPARAR DATOS COMPLETOS
      // ========================================
      const candidateData: any = {
        // 1. INFORMACIÓN PERSONAL (REQUERIDOS)
        first_name: candidateForm.nombres.trim(),
        last_name: candidateForm.apellidos.trim(),
        email: candidateForm.correoElectronico.trim(),
        
        // 2. UBICACIÓN (REQUERIDOS)
        city: candidateForm.ciudad.trim() || 'No especificado',
        state: candidateForm.estado.trim() || 'No especificado',
        country: candidateForm.pais.trim() || 'México',
        
        // 3. EDUCACIÓN (REQUERIDO)
        education_level: candidateForm.nivelEstudios.trim() || 'No especificado',
      };

      // CAMPOS OPCIONALES - Solo agregar si tienen valor
      
      // Contacto
      if (candidateForm.telefono) {
        candidateData.phone = candidateForm.telefono.trim();
      }
      if (candidateForm.telefonoAlternativo) {
        candidateData.alternative_phone = candidateForm.telefonoAlternativo.trim();
      }
      if (candidateForm.direccionCompleta) {
        candidateData.address = candidateForm.direccionCompleta.trim();
      }

      // Información Profesional
      if (candidateForm.posicionActual) {
        candidateData.current_position = candidateForm.posicionActual.trim();
      }
      if (candidateForm.empresaActual) {
        candidateData.current_company = candidateForm.empresaActual.trim();
      }
      if (candidateForm.anosExperiencia) {
        const years = parseInt(candidateForm.anosExperiencia.toString());
        candidateData.years_of_experience = isNaN(years) ? 0 : years;
      }
      if (candidateForm.universidad) {
        candidateData.university = candidateForm.universidad.trim();
      }
      if (candidateForm.carreraTitulo) {
        candidateData.degree = candidateForm.carreraTitulo.trim();
      }

      // Habilidades y Competencias (JSON Arrays)
      if (candidateForm.habilidades) {
        const skillsArray = candidateForm.habilidades
          .split(',')
          .map(s => s.trim())
          .filter(s => s.length > 0);
        if (skillsArray.length > 0) {
          candidateData.skills = skillsArray;
        }
      }
      
      if (candidateForm.idiomas) {
        const languagesArray = candidateForm.idiomas
          .split(',')
          .map(l => l.trim())
          .filter(l => l.length > 0);
        if (languagesArray.length > 0) {
          candidateData.languages = languagesArray;
        }
      }
      
      if (candidateForm.certificaciones) {
        const certsArray = candidateForm.certificaciones
          .split(',')
          .map(c => c.trim())
          .filter(c => c.length > 0);
        if (certsArray.length > 0) {
          candidateData.certifications = certsArray;
        }
      }

      // Expectativas Salariales
      if (candidateForm.expectativaSalarialMinima) {
        const minSalary = parseFloat(candidateForm.expectativaSalarialMinima);
        if (!isNaN(minSalary) && minSalary > 0) {
          candidateData.salary_expectation_min = minSalary;
        }
      }
      if (candidateForm.expectativaSalarialMaxima) {
        const maxSalary = parseFloat(candidateForm.expectativaSalarialMaxima);
        if (!isNaN(maxSalary) && maxSalary > 0) {
          candidateData.salary_expectation_max = maxSalary;
        }
      }
      if (candidateForm.moneda) {
        candidateData.salary_currency = candidateForm.moneda;
      }

      // Disponibilidad
      if (candidateForm.disponibleDesde) {
        candidateData.available_from = candidateForm.disponibleDesde;
      }
      if (candidateForm.diasPreviso) {
        const days = parseInt(candidateForm.diasPreviso);
        if (!isNaN(days) && days > 0) {
          candidateData.notice_period_days = days;
        }
      }

      // Gestión
      if (candidateForm.estadoCandidato) {
        candidateData.status = statusMap[candidateForm.estadoCandidato] || 'new';
      }
      if (candidateForm.asignadoA && candidateForm.asignadoA !== '') {
        const assignedId = parseInt(candidateForm.asignadoA);
        if (!isNaN(assignedId)) {
          candidateData.assigned_to = assignedId;
        }
      }
      if (candidateForm.fuenteReclutamiento) {
        candidateData.source = candidateForm.fuenteReclutamiento.trim();
      }
      if (candidateForm.notasInternas) {
        candidateData.internal_notes = candidateForm.notasInternas.trim();
      }

      // Redes Sociales / URLs
      if (candidateForm.linkedin) {
        candidateData.linkedin_url = candidateForm.linkedin.trim();
      }
      if (candidateForm.portfolio) {
        candidateData.portfolio_url = candidateForm.portfolio.trim();
      }
      if (candidateForm.github) {
        candidateData.github_url = candidateForm.github.trim();
      }

      // Análisis de IA
      if (candidateForm.resumenGeneradoIA) {
        candidateData.ai_summary = candidateForm.resumenGeneradoIA.trim();
      }
      if (candidateForm.puntuacionCoincidenciaIA) {
        const score = parseInt(candidateForm.puntuacionCoincidenciaIA);
        if (!isNaN(score) && score >= 0 && score <= 100) {
          candidateData.ai_match_score = score;
        }
      }
      if (candidateForm.analisisCompletoIA) {
        try {
          // Intentar parsear como JSON si es posible
          candidateData.ai_analysis = JSON.parse(candidateForm.analisisCompletoIA);
        } catch {
          // Si no es JSON, guardarlo como objeto con el texto
          candidateData.ai_analysis = { analysis: candidateForm.analisisCompletoIA };
        }
      }

      console.log('📝 Guardando candidato COMPLETO en el backend...');
      console.log('📦 Datos a enviar:', candidateData);
      
      // Guardar en el backend
      const response = await apiClient.createCandidate(candidateData);
      
      console.log('✅ Candidato guardado exitosamente:', response);
      
      if (onSuccess) {
        onSuccess("✅ Candidato agregado exitosamente con TODOS sus datos");
      }
      
      // Cerrar modal y limpiar formulario
      onClose();
      resetForm();
      
    } catch (error: any) {
      console.error('❌ Error al guardar candidato:', error);
      console.error('🔍 Detalles del error:', error.details || error.message);
      
      // Mostrar error detallado al usuario
      let errorMessage = 'Error al guardar el candidato';
      
      if (error.details) {
        // Extraer errores específicos de cada campo
        const errorDetails = Object.entries(error.details)
          .map(([field, messages]: [string, any]) => {
            const fieldName = field === 'email' ? 'Correo electrónico' :
                            field === 'first_name' ? 'Nombre' :
                            field === 'last_name' ? 'Apellidos' :
                            field === 'city' ? 'Ciudad' :
                            field === 'state' ? 'Estado' :
                            field === 'education_level' ? 'Nivel de estudios' : field;
            
            const message = Array.isArray(messages) ? messages[0] : messages;
            return `${fieldName}: ${message}`;
          })
          .join('\n');
        
        errorMessage = `Error al guardar:\n\n${errorDetails}`;
      } else if (error.message) {
        errorMessage = `Error: ${error.message}`;
      }
      
      await showAlert(errorMessage);
      
      if (onSuccess) {
        onSuccess(`❌ ${errorMessage}`);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0  flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden">
        {/* Header mejorado - Degradado azul suave */}
        <div className="bg-linear-to-r from-blue-50 via-blue-100 to-indigo-50 px-6 py-5 shadow-lg border-b-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 p-4 rounded-xl shadow-lg">
                <i className="fas fa-user-plus text-3xl text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Agregar Candidato</h2>
                <p className="text-gray-600 text-sm mt-1 font-semibold">Registrar nuevo candidato en el sistema</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white bg-red-500 hover:bg-red-600 p-3 rounded-lg transition-all duration-200 group shadow-lg"
              title="Cerrar"
            >
              <i className="fas fa-times text-xl group-hover:rotate-90 transition-transform duration-200" />
            </button>
          </div>
        </div>

        {/* Formulario con scroll */}
        <div className="p-6 bg-gray-50 overflow-y-auto max-h-[calc(95vh-120px)]">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">

            {/* 1. INFORMACIÓN PERSONAL */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-blue-500/10 border-b-2 border-blue-500 px-5 py-3.5">
                <h3 className="text-lg font-bold text-blue-800 tracking-wide flex items-center">
                  <i className="fas fa-user mr-2" />
                  INFORMACIÓN PERSONAL
                </h3>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-id-card text-blue-500 mr-1.5" />
                      Nombre(s) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={candidateForm.nombres}
                      onChange={(e) => setCandidateForm({...candidateForm, nombres: e.target.value})}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none text-gray-800 shadow-sm transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-id-card text-blue-500 mr-1.5" />
                      Apellido(s) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={candidateForm.apellidos}
                      onChange={(e) => setCandidateForm({...candidateForm, apellidos: e.target.value})}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none text-gray-800 shadow-sm transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-envelope text-blue-500 mr-1.5" />
                      Correo Electrónico <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={candidateForm.correoElectronico}
                      onChange={(e) => setCandidateForm({...candidateForm, correoElectronico: e.target.value})}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none text-gray-800 shadow-sm transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-phone text-blue-500 mr-1.5" />
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={candidateForm.telefono}
                      onChange={(e) => setCandidateForm({...candidateForm, telefono: e.target.value})}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none text-gray-800 shadow-sm transition-colors"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-mobile-alt text-blue-500 mr-1.5" />
                      Teléfono Alternativo
                    </label>
                    <input
                      type="tel"
                      value={candidateForm.telefonoAlternativo}
                      onChange={(e) => setCandidateForm({...candidateForm, telefonoAlternativo: e.target.value})}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none text-gray-800 shadow-sm transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. UBICACIÓN */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-purple-500/10 border-b-2 border-purple-500 px-5 py-3.5">
                <h3 className="text-lg font-bold text-purple-800 tracking-wide flex items-center">
                  <i className="fas fa-map-marker-alt mr-2" />
                  UBICACIÓN
                </h3>
              </div>
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-city text-purple-500 mr-1.5" />
                      Ciudad
                    </label>
                    <input
                      type="text"
                      value={candidateForm.ciudad}
                      onChange={(e) => setCandidateForm({...candidateForm, ciudad: e.target.value})}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-purple-500 focus:outline-none text-gray-800 shadow-sm transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-map text-purple-500 mr-1.5" />
                      Estado
                    </label>
                    <input
                      type="text"
                      value={candidateForm.estado}
                      onChange={(e) => setCandidateForm({...candidateForm, estado: e.target.value})}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-purple-500 focus:outline-none text-gray-800 shadow-sm transition-colors"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-globe text-purple-500 mr-1.5" />
                      País
                    </label>
                    <input
                      type="text"
                      value={candidateForm.pais}
                      onChange={(e) => setCandidateForm({...candidateForm, pais: e.target.value})}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-purple-500 focus:outline-none text-gray-800 shadow-sm transition-colors"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-map-marked-alt text-purple-500 mr-1.5" />
                      Dirección Completa
                    </label>
                    <textarea
                      value={candidateForm.direccionCompleta}
                      onChange={(e) => setCandidateForm({...candidateForm, direccionCompleta: e.target.value})}
                      rows={2}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-purple-500 focus:outline-none text-gray-800 shadow-sm transition-colors resize-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. INFORMACIÓN PROFESIONAL */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-emerald-500/10 border-b-2 border-emerald-500 px-5 py-3.5">
                <h3 className="text-lg font-bold text-emerald-800 tracking-wide flex items-center">
                  <i className="fas fa-briefcase mr-2" />
                  INFORMACIÓN PROFESIONAL
                </h3>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Posición Actual</label>
                  <input
                    type="text"
                    value={candidateForm.posicionActual}
                    onChange={(e) => setCandidateForm({...candidateForm, posicionActual: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Empresa Actual</label>
                  <input
                    type="text"
                    value={candidateForm.empresaActual}
                    onChange={(e) => setCandidateForm({...candidateForm, empresaActual: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Años de Experiencia</label>
                  <input
                    type="number"
                    min="0"
                    value={candidateForm.anosExperiencia}
                    onChange={(e) => setCandidateForm({...candidateForm, anosExperiencia: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Nivel de Estudios</label>
                  <select
                    value={candidateForm.nivelEstudios}
                    onChange={(e) => setCandidateForm({...candidateForm, nivelEstudios: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Secundaria">Secundaria</option>
                    <option value="Bachillerato">Bachillerato</option>
                    <option value="Licenciatura">Licenciatura</option>
                    <option value="Maestría">Maestría</option>
                    <option value="Doctorado">Doctorado</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Universidad</label>
                  <input
                    type="text"
                    value={candidateForm.universidad}
                    onChange={(e) => setCandidateForm({...candidateForm, universidad: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Carrera/Título</label>
                  <input
                    type="text"
                    value={candidateForm.carreraTitulo}
                    onChange={(e) => setCandidateForm({...candidateForm, carreraTitulo: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Habilidades</label>
                  <textarea
                    value={candidateForm.habilidades}
                    onChange={(e) => setCandidateForm({...candidateForm, habilidades: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                    placeholder="Lista de habilidades del candidato"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Idiomas</label>
                  <textarea
                    value={candidateForm.idiomas}
                    onChange={(e) => setCandidateForm({...candidateForm, idiomas: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Certificaciones</label>
                  <textarea
                    value={candidateForm.certificaciones}
                    onChange={(e) => setCandidateForm({...candidateForm, certificaciones: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                  />
                </div>
              </div>
            </div>

            {/* 4. EXPECTATIVAS SALARIALES */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-emerald-500/10 border-b-2 border-emerald-500 px-5 py-3.5">
                <h3 className="text-lg font-bold text-emerald-800 tracking-wide flex items-center">
                  <i className="fas fa-dollar-sign mr-2" />
                  EXPECTATIVAS SALARIALES
                </h3>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Expectativa Salarial Mínima</label>
                  <input
                    type="number"
                    value={candidateForm.expectativaSalarialMinima}
                    onChange={(e) => setCandidateForm({...candidateForm, expectativaSalarialMinima: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Expectativa Salarial Máxima</label>
                  <input
                    type="number"
                    value={candidateForm.expectativaSalarialMaxima}
                    onChange={(e) => setCandidateForm({...candidateForm, expectativaSalarialMaxima: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Moneda</label>
                  <select
                    value={candidateForm.moneda}
                    onChange={(e) => setCandidateForm({...candidateForm, moneda: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="MXN">MXN - Peso Mexicano</option>
                    <option value="USD">USD - Dólar Americano</option>
                    <option value="EUR">EUR - Euro</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 5. DISPONIBILIDAD */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-amber-500/10 border-b-2 border-amber-500 px-5 py-3.5">
                <h3 className="text-lg font-bold text-amber-800 tracking-wide flex items-center">
                  <i className="fas fa-calendar-check mr-2" />
                  DISPONIBILIDAD
                </h3>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Disponible desde</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={candidateForm.disponibleDesde}
                      onChange={(e) => setCandidateForm({...candidateForm, disponibleDesde: e.target.value})}
                      className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date().toISOString().split('T')[0];
                        setCandidateForm({...candidateForm, disponibleDesde: today});
                      }}
                      className="px-4 py-2 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 transition-colors"
                    >
                      Hoy
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Días de Preaviso</label>
                  <input
                    type="number"
                    value={candidateForm.diasPreviso}
                    onChange={(e) => setCandidateForm({...candidateForm, diasPreviso: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>
            </div>

            {/* 6. REDES SOCIALES */}
            <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${showSocialNetworks ? 'block' : 'hidden'}`}>
              <div className="bg-indigo-500/10 border-b-2 border-indigo-500 px-5 py-3.5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-indigo-800 tracking-wide flex items-center">
                  <i className="fas fa-share-alt mr-2" />
                  REDES SOCIALES
                </h3>
                <button
                  type="button"
                  onClick={() => setShowSocialNetworks(false)}
                  className="text-sm text-indigo-600 hover:text-indigo-800 transition-colors font-medium"
                >
                  (Ocultar)
                </button>
              </div>
              <div className="p-5 grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">LinkedIn</label>
                  <input
                    type="url"
                    value={candidateForm.linkedin}
                    onChange={(e) => setCandidateForm({...candidateForm, linkedin: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="https://linkedin.com/in/usuario"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Portafolio</label>
                  <input
                    type="url"
                    value={candidateForm.portfolio}
                    onChange={(e) => setCandidateForm({...candidateForm, portfolio: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="https://miportafolio.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">GitHub</label>
                  <input
                    type="url"
                    value={candidateForm.github}
                    onChange={(e) => setCandidateForm({...candidateForm, github: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="https://github.com/usuario"
                  />
                </div>
              </div>
            </div>

            {/* 7. ANÁLISIS DE IA */}
            <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${showAIAnalysis ? 'block' : 'hidden'}`}>
              <div className="bg-violet-500/10 border-b-2 border-violet-500 px-5 py-3.5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-violet-800 tracking-wide flex items-center">
                  <i className="fas fa-brain mr-2" />
                  ANÁLISIS DE IA
                  <span className="ml-3">
                    <AIMethodBadge method="claude_ai" size="sm" showConfidence={false} />
                  </span>
                </h3>
                <button
                  type="button"
                  onClick={() => setShowAIAnalysis(false)}
                  className="text-sm text-violet-600 hover:text-violet-800 transition-colors font-medium"
                >
                  (Ocultar)
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Resumen generado por IA</label>
                  <textarea
                    value={candidateForm.resumenGeneradoIA}
                    onChange={(e) => setCandidateForm({...candidateForm, resumenGeneradoIA: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                    placeholder="Resumen automático generado por IA..."
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Puntuación de Coincidencia IA</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={candidateForm.puntuacionCoincidenciaIA}
                        onChange={(e) => setCandidateForm({...candidateForm, puntuacionCoincidenciaIA: e.target.value})}
                        className="w-full px-3 py-2 pr-10 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                        placeholder="85"
                      />
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className="text-gray-500 text-sm">%</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">Puntuación de 0 a 100</p>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Análisis Completo de IA</label>
                    <textarea
                      value={candidateForm.analisisCompletoIA}
                      onChange={(e) => setCandidateForm({...candidateForm, analisisCompletoIA: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                      placeholder="Análisis detallado generado por IA..."
                    />
                    <p className="text-xs text-gray-500">Análisis detallado generado por IA</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 8. METADATOS */}
            <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${showMetadata ? 'block' : 'hidden'}`}>
              <div className="bg-gray-500/10 border-b-2 border-gray-500 px-5 py-3.5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800 tracking-wide flex items-center">
                  <i className="fas fa-info-circle mr-2" />
                  METADATOS
                </h3>
                <button
                  type="button"
                  onClick={() => setShowMetadata(false)}
                  className="text-sm text-gray-600 hover:text-gray-800 transition-colors font-medium"
                >
                  (Ocultar)
                </button>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Creado por</label>
                  <div className="flex">
                    <select
                      value={candidateForm.creadoPor}
                      onChange={(e) => setCandidateForm({...candidateForm, creadoPor: e.target.value})}
                      className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    >
                      <option value="">Seleccionar usuario...</option>
                      <option value="director">Director</option>
                      <option value="supervisor">Supervisor</option>
                      <option value="reclutador">Reclutador</option>
                    </select>
                    <button type="button" className="px-3 py-2 bg-green-500 text-white hover:bg-green-600 transition-colors">
                      <i className="fas fa-plus" />
                    </button>
                    <button type="button" className="px-3 py-2 bg-red-500 text-white hover:bg-red-600 transition-colors">
                      <i className="fas fa-times" />
                    </button>
                    <button type="button" className="px-3 py-2 bg-blue-500 text-white rounded-r-md hover:bg-blue-600 transition-colors">
                      <i className="fas fa-eye" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Fecha de Creación</label>
                    <input
                      type="text"
                      value={candidateForm.fechaCreacion}
                      onChange={(e) => setCandidateForm({...candidateForm, fechaCreacion: e.target.value})}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="-"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Última Actualización</label>
                    <input
                      type="text"
                      value={candidateForm.ultimaActualizacion}
                      onChange={(e) => setCandidateForm({...candidateForm, ultimaActualizacion: e.target.value})}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                      placeholder="-"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Active applications</label>
                  <input
                    type="text"
                    value={candidateForm.activeApplications}
                    onChange={(e) => setCandidateForm({...candidateForm, activeApplications: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="-"
                  />
                </div>
              </div>
            </div>

            {/* 9. GESTIÓN */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-rose-500/10 border-b-2 border-rose-500 px-5 py-3.5">
                <h3 className="text-lg font-bold text-rose-800 tracking-wide flex items-center">
                  <i className="fas fa-cogs mr-2" />
                  GESTIÓN
                </h3>
              </div>
              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Estado</label>
                  <select
                    value={candidateForm.estadoCandidato}
                    onChange={(e) => setCandidateForm({...candidateForm, estadoCandidato: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="Nuevo">Nuevo</option>
                    <option value="En Proceso">En Proceso</option>
                    <option value="Calificado">Calificado</option>
                    <option value="No Calificado">No Calificado</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Asignado a</label>
                  <select
                    value={candidateForm.asignadoA}
                    onChange={(e) => setCandidateForm({...candidateForm, asignadoA: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="director">Director</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="reclutador">Reclutador</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Fuente de Reclutamiento</label>
                  <input
                    type="text"
                    value={candidateForm.fuenteReclutamiento}
                    onChange={(e) => setCandidateForm({...candidateForm, fuenteReclutamiento: e.target.value})}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Ej: LinkedIn, Portal de empleo, Referido, etc."
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Notas Internas</label>
                  <textarea
                    value={candidateForm.notasInternas}
                    onChange={(e) => setCandidateForm({...candidateForm, notasInternas: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                  />
                </div>
              </div>
            </div>

            {/* 10. APLICACIONES DE CANDIDATOS */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                <i className="fas fa-clipboard-list text-teal-600"></i>
                <h3 className="font-semibold text-gray-900">Aplicaciones de Candidatos</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Perfil</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Estado de la Aplicación</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">% Coincidencia</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Calificación</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Fecha de Aplicación</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        <i className="fas fa-inbox text-3xl mb-2 block text-gray-400" />
                        <p className="text-sm">No hay aplicaciones registradas</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button type="button" className="text-teal-600 hover:text-teal-700 text-sm font-medium flex items-center transition-colors">
                  <i className="fas fa-plus mr-2" />
                  Agregar Aplicación de Candidato
                </button>
              </div>
            </div>

            {/* 11. DOCUMENTOS DE CANDIDATOS */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                <i className="fas fa-file-alt text-blue-600"></i>
                <h3 className="font-semibold text-gray-900">Documentos de Candidatos</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Tipo de Documento</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Archivo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Enlace</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Descripción</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Subido por</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-3">
                        <select className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm">
                          <option>Curriculum Vitae</option>
                          <option>Carta de Presentación</option>
                          <option>Certificados</option>
                          <option>Portafolio</option>
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <input
                            type="file"
                            id="candidateDocumentFile"
                            className="hidden"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                console.log('📎 Archivo seleccionado:', file.name);
                                // Aquí puedes manejar el archivo si lo necesitas
                              }
                            }}
                          />
                          <button 
                            type="button"
                            onClick={() => document.getElementById('candidateDocumentFile')?.click()}
                            className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm mr-2 hover:bg-blue-700 transition-colors"
                          >
                            Elegir archivo
                          </button>
                          <span className="text-xs text-gray-500">No hay archivo</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-400 text-sm">-</span>
                      </td>
                      <td className="px-4 py-3">
                        <input type="text" className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-400 text-sm">-</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-400 text-sm">-</span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="text-red-500 hover:text-red-700 transition-colors">
                          <i className="fas fa-times-circle" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button type="button" className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center transition-colors">
                  <i className="fas fa-plus mr-2" />
                  Agregar Documento
                </button>
              </div>
            </div>

            {/* 12. NOTAS DE CANDIDATOS */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                <i className="fas fa-sticky-note text-purple-600"></i>
                <h3 className="font-semibold text-gray-900">Notas de Candidatos</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Nota</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Importante</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Creado por</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Fecha</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-gray-100">
                      <td className="px-4 py-3">
                        <textarea 
                          rows={2}
                          className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none"
                          placeholder="Agregar nota..."
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <input type="checkbox" className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-2 focus:ring-purple-500" />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-400 text-sm">-</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-400 text-sm">-</span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="text-red-500 hover:text-red-700 transition-colors">
                          <i className="fas fa-times-circle" />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-200">
                <button type="button" className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center transition-colors">
                  <i className="fas fa-plus mr-2" />
                  Agregar Nota
                </button>
              </div>
            </div>

            {/* 13. HISTORIAL DE ESTADOS */}
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                <i className="fas fa-history text-slate-600"></i>
                <h3 className="font-semibold text-gray-900">Historial de Estados</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Notas</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Estado Anterior</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Estado Nuevo</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Cambiado por</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Fecha del Cambio</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        <i className="fas fa-clock text-3xl mb-2 block text-gray-400" />
                        <p className="text-sm">No hay historial de cambios</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Botones para Mostrar Secciones Opcionales */}
            <div className="bg-gray-50 px-5 py-4 rounded-lg border border-gray-200">
              <div className="flex flex-wrap gap-3">
                {!showSocialNetworks && (
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Mostrando Redes Sociales');
                      setShowSocialNetworks(true);
                    }}
                    className="px-4 py-2 text-indigo-600 bg-white border border-indigo-300 rounded-md hover:bg-indigo-50 transition-colors text-sm font-medium"
                  >
                    <i className="fas fa-share-alt mr-2"></i>
                    Redes Sociales
                  </button>
                )}
                {!showAIAnalysis && (
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Mostrando Análisis de IA');
                      setShowAIAnalysis(true);
                    }}
                    className="px-4 py-2 text-violet-600 bg-white border border-violet-300 rounded-md hover:bg-violet-50 transition-colors text-sm font-medium"
                  >
                    <i className="fas fa-brain mr-2"></i>
                    Análisis de IA
                  </button>
                )}
                {!showMetadata && (
                  <button
                    type="button"
                    onClick={() => {
                      console.log('Mostrando Metadatos');
                      setShowMetadata(true);
                    }}
                    className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    <i className="fas fa-info-circle mr-2"></i>
                    Metadatos
                  </button>
                )}
              </div>
            </div>

            {/* Botones de acción finales */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex justify-between items-center shadow-lg">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors font-medium"
              >
                <i className="fas fa-times mr-2"></i>
                Cancelar
              </button>
              <div className="flex space-x-3">
                <button
                  type="button"
                  className="px-6 py-2.5 bg-slate-600 text-white rounded-md hover:bg-slate-700 transition-colors font-medium shadow-sm"
                >
                  <i className="fas fa-save mr-2"></i>
                  Guardar
                </button>
                <button
                  type="button"
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium shadow-sm"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Guardar y Agregar Otro
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors font-medium shadow-sm"
                >
                  <i className="fas fa-check mr-2"></i>
                  Guardar y Continuar
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

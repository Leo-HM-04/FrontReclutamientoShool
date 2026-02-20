'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api';

interface Candidate {
  id?: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  city?: string;
  state?: string;
  country?: string;
  current_position?: string;
  current_company?: string;
  years_of_experience?: number;
  education_level?: string;
  university?: string;
  [key: string]: any;
}

interface CandidateFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: Candidate | null;
  onSuccess?: (message: string) => void;
  onRefresh?: () => void;
}

export default function CandidateFormModal({ 
  isOpen, 
  onClose, 
  candidate,
  onSuccess,
  onRefresh
}: CandidateFormModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Candidate>>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    city: '',
    state: '',
    country: 'México',
    current_position: '',
    current_company: '',
    years_of_experience: 0,
    education_level: '',
    university: '',
  });

  useEffect(() => {
    if (candidate) {
      setFormData(candidate);
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        city: '',
        state: '',
        country: 'México',
        current_position: '',
        current_company: '',
        years_of_experience: 0,
        education_level: '',
        university: '',
      });
    }
  }, [candidate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    console.log('📝 Iniciando guardado de candidato...');
    console.log('Datos del formulario:', formData);

    try {
      let response;
      if (candidate?.id) {
        // Actualizar candidato existente
        console.log('🔄 Actualizando candidato ID:', candidate.id);
        response = await apiClient.updateCandidate(candidate.id, formData);
        console.log('✅ Respuesta de actualización:', response);
        if (onSuccess) {
          onSuccess('✅ Candidato actualizado exitosamente en la base de datos');
        }
      } else {
        // Crear nuevo candidato
        console.log('➕ Creando nuevo candidato...');
        response = await apiClient.createCandidate(formData);
        console.log('✅ Respuesta de creación:', response);
        if (onSuccess) {
          onSuccess('✅ Candidato creado exitosamente en la base de datos');
        }
      }
      
      // Refrescar lista si existe la función
      console.log('🔄 Refrescando lista de candidatos...');
      if (onRefresh) {
        await onRefresh();
      }
      
      console.log('✅ Proceso completado, cerrando modal...');
      onClose();
    } catch (error: any) {
      console.error('❌ Error al guardar candidato:', error);
      console.error('Detalles del error:', error.response || error);
      if (onSuccess) {
        onSuccess(`❌ Error: ${error.message || 'No se pudo guardar el candidato'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed top-16 left-0 right-0 bottom-0  flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[95vh] overflow-hidden">
        {/* Header mejorado - Degradado azul suave */}
        <div className="bg-linear-to-r from-blue-50 via-blue-100 to-indigo-50 px-6 py-5 shadow-lg border-b-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 p-4 rounded-xl shadow-lg">
                <i className="fas fa-user-plus text-3xl text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">
                  {candidate ? 'Editar Candidato' : 'Agregar Candidato'}
                </h2>
                <p className="text-gray-600 text-sm mt-1 font-semibold">
                  {candidate ? 'Actualizar información del candidato' : 'Registrar nuevo candidato en el sistema'}
                </p>
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

        <div className="p-6 bg-gray-50 overflow-y-auto max-h-[calc(95vh-100px)]">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Sección 1: Información Personal */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-blue-600 px-5 py-3.5 border-b-2 border-blue-700">
                <h3 className="text-lg font-bold text-white tracking-wide flex items-center">
                  <i className="fas fa-user mr-2" />
                  INFORMACIÓN PERSONAL
                </h3>
              </div>
              
              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-id-card text-blue-500 mr-1.5" />
                      Nombre <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.first_name || ''}
                      onChange={(e) => handleChange('first_name', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none text-gray-800 shadow-sm transition-colors"
                      placeholder="Nombre"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-id-card text-blue-500 mr-1.5" />
                      Apellido <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.last_name || ''}
                      onChange={(e) => handleChange('last_name', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none text-gray-800 shadow-sm transition-colors"
                      placeholder="Apellido"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-envelope text-blue-500 mr-1.5" />
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email || ''}
                      onChange={(e) => handleChange('email', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none text-gray-800 shadow-sm transition-colors"
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-phone text-blue-500 mr-1.5" />
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={formData.phone || ''}
                      onChange={(e) => handleChange('phone', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-blue-500 focus:outline-none text-gray-800 shadow-sm transition-colors"
                      placeholder="+52 123 456 7890"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 2: Ubicación */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-purple-600 px-5 py-3.5 border-b-2 border-purple-700">
                <h3 className="text-lg font-bold text-white tracking-wide flex items-center">
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
                      value={formData.city || ''}
                      onChange={(e) => handleChange('city', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-purple-500 focus:outline-none text-gray-800 shadow-sm transition-colors"
                      placeholder="Ciudad"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-map text-purple-500 mr-1.5" />
                      Estatus
                    </label>
                    <input
                      type="text"
                      value={formData.state || ''}
                      onChange={(e) => handleChange('state', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-purple-500 focus:outline-none text-gray-800 shadow-sm transition-colors"
                      placeholder="Estatus"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Sección 3: Información Profesional */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-emerald-600 px-5 py-3.5 border-b-2 border-emerald-700">
                <h3 className="text-lg font-bold text-white tracking-wide flex items-center">
                  <i className="fas fa-briefcase mr-2" />
                  INFORMACIÓN PROFESIONAL
                </h3>
              </div>

              <div className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-user-tie text-emerald-500 mr-1.5" />
                      Posición Actual
                    </label>
                    <input
                      type="text"
                      value={formData.current_position || ''}
                      onChange={(e) => handleChange('current_position', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-emerald-500 focus:outline-none text-gray-800 shadow-sm transition-colors"
                      placeholder="Ej: Desarrollador Senior"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-building text-emerald-500 mr-1.5" />
                      Empresa Actual
                    </label>
                    <input
                      type="text"
                      value={formData.current_company || ''}
                      onChange={(e) => handleChange('current_company', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-emerald-500 focus:outline-none text-gray-800 shadow-sm transition-colors"
                      placeholder="Nombre de la empresa"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-clock text-emerald-500 mr-1.5" />
                      Años de Experiencia
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="50"
                      value={formData.years_of_experience || 0}
                      onChange={(e) => handleChange('years_of_experience', parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-emerald-500 focus:outline-none text-gray-800 shadow-sm transition-colors"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-graduation-cap text-emerald-500 mr-1.5" />
                      Nivel de Estudios
                    </label>
                    <select
                      value={formData.education_level || ''}
                      onChange={(e) => handleChange('education_level', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-emerald-500 focus:outline-none text-gray-800 shadow-sm transition-colors"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="Secundaria">Secundaria</option>
                      <option value="Preparatoria">Preparatoria</option>
                      <option value="Técnico">Técnico</option>
                      <option value="Licenciatura">Licenciatura</option>
                      <option value="Maestría">Maestría</option>
                      <option value="Doctorado">Doctorado</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      <i className="fas fa-university text-emerald-500 mr-1.5" />
                      Universidad
                    </label>
                    <input
                      type="text"
                      value={formData.university || ''}
                      onChange={(e) => handleChange('university', e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-emerald-500 focus:outline-none text-gray-800 shadow-sm transition-colors"
                      placeholder="Nombre de la universidad"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Botones de acción */}
            <div className="sticky bottom-0 bg-white border-t-2 border-gray-200 p-4 -mx-6 -mb-6 shadow-lg">
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-6 py-2.5 text-gray-700 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <i className="fas fa-times mr-2" />
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-linear-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <i className="fas fa-spinner fa-spin mr-2" />
                      {candidate ? 'Actualizando...' : 'Creando...'}
                    </>
                  ) : (
                    <>
                      <i className={`fas ${candidate ? 'fa-save' : 'fa-plus-circle'} mr-2`} />
                      {candidate ? 'Actualizar Candidato' : 'Crear Candidato'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

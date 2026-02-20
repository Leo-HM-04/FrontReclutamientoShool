'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

export default function PublicProfileCreatePage() {
  const params = useParams();
  const token = params?.token as string;
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [template, setTemplate] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    position_title: '',
    department: '',
    number_of_positions: 1,
    position_description: '',
    additional_requirements: '',
    benefits: '',
    age_min: '',
    age_max: '',
    education_level: '',
    years_experience: '',
    salary_min: '',
    salary_max: '',
    salary_currency: 'MXN',
    salary_period: 'mensual',
    location_city: '',
    location_state: '',
    is_remote: false,
    is_hybrid: false,
    is_onsite: false,
    technical_skills: '',
    soft_skills: '',
    languages: '',
    deadline: '',
    desired_start_date: '',
  });

  useEffect(() => {
    if (!token) return;
    const fetchTemplate = async () => {
      setLoading(true);
      try {
        const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const res = await fetch(`${apiBase}/public/profile-create/${token}/`);
        if (!res.ok) throw new Error('Token inválido o expirado');
        const data = await res.json();
        setTemplate(data);
        // Do NOT prefill fields from the template so the public user sees an empty form to complete
        // We keep the template for client info display only
        setFormData(prev => ({
          ...prev,
          department: '',
          number_of_positions: 1,
        }));
      } catch (err: any) {
        setError(err.message || 'No se pudo cargar información');
      } finally {
        setLoading(false);
      }
    };
    fetchTemplate();
  }, [token]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation for required public fields
    const required = ['position_title','position_description','education_level','years_experience','salary_min','salary_max','location_city','location_state'];
    const missing = required.filter(f => {
      const v = (formData as any)[f];
      return v === '' || v === undefined || v === null;
    });
    if (missing.length > 0) {
      setError(`Faltan campos requeridos: ${missing.join(', ')}`);
      return;
    }

    setSubmitting(true);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const res = await fetch(`${apiBase}/public/profile-create/${token}/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          position_title: formData.position_title,
          department: formData.department,
          number_of_positions: parseInt(formData.number_of_positions as any) || 1,
          position_description: formData.position_description,
          additional_requirements: formData.additional_requirements,
          benefits: formData.benefits,
          age_min: formData.age_min ? parseInt(formData.age_min as any) : undefined,
          age_max: formData.age_max ? parseInt(formData.age_max as any) : undefined,
          education_level: formData.education_level,
          years_experience: formData.years_experience ? parseInt(formData.years_experience as any) : undefined,
          salary_min: formData.salary_min ? parseFloat(formData.salary_min as any) : undefined,
          salary_max: formData.salary_max ? parseFloat(formData.salary_max as any) : undefined,
          salary_currency: formData.salary_currency,
          salary_period: formData.salary_period,
          location_city: formData.location_city,
          location_state: formData.location_state,
          is_remote: formData.is_remote,
          is_hybrid: formData.is_hybrid,
          is_onsite: formData.is_onsite,
          technical_skills: formData.technical_skills ? formData.technical_skills.split(',').map(s => s.trim()).filter(s => s) : [],
          soft_skills: formData.soft_skills ? formData.soft_skills.split(',').map(s => s.trim()).filter(s => s) : [],
          languages: formData.languages ? formData.languages.split(',').map(s => s.trim()).filter(s => s) : [],
          deadline: formData.deadline || undefined,
          desired_start_date: formData.desired_start_date || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Error desconocido' }));
        // Formatear errores del backend para mostrar al usuario
        if (typeof err === 'object') {
          const messages = Object.entries(err).map(([k,v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n');
          setSubmitError(messages);
          throw new Error(messages);
        }
        setSubmitError(String(err));
        throw new Error(String(err));
      }

      const created = await res.json();
      setSuccess('Perfil creado correctamente. Nuestro equipo lo revisará.');
      // Redirect to thank you page
      router.push('/public/thank-you');
    } catch (err: any) {
      console.error('Error creando perfil público:', err);
      if (!submitError) setSubmitError('No se pudo crear el perfil. Revisa los datos e intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <i className="fas fa-spinner fa-spin text-4xl text-blue-600 mb-4"></i>
        <p className="text-gray-600">Cargando formulario público...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md bg-white rounded-xl shadow p-6 text-center">
        <i className="fas fa-exclamation-circle text-4xl text-red-600 mb-3"></i>
        <p className="text-gray-700">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen p-8 bg-gray-50 flex items-start justify-center">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Crear Perfil — {template?.client.company_name}</h2>
          <p className="text-sm text-gray-600 mb-4">Complete la información del perfil de reclutamiento para {template?.client.company_name}</p>
        </div>

        {success ? (
          <div className="bg-green-50 border border-green-200 p-4 rounded mb-4">
            <p className="text-green-800">{success}</p>
          </div>
        ) : null}

        {submitError ? (
          <div className="bg-red-50 border border-red-200 p-4 rounded mb-4">
            <p className="text-red-800 whitespace-pre-wrap">{submitError}</p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Información Básica */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-orange-500/10 border-b-2 border-orange-500 px-5 py-3.5">
              <h4 className="text-lg font-bold text-orange-800 flex items-center">
                <i className="fas fa-info-circle text-orange-600 mr-2"></i>
                Información Básica
              </h4>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Título de la Posición *
                </label>
                <input
                  type="text"
                  name="position_title"
                  value={formData.position_title}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Ej: Desarrollador Full Stack Senior"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Departamento
                </label>
                <input
                  type="text"
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Ej: Tecnología, Ventas, RRHH"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Posiciones *
                </label>
                <input
                  type="number"
                  name="number_of_positions"
                  value={formData.number_of_positions as any}
                  onChange={handleChange}
                  min="1"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Descripción del Puesto */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-blue-500/10 border-b-2 border-blue-500 px-5 py-3.5">
              <h4 className="text-lg font-bold text-blue-800 flex items-center">
                <i className="fas fa-file-alt text-blue-600 mr-2"></i>
                Descripción del Puesto
              </h4>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descripción de la Posición *
                </label>
                <textarea
                  name="position_description"
                  value={formData.position_description}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Describa las responsabilidades principales del puesto..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Requisitos Adicionales *
                </label>
                <textarea
                  name="additional_requirements"
                  value={formData.additional_requirements}
                  onChange={handleChange}
                  required
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Especifique los requisitos y calificaciones necesarias..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beneficios
                </label>
                <textarea
                  name="benefits"
                  value={formData.benefits}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Prestaciones, beneficios, bonos, etc..."
                />
              </div>
            </div>
          </div>

          {/* Requisitos del Candidato */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-purple-500/10 border-b-2 border-purple-500 px-5 py-3.5">
              <h4 className="text-lg font-bold text-purple-800 flex items-center">
                <i className="fas fa-user-check text-purple-600 mr-2"></i>
                Requisitos del Candidato
              </h4>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Edad Mínima
                </label>
                <input
                  type="number"
                  name="age_min"
                  value={formData.age_min}
                  onChange={handleChange}
                  min="18"
                  max="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Edad Máxima
                </label>
                <input
                  type="number"
                  name="age_max"
                  value={formData.age_max}
                  onChange={handleChange}
                  min="18"
                  max="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nivel Educativo *
                </label>
                <input
                  type="text"
                  name="education_level"
                  value={formData.education_level}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Ej: Licenciatura en Ingeniería"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Años de Experiencia *
                </label>
                <input
                  type="number"
                  name="years_experience"
                  value={formData.years_experience}
                  onChange={handleChange}
                  min="0"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Salario y Compensación */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-emerald-500/10 border-b-2 border-emerald-500 px-5 py-3.5">
              <h4 className="text-lg font-bold text-emerald-800 flex items-center">
                <i className="fas fa-dollar-sign text-emerald-600 mr-2"></i>
                Salario y Compensación
              </h4>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Salario Mínimo *
                </label>
                <input
                  type="number"
                  name="salary_min"
                  value={formData.salary_min}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Salario Máximo *
                </label>
                <input
                  type="number"
                  name="salary_max"
                  value={formData.salary_max}
                  onChange={handleChange}
                  min="0"
                  step="0.01"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Moneda
                </label>
                <select
                  name="salary_currency"
                  value={formData.salary_currency}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="MXN">MXN - Peso Mexicano</option>
                  <option value="USD">USD - Dólar Estadounidense</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Periodo
                </label>
                <select
                  name="salary_period"
                  value={formData.salary_period}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                >
                  <option value="mensual">Mensual</option>
                  <option value="anual">Anual</option>
                  <option value="por_hora">Por Hora</option>
                </select>
              </div>
            </div>
          </div>

          {/* Ubicación y Modalidad */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-teal-500/10 border-b-2 border-teal-500 px-5 py-3.5">
              <h4 className="text-lg font-bold text-teal-800 flex items-center">
                <i className="fas fa-map-marker-alt text-teal-600 mr-2"></i>
                Ubicación y Modalidad
              </h4>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ciudad *
                </label>
                <input
                  type="text"
                  name="location_city"
                  value={formData.location_city}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Ej: Ciudad de México"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Estado *
                </label>
                <input
                  type="text"
                  name="location_state"
                  value={formData.location_state}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Ej: CDMX"
                />
              </div>

              <div className="md:col-span-2 flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_remote"
                    checked={formData.is_remote}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_remote: e.target.checked, is_onsite: false }))}
                    className="mr-2"
                  />
                  Trabajo Remoto
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_hybrid"
                    checked={formData.is_hybrid}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_hybrid: e.target.checked, is_onsite: false }))}
                    className="mr-2"
                  />
                  Trabajo Híbrido
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_onsite"
                    checked={formData.is_onsite}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_onsite: e.target.checked, is_remote: false, is_hybrid: false }))}
                    className="mr-2"
                  />
                  Trabajo Presencial
                </label>
              </div>
            </div>
          </div>

          {/* Habilidades y Competencias */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-indigo-500/10 border-b-2 border-indigo-500 px-5 py-3.5">
              <h4 className="text-lg font-bold text-indigo-800 flex items-center">
                <i className="fas fa-cogs text-indigo-600 mr-2"></i>
                Habilidades y Competencias
              </h4>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Habilidades Técnicas
                </label>
                <input
                  type="text"
                  name="technical_skills"
                  value={formData.technical_skills}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Separadas por comas: Python, Django, React, PostgreSQL"
                />
                <p className="text-xs text-gray-500 mt-1">Separe cada habilidad con una coma</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Habilidades Blandas
                </label>
                <input
                  type="text"
                  name="soft_skills"
                  value={formData.soft_skills}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Separadas por comas: Trabajo en equipo, Liderazgo, Comunicación"
                />
                <p className="text-xs text-gray-500 mt-1">Separe cada habilidad con una coma</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Idiomas Requeridos
                </label>
                <input
                  type="text"
                  name="languages"
                  value={formData.languages}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                  placeholder="Separados por comas: Español, Inglés avanzado"
                />
                <p className="text-xs text-gray-500 mt-1">Separe cada idioma con una coma</p>
              </div>
            </div>
          </div>

          {/* Fechas Importantes */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-amber-500/10 border-b-2 border-amber-500 px-5 py-3.5">
              <h4 className="text-lg font-bold text-amber-800 flex items-center">
                <i className="fas fa-calendar text-amber-600 mr-2"></i>
                Fechas Importantes
              </h4>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Límite
                </label>
                <input
                  type="date"
                  name="deadline"
                  value={formData.deadline}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Deseada de Inicio
                </label>
                <input
                  type="date"
                  name="desired_start_date"
                  value={formData.desired_start_date}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
          </div>

          {/* Botones de Acción */}
          <div className="flex justify-end space-x-4 pt-4 border-t">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Enviando...
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2"></i>
                  Enviar formulario
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
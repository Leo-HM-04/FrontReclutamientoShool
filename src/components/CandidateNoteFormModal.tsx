'use client';

import { useState, useEffect } from 'react';
import { useModal } from '@/context/ModalContext';
import { apiClient } from '@/lib/api';

interface CandidateNoteFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

interface Candidate {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export default function CandidateNoteFormModal({ isOpen, onClose, onSuccess }: CandidateNoteFormModalProps) {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const { showAlert } = useModal();
  
  const [noteForm, setNoteForm] = useState({
    candidato: '',
    nota: '',
    notaImportante: false,
  });

  const [submitting, setSubmitting] = useState(false);

  // Cargar candidatos cuando se abre el modal
  useEffect(() => {
    if (isOpen && candidates.length === 0) {
      loadCandidates();
    }
  }, [isOpen]);

  const loadCandidates = async () => {
    try {
      setLoadingCandidates(true);
      const response = await apiClient.getCandidates();
      const data = response as any;
      setCandidates(data.results || data || []);
      console.log('📋 Candidatos cargados:', data.results || data);
    } catch (error) {
      console.error('❌ Error al cargar candidatos:', error);
      await showAlert('Error al cargar la lista de candidatos');
    } finally {
      setLoadingCandidates(false);
    }
  };

  const resetForm = () => {
    setNoteForm({
      candidato: '',
      nota: '',
      notaImportante: false,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validaciones
    if (!noteForm.candidato) {
      await showAlert('Por favor selecciona un candidato');
      return;
    }

    if (!noteForm.nota.trim()) {
      await showAlert('Por favor escribe una nota');
      return;
    }

    try {
      setSubmitting(true);

      const noteData = {
        candidate: noteForm.candidato,
        note: noteForm.nota,
        is_important: noteForm.notaImportante,
      };

      console.log('📝 Creando nota del candidato...');
      console.log('🔍 Datos de la nota:', noteData);
      
      const response = await apiClient.createCandidateNote(noteData);
      
      console.log('✅ Nota creada exitosamente:', response);
      
      if (onSuccess) {
        onSuccess("Nota agregada exitosamente");
      }
      
      resetForm();
      onClose();
    } catch (error: any) {
      console.error('❌ Error al crear nota:', error);
      await showAlert(`Error al crear nota: ${error.message || 'Error desconocido'}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0  flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[95vh] overflow-hidden">
        {/* Header - Degradado azul */}
        <div className="bg-linear-to-r from-blue-50 via-blue-100 to-indigo-50 px-6 py-5 shadow-lg border-b-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500 p-4 rounded-xl shadow-lg">
                <i className="fas fa-sticky-note text-3xl text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Agregar Nota del Candidato</h2>
                <p className="text-gray-600 text-sm mt-1 font-semibold">Gestiona notas, observaciones y comentarios sobre candidatos</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white bg-red-500 hover:bg-red-600 p-3 rounded-lg transition-all duration-200 group shadow-lg"
              title="Cerrar"
              disabled={submitting}
            >
              <i className="fas fa-times text-xl group-hover:rotate-90 transition-transform duration-200" />
            </button>
          </div>
        </div>

        {/* Formulario con scroll */}
        <div className="p-6 bg-gray-50 overflow-y-auto max-h-[calc(95vh-120px)]">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Selección de Candidato */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-blue-500/10 border-b-2 border-blue-500 px-5 py-3.5">
                <h3 className="text-lg font-bold text-blue-800 tracking-wide flex items-center">
                  <i className="fas fa-user mr-2.5 text-xl" />
                  INFORMACIÓN DEL CANDIDATO
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Candidato <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={noteForm.candidato}
                      onChange={(e) => setNoteForm({ ...noteForm, candidato: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none bg-white text-gray-800"
                      required
                      disabled={loadingCandidates}
                    >
                      <option value="">
                        {loadingCandidates ? 'Cargando candidatos...' : 'Seleccionar candidato...'}
                      </option>
                      {candidates.map((candidate) => (
                        <option key={candidate.id} value={candidate.id}>
                          {candidate.first_name} {candidate.last_name} - {candidate.email}
                        </option>
                      ))}
                    </select>
                    <i className="fas fa-chevron-down absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                  </div>
                  <div className="flex items-center gap-3 mt-3">
                    <button
                      type="button"
                      className="text-sm text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1"
                      onClick={() => {/* TODO: Abrir modal de nuevo candidato */}}
                    >
                      <i className="fas fa-plus-circle"></i>
                      Agregar nuevo candidato
                    </button>
                    <button
                      type="button"
                      className="text-sm text-gray-600 hover:text-gray-800 font-semibold flex items-center gap-1"
                      onClick={() => {/* TODO: Ver perfil del candidato */}}
                    >
                      <i className="fas fa-eye"></i>
                      Ver candidato
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Nota */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-purple-500/10 border-b-2 border-purple-500 px-5 py-3.5">
                <h3 className="text-lg font-bold text-purple-800 tracking-wide flex items-center">
                  <i className="fas fa-comment-dots mr-2.5 text-xl" />
                  CONTENIDO DE LA NOTA
                </h3>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Nota <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={noteForm.nota}
                    onChange={(e) => setNoteForm({ ...noteForm, nota: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all resize-none text-gray-800"
                    rows={6}
                    placeholder="Escribe tus observaciones y comentarios sobre el candidato..."
                    required
                  />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-sm text-gray-500">
                      <i className="fas fa-keyboard mr-1"></i>
                      {noteForm.nota.length} caracteres
                    </p>
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input
                        type="checkbox"
                        checked={noteForm.notaImportante}
                        onChange={(e) => setNoteForm({ ...noteForm, notaImportante: e.target.checked })}
                        className="w-5 h-5 text-red-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-red-500"
                      />
                      <span className="text-sm font-bold text-gray-700 group-hover:text-red-600 transition-colors flex items-center gap-1">
                        <i className="fas fa-exclamation-triangle text-red-500"></i>
                        Nota Importante
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Información de metadata */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-500/10 border-b-2 border-gray-500 px-5 py-3.5">
                <h3 className="text-lg font-bold text-gray-800 tracking-wide flex items-center">
                  <i className="fas fa-info-circle mr-2.5 text-xl" />
                  INFORMACIÓN DE AUDITORÍA
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600 font-medium">Creado por:</span>
                    <span className="ml-2 font-bold text-gray-800">-</span>
                  </div>
                  <div>
                    <span className="text-gray-600 font-medium">Fecha de Creación:</span>
                    <span className="ml-2 font-bold text-gray-800">-</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-3 flex items-center gap-2 bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <i className="fas fa-info-circle text-blue-600"></i>
                  Los campos de auditoría se llenarán automáticamente al guardar
                </p>
              </div>
            </div>

            {/* Botones */}
            <div className="flex justify-between items-center pt-4 border-t-2 border-gray-200 bg-white p-6 rounded-xl -mx-6 -mb-6">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  onClose();
                }}
                className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-bold flex items-center gap-2"
                disabled={submitting}
              >
                <i className="fas fa-times"></i>
                Cancelar
              </button>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {submitting ? (
                    <>
                      <i className="fas fa-spinner fa-spin"></i>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save"></i>
                      Guardar
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    await handleSubmit(new Event('submit') as any);
                    resetForm();
                  }}
                  disabled={submitting}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <i className="fas fa-plus-circle"></i>
                  Guardar y agregar otro
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

'use client';

import React, { useState, useEffect } from 'react';
import { useModal } from '@/context/ModalContext';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faStickyNote,
  faPlus,
  faSearch,
  faFilter,
  faEdit,
  faTrash,
  faUser,
  faCalendarAlt,
  faTimes,
  faSave,
  faSort,
  faSortUp,
  faSortDown,
  faStar as faStarSolid,
  faExclamationCircle
} from '@fortawesome/free-solid-svg-icons';
import { faStar as faStarRegular } from '@fortawesome/free-regular-svg-icons';
import { apiClient } from '@/lib/api';

interface Note {
  id: number;
  candidate: number;
  note: string;
  is_important: boolean;
  created_by: number;
  created_by_name: string;
  created_at: string;
}

interface Candidate {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

export default function NotesPage() {
  const { showConfirm } = useModal();
  const [notes, setNotes] = useState<Note[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  
  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [candidateFilter, setCandidateFilter] = useState('');
  const [importantFilter, setImportantFilter] = useState<'all' | 'important' | 'normal'>('all');
  const [sortField, setSortField] = useState('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Modales
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  
  // Toast
  const [toast, setToast] = useState<{show: boolean, message: string, type: 'success' | 'error'}>({
    show: false,
    message: '',
    type: 'success'
  });

  useEffect(() => {
    fetchNotes();
    fetchCandidates();
  }, []);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      console.log('🔵 Cargando notas...');
      
      const response = await apiClient.getCandidateNotes();
      console.log('🟢 Respuesta del servidor:', response);
      
      const notesData = (response as any)?.results || (response as any) || [];
      console.log('✅ Notas procesadas:', notesData);
      
      setNotes(notesData);
    } catch (error: any) {
      console.error('❌ Error fetching notes:', error);
      showToast(`Error al cargar notas: ${error.message || 'Error desconocido'}`, 'error');
      setNotes([]);
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

  const handleToggleImportant = async (note: Note) => {
    try {
      console.log('⭐ Cambiando importancia de nota:', note.id);
      
      await apiClient.updateCandidateNote(note.id, {
        candidate: note.candidate,
        note: note.note,
        is_important: !note.is_important
      });
      
      // Actualizar localmente
      setNotes(notes.map(n => 
        n.id === note.id 
          ? { ...n, is_important: !n.is_important }
          : n
      ));
      
      showToast(
        note.is_important 
          ? 'Nota marcada como normal' 
          : 'Nota marcada como importante',
        'success'
      );
    } catch (error: any) {
      console.error('❌ Error al actualizar:', error);
      showToast(`Error al actualizar: ${error.message || 'Error desconocido'}`, 'error');
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await showConfirm('¿Estás seguro de que deseas eliminar esta nota?');
    if (!confirmed) {
      return;
    }

    try {
      console.log('🗑️ Eliminando nota:', id);
      await apiClient.deleteCandidateNote(id);
      
      setNotes(notes.filter(note => note.id !== id));
      showToast('Nota eliminada exitosamente', 'success');
    } catch (error: any) {
      console.error('❌ Error al eliminar:', error);
      showToast(`Error al eliminar: ${error.message || 'Error desconocido'}`, 'error');
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setShowEditModal(true);
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
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

  const getCandidateName = (candidateId: number) => {
    const candidate = candidates.find(c => c.id === candidateId);
    return candidate ? `${candidate.first_name} ${candidate.last_name}` : `ID: ${candidateId}`;
  };

  // Filtrado y ordenamiento
  const filteredAndSortedNotes = React.useMemo(() => {
    let filtered = [...notes];

    // Filtrar por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(note => 
        note.note?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        note.created_by_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtrar por candidato
    if (candidateFilter) {
      filtered = filtered.filter(note => String(note.candidate) === candidateFilter);
    }

    // Filtrar por importancia
    if (importantFilter === 'important') {
      filtered = filtered.filter(note => note.is_important);
    } else if (importantFilter === 'normal') {
      filtered = filtered.filter(note => !note.is_important);
    }

    // Ordenar
    filtered.sort((a, b) => {
      let aVal: any = a[sortField as keyof Note];
      let bVal: any = b[sortField as keyof Note];

      if (aVal === null || aVal === undefined) aVal = '';
      if (bVal === null || bVal === undefined) bVal = '';

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [notes, searchTerm, candidateFilter, importantFilter, sortField, sortDirection]);

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
            <h1 className="text-3xl font-bold text-gray-900">Notas de Candidatos</h1>
            <p className="text-gray-600 mt-1">Gestiona notas, comentarios y observaciones sobre candidatos</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faPlus} />
            Nueva Nota
          </button>
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
              placeholder="Buscar en notas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Candidate Filter */}
          <select
            value={candidateFilter}
            onChange={(e) => setCandidateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            disabled={loadingCandidates}
          >
            <option value="">Todos los candidatos</option>
            {candidates.map(candidate => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.first_name} {candidate.last_name}
              </option>
            ))}
          </select>

          {/* Important Filter */}
          <select
            value={importantFilter}
            onChange={(e) => setImportantFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="all">Todas las notas</option>
            <option value="important">⭐ Solo importantes</option>
            <option value="normal">📝 Solo normales</option>
          </select>

          {/* Clear Filters */}
          {(searchTerm || candidateFilter || importantFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setCandidateFilter('');
                setImportantFilter('all');
              }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Limpiar Filtros
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{notes.length}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <FontAwesomeIcon icon={faStickyNote} className="text-green-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Importantes</p>
              <p className="text-2xl font-bold text-gray-900">
                {notes.filter(n => n.is_important).length}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <FontAwesomeIcon icon={faStarSolid} className="text-yellow-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Normales</p>
              <p className="text-2xl font-bold text-gray-900">
                {notes.filter(n => !n.is_important).length}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <FontAwesomeIcon icon={faStickyNote} className="text-blue-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Hoy</p>
              <p className="text-2xl font-bold text-gray-900">
                {notes.filter(n => {
                  const today = new Date().toDateString();
                  const noteDate = new Date(n.created_at).toDateString();
                  return today === noteDate;
                }).length}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <FontAwesomeIcon icon={faCalendarAlt} className="text-purple-600 text-xl" />
            </div>
          </div>
        </div>
      </div>

      {/* Notes List */}
      {loading ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          <p className="mt-4 text-gray-600">Cargando notas...</p>
        </div>
      ) : filteredAndSortedNotes.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <FontAwesomeIcon icon={faStickyNote} className="text-gray-300 text-6xl mb-4" />
          <p className="text-gray-600 text-lg">No se encontraron notas</p>
          <p className="text-gray-500 mt-2">
            {searchTerm || candidateFilter || importantFilter !== 'all'
              ? 'Intenta ajustar los filtros de búsqueda' 
              : 'Comienza creando una nueva nota'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider w-12">
                    ⭐
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Candidato
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Nota
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Creado por
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('created_at')}
                  >
                    <div className="flex items-center gap-2">
                      Fecha
                      <FontAwesomeIcon icon={getSortIcon('created_at')} className="text-gray-400" />
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedNotes.map((note) => (
                  <tr key={note.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleToggleImportant(note)}
                        className="text-2xl hover:scale-110 transition-transform"
                        title={note.is_important ? 'Marcar como normal' : 'Marcar como importante'}
                      >
                        <FontAwesomeIcon 
                          icon={note.is_important ? faStarSolid : faStarRegular} 
                          className={note.is_important ? 'text-yellow-500' : 'text-gray-300'} 
                        />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      #{note.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faUser} className="text-gray-400" />
                        {getCandidateName(note.candidate)}
                      </div>
                    </td>
                    <td className="px-6 py-4 max-w-md">
                      <div className="text-sm text-gray-900">
                        {note.note.length > 100 
                          ? note.note.substring(0, 100) + '...' 
                          : note.note
                        }
                      </div>
                      {note.is_important && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                          <FontAwesomeIcon icon={faExclamationCircle} />
                          Importante
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {note.created_by_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400" />
                        {formatDate(note.created_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEdit(note)}
                        className="text-green-600 hover:text-green-900 mr-3"
                        title="Editar"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Eliminar"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <NoteFormModal
          candidates={candidates}
          onClose={() => setShowAddModal(false)}
          onSuccess={(message: string) => {
            showToast(message, 'success');
            fetchNotes();
          }}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editingNote && (
        <NoteFormModal
          candidates={candidates}
          existingNote={editingNote}
          onClose={() => {
            setShowEditModal(false);
            setEditingNote(null);
          }}
          onSuccess={(message: string) => {
            showToast(message, 'success');
            fetchNotes();
          }}
        />
      )}
    </div>
  );
}

// ====== NOTE FORM MODAL COMPONENT ======

interface NoteFormModalProps {
  candidates: Candidate[];
  existingNote?: Note;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

function NoteFormModal({ candidates, existingNote, onClose, onSuccess }: NoteFormModalProps) {
  const [formData, setFormData] = useState({
    candidate: existingNote?.candidate.toString() || '',
    note: existingNote?.note || '',
    is_important: existingNote?.is_important || false,
  });
  const [submitting, setSubmitting] = useState(false);
  const { showAlert } = useModal();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.candidate || !formData.note.trim()) {
      await showAlert('Por favor completa todos los campos obligatorios');
      return;
    }

    try {
      setSubmitting(true);
      console.log(existingNote ? '💾 Actualizando nota...' : '📝 Creando nota...');

      const noteData = {
        candidate: formData.candidate,
        note: formData.note.trim(),
        is_important: formData.is_important
      };

      if (existingNote) {
        // Editar nota existente
        await apiClient.updateCandidateNote(existingNote.id, noteData);
        console.log('✅ Nota actualizada exitosamente');
        onSuccess('Nota actualizada exitosamente');
      } else {
        // Crear nueva nota
        await apiClient.createCandidateNote(noteData);
        console.log('✅ Nota creada exitosamente');
        onSuccess('Nota creada exitosamente');
      }
      
      onClose();
    } catch (error: any) {
      console.error('❌ Error:', error);
      await showAlert(`Error: ${error.message || 'Error desconocido'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed top-16 left-0 right-0 bottom-0  flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">
              {existingNote ? 'Editar Nota' : 'Nueva Nota'}
            </h2>
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
              disabled={!!existingNote}
            >
              <option value="">Seleccionar candidato...</option>
              {candidates.map(candidate => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.first_name} {candidate.last_name} - {candidate.email}
                </option>
              ))}
            </select>
            {existingNote && (
              <p className="text-xs text-gray-500 mt-1">
                No se puede cambiar el candidato al editar una nota
              </p>
            )}
          </div>

          {/* Nota */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nota <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={6}
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              placeholder="Escribe tus observaciones, comentarios o notas sobre el candidato..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              {formData.note.length} caracteres
            </p>
          </div>

          {/* Marcar como Importante */}
          <div className="flex items-center gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <input
              type="checkbox"
              id="is_important"
              checked={formData.is_important}
              onChange={(e) => setFormData({ ...formData, is_important: e.target.checked })}
              className="w-5 h-5 text-yellow-600 rounded focus:ring-2 focus:ring-yellow-500"
            />
            <label htmlFor="is_important" className="flex items-center gap-2 cursor-pointer">
              <FontAwesomeIcon 
                icon={formData.is_important ? faStarSolid : faStarRegular} 
                className={`text-2xl ${formData.is_important ? 'text-yellow-500' : 'text-gray-400'}`}
              />
              <div>
                <p className="text-sm font-medium text-gray-900">Marcar como importante</p>
                <p className="text-xs text-gray-600">Las notas importantes se destacan en la lista</p>
              </div>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={faSave} />
                  {existingNote ? 'Actualizar Nota' : 'Crear Nota'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

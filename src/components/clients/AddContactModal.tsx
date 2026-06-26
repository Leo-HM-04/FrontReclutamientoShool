"use client";

import { useState } from "react";
import { useModal } from '@/context/ModalContext';
import { apiClient } from "@/lib/api";

interface AddContactModalProps {
  clients: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddContactModal({ clients, onClose, onSuccess }: AddContactModalProps) {
  const { showAlert } = useModal();
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    client: '',
    name: '',
    position: '',
    email: '',
    phone: '',
    is_primary: false,
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.client || !formData.name || !formData.email) {
      await showAlert('Por favor completa todos los campos obligatorios');
      return;
    }

    try {
      setSubmitting(true);

      const contactData = {
        client: formData.client,
        name: formData.name,
        position: formData.position,
        email: formData.email,
        phone: formData.phone,
        is_primary: formData.is_primary,
        notes: formData.notes,
      };

      await apiClient.createContact(contactData);
      
      await showAlert('Contacto agregado exitosamente');
      onSuccess();
    } catch (error: any) {
      console.error('Error al agregar contacto:', error);
      await showAlert(`Error al agregar contacto: ${error.message || 'Error desconocido'}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed top-16 left-0 right-0 bottom-0  flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[calc(100vh-5rem)] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-600 px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Agregar Contacto</h2>
            <button
              onClick={onClose}
              className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cliente <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.client}
              onChange={(e) => setFormData({ ...formData, client: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Seleccionar cliente...</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.company_name}
                </option>
              ))}
            </select>
          </div>

          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Nombre completo"
              required
            />
          </div>

          {/* Posición */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Posición <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ej: Director de RH"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="contacto@empresa.com"
              required
            />
          </div>

          {/* Teléfono */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Teléfono <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="(123) 456-7890"
              required
            />
          </div>

          {/* Contacto Principal */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_primary"
              checked={formData.is_primary}
              onChange={(e) => setFormData({ ...formData, is_primary: e.target.checked })}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <label htmlFor="is_primary" className="ml-2 text-sm text-gray-700">
              Marcar como contacto principal
            </label>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notas
            </label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="Notas adicionales sobre este contacto..."
            />
          </div>

          </div>
          
          {/* Buttons - Fixed at bottom */}
          <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Guardando...
                </>
              ) : (
                <>
                  <i className="fas fa-save mr-2"></i>
                  Guardar Contacto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

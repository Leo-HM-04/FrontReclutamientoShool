"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useModal } from '@/context/ModalContext';
import { generateProfileFromTranscription, getClients } from "@/lib/api";

interface Client {
  id: number;
  business_name: string;
  commercial_name: string;
}

interface ProfileGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (message: string) => void;
}

export default function ProfileGenerationModal({ 
  isOpen, 
  onClose, 
  onSuccess 
}: ProfileGenerationModalProps) {
  const { showAlert } = useModal();
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [transcription, setTranscription] = useState<string>("");
  const [additionalNotes, setAdditionalNotes] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (isOpen) {
      loadClients();
    }
  }, [isOpen]);

  const loadClients = async () => {
    setLoadingClients(true);
    try {
      const response = await getClients();
        const clientsList = (response as any).results || (Array.isArray(response) ? response : []);
      setClients(clientsList);
    } catch (error) {
      console.error('Error loading clients:', error);
      if (onSuccess) {
        onSuccess('⚠️ Error al cargar clientes');
      }
    } finally {
      setLoadingClients(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!transcription.trim()) {
      await showAlert('Por favor ingresa la transcripción de la reunión');
      return;
    }

    setLoading(true);

    try {
      const data: any = {
        meeting_transcription: transcription,
        additional_notes: additionalNotes,
      };

      if (selectedClient) {
        data.client_id = parseInt(selectedClient);
      }

      const result = await generateProfileFromTranscription(data);

      if (onSuccess) {
        onSuccess(result.message || '✅ Perfil generado exitosamente con IA');
      }

      // Reset form
      setSelectedClient("");
      setTranscription("");
      setAdditionalNotes("");
      onClose();
    } catch (error: any) {
      console.error('Error generating profile:', error);
      if (onSuccess) {
        onSuccess(`⚠️ Error: ${error.message || 'Error al generar el perfil'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      style={{ zIndex: 9999 }}
      onClick={!loading ? onClose : undefined}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: "95vw", height: "92vh", maxWidth: "900px" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-600 to-purple-700 flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <i className="fas fa-wand-magic-sparkles text-white text-lg"></i>
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-white truncate">Generar Perfil con IA</h3>
              <p className="text-xs text-purple-100">Crea perfiles automáticamente desde transcripciones de reuniones</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
            disabled={loading}
            title="Cerrar"
          >
            <i className="fas fa-times text-lg"></i>
          </button>
        </div>

        {/* Content - scrollable */}
        <div className="flex-1 overflow-y-auto" style={{ minHeight: 0 }}>
          <form ref={formRef} onSubmit={handleSubmit} className="p-6 lg:p-8">
            {/* Client Selection (Optional) */}
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">
                <i className="fas fa-building mr-2 text-purple-600"></i>
                Cliente (Opcional)
              </label>
              {loadingClients ? (
                <div className="flex items-center justify-center py-4">
                  <i className="fas fa-spinner fa-spin text-purple-600 mr-2"></i>
                  <span className="text-gray-600">Cargando clientes...</span>
                </div>
              ) : (
                <select
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={loading}
                >
                  <option value="">Seleccionar cliente (opcional)...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.commercial_name || client.business_name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Transcription */}
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">
                <i className="fas fa-microphone mr-2 text-purple-600"></i>
                Transcripción de la Reunión *
              </label>
              <textarea
                value={transcription}
                onChange={(e) => setTranscription(e.target.value)}
                rows={10}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                placeholder="Pega aquí la transcripción completa de la reunión con el cliente donde se discutió el perfil de reclutamiento..."
                required
                disabled={loading}
              />
              <p className="mt-2 text-sm text-gray-500">
                {transcription.length} caracteres
              </p>
            </div>

            {/* Additional Notes */}
            <div className="mb-6">
              <label className="block text-gray-700 font-semibold mb-2">
                <i className="fas fa-sticky-note mr-2 text-purple-600"></i>
                Notas Adicionales (Opcional)
              </label>
              <textarea
                value={additionalNotes}
                onChange={(e) => setAdditionalNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Agrega cualquier contexto adicional, requisitos especiales, o información que no esté en la transcripción..."
                disabled={loading}
              />
            </div>

            {/* Info Box */}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
              <div className="flex gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <i className="fas fa-magic text-purple-600 text-sm"></i>
                </div>
                <div>
                  <p className="text-sm text-purple-800 font-semibold">
                    Claude AI generará automáticamente:
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3">
                    {[
                      'Título del puesto y descripción',
                      'Responsabilidades principales',
                      'Requisitos técnicos y experiencia',
                      'Habilidades requeridas',
                      'Rango salarial y beneficios',
                      'Modalidad de trabajo y ubicación'
                    ].map((item, i) => (
                      <p key={i} className="text-xs text-purple-600 flex items-center">
                        <i className="fas fa-check-circle text-purple-400 mr-1.5 text-[10px]"></i>
                        {item}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer - fixed at bottom */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 font-semibold transition"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => formRef.current?.requestSubmit()}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 font-semibold shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={loading || !transcription.trim()}
            >
              {loading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Generando con IA...
                </>
              ) : (
                <>
                  <i className="fas fa-wand-magic-sparkles"></i>
                  Generar Perfil con IA
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
}

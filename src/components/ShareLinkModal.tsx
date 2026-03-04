'use client';

/**
 * ============================================================
 * MODAL DE COMPARTIR ENLACE DE AVANCE
 * ============================================================
 * Modal para generar, mostrar y copiar el enlace compartible
 * del avance de un perfil de reclutamiento
 * 
 * Características:
 * - Generación de enlace único
 * - Copiar al portapapeles
 * - Abrir en nueva pestaña
 * - Revocar enlace (opcional)
 * - Diseño profesional y responsive
 */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';

// ============================================================
// INTERFACES
// ============================================================

interface ShareLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareLink: string;
  profileTitle: string;
  clientName: string;
  onRevoke?: () => void;
  // Modo: 'progress' muestra "Compartir Avance"; 'form' muestra "Compartir Formulario Público"
  mode?: 'progress' | 'form';
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function ShareLinkModal({
  isOpen,
  onClose,
  shareLink,
  profileTitle,
  clientName,
  onRevoke,
  mode = 'progress',
}: ShareLinkModalProps) {
  const [copied, setCopied] = useState(false);

  // ============================================================
  // FUNCIONES
  // ============================================================

  const handleCopy = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenInNewTab = () => {
    window.open(shareLink, '_blank', 'noopener,noreferrer');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Avance: ${profileTitle}`,
          text: `Seguimiento del proceso de reclutamiento para ${profileTitle}`,
          url: shareLink,
        });
      } catch (err) {
        console.log('Error al compartir:', err);
      }
    } else {
      handleCopy();
    }
  };

  // ============================================================
  // RENDER
  // ============================================================

  if (!isOpen) return null;

  const isForm = mode === 'form';

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col"
        style={{ width: '95vw', height: '92vh', maxWidth: '900px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Fixed Header */}
        <div className={`flex-shrink-0 text-white px-8 py-5 flex justify-between items-center rounded-t-2xl ${isForm ? 'bg-gradient-to-r from-orange-500 to-amber-500' : 'bg-gradient-to-r from-blue-600 to-indigo-600'}`}>
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <i className={`fas ${isForm ? 'fa-file-alt' : 'fa-share-alt'}`}></i>
              {isForm ? 'Compartir Formulario Público' : 'Compartir Avance'}
            </h2>
            <p className={`text-sm mt-1 ${isForm ? 'text-orange-100' : 'text-blue-100'}`}>
              {isForm ? 'Enlace público para que cualquiera complete el formulario' : 'Enlace público del progreso'}
            </p>
          </div>
          <button
            onClick={onClose}
            className={`text-white rounded-full w-10 h-10 flex items-center justify-center transition ${isForm ? 'hover:bg-orange-700' : 'hover:bg-blue-800'}`}
          >
            <i className="fas fa-times text-xl"></i>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {/* Profile/Client Info */}
          <div className={`rounded-xl p-6 border ${isForm ? 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                  <i className={`fas fa-briefcase mr-1 ${isForm ? 'text-orange-500' : 'text-blue-500'}`}></i> Perfil
                </label>
                <p className="text-lg font-semibold text-gray-900">{profileTitle}</p>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                  <i className={`fas fa-building mr-1 ${isForm ? 'text-orange-500' : 'text-blue-500'}`}></i> Cliente
                </label>
                <p className="text-lg font-semibold text-gray-900">{clientName}</p>
              </div>
            </div>
          </div>

          {/* Shareable Link */}
          <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <i className={`fas fa-link ${isForm ? 'text-orange-600' : 'text-blue-600'}`}></i>
              Enlace para Compartir
            </h3>
            <div className="flex items-center gap-3">
              <input
                type="text"
                value={shareLink}
                readOnly
                className={`flex-1 px-4 py-3 border border-gray-300 rounded-xl bg-white text-gray-700 text-sm focus:outline-none focus:ring-2 focus:border-transparent ${isForm ? 'focus:ring-orange-500' : 'focus:ring-blue-500'}`}
              />
              <button
                onClick={handleCopy}
                className={`px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 whitespace-nowrap shadow-md ${
                  copied
                    ? 'bg-green-600 text-white'
                    : isForm
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600'
                      : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700'
                }`}
              >
                <i className={`fas ${copied ? 'fa-check-circle' : 'fa-copy'}`}></i>
                {copied ? '¡Copiado!' : 'Copiar'}
              </button>
            </div>
          </div>

          {/* Link Info */}
          <div className={`rounded-xl p-6 border ${isForm ? 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200' : 'bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200'}`}>
            <h3 className={`font-bold text-lg mb-4 flex items-center gap-2 ${isForm ? 'text-orange-900' : 'text-blue-900'}`}>
              <i className={`fas fa-info-circle ${isForm ? 'text-orange-600' : 'text-blue-600'}`}></i>
              Información del Enlace Compartible
            </h3>
            <ul className="space-y-3">
              {[
                'Este enlace puede ser compartido con tu cliente de forma segura',
                'No requiere inicio de sesión ni credenciales',
                'Se actualiza automáticamente en tiempo real',
                'Válido indefinidamente hasta que lo revoque',
                'Protege la privacidad de los candidatos (sin nombres reales)',
              ].map((text, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${isForm ? 'bg-orange-200 text-orange-700' : 'bg-blue-200 text-blue-700'}`}>
                    <i className="fas fa-check text-xs"></i>
                  </span>
                  <span className={`text-sm ${isForm ? 'text-orange-800' : 'text-blue-800'}`}>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={handleShare}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition font-semibold shadow-sm"
            >
              <i className="fas fa-share-square text-lg text-gray-500"></i>
              Compartir
            </button>
            <button
              onClick={handleOpenInNewTab}
              className="flex items-center justify-center gap-3 px-6 py-4 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition font-semibold shadow-sm"
            >
              <i className="fas fa-external-link-alt text-lg text-gray-500"></i>
              Abrir Vista Previa
            </button>
          </div>

          {/* Revoke Zone (optional) */}
          {onRevoke && (
            <div className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <i className="fas fa-exclamation-triangle text-red-600"></i>
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-red-900 text-lg mb-1">Zona de Peligro</h4>
                  <p className="text-sm text-red-700 mb-4">
                    Revocar el enlace generará uno nuevo y el enlace actual dejará de funcionar.
                  </p>
                  <button
                    onClick={onRevoke}
                    className="px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition text-sm font-semibold shadow-md"
                  >
                    <i className="fas fa-ban mr-2"></i>
                    Revocar Enlace
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Footer */}
        <div className="flex-shrink-0 px-8 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-semibold transition"
          >
            Cerrar
          </button>
          <button
            onClick={handleCopy}
            className={`px-6 py-3 text-white rounded-xl font-semibold shadow-lg transition flex items-center gap-2 ${
              copied
                ? 'bg-green-600'
                : isForm
                  ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
            }`}
          >
            <i className={`fas ${copied ? 'fa-check-circle' : 'fa-copy'}`}></i>
            {copied ? '¡Enlace Copiado!' : 'Copiar Enlace'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

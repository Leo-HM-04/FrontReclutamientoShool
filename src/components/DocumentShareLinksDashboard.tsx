'use client';

/**
 * ============================================================
 * DASHBOARD DE GESTIÓN DE LINKS DE DOCUMENTOS
 * ============================================================
 * Página para administrar los links de documentos compartidos.
 * Permite ver el estado, progreso, revocar y crear nuevos links.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  getDocumentShareLinks,
  getDocumentShareLinksStats,
  revokeDocumentShareLink,
  deleteDocumentShareLink,
  DocumentShareLink,
} from '@/lib/api';
import ShareDocumentLinkModal from '@/components/ShareDocumentLinkModal';

// ============================================================
// INTERFACES
// ============================================================

interface LinkStats {
  total: number;
  active: number;
  completed: number;
  expired: number;
  revoked: number;
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================

export default function DocumentShareLinksPage() {
  // Estados
  const [links, setLinks] = useState<DocumentShareLink[]>([]);
  const [stats, setStats] = useState<LinkStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | number | null>(null);
  const [actionLoading, setActionLoading] = useState<string | number | null>(null);
  
  // Toast notification state
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    show: false,
    message: '',
    type: 'success',
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  // ============================================================
  // CARGAR DATOS
  // ============================================================

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [linksData, statsData] = await Promise.all([
        getDocumentShareLinks(filterStatus !== 'all' ? { status: filterStatus } : undefined),
        getDocumentShareLinksStats(),
      ]);
      setLinks(linksData);
      setStats(statsData);
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleRevoke = async (id: string | number) => {
    setActionLoading(id);
    try {
      await revokeDocumentShareLink(id);
      await loadData();
      showToast('Link revocado exitosamente', 'success');
    } catch (err: any) {
      setError(err.message || 'Error al revocar link');
      showToast(err.message || 'Error al revocar link', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string | number) => {
    setActionLoading(id);
    try {
      await deleteDocumentShareLink(id);
      setShowDeleteConfirm(null);
      await loadData();
      showToast('Link eliminado exitosamente', 'success');
    } catch (err: any) {
      setError(err.message || 'Error al eliminar link');
      showToast(err.message || 'Error al eliminar link', 'error');
    } finally {
      setActionLoading(null);
    }
  };

  /**
   * Copia el link al portapapeles con validación y feedback UX
   * Incluye fallback para navegadores sin clipboard API
   */
  const handleCopyLink = async (url: string | undefined) => {
    // Validación: verificar que el link existe
    if (!url || url.trim() === '') {
      showToast('No hay enlace disponible para este registro', 'error');
      console.error('❌ Intento de copiar link vacío o undefined');
      return;
    }

    try {
      // Método moderno: Clipboard API (requiere HTTPS o localhost)
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
        showToast('✓ Enlace copiado al portapapeles', 'success');
        console.log('✅ Link copiado:', url);
      } else {
        // Fallback para HTTP local o navegadores antiguos
        copyToClipboardFallback(url);
        showToast('✓ Enlace copiado al portapapeles', 'success');
        console.log('✅ Link copiado (fallback):', url);
      }
    } catch (err) {
      console.error('❌ Error al copiar:', err);
      // Intentar fallback si falla el método moderno
      try {
        copyToClipboardFallback(url);
        showToast('✓ Enlace copiado al portapapeles', 'success');
      } catch (fallbackErr) {
        showToast('Error al copiar. Por favor copia manualmente', 'error');
        console.error('❌ Error en fallback:', fallbackErr);
      }
    }
  };

  /**
   * Fallback para copiar al portapapeles sin Clipboard API
   * Útil en HTTP local o Safari antiguo
   */
  const copyToClipboardFallback = (text: string) => {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    document.body.appendChild(textarea);
    
    textarea.focus();
    textarea.select();
    
    try {
      const successful = document.execCommand('copy');
      if (!successful) throw new Error('execCommand failed');
    } finally {
      document.body.removeChild(textarea);
    }
  };

  /**
   * Abre el link en nueva pestaña con validación
   */
  const handleOpenLink = (url: string | undefined) => {
    if (!url || url.trim() === '') {
      showToast('No hay enlace disponible para este registro', 'error');
      console.error('❌ Intento de abrir link vacío o undefined');
      return;
    }
    
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
      console.log('✅ Abriendo link:', url);
    } catch (err) {
      console.error('❌ Error al abrir link:', err);
      showToast('Error al abrir el enlace', 'error');
    }
  };

  const handleLinkCreated = () => {
    loadData();
    setShowCreateModal(false);
  };

  // ============================================================
  // FILTRADO
  // ============================================================

  const filteredLinks = links.filter(link => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    const candidateName = link.candidate_name || link.candidate_info?.full_name || '';
    const candidateEmail = link.candidate_info?.email || '';
    return (
      candidateName.toLowerCase().includes(search) ||
      candidateEmail.toLowerCase().includes(search)
    );
  });

  // ============================================================
  // HELPER FUNCTIONS
  // ============================================================

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      active: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      completed: 'bg-blue-100 text-blue-800 border-blue-200',
      expired: 'bg-gray-100 text-gray-800 border-gray-200',
      revoked: 'bg-red-100 text-red-800 border-red-200',
    };
    const labels: Record<string, string> = {
      active: 'Activo',
      completed: 'Completado',
      expired: 'Expirado',
      revoked: 'Revocado',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[status] || styles.expired}`}>
        {labels[status] || status}
      </span>
    );
  };

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Links de Documentos</h1>
            <p className="text-gray-600 mt-1">
              Gestiona los links compartidos para subida de documentos
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Crear Link
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Total</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-emerald-200 p-4">
              <p className="text-sm text-emerald-600">Activos</p>
              <p className="text-2xl font-bold text-emerald-600">{stats.active}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-blue-200 p-4">
              <p className="text-sm text-blue-600">Completados</p>
              <p className="text-2xl font-bold text-blue-600">{stats.completed}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <p className="text-sm text-gray-500">Expirados</p>
              <p className="text-2xl font-bold text-gray-500">{stats.expired}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-red-200 p-4">
              <p className="text-sm text-red-600">Revocados</p>
              <p className="text-2xl font-bold text-red-600">{stats.revoked}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre o email del candidato..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-2">
              {['all', 'active', 'completed', 'expired', 'revoked'].map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterStatus === status
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {status === 'all' ? 'Todos' : 
                   status === 'active' ? 'Activos' :
                   status === 'completed' ? 'Completados' :
                   status === 'expired' ? 'Expirados' : 'Revocados'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : filteredLinks.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay links</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm ? 'No se encontraron links con esa búsqueda' : 'Crea tu primer link para comenzar'}
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Crear Link
            </button>
          </div>
        ) : (
          /* Links Table */
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Candidato
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Progreso
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Accesos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expira
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Creado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredLinks.map((link) => (
                    <tr key={link.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <p className="font-medium text-gray-900">
                            {link.candidate_name || link.candidate_info?.full_name || 'Sin nombre'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {link.candidate_info?.email || ''}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(link.status)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                link.progress_percentage === 100 ? 'bg-blue-600' : 'bg-emerald-600'
                              }`}
                              style={{ width: `${link.progress_percentage}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">
                            {link.progress_percentage}%
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          { (link.uploaded_count !== undefined || link.requested_count !== undefined)
                              ? `${link.uploaded_count ?? 0} de ${link.requested_count ?? 0} docs`
                              : (link.documents_count ? `${link.documents_count} docs` : `${link.uploaded_documents?.length || 0} de ${link.requested_document_types?.length || 0} docs`)
                          }
                        </p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {link.access_count}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(link.expires_at).toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(link.created_at).toLocaleDateString('es-MX', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Copy Link */}
                          <button
                            onClick={() => handleCopyLink(link.share_url)}
                            className="p-2 text-gray-400 hover:text-emerald-600 transition-colors"
                            title="Copiar link"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                          
                          {/* Open in new tab */}
                          <button
                            onClick={() => handleOpenLink(link.share_url)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Abrir link"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </button>
                          
                          {/* Revoke (only for active) */}
                          {link.status === 'active' && (
                            <button
                              onClick={() => handleRevoke(link.id)}
                              disabled={actionLoading === link.id}
                              className="p-2 text-gray-400 hover:text-orange-600 transition-colors disabled:opacity-50"
                              title="Revocar"
                            >
                              {actionLoading === link.id ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-orange-600"></div>
                              ) : (
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                </svg>
                              )}
                            </button>
                          )}
                          
                          {/* Delete */}
                          <button
                            onClick={() => setShowDeleteConfirm(link.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Eliminar"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <ShareDocumentLinkModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleLinkCreated}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <>
          <div 
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => setShowDeleteConfirm(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                ¿Eliminar link?
              </h3>
              <p className="text-gray-600 mb-6">
                Esta acción no se puede deshacer. El link dejará de funcionar inmediatamente.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(showDeleteConfirm)}
                  disabled={actionLoading === showDeleteConfirm}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading === showDeleteConfirm && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  )}
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
          <div className={`rounded-lg shadow-xl px-6 py-4 max-w-md flex items-center gap-3 ${
            toast.type === 'success' ? 'bg-emerald-600 text-white' :
            toast.type === 'error' ? 'bg-red-600 text-white' :
            'bg-blue-600 text-white'
          }`}>
            {toast.type === 'success' && (
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            )}
            {toast.type === 'error' && (
              <svg className="w-6 h-6 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
            <p className="font-medium">{toast.message}</p>
          </div>
        </div>
      )}
    </div>
  );
}

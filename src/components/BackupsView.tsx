'use client';

/**
 * ============================================================
 * BACKUPS VIEW - Sistema de Respaldos de Base de Datos
 * ============================================================
 * Componente para gestionar respaldos, restauraciones,
 * exportaciones y estadisticas del sistema.
 * Solo accesible por administradores.
 */

import React, { useState, useEffect, useCallback } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ═══════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════

interface BackupItem {
  id: number;
  backup_type: string;
  backup_type_display: string;
  operation: string;
  operation_display: string;
  file_name: string;
  size_bytes: number;
  size_display: string;
  hash_sha256: string;
  status: string;
  status_display: string;
  executed_by: string | null;
  executed_by_email: string | null;
  started_at: string | null;
  finished_at: string | null;
  duration: string;
  records_count: number | null;
  tables_count: number | null;
  notes: string;
  error_message: string;
  notify_email: boolean;
}

interface BackupStats {
  total_backups: number;
  by_status: { success: number; failed: number; in_progress: number };
  by_type: { full: number; incremental: number; differential: number };
  total_size_bytes: number;
  total_size_display: string;
  last_success: {
    id: number;
    date: string;
    size: string;
    type: string;
    duration: string;
  } | null;
  disk: {
    total: string;
    used: string;
    free: string;
    percent: number;
    backups_size: string;
    backup_dir: string;
  };
}

interface VerifyResult {
  valid: boolean;
  stored_hash: string;
  current_hash: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function getHeaders(): Record<string, string> {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function apiFetch(path: string, opts: RequestInit = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { ...getHeaders(), ...(opts.headers as Record<string, string> || {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.detail || `Error ${res.status}`);
  }
  return res;
}

// ═══════════════════════════════════════════════════════════
// STATUS BADGE
// ═══════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  started: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Iniciado' },
  in_progress: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'En Proceso' },
  success: { bg: 'bg-green-100', text: 'text-green-800', label: 'Exitoso' },
  failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Fallido' },
  verified: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Verificado' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.started;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  );
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    full: 'bg-indigo-100 text-indigo-800',
    incremental: 'bg-purple-100 text-purple-800',
    differential: 'bg-cyan-100 text-cyan-800',
  };
  const labels: Record<string, string> = {
    full: 'Completo',
    incremental: 'Incremental',
    differential: 'Diferencial',
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colors[type] || 'bg-gray-100 text-gray-800'}`}>
      {labels[type] || type}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════

export default function BackupsView() {
  // State
  const [backups, setBackups] = useState<BackupItem[]>([]);
  const [stats, setStats] = useState<BackupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [filterType, setFilterType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showVerifyResult, setShowVerifyResult] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<BackupItem | null>(null);
  const [verifyResult, setVerifyResult] = useState<VerifyResult | null>(null);

  // Create form
  const [createType, setCreateType] = useState('full');
  const [createNotes, setCreateNotes] = useState('');
  const [createNotify, setCreateNotify] = useState(true);

  // Restore
  const [restoreConfirmText, setRestoreConfirmText] = useState('');

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // ─────────────────────────────────────────────────────────
  // DATA LOADING
  // ─────────────────────────────────────────────────────────

  const loadBackups = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(page), page_size: '15' });
      if (filterType) params.set('type', filterType);
      if (filterStatus) params.set('status', filterStatus);
      if (searchTerm) params.set('search', searchTerm);

      const res = await apiFetch(`/api/backups/?${params}`);
      const data = await res.json();
      setBackups(data.results || []);
      setTotal(data.total || 0);
      setTotalPages(data.total_pages || 1);
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [page, filterType, filterStatus, searchTerm]);

  const loadStats = useCallback(async () => {
    try {
      const res = await apiFetch('/api/backups/stats/');
      const data = await res.json();
      setStats(data);
    } catch {
      // stats are optional, don't show error
    }
  }, []);

  useEffect(() => {
    loadBackups();
    loadStats();
  }, [loadBackups, loadStats]);

  // Polling: refresh every 10 seconds if there's an in-progress backup
  useEffect(() => {
    const hasRunning = backups.some(b => b.status === 'started' || b.status === 'in_progress');
    if (!hasRunning) return;
    const interval = setInterval(() => {
      loadBackups();
      loadStats();
    }, 10000);
    return () => clearInterval(interval);
  }, [backups, loadBackups, loadStats]);

  // ─────────────────────────────────────────────────────────
  // ACTIONS
  // ─────────────────────────────────────────────────────────

  const handleCreate = async () => {
    try {
      setActionLoading('create');
      const res = await apiFetch('/api/backups/create/', {
        method: 'POST',
        body: JSON.stringify({
          backup_type: createType,
          notes: createNotes,
          notify_email: createNotify,
        }),
      });
      const data = await res.json();
      showToast(`Respaldo #${data.id} iniciado correctamente.`, 'success');
      setShowCreateModal(false);
      setCreateNotes('');
      loadBackups();
      loadStats();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Estas seguro de eliminar este respaldo? Esta accion no se puede deshacer.')) return;
    try {
      setActionLoading(`delete-${id}`);
      await apiFetch(`/api/backups/${id}/delete/`, { method: 'DELETE' });
      showToast('Respaldo eliminado correctamente.', 'success');
      loadBackups();
      loadStats();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerify = async (backup: BackupItem) => {
    try {
      setActionLoading(`verify-${backup.id}`);
      const res = await apiFetch(`/api/backups/${backup.id}/verify/`, { method: 'POST' });
      const data = await res.json();
      setVerifyResult(data);
      setSelectedBackup(backup);
      setShowVerifyResult(true);
      if (data.valid) {
        showToast('Integridad verificada correctamente.', 'success');
        loadBackups();
      } else {
        showToast('La verificacion de integridad fallo.', 'error');
      }
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownload = (id: number, format: 'sql' | 'excel' | 'pdf') => {
    const token = localStorage.getItem('authToken');
    let url = '';
    if (format === 'sql') url = `${API_BASE}/api/backups/${id}/download/`;
    else if (format === 'excel') url = `${API_BASE}/api/backups/${id}/export/excel/`;
    else if (format === 'pdf') url = `${API_BASE}/api/backups/${id}/export/pdf/`;

    // Crear un formulario invisible para la descarga con token en el header
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.open();
      iframeDoc.write(`
        <html>
          <body>
            <form id="downloadForm" method="GET" action="${url}">
              <input type="hidden" name="token" value="${token}" />
            </form>
            <script>
              // Usar XMLHttpRequest para descargar con header de autorizacion
              var xhr = new XMLHttpRequest();
              xhr.open('GET', '${url}', true);
              xhr.setRequestHeader('Authorization', 'Bearer ${token}');
              xhr.responseType = 'blob';
              xhr.onload = function() {
                if (xhr.status === 200) {
                  var blob = xhr.response;
                  var link = document.createElement('a');
                  link.href = window.URL.createObjectURL(blob);
                  link.download = 'respaldo_${id}.${format === 'excel' ? 'xlsx' : format}';
                  link.click();
                  window.URL.revokeObjectURL(link.href);
                }
              };
              xhr.send();
            </script>
          </body>
        </html>
      `);
      iframeDoc.close();
      
      // Limpiar iframe despues de 5 segundos
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 5000);
    }
    
    showToast('Descarga iniciada.', 'success');
  };

  const handleRestore = async () => {
    if (!selectedBackup) return;
    try {
      setActionLoading('restore');
      const res = await apiFetch('/api/backups/restore/', {
        method: 'POST',
        body: JSON.stringify({
          backup_id: selectedBackup.id,
          confirmation: restoreConfirmText,
        }),
      });
      const data = await res.json();
      showToast(`Restauracion #${data.id} iniciada en segundo plano.`, 'success');
      setShowRestoreModal(false);
      setRestoreConfirmText('');
      loadBackups();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setActionLoading(null);
    }
  };

  const openDetail = (backup: BackupItem) => {
    setSelectedBackup(backup);
    setShowDetailModal(true);
  };

  const openRestore = (backup: BackupItem) => {
    setSelectedBackup(backup);
    setRestoreConfirmText('');
    setShowRestoreModal(true);
  };

  // ─────────────────────────────────────────────────────────
  // FORMAT HELPERS
  // ─────────────────────────────────────────────────────────

  const formatDate = (iso: string | null) => {
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleString('es-MX', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    });
  };

  // ─────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-lg shadow-lg text-white text-sm font-medium transition-all ${
          toast.type === 'success' ? 'bg-green-600' :
          toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
        }`}>
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-3 text-white/80 hover:text-white">&times;</button>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════
          HEADER + STATS CARDS
          ═════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Respaldos de Base de Datos</h2>
          <p className="text-sm text-gray-500 mt-1">Gestiona, exporta y restaura respaldos del sistema</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition shadow-sm"
        >
          <i className="fas fa-plus mr-2"></i>
          Nuevo Respaldo
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Respaldos</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{stats.total_backups}</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Exitosos</div>
            <div className="mt-1 text-2xl font-bold text-green-600">{stats.by_status.success}</div>
            {stats.by_status.failed > 0 && (
              <div className="text-xs text-red-500 mt-0.5">{stats.by_status.failed} fallido(s)</div>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Espacio Usado</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{stats.total_size_display}</div>
            <div className="text-xs text-gray-400 mt-0.5">en respaldos</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Disco Libre</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{stats.disk.free}</div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
              <div
                className={`h-1.5 rounded-full ${stats.disk.percent > 85 ? 'bg-red-500' : stats.disk.percent > 70 ? 'bg-yellow-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min(stats.disk.percent, 100)}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{stats.disk.percent}% usado</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ultimo Respaldo</div>
            {stats.last_success ? (
              <>
                <div className="mt-1 text-sm font-semibold text-gray-900">{stats.last_success.type}</div>
                <div className="text-xs text-gray-500">{formatDate(stats.last_success.date)}</div>
                <div className="text-xs text-gray-400">{stats.last_success.size} / {stats.last_success.duration}</div>
              </>
            ) : (
              <div className="mt-1 text-sm text-gray-400">Ninguno aun</div>
            )}
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════
          FILTERS
          ═════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Buscar</label>
            <input
              type="text"
              value={searchTerm}
              onChange={e => { setSearchTerm(e.target.value); setPage(1); }}
              placeholder="Nombre de archivo..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Tipo</label>
            <select
              value={filterType}
              onChange={e => { setFilterType(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Todos</option>
              <option value="full">Completo</option>
              <option value="incremental">Incremental</option>
              <option value="differential">Diferencial</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Estado</label>
            <select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">Todos</option>
              <option value="success">Exitoso</option>
              <option value="verified">Verificado</option>
              <option value="failed">Fallido</option>
              <option value="in_progress">En Proceso</option>
              <option value="started">Iniciado</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setFilterType(''); setFilterStatus(''); setSearchTerm(''); setPage(1); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════
          TABLE
          ═════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <span className="ml-3 text-gray-500">Cargando respaldos...</span>
          </div>
        ) : backups.length === 0 ? (
          <div className="text-center py-16">
            <i className="fas fa-database text-5xl text-gray-200 mb-4"></i>
            <h3 className="text-lg font-medium text-gray-700">No hay respaldos</h3>
            <p className="text-sm text-gray-400 mt-1">Crea tu primer respaldo con el boton de arriba</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tipo</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Operacion</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Fecha</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Tamano</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Duracion</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Usuario</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {backups.map(bk => (
                    <tr key={bk.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-mono text-gray-500">#{bk.id}</td>
                      <td className="px-4 py-3"><TypeBadge type={bk.backup_type} /></td>
                      <td className="px-4 py-3 text-gray-600">{bk.operation_display}</td>
                      <td className="px-4 py-3"><StatusBadge status={bk.status} /></td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDate(bk.started_at)}</td>
                      <td className="px-4 py-3 text-gray-600">{bk.size_display}</td>
                      <td className="px-4 py-3 text-gray-600">{bk.duration}</td>
                      <td className="px-4 py-3 text-gray-600">{bk.executed_by || 'Sistema'}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openDetail(bk)}
                            title="Ver detalle"
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition"
                          >
                            <i className="fas fa-eye text-xs"></i>
                          </button>
                          {(bk.status === 'success' || bk.status === 'verified') && bk.operation === 'backup' && (
                            <>
                              <button
                                onClick={() => handleDownload(bk.id, 'sql')}
                                title="Descargar SQL"
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                              >
                                <i className="fas fa-download text-xs"></i>
                              </button>
                              <button
                                onClick={() => handleDownload(bk.id, 'excel')}
                                title="Exportar Excel"
                                className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded transition"
                              >
                                <i className="fas fa-file-excel text-xs"></i>
                              </button>
                              <button
                                onClick={() => handleDownload(bk.id, 'pdf')}
                                title="Exportar PDF"
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                              >
                                <i className="fas fa-file-pdf text-xs"></i>
                              </button>
                              <button
                                onClick={() => handleVerify(bk)}
                                disabled={actionLoading === `verify-${bk.id}`}
                                title="Verificar integridad"
                                className="p-1.5 text-gray-400 hover:text-cyan-600 hover:bg-cyan-50 rounded transition disabled:opacity-50"
                              >
                                <i className={`fas ${actionLoading === `verify-${bk.id}` ? 'fa-spinner fa-spin' : 'fa-shield-alt'} text-xs`}></i>
                              </button>
                              <button
                                onClick={() => openRestore(bk)}
                                title="Restaurar desde este respaldo"
                                className="p-1.5 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded transition"
                              >
                                <i className="fas fa-undo text-xs"></i>
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDelete(bk.id)}
                            disabled={actionLoading === `delete-${bk.id}`}
                            title="Eliminar"
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition disabled:opacity-50"
                          >
                            <i className={`fas ${actionLoading === `delete-${bk.id}` ? 'fa-spinner fa-spin' : 'fa-trash'} text-xs`}></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <div className="text-sm text-gray-500">
                  {total} respaldo(s) encontrado(s) - Pagina {page} de {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 transition"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ═════════════════════════════════════════════════════
          MODAL: CREAR RESPALDO
          ═════════════════════════════════════════════════════ */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCreateModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Nuevo Respaldo</h3>
              <p className="text-sm text-gray-500 mt-0.5">Se ejecutara en segundo plano</p>
            </div>
            <div className="px-6 py-5 space-y-5">
              {/* Tipo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Respaldo</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'full', label: 'Completo', icon: 'fa-database', desc: 'Copia total' },
                    { value: 'incremental', label: 'Incremental', icon: 'fa-layer-group', desc: 'Solo cambios' },
                    { value: 'differential', label: 'Diferencial', icon: 'fa-copy', desc: 'Desde ultimo full' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setCreateType(opt.value)}
                      className={`flex flex-col items-center p-3 rounded-xl border-2 transition ${
                        createType === opt.value
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <i className={`fas ${opt.icon} text-lg ${createType === opt.value ? 'text-indigo-600' : 'text-gray-400'}`}></i>
                      <span className={`text-xs font-medium mt-1 ${createType === opt.value ? 'text-indigo-700' : 'text-gray-600'}`}>{opt.label}</span>
                      <span className="text-[10px] text-gray-400 mt-0.5">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones (opcional)</label>
                <textarea
                  value={createNotes}
                  onChange={e => setCreateNotes(e.target.value)}
                  rows={2}
                  placeholder="Motivo del respaldo..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Notificar */}
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createNotify}
                  onChange={e => setCreateNotify(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">Enviar notificacion por email al finalizar</span>
              </label>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={actionLoading === 'create'}
                className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
              >
                {actionLoading === 'create' ? (
                  <><i className="fas fa-spinner fa-spin mr-2"></i>Creando...</>
                ) : (
                  <><i className="fas fa-play mr-2"></i>Iniciar Respaldo</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════
          MODAL: DETALLE
          ═════════════════════════════════════════════════════ */}
      {showDetailModal && selectedBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowDetailModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Respaldo #{selectedBackup.id}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <TypeBadge type={selectedBackup.backup_type} />
                  <StatusBadge status={selectedBackup.status} />
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">&times;</button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['Operacion', selectedBackup.operation_display],
                  ['Archivo', selectedBackup.file_name || 'N/A'],
                  ['Tamano', selectedBackup.size_display],
                  ['Duracion', selectedBackup.duration],
                  ['Tablas', selectedBackup.tables_count ?? 'N/A'],
                  ['Registros', selectedBackup.records_count ?? 'N/A'],
                  ['Inicio', formatDate(selectedBackup.started_at)],
                  ['Fin', formatDate(selectedBackup.finished_at)],
                  ['Usuario', selectedBackup.executed_by || 'Sistema'],
                  ['Email notif.', selectedBackup.notify_email ? 'Si' : 'No'],
                ].map(([label, value]) => (
                  <div key={label as string}>
                    <div className="text-xs text-gray-400 uppercase tracking-wide">{label}</div>
                    <div className="font-medium text-gray-900 mt-0.5">{String(value)}</div>
                  </div>
                ))}
              </div>

              {selectedBackup.hash_sha256 && (
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Hash SHA-256</div>
                  <div className="font-mono text-xs bg-gray-50 p-2 rounded-lg border border-gray-200 break-all text-gray-600">
                    {selectedBackup.hash_sha256}
                  </div>
                </div>
              )}

              {selectedBackup.notes && (
                <div>
                  <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Observaciones</div>
                  <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded-lg border border-gray-200">{selectedBackup.notes}</div>
                </div>
              )}

              {selectedBackup.error_message && (
                <div>
                  <div className="text-xs text-red-400 uppercase tracking-wide mb-1">Error</div>
                  <div className="text-sm text-red-700 bg-red-50 p-2 rounded-lg border border-red-200">{selectedBackup.error_message}</div>
                </div>
              )}

              {/* Export buttons */}
              {(selectedBackup.status === 'success' || selectedBackup.status === 'verified') && selectedBackup.operation === 'backup' && (
                <div className="pt-2 border-t border-gray-200">
                  <div className="text-xs text-gray-400 uppercase tracking-wide mb-2">Exportar / Descargar</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => handleDownload(selectedBackup.id, 'sql')}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition"
                    >
                      <i className="fas fa-download mr-1.5 text-blue-500"></i>Descargar SQL
                    </button>
                    <button
                      onClick={() => handleDownload(selectedBackup.id, 'excel')}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition"
                    >
                      <i className="fas fa-file-excel mr-1.5 text-green-500"></i>Exportar Excel
                    </button>
                    <button
                      onClick={() => handleDownload(selectedBackup.id, 'pdf')}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition"
                    >
                      <i className="fas fa-file-pdf mr-1.5 text-red-500"></i>Exportar PDF
                    </button>
                    <button
                      onClick={() => handleVerify(selectedBackup)}
                      disabled={!!actionLoading}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 transition disabled:opacity-50"
                    >
                      <i className="fas fa-shield-alt mr-1.5 text-cyan-500"></i>Verificar Integridad
                    </button>
                    <button
                      onClick={() => { setShowDetailModal(false); openRestore(selectedBackup); }}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium border border-orange-300 rounded-lg hover:bg-orange-50 text-orange-700 transition"
                    >
                      <i className="fas fa-undo mr-1.5"></i>Restaurar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════
          MODAL: RESTAURAR
          ═════════════════════════════════════════════════════ */}
      {showRestoreModal && selectedBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowRestoreModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-red-200 bg-red-50 rounded-t-2xl">
              <h3 className="text-lg font-semibold text-red-800">
                <i className="fas fa-exclamation-triangle mr-2"></i>
                Restaurar Base de Datos
              </h3>
              <p className="text-sm text-red-600 mt-1">Esta operacion sobrescribira los datos actuales</p>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-sm text-yellow-800 font-medium">
                  Se restaurara desde el respaldo #{selectedBackup.id}
                </p>
                <ul className="text-xs text-yellow-700 mt-1 space-y-0.5">
                  <li>Tipo: {selectedBackup.backup_type_display}</li>
                  <li>Fecha: {formatDate(selectedBackup.started_at)}</li>
                  <li>Tamano: {selectedBackup.size_display}</li>
                </ul>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <strong>ADVERTENCIA:</strong> Todos los datos actuales seran sobrescritos.
                Esta accion no se puede deshacer. Asegurate de tener un respaldo reciente
                antes de continuar.
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Escribe <strong>CONFIRMAR</strong> para proceder
                </label>
                <input
                  type="text"
                  value={restoreConfirmText}
                  onChange={e => setRestoreConfirmText(e.target.value)}
                  placeholder="CONFIRMAR"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowRestoreModal(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleRestore}
                disabled={restoreConfirmText !== 'CONFIRMAR' || actionLoading === 'restore'}
                className="px-5 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                {actionLoading === 'restore' ? (
                  <><i className="fas fa-spinner fa-spin mr-2"></i>Restaurando...</>
                ) : (
                  <><i className="fas fa-undo mr-2"></i>Restaurar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════
          MODAL: RESULTADO VERIFICACION
          ═════════════════════════════════════════════════════ */}
      {showVerifyResult && verifyResult && selectedBackup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowVerifyResult(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className={`px-6 py-4 rounded-t-2xl ${verifyResult.valid ? 'bg-green-50 border-b border-green-200' : 'bg-red-50 border-b border-red-200'}`}>
              <h3 className={`text-lg font-semibold ${verifyResult.valid ? 'text-green-800' : 'text-red-800'}`}>
                <i className={`fas ${verifyResult.valid ? 'fa-check-circle' : 'fa-times-circle'} mr-2`}></i>
                {verifyResult.valid ? 'Integridad Verificada' : 'Verificacion Fallida'}
              </h3>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-sm text-gray-600">
                Respaldo #{selectedBackup.id} - {selectedBackup.file_name}
              </p>
              {verifyResult.error ? (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{verifyResult.error}</div>
              ) : (
                <div className="space-y-2 text-xs font-mono">
                  <div>
                    <span className="text-gray-500">Hash almacenado:  </span>
                    <span className="text-gray-700 break-all">{verifyResult.stored_hash}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Hash actual:      </span>
                    <span className={`break-all ${verifyResult.valid ? 'text-green-700' : 'text-red-700'}`}>{verifyResult.current_hash}</span>
                  </div>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowVerifyResult(false)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

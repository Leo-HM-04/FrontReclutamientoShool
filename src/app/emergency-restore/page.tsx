'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace(/\/+$/, '');

interface BackupFile {
  file_name: string;
  size_bytes: number;
  size_display: string;
  modified: number;
  is_valid_zip: boolean;
}

export default function EmergencyRestorePage() {
  const router = useRouter();

  // Password gate
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [checkingPassword, setCheckingPassword] = useState(false);

  // Restore state
  const [files, setFiles] = useState<BackupFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [filesError, setFilesError] = useState('');
  const [selectedFile, setSelectedFile] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [restoring, setRestoring] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setCheckingPassword(true);
    setPasswordError('');
    try {
      const res = await fetch(`${API_BASE}/backups/emergency/files/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.status === 403) {
        setPasswordError('Contraseña incorrecta.');
        setCheckingPassword(false);
        return;
      }
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const sorted = [...(data.files || [])].sort((a: BackupFile, b: BackupFile) => b.modified - a.modified);
      setFiles(sorted);
      if (sorted.length > 0) setSelectedFile(sorted[0].file_name);
      setAuthenticated(true);
    } catch {
      setPasswordError('No se pudo conectar al backend. Verifica que el servidor esté corriendo.');
    } finally {
      setCheckingPassword(false);
    }
  }

  async function loadFiles() {
    setLoadingFiles(true);
    setFilesError('');
    try {
      const res = await fetch(`${API_BASE}/backups/emergency/files/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      const sorted = [...(data.files || [])].sort((a: BackupFile, b: BackupFile) => b.modified - a.modified);
      setFiles(sorted);
      if (sorted.length > 0 && !selectedFile) setSelectedFile(sorted[0].file_name);
    } catch {
      setFilesError('No se pudo conectar al backend.');
    } finally {
      setLoadingFiles(false);
    }
  }

  async function handleRestore() {
    if (!selectedFile || confirmText !== 'CONFIRMAR') return;
    setRestoring(true);
    setResult(null);
    try {
      const res = await fetch(`${API_BASE}/backups/emergency/restore/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_name: selectedFile, confirmation: 'CONFIRMAR', password }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, message: `Restauración exitosa: ${data.records_count ?? ''} documentos recuperados en ${data.tables_count ?? ''} colecciones.` });
      } else {
        setResult({ ok: false, message: data.error || `Error ${res.status}` });
      }
    } catch {
      setResult({ ok: false, message: 'Error de red al conectar con el backend.' });
    } finally {
      setRestoring(false);
    }
  }

  const canRestore = selectedFile && confirmText === 'CONFIRMAR' && !restoring;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-red-600 rounded-full mb-4 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Restauración de Emergencia</h1>
          <p className="text-red-300 text-sm mt-1">Solo en caso de pérdida total de datos</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

          {/* ═══ PASSWORD GATE ═══ */}
          {!authenticated ? (
            <form onSubmit={handlePasswordSubmit} className="p-6 space-y-4">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <span className="text-amber-800 text-sm">Ingresa la contraseña de emergencia para acceder a la restauración.</span>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Contraseña de emergencia</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setPasswordError(''); }}
                  placeholder="Contraseña"
                  autoFocus
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                />
              </div>

              {passwordError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-red-700 text-sm">{passwordError}</div>
              )}

              <button
                type="submit"
                disabled={!password.trim() || checkingPassword}
                className="w-full py-2.5 rounded-lg text-sm font-bold transition-all
                  disabled:opacity-40 disabled:cursor-not-allowed
                  enabled:bg-red-600 enabled:hover:bg-red-700 enabled:text-white
                  disabled:bg-gray-200 disabled:text-gray-500"
              >
                {checkingPassword ? 'Verificando...' : 'Acceder'}
              </button>

              <div className="text-center">
                <button type="button" onClick={() => router.push('/auth')} className="text-xs text-gray-500 hover:text-gray-700 underline">
                  ← Volver al login
                </button>
              </div>
            </form>
          ) : (
            /* ═══ RESTORE PANEL ═══ */
            <>
              <div className="bg-red-600 px-5 py-3 flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <span className="text-white text-sm font-medium">
                  Esta acción sobreescribirá TODOS los datos actuales de la base de datos.
                </span>
              </div>

              <div className="p-6 space-y-5">
                {/* File List */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-semibold text-gray-700">Respaldos disponibles en disco</label>
                    <button onClick={loadFiles} className="text-xs text-blue-600 hover:text-blue-800 underline">Actualizar</button>
                  </div>

                  {loadingFiles ? (
                    <div className="flex items-center gap-2 text-gray-500 text-sm py-4 justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      Cargando archivos...
                    </div>
                  ) : filesError ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{filesError}</div>
                  ) : files.length === 0 ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-yellow-700 text-sm">No se encontraron archivos de respaldo.</div>
                  ) : (
                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {files.map((f) => (
                        <label
                          key={f.file_name}
                          className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedFile === f.file_name ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <input type="radio" name="backup-file" value={f.file_name} checked={selectedFile === f.file_name} onChange={() => setSelectedFile(f.file_name)} className="mt-0.5 accent-red-600" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-800 truncate">{f.file_name}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {f.size_display} · {new Date(f.modified * 1000).toLocaleString('es-MX')}
                              {!f.is_valid_zip && <span className="ml-2 text-red-500 font-medium">ZIP inválido</span>}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Confirmation */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Confirmación requerida</label>
                  <p className="text-xs text-gray-500 mb-2">
                    Escribe <span className="font-mono font-bold text-red-600">CONFIRMAR</span> para habilitar la restauración.
                  </p>
                  <input
                    type="text"
                    value={confirmText}
                    onChange={(e) => setConfirmText(e.target.value)}
                    placeholder="Escribe CONFIRMAR"
                    className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 transition-colors ${
                      confirmText === 'CONFIRMAR' ? 'border-green-400 focus:ring-green-300 bg-green-50' : 'border-gray-300 focus:ring-red-300'
                    }`}
                  />
                </div>

                {result && (
                  <div className={`rounded-lg p-3 text-sm font-medium ${result.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {result.message}
                    {result.ok && (
                      <div className="mt-2">
                        <button onClick={() => router.push('/auth')} className="text-green-800 underline font-semibold text-xs">
                          → Ir al login para iniciar sesión
                        </button>
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={handleRestore}
                  disabled={!canRestore}
                  className="w-full py-3 px-4 rounded-lg text-sm font-bold transition-all shadow-md
                    disabled:opacity-40 disabled:cursor-not-allowed
                    enabled:bg-red-600 enabled:hover:bg-red-700 enabled:text-white
                    disabled:bg-gray-200 disabled:text-gray-500"
                >
                  {restoring ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Restaurando base de datos...
                    </span>
                  ) : (
                    'Restaurar base de datos'
                  )}
                </button>

                <div className="text-center">
                  <button onClick={() => router.push('/auth')} className="text-xs text-gray-500 hover:text-gray-700 underline">← Volver al login</button>
                </div>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          También puedes restaurar desde la terminal:{' '}
          <span className="font-mono bg-slate-800 text-slate-200 px-2 py-0.5 rounded">
            python manage.py emergency_restore archivo.zip --yes
          </span>
        </p>
      </div>
    </div>
  );
}

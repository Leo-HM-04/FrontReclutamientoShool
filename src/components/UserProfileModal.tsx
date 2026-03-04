'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { apiClient } from '@/lib/api';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated?: (user: any) => void;
}

interface UserData {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  director: 'Director de Reclutamiento',
  supervisor: 'Supervisor',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-red-100 text-red-700',
  director: 'bg-blue-100 text-blue-700',
  supervisor: 'bg-purple-100 text-purple-700',
};

export default function UserProfileModal({ isOpen, onClose, onUserUpdated }: UserProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'security' | 'activity'>('info');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activities, setActivities] = useState<any[]>([]);

  // Form state
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '' });
  const [pwdForm, setPwdForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [showPwd, setShowPwd] = useState({ old: false, new: false, confirm: false });

  const loadUser = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiClient.getCurrentUser() as UserData;
      setUserData(data);
      setForm({ first_name: data.first_name || '', last_name: data.last_name || '', phone: data.phone || '' });
    } catch {
      setError('No se pudo cargar la información del usuario.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadActivities = useCallback(async () => {
    if (!userData) return;
    try {
      const data = await apiClient.getUserActivityById(userData.id);
      setActivities(Array.isArray(data) ? data.slice(0, 10) : []);
    } catch {
      setActivities([]);
    }
  }, [userData]);

  useEffect(() => {
    if (isOpen) {
      loadUser();
      setActiveTab('info');
      setSuccess('');
      setError('');
      setPwdForm({ old_password: '', new_password: '', confirm_password: '' });
    }
  }, [isOpen, loadUser]);

  useEffect(() => {
    if (activeTab === 'activity' && userData) {
      loadActivities();
    }
  }, [activeTab, userData, loadActivities]);

  const handleSaveInfo = async () => {
    if (!userData) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await apiClient.updateUser(userData.id, {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
      });
      setUserData(prev => prev ? { ...prev, ...updated } : prev);
      setSuccess('Perfil actualizado correctamente.');
      onUserUpdated?.(updated);
    } catch {
      setError('Error al guardar los cambios. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (pwdForm.new_password !== pwdForm.confirm_password) {
      setError('Las contraseñas nuevas no coinciden.');
      return;
    }
    if (pwdForm.new_password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    setSavingPwd(true);
    setError('');
    setSuccess('');
    try {
      await apiClient.changePassword(pwdForm.old_password, pwdForm.new_password);
      setSuccess('Contraseña actualizada correctamente.');
      setPwdForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (e: any) {
      const msg = e?.details?.old_password?.[0] || e?.message || 'Error al cambiar la contraseña.';
      setError(msg);
    } finally {
      setSavingPwd(false);
    }
  };

  const getInitials = (user: UserData) => {
    return `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U';
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  if (!isOpen) return null;

  const modal = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '95vw', maxWidth: '860px', height: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 px-6 py-5"
          style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 50%, #1d4ed8 100%)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center border-2 border-white/40 shadow-lg">
                <span className="text-white text-xl font-bold">
                  {userData ? getInitials(userData) : '?'}
                </span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {userData ? `${userData.first_name} ${userData.last_name}`.trim() || userData.email : 'Mi Perfil'}
                </h2>
                <p className="text-blue-200 text-sm mt-0.5">{userData?.email}</p>
                {userData && (
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_COLORS[userData.role] || 'bg-gray-100 text-gray-600'}`}>
                    {ROLE_LABELS[userData.role] || userData.role}
                  </span>
                )}
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 transition-colors flex items-center justify-center">
              <i className="fas fa-times text-white text-lg"></i>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4">
            {[
              { id: 'info', label: 'Información', icon: 'fa-user' },
              { id: 'security', label: 'Seguridad', icon: 'fa-lock' },
              { id: 'activity', label: 'Actividad', icon: 'fa-clock' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-white text-blue-700 shadow' : 'text-blue-100 hover:bg-white/15'}`}
              >
                <i className={`fas ${tab.icon} text-xs`}></i>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
          {/* Alerts */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <i className="fas fa-exclamation-circle text-red-500 mt-0.5"></i>
              <p className="text-sm text-red-700">{error}</p>
              <button onClick={() => setError('')} className="ml-auto text-red-400 hover:text-red-600"><i className="fas fa-times"></i></button>
            </div>
          )}
          {success && (
            <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3">
              <i className="fas fa-check-circle text-green-500 mt-0.5"></i>
              <p className="text-sm text-green-700">{success}</p>
              <button onClick={() => setSuccess('')} className="ml-auto text-green-400 hover:text-green-600"><i className="fas fa-times"></i></button>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-500 text-sm">Cargando perfil...</p>
            </div>
          ) : (
            <>
              {/* === TAB: INFORMACIÓN === */}
              {activeTab === 'info' && userData && (
                <div className="space-y-6">
                  {/* Account Summary */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                        <i className="fas fa-id-card text-blue-600 text-sm"></i>
                      </div>
                      <h3 className="font-semibold text-gray-800">Datos de la Cuenta</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Estado</p>
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold ${userData.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${userData.is_active ? 'bg-green-500' : 'bg-red-500'}`}></span>
                          {userData.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Miembro desde</p>
                        <p className="font-medium text-gray-700">{formatDate(userData.created_at)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs text-gray-500 mb-1">Última actualización</p>
                        <p className="font-medium text-gray-700">{formatDate(userData.updated_at)}</p>
                      </div>
                    </div>
                  </div>

                  {/* Edit Form */}
                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                        <i className="fas fa-edit text-indigo-600 text-sm"></i>
                      </div>
                      <h3 className="font-semibold text-gray-800">Editar Información Personal</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Nombre(s)</label>
                        <input
                          type="text"
                          value={form.first_name}
                          onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Tu nombre"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Apellido(s)</label>
                        <input
                          type="text"
                          value={form.last_name}
                          onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Tu apellido"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Correo Electrónico</label>
                        <div className="relative">
                          <input
                            type="email"
                            value={userData.email}
                            disabled
                            className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-100 text-gray-500 text-sm cursor-not-allowed"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">
                            <i className="fas fa-lock"></i>
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-gray-400">El email no se puede modificar</p>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Teléfono</label>
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="+52 55 1234 5678"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Rol del Sistema</label>
                        <input
                          type="text"
                          value={ROLE_LABELS[userData.role] || userData.role}
                          disabled
                          className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-100 text-gray-500 text-sm cursor-not-allowed"
                        />
                        <p className="mt-1 text-xs text-gray-400">El rol solo puede cambiarlo un administrador</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* === TAB: SEGURIDAD === */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                        <i className="fas fa-shield-alt text-orange-600 text-sm"></i>
                      </div>
                      <h3 className="font-semibold text-gray-800">Cambiar Contraseña</h3>
                    </div>
                    <p className="text-xs text-gray-500 mb-4 ml-10">Usa una contraseña segura de al menos 8 caracteres con letras y números.</p>

                    <div className="space-y-4 max-w-md">
                      {[
                        { field: 'old_password', label: 'Contraseña actual', showKey: 'old' as const },
                        { field: 'new_password', label: 'Nueva contraseña', showKey: 'new' as const },
                        { field: 'confirm_password', label: 'Confirmar nueva contraseña', showKey: 'confirm' as const },
                      ].map(({ field, label, showKey }) => (
                        <div key={field}>
                          <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">{label}</label>
                          <div className="relative">
                            <input
                              type={showPwd[showKey] ? 'text' : 'password'}
                              value={pwdForm[field as keyof typeof pwdForm]}
                              onChange={(e) => setPwdForm(f => ({ ...f, [field]: e.target.value }))}
                              className="w-full px-3 py-2.5 pr-10 rounded-lg border border-gray-200 bg-gray-50 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                              placeholder="••••••••"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPwd(s => ({ ...s, [showKey]: !s[showKey] }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              <i className={`fas ${showPwd[showKey] ? 'fa-eye-slash' : 'fa-eye'} text-sm`}></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Password strength indicator */}
                    {pwdForm.new_password && (
                      <div className="mt-3 max-w-md">
                        <div className="flex gap-1 h-1.5">
                          {[1, 2, 3, 4].map(i => {
                            const strength = Math.min(4, [
                              pwdForm.new_password.length >= 8,
                              /[A-Z]/.test(pwdForm.new_password),
                              /[0-9]/.test(pwdForm.new_password),
                              /[^A-Za-z0-9]/.test(pwdForm.new_password),
                            ].filter(Boolean).length);
                            const colors = ['bg-red-400', 'bg-orange-400', 'bg-yellow-400', 'bg-green-500'];
                            return (
                              <div key={i} className={`flex-1 rounded-full ${i <= strength ? colors[strength - 1] : 'bg-gray-200'}`}></div>
                            );
                          })}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {['', 'Muy débil', 'Débil', 'Moderada', 'Fuerte'][Math.min(4, [
                            pwdForm.new_password.length >= 8,
                            /[A-Z]/.test(pwdForm.new_password),
                            /[0-9]/.test(pwdForm.new_password),
                            /[^A-Za-z0-9]/.test(pwdForm.new_password),
                          ].filter(Boolean).length)]}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Security tips */}
                  <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <i className="fas fa-lightbulb text-blue-500"></i>
                      <h4 className="text-sm font-semibold text-blue-800">Consejos de seguridad</h4>
                    </div>
                    <ul className="space-y-1.5 text-xs text-blue-700">
                      <li className="flex items-start gap-2"><i className="fas fa-check-circle text-blue-400 mt-0.5"></i>Usa al menos 8 caracteres</li>
                      <li className="flex items-start gap-2"><i className="fas fa-check-circle text-blue-400 mt-0.5"></i>Combina letras mayúsculas, minúsculas y números</li>
                      <li className="flex items-start gap-2"><i className="fas fa-check-circle text-blue-400 mt-0.5"></i>Incluye caracteres especiales (!@#$%)</li>
                      <li className="flex items-start gap-2"><i className="fas fa-check-circle text-blue-400 mt-0.5"></i>No uses la misma contraseña en otros servicios</li>
                    </ul>
                  </div>
                </div>
              )}

              {/* === TAB: ACTIVIDAD === */}
              {activeTab === 'activity' && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                      <i className="fas fa-history text-teal-600 text-sm"></i>
                    </div>
                    <h3 className="font-semibold text-gray-800">Historial de Actividad Reciente</h3>
                  </div>
                  {activities.length === 0 ? (
                    <div className="px-5 py-12 text-center">
                      <i className="fas fa-history text-3xl text-gray-300 mb-3"></i>
                      <p className="text-gray-500 text-sm">No hay actividad registrada aún.</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-50">
                      {activities.map((act: any, idx: number) => (
                        <div key={act.id || idx} className="px-5 py-3 flex items-start gap-3 hover:bg-gray-50">
                          <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <i className="fas fa-circle-dot text-blue-400 text-xs"></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700">{act.description || act.action}</p>
                            {act.ip_address && <p className="text-xs text-gray-400 mt-0.5">IP: {act.ip_address}</p>}
                          </div>
                          <span className="text-xs text-gray-400 whitespace-nowrap">
                            {act.created_at ? new Date(act.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' }) : ''}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-400">
            {userData && `ID: #${userData.id} · ${userData.email}`}
          </p>
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
              Cerrar
            </button>
            {activeTab === 'info' && (
              <button
                onClick={handleSaveInfo}
                disabled={saving}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all shadow-sm flex items-center gap-2 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)' }}
              >
                {saving ? <><i className="fas fa-spinner fa-spin"></i> Guardando...</> : <><i className="fas fa-save"></i> Guardar Cambios</>}
              </button>
            )}
            {activeTab === 'security' && (
              <button
                onClick={handleChangePassword}
                disabled={savingPwd || !pwdForm.old_password || !pwdForm.new_password || !pwdForm.confirm_password}
                className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all shadow-sm flex items-center gap-2 disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #ea580c, #c2410c)' }}
              >
                {savingPwd ? <><i className="fas fa-spinner fa-spin"></i> Cambiando...</> : <><i className="fas fa-key"></i> Cambiar Contraseña</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

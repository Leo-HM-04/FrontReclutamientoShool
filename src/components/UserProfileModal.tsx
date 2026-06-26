'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { apiClient } from '@/lib/api';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated?: (user: any) => void;
}

interface UserData {
  id: string | number;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  role: string;
  role_display?: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

const ROLE_META: Record<string, { label: string; gradient: string; icon: string }> = {
  admin: { label: 'Administrador', gradient: 'from-red-500 to-rose-600', icon: 'fa-crown' },
  director: { label: 'Director', gradient: 'from-blue-500 to-indigo-600', icon: 'fa-compass' },
  supervisor: { label: 'Supervisor', gradient: 'from-violet-500 to-purple-600', icon: 'fa-user-tie' },
};

const ACTION_ICONS: Record<string, { icon: string; color: string }> = {
  login: { icon: 'fa-right-to-bracket', color: 'text-green-500 bg-green-50' },
  logout: { icon: 'fa-right-from-bracket', color: 'text-gray-500 bg-gray-50' },
  change_password: { icon: 'fa-key', color: 'text-orange-500 bg-orange-50' },
  create: { icon: 'fa-plus', color: 'text-blue-500 bg-blue-50' },
  update: { icon: 'fa-pen', color: 'text-indigo-500 bg-indigo-50' },
  delete: { icon: 'fa-trash', color: 'text-red-500 bg-red-50' },
  default: { icon: 'fa-circle-dot', color: 'text-slate-400 bg-slate-50' },
};

function getActionMeta(action: string) {
  const key = Object.keys(ACTION_ICONS).find(k => action?.toLowerCase().includes(k));
  return ACTION_ICONS[key || 'default'];
}

export default function UserProfileModal({ isOpen, onClose, onUserUpdated }: UserProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'security' | 'activity'>('info');
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [activitiesLoading, setActivitiesLoading] = useState(false);
  const [closing, setClosing] = useState(false);

  // Form state
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '' });
  const [pwdForm, setPwdForm] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [showPwd, setShowPwd] = useState({ old: false, new: false, confirm: false });

  // Track if form has unsaved changes
  const formDirty = useMemo(() => {
    if (!userData) return false;
    return form.first_name !== (userData.first_name || '') ||
      form.last_name !== (userData.last_name || '') ||
      form.phone !== (userData.phone || '');
  }, [form, userData]);

  // Password strength calculation
  const pwdStrength = useMemo(() => {
    const p = pwdForm.new_password;
    if (!p) return { score: 0, label: '', checks: [] as boolean[] };
    const checks = [p.length >= 8, /[A-Z]/.test(p), /[0-9]/.test(p), /[^A-Za-z0-9]/.test(p)];
    const score = checks.filter(Boolean).length;
    const labels = ['', 'Muy débil', 'Débil', 'Buena', 'Excelente'];
    return { score, label: labels[score], checks };
  }, [pwdForm.new_password]);

  const loadUser = useCallback(async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const data = await apiClient.getCurrentUser() as UserData;
      setUserData(data);
      setForm({ first_name: data.first_name || '', last_name: data.last_name || '', phone: data.phone || '' });
    } catch {
      setFeedback({ type: 'error', text: 'No se pudo cargar la información del usuario.' });
    } finally {
      setLoading(false);
    }
  }, []);

  const loadActivities = useCallback(async () => {
    if (!userData) return;
    setActivitiesLoading(true);
    try {
      const data = await apiClient.getUserActivityById(userData.id);
      setActivities(Array.isArray(data) ? data.slice(0, 20) : []);
    } catch {
      setActivities([]);
    } finally {
      setActivitiesLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    if (isOpen) {
      setClosing(false);
      loadUser();
      setActiveTab('info');
      setFeedback(null);
      setPwdForm({ old_password: '', new_password: '', confirm_password: '' });
      setShowPwd({ old: false, new: false, confirm: false });
    }
  }, [isOpen, loadUser]);

  useEffect(() => {
    if (activeTab === 'activity' && userData && activities.length === 0) {
      loadActivities();
    }
  }, [activeTab, userData, loadActivities, activities.length]);

  // Keyboard: Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const handleClose = () => {
    setClosing(true);
    setTimeout(onClose, 200);
  };

  const handleSaveInfo = async () => {
    if (!userData) return;
    setSaving(true);
    setFeedback(null);
    try {
      const updated = await apiClient.updateUser(userData.id, {
        first_name: form.first_name,
        last_name: form.last_name,
        phone: form.phone,
      });
      setUserData(prev => prev ? { ...prev, ...updated } : prev);
      setFeedback({ type: 'success', text: 'Perfil actualizado correctamente' });
      onUserUpdated?.(updated);
    } catch {
      setFeedback({ type: 'error', text: 'Error al guardar cambios. Intenta de nuevo.' });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (pwdForm.new_password !== pwdForm.confirm_password) {
      setFeedback({ type: 'error', text: 'Las contraseñas nuevas no coinciden.' });
      return;
    }
    if (pwdForm.new_password.length < 8) {
      setFeedback({ type: 'error', text: 'La contraseña debe tener al menos 8 caracteres.' });
      return;
    }
    setSavingPwd(true);
    setFeedback(null);
    try {
      await apiClient.changePassword(pwdForm.old_password, pwdForm.new_password);
      setFeedback({ type: 'success', text: 'Contraseña actualizada correctamente' });
      setPwdForm({ old_password: '', new_password: '', confirm_password: '' });
    } catch (e: any) {
      const msg = e?.details?.old_password?.[0] || e?.details?.new_password?.[0] || e?.message || 'Error al cambiar la contraseña.';
      setFeedback({ type: 'error', text: msg });
    } finally {
      setSavingPwd(false);
    }
  };

  const getInitials = (user: UserData) =>
    `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U';

  const formatDate = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }); }
    catch { return dateStr; }
  };

  const timeAgo = (dateStr: string) => {
    try {
      const diff = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(diff / 60000);
      if (mins < 1) return 'Justo ahora';
      if (mins < 60) return `Hace ${mins} min`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `Hace ${hours}h`;
      const days = Math.floor(hours / 24);
      if (days < 30) return `Hace ${days}d`;
      return formatDate(dateStr);
    } catch { return dateStr; }
  };

  if (!isOpen) return null;

  const roleMeta = ROLE_META[userData?.role || ''] || ROLE_META.supervisor;

  const tabs = [
    { id: 'info' as const, label: 'Información', icon: 'fa-user-pen', desc: 'Datos personales' },
    { id: 'security' as const, label: 'Seguridad', icon: 'fa-shield-halved', desc: 'Contraseña' },
    { id: 'activity' as const, label: 'Actividad', icon: 'fa-clock-rotate-left', desc: 'Historial' },
  ];

  const modal = (
    <div
      className={`fixed inset-0 flex items-center justify-center p-3 sm:p-4 transition-all duration-300 ${closing ? 'opacity-0' : 'opacity-100'}`}
      style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      onClick={handleClose}
    >
      <div
        className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex overflow-hidden transition-all duration-300 ${closing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
        style={{ width: '95vw', maxWidth: '940px', height: '92vh', maxHeight: '720px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ====== LEFT SIDEBAR ====== */}
        <div className="hidden md:flex flex-col w-[260px] flex-shrink-0 relative overflow-hidden">
          {/* Gradient background */}
          <div className={`absolute inset-0 bg-gradient-to-br ${roleMeta.gradient} opacity-95`}></div>
          <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.15) 0%, transparent 50%)' }}></div>

          <div className="relative flex flex-col h-full p-5">
            {/* Close (sidebar) */}
            <button onClick={handleClose} className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/10 hover:bg-white/25 transition-colors flex items-center justify-center">
              <i className="fas fa-times text-white/80 text-xs"></i>
            </button>

            {/* Avatar area */}
            <div className="flex flex-col items-center mt-3 mb-6">
              <div className="relative group">
                <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center border-2 border-white/30 shadow-lg transition-transform group-hover:scale-105">
                  <span className="text-white text-2xl font-bold tracking-wide">
                    {userData ? getInitials(userData) : '?'}
                  </span>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-white flex items-center justify-center shadow-md">
                  <i className={`fas ${roleMeta.icon} text-xs bg-gradient-to-br ${roleMeta.gradient} bg-clip-text`} style={{ WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}></i>
                </div>
              </div>
              <h2 className="text-white font-bold text-center mt-3 text-lg leading-tight">
                {userData ? `${userData.first_name} ${userData.last_name}`.trim() || 'Sin nombre' : '...'}
              </h2>
              <p className="text-white/60 text-xs mt-0.5 truncate max-w-full">{userData?.email}</p>
              <span className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-sm text-white/90 text-xs font-medium border border-white/20">
                <i className={`fas ${roleMeta.icon} text-[10px]`}></i>
                {roleMeta.label}
              </span>
            </div>

            {/* Quick stats */}
            {userData && (
              <div className="space-y-2 mb-auto">
                {[
                  { label: 'Miembro desde', value: formatDate(userData.created_at), icon: 'fa-calendar-check' },
                  { label: 'Última actualización', value: timeAgo(userData.updated_at), icon: 'fa-clock' },
                  { label: 'Estado de cuenta', value: userData.is_active ? 'Activa' : 'Inactiva', icon: userData.is_active ? 'fa-circle-check' : 'fa-circle-xmark' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5 px-3 py-2 rounded-xl hover:bg-white/10 transition-colors" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    <i className={`fas ${item.icon} text-white/50 text-xs mt-1`}></i>
                    <div>
                      <p className="text-white/45 text-[10px] uppercase tracking-wider font-medium">{item.label}</p>
                      <p className="text-white/90 text-xs font-medium">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Sidebar tabs */}
            <div className="space-y-1 mt-4 pt-4 border-t border-white/15">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setFeedback(null); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    activeTab === tab.id
                      ? 'bg-white text-gray-800 shadow-lg shadow-black/10'
                      : 'text-white/70 hover:bg-white/12 hover:text-white'
                  }`}
                  style={activeTab !== tab.id ? { backgroundColor: 'transparent' } : {}}
                  onMouseEnter={(e) => { if (activeTab !== tab.id) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.12)'; }}
                  onMouseLeave={(e) => { if (activeTab !== tab.id) e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <i className={`fas ${tab.icon} text-sm w-4 text-center ${activeTab === tab.id ? 'text-blue-600' : ''}`}></i>
                  <div>
                    <p className="text-sm font-medium leading-tight">{tab.label}</p>
                    <p className={`text-[10px] ${activeTab === tab.id ? 'text-gray-500' : 'text-white/40'}`}>{tab.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ====== MAIN CONTENT ====== */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile header */}
          <div className="md:hidden flex-shrink-0 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="text-white text-sm font-bold">{userData ? getInitials(userData) : '?'}</span>
              </div>
              <div>
                <h2 className="text-white font-semibold text-sm">{userData ? `${userData.first_name} ${userData.last_name}`.trim() : 'Mi Perfil'}</h2>
                <p className="text-blue-200 text-xs">{userData?.email}</p>
              </div>
            </div>
            <button onClick={handleClose} className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
              <i className="fas fa-times text-white text-sm"></i>
            </button>
          </div>

          {/* Mobile tabs */}
          <div className="md:hidden flex-shrink-0 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 px-4 py-2 flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setFeedback(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeTab === tab.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                <i className={`fas ${tab.icon}`}></i>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content header */}
          <div className="flex-shrink-0 px-6 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {activeTab === 'info' && 'Información Personal'}
                  {activeTab === 'security' && 'Seguridad de la Cuenta'}
                  {activeTab === 'activity' && 'Historial de Actividad'}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {activeTab === 'info' && 'Actualiza tu nombre, teléfono y revisa los datos de tu cuenta.'}
                  {activeTab === 'security' && 'Gestiona tu contraseña para proteger tu cuenta.'}
                  {activeTab === 'activity' && 'Revisa las acciones recientes realizadas con tu cuenta.'}
                </p>
              </div>
              {/* Desktop close */}
              <button onClick={handleClose} className="hidden md:flex w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors items-center justify-center">
                <i className="fas fa-times text-gray-500 dark:text-gray-400 text-sm"></i>
              </button>
            </div>
          </div>

          {/* Feedback toast */}
          {feedback && (
            <div className="mx-6 mb-2">
              <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-medium ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                  : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
              }`}>
                <i className={`fas ${feedback.type === 'success' ? 'fa-circle-check' : 'fa-circle-exclamation'} text-sm`}></i>
                <span className="flex-1">{feedback.text}</span>
                <button onClick={() => setFeedback(null)} className="opacity-50 hover:opacity-100 transition-opacity">
                  <i className="fas fa-times text-xs"></i>
                </button>
              </div>
            </div>
          )}

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="relative w-12 h-12">
                  <div className="absolute inset-0 rounded-full border-[3px] border-gray-200 dark:border-slate-700"></div>
                  <div className="absolute inset-0 rounded-full border-[3px] border-blue-500 border-t-transparent animate-spin"></div>
                </div>
                <p className="text-gray-400 text-sm">Cargando perfil...</p>
              </div>
            ) : (
              <>
                {/* ─── INFORMACIÓN ─── */}
                {activeTab === 'info' && userData && (
                  <div className="space-y-5 mt-2">
                    {/* Form grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-4">
                      {/* First name */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Nombre(s)</label>
                        <div className="relative">
                          <i className="fas fa-user absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                          <input
                            type="text"
                            value={form.first_name}
                            onChange={(e) => setForm(f => ({ ...f, first_name: e.target.value }))}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            placeholder="Tu nombre"
                          />
                        </div>
                      </div>
                      {/* Last name */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Apellido(s)</label>
                        <div className="relative">
                          <i className="fas fa-user absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                          <input
                            type="text"
                            value={form.last_name}
                            onChange={(e) => setForm(f => ({ ...f, last_name: e.target.value }))}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            placeholder="Tu apellido"
                          />
                        </div>
                      </div>
                      {/* Email (read-only) */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Correo Electrónico</label>
                        <div className="relative">
                          <i className="fas fa-envelope absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-xs"></i>
                          <input
                            type="email"
                            value={userData.email}
                            disabled
                            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 text-gray-400 text-sm cursor-not-allowed"
                          />
                          <i className="fas fa-lock absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 text-[10px]"></i>
                        </div>
                      </div>
                      {/* Phone */}
                      <div className="space-y-1.5">
                        <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Teléfono</label>
                        <div className="relative">
                          <i className="fas fa-phone absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                          <input
                            type="tel"
                            value={form.phone}
                            onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                            placeholder="+52 55 1234 5678"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Account details card */}
                    <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-gray-100 dark:border-slate-700">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Detalles de la cuenta</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-100 dark:border-slate-700">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br ${roleMeta.gradient}`}>
                            <i className={`fas ${roleMeta.icon} text-white text-sm`}></i>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Rol</p>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{roleMeta.label}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-100 dark:border-slate-700">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-emerald-500 to-teal-600">
                            <i className={`fas ${userData.is_active ? 'fa-circle-check' : 'fa-circle-xmark'} text-white text-sm`}></i>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">Estado</p>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{userData.is_active ? 'Activa' : 'Inactiva'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-100 dark:border-slate-700">
                          <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gradient-to-br from-amber-500 to-orange-600">
                            <i className="fas fa-fingerprint text-white text-sm"></i>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">ID</p>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">#{userData.id}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── SEGURIDAD ─── */}
                {activeTab === 'security' && (
                  <div className="space-y-5 mt-2 max-w-lg">
                    <div className="space-y-4">
                      {[
                        { field: 'old_password' as const, label: 'Contraseña actual', showKey: 'old' as const, icon: 'fa-lock' },
                        { field: 'new_password' as const, label: 'Nueva contraseña', showKey: 'new' as const, icon: 'fa-key' },
                        { field: 'confirm_password' as const, label: 'Confirmar nueva contraseña', showKey: 'confirm' as const, icon: 'fa-check-double' },
                      ].map(({ field, label, showKey, icon }) => (
                        <div key={field} className="space-y-1.5">
                          <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</label>
                          <div className="relative">
                            <i className={`fas ${icon} absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs`}></i>
                            <input
                              type={showPwd[showKey] ? 'text' : 'password'}
                              value={pwdForm[field]}
                              onChange={(e) => setPwdForm(f => ({ ...f, [field]: e.target.value }))}
                              className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                              placeholder="••••••••"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPwd(s => ({ ...s, [showKey]: !s[showKey] }))}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              <i className={`fas ${showPwd[showKey] ? 'fa-eye-slash' : 'fa-eye'} text-xs`}></i>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Password strength meter */}
                    {pwdForm.new_password && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="flex gap-1 flex-1">
                            {[1, 2, 3, 4].map(i => (
                              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                i <= pwdStrength.score
                                  ? ['' , 'bg-red-400', 'bg-orange-400', 'bg-blue-400', 'bg-emerald-500'][pwdStrength.score]
                                  : 'bg-gray-100 dark:bg-slate-700'
                              }`}></div>
                            ))}
                          </div>
                          <span className={`text-xs font-semibold ${
                            ['', 'text-red-500', 'text-orange-500', 'text-blue-500', 'text-emerald-600'][pwdStrength.score]
                          }`}>{pwdStrength.label}</span>
                        </div>
                        {/* Requirements checklist */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                          {[
                            { label: 'Mínimo 8 caracteres', met: pwdStrength.checks[0] },
                            { label: 'Una mayúscula', met: pwdStrength.checks[1] },
                            { label: 'Un número', met: pwdStrength.checks[2] },
                            { label: 'Un carácter especial', met: pwdStrength.checks[3] },
                          ].map((c, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <i className={`fas ${c.met ? 'fa-circle-check text-emerald-500' : 'fa-circle text-gray-300 dark:text-slate-600'} text-xs transition-colors`}></i>
                              <span className={`text-xs ${c.met ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400'}`}>{c.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Match indicator */}
                    {pwdForm.confirm_password && (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium ${
                        pwdForm.new_password === pwdForm.confirm_password
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800'
                          : 'bg-red-50 text-red-600 border border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                      }`}>
                        <i className={`fas ${pwdForm.new_password === pwdForm.confirm_password ? 'fa-circle-check' : 'fa-circle-xmark'}`}></i>
                        {pwdForm.new_password === pwdForm.confirm_password ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}
                      </div>
                    )}

                    {/* Security tips card */}
                    <div className="bg-blue-50/50 dark:bg-blue-900/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-800/50 mt-2">
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="w-6 h-6 rounded-lg bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                          <i className="fas fa-lightbulb text-blue-500 text-xs"></i>
                        </div>
                        <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300 uppercase tracking-wider">Consejos de seguridad</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {[
                          'No reutilices contraseñas anteriores',
                          'Combina mayúsculas, números y símbolos',
                          'Evita datos personales como tu nombre',
                          'Cámbiala periódicamente',
                        ].map((tip, i) => (
                          <p key={i} className="text-xs text-blue-700/80 dark:text-blue-400/80 flex items-start gap-1.5">
                            <i className="fas fa-arrow-right text-blue-400 dark:text-blue-500 text-[9px] mt-1 flex-shrink-0"></i>
                            {tip}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── ACTIVIDAD ─── */}
                {activeTab === 'activity' && (
                  <div className="mt-2">
                    {activitiesLoading ? (
                      <div className="flex flex-col items-center py-16 gap-3">
                        <div className="relative w-10 h-10">
                          <div className="absolute inset-0 rounded-full border-[3px] border-gray-200 dark:border-slate-700"></div>
                          <div className="absolute inset-0 rounded-full border-[3px] border-blue-500 border-t-transparent animate-spin"></div>
                        </div>
                        <p className="text-gray-400 text-sm">Cargando actividad...</p>
                      </div>
                    ) : activities.length === 0 ? (
                      <div className="flex flex-col items-center py-16 gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                          <i className="fas fa-clock-rotate-left text-gray-300 dark:text-slate-600 text-xl"></i>
                        </div>
                        <p className="text-gray-400 text-sm">No hay actividad registrada aún</p>
                      </div>
                    ) : (
                      <div className="relative">
                        {/* Timeline line */}
                        <div className="absolute left-[18px] top-3 bottom-3 w-px bg-gray-100 dark:bg-slate-700"></div>

                        <div className="space-y-1">
                          {activities.map((act: any, idx: number) => {
                            const meta = getActionMeta(act.action || act.description || '');
                            return (
                              <div key={act.id || idx} className="relative flex items-start gap-3 py-2.5 pl-1 pr-2 rounded-xl hover:bg-gray-50/80 dark:hover:bg-slate-800/50 transition-colors group">
                                {/* Timeline dot */}
                                <div className={`relative z-10 w-[28px] h-[28px] rounded-lg ${meta.color} flex items-center justify-center flex-shrink-0 border border-white dark:border-slate-900 shadow-sm`}>
                                  <i className={`fas ${meta.icon} text-[11px]`}></i>
                                </div>
                                <div className="flex-1 min-w-0 pt-0.5">
                                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{act.description || act.action}</p>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[11px] text-gray-400">
                                      {act.timestamp ? timeAgo(act.timestamp) : act.created_at ? timeAgo(act.created_at) : ''}
                                    </span>
                                    {act.ip_address && (
                                      <span className="text-[11px] text-gray-300 dark:text-gray-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <i className="fas fa-globe text-[9px]"></i> {act.ip_address}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ====== FOOTER ====== */}
          <div className="flex-shrink-0 px-6 py-3.5 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700 flex items-center justify-end gap-3">
            <button onClick={handleClose} className="px-4 py-2 rounded-xl text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors font-medium">
              Cerrar
            </button>
            {activeTab === 'info' && (
              <button
                onClick={handleSaveInfo}
                disabled={saving || !formDirty}
                className={`px-5 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2 transition-all shadow-sm ${
                  formDirty ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-md hover:shadow-blue-500/25' : 'bg-gray-300 dark:bg-slate-600 cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Guardando...</>
                ) : (
                  <><i className="fas fa-check"></i> Guardar Cambios</>
                )}
              </button>
            )}
            {activeTab === 'security' && (
              <button
                onClick={handleChangePassword}
                disabled={savingPwd || !pwdForm.old_password || !pwdForm.new_password || !pwdForm.confirm_password || pwdForm.new_password !== pwdForm.confirm_password}
                className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-red-500 flex items-center gap-2 transition-all shadow-sm hover:shadow-md hover:shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-none"
              >
                {savingPwd ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Cambiando...</>
                ) : (
                  <><i className="fas fa-key"></i> Cambiar Contraseña</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

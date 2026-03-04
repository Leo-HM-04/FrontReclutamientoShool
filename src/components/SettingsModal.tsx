'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTheme, ThemeMode } from '@/context/ThemeContext';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type NotifPrefs = {
  email_new_candidates: boolean;
  email_profile_updates: boolean;
  email_reports: boolean;
  browser_notifications: boolean;
};

const NOTIF_STORAGE_KEY = 'notif_prefs';

const defaultNotifPrefs: NotifPrefs = {
  email_new_candidates: true,
  email_profile_updates: true,
  email_reports: false,
  browser_notifications: true,
};

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<'appearance' | 'notifications' | 'preferences'>('appearance');
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(defaultNotifPrefs);
  const [savedMsg, setSavedMsg] = useState(false);

  // Language & timezone (local prefs)
  const [language, setLanguage] = useState('es');
  const [timezone, setTimezone] = useState('America/Mexico_City');
  const [dateFormat, setDateFormat] = useState('dd/mm/yyyy');

  // Load persisted prefs
  useEffect(() => {
    if (!isOpen) return;
    try {
      const stored = localStorage.getItem(NOTIF_STORAGE_KEY);
      if (stored) setNotifPrefs(JSON.parse(stored));
    } catch { /* ignore */ }
    const lang = localStorage.getItem('lang_pref') || 'es';
    const tz = localStorage.getItem('tz_pref') || 'America/Mexico_City';
    const df = localStorage.getItem('date_format_pref') || 'dd/mm/yyyy';
    setLanguage(lang);
    setTimezone(tz);
    setDateFormat(df);
    setActiveSection('appearance');
    setSavedMsg(false);
  }, [isOpen]);

  const handleSaveNotifs = () => {
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(notifPrefs));
    flash();
  };

  const handleSavePrefs = () => {
    localStorage.setItem('lang_pref', language);
    localStorage.setItem('tz_pref', timezone);
    localStorage.setItem('date_format_pref', dateFormat);
    flash();
  };

  const flash = () => {
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 2000);
  };

  if (!isOpen) return null;

  const themeOptions: { value: ThemeMode; label: string; icon: string; desc: string }[] = [
    { value: 'light', label: 'Claro', icon: 'fa-sun', desc: 'Siempre tema claro' },
    { value: 'dark', label: 'Oscuro', icon: 'fa-moon', desc: 'Siempre tema oscuro' },
    { value: 'system', label: 'Sistema', icon: 'fa-desktop', desc: 'Sigue la preferencia del dispositivo' },
  ];

  const sections = [
    { id: 'appearance', label: 'Apariencia', icon: 'fa-palette' },
    { id: 'notifications', label: 'Notificaciones', icon: 'fa-bell' },
    { id: 'preferences', label: 'Preferencias', icon: 'fa-sliders-h' },
  ];

  const modal = (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{ width: '95vw', maxWidth: '800px', height: '88vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 px-6 py-5"
          style={{ background: 'linear-gradient(135deg, #1e293b 0%, #334155 50%, #475569 100%)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center border border-white/25">
                <i className="fas fa-cog text-white text-xl"></i>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Configuración</h2>
                <p className="text-slate-300 text-sm mt-0.5">Personaliza tu experiencia en la plataforma</p>
              </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 transition-colors flex items-center justify-center">
              <i className="fas fa-times text-white text-lg"></i>
            </button>
          </div>
        </div>

        {/* Body: sidebar + content */}
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar navigation */}
          <div className="w-52 flex-shrink-0 bg-gray-50 border-r border-gray-100 py-4 flex flex-col gap-1 px-2">
            {sections.map((sec) => (
              <button
                key={sec.id}
                onClick={() => setActiveSection(sec.id as any)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left ${activeSection === sec.id ? 'bg-slate-800 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'}`}
              >
                <i className={`fas ${sec.icon} w-4 text-center ${activeSection === sec.id ? 'text-slate-200' : 'text-gray-400'}`}></i>
                {sec.label}
              </button>
            ))}
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto p-6 bg-gray-50">

            {/* === APARIENCIA === */}
            {activeSection === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-gray-800 mb-1">Tema de la Interfaz</h3>
                  <p className="text-sm text-gray-500 mb-4">Selecciona cómo quieres que se vea la plataforma.</p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {themeOptions.map((opt) => {
                      const isSelected = theme === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setTheme(opt.value)}
                          className={`relative flex flex-col items-center gap-3 p-5 rounded-xl border-2 transition-all text-center ${isSelected ? 'border-slate-700 bg-slate-50 shadow-md' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'}`}
                        >
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-5 h-5 bg-slate-700 rounded-full flex items-center justify-center">
                              <i className="fas fa-check text-white text-xs"></i>
                            </div>
                          )}
                          {/* Preview */}
                          <div className={`w-16 h-10 rounded-lg border flex overflow-hidden ${opt.value === 'dark' ? 'bg-gray-900 border-gray-700' : opt.value === 'system' ? 'border-gray-300' : 'bg-white border-gray-200'}`}>
                            {opt.value === 'system' ? (
                              <>
                                <div className="w-1/2 bg-white"></div>
                                <div className="w-1/2 bg-gray-900"></div>
                              </>
                            ) : opt.value === 'dark' ? (
                              <div className="flex-1 p-1 space-y-1">
                                <div className="h-1.5 bg-gray-600 rounded w-3/4"></div>
                                <div className="h-1.5 bg-gray-700 rounded w-1/2"></div>
                              </div>
                            ) : (
                              <div className="flex-1 p-1 space-y-1">
                                <div className="h-1.5 bg-blue-400 rounded w-3/4"></div>
                                <div className="h-1.5 bg-gray-200 rounded w-1/2"></div>
                              </div>
                            )}
                          </div>
                          <i className={`fas ${opt.icon} text-lg ${isSelected ? 'text-slate-700' : 'text-gray-400'}`}></i>
                          <div>
                            <p className={`text-sm font-semibold ${isSelected ? 'text-slate-800' : 'text-gray-700'}`}>{opt.label}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Current resolved theme badge */}
                  <div className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-white rounded-lg border border-gray-200 text-sm text-gray-600 w-fit">
                    <i className={`fas ${resolvedTheme === 'dark' ? 'fa-moon text-indigo-500' : 'fa-sun text-amber-500'}`}></i>
                    Aplicando tema: <span className="font-semibold text-gray-800">{resolvedTheme === 'dark' ? 'Oscuro' : 'Claro'}</span>
                  </div>
                </div>

                {/* Accent color info */}
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <i className="fas fa-paint-brush text-blue-500"></i>
                    <h4 className="text-sm font-semibold text-gray-700">Color de Acento</h4>
                  </div>
                  <div className="flex items-center gap-3">
                    {['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444'].map(color => (
                      <div
                        key={color}
                        className="w-8 h-8 rounded-full cursor-pointer border-2 border-white shadow hover:scale-110 transition-transform"
                        style={{ backgroundColor: color, boxShadow: color === '#3b82f6' ? `0 0 0 2px ${color}` : undefined }}
                        title={color}
                      ></div>
                    ))}
                    <span className="text-xs text-gray-400 ml-2">Próximamente</span>
                  </div>
                </div>
              </div>
            )}

            {/* === NOTIFICACIONES === */}
            {activeSection === 'notifications' && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold text-gray-800 mb-1">Preferencias de Notificaciones</h3>
                  <p className="text-sm text-gray-500 mb-4">Controla qué notificaciones deseas recibir y cómo.</p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-50 shadow-sm">
                  {[
                    { key: 'email_new_candidates', label: 'Nuevos candidatos', desc: 'Aviso cuando se registren nuevos candidatos en tus perfiles', icon: 'fa-user-plus', color: 'text-blue-500' },
                    { key: 'email_profile_updates', label: 'Actualizaciones de perfiles', desc: 'Cambios de estado en perfiles de reclutamiento', icon: 'fa-briefcase', color: 'text-purple-500' },
                    { key: 'email_reports', label: 'Reportes semanales', desc: 'Resumen semanal de actividad del sistema por email', icon: 'fa-chart-bar', color: 'text-green-500' },
                    { key: 'browser_notifications', label: 'Notificaciones del navegador', desc: 'Alertas en tiempo real en el navegador', icon: 'fa-bell', color: 'text-orange-500' },
                  ].map(({ key, label, desc, icon, color }) => (
                    <div key={key} className="px-5 py-4 flex items-center justify-between gap-4">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <i className={`fas ${icon} ${color} text-sm`}></i>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{label}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => setNotifPrefs(p => ({ ...p, [key]: !p[key as keyof NotifPrefs] }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors flex-shrink-0 ${notifPrefs[key as keyof NotifPrefs] ? 'bg-blue-600' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${notifPrefs[key as keyof NotifPrefs] ? 'translate-x-6' : 'translate-x-1'}`}></span>
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end">
                  <button onClick={handleSaveNotifs} className="px-5 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-2 transition-all shadow-sm" style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                    <i className="fas fa-save"></i> Guardar preferencias
                  </button>
                </div>
              </div>
            )}

            {/* === PREFERENCIAS === */}
            {activeSection === 'preferences' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-base font-semibold text-gray-800 mb-1">Preferencias Regionales</h3>
                  <p className="text-sm text-gray-500 mb-4">Ajusta el idioma, zona horaria y formato de fechas.</p>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Idioma</label>
                    <select
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    >
                      <option value="es">Español (México)</option>
                      <option value="en">English (US)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Zona Horaria</label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    >
                      <option value="America/Mexico_City">Ciudad de México (UTC-6)</option>
                      <option value="America/Monterrey">Monterrey (UTC-6)</option>
                      <option value="America/Cancun">Cancún (UTC-5)</option>
                      <option value="America/Tijuana">Tijuana (UTC-8)</option>
                      <option value="America/New_York">Nueva York (UTC-5)</option>
                      <option value="America/Los_Angeles">Los Ángeles (UTC-8)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Formato de Fecha</label>
                    <select
                      value={dateFormat}
                      onChange={(e) => setDateFormat(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                    >
                      <option value="dd/mm/yyyy">DD/MM/YYYY (31/12/2025)</option>
                      <option value="mm/dd/yyyy">MM/DD/YYYY (12/31/2025)</option>
                      <option value="yyyy-mm-dd">YYYY-MM-DD (2025-12-31)</option>
                    </select>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button onClick={handleSavePrefs} className="px-5 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-2 transition-all shadow-sm" style={{ background: 'linear-gradient(135deg, #1e293b, #334155)' }}>
                      <i className="fas fa-save"></i> Guardar preferencias
                    </button>
                  </div>
                </div>

                {/* App info */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <i className="fas fa-info-circle text-slate-400"></i>
                    <h4 className="text-sm font-semibold text-gray-700">Información del Sistema</h4>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Versión</p>
                      <p className="font-medium text-gray-700">1.0.0</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-400 mb-1">Plataforma</p>
                      <p className="font-medium text-gray-700">Bausen RH</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-3 bg-white border-t border-gray-100 flex items-center justify-between">
          {savedMsg ? (
            <span className="flex items-center gap-2 text-sm text-green-600 font-medium">
              <i className="fas fa-check-circle"></i> Guardado correctamente
            </span>
          ) : (
            <span className="text-xs text-gray-400">Los cambios de apariencia se aplican de inmediato</span>
          )}
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

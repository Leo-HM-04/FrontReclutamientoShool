'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTheme, ThemeMode } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';

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
const PREFS_STORAGE_KEY = 'user_prefs';

const defaultNotifPrefs: NotifPrefs = {
  email_new_candidates: true,
  email_profile_updates: true,
  email_reports: false,
  browser_notifications: true,
};

interface UserPrefs {
  language: string;
  timezone: string;
  dateFormat: string;
}

const defaultPrefs: UserPrefs = {
  language: 'es',
  timezone: 'America/Mexico_City',
  dateFormat: 'DD/MM/YYYY',
};

// Notification config descriptors — labels/descs are i18n keys resolved at render time
const NOTIF_CONFIG: { key: keyof NotifPrefs; labelKey: string; descKey: string; icon: string; iconColor: string }[] = [
  { key: 'email_new_candidates', labelKey: 'notif.newCandidates', descKey: 'notif.newCandidatesDesc', icon: 'fa-user-plus', iconColor: 'text-blue-500 bg-blue-50 dark:bg-blue-900/30' },
  { key: 'email_profile_updates', labelKey: 'notif.profileUpdates', descKey: 'notif.profileUpdatesDesc', icon: 'fa-pen-to-square', iconColor: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' },
  { key: 'email_reports', labelKey: 'notif.weeklyReports', descKey: 'notif.weeklyReportsDesc', icon: 'fa-chart-bar', iconColor: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-900/30' },
  { key: 'browser_notifications', labelKey: 'notif.browserNotif', descKey: 'notif.browserNotifDesc', icon: 'fa-bell', iconColor: 'text-amber-500 bg-amber-50 dark:bg-amber-900/30' },
];

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { t, language, setLanguage } = useLanguage();
  const [activeSection, setActiveSection] = useState<'appearance' | 'notifications' | 'preferences'>('appearance');
  const [closing, setClosing] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>(defaultNotifPrefs);
  const [prefs, setPrefs] = useState<UserPrefs>(defaultPrefs);
  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  // Load saved preferences
  useEffect(() => {
    if (isOpen) {
      setClosing(false);
      setActiveSection('appearance');
      setSavedFeedback(null);
      try {
        const saved = localStorage.getItem(NOTIF_STORAGE_KEY);
        if (saved) setNotifPrefs(JSON.parse(saved));
      } catch { /* ignore */ }
      try {
        const saved = localStorage.getItem(PREFS_STORAGE_KEY);
        if (saved) setPrefs(JSON.parse(saved));
      } catch { /* ignore */ }
    }
  }, [isOpen]);

  // Escape to close
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') handleClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(onClose, 200);
  }, [onClose]);

  const handleNotifToggle = (key: keyof NotifPrefs) => {
    setNotifPrefs(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    showSavedFlash();
  };

  const handlePrefChange = (key: keyof UserPrefs, value: string) => {
    setPrefs(prev => {
      const updated = { ...prev, [key]: value };
      localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    // When language changes, propagate to the LanguageContext so the whole app re-renders
    if (key === 'language' && (value === 'es' || value === 'en')) {
      setLanguage(value);
    }
    showSavedFlash();
  };

  const showSavedFlash = () => {
    setSavedFeedback(t('settings.saved'));
    setTimeout(() => setSavedFeedback(null), 1500);
  };

  if (!isOpen) return null;

  const sections = [
    { id: 'appearance' as const, label: t('settings.appearance'), icon: 'fa-palette', desc: t('settings.appearanceDesc') },
    { id: 'notifications' as const, label: t('settings.notifications'), icon: 'fa-bell', desc: t('settings.notificationsDesc') },
    { id: 'preferences' as const, label: t('settings.preferences'), icon: 'fa-sliders', desc: t('settings.preferencesDesc') },
  ];

  const themeOptions: { mode: ThemeMode; label: string; desc: string; icon: string; gradient: string }[] = [
    { mode: 'light', label: t('appearance.light'), desc: t('appearance.lightDesc'), icon: 'fa-sun', gradient: 'from-amber-400 to-orange-500' },
    { mode: 'dark', label: t('appearance.dark'), desc: t('appearance.darkDesc'), icon: 'fa-moon', gradient: 'from-indigo-500 to-purple-600' },
    { mode: 'system', label: t('appearance.system'), desc: t('appearance.systemDesc'), icon: 'fa-laptop', gradient: 'from-slate-400 to-slate-600' },
  ];

  const modal = (
    <div
      className={`fixed inset-0 flex items-center justify-center p-3 sm:p-4 transition-all duration-300 ${closing ? 'opacity-0' : 'opacity-100'}`}
      style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
      onClick={handleClose}
    >
      <div
        className={`bg-white dark:bg-slate-900 rounded-2xl shadow-2xl flex overflow-hidden transition-all duration-300 ${closing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}
        style={{ width: '95vw', maxWidth: '880px', height: '92vh', maxHeight: '680px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ====== LEFT SIDEBAR ====== */}
        <div className="hidden md:flex flex-col w-[240px] flex-shrink-0 bg-gray-50 dark:bg-slate-800/50 border-r border-gray-100 dark:border-slate-700">
          <div className="p-5">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <i className="fas fa-gear text-white text-lg"></i>
              </div>
              <div>
                <h2 className="text-base font-bold text-gray-900 dark:text-white">{t('settings.title')}</h2>
                <p className="text-[11px] text-gray-400">{t('settings.personalizeSubtitle')}</p>
              </div>
            </div>

            {/* Navigation */}
            <div className="space-y-1">
              {sections.map(sec => (
                <button
                  key={sec.id}
                  onClick={() => { setActiveSection(sec.id); setSavedFeedback(null); }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    activeSection === sec.id
                      ? 'bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-slate-700 text-gray-900 dark:text-white'
                      : 'text-gray-500 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    activeSection === sec.id ? 'bg-blue-50 dark:bg-blue-900/40' : 'bg-gray-100 dark:bg-slate-700'
                  }`}>
                    <i className={`fas ${sec.icon} text-xs ${activeSection === sec.id ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`}></i>
                  </div>
                  <div>
                    <p className="text-sm font-medium leading-tight">{sec.label}</p>
                    <p className={`text-[10px] ${activeSection === sec.id ? 'text-gray-400' : 'text-gray-400/60'}`}>{sec.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Sidebar footer */}
          <div className="mt-auto p-5 border-t border-gray-100 dark:border-slate-700">
            <div className="flex items-center gap-2 text-gray-400 text-[11px]">
              <i className="fas fa-circle-info text-[10px]"></i>
              <span>{t('settings.autoSave')}</span>
            </div>
          </div>
        </div>

        {/* ====== MAIN CONTENT ====== */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile header */}
          <div className="md:hidden flex-shrink-0 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <i className="fas fa-gear text-white text-sm"></i>
              </div>
              <h2 className="text-white font-semibold text-sm">{t('settings.title')}</h2>
            </div>
            <button onClick={handleClose} className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
              <i className="fas fa-times text-white text-sm"></i>
            </button>
          </div>

          {/* Mobile tabs */}
          <div className="md:hidden flex-shrink-0 bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-700 px-4 py-2 flex gap-1">
            {sections.map(sec => (
              <button
                key={sec.id}
                onClick={() => { setActiveSection(sec.id); setSavedFeedback(null); }}
                className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeSection === sec.id ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800'
                }`}
              >
                <i className={`fas ${sec.icon}`}></i>
                {sec.label}
              </button>
            ))}
          </div>

          {/* Content header */}
          <div className="flex-shrink-0 px-6 pt-5 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {activeSection === 'appearance' && t('settings.appearance')}
                  {activeSection === 'notifications' && t('settings.notifications')}
                  {activeSection === 'preferences' && t('prefs.title')}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  {activeSection === 'appearance' && (language === 'en' ? 'Choose how the interface looks.' : 'Elige cómo se ve la interfaz del sistema.')}
                  {activeSection === 'notifications' && (language === 'en' ? 'Control when and how you receive alerts.' : 'Controla cuándo y cómo recibes alertas.')}
                  {activeSection === 'preferences' && t('prefs.subtitle')}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Flash save feedback */}
                {savedFeedback && (
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
                    <i className="fas fa-circle-check text-[10px]"></i>
                    {savedFeedback}
                  </span>
                )}
                {/* Desktop close */}
                <button onClick={handleClose} className="hidden md:flex w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors items-center justify-center">
                  <i className="fas fa-times text-gray-500 dark:text-gray-400 text-sm"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
            {/* ─── APARIENCIA ─── */}
            {activeSection === 'appearance' && (
              <div className="space-y-6 mt-2">
                {/* Theme picker */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">{t('appearance.interfaceTheme')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {themeOptions.map(opt => {
                      const isActive = theme === opt.mode;
                      return (
                        <button
                          key={opt.mode}
                          onClick={() => setTheme(opt.mode)}
                          className={`group relative rounded-2xl p-4 text-left transition-all duration-200 border-2 ${
                            isActive
                              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-sm shadow-blue-500/10'
                              : 'border-gray-100 dark:border-slate-700 hover:border-gray-200 dark:hover:border-slate-600 bg-white dark:bg-slate-800'
                          }`}
                        >
                          {/* Preview mini-window */}
                          <div className={`w-full h-20 rounded-xl mb-3 overflow-hidden border ${isActive ? 'border-blue-200 dark:border-blue-800' : 'border-gray-100 dark:border-slate-600'}`}>
                            {opt.mode === 'light' && (
                              <div className="h-full bg-white p-2">
                                <div className="h-2 w-8 bg-blue-500 rounded mb-1.5"></div>
                                <div className="flex gap-1.5 h-[calc(100%-14px)]">
                                  <div className="w-5 bg-gray-100 rounded"></div>
                                  <div className="flex-1 space-y-1">
                                    <div className="h-1.5 bg-gray-200 rounded w-full"></div>
                                    <div className="h-1.5 bg-gray-100 rounded w-3/4"></div>
                                    <div className="h-1.5 bg-gray-100 rounded w-1/2"></div>
                                    <div className="flex gap-1 mt-1">
                                      <div className="h-3 w-6 bg-blue-100 rounded"></div>
                                      <div className="h-3 w-6 bg-emerald-100 rounded"></div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            {opt.mode === 'dark' && (
                              <div className="h-full bg-slate-900 p-2">
                                <div className="h-2 w-8 bg-indigo-500 rounded mb-1.5"></div>
                                <div className="flex gap-1.5 h-[calc(100%-14px)]">
                                  <div className="w-5 bg-slate-800 rounded"></div>
                                  <div className="flex-1 space-y-1">
                                    <div className="h-1.5 bg-slate-700 rounded w-full"></div>
                                    <div className="h-1.5 bg-slate-800 rounded w-3/4"></div>
                                    <div className="h-1.5 bg-slate-800 rounded w-1/2"></div>
                                    <div className="flex gap-1 mt-1">
                                      <div className="h-3 w-6 bg-indigo-900 rounded"></div>
                                      <div className="h-3 w-6 bg-emerald-900 rounded"></div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                            {opt.mode === 'system' && (
                              <div className="h-full flex">
                                <div className="w-1/2 bg-white p-1.5">
                                  <div className="h-1.5 w-5 bg-blue-500 rounded mb-1"></div>
                                  <div className="space-y-0.5">
                                    <div className="h-1 bg-gray-200 rounded"></div>
                                    <div className="h-1 bg-gray-100 rounded w-3/4"></div>
                                    <div className="h-1 bg-gray-100 rounded w-1/2"></div>
                                  </div>
                                </div>
                                <div className="w-1/2 bg-slate-900 p-1.5">
                                  <div className="h-1.5 w-5 bg-indigo-500 rounded mb-1"></div>
                                  <div className="space-y-0.5">
                                    <div className="h-1 bg-slate-700 rounded"></div>
                                    <div className="h-1 bg-slate-800 rounded w-3/4"></div>
                                    <div className="h-1 bg-slate-800 rounded w-1/2"></div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Label */}
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br ${opt.gradient} shadow-sm`}>
                              <i className={`fas ${opt.icon} text-white text-xs`}></i>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-semibold ${isActive ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>{opt.label}</p>
                              <p className="text-[10px] text-gray-400 dark:text-gray-500">{opt.desc}</p>
                            </div>
                            {/* Check indicator */}
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${
                              isActive ? 'bg-blue-500 shadow-sm shadow-blue-500/30' : 'border-2 border-gray-200 dark:border-slate-600'
                            }`}>
                              {isActive && <i className="fas fa-check text-white text-[8px]"></i>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Current theme display */}
                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-gray-100 dark:border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${
                        resolvedTheme === 'dark' ? 'from-indigo-500 to-purple-600' : 'from-amber-400 to-orange-500'
                      }`}>
                        <i className={`fas ${resolvedTheme === 'dark' ? 'fa-moon' : 'fa-sun'} text-white`}></i>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t('appearance.activeTheme')}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          {resolvedTheme === 'dark' ? t('appearance.darkMode') : t('appearance.lightMode')}
                          {theme === 'system' && ` ${t('appearance.syncedWithSystem')}`}
                        </p>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      resolvedTheme === 'dark'
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
                    }`}>
                      {resolvedTheme === 'dark' ? t('appearance.dark') : t('appearance.light')}
                    </span>
                  </div>
                </div>

                {/* Color accent preview (future feature) */}
                <div className="border border-dashed border-gray-200 dark:border-slate-700 rounded-2xl p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-slate-800 flex items-center justify-center">
                      <i className="fas fa-swatchbook text-gray-400 text-sm"></i>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{t('appearance.accentColor')}</p>
                      <p className="text-[11px] text-gray-400 dark:text-gray-500">{t('appearance.accentColorDesc')}</p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-slate-800 text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{t('appearance.comingSoon')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* ─── NOTIFICACIONES ─── */}
            {activeSection === 'notifications' && (
              <div className="space-y-3 mt-2">
                {NOTIF_CONFIG.map(notif => (
                  <div key={notif.key} className="flex items-center gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-slate-800/50 border border-gray-100 dark:border-slate-700 hover:shadow-sm transition-all">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${notif.iconColor}`}>
                      <i className={`fas ${notif.icon} text-sm`}></i>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t(notif.labelKey)}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 leading-relaxed">{t(notif.descKey)}</p>
                    </div>
                    {/* Toggle switch */}
                    <button
                      onClick={() => handleNotifToggle(notif.key)}
                      className={`relative w-12 h-7 rounded-full transition-all duration-300 flex-shrink-0 ${
                        notifPrefs[notif.key]
                          ? 'bg-blue-500 shadow-inner shadow-blue-600/20'
                          : 'bg-gray-200 dark:bg-slate-600'
                      }`}
                    >
                      <div className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-sm transition-all duration-300 flex items-center justify-center ${
                        notifPrefs[notif.key] ? 'translate-x-5' : 'translate-x-0'
                      }`}>
                        <i className={`fas ${notifPrefs[notif.key] ? 'fa-check text-blue-500' : 'fa-times text-gray-300'} text-[8px]`}></i>
                      </div>
                    </button>
                  </div>
                ))}

                {/* Summary */}
                <div className="mt-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-blue-50/50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50">
                  <i className="fas fa-info-circle text-blue-400 text-sm"></i>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {Object.values(notifPrefs).filter(Boolean).length} {t('notif.of')} {Object.values(notifPrefs).length} {t('notif.enabledCount')}
                  </p>
                </div>
              </div>
            )}

            {/* ─── PREFERENCIAS ─── */}
            {activeSection === 'preferences' && (
              <div className="space-y-5 mt-2 max-w-lg">
                {/* Language */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('prefs.interfaceLang')}</label>
                  <div className="relative">
                    <i className="fas fa-language absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"></i>
                    <select
                      value={prefs.language}
                      onChange={(e) => handlePrefChange('language', e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all appearance-none cursor-pointer"
                    >
                      <option value="es">Español (México)</option>
                      <option value="en">English (US)</option>
                    </select>
                    <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                  </div>
                </div>

                {/* Timezone */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('prefs.timezone')}</label>
                  <div className="relative">
                    <i className="fas fa-globe absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                    <select
                      value={prefs.timezone}
                      onChange={(e) => handlePrefChange('timezone', e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all appearance-none cursor-pointer"
                    >
                      <option value="America/Mexico_City">Ciudad de México (UTC-6)</option>
                      <option value="America/Cancun">Cancún (UTC-5)</option>
                      <option value="America/Tijuana">Tijuana (UTC-8)</option>
                      <option value="America/Hermosillo">Hermosillo (UTC-7)</option>
                      <option value="America/Chihuahua">Chihuahua (UTC-6)</option>
                      <option value="America/Bogota">Bogotá (UTC-5)</option>
                      <option value="America/New_York">Nueva York (UTC-5)</option>
                      <option value="America/Los_Angeles">Los Ángeles (UTC-8)</option>
                      <option value="Europe/Madrid">Madrid (UTC+1)</option>
                    </select>
                    <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                  </div>
                </div>

                {/* Date format */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('prefs.dateFormat')}</label>
                  <div className="relative">
                    <i className="fas fa-calendar absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs"></i>
                    <select
                      value={prefs.dateFormat}
                      onChange={(e) => handlePrefChange('dateFormat', e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all appearance-none cursor-pointer"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2025)</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2025)</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD (2025-12-31)</option>
                    </select>
                    <i className="fas fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none"></i>
                  </div>
                </div>

                {/* Preview card */}
                <div className="bg-gray-50 dark:bg-slate-800/50 rounded-2xl p-4 border border-gray-100 dark:border-slate-700">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">{t('prefs.preview')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-100 dark:border-slate-700">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{t('prefs.language')}</p>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mt-0.5">
                        {prefs.language === 'es' ? '🇲🇽 Español' : '🇺🇸 English'}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-100 dark:border-slate-700">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{t('prefs.timezone')}</p>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mt-0.5">
                        {prefs.timezone.split('/').pop()?.replace(/_/g, ' ')}
                      </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-gray-100 dark:border-slate-700">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{t('prefs.sampleDate')}</p>
                      <p className="text-sm font-semibold text-gray-700 dark:text-gray-200 mt-0.5">
                        {prefs.dateFormat === 'DD/MM/YYYY' ? '15/03/2025' : prefs.dateFormat === 'MM/DD/YYYY' ? '03/15/2025' : '2025-03-15'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ====== FOOTER ====== */}
          <div className="flex-shrink-0 px-6 py-3.5 bg-white dark:bg-slate-900 border-t border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <p className="text-[11px] text-gray-400 dark:text-gray-500 hidden sm:block">
              <i className="fas fa-keyboard mr-1.5"></i>{t('settings.pressEsc')} <kbd className="text-[10px] bg-gray-100 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono mx-0.5">Esc</kbd> {t('settings.toClose')}
            </p>
            <button
              onClick={handleClose}
              className="px-5 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:shadow-md hover:shadow-blue-500/25 transition-all shadow-sm flex items-center gap-2"
            >
              <i className="fas fa-check"></i> {t('settings.done')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

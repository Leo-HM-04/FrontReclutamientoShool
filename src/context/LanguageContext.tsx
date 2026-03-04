'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type Language = 'es' | 'en';

// ── Translation dictionaries ────────────────────────────────────────
const translations: Record<Language, Record<string, string>> = {
  es: {
    // ── Sidebar ──
    'sidebar.controlPanel': 'Panel de Control',
    'sidebar.dashboard': 'Dashboard',
    'sidebar.clients': 'Clientes',
    'sidebar.recruitmentProfiles': 'Perfiles de Reclutamiento',
    'sidebar.candidates': 'Candidatos',
    'sidebar.evaluations': 'Sistema de Evaluaciones',
    'sidebar.clientProgress': 'Avance de Cliente',
    'sidebar.reports': 'Reportes',
    'sidebar.profilesStatus': 'Estatus de Perfiles',
    'sidebar.candidatesStatus': 'Estatus de Candidatos',
    'sidebar.shortlisted': 'Preseleccionados',
    'sidebar.selectedCandidates': 'Candidatos Seleccionados',
    'sidebar.individualReports': 'Reportes Individuales',
    'sidebar.emailManagement': 'Gestión de Correos',

    // ── Header ──
    'header.subtitle': 'Panel Directivo',
    'header.searchPlaceholder': 'Buscar candidatos, procesos...',
    'header.notifications': 'Notificaciones',
    'header.unread': 'sin leer',
    'header.read': 'leídas',
    'header.reloadNotif': 'Recargar notificaciones',
    'header.unreadSection': 'No leídas',
    'header.readSection': 'Leídas',
    'header.markAllRead': 'Marcar todas como leídas',
    'header.markUnread': 'Marcar no leído',
    'header.noUnread': 'No hay notificaciones sin leer',
    'header.noRead': 'No hay notificaciones leídas',
    'header.clearHistory': 'Borrar historial',
    'header.showMenu': 'Mostrar menú',
    'header.hideMenu': 'Ocultar menú',

    // ── User menu ──
    'user.myProfile': 'Mi Perfil',
    'user.settings': 'Configuración',
    'user.logout': 'Cerrar Sesión',
    'user.admin': 'Administrador',
    'user.director': 'Director',
    'user.supervisor': 'Supervisor',
    'user.defaultName': 'Director RH',

    // ── Dashboard ──
    'dashboard.title': 'Panel Directivo',
    'dashboard.subtitle': 'Resumen ejecutivo',
    'dashboard.refresh': 'Actualizar',
    'dashboard.export': 'Exportar',
    'dashboard.loading': 'Cargando dashboard...',

    // ── KPI Cards ──
    'kpi.activeProcesses': 'Procesos Activos',
    'kpi.totalCandidates': 'Total Candidatos',
    'kpi.successRate': 'Tasa de Éxito',
    'kpi.hiredMonth': 'Contratados (mes)',
    'kpi.pendingApproval': 'Pend. Aprobación',
    'kpi.stagnantCandidates': 'Cand. Estancados',

    // ── Charts ──
    'chart.trendTitle': 'Tendencia + Regresión Lineal (12 meses)',
    'chart.processDistribution': 'Distribución de Procesos',
    'chart.recruitmentPipeline': 'Pipeline de Reclutamiento',
    'chart.candidateDistribution': 'Distribución de Candidatos',
    'chart.sourceEffectiveness': 'Efectividad por Fuente',

    // ── Settings Modal ──
    'settings.title': 'Configuración',
    'settings.personalizeSubtitle': 'Personaliza tu experiencia',
    'settings.appearance': 'Apariencia',
    'settings.appearanceDesc': 'Tema y colores',
    'settings.notifications': 'Notificaciones',
    'settings.notificationsDesc': 'Alertas y correos',
    'settings.preferences': 'Preferencias',
    'settings.preferencesDesc': 'Idioma y región',
    'settings.autoSave': 'Los cambios se guardan automáticamente',
    'settings.done': 'Listo',
    'settings.pressEsc': 'Presiona',
    'settings.toClose': 'para cerrar',
    'settings.saved': 'Guardado',

    // ── Appearance section ──
    'appearance.interfaceTheme': 'Tema de la interfaz',
    'appearance.light': 'Claro',
    'appearance.lightDesc': 'Interfaz clara y luminosa',
    'appearance.dark': 'Oscuro',
    'appearance.darkDesc': 'Modo oscuro para tus ojos',
    'appearance.system': 'Sistema',
    'appearance.systemDesc': 'Sincronizado con tu OS',
    'appearance.activeTheme': 'Tema activo',
    'appearance.darkMode': 'Modo oscuro',
    'appearance.lightMode': 'Modo claro',
    'appearance.syncedWithSystem': '(sincronizado con el sistema)',
    'appearance.accentColor': 'Color de acento',
    'appearance.accentColorDesc': 'Personaliza el color principal — próximamente',
    'appearance.comingSoon': 'Próximo',

    // ── Notifications section ──
    'notif.newCandidates': 'Nuevos candidatos',
    'notif.newCandidatesDesc': 'Recibe notificaciones cuando un nuevo candidato aplique a una vacante.',
    'notif.profileUpdates': 'Actualizaciones de perfil',
    'notif.profileUpdatesDesc': 'Alertas cuando un candidato actualice su información o documentos.',
    'notif.weeklyReports': 'Reportes semanales',
    'notif.weeklyReportsDesc': 'Resumen semanal con métricas clave del proceso de reclutamiento.',
    'notif.browserNotif': 'Notificaciones del navegador',
    'notif.browserNotifDesc': 'Muestra notificaciones push en tu navegador cuando estés conectado.',
    'notif.enabledCount': 'notificaciones activadas',
    'notif.of': 'de',

    // ── Preferences section ──
    'prefs.title': 'Preferencias Regionales',
    'prefs.subtitle': 'Configura idioma, zona horaria y formato de fecha.',
    'prefs.interfaceLang': 'Idioma de la interfaz',
    'prefs.timezone': 'Zona horaria',
    'prefs.dateFormat': 'Formato de fecha',
    'prefs.preview': 'Vista previa',
    'prefs.language': 'Idioma',
    'prefs.sampleDate': 'Fecha ejemplo',

    // ── Common ──
    'common.cancel': 'Cancelar',
    'common.save': 'Guardar',
    'common.close': 'Cerrar',
    'common.search': 'Buscar',
    'common.loading': 'Cargando...',
    'common.error': 'Error',
    'common.success': 'Éxito',
  },

  en: {
    // ── Sidebar ──
    'sidebar.controlPanel': 'Control Panel',
    'sidebar.dashboard': 'Dashboard',
    'sidebar.clients': 'Clients',
    'sidebar.recruitmentProfiles': 'Recruitment Profiles',
    'sidebar.candidates': 'Candidates',
    'sidebar.evaluations': 'Evaluation System',
    'sidebar.clientProgress': 'Client Progress',
    'sidebar.reports': 'Reports',
    'sidebar.profilesStatus': 'Profile Status',
    'sidebar.candidatesStatus': 'Candidate Status',
    'sidebar.shortlisted': 'Shortlisted',
    'sidebar.selectedCandidates': 'Selected Candidates',
    'sidebar.individualReports': 'Individual Reports',
    'sidebar.emailManagement': 'Email Management',

    // ── Header ──
    'header.subtitle': 'Director Panel',
    'header.searchPlaceholder': 'Search candidates, processes...',
    'header.notifications': 'Notifications',
    'header.unread': 'unread',
    'header.read': 'read',
    'header.reloadNotif': 'Reload notifications',
    'header.unreadSection': 'Unread',
    'header.readSection': 'Read',
    'header.markAllRead': 'Mark all as read',
    'header.markUnread': 'Mark as unread',
    'header.noUnread': 'No unread notifications',
    'header.noRead': 'No read notifications',
    'header.clearHistory': 'Clear history',
    'header.showMenu': 'Show menu',
    'header.hideMenu': 'Hide menu',

    // ── User menu ──
    'user.myProfile': 'My Profile',
    'user.settings': 'Settings',
    'user.logout': 'Log Out',
    'user.admin': 'Administrator',
    'user.director': 'Director',
    'user.supervisor': 'Supervisor',
    'user.defaultName': 'HR Director',

    // ── Dashboard ──
    'dashboard.title': 'Director Panel',
    'dashboard.subtitle': 'Executive Summary',
    'dashboard.refresh': 'Refresh',
    'dashboard.export': 'Export',
    'dashboard.loading': 'Loading dashboard...',

    // ── KPI Cards ──
    'kpi.activeProcesses': 'Active Processes',
    'kpi.totalCandidates': 'Total Candidates',
    'kpi.successRate': 'Success Rate',
    'kpi.hiredMonth': 'Hired (month)',
    'kpi.pendingApproval': 'Pending Approval',
    'kpi.stagnantCandidates': 'Stalled Candidates',

    // ── Charts ──
    'chart.trendTitle': 'Trend + Linear Regression (12 months)',
    'chart.processDistribution': 'Process Distribution',
    'chart.recruitmentPipeline': 'Recruitment Pipeline',
    'chart.candidateDistribution': 'Candidate Distribution',
    'chart.sourceEffectiveness': 'Source Effectiveness',

    // ── Settings Modal ──
    'settings.title': 'Settings',
    'settings.personalizeSubtitle': 'Personalize your experience',
    'settings.appearance': 'Appearance',
    'settings.appearanceDesc': 'Theme & colors',
    'settings.notifications': 'Notifications',
    'settings.notificationsDesc': 'Alerts & emails',
    'settings.preferences': 'Preferences',
    'settings.preferencesDesc': 'Language & region',
    'settings.autoSave': 'Changes are saved automatically',
    'settings.done': 'Done',
    'settings.pressEsc': 'Press',
    'settings.toClose': 'to close',
    'settings.saved': 'Saved',

    // ── Appearance section ──
    'appearance.interfaceTheme': 'Interface Theme',
    'appearance.light': 'Light',
    'appearance.lightDesc': 'Bright and clean interface',
    'appearance.dark': 'Dark',
    'appearance.darkDesc': 'Easy on your eyes',
    'appearance.system': 'System',
    'appearance.systemDesc': 'Synced with your OS',
    'appearance.activeTheme': 'Active theme',
    'appearance.darkMode': 'Dark mode',
    'appearance.lightMode': 'Light mode',
    'appearance.syncedWithSystem': '(synced with system)',
    'appearance.accentColor': 'Accent color',
    'appearance.accentColorDesc': 'Customize the main color — coming soon',
    'appearance.comingSoon': 'Soon',

    // ── Notifications section ──
    'notif.newCandidates': 'New candidates',
    'notif.newCandidatesDesc': 'Get notified when a new candidate applies to a position.',
    'notif.profileUpdates': 'Profile updates',
    'notif.profileUpdatesDesc': 'Alerts when a candidate updates their information or documents.',
    'notif.weeklyReports': 'Weekly reports',
    'notif.weeklyReportsDesc': 'Weekly summary with key recruitment metrics.',
    'notif.browserNotif': 'Browser notifications',
    'notif.browserNotifDesc': 'Show push notifications in your browser while connected.',
    'notif.enabledCount': 'notifications enabled',
    'notif.of': 'of',

    // ── Preferences section ──
    'prefs.title': 'Regional Preferences',
    'prefs.subtitle': 'Configure language, timezone, and date format.',
    'prefs.interfaceLang': 'Interface Language',
    'prefs.timezone': 'Timezone',
    'prefs.dateFormat': 'Date Format',
    'prefs.preview': 'Preview',
    'prefs.language': 'Language',
    'prefs.sampleDate': 'Sample Date',

    // ── Common ──
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.close': 'Close',
    'common.search': 'Search',
    'common.loading': 'Loading...',
    'common.error': 'Error',
    'common.success': 'Success',
  },
};

// ── Context ──────────────────────────────────────────────────────────

interface LanguageContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  language: 'es',
  setLanguage: () => {},
  t: (key: string) => key,
});

export function useLanguage() {
  return useContext(LanguageContext);
}

const STORAGE_KEY = 'user_prefs';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLangState] = useState<Language>('es');

  // Initialise from localStorage (reads user_prefs which SettingsModal also writes)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.language === 'en' || parsed.language === 'es') {
          setLangState(parsed.language);
        }
      }
    } catch { /* ignore */ }
  }, []);

  // Listen for cross-tab or same-tab storage changes
  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed.language === 'en' || parsed.language === 'es') {
            setLangState(parsed.language);
          }
        } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLangState(lang);
    // Also persist into user_prefs so SettingsModal stays in sync
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const current = raw ? JSON.parse(raw) : {};
      current.language = lang;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch { /* ignore */ }
    // Dispatch a custom event so same-page listeners can react
    window.dispatchEvent(new CustomEvent('language-change', { detail: lang }));
  }, []);

  // Also listen for same-tab custom events (from SettingsModal)
  useEffect(() => {
    const handler = (e: Event) => {
      const lang = (e as CustomEvent).detail;
      if (lang === 'en' || lang === 'es') setLangState(lang);
    };
    window.addEventListener('language-change', handler);
    return () => window.removeEventListener('language-change', handler);
  }, []);

  const t = useCallback((key: string): string => {
    return translations[language]?.[key] ?? translations['es']?.[key] ?? key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

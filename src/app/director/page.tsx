// app/page.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useModal } from '@/context/ModalContext';
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import ApplicationFormModal from "@/components/ApplicationFormModal";
import DirectorCandidateFormModal from "@/components/DirectorCandidateFormModal";
import CandidateDocumentFormModal from "@/components/CandidateDocumentFormModal";
import CandidateNoteFormModal from "@/components/CandidateNoteFormModal";
import ClientFormModal from "@/components/ClientFormModal";
import EvaluationsMain from "@/components/evaluations/EvaluationsMain";
import ProfilesMain from "@/components/profiles/ProfilesMain";
import CandidatesMain from "@/components/candidates/CandidatesMain";
import ClientsMain from "@/components/clients/ClientsMain";
import ProfilesStatusDashboard from '@/components/ProfilesStatusDashboard';
import CandidatesStatusDashboard from '@/components/CandidatesStatusDashboard';
import ShortlistedCandidatesDashboard from '@/components/ShortlistedCandidatesDashboard';
import SelectedCandidatesDashboard from '@/components/SelectedCandidatesDashboard';
import ReportsDashboard from '@/components/ReportsDashboard';
import IndividualReportsHub from '@/components/reports/IndividualReportsHub';
import DirectorReportsHub from '@/components/reports/DirectorReportsHub';
import ShareLinkModal from '@/components/ShareLinkModal';
import ShareDocumentLinkModal from '@/components/ShareDocumentLinkModal';
import EmailManagement from '@/components/EmailManagement';
import DocumentShareLinksDashboard from '@/components/DocumentShareLinksDashboard';
import UserProfileModal from '@/components/UserProfileModal';
import SettingsModal from '@/components/SettingsModal';
import NextImage from "next/image";
import { HybridMetricsDashboard } from "@/components/ui/AIMethodBadge";

import bausenLogo from "@/logos/bausen-logo.png";
import verticalLogo from "@/logos/Copia_Logo_Vertical_01.png";

import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  DoughnutController,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  LineController,
  BarElement,
  BarController,
  Filler,
} from "chart.js";

ChartJS.register(
  ArcElement, Tooltip, Legend, DoughnutController,
  LineElement, PointElement, CategoryScale, LinearScale,
  LineController, BarElement, BarController, Filler
);

// --- Linear Regression Utility ---
interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
  predict: (x: number) => number;
}

function linearRegression(points: { x: number; y: number }[]): RegressionResult {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: 0, r2: 0, predict: () => 0 };
  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n, r2: 0, predict: () => sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  const meanY = sumY / n;
  const ssRes = points.reduce((s, p) => s + Math.pow(p.y - (slope * p.x + intercept), 2), 0);
  const ssTot = points.reduce((s, p) => s + Math.pow(p.y - meanY, 2), 0);
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  return { slope, intercept, r2, predict: (x: number) => Math.max(0, slope * x + intercept) };
}

const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];


type Stats = {
  activeProcesses: number;
  completedCandidates: number;
  successRate: number;
  clientSatisfaction: number;
  activeProfiles: number;
};

type NotificationItem = {
  id: number;
  message: string;
  time: string;
  icon: string;
  // Optional navigation helpers
  route?: string; // full route (e.g. '/director/candidates/notes')
  view?: string; // dashboard view (e.g. 'profiles', 'evaluations')
  subview?: string; // subview name inside a view (e.g. 'profiles-pending')
  profileId?: number; // optional profile id to open
  action?: 'view' | 'edit' | null;
  // Local-only flag for notifications created client-side (e.g. dashboard alerts)
  isLocal?: boolean;
  // Optional read timestamp coming from server
  read_at?: string | null;
};

type Approval = {
  id: number;
  candidate: string;
  email: string;
  position: string;
  department: string;
  client: string;
  score: number;
  supervisor: string;
};

type Activity = {
  id: number;
  type: "success" | "info" | "purple";
  icon: string;
  message: string;
  details: string;
  time: string;
};

type Process = {
  id: number;
  title: string;
  processId: string;
  client: string;
  status: "active" | "paused" | "completed";
  candidates: { current: number; target: number };
  progress: number;
  responsible: string;
  priority: "high" | "medium" | "low";
};

type Candidate = {
  id: number;
  name: string;
  email: string;
  phone: string;
  position: string;
  experience: string;
  score: number;
  status: "approved" | "in-process";
  uploadedAt: string;
};

type ClientCard = {
  id: number;
  name: string;
  industry: string;
  contact: string;
  email: string;
  phone: string;
  status: "active" | "paused";
  activeProcesses: number;
  totalCandidates: number;
  lastActivity: string;
};

type TeamMember = {
  id: number;
  name: string;
  role: string;
  email: string;
  status: "active" | "paused";
  assignedProcesses: number;
  managedCandidates: number;
  successRate: number;
  avatar: string;
};

type DocItem = {
  id: number;
  name: string;
  type: string;
  size: string;
  uploadedBy: string;
  uploadedAt: string;
  category: string;
};

type Client = {
  id: number;
  company_name: string;
  rfc: string;
  industry: string;
  website?: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  contact_position: string;
  address_street: string;
  address_city: string;
  address_state: string;
  address_zip: string;
  address_country: string;
  assigned_to?: number;
  assigned_to_name?: string;
  is_active: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by_name?: string;
  contacts?: ContactPerson[];
  active_profiles_count?: number;
};

type ContactPerson = {
  id: number;
  client: number;
  name: string;
  position: string;
  email: string;
  phone: string;
  is_primary: boolean;
  notes?: string;
  created_at: string;
};

interface DashboardData {
  overview: {
    total_profiles: number;
    active_profiles: number;
    total_candidates: number;
    active_candidates: number;
    total_clients: number;
    active_clients: number;
    success_rate: number;
  };
  this_month: {
    new_profiles: number;
    completed_profiles: number;
    hired_candidates: number;
    new_clients: number;
    cv_analyses: number;
    documents_generated: number;
  };
  profiles: {
    by_status: { [key: string]: number };
    by_priority: Array<{ priority: string; count: number }>;
    pending_approval: number;
    near_deadline: number;
  };
  candidates: {
    total: number;
    active: number;
    in_interview: number;
    with_offer: number;
    hired_this_month: number;
  };
  alerts: {
    pending_approval: number;
    near_deadline: number;
    pending_review: number;
  };
  pipeline: {
    total_positions: number;
    in_sourcing: number;
    in_screening: number;
    in_evaluation: number;
    in_interview: number;
    with_offer: number;
    hired: number;
  };
}

interface ProcessByStatus {
  status: string;
  count: number;
  color: string;
  label: string;
}

function useDebounce<T extends (...args: any[]) => void>(fn: T, delay = 300) {
  const timeout = useRef<number | null>(null);
  return (...args: Parameters<T>) => {
    if (timeout.current) window.clearTimeout(timeout.current);
    timeout.current = window.setTimeout(() => fn(...args), delay);
  };
}

// Mini toasts locales
type Toast = { id: number; type: "info" | "success" | "warning" | "error"; text: string };
function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = (type: Toast["type"], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, type, text }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2600);
  };
  return {
    toasts,
    info: (t: string) => push("info", t),
    success: (t: string) => push("success", t),
    warning: (t: string) => push("warning", t),
    error: (t: string) => push("error", t),
  };
}



export default function Page() {
  const router = useRouter();
  const { showAlert, showConfirm } = useModal();
  const { toasts, info, success, warning, error } = useToasts();

  // ====== State principal (equivalente a directorApp) ======
  // Intentar restaurar la vista desde localStorage, si no existe usar "dashboard"
  const [currentView, setCurrentView] = useState<
    "dashboard" | "processes" | "candidates" | "clients" | "team" | "approvals" | "reports" | "documents" | "applications" | "notes" | "history" | "tasks" | "client-list" | "client-contacts" | "client-progress" | "evaluations" | "profiles" | "profiles-status" | "candidates-status" | "shortlisted-candidates" | "selected-candidates" | "individual-reports" | "email-management" | "document-links"
  >("dashboard");

  // Restaurar vista guardada al montar el componente (PRIMERO)
  useEffect(() => {
    const savedView = localStorage.getItem('directorCurrentView');
    if (savedView) {
      setCurrentView(savedView as any);
    }
  }, []);

  // Cargar datos del usuario autenticado
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) return;
    apiClient.getCurrentUser().then((user: any) => {
      setCurrentUser(user);
    }).catch(() => { /* silencioso */ });
  }, []);

  useEffect(() => {
    if (currentView === 'client-progress') {
      loadClientProgressProfiles();
    }
  }, [currentView]);


  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [selectedProfileForShare, setSelectedProfileForShare] = useState<{
    profileId: number;
    profileTitle: string;
    clientName: string;
  } | null>(null);

  // Guardar la vista actual en localStorage cada vez que cambie (DESPUÉS)
  useEffect(() => {
    localStorage.setItem('directorCurrentView', currentView);
    console.log('💾 Vista guardada:', currentView);
  }, [currentView]);



  const [loading, setLoading] = useState(false);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");


  const [clientProgressProfiles, setClientProgressProfiles] = useState<any[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  const [stats, setStats] = useState<Stats>({
    activeProcesses: 0,
    completedCandidates: 0,
    successRate: 0,
    clientSatisfaction: 0,
    activeProfiles: 0,
  });

  // Notifications state: we keep unread items and read items separately and persist read items to localStorage
  const [notifications, setNotifications] = useState<{ unread: number; unreadItems: NotificationItem[]; readItems: NotificationItem[] }>({
    unread: 0,
    unreadItems: [],
    readItems: [],
  });

  // For micro-animations: keep track of recently read notification ids so we can animate their entrance
  const [justReadIds, setJustReadIds] = useState<number[]>([]);
  // Loading state for notifications UI and retry logic
  const [notifLoading, setNotifLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const [pendingApprovals, setPendingApprovals] = useState<Approval[]>([]);
  const [recentActivity, setRecentActivity] = useState<Activity[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [candidatesOverview, setCandidatesOverview] = useState<any>(null);
  const [clients, setClients] = useState<ClientCard[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [documents, setDocuments] = useState<DocItem[]>([]);

  // Estado para tareas de Celery
  const [celeryData, setCeleryData] = useState<any>(null);
  const [celeryGroups, setCeleryGroups] = useState<any>(null);
  const [hybridMetrics, setHybridMetrics] = useState<any>(null);

  // Estado para clientes
  const [clientsData, setClientsData] = useState<Client[]>([]);
  const [contactsData, setContactsData] = useState<ContactPerson[]>([]);
  // Estado para aplicaciones
  const [applicationsData, setApplicationsData] = useState({
    total: 0,
    active: 0,
    shortlisted: 0,
    rejected: 0,
    recent: [] as any[],
    loading: true
  });

  //Estados para el DashBoard Principal
  const [processesByStatus, setProcessesByStatus] = useState<ProcessByStatus[]>([]);
  const [lastMonthData, setLastMonthData] = useState({
    profiles: 0,
    candidates: 0,
    success_rate: 0,
    client_satisfaction: 0
  });

  // --- Analytics & Trends State ---
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [trendData, setTrendData] = useState<{ label: string; candidates: number; profiles: number; hired: number }[]>([]);
  const [funnelData, setFunnelData] = useState<{ label: string; count: number; color: string; pct: number }[]>([]);
  const [candidatesByStatus, setCandidatesByStatus] = useState<{ status: string; count: number }[]>([]);
  const [profilesByStatus2, setProfilesByStatus2] = useState<{ status: string; count: number }[]>([]);
  const [stagnantCandidates, setStagnantCandidates] = useState<any[]>([]);
  const [sourceEffectiveness, setSourceEffectiveness] = useState<{ source: string; total: number; hired: number; rate: number }[]>([]);
  const [candidateRegression, setCandidateRegression] = useState<RegressionResult | null>(null);
  const [hireRegression, setHireRegression] = useState<RegressionResult | null>(null);

  // Chart refs for new charts
  const trendChartRef = useRef<HTMLCanvasElement | null>(null);
  const trendChartInstance = useRef<ChartJS | null>(null);
  const pipelineChartRef = useRef<HTMLCanvasElement | null>(null);
  const pipelineChartInstance = useRef<ChartJS | null>(null);
  const distributionChartRef = useRef<HTMLCanvasElement | null>(null);
  const distributionChartInstance = useRef<ChartJS | null>(null);
  const sourceBarChartRef = useRef<HTMLCanvasElement | null>(null);
  const sourceBarChartInstance = useRef<ChartJS | null>(null);


  // Estado para documentos
  const [documentsData, setDocumentsData] = useState({
    total: 0,
    by_type: {
      cv: 0,
      contract: 0,  // Contratos
      report: 0,    // Reportes
      other: 0
    },
    recent: [] as any[],
    loading: true
  });

  // Estado para notas
  const [notesData, setNotesData] = useState({
    total: 0,
    by_type: {
      interview: 0,
      evaluation: 0,
      concern: 0,
      general: 0,
      reference: 0
    },
    recent: [] as any[],
    loading: true
  });

  // Estado para historial
  const [historyData, setHistoryData] = useState({
    total_candidates: 0,
    hired: 0,
    in_process: 0,
    rejected: 0,
    success_rate: 0,
    loading: true
  });
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Current logged-in user info
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfileModalOpen, setUserProfileModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  // Dropdowns
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [candidatesMenuOpen, setCandidatesMenuOpen] = useState(false);
  const [clientsMenuOpen, setClientsMenuOpen] = useState(false);
  const [showApplicationForm, setShowApplicationForm] = useState(false);
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [showCandidateForm, setShowCandidateForm] = useState(false);
  const [showDocumentForm, setShowDocumentForm] = useState(false);
  const [showShareLinkModal, setShowShareLinkModal] = useState(false);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [showClientForm, setShowClientForm] = useState(false);

  // Estado para manejar navegación desde aplicaciones a perfiles
  const [profileToOpen, setProfileToOpen] = useState<{ id: number | null, action: 'view' | 'edit' | null }>({
    id: null,
    action: null
  });
  // Estado para fases expandidas en client-progress
  const [expandedPhases, setExpandedPhases] = useState<Set<number>>(new Set());

  // Tipado para sub-vistas de Profiles
  type ProfileView =
    | "profiles-list"
    | "profile-create"
    | "profile-detail"
    | "profiles-pending"
    | "profile-history"
    | "profile-documents"
    | "profile-stats"
    | "share-profile-form"
    | "ai-cv-analysis"
    | "ai-profile-generation"
    | "ai-bulk-cv-upload";

  // Sub-vista para pasar a `ProfilesMain` cuando navegamos desde notificaciones o URL
  const [profilesInitialSubView, setProfilesInitialSubView] = useState<ProfileView | null>(null);

  // Estados del formulario de aplicación
  const [applicationForm, setApplicationForm] = useState({
    candidato: '',
    perfil: '',
    estadoAplicacion: 'Aplicó',
    fechaAplicacion: '',
    porcentajeCoincidencia: '',
    calificacionGeneral: '',
    notas: '',
    fechaEntrevista: '',
    horaEntrevista: '',
    fechaOferta: '',
    horaOferta: '',
    razonRechazo: ''
  });

  // Manejar parámetros de URL para navegación desde aplicaciones
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    const profileId = params.get('profile');
    const editProfileId = params.get('edit');
    const subview = params.get('subview');

    if (view === 'profiles') {
      setCurrentView('profiles');
      if (subview) {
        setProfilesInitialSubView((subview as ProfileView) || null);
      }
      if (profileId) {
        setProfileToOpen({ id: parseInt(profileId), action: 'view' });
      } else if (editProfileId) {
        setProfileToOpen({ id: parseInt(editProfileId), action: 'edit' });
      }

      // Limpiar los parámetros URL después de usarlos
      window.history.replaceState({}, '', '/director');
    } else if (view) {
      // For other views, set directly and keep URL clean
      setCurrentView(view as any);
      window.history.replaceState({}, '', '/director');
    }
  }, []);


  // Inicializar sidebar después de hidratación (evita hydration mismatch)
  useEffect(() => {
    setMounted(true);

    // Detectar si es desktop
    const isDesktop = window.innerWidth >= 1024;

    if (isDesktop) {
      // En desktop, siempre abierto
      setSidebarOpen(true);
    } else {
      // En móvil, recuperar de localStorage
      const saved = localStorage.getItem('sidebarOpen');
      setSidebarOpen(saved === 'true');
    }
  }, []);

  // Cargar notificaciones desde backend al iniciar
  useEffect(() => {
    loadNotificationsFromAPI();
  }, []);

  const READ_DELAY_MS = 800; // Esperar antes de marcar como leída para evitar marcados agresivos

  // Helper: persist local read notifications to localStorage
  const getPersistedLocalRead = (): NotificationItem[] => JSON.parse(localStorage.getItem('directorReadNotifications') || '[]');
  const setPersistedLocalRead = (arr: NotificationItem[]) => localStorage.setItem('directorReadNotifications', JSON.stringify(arr));

  // Marca una notificación como leída (hace POST al backend y mueve a la lista de "readItems")
  const markNotificationRead = async (n: NotificationItem) => {
    // If this is a local-only notification (created on client), skip server call and persist locally
    if (n.isLocal) {
      setNotifications(prev => {
        if (prev.readItems.some(r => r.id === n.id)) return prev;
        const unreadItems = prev.unreadItems.filter(u => u.id !== n.id);
        const readItems = [{ ...n, read_at: new Date().toISOString() }, ...prev.readItems];

        // Persist locally
        const persisted = getPersistedLocalRead();
        const merged = [{ ...n, read_at: new Date().toISOString(), isLocal: true }, ...persisted.filter(p => p.id !== n.id)];
        setPersistedLocalRead(merged);

        return { unread: unreadItems.length, unreadItems, readItems };
      });

      // Animate entrance
      setTimeout(() => {
        const readEl = document.getElementById(`read-notif-${n.id}`);
        if (readEl) {
          readEl.classList.add('opacity-0', 'translate-y-2');
          // @ts-ignore
          void (readEl as HTMLElement).offsetHeight;
          readEl.classList.remove('opacity-0', 'translate-y-2');
        }
      }, 50);

      return;
    }

    // Animate the unread item out first
    const el = document.querySelector(`#notif-${n.id}`);
    if (el) {
      el.classList.add('transition-all', 'duration-200', 'opacity-0', '-translate-y-2');
    }

    // Delay a bit to allow navigation/UX and the leave animation
    setTimeout(async () => {
      try {
        await apiClient.markNotificationRead(n.id);
      } catch (e: any) {
        console.error('Error marking notification read on server', e);
        // If server returned 404 (notification not found for this user), fallback to local handling
        if (e?.status === 404) {
          console.warn('Notificación no encontrada en el servidor, aplicando cambio localmente');
        } else {
          warning('No se pudo marcar la notificación en el servidor');
        }
      }

      // Move item from unread to read (optimistic)
      setNotifications(prev => {
        if (prev.readItems.some(r => r.id === n.id)) return prev;
        const unreadItems = prev.unreadItems.filter(u => u.id !== n.id);
        const readItems = [{ ...n, read_at: new Date().toISOString() }, ...prev.readItems];
        return { unread: unreadItems.length, unreadItems, readItems };
      });

      // Add micro-enter animation to the newly-read item
      setTimeout(() => {
        const readEl = document.getElementById(`read-notif-${n.id}`);
        if (readEl) {
          // Start with invisible/translated state then trigger entrance
          readEl.classList.add('opacity-0', 'translate-y-2');
          // Force reflow
          // @ts-ignore
          void (readEl as HTMLElement).offsetHeight;
          readEl.classList.remove('opacity-0', 'translate-y-2');
        }
      }, 50);

      // Track just-read ids (useful for tests or extra CSS hooks)
      setJustReadIds(ids => [n.id, ...ids]);
      setTimeout(() => setJustReadIds(ids => ids.filter(id => id !== n.id)), 1000);
    }, READ_DELAY_MS);
  };

  // Marcar todas como leídas (llama API) - ahora con actualización optimista y estado de carga
  const markAllNotificationsRead = async () => {
    if (markingAll) return;
    setMarkingAll(true);

    // Optimistic update: move all unread to read immediately for snappy UI
    setNotifications(prev => {
      const nowIso = new Date().toISOString();
      const allRead = [...prev.unreadItems.map(i => ({ ...i, read_at: nowIso })), ...prev.readItems];
      // Persist local-read for any local items in unread
      const localReads = prev.unreadItems.filter(i => i.isLocal).map(i => ({ ...i, read_at: nowIso, isLocal: true }));
      try {
        const persisted = getPersistedLocalRead();
        const merged = [...localReads, ...persisted.filter(p => !localReads.some(l => l.id === p.id))];
        setPersistedLocalRead(merged);
      } catch (err) {
        console.warn('Could not persist local reads', err);
      }
      return { unread: 0, unreadItems: [], readItems: allRead };
    });

    try {
      await apiClient.markAllNotificationsRead();
      await loadNotificationsFromAPI();
      success('Todas las notificaciones marcadas como leídas');
    } catch (e) {
      console.error('Error marking all notifications read', e);
      warning('No se pudo marcar todas las notificaciones en el servidor; cambios aplicados localmente');
      // If server failed, we already applied optimistic change; keep local state as fallback
    } finally {
      setMarkingAll(false);
    }
  };

  // Marcar una notificación como no leída (vuelve a moverla a la sección de "No leídas")
  const markNotificationUnread = async (n: NotificationItem) => {
    // If this was a local notification, clear persisted local read
    if (n.isLocal) {
      const persisted = getPersistedLocalRead();
      const newPersisted = persisted.filter(p => p.id !== n.id);
      setPersistedLocalRead(newPersisted);

      setNotifications(prev => {
        if (prev.unreadItems.some(u => u.id === n.id)) return prev;
        const readItems = prev.readItems.filter(r => r.id !== n.id);
        const unreadItems = [{ ...n, read_at: null }, ...prev.unreadItems];
        return { unread: unreadItems.length, unreadItems, readItems };
      });

      return;
    }

    try {
      await apiClient.markNotificationUnread(n.id);
    } catch (e: any) {
      console.error('Error marking notification unread on server', e);
      if (e?.status === 404) {
        console.warn('Notificación no encontrada en servidor al marcar como no leído; actualizando localmente');
      } else {
        warning('No se pudo actualizar la notificación en el servidor');
      }
    }

    setNotifications(prev => {
      if (prev.unreadItems.some(u => u.id === n.id)) return prev;
      const readItems = prev.readItems.filter(r => r.id !== n.id);
      const unreadItems = [{ ...n, read_at: null }, ...prev.unreadItems];
      return { unread: unreadItems.length, unreadItems, readItems };
    });
  };

  // Borrar notificaciones leídas
  const clearReadNotifications = async () => {
    try {
      await apiClient.clearReadNotifications();
      // Clear persisted local reads too
      try {
        setPersistedLocalRead([]);
      } catch (err) {
        console.warn('Could not clear persisted local reads', err);
      }
      await loadNotificationsFromAPI();
    } catch (e) {
      console.error('Error clearing read notifications', e);
      // Fallback local: remove read items and persisted
      try {
        setPersistedLocalRead([]);
      } catch (err) {
        console.warn('Could not clear persisted local reads', err);
      }
      setNotifications(prev => ({ ...prev, readItems: [] }));
    }
  }; 

  // Cargar notificaciones desde backend (read/unread) — solicita list + unread en paralelo, unifica y deduplica
  const loadNotificationsFromAPI = async (forceRetry = false) => {
    setNotifLoading(true);
    try {
      console.log('🔁 Cargando notificaciones (list + unread) desde API...');

      // Hacer dos peticiones en paralelo: listado (paginated) y unread (solo no leídas)
      const [listResp, unreadResp] = await Promise.allSettled([
        apiClient.getNotifications({ page_size: '1000' }),
        apiClient.getUnreadNotifications()
      ]);

      let listItems: any[] = [];
      let unreadItemsFromEndpoint: any[] = [];

      if (listResp.status === 'fulfilled') {
        const data: any = listResp.value as any;
        listItems = Array.isArray(data) ? data : (data && (data.results ?? [])) || [];
      } else {
        console.warn('⚠️ getNotifications failed:', listResp.reason);
      }

      if (unreadResp.status === 'fulfilled') {
        const data: any = unreadResp.value as any;
        unreadItemsFromEndpoint = Array.isArray(data) ? data : (data && (data.results ?? [])) || [];
      } else {
        console.warn('⚠️ getUnreadNotifications failed:', unreadResp.reason);
      }

      // Combine both sources (listItems may already contain unread) and deduplicate by id
      const combinedById = new Map<number, any>();
      [...listItems, ...unreadItemsFromEndpoint].forEach((item: any) => {
        if (item && item.id != null) combinedById.set(item.id, item);
      });

      // Also include any local alerts (created by dashboard) if they are missing
      const localAlerts = (notifications.unreadItems || []).concat(notifications.readItems || []);
      localAlerts.forEach((l: any) => {
        if (l && l.id != null && !combinedById.has(l.id)) combinedById.set(l.id, l);
      });

      const combined = Array.from(combinedById.values());
      const finalUnread = combined.filter((s: any) => s.read_at == null || s.read_at === undefined);
      let finalRead = combined.filter((s: any) => s.read_at != null);

      // Merge persisted local-read notifications (from localStorage) if any
      try {
        const persistedLocal = getPersistedLocalRead();
        persistedLocal.forEach(p => {
          if (!finalRead.some(r => r.id === p.id)) {
            finalRead = [{ ...p, isLocal: true }, ...finalRead];
          }
          // Remove any persisted ids from unread
          const idx = finalUnread.findIndex(u => u.id === p.id);
          if (idx !== -1) finalUnread.splice(idx, 1);
        });
      } catch (e) {
        console.warn('Could not read persisted local read notifications', e);
      }

      setNotifications({ unread: finalUnread.length, unreadItems: finalUnread, readItems: finalRead });

      console.log('✅ Notificaciones cargadas:', { total: combined.length, unread: finalUnread.length, read: finalRead.length });

      // Si no hay elementos y no forzamos retry, intentar otra vez (por si el servidor tarda en propagar)
      if (combined.length === 0 && !forceRetry) {
        console.info('ℹ️ No se encontraron notificaciones; reintentando una vez más...');
        await loadNotificationsFromAPI(true);
      }
    } catch (e) {
      console.error('Error loading notifications from API', e);
    } finally {
      setNotifLoading(false);
    }
  };

  // Manejar clicks sobre notificaciones y navegar a la vista/subvista correspondiente
  const handleNotificationClick = (n: NotificationItem) => {
    // Mark as read after a small delay to allow navigation and avoid aggressive marking
    setTimeout(() => markNotificationRead(n), READ_DELAY_MS);

    // Close dropdown immediately
    setNotifOpen(false);

    // Route completa (fallback más explícito)
    if (n.route) {
      router.push(n.route);
      return;
    }

    // Navegación a Profiles con subview (p.ej. 'profiles-pending')
    if (n.view === 'profiles') {
      setProfilesInitialSubView((n.subview as ProfileView) || null);
      setCurrentView('profiles');
      const params = new URLSearchParams();
      params.set('view', 'profiles');
      if (n.subview) params.set('subview', n.subview);
      if (n.profileId) params.set('profile', String(n.profileId));
      router.push(`/director?${params.toString()}`);
      return;
    }

    // Navegación genérica por vista
    if (n.view) {
      setCurrentView(n.view as any);
      router.push(`/director?view=${n.view}${n.subview ? `&subview=${n.subview}` : ''}`);
      return;
    }
  };

  // Listener para resize de ventana
  useEffect(() => {
    if (!mounted) return;

    const handleResize = () => {
      const isDesktop = window.innerWidth >= 1024;
      if (isDesktop) {
        setSidebarOpen(true);
        localStorage.setItem('sidebarOpen', 'true');
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mounted]);

  // ====== Chart.js ======
  const processChartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstanceRef = useRef<any>(null);

  // Re-render process doughnut when data changes or view switches back to dashboard
  useEffect(() => {
    if (currentView !== 'dashboard') return;
    // Use requestAnimationFrame to ensure the canvas is laid out before drawing
    const rafId = requestAnimationFrame(() => {
      setupCharts();
    });
    return () => cancelAnimationFrame(rafId);
  }, [processesByStatus, currentView]);

  // ====== Carga inicial ======
  useEffect(() => {
    const initializeDashboard = async () => {
      setLoading(true);
      try {
        await loadDashboardData();
        await loadApplicationsData();
        await loadDocumentsData();
        await loadNotesData();
        // Charts are rendered by useEffect reacting to state changes, not here
        // (calling setupCharts() here would use stale closure data)
      } catch (e) {
        console.error(e);
        error("Error cargando el dashboard");
      } finally {
        setLoading(false);
      }
    };

    initializeDashboard();
  }, []);

  // ⚠️ Auto-refresh deshabilitado para evitar parpadeos
  // Si necesitas datos actualizados, usa el botón de refrescar manualmente

  useEffect(() => {
    if (currentView === 'candidates' && !loading) {
      loadCandidatesData();
    }
  }, [currentView]);

  // Cargar datos de Celery cuando la vista sea "tasks" (sin auto-refresh)
  useEffect(() => {
    if (currentView === "tasks") {
      loadCeleryData();
    }
  }, [currentView]);

  // Cargar datos de clientes cuando sea necesario
  useEffect(() => {
    if (currentView === "client-list" || currentView === "clients") {
      loadClientsData();
    } else if (currentView === "client-contacts") {
      loadContactsData();
    }
  }, [currentView]);



  function setupCharts() {
    if (!processChartRef.current) return;
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }
    const ctx = processChartRef.current.getContext('2d');
    if (!ctx) return;
    const labels = processesByStatus.length > 0
      ? processesByStatus.map(p => p.label)
      : ['Sin datos'];
    const dataValues = processesByStatus.length > 0
      ? processesByStatus.map(p => p.count)
      : [1];
    const colors = processesByStatus.length > 0
      ? processesByStatus.map(p => p.color)
      : ['#E5E7EB'];
    chartInstanceRef.current = new ChartJS(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{ data: dataValues, backgroundColor: colors, borderWidth: 2, borderColor: '#fff' }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12, font: { size: 11 } } },
        },
      },
    });
  }

  // --- Render analytics charts when data changes ---
  useEffect(() => {
    if (currentView !== 'dashboard') return;
    // Destroy old instances
    [trendChartInstance, pipelineChartInstance, distributionChartInstance, sourceBarChartInstance].forEach(ref => {
      if (ref.current) { ref.current.destroy(); ref.current = null; }
    });

    // 1. TREND LINE CHART with regression
    if (trendChartRef.current && trendData.length > 0 && candidateRegression && hireRegression) {
      const ctx = trendChartRef.current.getContext('2d');
      if (ctx) {
        const labels = trendData.map(t => t.label);
        // Extend 3 months for prediction
        const now = new Date();
        const extLabels = [...labels];
        for (let i = 1; i <= 3; i++) {
          const fd = new Date(now.getFullYear(), now.getMonth() + i, 1);
          extLabels.push(`${MONTH_LABELS[fd.getMonth()]} ${fd.getFullYear().toString().slice(-2)}*`);
        }
        const padded = (arr: number[]) => [...arr, ...Array(3).fill(null)];
        const regLine = (reg: RegressionResult) => extLabels.map((_, i) => Math.max(0, Number(reg.predict(i).toFixed(1))));

        trendChartInstance.current = new ChartJS(ctx, {
          type: 'line',
          data: {
            labels: extLabels,
            datasets: [
              { label: 'Candidatos', data: padded(trendData.map(t => t.candidates)), borderColor: '#3B82F6', backgroundColor: 'rgba(59,130,246,0.08)', fill: true, tension: 0.4, pointRadius: 3 },
              { label: 'Contratados', data: padded(trendData.map(t => t.hired)), borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.08)', fill: true, tension: 0.4, pointRadius: 3 },
              { label: 'Perfiles', data: padded(trendData.map(t => t.profiles)), borderColor: '#8B5CF6', backgroundColor: 'transparent', tension: 0.4, pointRadius: 2, borderDash: [] },
              { label: `Reg. Cand. (R\u00B2=${candidateRegression.r2.toFixed(2)})`, data: regLine(candidateRegression), borderColor: 'rgba(59,130,246,0.35)', borderDash: [6, 4], borderWidth: 2, pointRadius: 0, fill: false },
              { label: `Reg. Contr. (R\u00B2=${hireRegression.r2.toFixed(2)})`, data: regLine(hireRegression), borderColor: 'rgba(5,150,105,0.35)', borderDash: [6, 4], borderWidth: 2, pointRadius: 0, fill: false },
            ],
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            interaction: { intersect: false, mode: 'index' },
            plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 12, font: { size: 11 } } } },
            scales: {
              y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } },
              x: { grid: { display: false }, ticks: { callback: function(_v: any, i: number) { const l = extLabels[i]; return l?.endsWith('*') ? l.replace('*', ' (P)') : l; } } },
            },
          },
        });
      }
    }

    // 2. PIPELINE FUNNEL (horizontal bar)
    if (pipelineChartRef.current && funnelData.length > 0) {
      const ctx = pipelineChartRef.current.getContext('2d');
      if (ctx) {
        pipelineChartInstance.current = new ChartJS(ctx, {
          type: 'bar',
          data: {
            labels: funnelData.map(f => f.label),
            datasets: [{ data: funnelData.map(f => f.count), backgroundColor: funnelData.map(f => f.color), borderRadius: 6, barPercentage: 0.65 }],
          },
          options: {
            indexAxis: 'y', responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => { const s = funnelData[ctx.dataIndex]; return `${s.count} (${s.pct}%)`; } } } },
            scales: { x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } }, y: { grid: { display: false } } },
          },
        });
      }
    }

    // 3. DISTRIBUTION DOUGHNUT (candidates by status)
    if (distributionChartRef.current && candidatesByStatus.length > 0) {
      const ctx = distributionChartRef.current.getContext('2d');
      if (ctx) {
        const STATUS_COLORS: Record<string, string> = { new: '#3B82F6', screening: '#F59E0B', qualified: '#10B981', interview: '#8B5CF6', offer: '#EC4899', hired: '#059669', rejected: '#EF4444', withdrawn: '#6B7280' };
        const STATUS_LABELS: Record<string, string> = { new: 'Nuevo', screening: 'En Revision', qualified: 'Calificado', interview: 'Entrevista', offer: 'Oferta', hired: 'Contratado', rejected: 'Rechazado', withdrawn: 'Retirado' };
        distributionChartInstance.current = new ChartJS(ctx, {
          type: 'doughnut',
          data: {
            labels: candidatesByStatus.map(s => STATUS_LABELS[s.status] || s.status),
            datasets: [{ data: candidatesByStatus.map(s => s.count), backgroundColor: candidatesByStatus.map(s => STATUS_COLORS[s.status] || '#6B7280'), borderWidth: 2, borderColor: '#fff' }],
          },
          options: { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 10, font: { size: 11 } } } } },
        });
      }
    }

    // 4. SOURCE BAR CHART
    if (sourceBarChartRef.current && sourceEffectiveness.length > 0) {
      const ctx = sourceBarChartRef.current.getContext('2d');
      if (ctx) {
        sourceBarChartInstance.current = new ChartJS(ctx, {
          type: 'bar',
          data: {
            labels: sourceEffectiveness.map(s => s.source),
            datasets: [
              { label: 'Total', data: sourceEffectiveness.map(s => s.total), backgroundColor: 'rgba(59,130,246,0.7)', borderRadius: 4 },
              { label: 'Contratados', data: sourceEffectiveness.map(s => s.hired), backgroundColor: 'rgba(5,150,105,0.7)', borderRadius: 4 },
            ],
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { usePointStyle: true } } }, scales: { y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } }, x: { grid: { display: false } } } },
        });
      }
    }

    return () => {
      [trendChartInstance, pipelineChartInstance, distributionChartInstance, sourceBarChartInstance].forEach(ref => {
        if (ref.current) { ref.current.destroy(); ref.current = null; }
      });
    };
  }, [currentView, trendData, funnelData, candidatesByStatus, sourceEffectiveness, candidateRegression, hireRegression]);

  async function loadDashboardData() {
    setDashboardLoading(true);

    try {
      const token = localStorage.getItem('authToken');

      if (!token) {
        router.push('/auth');
        return;
      }

      console.log('🔵 Cargando dashboard del Director...');

      // Llamada al endpoint del backend
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/director/dashboard/`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        if (response.status === 401) {
          console.error('❌ Token inválido o expirado');
          localStorage.removeItem('authToken');
          router.push('/auth');
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }


      const data: DashboardData = await response.json();
      console.log('✅ Datos del dashboard recibidos:', data);

      // ========================================
      // CALCULAR DATOS DEL MES ANTERIOR (para comparaciones)
      // ========================================
      const lastMonth = {
        profiles: Math.round(data.overview.active_profiles * 0.85),
        candidates: Math.round((data.candidates?.hired_this_month || 0) * 0.92),
        success_rate: (data.overview.success_rate || 0) * 0.97,
        client_satisfaction: 4.7
      };
      setLastMonthData(lastMonth);

      // ========================================
      // MAPEAR DATOS DEL BACKEND A STATS
      // ========================================
      setStats({
        activeProcesses: data.overview?.active_profiles || 0,
        completedCandidates: data.candidates?.hired_this_month || 0,
        successRate: data.overview?.success_rate || 0,
        clientSatisfaction: 4.7, // TODO: Agregar al backend
        activeProfiles: data.overview?.active_profiles || 0,
      });

      // ========================================
      // PROCESOS POR ESTADO - MAPEO COMPLETO
      // ========================================
      const statusMapping: { [key: string]: { label: string; color: string } } = {
        'draft': { label: 'Borrador', color: '#9CA3AF' },
        'pending': { label: 'Pendiente', color: '#F59E0B' },
        'approved': { label: 'Aprobado', color: '#3B82F6' },
        'in_progress': { label: 'En Proceso', color: '#8B5CF6' },
        'candidates_found': { label: 'Candidatos Encontrados', color: '#06B6D4' },
        'in_evaluation': { label: 'Aplicación de Pruebas', color: '#F97316' },
        'in_interview': { label: 'En Entrevista', color: '#EC4899' },
        'finalists': { label: 'Finalistas', color: '#6366F1' },
        'completed': { label: 'Completado', color: '#10B981' },
        'on_hold': { label: 'En Pausa', color: '#6B7280' },
        'cancelled': { label: 'Cancelado', color: '#EF4444' },
      };

      const processesStatus: ProcessByStatus[] = Object.entries(data.profiles?.by_status || {})
        .map(([status, count]) => ({
          status,
          count: count as number,
          label: statusMapping[status]?.label || status,
          color: statusMapping[status]?.color || '#6B7280',
        }))
        .filter(item => item.count > 0)
        .sort((a, b) => b.count - a.count);

      setProcessesByStatus(processesStatus);

      // ========================================
      // NOTIFICACIONES
      // ========================================
      const alertsData = data.alerts || {};
      const notificationsList: NotificationItem[] = [];

      if (alertsData.pending_approval > 0) {
        notificationsList.push({
          id: 1,
          message: `${alertsData.pending_approval} perfil(es) requieren aprobación`,
          time: 'Pendiente',
          icon: 'fas fa-user-check',
          view: 'profiles',
          subview: 'profiles-pending',
          isLocal: true
        });
      }

      if (alertsData.near_deadline > 0) {
        notificationsList.push({
          id: 2,
          message: `${alertsData.near_deadline} perfil(es) próximos a vencer`,
          time: 'Urgente',
          icon: 'fas fa-exclamation-triangle',
          view: 'profiles',
          subview: 'profiles-list',
          isLocal: true
        });
      }

      if (alertsData.pending_review > 0) {
        notificationsList.push({
          id: 3,
          message: `${alertsData.pending_review} evaluación(es) pendientes de revisión`,
          time: 'Hoy',
          icon: 'fas fa-clipboard-check',
          view: 'evaluations',
          isLocal: true
        });
      }

      // Merge local alert-derived notifications with existing state (no redundant API call)
      try {
        setNotifications(prev => {
          const existingIds = new Set<number>([...prev.unreadItems.map(i => i.id), ...prev.readItems.map(i => i.id)]);
          const alertsToAdd = notificationsList.filter(n => !existingIds.has(n.id));
          const alertsUnread = alertsToAdd.filter(a => !a.read_at);
          const unreadItems = [...alertsUnread, ...prev.unreadItems];
          return { unread: unreadItems.length, unreadItems, readItems: prev.readItems };
        });
      } catch (e) {
        // Fallback: merge with persisted local read state
        const persistedRead: NotificationItem[] = JSON.parse(localStorage.getItem('directorReadNotifications') || '[]');
        const persistedReadIds = new Set(persistedRead.map(r => r.id));

        const unreadItems = notificationsList.filter(n => !persistedReadIds.has(n.id));
        const mergedReadById = new Map<number, NotificationItem>();
        persistedRead.forEach(r => mergedReadById.set(r.id, r));
        notificationsList.filter(n => persistedReadIds.has(n.id)).forEach(n => mergedReadById.set(n.id, n));
        const readItems = Array.from(mergedReadById.values());

        setNotifications({
          unread: unreadItems.length,
          unreadItems,
          readItems,
        });
      }

      // ========================================
      // ACTIVIDAD RECIENTE - MEJORADA
      // ========================================
      const activityList: Activity[] = [];

      // 1. Nuevos perfiles este mes
      if (data.this_month?.new_profiles > 0) {
        activityList.push({
          id: activityList.length + 1,
          type: 'info',
          icon: 'fas fa-briefcase',
          message: 'Nuevos Perfiles Creados',
          details: `${data.this_month.new_profiles} nuevo(s) perfil(es) de reclutamiento este mes`,
          time: 'Este mes'
        });
      }

      // 2. Perfiles completados
      if (data.this_month?.completed_profiles > 0) {
        activityList.push({
          id: activityList.length + 1,
          type: 'success',
          icon: 'fas fa-check-circle',
          message: 'Procesos Completados',
          details: `${data.this_month.completed_profiles} proceso(s) de reclutamiento finalizado(s)`,
          time: 'Este mes'
        });
      }

      // 3. Análisis de CVs con IA
      if (data.this_month?.cv_analyses > 0) {
        activityList.push({
          id: activityList.length + 1,
          type: 'purple',
          icon: 'fas fa-robot',
          message: 'Análisis de CVs con IA',
          details: `${data.this_month.cv_analyses} CV(s) analizados automáticamente`,
          time: 'Este mes'
        });
      }

      // 4. Nuevos clientes
      if (data.this_month?.new_clients > 0) {
        activityList.push({
          id: activityList.length + 1,
          type: 'info',
          icon: 'fas fa-building',
          message: 'Nuevos Clientes',
          details: `${data.this_month.new_clients} nuevo(s) cliente(s) agregado(s) al sistema`,
          time: 'Este mes'
        });
      }

      // 5. Contrataciones realizadas
      if (data.candidates?.hired_this_month > 0) {
        activityList.push({
          id: activityList.length + 1,
          type: 'success',
          icon: 'fas fa-user-tie',
          message: 'Candidatos Contratados',
          details: `${data.candidates.hired_this_month} candidato(s) contratado(s) exitosamente`,
          time: 'Este mes'
        });
      }

      // Si NO hay actividad, agregar mensaje informativo
      if (activityList.length === 0) {
        activityList.push({
          id: 1,
          type: 'info',
          icon: 'fas fa-info-circle',
          message: 'No hay actividad reciente',
          details: 'Comienza creando un nuevo perfil de reclutamiento',
          time: 'Hoy'
        });
      }

      setRecentActivity(activityList.slice(0, 5));

      // Limitar a las 5 actividades más recientes
      setRecentActivity(activityList.slice(0, 5));

      // ========================================
      // PROCESOS ACTIVOS
      // ========================================
      // Nota: Los procesos individuales requieren otro endpoint
      // Por ahora mantenemos los datos de ejemplo o los cargamos desde otro endpoint
      console.log('⚠️ Los procesos individuales requieren cargar desde /director/profiles/overview/');

      // ========================================
      // CARGAR CANDIDATOS
      // ========================================
      await loadCandidatesData();

      // ========================================
      // CARGAR APROBACIONES PENDIENTES
      // ========================================
      try {
        const pendingRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/director/pending-approvals/`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }
        );
        if (pendingRes.ok) {
          const pendingData = await pendingRes.json();
          console.log('✅ Aprobaciones pendientes cargadas:', pendingData.length);
          setPendingApprovals(pendingData);
        } else {
          console.warn('⚠️ Error al cargar aprobaciones pendientes:', pendingRes.status);
        }
      } catch (pendingErr) {
        console.warn('Error al cargar aprobaciones pendientes:', pendingErr);
      }

      // ========================================
      // CARGAR ANALYTICS Y TENDENCIAS
      // ========================================
      try {
        const analyticsRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/director/analytics/trends/`,
          { headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } }
        );
        if (analyticsRes.ok) {
          const aData = await analyticsRes.json();
          setAnalyticsData(aData);
          console.log('Analytics cargados:', aData);

          // Build trend data from monthly_candidates
          const trends: { label: string; candidates: number; profiles: number; hired: number }[] = [];
          const now = new Date();
          for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const mc = (aData.monthly_candidates || []).find((m: any) => m.month?.startsWith(key));
            const mp = (aData.monthly_profiles || []).find((m: any) => m.month?.startsWith(key));
            const mh = (aData.monthly_hires || []).find((m: any) => m.month?.startsWith(key));
            trends.push({
              label: `${MONTH_LABELS[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`,
              candidates: mc?.total || 0,
              profiles: mp?.created || 0,
              hired: mh?.count || mc?.hired || 0,
            });
          }
          setTrendData(trends);

          // Regressions
          const candPts = trends.map((t, i) => ({ x: i, y: t.candidates }));
          const hirePts = trends.map((t, i) => ({ x: i, y: t.hired }));
          setCandidateRegression(linearRegression(candPts));
          setHireRegression(linearRegression(hirePts));

          // Funnel
          const funnel = aData.funnel || {};
          const total = funnel.total || 1;
          setFunnelData([
            { label: 'Total Candidatos', count: funnel.total || 0, color: '#3B82F6', pct: 100 },
            { label: 'En Revision', count: funnel.screening || 0, color: '#F59E0B', pct: Math.round(((funnel.screening || 0) / total) * 100) },
            { label: 'Entrevista', count: funnel.interview || 0, color: '#8B5CF6', pct: Math.round(((funnel.interview || 0) / total) * 100) },
            { label: 'Con Oferta', count: funnel.offer || 0, color: '#EC4899', pct: Math.round(((funnel.offer || 0) / total) * 100) },
            { label: 'Contratados', count: funnel.hired || 0, color: '#059669', pct: Math.round(((funnel.hired || 0) / total) * 100) },
          ]);

          // Candidates by status
          setCandidatesByStatus((aData.candidates_by_status || []).sort((a: any, b: any) => b.count - a.count));
          setProfilesByStatus2((aData.profiles_by_status || []).sort((a: any, b: any) => b.count - a.count));

          // Source effectiveness
          setSourceEffectiveness(
            (aData.source_effectiveness || []).filter((s: any) => s.source).map((s: any) => ({
              source: s.source, total: s.total, hired: s.hired,
              rate: s.total > 0 ? Math.round((s.hired / s.total) * 100) : 0,
            }))
          );

          // Stagnant candidates
          setStagnantCandidates((aData.stagnant_candidates || []).slice(0, 8));
        }
      } catch (analyticsErr) {
        console.warn('Error al cargar analytics:', analyticsErr);
      }

      console.log('Dashboard cargado exitosamente');

    } catch (err) {
      console.error('❌ Error al cargar dashboard:', err);
      error('Error al cargar los datos del dashboard');
    } finally {
      setDashboardLoading(false);
    }
  }

  // ====== Acciones (toasts) ======
  const approveCandidate = async (id: number) => {
    setLoading(true);
    try {
      setPendingApprovals((arr) => arr.filter((a) => a.id !== id));
      success("Candidato aprobado exitosamente");
    } catch {
      error("Error al aprobar candidato");
    } finally {
      setLoading(false);
    }
  };

  const rejectCandidate = async (id: number) => {
    setLoading(true);
    try {
      setPendingApprovals((arr) => arr.filter((a) => a.id !== id));
      warning("Candidato rechazado");
    } catch {
      error("Error al rechazar candidato");
    } finally {
      setLoading(false);
    }
  };

  const viewCandidate = (id: number) => info("Abriendo detalles del candidato...");
  const viewProcessDetails = (id: number) => info(`Viendo detalles del proceso ${id}...`);
  const refreshDashboard = async () => {
    await loadDashboardData();
    success("Dashboard actualizado");
  };
  const exportDashboard = () => info("Generando exportación...");
  const openNewProcessModal = () => info("Abriendo formulario de nuevo proceso...");
  const openUploadCVModal = () => info("Abriendo subida de CV...");
  const generateReport = () => info("Generando reporte...");

  const refreshProcesses = () => info("Actualizando procesos...");
  const exportCandidates = () => info("Exportando candidatos...");
  const viewCandidateDetails = (id: number) => info(`Viendo detalles del candidato ${id}...`);
  const addNewClient = () => setShowClientForm(true);
  const viewClientDetails = (id: number) => info(`Viendo detalles del cliente ${id}...`);
  const addTeamMember = () => info("Abriendo formulario para agregar miembro...");
  const viewTeamMemberProfile = (id: number) => info(`Viendo perfil del miembro ${id}...`);
  const approveAllPending = () => info("Aprobando todas las solicitudes pendientes...");
  const filterApprovals = () => info("Aplicando filtros de aprobaciones...");
  const generateMonthlyReport = () => info("Generando reporte mensual...");
  const exportAllReports = () => info("Exportando todos los reportes...");
  const uploadDocument = () => setShowDocumentForm(true);
  const searchDocuments = () => info("Abriendo búsqueda de documentos...");
  const viewDocument = (id: number) => info(`Viendo documento ${id}...`);
  const downloadDocument = (id: number) => info(`Descargando documento ${id}...`);
  const deleteDocument = (id: number) => warning(`Eliminando documento ${id}...`);


  const handleGenerateShareLink = async (
    profileId: number,
    profileTitle: string,
    clientName: string
  ) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/profiles/profiles/${profileId}/generate_share_link/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Error al generar enlace');

      const data = await response.json();
      // Extraer token del share_url y construir URL correcta
      const shareToken = data.share_url.split('/').pop();
      const correctedUrl = `${window.location.origin}/reclutamiento/public/profile-progress/${shareToken}`;
      setShareLink(correctedUrl);
      setSelectedProfileForShare({
        profileId: data.profile_id,
        profileTitle: data.position_title,
        clientName: data.client_name,
      });
      setShareModalOpen(true);
    } catch (error) {
      console.error('Error:', error);
      await showAlert('Error al generar enlace para compartir');
    }
  };

  const handlePreviewProfile = async (profileId: number) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/profiles/profiles/${profileId}/generate_share_link/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) throw new Error('Error al generar enlace de previsualización');

      const data = await response.json();
      // Extraer token del share_url y construir URL correcta
      const shareToken = data.share_url.split('/').pop();
      const correctedUrl = `${window.location.origin}/reclutamiento/public/profile-progress/${shareToken}`;
      // Abrir en una nueva pestaña
      window.open(correctedUrl, '_blank');
    } catch (error) {
      console.error('Error:', error);
      await showAlert('Error al abrir previsualización');
    }
  };

  const loadClientProgressProfiles = async () => {
    setLoadingProfiles(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/profiles/profiles/`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const profilesList = data.results || data;
        setClientProgressProfiles(profilesList);
      }
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setLoadingProfiles(false);
    }
  };

  // ====== Funciones para datos de Celery ======
  const loadCeleryData = async () => {
    try {
      // Verificar si hay token de autenticación
      const token = localStorage.getItem('authToken');
      if (!token) {
        console.warn('No hay token de autenticación disponible');
        warning('Sesión expirada. Por favor, inicia sesión nuevamente.');
        router.push('/auth');
        return;
      }

      console.log('Cargando datos de Celery...');

      // Cargar datos por separado para manejar errores individuales
      let tasksData = null;
      let groupsData = null;

      try {
        tasksData = await apiClient.getCeleryTasksStatus();
        console.log('Datos de tareas Celery cargados:', tasksData);
      } catch (taskErr: any) {
        console.warn('Error cargando tareas Celery, usando fallback:', taskErr);
        tasksData = {
          active_tasks: { count: 0, tasks: [] },
          scheduled_tasks: { count: 0, tasks: [] },
          statistics: {
            total_tasks: 0,
            successful_tasks: 0,
            failed_tasks: 0,
            pending_tasks: 0,
            retry_tasks: 0
          },
          recent_tasks: [],
          task_types: [],
          workers_status: { active_workers: 0, workers: [] }
        };
      }

      try {
        groupsData = await apiClient.getCeleryTaskGroups();
        console.log('Datos de grupos Celery cargados:', groupsData);
      } catch (groupErr: any) {
        console.warn('Error cargando grupos Celery, usando fallback:', groupErr);
        groupsData = {
          groups: {
            ai_services: { name: 'Servicios de IA', statistics: { total: 0, successful: 0, failed: 0, pending: 0 } },
            documents: { name: 'Documentos', statistics: { total: 0, successful: 0, failed: 0, pending: 0 } },
            notifications: { name: 'Notificaciones', statistics: { total: 0, successful: 0, failed: 0, pending: 0 } },
            system: { name: 'Sistema', statistics: { total: 0, successful: 0, failed: 0, pending: 0 } }
          }
        };
      }

      setCeleryData(tasksData);
      setCeleryGroups(groupsData);

      // Cargar métricas híbridas IA
      try {
        const aiStats = await apiClient.getAIHybridStats();
        if (aiStats?.hybrid_metrics) {
          setHybridMetrics(aiStats.hybrid_metrics);
        }
      } catch (aiErr: any) {
        console.warn('Error cargando métricas híbridas IA:', aiErr);
      }

      success('Datos de sistema actualizados');
    } catch (err: any) {
      console.error('Error general loading Celery data:', err);

      // Manejar errores de autenticación que no se capturaron antes
      if (err?.status === 401) {
        warning('Sesión expirada. Redirigiendo al login...');
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        router.push('/auth');
        return;
      }

      // Para otros errores, usar datos de fallback ya configurados arriba
      warning('Algunos datos del sistema no están disponibles');
    }
  };

  const refreshCeleryData = async () => {
    setLoading(true);
    try {
      await loadCeleryData();
      success("Datos de tareas actualizados");
    } catch (err) {
      error("Error al actualizar datos de tareas");
    } finally {
      setLoading(false);
    }
  };

  const loadCandidatesData = async () => {
    try {
      console.log('🔵 Cargando candidatos y estadísticas del director...');

      // Cargar candidatos y overview en paralelo
      const [candidatesResponse, overviewResponse] = await Promise.all([
        apiClient.getCandidates({ search: searchQuery }),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/director/candidates/overview/`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
            'Content-Type': 'application/json',
          },
        }).then(res => res.json())
      ]);

      console.log('🟢 Candidatos recibidos:', candidatesResponse);
      console.log('🟢 Overview recibido:', overviewResponse);

      // Procesar candidatos
      const typedCandidatesResponse = candidatesResponse as { results?: Candidate[] } | Candidate[];
      const candidatesList = Array.isArray(typedCandidatesResponse)
        ? typedCandidatesResponse
        : typedCandidatesResponse.results || [];

      setCandidates(candidatesList);
      setCandidatesOverview(overviewResponse);

      // ✅ VALIDAR overviewResponse
      if (!overviewResponse || typeof overviewResponse !== 'object') {
        console.warn('⚠️ overviewResponse es null, usando valores por defecto');
        setHistoryData({
          total_candidates: candidatesList.length,
          hired: 0,
          in_process: candidatesList.length,
          rejected: 0,
          success_rate: 0,
          loading: false
        });
        return;
      }

      // ✅ Calcular estadísticas (DENTRO del try, usando overviewResponse)
      const totalCandidates = overviewResponse.total || 0;
      const hired = overviewResponse.by_status?.hired || 0;
      const rejected = overviewResponse.by_status?.rejected || 0;
      const inProcess =
        (overviewResponse.by_status?.screening || 0) +
        (overviewResponse.by_status?.qualified || 0) +
        (overviewResponse.by_status?.interview || 0) +
        (overviewResponse.by_status?.offer || 0);

      const successRate = totalCandidates > 0
        ? Math.round((hired / totalCandidates) * 100)
        : 0;

      setHistoryData({
        total_candidates: totalCandidates,
        hired,
        in_process: inProcess,
        rejected,
        success_rate: successRate,
        loading: false
      });

    } catch (error: any) {
      console.error('❌ Error loading candidates:', error);

      setCandidates([]);
      setCandidatesOverview(null);
      setHistoryData({
        total_candidates: 0,
        hired: 0,
        in_process: 0,
        rejected: 0,
        success_rate: 0,
        loading: false
      });

      if (error?.status === 401) {
        warning('Sesión expirada. Redirigiendo al login...');
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        router.push('/auth');
      } else {
        error('Error al cargar candidatos');
      }
    }
  };
  // ====== Funciones para datos de Clientes ======
  const loadClientsData = async () => {
    try {
      const clientsResponse = await apiClient.getClients();
      setClientsData(clientsResponse.results || clientsResponse);
      console.log('Clientes cargados:', clientsResponse);
    } catch (err: any) {
      console.error('Error cargando clientes:', err);
      console.error('Error details:', {
        message: err.message,
        status: err.status,
        response: err.response
      });
      if (err?.status === 401) {
        warning('Sesión expirada');
        router.push('/auth');
      } else {
        error(`Error al cargar clientes: ${err.message || 'Error desconocido'}`);
      }
    }
  };

  const loadContactsData = async (clientId?: number) => {
    try {
      const params = clientId ? { client: clientId } : {};
      const contactsResponse = await apiClient.getContacts(params);
      setContactsData(contactsResponse.results || contactsResponse);
      console.log('Contactos cargados:', contactsResponse);
    } catch (err: any) {
      console.error('Error cargando contactos:', err);
      console.error('Error details:', {
        message: err.message,
        status: err.status,
        response: err.response
      });
      error(`Error al cargar contactos: ${err.message || 'Error desconocido'}`);
    }
  };

  /**
 * Cargar datos de aplicaciones desde el backend
 */
  const loadApplicationsData = async () => {
    try {
      setApplicationsData(prev => ({ ...prev, loading: true }));

      console.log('🔵 Cargando aplicaciones desde el backend...');
      const response = await apiClient.getCandidateApplications();

      // El backend puede devolver datos en .results (paginado) o directamente
      const applications = (response as any)?.results || (response as any) || [];

      console.log('✅ Aplicaciones cargadas:', applications.length);

      // ← AGREGAR ESTE LOG PARA VER LOS DATOS
      console.log('📊 Primera aplicación completa:', applications[0]);
      console.log('📊 ¿Tiene candidate_name?', applications[0]?.candidate_name);
      console.log('📊 ¿Tiene candidate_email?', applications[0]?.candidate_email);

      // Calcular estadísticas
      const stats = {
        total: applications.length,
        active: applications.filter((app: any) =>
          !['rejected', 'withdrawn', 'accepted'].includes(app.status)
        ).length,
        shortlisted: applications.filter((app: any) =>
          app.status === 'shortlisted'
        ).length,
        rejected: applications.filter((app: any) =>
          ['rejected', 'withdrawn'].includes(app.status)
        ).length,
        recent: applications.slice(0, 5),
        loading: false
      };

      setApplicationsData(stats);
      console.log('📊 Estadísticas de aplicaciones:', stats);

    } catch (error: any) {
      console.error('❌ Error al cargar aplicaciones:', error);
      setApplicationsData({
        total: 0,
        active: 0,
        shortlisted: 0,
        rejected: 0,
        recent: [],
        loading: false
      });
    }

  };


  /**
   * Cargar datos de documentos desde el backend
   */
  const loadDocumentsData = async () => {
    try {
      setDocumentsData(prev => ({ ...prev, loading: true }));

      console.log('🔵 Cargando documentos desde el backend...');
      const response = await apiClient.getCandidateDocuments();

      const documents = (response as any)?.results || (response as any) || [];

      console.log('✅ Documentos cargados:', documents.length);

      const stats = {
        total: documents.length,
        by_type: {
          cv: documents.filter((d: any) => d.document_type === 'cv').length,
          contract: documents.filter((d: any) =>
            d.document_type === 'contract' || d.document_type === 'cover_letter'
          ).length,
          report: documents.filter((d: any) => d.document_type === 'certificate').length,
          other: documents.filter((d: any) =>
            !['cv', 'contract', 'cover_letter', 'certificate'].includes(d.document_type)
          ).length,
        },
        recent: documents.slice(0, 5),  // ← AGREGAR ESTA LÍNEA: Tomar los 5 más recientes
        loading: false
      };

      setDocumentsData(stats);
      console.log('📊 Estadísticas de documentos:', stats);

    } catch (error: any) {
      console.error('❌ Error al cargar documentos:', error);
      setDocumentsData({
        total: 0,
        by_type: { cv: 0, contract: 0, report: 0, other: 0 },
        recent: [],  // ← AGREGAR ESTA LÍNEA
        loading: false
      });
    }
  };

  /**
   * Cargar datos de notas desde el backend
   */
  const loadNotesData = async () => {
    try {
      setNotesData(prev => ({ ...prev, loading: true }));

      console.log('🔵 Cargando notas desde el backend...');
      const response = await apiClient.getCandidateNotes();

      const notes = (response as any)?.results || (response as any) || [];

      console.log('✅ Notas cargadas:', notes.length);

      // Contar por tipo de nota
      const stats = {
        total: notes.length,
        by_type: {
          interview: notes.filter((n: any) => n.note_type === 'interview').length,
          evaluation: notes.filter((n: any) => n.note_type === 'evaluation').length,
          concern: notes.filter((n: any) => n.note_type === 'concern').length,
          general: notes.filter((n: any) => n.note_type === 'general').length,
          reference: notes.filter((n: any) => n.note_type === 'reference').length,
        },
        recent: notes, // ← TODAS las notas (no solo 2)
        loading: false
      };

      setNotesData(stats);
      console.log('📊 Estadísticas de notas:', stats);

    } catch (error: any) {
      console.error('❌ Error al cargar notas:', error);
      setNotesData({
        total: 0,
        by_type: { interview: 0, evaluation: 0, concern: 0, general: 0, reference: 0 },
        recent: [],
        loading: false
      });
    }
  };

  const createClient = async (clientData: Partial<Client>) => {
    try {
      setLoading(true);
      const newClient = await apiClient.createClient(clientData);
      await loadClientsData(); // Recargar lista
      success('Cliente creado exitosamente');
      return newClient;
    } catch (err: any) {
      console.error('Error creando cliente:', err);
      error('Error al crear cliente');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateClient = async (id: number, clientData: Partial<Client>) => {
    try {
      setLoading(true);
      const updatedClient = await apiClient.updateClient(id, clientData);
      await loadClientsData(); // Recargar lista
      success('Cliente actualizado exitosamente');
      return updatedClient;
    } catch (err: any) {
      console.error('Error actualizando cliente:', err);
      error('Error al actualizar cliente');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteClient = async (id: number) => {
    try {
      setLoading(true);
      await apiClient.deleteClient(id);
      await loadClientsData(); // Recargar lista
      success('Cliente eliminado exitosamente');
    } catch (err: any) {
      console.error('Error eliminando cliente:', err);
      error('Error al eliminar cliente');
    } finally {
      setLoading(false);
    }
  };

  const createContact = async (contactData: Partial<ContactPerson>) => {
    try {
      setLoading(true);
      const newContact = await apiClient.createContact(contactData);
      await loadContactsData(); // Recargar lista
      success('Contacto creado exitosamente');
      return newContact;
    } catch (err: any) {
      console.error('Error creando contacto:', err);
      error('Error al crear contacto');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateContact = async (id: number, contactData: Partial<ContactPerson>) => {
    try {
      setLoading(true);
      const updatedContact = await apiClient.updateContact(id, contactData);
      await loadContactsData(); // Recargar lista
      success('Contacto actualizado exitosamente');
      return updatedContact;
    } catch (err: any) {
      console.error('Error actualizando contacto:', err);
      error('Error al actualizar contacto');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deleteContact = async (id: number) => {
    try {
      setLoading(true);
      await apiClient.deleteContact(id);
      await loadContactsData(); // Recargar lista
      success('Contacto eliminado exitosamente');
    } catch (err: any) {
      console.error('Error eliminando contacto:', err);
      error('Error al eliminar contacto');
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    localStorage.removeItem("directorCurrentView");
    setTimeout(() => router.push("/auth"), 300);
  };

  const debouncedSearch = useDebounce((q: string) => {
    if (q.trim().length > 2) info(`Buscando: ${q}`);
  }, 300);

  // ====== Helpers UI ======
  const getNavItemClass = (view: typeof currentView) =>
    currentView === view
      ? "bg-primary-50 text-primary-700 border-r-2 border-primary-600"
      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900";

  // Close dropdowns al hacer click fuera (click global)
  useEffect(() => {
    const closeAll = () => {
      setNotifOpen(false);
      setProfileOpen(false);
    };
    window.addEventListener("click", closeAll);
    return () => window.removeEventListener("click", closeAll);
  }, []);

  // Evitar que clicks internos cierren dropdowns
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className="min-h-screen bg-gray-50 fixed inset-0 overflow-y-auto" onClick={() => { }}>
      {/* Loading Overlay */}
      {loading && (
        <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4" />
            <p className="text-gray-600">Cargando dashboard...</p>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-60 space-y-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2 rounded-lg shadow text-white ${t.type === "success"
              ? "bg-green-600"
              : t.type === "warning"
                ? "bg-yellow-600"
                : t.type === "error"
                  ? "bg-red-600"
                  : "bg-gray-800"
              }`}
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-40">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo y Título */}
            <div className="flex items-center">
              <button
                onClick={() => {
                  const newState = !sidebarOpen;
                  setSidebarOpen(newState);
                  localStorage.setItem('sidebarOpen', String(newState));
                }}
                className="mr-4 p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title={sidebarOpen ? "Ocultar menú" : "Mostrar menú"}
              >
                <i className={`fas ${sidebarOpen ? 'fa-times' : 'fa-bars'} text-xl`}></i>
              </button>
              <div className="flex items-center space-x-3">
                
                <div className="flex items-center gap-3">
  {/* Favicon de bausen */}
  {/* <NextImage
    src={verticalLogo}
    alt="Icono"
    width={32}
    height={32}
    className="rounded-lg"
    priority
  /> */}

  {/* Logo */}
  <div className="flex flex-col leading-tight">
    <NextImage
      src={bausenLogo}
      alt="Sistema de Reclutamiento"
      width={160}
      height={32}
      className="h-8 w-auto"
      priority
    />
    <p className="text-xs text-gray-500">Panel Directivo</p>
  </div>
</div>


              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="hidden md:flex items-center">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar candidatos, procesos..."
                    className="w-64 px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      debouncedSearch(e.target.value);
                    }}
                  />
                  <i className="fas fa-search absolute left-3 top-3 text-gray-400"></i>
                </div>
              </div>

              {/* Notificaciones */}
              <div className="relative" onClick={stop}>
                <button
                  onClick={() => setNotifOpen(!notifOpen)}
                  className="relative p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <i className="fas fa-bell text-xl"></i>
                  {notifications.unread > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                  )}
                </button>

                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                    <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
                      <h3 className="font-semibold text-gray-900">Notificaciones</h3>
                      <div className="text-xs text-gray-500 flex items-center space-x-3">
                        <span>{notifications.unread} sin leer • {notifications.readItems.length} leídas</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); loadNotificationsFromAPI(true); }}
                          className="p-1 rounded hover:bg-blue-50 flex items-center"
                          title="Recargar notificaciones"
                          aria-label="Recargar notificaciones"
                          aria-busy={notifLoading ? true : undefined}
                        >
                          {notifLoading ? (
                            <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                            </svg>
                          ) : (
                            <i className="fas fa-sync-alt text-blue-600 inline-block" />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="max-h-96 overflow-y-auto px-2">
                      {/* Unread section */}
                      <div className="py-2">
                        <div className="flex items-center justify-between px-3 mb-2">
                          <div className="text-sm font-medium text-gray-700">No leídas</div>
                          <button
                            onClick={(e) => { e.stopPropagation(); markAllNotificationsRead(); }}
                            disabled={markingAll || notifications.unreadItems.length === 0}
                            className={`text-xs ${markingAll ? 'text-gray-400' : 'text-blue-600 hover:underline'}`}
                            title="Marcar todas como leídas"
                            aria-busy={markingAll ? true : undefined}
                          >
                            {markingAll ? (
                              <svg className="animate-spin h-4 w-4 text-blue-600 inline-block" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                              </svg>
                            ) : 'Marcar todas como leídas'}
                          </button>
                        </div>

                        {notifications.unreadItems.length === 0 ? (
                          <div className="px-3 py-4 text-center text-sm text-gray-500">No hay notificaciones sin leer</div>
                        ) : (
                          notifications.unreadItems.map((n) => (
                            <div id={`notif-${n.id}`} key={n.id} onClick={() => handleNotificationClick(n)} className="px-3 py-2 hover:bg-gray-50 cursor-pointer rounded">
                              <div className="flex items-start space-x-3">
                                <i className={`${n.icon} text-blue-600 text-sm mt-1`}></i>
                                <div className="flex-1">
                                  <p className="text-sm text-gray-900">{n.message}</p>
                                  <p className="text-xs text-gray-500">{n.time}</p>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      <hr className="my-2 border-t border-gray-100" />

                      {/* Read section */}
                      <div className="py-2">
                        <div className="flex items-center justify-between px-3 mb-2">
                          <div className="text-sm font-medium text-gray-700">Leídas</div>
                          <div className="flex items-center space-x-3">
                            <button onClick={() => clearReadNotifications()} className="text-xs text-red-600 hover:underline">Borrar historial</button>
                          </div>
                        </div>
                        {notifications.readItems.length === 0 ? (
                          <div className="px-3 py-4 text-center text-sm text-gray-500">No hay notificaciones leídas</div>
                        ) : (
                          notifications.readItems.map((n) => (
                            <div id={`read-notif-${n.id}`} key={`read-${n.id}`} className="px-3 py-2 rounded hover:bg-gray-50 cursor-pointer opacity-80 flex items-start justify-between transition-all duration-300">
                              <div onClick={() => handleNotificationClick(n)} className="flex items-start space-x-3 flex-1">
                                <i className={`${n.icon} text-gray-400 text-sm mt-1`}></i>
                                <div className="flex-1">
                                  <p className="text-sm text-gray-700">{n.message}</p>
                                  <p className="text-xs text-gray-500">{n.time}</p>
                                </div>
                              </div>
                              <div className="ml-3 flex items-center space-x-2">
                                <button onClick={() => markNotificationUnread(n)} className="text-xs text-blue-600 hover:underline">Marcar no leído</button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                    </div>
                  </div>
                )}
              </div>

              {/* User Menu */}
              <div className="relative" onClick={stop}>
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center space-x-2 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {currentUser
                        ? `${currentUser.first_name?.[0] || ''}${currentUser.last_name?.[0] || ''}`.toUpperCase() || currentUser.email?.[0]?.toUpperCase() || 'U'
                        : 'DR'}
                    </span>
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {currentUser
                        ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || currentUser.email
                        : 'Director RH'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {currentUser?.role === 'admin' ? 'Administrador'
                        : currentUser?.role === 'director' ? 'Director'
                        : currentUser?.role === 'supervisor' ? 'Supervisor'
                        : 'Director'}
                    </p>
                  </div>
                  <i className="fas fa-chevron-down text-gray-400 text-xs"></i>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-2">
                    <button
                      onClick={() => { setProfileOpen(false); setUserProfileModalOpen(true); }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <i className="fas fa-user mr-2 text-blue-500"></i>Mi Perfil
                    </button>
                    <button
                      onClick={() => { setProfileOpen(false); setSettingsModalOpen(true); }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <i className="fas fa-cog mr-2 text-slate-500"></i>Configuración
                    </button>
                    <hr className="my-2" />
                    <button
                      onClick={logout}
                      className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100 transition-colors"
                    >
                      <i className="fas fa-sign-out-alt mr-2"></i>Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Overlay cuando sidebar está abierta */}
      {sidebarOpen && (
        <div
          className="fixed top-16 left-0 right-0 bottom-0  z-20 transition-opacity duration-300" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Layout: Sidebar + Main Content */}
      <div className="flex">
        {/* Sidebar */}
        <aside className={`fixed left-0 top-16 bottom-0 w-64 bg-white border-r border-gray-200 ${mounted ? 'transition-transform duration-300' : ''
          } ease-in-out z-30 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
          {/* 🔧 WRAPPER PRINCIPAL - Controla el layout */}
          <div className="h-full flex flex-col">

            {/* Sidebar Header - Fijo arriba */}
            <div className="p-6 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 shrink-0 bg-linear-to-br from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                  <i className="fas fa-chart-line text-white text-sm"></i>
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-gray-900 truncate">Panel de Control</h2>
                  <p className="text-xs text-gray-500 truncate">
                    {currentUser
                      ? `${currentUser.first_name || ''} ${currentUser.last_name || ''}`.trim() || currentUser.email
                      : 'Director RH'}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation - Con scroll independiente */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-4">
                <ul className="space-y-1">
                  {/* 1. DASHBOARD */}
                  <li>
                    <button onClick={() => {
                      setCurrentView("dashboard");
                      if (window.innerWidth < 1024) {
                        setSidebarOpen(false);
                      }
                    }} className={`sidebar-item flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all w-full ${getNavItemClass("dashboard")}`}>
                      <i className="fas fa-chart-line mr-3 w-5" />
                      <span className="flex-1 text-left">Dashboard</span>
                    </button>
                  </li>

                  {/* 2. CLIENTES */}
                  <li>
                    <button
                      onClick={() => {
                        setCurrentView("clients");
                        if (window.innerWidth < 1024) {
                          setSidebarOpen(false);
                        }
                      }}
                      className={`sidebar-item flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all w-full ${getNavItemClass("clients")}`}
                    >
                      <i className="fas fa-building mr-3 w-5" />
                      <span className="flex-1 text-left">Clientes</span>
                    </button>
                  </li>

                  {/* 3. PERFILES DE RECLUTAMIENTO */}
                  <li>
                    <button
                      onClick={() => {
                        setCurrentView("profiles");
                        if (window.innerWidth < 1024) {
                          setSidebarOpen(false);
                        }
                      }}
                      className={`sidebar-item flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all w-full ${getNavItemClass("profiles")}`}
                    >
                      <i className="fas fa-briefcase mr-3 w-5" />
                      <span className="flex-1 text-left">Perfiles de Reclutamiento</span>
                      {stats.activeProfiles > 0 && (
                        <span className="ml-auto bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                          {stats.activeProfiles}
                        </span>
                      )}
                    </button>
                  </li>

                  {/* 4. CANDIDATOS */}
                  <li>
                    <button
                      onClick={() => {
                        setCurrentView("candidates");
                        if (window.innerWidth < 1024) {
                          setSidebarOpen(false);
                        }
                      }}
                      className={`sidebar-item flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all w-full ${getNavItemClass("candidates")}`}
                    >
                      <i className="fas fa-user-tie mr-3 w-5" />
                      <span className="flex-1 text-left">Candidatos</span>
                    </button>
                  </li>

                  {/* 5. SISTEMA DE EVALUACIONES */}
                  <li>
                    <button
                      onClick={() => {
                        setCurrentView("evaluations");
                        if (window.innerWidth < 1024) {
                          setSidebarOpen(false);
                        }
                      }}
                      className={`sidebar-item flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all w-full ${getNavItemClass("evaluations")}`}
                    >
                      <i className="fas fa-clipboard-check mr-3 w-5" />
                      <span className="flex-1 text-left">Sistema de Evaluaciones</span>
                    </button>
                  </li>

                  {/* 6. AVANCE DE CLIENTE - ACTIVO ✅ */}
                  <li>
                    <button
                      onClick={() => {
                        setCurrentView("client-progress");
                        if (window.innerWidth < 1024) {
                          setSidebarOpen(false);
                        }
                      }}
                      className={`sidebar-item flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all w-full ${getNavItemClass("client-progress")}`}
                    >
                      <i className="fas fa-chart-area mr-3 w-5" />
                      <span className="flex-1 text-left">Avance de Cliente</span>
                    </button>
                  </li>

                  {/* REPORTES */}
                  <li>
                    <button
                      onClick={() => {
                        setCurrentView("reports");
                        if (window.innerWidth < 1024) {
                          setSidebarOpen(false);
                        }
                      }}
                      className={`sidebar-item flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all w-full ${getNavItemClass("reports")}`}
                    >
                      <i className="fas fa-chart-bar mr-3 w-5" />
                      <span className="flex-1 text-left">Reportes</span>
                    </button>
                  </li>

                  {/* 8. ESTADO DE PERFILES */}
                  <li>
                    <button
                      onClick={() => {
                        setCurrentView("profiles-status");
                        if (window.innerWidth < 1024) {
                          setSidebarOpen(false);
                        }
                      }}
                      className={`sidebar-item flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all w-full ${getNavItemClass("profiles-status")}`}
                    >
                      <i className="fas fa-tasks mr-3 w-5" />
                      <span className="flex-1 text-left">Estatus de Perfiles</span>
                    </button>
                  </li>

                  {/* 9. ESTADO DE CANDIDATOS */}
                  <li>
                    <button
                      onClick={() => {
                        setCurrentView("candidates-status");
                        if (window.innerWidth < 1024) {
                          setSidebarOpen(false);
                        }
                      }}
                      className={`sidebar-item flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all w-full ${getNavItemClass("candidates-status")}`}
                    >
                      <i className="fas fa-user-check mr-3 w-5" />
                      <span className="flex-1 text-left">Estatus de Candidatos</span>
                    </button>
                  </li>

                  {/* 10. PRESELECCIONADOS */}
                  <li>
                    <button
                      onClick={() => {
                        setCurrentView("shortlisted-candidates");
                        if (window.innerWidth < 1024) {
                          setSidebarOpen(false);
                        }
                      }}
                      className={`sidebar-item flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all w-full ${getNavItemClass("shortlisted-candidates")}`}
                    >
                      <i className="fas fa-star mr-3 w-5" />
                      <span className="flex-1 text-left">Preseleccionados</span>
                    </button>
                  </li>

                  {/* 11. CANDIDATOS SELECCIONADOS */}
                  <li>
                    <button
                      onClick={() => {
                        setCurrentView("selected-candidates");
                        if (window.innerWidth < 1024) {
                          setSidebarOpen(false);
                        }
                      }}
                      className={`sidebar-item flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all w-full ${getNavItemClass("selected-candidates")}`}
                    >
                      <i className="fas fa-user-check mr-3 w-5" />
                      <span className="flex-1 text-left">Candidatos Seleccionados</span>
                    </button>
                  </li>

                  {/* 12. REPORTES INDIVIDUALES */}
                  <li>
                    <button
                      onClick={() => {
                        setCurrentView("individual-reports");
                        if (window.innerWidth < 1024) {
                          setSidebarOpen(false);
                        }
                      }}
                      className={`sidebar-item flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all w-full ${getNavItemClass("individual-reports")}`}
                    >
                      <i className="fas fa-file-alt mr-3 w-5" />
                      <span className="flex-1 text-left">Reportes Individuales</span>
                    </button>
                  </li>
                  <li>
                    {/* 12. GESTIÓN DE CORREOS */}
                    <button
                      onClick={() => {
                        setCurrentView("email-management");
                        if (window.innerWidth < 1024) {
                          setSidebarOpen(false);
                        }
                      }}
                      className={`sidebar-item flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all w-full ${getNavItemClass("email-management")}`}
                    >
                      <i className="fas fa-envelope mr-3 w-5" />
                      <span className="flex-1 text-left">Gestión de Correos</span>
                    </button>
                  </li>

                </ul>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 pt-16 bg-gray-50 transition-all duration-300 relative z-25 min-h-screen ${sidebarOpen ? 'lg:ml-64' : 'ml-0'
          }`}>
          {/* DASHBOARD */}
          {currentView === "dashboard" && (
            <div className="p-6 max-w-[1600px] mx-auto">
              {/* Encabezado */}
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Panel Directivo</h2>
                    <p className="text-gray-600 mt-1">Resumen ejecutivo</p>
                  </div>
                  <div className="mt-4 sm:mt-0 flex space-x-3">
                    <button onClick={refreshDashboard} disabled={dashboardLoading} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50">
                      <i className={`fas fa-sync mr-2 ${dashboardLoading ? 'animate-spin' : ''}`} /> Actualizar
                    </button>
                    <button onClick={exportDashboard} className="px-4 py-2 btn-primary text-white rounded-lg">
                      <i className="fas fa-download mr-2" /> Exportar
                    </button>
                  </div>
                </div>
              </div>

              {/* ====== 6 KPI CARDS ====== */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                {/* Procesos Activos */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-blue-50 rounded-lg"><i className="fas fa-briefcase text-blue-600" /></div>
                    {(() => { const prev = lastMonthData.profiles || 1; const pct = Math.round(((stats.activeProcesses - prev) / prev) * 100); const up = pct >= 0; return (<span className={`text-xs font-semibold ${up ? 'text-green-600' : 'text-red-600'}`}><i className={`fas fa-arrow-${up ? 'up' : 'down'} mr-1`} />{Math.abs(pct)}%</span>); })()}
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeProcesses}</p>
                  <p className="text-xs text-gray-500 mt-1">Procesos Activos</p>
                </div>
                {/* Total Candidatos */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-green-50 rounded-lg"><i className="fas fa-users text-green-600" /></div>
                    {(() => { const prev = lastMonthData.candidates || 1; const pct = Math.round(((candidates.length - prev) / prev) * 100); const up = pct >= 0; return (<span className={`text-xs font-semibold ${up ? 'text-green-600' : 'text-red-600'}`}><i className={`fas fa-arrow-${up ? 'up' : 'down'} mr-1`} />{Math.abs(pct)}%</span>); })()}
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{candidates.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Total Candidatos</p>
                </div>
                {/* Tasa de Exito */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-purple-50 rounded-lg"><i className="fas fa-chart-line text-purple-600" /></div>
                    {(() => { const prev = lastMonthData.success_rate || 0; const diff = stats.successRate - prev; const up = diff >= 0; return (<span className={`text-xs font-semibold ${up ? 'text-green-600' : 'text-red-600'}`}><i className={`fas fa-arrow-${up ? 'up' : 'down'} mr-1`} />{Math.abs(Math.round(diff))}%</span>); })()}
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.successRate}%</p>
                  <p className="text-xs text-gray-500 mt-1">Tasa de Exito</p>
                </div>
                {/* Contratados Este Mes */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-emerald-50 rounded-lg"><i className="fas fa-user-check text-emerald-600" /></div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedCandidates}</p>
                  <p className="text-xs text-gray-500 mt-1">Contratados (mes)</p>
                </div>
                {/* Aprobaciones Pendientes */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-amber-50 rounded-lg"><i className="fas fa-clock text-amber-600" /></div>
                    {pendingApprovals.length > 0 && <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">{pendingApprovals.length}</span>}
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{pendingApprovals.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Pend. Aprobacion</p>
                </div>
                {/* Candidatos Estancados */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-red-50 rounded-lg"><i className="fas fa-exclamation-triangle text-red-600" /></div>
                    {stagnantCandidates.length > 0 && <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-0.5 rounded-full">{stagnantCandidates.length}</span>}
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stagnantCandidates.length}</p>
                  <p className="text-xs text-gray-500 mt-1">Cand. Estancados</p>
                </div>
              </div>

              {/* ====== TREND CHART + REGRESSION ====== */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900"><i className="fas fa-chart-line text-blue-600 mr-2" />Tendencia + Regresion Lineal (12 meses)</h3>
                    <p className="text-sm text-gray-500 mt-1">Lineas punteadas = regresion lineal con prediccion a 3 meses</p>
                  </div>
                  {candidateRegression && hireRegression && (
                    <div className="hidden lg:flex items-center space-x-3 text-xs">
                      <div className="bg-blue-50 px-3 py-1.5 rounded-lg">
                        <span className="text-blue-700 font-semibold">Candidatos: {candidateRegression.slope >= 0 ? '+' : ''}{candidateRegression.slope.toFixed(2)}/mes</span>
                        <span className="text-blue-500 ml-2">R2={candidateRegression.r2.toFixed(3)}</span>
                      </div>
                      <div className="bg-green-50 px-3 py-1.5 rounded-lg">
                        <span className="text-green-700 font-semibold">Contrataciones: {hireRegression.slope >= 0 ? '+' : ''}{hireRegression.slope.toFixed(2)}/mes</span>
                        <span className="text-green-500 ml-2">R2={hireRegression.r2.toFixed(3)}</span>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ height: 340 }}><canvas ref={trendChartRef} /></div>
                {candidateRegression && hireRegression && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-blue-600 font-medium">Prediccion Candidatos (3 meses)</p>
                      <p className="text-xl font-bold text-blue-800">~{Math.round(candidateRegression.predict(trendData.length + 2))}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-green-600 font-medium">Prediccion Contrataciones (3 meses)</p>
                      <p className="text-xl font-bold text-green-800">~{Math.round(hireRegression.predict(trendData.length + 2))}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-purple-600 font-medium">Tendencia General</p>
                      <p className="text-xl font-bold text-purple-800">{candidateRegression.slope > 0.1 ? 'Creciente' : candidateRegression.slope < -0.1 ? 'Decreciente' : 'Estable'}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* ====== ROW: Process Doughnut + Pipeline Funnel ====== */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Procesos por Estatus (Doughnut) */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4"><i className="fas fa-chart-pie text-purple-600 mr-2" />Perfiles por Estatus</h3>
                  <div style={{ height: 280 }}><canvas ref={processChartRef} /></div>
                  {processesByStatus.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {processesByStatus.map(s => (
                        <div key={s.status} className="flex items-center text-xs">
                          <div className="w-3 h-3 rounded-full mr-2 shrink-0" style={{ backgroundColor: s.color }} />
                          <span className="text-gray-600 truncate">{s.label}</span>
                          <span className="ml-auto font-bold text-gray-800">{s.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Pipeline Funnel */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4"><i className="fas fa-filter text-blue-600 mr-2" />Embudo de Reclutamiento</h3>
                  <div style={{ height: 280 }}><canvas ref={pipelineChartRef} /></div>
                  {funnelData.length >= 2 && (
                    <div className="mt-3 space-y-2">
                      {funnelData.slice(1).map((stage, i) => {
                        const prevCount = funnelData[i].count || 1;
                        const convRate = Math.round((stage.count / prevCount) * 100);
                        return (
                          <div key={stage.label} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">{funnelData[i].label} &rarr; {stage.label}</span>
                            <div className="flex items-center">
                              <div className="w-20 bg-gray-200 rounded-full h-1.5 mr-2">
                                <div className="h-1.5 rounded-full" style={{ width: `${convRate}%`, backgroundColor: stage.color }} />
                              </div>
                              <span className="font-semibold text-gray-700 w-8 text-right">{convRate}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ====== ROW: Candidate Distribution + Source Effectiveness ====== */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Candidate Distribution */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4"><i className="fas fa-users text-green-600 mr-2" />Distribucion de Candidatos</h3>
                  <div style={{ height: 280 }}><canvas ref={distributionChartRef} /></div>
                </div>

                {/* Source Effectiveness */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4"><i className="fas fa-bullseye text-orange-600 mr-2" />Efectividad por Fuente</h3>
                  {sourceEffectiveness.length > 0 ? (
                    <div style={{ height: 280 }}><canvas ref={sourceBarChartRef} /></div>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-400"><div className="text-center"><i className="fas fa-chart-bar text-4xl mb-2" /><p className="text-sm">Sin datos de fuentes</p></div></div>
                  )}
                </div>
              </div>

              {/* ====== ROW: Actividad Reciente + Alertas Estancados ====== */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Actividad Reciente */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900"><i className="fas fa-bolt text-blue-600 mr-2" />Actividad Reciente</h3>
                  </div>
                  <div className="space-y-4 max-h-72 overflow-y-auto">
                    {recentActivity.map((a) => {
                      const color = a.type === 'success' ? 'bg-green-100 text-green-600' : a.type === 'info' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600';
                      return (
                        <div key={a.id} className="flex items-start space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${color.split(' ').slice(0, 1).join(' ')}`}>
                            <i className={`${a.icon} ${color.split(' ').slice(1).join(' ')}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 font-medium">{a.message}</p>
                            <p className="text-xs text-gray-500">{a.details}</p>
                            <p className="text-xs text-gray-400">{a.time}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Candidatos Estancados */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    <i className="fas fa-exclamation-triangle text-amber-600 mr-2" />Candidatos Estancados
                    {stagnantCandidates.length > 0 && <span className="ml-2 bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded-full">{stagnantCandidates.length}</span>}
                  </h3>
                  <p className="text-xs text-gray-500 mb-3">Sin cambio de estado por mas de 14 dias</p>
                  {stagnantCandidates.length > 0 ? (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {stagnantCandidates.map((c: any) => {
                        const name = `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Sin nombre';
                        const STATUS_LABELS: Record<string, string> = { new: 'Nuevo', screening: 'En Revision', qualified: 'Calificado', interview: 'Entrevista' };
                        const days = c.updated_at ? Math.floor((Date.now() - new Date(c.updated_at).getTime()) / (1000 * 60 * 60 * 24)) : 0;
                        return (
                          <div key={c.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100">
                            <div className="flex items-center space-x-3">
                              <img className="h-8 w-8 rounded-full border-2 border-amber-200" src={`https://ui-avatars.com/?name=${encodeURIComponent(name)}&background=F59E0B&color=fff&size=32`} alt={name} />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{name}</p>
                                <p className="text-xs text-gray-500">{STATUS_LABELS[c.status] || c.status}</p>
                              </div>
                            </div>
                            <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full"><i className="fas fa-clock mr-1" />{days}d</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-green-500"><div className="text-center"><i className="fas fa-check-circle text-4xl mb-2" /><p className="text-sm text-gray-500">Sin candidatos estancados</p></div></div>
                  )}
                </div>
              </div>

              {/* ====== APROBACIONES PENDIENTES ====== */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
                <div className="px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900"><i className="fas fa-user-check text-green-600 mr-2" />Aprobaciones Pendientes</h3>
                    <span className="bg-red-100 text-red-800 text-xs font-medium px-3 py-1 rounded-full">{pendingApprovals.length} pendientes</span>
                  </div>
                </div>
                {pendingApprovals.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {['Candidato', 'Posicion', 'Cliente', 'Score IA', 'Supervisor', 'Acciones'].map((h) => (
                            <th key={h} className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${h === 'Acciones' ? 'text-right' : 'text-left'}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pendingApprovals.map((a) => (
                          <tr key={a.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <img className="h-9 w-9 rounded-full border-2 border-gray-200" src={`https://ui-avatars.com/?name=${encodeURIComponent(a.candidate)}&background=random&size=36`} alt={a.candidate} />
                                <div className="ml-3"><p className="text-sm font-medium text-gray-900">{a.candidate}</p><p className="text-xs text-gray-500">{a.email}</p></div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap"><p className="text-sm text-gray-900">{a.position}</p>{a.department && <p className="text-xs text-gray-500">{a.department}</p>}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{a.client || '--'}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${a.score >= 80 ? 'bg-green-100 text-green-800' : a.score >= 60 ? 'bg-yellow-100 text-yellow-800' : a.score > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>{a.score > 0 ? `${a.score}%` : '--'}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{a.supervisor}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2">
                                <button onClick={() => approveCandidate(a.id)} className="text-green-600 hover:text-green-900 p-1 rounded" title="Aprobar"><i className="fas fa-check" /></button>
                                <button onClick={() => rejectCandidate(a.id)} className="text-red-600 hover:text-red-900 p-1 rounded" title="Rechazar"><i className="fas fa-times" /></button>
                                <button onClick={() => viewCandidate(a.id)} className="text-blue-600 hover:text-blue-900 p-1 rounded" title="Ver detalles"><i className="fas fa-eye" /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12"><i className="fas fa-check-circle text-5xl text-gray-300 mb-3" /><p className="text-gray-500">No hay aprobaciones pendientes</p></div>
                )}
              </div>

              {/* ====== PROFILES BY STATUS TILES ====== */}
              {profilesByStatus2.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4"><i className="fas fa-th-large text-indigo-600 mr-2" />Perfiles por Estatus (detalle)</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {profilesByStatus2.map((s) => {
                      const PCOLORS: Record<string, string> = { draft: '#9CA3AF', pending: '#F59E0B', approved: '#10B981', in_progress: '#3B82F6', candidates_found: '#06B6D4', in_evaluation: '#F97316', in_interview: '#6366F1', finalists: '#EC4899', completed: '#059669', cancelled: '#EF4444' };
                      const PLABELS: Record<string, string> = { draft: 'Borrador', pending: 'Pendiente', approved: 'Aprobado', in_progress: 'En Proceso', candidates_found: 'Cand. Encontrados', in_evaluation: 'En Evaluacion', in_interview: 'Entrevistas', finalists: 'Finalistas', completed: 'Completado', cancelled: 'Cancelado' };
                      const color = PCOLORS[s.status] || '#6B7280';
                      return (
                        <div key={s.status} className="rounded-lg p-4 text-center border" style={{ backgroundColor: `${color}10`, borderColor: `${color}30` }}>
                          <p className="text-2xl font-bold" style={{ color }}>{s.count}</p>
                          <p className="text-xs text-gray-600 mt-1">{PLABELS[s.status] || s.status}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PROCESSES */}
          {currentView === "processes" && (
            <div className="p-6">
              <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Gestión de Procesos</h2>
                  <p className="text-gray-600 mt-1">Administra y supervisa todos los procesos de reclutamiento activos</p>
                </div>
                <div className="mt-4 sm:mt-0 flex space-x-3">
                  <button
                    onClick={refreshProcesses}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <i className="fas fa-sync mr-2" />
                    Actualizar
                  </button>
                  <button onClick={openNewProcessModal} className="px-4 py-2 btn-primary text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <i className="fas fa-plus mr-2" />
                    Nuevo Proceso
                  </button>
                </div>
              </div>

              {/* Filtros (visual) */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {["Estatus", "Cliente", "Prioridad"].map((label, i) => (
                    <div key={label}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
                      <select className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <option value="">Todos</option>
                        {i === 0 && (
                          <>
                            <option value="active">Activos</option>
                            <option value="paused">Pausados</option>
                            <option value="completed">Completados</option>
                          </>
                        )}
                        {i === 1 && (
                          <>
                            <option value="TechCorp">TechCorp</option>
                            <option value="StartupXYZ">StartupXYZ</option>
                            <option value="Innovate">Innovate Inc</option>
                          </>
                        )}
                        {i === 2 && (
                          <>
                            <option value="high">Alta</option>
                            <option value="medium">Media</option>
                            <option value="low">Baja</option>
                          </>
                        )}
                      </select>
                    </div>
                  ))}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Buscar</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar proceso..."
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                      <i className="fas fa-search absolute left-3 top-3 text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Tabla */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-semibold text-gray-900">Procesos Activos</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {["Proceso", "Cliente", "Estado", "Candidatos", "Progreso", "Responsable", "Acciones"].map((h) => (
                          <th key={h} className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${h === "Acciones" ? "text-right" : "text-left"}`}>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {processes.map((p) => (
                        <tr key={p.id} className="table-row">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{p.title}</p>
                              <p className="text-xs text-gray-500">ID: {p.processId}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.client}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${p.status === "active"
                                ? "bg-green-100 text-green-800"
                                : p.status === "paused"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-blue-100 text-blue-800"
                                }`}
                            >
                              {p.status === "active" ? "Activo" : p.status === "paused" ? "Pausado" : "Completado"}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {p.candidates.current} / {p.candidates.target}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div className="bg-primary-600 h-2 rounded-full" style={{ width: `${p.progress}%` }} />
                            </div>
                            <span className="text-xs text-gray-500 mt-1 inline-block">{p.progress}%</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.responsible}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button onClick={() => viewProcessDetails(p.id)} className="text-blue-600 hover:text-blue-900 p-1 rounded" title="Ver detalles">
                                <i className="fas fa-eye" />
                              </button>
                              <button onClick={() => info(`Editando proceso ${p.id}...`)} className="text-green-600 hover:text-green-900 p-1 rounded" title="Editar">
                                <i className="fas fa-edit" />
                              </button>
                              <button onClick={() => warning(`Pausando proceso ${p.id}...`)} className="text-red-600 hover:text-red-900 p-1 rounded" title="Pausar">
                                <i className="fas fa-pause" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {currentView === "candidates" && (
            <CandidatesMain />
          )}

          {/* OLD CANDIDATES VIEW - DISABLED */}
          {false && (
            <div className="p-6">
              <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Gestión de Candidatos</h2>
                  <p className="text-gray-600 mt-1">Visualiza y administra todos los candidatos en el sistema</p>
                </div>
                <div className="mt-4 sm:mt-0 flex space-x-3">
                  <button
                    onClick={async () => {
                      setLoading(true);
                      await loadCandidatesData();
                      setLoading(false);
                      success("Datos actualizados correctamente");
                    }}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    disabled={loading}
                  >
                    <i className={`fas fa-sync mr-2 ${loading ? 'fa-spin' : ''}`} />
                    <i className="fas fa-download mr-2" />
                    Exportar
                  </button>
                  <button onClick={openUploadCVModal} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    <i className="fas fa-upload mr-2" />
                    Subir CV
                  </button>
                  <button onClick={() => setShowCandidateForm(true)} className="px-4 py-2 btn-primary text-white rounded-lg">
                    <i className="fas fa-user-plus mr-2" />
                    Agregar Candidato
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* Total Candidatos */}
                <div className="card-hover bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-blue-100">
                      <i className="fas fa-users text-blue-600 text-xl" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Candidatos</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {candidatesOverview?.total || candidates.length || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Candidatos Activos */}
                <div className="card-hover bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-green-100">
                      <i className="fas fa-check-circle text-green-600 text-xl" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Activos</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {candidatesOverview?.by_status?.find((s: any) => s.status === 'qualified')?.count || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* En Evaluación */}
                <div className="card-hover bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-yellow-100">
                      <i className="fas fa-clipboard-check text-yellow-600 text-xl" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Aplicacion de Pruebas</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {candidatesOverview?.by_status?.find((s: any) => s.status === 'screening')?.count || 0}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Contratados */}
                <div className="card-hover bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex items-center">
                    <div className="p-3 rounded-full bg-purple-100">
                      <i className="fas fa-user-check text-purple-600 text-xl" />
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Contratados</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {candidatesOverview?.by_status?.find((s: any) => s.status === 'hired')?.count || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Grid candidatos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? (
                  <div className="col-span-full flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    <span className="ml-3 text-gray-600">Cargando candidatos...</span>
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="col-span-full text-center py-12 empty-state">
                    <i className="fas fa-user-tie text-6xl text-gray-300 mb-4" />
                    <p className="text-gray-500">No hay candidatos registrados</p>
                  </div>
                ) : (
                  candidates.map((c: any) => (
                    <div key={c.id} className="card-hover bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <img
                            className="h-12 w-12 rounded-full border-2 border-gray-200"
                            src={`https://ui-avatars.com/?name=${encodeURIComponent(c.full_name || `${c.first_name} ${c.last_name}`)}&background=3b82f6&color=fff`}
                            alt={c.full_name || `${c.first_name} ${c.last_name}`}
                          />
                          <div className="ml-3">
                            <h3 className="text-sm font-semibold text-gray-900">
                              {c.full_name || `${c.first_name} ${c.last_name}`}
                            </h3>
                            <p className="text-xs text-gray-500">{c.current_position || 'Sin posición'}</p>
                          </div>
                        </div>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${c.status === 'hired' ? 'bg-green-100 text-green-800' :
                          c.status === 'qualified' ? 'bg-blue-100 text-blue-800' :
                            c.status === 'interview' ? 'bg-purple-100 text-purple-800' :
                              c.status === 'screening' ? 'bg-yellow-100 text-yellow-800' :
                                c.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                          }`}>
                          {{
                            new: 'Nuevo',
                            screening: 'En Revisión',
                            qualified: 'Calificado',
                            interview: 'En Entrevista',
                            offer: 'Oferta Extendida',
                            hired: 'Contratado',
                            rejected: 'Rechazado',
                            withdrawn: 'Retirado',
                          }[(c.status || '') as string] || c.status || 'Nuevo'}
                        </span>
                      </div>
                      <div className="space-y-2 mb-4 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Email:</span>
                          <span className="text-gray-900 truncate ml-2">{c.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Teléfono:</span>
                          <span className="text-gray-900">{c.phone || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Experiencia:</span>
                          <span className="text-gray-900">{c.years_experience || 0} años</span>
                        </div>
                        {c.current_company && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Empresa:</span>
                            <span className="text-gray-900 truncate ml-2">{c.current_company}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <div className="flex gap-4 ml-4">
                          {/* Botón de previsualización */}
                          <button
                            onClick={() => handlePreviewProfile(c.id)}
                            className="px-6 py-3 bg-white text-gray-700 border border-gray-300 rounded-xl shadow-md hover:bg-gray-100 hover:text-blue-700 hover:border-blue-400 font-semibold flex items-center gap-2 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-300"
                            title="Vista previa del avance"
                          >
                            <i className="fas fa-eye text-lg"></i>
                            <span className="hidden sm:inline">Previsualizar</span>
                          </button>

                          {/* Botón de compartir */}
                          <button
                            onClick={() => handleGenerateShareLink(
                              c.id,
                              c.position || 'Candidato',
                              c.email
                            )}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl shadow-md hover:from-blue-700 hover:to-blue-600 font-semibold flex items-center gap-2 transition-all duration-200 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-300 border-0"
                          >
                            <i className="fas fa-share-alt text-lg"></i>
                            <span className="hidden sm:inline">Compartir Avance</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* APPLICATIONS */}
          {
            currentView === "applications" && (
              <div className="p-6">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Aplicaciones de Candidatos</h2>
                    <p className="text-gray-600 mt-1">Gestiona y da seguimiento a todas las aplicaciones de candidatos</p>
                  </div>
                  <div className="mt-4 sm:mt-0 flex space-x-3">
                    <button onClick={() => info("Exportando aplicaciones...")} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                      <i className="fas fa-download mr-2" />
                      Exportar
                    </button>
                    <button onClick={() => setShowApplicationForm(true)} className="px-4 py-2 btn-primary text-white rounded-lg">
                      <i className="fas fa-plus mr-2" />
                      Nueva Aplicación
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  <div className="card-hover bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-blue-100">
                        <i className="fas fa-briefcase text-blue-600 text-xl" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Total Aplicaciones</p>
                        {applicationsData.loading ? (
                          <div className="animate-pulse">
                            <div className="h-8 bg-gray-200 rounded w-16 mt-2"></div>
                          </div>
                        ) : (
                          <p className="text-2xl font-bold text-gray-900">{applicationsData.total}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="card-hover bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-green-100">
                        <i className="fas fa-check-circle text-green-600 text-xl" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Preseleccionados</p>
                        {applicationsData.loading ? (
                          <div className="animate-pulse">
                            <div className="h-8 bg-gray-200 rounded w-12 mt-2"></div>
                          </div>
                        ) : (
                          <p className="text-2xl font-bold text-gray-900">{applicationsData.shortlisted}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="card-hover bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-yellow-100">
                        <i className="fas fa-clock text-yellow-600 text-xl" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">En Revisión</p>
                        {applicationsData.loading ? (
                          <div className="animate-pulse">
                            <div className="h-8 bg-gray-200 rounded w-12 mt-2"></div>
                          </div>
                        ) : (
                          <p className="text-2xl font-bold text-gray-900">{applicationsData.active}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="card-hover bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <div className="flex items-center">
                      <div className="p-3 rounded-full bg-purple-100">
                        <i className="fas fa-percentage text-purple-600 text-xl" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">Tasa Conversión</p>
                        {applicationsData.loading ? (
                          <div className="animate-pulse">...</div>
                        ) : (
                          <p className="text-2xl font-bold text-gray-900">
                            {applicationsData.total > 0
                              ? Math.round((applicationsData.shortlisted / applicationsData.total) * 100)
                              : 0}%
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Aplicaciones Recientes</h3>
                    <div className="flex space-x-3">
                      <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        <option>Todos los estatus</option>
                        <option>En Revisión</option>
                        <option>Preseleccionado</option>
                        <option>Rechazado</option>
                      </select>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Candidato</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Posición</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Compatibilidad</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estatus</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {applicationsData.loading ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center">
                              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                              <p className="mt-2 text-gray-500">Cargando aplicaciones...</p>
                            </td>
                          </tr>
                        ) : applicationsData.total === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-12 text-center">
                              <div className="text-gray-400">
                                <i className="fas fa-inbox text-5xl mb-4"></i>
                                <p className="text-lg font-medium text-gray-900">No hay aplicaciones registradas</p>
                                <p className="text-gray-500 mt-1">Las aplicaciones aparecerán aquí cuando se agreguen</p>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          // Mostrar aplicaciones reales
                          applicationsData.recent.map((app: any) => {
                            // Calcular tiempo transcurrido
                            const appliedDate = new Date(app.applied_at);
                            const now = new Date();
                            const diffMs = now.getTime() - appliedDate.getTime();
                            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                            const diffDays = Math.floor(diffHours / 24);

                            let timeAgo = '';
                            if (diffHours < 1) timeAgo = 'Hace menos de 1 hora';
                            else if (diffHours < 24) timeAgo = `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
                            else if (diffDays === 1) timeAgo = 'Hace 1 día';
                            else timeAgo = `Hace ${diffDays} días`;

                            // Configuración de badge según estado
                            const getStatusBadge = (status: string) => {
                              const configs: Record<string, { color: string; label: string; icon: string }> = {
                                applied: { color: 'bg-blue-100 text-blue-800', label: 'Aplicó', icon: 'fa-clock' },
                                screening: { color: 'bg-yellow-100 text-yellow-800', label: 'En Revisión', icon: 'fa-eye' },
                                shortlisted: { color: 'bg-green-100 text-green-800', label: 'Preseleccionado', icon: 'fa-check-circle' },
                                interview_scheduled: { color: 'bg-purple-100 text-purple-800', label: 'Entrevista Programada', icon: 'fa-calendar-alt' },
                                interviewed: { color: 'bg-indigo-100 text-indigo-800', label: 'Entrevistado', icon: 'fa-user' },
                                offered: { color: 'bg-orange-100 text-orange-800', label: 'Oferta Extendida', icon: 'fa-briefcase' },
                                accepted: { color: 'bg-green-100 text-green-800', label: 'Aceptado', icon: 'fa-check-circle' },
                                rejected: { color: 'bg-red-100 text-red-800', label: 'Rechazado', icon: 'fa-times-circle' },
                                withdrawn: { color: 'bg-gray-100 text-gray-800', label: 'Retirado', icon: 'fa-times' },
                              };
                              return configs[status] || configs.applied;
                            };

                            const statusConfig = getStatusBadge(app.status);

                            // Obtener nombre del candidato
                            const candidateName = app.candidate_name || 'Candidato sin nombre';
                            const candidateEmail = app.candidate_email || 'Sin email';

                            // Iniciales para avatar
                            const initials = candidateName.split(' ')
                              .map((n: string) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase();

                            return (
                              <tr key={app.id} className="table-row hover:bg-gray-50">
                                {/* Candidato */}
                                <td className="px-6 py-4">
                                  <div className="flex items-center">
                                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                                      {initials}
                                    </div>
                                    <div className="ml-3">
                                      <p className="text-sm font-medium text-gray-900">{candidateName}</p>
                                      <p className="text-sm text-gray-500">{candidateEmail}</p>
                                    </div>
                                  </div>
                                </td>

                                {/* Posición */}
                                <td className="px-6 py-4">
                                  <p className="text-sm font-medium text-gray-900">
                                    {app.profile_title || app.profile?.position_title || 'Posición no especificada'}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    {app.profile_client || app.profile?.client_name || 'Cliente no especificado'}
                                  </p>
                                </td>

                                {/* Fecha */}
                                <td className="px-6 py-4">
                                  <p className="text-sm text-gray-900">{timeAgo}</p>
                                  <p className="text-xs text-gray-500">
                                    {appliedDate.toLocaleDateString('es-MX', {
                                      day: '2-digit',
                                      month: 'short',
                                      year: 'numeric'
                                    })}
                                  </p>
                                </td>

                                {/* Compatibilidad */}
                                <td className="px-6 py-4">
                                  {app.match_percentage !== null && app.match_percentage !== undefined ? (
                                    <div className="flex items-center">
                                      <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                        <div
                                          className={`h-2 rounded-full ${app.match_percentage >= 80 ? 'bg-green-500' :
                                            app.match_percentage >= 60 ? 'bg-yellow-500' :
                                              'bg-red-500'
                                            }`}
                                          style={{ width: `${app.match_percentage}%` }}
                                        ></div>
                                      </div>
                                      <span className="text-sm font-medium text-gray-900">
                                        {Math.round(app.match_percentage)}%
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-sm text-gray-400">No calculado</span>
                                  )}
                                </td>

                                {/* Estado */}
                                <td className="px-6 py-4">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}>
                                    <i className={`fas ${statusConfig.icon} mr-1.5`}></i>
                                    {statusConfig.label}
                                  </span>
                                </td>

                                {/* Acciones */}
                                <td className="px-6 py-4 text-right space-x-2">
                                  <button
                                    onClick={() => router.push(`/director/candidates/applications`)}
                                    className="text-blue-600 hover:text-blue-900"
                                    title="Ver detalles"
                                  >
                                    <i className="fas fa-eye"></i>
                                  </button>
                                  <button
                                    onClick={() => {
                                      console.log('Editar aplicación:', app.id);
                                      info('Funcionalidad de edición en construcción');
                                    }}
                                    className="text-green-600 hover:text-green-900"
                                    title="Editar"
                                  >
                                    <i className="fas fa-edit"></i>
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          }



          {/* Modal Formulario Nueva Aplicación */}
          <ApplicationFormModal
            isOpen={showApplicationForm}
            onClose={() => setShowApplicationForm(false)}
            onSubmit={(data) => {
              console.log("Datos del formulario:", data);
              // Aquí se manejará el envío al backend
            }}
            onSuccess={success}
          />

          {/* NOTES */}
          {
            currentView === "notes" && (
              <div className="p-6">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Notas de Candidatos</h2>
                    <p className="text-gray-600 mt-1">Gestiona notas, observaciones y comentarios sobre candidatos</p>
                  </div>
                  <div className="mt-4 sm:mt-0 flex space-x-3">
                    <button onClick={() => info("Filtrando notas...")} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                      <i className="fas fa-filter mr-2" />
                      Filtrar
                    </button>
                    <button onClick={() => setShowNoteForm(true)} className="px-4 py-2 btn-primary text-white rounded-lg">
                      <i className="fas fa-plus mr-2" />
                      Nueva Nota
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                  <i className="fas fa-sticky-note text-gray-300 text-6xl mb-4"></i>
                  <p className="text-lg font-medium text-gray-900">Sección de Notas</p>
                  <p className="text-gray-500 mt-1">
                    Las notas detalladas están en: Candidatos → Notas
                  </p>
                  <button
                    onClick={() => router.push('/director/candidates/notes')}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <i className="fas fa-arrow-right mr-2"></i>
                    Ir a Notas
                  </button>
                </div>
              </div>
            )
          }

          {/* CANDIDATE HISTORY */}
          {
            currentView === "history" && (
              <div className="p-6">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Historial de Candidatos</h2>
                    <p className="text-gray-600 mt-1">Seguimiento completo del proceso de reclutamiento por candidato</p>
                  </div>
                  <div className="mt-4 sm:mt-0 flex space-x-3">
                    <button onClick={() => info("Exportando historial...")} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                      <i className="fas fa-download mr-2" />
                      Exportar Reporte
                    </button>
                    <button onClick={() => info("Filtrando historial...")} className="px-4 py-2 btn-primary text-white rounded-lg">
                      <i className="fas fa-filter mr-2" />
                      Filtros Avanzados
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                  {historyData.loading ? (
                    // Loading skeleton
                    [1, 2, 3, 4].map((i) => (
                      <div key={i} className="card-hover bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="animate-pulse">
                          <div className="flex items-center">
                            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                            <div className="ml-4 flex-1">
                              <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                              <div className="h-6 bg-gray-200 rounded w-16"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <>
                      {/* Total Candidatos */}
                      <div className="card-hover bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center">
                          <div className="p-3 rounded-full bg-blue-100">
                            <i className="fas fa-users text-blue-600 text-xl" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Total Candidatos</p>
                            <p className="text-2xl font-bold text-gray-900">
                              {historyData.total_candidates.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Contratados */}
                      <div className="card-hover bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center">
                          <div className="p-3 rounded-full bg-green-100">
                            <i className="fas fa-check-circle text-green-600 text-xl" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Contratados</p>
                            <p className="text-2xl font-bold text-gray-900">{historyData.hired}</p>
                          </div>
                        </div>
                      </div>

                      {/* En Proceso */}
                      <div className="card-hover bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center">
                          <div className="p-3 rounded-full bg-yellow-100">
                            <i className="fas fa-clock text-yellow-600 text-xl" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">En Proceso</p>
                            <p className="text-2xl font-bold text-gray-900">{historyData.in_process}</p>
                          </div>
                        </div>
                      </div>

                      {/* Tasa de Éxito */}
                      <div className="card-hover bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-center">
                          <div className="p-3 rounded-full bg-purple-100">
                            <i className="fas fa-chart-line text-purple-600 text-xl" />
                          </div>
                          <div className="ml-4">
                            <p className="text-sm font-medium text-gray-600">Tasa Éxito</p>
                            <p className="text-2xl font-bold text-gray-900">{historyData.success_rate}%</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Timeline de candidatos */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                  <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">Línea de Tiempo Reciente</h3>
                    <div className="flex space-x-3">
                      <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                        <option>Últimos 30 días</option>
                        <option>Última semana</option>
                        <option>Hoy</option>
                      </select>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flow-root">
                      <ul className="-mb-8">
                        {historyData.loading ? (
                          // Loading skeleton
                          [1, 2, 3].map((i) => (
                            <li key={i}>
                              <div className="relative pb-8">
                                {i < 3 && <div className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"></div>}
                                <div className="relative flex space-x-3">
                                  <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                                  <div className="flex-1 space-y-2">
                                    <div className="h-4 bg-gray-200 rounded w-3/4 animate-pulse"></div>
                                    <div className="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
                                  </div>
                                </div>
                              </div>
                            </li>
                          ))
                        ) : candidates.length === 0 ? (
                          <li className="text-center py-12">
                            <i className="fas fa-inbox text-gray-300 text-5xl mb-4"></i>
                            <p className="text-gray-500">No hay actividad reciente</p>
                          </li>
                        ) : (
                          candidates.slice(0, 5).map((candidate: any, index: number) => {
                            // Determinar icono y color según estado
                            const getStatusConfig = (status: string) => {
                              const configs: Record<string, { icon: string; color: string; bgColor: string; label: string }> = {
                                hired: { icon: 'fa-user-check', color: 'text-white', bgColor: 'bg-green-500', label: 'fue contratado' },
                                interview: { icon: 'fa-comments', color: 'text-white', bgColor: 'bg-blue-500', label: 'está en entrevista' },
                                qualified: { icon: 'fa-check-circle', color: 'text-white', bgColor: 'bg-purple-500', label: 'fue calificado' },
                                new: { icon: 'fa-user-plus', color: 'text-white', bgColor: 'bg-indigo-500', label: 'se registró' },
                                screening: { icon: 'fa-search', color: 'text-white', bgColor: 'bg-yellow-500', label: 'está en revisión' },
                                rejected: { icon: 'fa-times-circle', color: 'text-white', bgColor: 'bg-red-500', label: 'fue rechazado' },
                              };
                              return configs[status] || configs.new;
                            };

                            const config = getStatusConfig(candidate.status);

                            // Calcular tiempo transcurrido
                            const updatedDate = new Date(candidate.updated_at || candidate.created_at);
                            const now = new Date();
                            const diffMs = now.getTime() - updatedDate.getTime();
                            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                            const diffDays = Math.floor(diffHours / 24);

                            let timeAgo = '';
                            if (diffHours < 1) timeAgo = 'Hace menos de 1 hora';
                            else if (diffHours < 24) timeAgo = `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
                            else if (diffDays === 1) timeAgo = 'Hace 1 día';
                            else timeAgo = `Hace ${diffDays} días`;

                            return (
                              <li key={candidate.id}>
                                <div className="relative pb-8">
                                  {index < candidates.length - 1 && (
                                    <div className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200"></div>
                                  )}
                                  <div className="relative flex space-x-3">
                                    <div>
                                      <span className={`h-8 w-8 rounded-full ${config.bgColor} flex items-center justify-center ring-8 ring-white`}>
                                        <i className={`fas ${config.icon} ${config.color} text-sm`} />
                                      </span>
                                    </div>
                                    <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                                      <div>
                                        <p className="text-sm text-gray-900">
                                          <strong>{candidate.full_name || `${candidate.first_name} ${candidate.last_name}`}</strong> {config.label}
                                          {candidate.current_position && (
                                            <span className="font-medium text-gray-900"> para {candidate.current_position}</span>
                                          )}
                                        </p>
                                        <p className="mt-0.5 text-sm text-gray-500">
                                          {candidate.email}
                                          {candidate.years_experience && ` • ${candidate.years_experience} años de experiencia`}
                                        </p>
                                      </div>
                                      <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                        <time>{timeAgo}</time>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </li>
                            );
                          })
                        )}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Estadísticas por etapa */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribución por Etapa del Proceso</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                          <span className="text-sm text-gray-600">Aplicación Recibida</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">324</span>
                          <span className="text-xs text-gray-500 ml-1">(26%)</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                          <span className="text-sm text-gray-600">Revisión Inicial</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">189</span>
                          <span className="text-xs text-gray-500 ml-1">(15%)</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                          <span className="text-sm text-gray-600">Entrevista Técnica</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">156</span>
                          <span className="text-xs text-gray-500 ml-1">(12%)</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                          <span className="text-sm text-gray-600">Entrevista Final</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">89</span>
                          <span className="text-xs text-gray-500 ml-1">(7%)</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                          <span className="text-sm text-gray-600">Contratado</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">67</span>
                          <span className="text-xs text-gray-500 ml-1">(5%)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Tiempo Promedio por Etapa</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Revisión Inicial</span>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">2.3 días</span>
                          <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                            <div className="bg-blue-500 h-2 rounded-full" style={{ width: '23%' }}></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Entrevista Técnica</span>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">5.7 días</span>
                          <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                            <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '57%' }}></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Entrevista Final</span>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">8.2 días</span>
                          <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                            <div className="bg-purple-500 h-2 rounded-full" style={{ width: '82%' }}></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Decisión Final</span>
                        <div className="text-right">
                          <span className="text-sm font-medium text-gray-900">4.1 días</span>
                          <div className="w-20 bg-gray-200 rounded-full h-2 mt-1">
                            <div className="bg-green-500 h-2 rounded-full" style={{ width: '41%' }}></div>
                          </div>
                        </div>
                      </div>
                      <div className="border-t border-gray-200 pt-3 mt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">Tiempo Total Promedio</span>
                          <span className="text-lg font-bold text-blue-600">20.3 días</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          }

          {/* CLIENTS - Using new ClientsMain component */}
          {currentView === "clients" && <ClientsMain />}

          {/* OLD CLIENTS VIEW - DISABLED */}
          {
            false && (
              <div className="p-6">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Gestión de Clientes</h2>
                    <p className="text-gray-600 mt-1">Administra la información y proyectos de tus clientes</p>
                  </div>
                  <div className="mt-4 sm:mt-0 flex space-x-3">
                    <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                      <i className="fas fa-filter mr-2" />
                      Filtros
                    </button>
                    <button onClick={addNewClient} className="px-4 py-2 btn-primary text-white rounded-lg">
                      <i className="fas fa-plus mr-2" />
                      Nuevo Cliente
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {clients.map((cl) => (
                    <div key={cl.id} className="card-hover bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                            <i className="fas fa-building text-blue-600 text-lg" />
                          </div>
                          <div className="ml-4">
                            <h3 className="text-lg font-semibold text-gray-900">{cl.name}</h3>
                            <p className="text-sm text-gray-500">{cl.industry}</p>
                          </div>
                        </div>
                        <span className="px-3 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Activo</span>
                      </div>

                      <div className="space-y-3 mb-4 text-sm">
                        <div className="flex items-center">
                          <i className="fas fa-user-tie text-gray-400 w-4" />
                          <span className="ml-2 text-gray-600">Contacto:</span>
                          <span className="ml-2 text-gray-900">{cl.contact}</span>
                        </div>
                        <div className="flex items-center">
                          <i className="fas fa-envelope text-gray-400 w-4" />
                          <span className="ml-2 text-gray-600">Email:</span>
                          <span className="ml-2 text-gray-900">{cl.email}</span>
                        </div>
                        <div className="flex items-center">
                          <i className="fas fa-phone text-gray-400 w-4" />
                          <span className="ml-2 text-gray-600">Teléfono:</span>
                          <span className="ml-2 text-gray-900">{cl.phone}</span>
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">Procesos Activos</span>
                          <span className="text-sm font-semibold text-gray-900">{cl.activeProcesses}</span>
                        </div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-gray-600">Candidatos Totales</span>
                          <span className="text-sm font-semibold text-gray-900">{cl.totalCandidates}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Última Actividad</span>
                          <span className="text-sm text-gray-500">{cl.lastActivity}</span>
                        </div>
                      </div>

                      <div className="flex space-x-2 mt-4 pt-4 border-t border-gray-100">
                        <button onClick={() => viewClientDetails(cl.id)} className="flex-1 px-3 py-2 text-sm bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100">
                          Ver Detalles
                        </button>
                        <button className="px-3 py-2 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100">
                          <i className="fas fa-edit" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          }

          {/* TEAM */}
          {
            currentView === "team" && (
              <div className="p-6">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Gestión de Equipo</h2>
                    <p className="text-gray-600 mt-1">Administra tu equipo de recursos humanos y sus asignaciones</p>
                  </div>
                  <div className="mt-4 sm:mt-0 flex space-x-3">
                    <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                      <i className="fas fa-chart-bar mr-2" />
                      Performance
                    </button>
                    <button onClick={addTeamMember} className="px-4 py-2 btn-primary text-white rounded-lg">
                      <i className="fas fa-user-plus mr-2" />
                      Agregar Miembro
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {teamMembers.map((m) => (
                    <div key={m.id} className="card-hover bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                      <div className="flex items-center mb-4">
                        <img
                          className="h-16 w-16 rounded-full border-2 border-primary-200"
                          src={`https://ui-avatars.com/?name=${m.avatar}&background=3b82f6&color=fff`}
                          alt={m.name}
                        />
                        <div className="ml-4">
                          <h3 className="text-lg font-semibold text-gray-900">{m.name}</h3>
                          <p className="text-sm text-gray-500">{m.role}</p>
                          <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 mt-1 inline-block">
                            Activo
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3 mb-4 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Procesos Asignados</span>
                          <span className="font-semibold text-gray-900">{m.assignedProcesses}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Candidatos Gestionados</span>
                          <span className="font-semibold text-gray-900">{m.managedCandidates}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tasa de Éxito</span>
                          <span className="font-semibold text-green-600">{m.successRate}%</span>
                        </div>
                      </div>

                      <div className="border-t border-gray-100 pt-4">
                        <div className="flex space-x-2">
                          <button onClick={() => viewTeamMemberProfile(m.id)} className="flex-1 px-3 py-2 text-sm bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100">
                            Ver Perfil
                          </button>
                          <button className="px-3 py-2 text-sm bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100">
                            <i className="fas fa-envelope" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          }

          {/* APPROVALS */}
          {
            currentView === "approvals" && (
              <div className="p-6">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Centro de Aprobaciones</h2>
                    <p className="text-gray-600 mt-1">Gestiona todas las aprobaciones pendientes del sistema</p>
                  </div>
                  <div className="mt-4 sm:mt-0 flex space-x-3">
                    <button onClick={filterApprovals} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                      <i className="fas fa-filter mr-2" />
                      Filtrar
                    </button>
                    <button onClick={approveAllPending} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                      <i className="fas fa-check-double mr-2" />
                      Aprobar Todas
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
                  {[
                    { icon: "fas fa-clock", label: "Pendientes", value: "12", bg: "bg-red-100", ic: "text-red-600" },
                    { icon: "fas fa-check", label: "Aprobadas Hoy", value: "8", bg: "bg-green-100", ic: "text-green-600" },
                    { icon: "fas fa-exclamation-triangle", label: "Urgentes", value: "3", bg: "bg-yellow-100", ic: "text-yellow-600" },
                  ].map((s) => (
                    <div key={s.label} className="card-hover bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                      <div className="flex items-center">
                        <div className={`p-3 rounded-full ${s.bg}`}>
                          <i className={`${s.icon} ${s.ic} text-xl`} />
                        </div>
                        <div className="ml-4">
                          <p className="text-sm font-medium text-gray-600">{s.label}</p>
                          <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Lista ejemplo */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Aprobaciones Pendientes</h3>
                  </div>
                  <div className="divide-y divide-gray-200">
                    <div className="p-6 hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start space-x-4">
                          <img
                            className="h-12 w-12 rounded-full border-2 border-gray-200"
                            src="https://ui-avatars.com/?name=Carlos+Lopez&background=random"
                            alt="Carlos López"
                          />
                          <div>
                            <h4 className="text-lg font-semibold text-gray-900">Carlos López</h4>
                            <p className="text-sm text-gray-500">Desarrollador Frontend - TechCorp</p>
                            <div className="flex items-center mt-2 space-x-4">
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Score: 95%</span>
                              <span className="text-xs text-gray-500">Supervisado por: Ana García</span>
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">Urgente</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-3">
                          <button onClick={() => success("Aprobado")} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500">
                            <i className="fas fa-check mr-2" />
                            Aprobar
                          </button>
                          <button onClick={() => warning("Rechazado")} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500">
                            <i className="fas fa-times mr-2" />
                            Rechazar
                          </button>
                          <button onClick={() => info("Ver detalle")} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300">
                            <i className="fas fa-eye" />
                          </button>
                        </div>
                      </div>
                    </div>
                    {/* ...más items si quieres... */}
                  </div>
                </div>
              </div>
            )
          }

          {/* REPORTES - CENTRO DE INTELIGENCIA */}
          {currentView === "reports" && <DirectorReportsHub />}

          {
            currentView === "client-progress" && (
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900 flex items-center">
                      <i className="fas fa-chart-line mr-3 text-blue-600"></i>
                      Avance de Cliente
                    </h2>
                    <p className="text-gray-600 mt-1">
                      Comparte el progreso de los procesos de reclutamiento con tus clientes
                    </p>
                  </div>
                </div>

                {/* Información educativa */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                    <i className="fas fa-info-circle mr-2"></i>
                    ¿Cómo funciona?
                  </h3>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Genera un enlace único para cada perfil de reclutamiento</li>
                    <li>• Comparte el enlace con tu cliente por email o mensaje</li>
                    <li>• El cliente puede ver el avance en tiempo real sin iniciar sesión</li>
                    <li>• El enlace se actualiza automáticamente conforme avanza el proceso</li>
                  </ul>
                </div>

                {/* Estadísticas rápidas */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-blue-600 text-sm font-medium">Perfiles Activos</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {clientProgressProfiles.filter((p: any) =>
                          p.status !== 'cancelled' && p.status !== 'completed'
                        ).length}
                      </div>
                    </div>

                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-green-600 text-sm font-medium">Perfiles Completados</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {clientProgressProfiles.filter((p: any) => p.status === 'completed').length}
                      </div>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <div className="text-yellow-600 text-sm font-medium">Pendientes Aprobación</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {clientProgressProfiles.filter((p: any) => p.status === 'pending').length}
                      </div>
                    </div>

                    <div className="bg-purple-50 p-4 rounded-lg">
                      <div className="text-purple-600 text-sm font-medium">Total Perfiles</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {clientProgressProfiles.length}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lista de perfiles */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <i className="fas fa-list mr-2 text-gray-600"></i>
                      Perfiles Disponibles para Compartir
                    </h3>
                  </div>

                  <div className="p-6">
                    {loadingProfiles ? (
                      <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-600 mb-4"></div>
                        <p className="text-gray-600">Cargando perfiles...</p>
                      </div>
                    ) : clientProgressProfiles.length > 0 ? (
                      <div className="space-y-4">
                        {clientProgressProfiles
                          .filter((profile: any) => profile.status !== 'cancelled')
                          .map((profile: any) => (
                            <div
                              key={profile.id}
                              className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  {/* Título y cliente */}
                                  <div className="mb-3">
                                    <h4 className="text-lg font-semibold text-gray-900 mb-1">
                                      {profile.position_title}
                                    </h4>
                                    <p className="text-gray-600 flex items-center">
                                      <i className="fas fa-building mr-2 text-gray-400"></i>
                                      {profile.client_name}
                                    </p>
                                  </div>

                                  {/* Info adicional */}
                                  <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                    <span className="flex items-center">
                                      <i className="fas fa-map-marker-alt mr-2 text-gray-400"></i>
                                      {profile.location_city || 'No especificado'}
                                    </span>
                                    <span className="flex items-center">
                                      <i className="fas fa-calendar mr-2 text-gray-400"></i>
                                      {new Date(profile.created_at).toLocaleDateString('es-ES')}
                                    </span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${profile.status === 'completed'
                                      ? 'bg-green-100 text-green-800'
                                      : profile.status === 'cancelled'
                                        ? 'bg-red-100 text-red-800'
                                        : 'bg-blue-100 text-blue-800'
                                      }`}>
                                      {profile.status_display || profile.status}
                                    </span>
                                  </div>
                                </div>

                                {/* Botones de acción */}
                                <div className="flex gap-3 ml-4">
                                  {/* Botón de previsualización */}
                                  <button
                                    onClick={() => handlePreviewProfile(profile.id)}
                                    className="px-5 py-2.5 bg-gray-400 text-white rounded-lg hover:bg-gray-700 font-medium flex items-center gap-2 transition-colors"
                                    title="Vista previa del avance"
                                  >
                                    <i className="fas fa-eye"></i>
                                    Previsualizar
                                  </button>

                                  {/* Botón de compartir */}
                                  <button
                                    onClick={() => handleGenerateShareLink(
                                      profile.id,
                                      profile.position_title,
                                      profile.client_name
                                    )}
                                    className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 transition-colors"
                                  >
                                    <i className="fas fa-share-alt"></i>
                                    Compartir Avance
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <i className="fas fa-folder-open text-6xl text-gray-300 mb-4"></i>
                        <p className="text-gray-600 text-lg">No hay perfiles disponibles</p>
                        <p className="text-gray-500 text-sm mt-2">
                          Los perfiles aparecerán aquí cuando se creen procesos de reclutamiento
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          }

          {/* DOCUMENTS */}
          {
            currentView === "documents" && (
              <div className="p-6">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Gestión de Documentos</h2>
                    <p className="text-gray-600 mt-1">Organiza y gestiona todos los documentos del sistema</p>
                  </div>
                  <div className="mt-4 sm:mt-0 flex space-x-3">
                    <button onClick={searchDocuments} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                      <i className="fas fa-search mr-2" />
                      Buscar
                    </button>
                    <button onClick={() => setShowShareLinkModal(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                      <i className="fas fa-link mr-2" />
                      Compartir Link
                    </button>
                    <button onClick={uploadDocument} className="px-4 py-2 btn-primary text-white rounded-lg">
                      <i className="fas fa-cloud-upload-alt mr-2" />
                      Subir Documento
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  {documentsData.loading ? (
                    // Loading skeleton para 4 tarjetas
                    [1, 2, 3, 4].map((i) => (
                      <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                        <div className="animate-pulse">
                          <div className="flex items-center justify-between mb-4">
                            <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                          </div>
                          <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                          <div className="h-6 bg-gray-200 rounded w-32"></div>
                        </div>
                      </div>
                    ))
                  ) : (
                    [
                      {
                        icon: "fas fa-file-pdf",
                        title: "CVs",
                        count: documentsData.by_type.cv,
                        wrap: "bg-blue-100 text-blue-600",
                        btn: "bg-blue-50 text-blue-600 hover:bg-blue-100"
                      },
                      {
                        icon: "fas fa-file-contract",
                        title: "Contratos",
                        count: documentsData.by_type.contract,
                        wrap: "bg-green-100 text-green-600",
                        btn: "bg-green-50 text-green-600 hover:bg-green-100"
                      },
                      {
                        icon: "fas fa-file-alt",
                        title: "Reportes",
                        count: documentsData.by_type.report,
                        wrap: "bg-purple-100 text-purple-600",
                        btn: "bg-purple-50 text-purple-600 hover:bg-purple-100"
                      },
                      {
                        icon: "fas fa-folder",
                        title: "Otros",
                        count: documentsData.by_type.other,
                        wrap: "bg-yellow-100 text-yellow-600",
                        btn: "bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
                      },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className={`w-12 h-12 ${item.wrap} rounded-lg flex items-center justify-center`}>
                            <i className={`${item.icon} text-xl`} />
                          </div>
                        </div>
                        <h3 className="text-gray-600 text-sm font-medium mb-1">{item.title}</h3>
                        <p className="text-2xl font-bold text-gray-900">{item.count}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          {item.count === 1 ? 'documento' : 'documentos'}
                        </p>
                      </div>
                    ))
                  )}
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h2 className="text-xl font-semibold text-gray-900">Documentos Recientes</h2>
                  </div>

                  <div className="divide-y divide-gray-200">
                    {documentsData.loading ? (
                      // Loading skeleton
                      [1, 2].map((i) => (
                        <div key={i} className="px-6 py-4 animate-pulse">
                          <div className="flex items-center space-x-4">
                            <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : documentsData.recent.length === 0 ? (
                      // No hay documentos
                      <div className="px-6 py-12 text-center">
                        <div className="text-gray-400">
                          <i className="fas fa-inbox text-5xl mb-4"></i>
                          <p className="text-lg font-medium text-gray-900">No hay documentos recientes</p>
                          <p className="text-gray-500 mt-1">Los documentos aparecerán aquí cuando se suban</p>
                        </div>
                      </div>
                    ) : (
                      // Lista de documentos reales
                      documentsData.recent.map((doc: any) => {
                        // Calcular hace cuánto tiempo
                        const uploadedDate = new Date(doc.uploaded_at);
                        const now = new Date();
                        const diffMs = now.getTime() - uploadedDate.getTime();
                        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
                        const diffDays = Math.floor(diffHours / 24);

                        let timeAgo = '';
                        if (diffHours < 1) timeAgo = 'Hace menos de 1 hora';
                        else if (diffHours < 24) timeAgo = `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`;
                        else if (diffDays === 1) timeAgo = 'Hace 1 día';
                        else timeAgo = `Hace ${diffDays} días`;

                        // Determinar icono según tipo
                        const getIcon = (type: string) => {
                          switch (type) {
                            case 'cv': return { icon: 'fa-file-pdf', color: 'text-red-500' };
                            case 'certificate': return { icon: 'fa-certificate', color: 'text-green-500' };
                            case 'portfolio': return { icon: 'fa-folder', color: 'text-purple-500' };
                            case 'cover_letter': return { icon: 'fa-file-alt', color: 'text-blue-500' };
                            default: return { icon: 'fa-file', color: 'text-gray-500' };
                          }
                        };

                        const iconConfig = getIcon(doc.document_type);

                        // Calcular tamaño del archivo
                        const fileSize = doc.file_size
                          ? `${(doc.file_size / (1024 * 1024)).toFixed(1)} MB`
                          : 'Tamaño desconocido';

                        return (
                          <div key={doc.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between">
                              {/* Icono y nombre */}
                              <div className="flex items-center space-x-4 flex-1 min-w-0">
                                <div className="flex-shrink-0">
                                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                                    <i className={`fas ${iconConfig.icon} ${iconConfig.color} text-lg`}></i>
                                  </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {doc.original_filename || 'Documento sin nombre'}
                                  </p>
                                  <p className="text-sm text-gray-500">
                                    Subido por {doc.uploaded_by_name || 'Usuario'} • {timeAgo} • {fileSize}
                                  </p>
                                </div>
                              </div>

                              {/* Acciones */}
                              <div className="flex items-center space-x-2 ml-4">
                                <button
                                  onClick={() => window.open(doc.file_url, '_blank')}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Ver documento"
                                >
                                  <i className="fas fa-eye"></i>
                                </button>
                                <button
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = doc.file_url;
                                    link.download = doc.original_filename;
                                    link.click();
                                  }}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Descargar"
                                >
                                  <i className="fas fa-download"></i>
                                </button>
                                <button
                                  onClick={async () => {
                                    const confirmed = await showConfirm('¿Estás seguro de que deseas eliminar este documento?');
                                    if (confirmed) {
                                      console.log('Eliminar documento:', doc.id);
                                      // Aquí puedes agregar la lógica de eliminación
                                    }
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Footer con link a ver todos */}
                  {documentsData.recent.length > 0 && (
                    <div className="px-6 py-3 bg-gray-50 border-t border-gray-200">
                      <button
                        onClick={() => router.push('/director/candidates/documents')}
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Ver todos los documentos ({documentsData.total}) →
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          }

          {/* TAREAS DE SISTEMA (CELERY) */}
          {
            currentView === "tasks" && (
              <div className="p-6">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Tareas de Sistema</h2>
                    <p className="text-gray-600 mt-1">Monitoreo y gestión de tareas asíncronas del sistema</p>
                  </div>
                  <div className="mt-4 sm:mt-0 flex space-x-3">
                    <button onClick={refreshCeleryData} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                      <i className="fas fa-sync-alt mr-2" />
                      Actualizar
                    </button>
                    <button onClick={() => info("Abriendo configuración...")} className="px-4 py-2 btn-primary text-white rounded-lg">
                      <i className="fas fa-cog mr-2" />
                      Configurar
                    </button>
                  </div>
                </div>


                {/* Estadísticas generales */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <i className="fas fa-tasks text-blue-600 text-xl" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-gray-500">Tareas Activas</h3>
                        <p className="text-2xl font-bold text-gray-900">
                          {celeryData ? celeryData.active_tasks.count : "0"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <i className="fas fa-check-circle text-green-600 text-xl" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-gray-500">Completadas (7d)</h3>
                        <p className="text-2xl font-bold text-gray-900">
                          {celeryData ? celeryData.statistics.successful_tasks : "0"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <i className="fas fa-exclamation-triangle text-red-600 text-xl" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-gray-500">Fallidas (7d)</h3>
                        <p className="text-2xl font-bold text-gray-900">
                          {celeryData ? celeryData.statistics.failed_tasks : "0"}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <i className="fas fa-clock text-yellow-600 text-xl" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-gray-500">En Cola</h3>
                        <p className="text-2xl font-bold text-gray-900">
                          {celeryData ? celeryData.scheduled_tasks.count : "0"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Grupos de tareas */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Grupos de Tareas</h3>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Servicios de IA */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <i className="fas fa-brain text-purple-600 text-lg mr-3" />
                          <h4 className="font-medium text-gray-900">Servicios de IA</h4>
                        </div>
                        <span className="px-2 py-1 bg-purple-100 text-purple-600 text-xs rounded-full">23 tareas</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">Análisis de CVs, matching y generación de perfiles</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Exitosas:</span>
                          <span className="font-medium text-green-600">18 (78%)</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Fallidas:</span>
                          <span className="font-medium text-red-600">2 (9%)</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">En proceso:</span>
                          <span className="font-medium text-blue-600">3 (13%)</span>
                        </div>
                      </div>
                    </div>

                    {/* Generación de documentos */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <i className="fas fa-file-pdf text-red-600 text-lg mr-3" />
                          <h4 className="font-medium text-gray-900">Documentos</h4>
                        </div>
                        <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full">15 tareas</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">Generación de PDFs y reportes</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Exitosas:</span>
                          <span className="font-medium text-green-600">14 (93%)</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Fallidas:</span>
                          <span className="font-medium text-red-600">0 (0%)</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">En proceso:</span>
                          <span className="font-medium text-blue-600">1 (7%)</span>
                        </div>
                      </div>
                    </div>

                    {/* Notificaciones */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <i className="fas fa-bell text-green-600 text-lg mr-3" />
                          <h4 className="font-medium text-gray-900">Notificaciones</h4>
                        </div>
                        <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">45 tareas</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">Envío de emails y notificaciones</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Exitosas:</span>
                          <span className="font-medium text-green-600">42 (93%)</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Fallidas:</span>
                          <span className="font-medium text-red-600">1 (2%)</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">En proceso:</span>
                          <span className="font-medium text-blue-600">2 (5%)</span>
                        </div>
                      </div>
                    </div>

                    {/* Tareas del sistema */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center">
                          <i className="fas fa-cogs text-gray-600 text-lg mr-3" />
                          <h4 className="font-medium text-gray-900">Sistema</h4>
                        </div>
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">8 tareas</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-4">Mantenimiento y limpieza automática</p>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Exitosas:</span>
                          <span className="font-medium text-green-600">8 (100%)</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Fallidas:</span>
                          <span className="font-medium text-red-600">0 (0%)</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">En proceso:</span>
                          <span className="font-medium text-blue-600">0 (0%)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Métricas del Sistema Híbrido IA */}
                {hybridMetrics && (
                  <div className="mb-8">
                    <HybridMetricsDashboard metrics={hybridMetrics} />
                  </div>
                )}

                {/* Tareas recientes */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Actividad Reciente</h3>
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tarea</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Iniciada</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Duración</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trabajador</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {[
                            { id: 1, name: "analyze_cv_task", status: "SUCCESS", started: "2024-01-15 14:30", duration: "2.4s", worker: "worker-1" },
                            { id: 2, name: "generate_document_task", status: "SUCCESS", started: "2024-01-15 14:28", duration: "5.1s", worker: "worker-2" },
                            { id: 3, name: "send_notification_task", status: "SUCCESS", started: "2024-01-15 14:25", duration: "0.8s", worker: "worker-1" },
                            { id: 4, name: "profile_matching_task", status: "FAILURE", started: "2024-01-15 14:20", duration: "15.2s", worker: "worker-2" },
                            { id: 5, name: "send_bulk_notifications", status: "PROCESSING", started: "2024-01-15 14:32", duration: "30s+", worker: "worker-1" },
                          ].map((task) => (
                            <tr key={task.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="text-sm font-medium text-gray-900">{task.name}</div>
                                <div className="text-sm text-gray-500">ID: {task.id}</div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${task.status === 'SUCCESS' ? 'bg-green-100 text-green-800' :
                                  task.status === 'FAILURE' ? 'bg-red-100 text-red-800' :
                                    task.status === 'PROCESSING' ? 'bg-blue-100 text-blue-800' :
                                      'bg-yellow-100 text-yellow-800'
                                  }`}>
                                  {task.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {task.started}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {task.duration}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {task.worker}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Workers status */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Estado de Workers</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {[
                      { name: "worker-1", status: "active", tasks: 5, uptime: "2d 14h", memory: "45%" },
                      { name: "worker-2", status: "active", tasks: 3, uptime: "2d 14h", memory: "38%" },
                      { name: "worker-3", status: "idle", tasks: 0, uptime: "2d 14h", memory: "22%" },
                    ].map((worker) => (
                      <div key={worker.name} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-medium text-gray-900">{worker.name}</h4>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${worker.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                            {worker.status}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Tareas activas:</span>
                            <span className="font-medium">{worker.tasks}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Tiempo activo:</span>
                            <span className="font-medium">{worker.uptime}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Memoria:</span>
                            <span className="font-medium">{worker.memory}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          }

          {/* SISTEMA DE EVALUACIONES */}
          {currentView === "evaluations" && <EvaluationsMain />}

          {
            currentView === "profiles" && (
              <ProfilesMain
                initialProfileId={profileToOpen.id}
                initialAction={profileToOpen.action || undefined}
                initialSubView={profilesInitialSubView || undefined}
                initialHighlightId={profileToOpen.id || undefined}
              />
            )
          }


          {currentView === "candidates-status" && <CandidatesStatusDashboard />}

          {currentView === "shortlisted-candidates" && <ShortlistedCandidatesDashboard />}

          {currentView === "selected-candidates" && <SelectedCandidatesDashboard />}

          {currentView === "individual-reports" && <IndividualReportsHub />}

          {/* LISTA DE CLIENTES */}
          {
            currentView === "client-list" && (
              <div className="p-6">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Gestión de Clientes</h2>
                    <p className="text-gray-600 mt-1">Administra empresas y organizaciones clientes</p>
                  </div>
                  <div className="mt-4 sm:mt-0 flex space-x-3">
                    <button onClick={() => loadClientsData()} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                      <i className="fas fa-sync-alt mr-2" />
                      Actualizar
                    </button>
                    <button onClick={addNewClient} className="px-4 py-2 btn-primary text-white rounded-lg">
                      <i className="fas fa-plus mr-2" />
                      Nuevo Cliente
                    </button>
                  </div>
                </div>

                {/* Estadísticas de clientes */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <i className="fas fa-building text-blue-600 text-xl" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-gray-500">Total Clientes</h3>
                        <p className="text-2xl font-bold text-gray-900">{clientsData.length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <i className="fas fa-check-circle text-green-600 text-xl" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-gray-500">Activos</h3>
                        <p className="text-2xl font-bold text-gray-900">
                          {clientsData.filter(c => c.is_active).length}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <i className="fas fa-briefcase text-yellow-600 text-xl" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-gray-500">Industrias</h3>
                        <p className="text-2xl font-bold text-gray-900">
                          {new Set(clientsData.map(c => c.industry)).size}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <i className="fas fa-users text-purple-600 text-xl" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-gray-500">Contactos</h3>
                        <p className="text-2xl font-bold text-gray-900">
                          {clientsData.reduce((sum, client) => sum + (client.contacts?.length || 0), 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabla de clientes */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Industria</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asignado a</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {clientsData.map((client) => (
                          <tr key={client.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center">
                                    <i className="fas fa-building text-gray-500" />
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{client.company_name}</div>
                                  <div className="text-sm text-gray-500">{client.rfc}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{client.industry}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{client.contact_name}</div>
                              <div className="text-sm text-gray-500">{client.contact_email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${client.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                }`}>
                                {client.is_active ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {client.assigned_to_name || 'Sin asignar'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button onClick={() => info(`Viendo cliente ${client.id}`)} className="text-blue-600 hover:text-blue-900 mr-3">
                                <i className="fas fa-eye" />
                              </button>
                              <button onClick={() => info(`Editando cliente ${client.id}`)} className="text-green-600 hover:text-green-900 mr-3">
                                <i className="fas fa-edit" />
                              </button>
                              <button onClick={() => deleteClient(client.id)} className="text-red-600 hover:text-red-900">
                                <i className="fas fa-trash" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {clientsData.length === 0 && (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                              <i className="fas fa-building text-4xl mb-4 block text-gray-300" />
                              No hay clientes registrados
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          }

          {currentView === "profiles-status" && <ProfilesStatusDashboard />}


          {currentView === "email-management" && <EmailManagement />}

          {/* DOCUMENT SHARE LINKS */}
          {currentView === "document-links" && <DocumentShareLinksDashboard />}

          {/* LISTA DE CONTACTOS */}
          {
            currentView === "client-contacts" && (
              <div className="p-6">
                <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-3xl font-bold text-gray-900">Gestión de Contactos</h2>
                    <p className="text-gray-600 mt-1">Administra contactos de clientes y prospectos</p>
                  </div>
                  <div className="mt-4 sm:mt-0 flex space-x-3">
                    <button onClick={() => loadContactsData()} className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                      <i className="fas fa-sync-alt mr-2" />
                      Actualizar
                    </button>
                    <button onClick={() => info("Abriendo formulario de nuevo contacto...")} className="px-4 py-2 btn-primary text-white rounded-lg">
                      <i className="fas fa-plus mr-2" />
                      Nuevo Contacto
                    </button>
                  </div>
                </div>

                {/* Estadísticas de contactos */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <i className="fas fa-address-book text-blue-600 text-xl" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-gray-500">Total Contactos</h3>
                        <p className="text-2xl font-bold text-gray-900">{contactsData.length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <i className="fas fa-star text-green-600 text-xl" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-gray-500">Primarios</h3>
                        <p className="text-2xl font-bold text-gray-900">
                          {contactsData.filter(c => c.is_primary).length}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-yellow-100 rounded-lg">
                        <i className="fas fa-envelope text-yellow-600 text-xl" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-gray-500">Con Email</h3>
                        <p className="text-2xl font-bold text-gray-900">
                          {contactsData.filter(c => c.email).length}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <i className="fas fa-phone text-purple-600 text-xl" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-sm font-medium text-gray-500">Con Teléfono</h3>
                        <p className="text-2xl font-bold text-gray-900">
                          {contactsData.filter(c => c.phone).length}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Tabla de contactos */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contacto</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Puesto</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {contactsData.map((contact) => (
                          <tr key={contact.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                    <i className="fas fa-user text-gray-500" />
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                                  <div className="text-sm text-gray-500">ID: {contact.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {clientsData.find(c => c.id === contact.client)?.company_name || `Cliente #${contact.client}`}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{contact.position}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{contact.email}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{contact.phone}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${contact.is_primary ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                {contact.is_primary ? 'Primario' : 'Secundario'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <button onClick={() => info(`Viendo contacto ${contact.id}`)} className="text-blue-600 hover:text-blue-900 mr-3">
                                <i className="fas fa-eye" />
                              </button>
                              <button onClick={() => info(`Editando contacto ${contact.id}`)} className="text-green-600 hover:text-green-900 mr-3">
                                <i className="fas fa-edit" />
                              </button>
                              <button onClick={() => deleteContact(contact.id)} className="text-red-600 hover:text-red-900">
                                <i className="fas fa-trash" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {contactsData.length === 0 && (
                          <tr>
                            <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                              <i className="fas fa-address-book text-4xl mb-4 block text-gray-300" />
                              No hay contactos registrados
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )
          }
        </main>

        {/* Modal Formulario Agregar Candidato */}
        <DirectorCandidateFormModal
          isOpen={showCandidateForm}
          onClose={() => setShowCandidateForm(false)}
          onSuccess={success}
        />

        {/* Modal Formulario Agregar Documento */}
        <CandidateDocumentFormModal
          isOpen={showDocumentForm}
          onClose={() => setShowDocumentForm(false)}
          onSuccess={success}
        />

        {/* Modal Formulario Agregar Nota */}
        <CandidateNoteFormModal
          isOpen={showNoteForm}
          onClose={() => setShowNoteForm(false)}
          onSuccess={success}
        />

        {/* Modal Formulario Agregar Cliente */}
        <ClientFormModal
          isOpen={showClientForm}
          onClose={() => setShowClientForm(false)}
          onSuccess={success}
        />

        {shareModalOpen && selectedProfileForShare && (
          <ShareLinkModal
            isOpen={shareModalOpen}
            onClose={() => setShareModalOpen(false)}
            shareLink={shareLink}
            profileTitle={selectedProfileForShare.profileTitle}
            clientName={selectedProfileForShare.clientName}
          />
        )}

        {/* Modal Compartir Link de Documentos */}
        <ShareDocumentLinkModal
          isOpen={showShareLinkModal}
          onClose={() => setShowShareLinkModal(false)}
          onSuccess={() => {
            // NO cerrar el modal aquí - dejar que el usuario vea y copie el link
            success('Link de documento generado exitosamente');
          }}
        />

        {/* Mi Perfil */}
        <UserProfileModal
          isOpen={userProfileModalOpen}
          onClose={() => setUserProfileModalOpen(false)}
          onUserUpdated={(updated: any) => setCurrentUser((prev: any) => prev ? { ...prev, ...updated } : updated)}
        />

        {/* Configuración */}
        <SettingsModal
          isOpen={settingsModalOpen}
          onClose={() => setSettingsModalOpen(false)}
        />

      </div>
    </div>
  );
}

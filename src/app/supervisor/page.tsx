// app/supervisor/page.tsx
"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useModal } from "@/context/ModalContext";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api";
import {
  Chart,
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

Chart.register(
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
  Filler
);

// ═══════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════

interface SupervisorStats {
  activeProcesses: number;
  activeCandidates: number;
  totalCandidates: number;
  totalProfiles: number;
  successRate: number;
  avgTimeToHire: number;
  pendingEvaluations: number;
  avgAiScore: number;
  hiredThisMonth: number;
  rejectedThisMonth: number;
  prevMonthProcesses: number;
  prevMonthCandidates: number;
  prevSuccessRate: number;
}

interface TrendPoint {
  month: string;
  label: string;
  candidates: number;
  profiles: number;
  hired: number;
}

interface FunnelStage {
  label: string;
  count: number;
  color: string;
  percentage: number;
}

interface StagnantCandidate {
  id: number;
  name: string;
  status: string;
  statusLabel: string;
  daysSinceUpdate: number;
  position: string;
  supervisor: string;
}

interface SourceData {
  source: string;
  total: number;
  hired: number;
  rate: number;
}

interface ProcessItem {
  id: number;
  position_title: string;
  department: string;
  client_name: string;
  status: string;
  statusLabel: string;
  candidates_count: number;
  deadline: string;
  priority: string;
}

interface PendingApproval {
  id: number;
  candidate: string;
  email: string;
  position: string;
  department: string;
  client: string;
  score: number;
  supervisor: string;
}

interface RegressionResult {
  slope: number;
  intercept: number;
  r2: number;
  predict: (x: number) => number;
}

// ═══════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════

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

const MONTH_NAMES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const STATUS_LABELS: Record<string, string> = {
  new: "Nuevo",
  screening: "En Revisión",
  qualified: "Calificado",
  interview: "En Entrevista",
  offer: "Oferta",
  hired: "Contratado",
  rejected: "Rechazado",
  withdrawn: "Retirado",
  draft: "Borrador",
  pending: "Pendiente",
  approved: "Aprobado",
  in_progress: "En Proceso",
  candidates_found: "Cand. Encontrados",
  in_evaluation: "En Evaluación",
  in_interview: "En Entrevistas",
  finalists: "Finalistas",
  completed: "Completado",
  cancelled: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  new: "#3B82F6",
  screening: "#F59E0B",
  qualified: "#10B981",
  interview: "#8B5CF6",
  offer: "#EC4899",
  hired: "#059669",
  rejected: "#EF4444",
  withdrawn: "#6B7280",
  draft: "#9CA3AF",
  pending: "#F59E0B",
  approved: "#10B981",
  in_progress: "#3B82F6",
  candidates_found: "#06B6D4",
  in_evaluation: "#F97316",
  in_interview: "#6366F1",
  finalists: "#EC4899",
  completed: "#059669",
  cancelled: "#EF4444",
};

function getMonthLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
}

function daysBetween(d1: Date, d2: Date): number {
  return Math.floor(Math.abs(d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

function percentChange(current: number, previous: number): { value: number; isUp: boolean } {
  if (previous === 0) return { value: current > 0 ? 100 : 0, isUp: current > 0 };
  const change = ((current - previous) / previous) * 100;
  return { value: Math.abs(Math.round(change)), isUp: change >= 0 };
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════

export default function SupervisorPage() {
  const router = useRouter();
  const { showAlert } = useModal();

  // ===== State =====
  const [loading, setLoading] = useState(true);
  const [dashboardLoading, setDashboardLoading] = useState(false);
  const [currentView, setCurrentView] = useState<
    "dashboard" | "my-processes" | "candidates" | "clients" | "reports" | "documents" | "team-metrics"
  >("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);

  const [stats, setStats] = useState<SupervisorStats>({
    activeProcesses: 0,
    activeCandidates: 0,
    totalCandidates: 0,
    totalProfiles: 0,
    successRate: 0,
    avgTimeToHire: 0,
    pendingEvaluations: 0,
    avgAiScore: 0,
    hiredThisMonth: 0,
    rejectedThisMonth: 0,
    prevMonthProcesses: 0,
    prevMonthCandidates: 0,
    prevSuccessRate: 0,
  });

  const [trendData, setTrendData] = useState<TrendPoint[]>([]);
  const [funnelData, setFunnelData] = useState<FunnelStage[]>([]);
  const [stagnantCandidates, setStagnantCandidates] = useState<StagnantCandidate[]>([]);
  const [sourceData, setSourceData] = useState<SourceData[]>([]);
  const [processes, setProcesses] = useState<ProcessItem[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [candidatesByStatus, setCandidatesByStatus] = useState<{ status: string; count: number }[]>([]);
  const [profilesByStatus, setProfilesByStatus] = useState<{ status: string; count: number }[]>([]);

  // Regression results
  const [candidateRegression, setCandidateRegression] = useState<RegressionResult | null>(null);
  const [hireRegression, setHireRegression] = useState<RegressionResult | null>(null);

  // Dropdown state
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // Chart refs
  const trendChartRef = useRef<HTMLCanvasElement | null>(null);
  const trendChartInstance = useRef<Chart | null>(null);
  const funnelChartRef = useRef<HTMLCanvasElement | null>(null);
  const funnelChartInstance = useRef<Chart | null>(null);
  const distributionChartRef = useRef<HTMLCanvasElement | null>(null);
  const distributionChartInstance = useRef<Chart | null>(null);
  const sourceChartRef = useRef<HTMLCanvasElement | null>(null);
  const sourceChartInstance = useRef<Chart | null>(null);

  // ===== Auth & Init =====
  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("authToken");
    if (!token) {
      router.push("/auth");
      return;
    }
    loadDashboardData();
  }, []);

  // Responsive sidebar
  useEffect(() => {
    if (!mounted) return;
    const isDesktop = window.innerWidth >= 1024;
    setSidebarOpen(isDesktop);
    const handleResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(true);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [mounted]);

  // ===== Data Loading =====
  async function loadDashboardData() {
    setDashboardLoading(true);
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    try {
      console.log("🔵 Cargando dashboard del Supervisor...");

      // Fetch all data in parallel using general endpoints
      const [
        candidatesRes,
        profilesRes,
        analyticsRes,
        pendingRes,
      ] = await Promise.allSettled([
        apiClient.getCandidates({}),
        apiClient.getProfiles({}),
        fetch(`${API_URL}/api/director/analytics/trends/`, { headers }).then((r) =>
          r.ok ? r.json() : null
        ),
        fetch(`${API_URL}/api/director/pending-approvals/`, { headers }).then((r) =>
          r.ok ? r.json() : null
        ),
      ]);

      // Process candidates
      let allCandidates: any[] = [];
      if (candidatesRes.status === "fulfilled") {
        const cData = candidatesRes.value as any;
        allCandidates = Array.isArray(cData) ? cData : cData?.results || [];
      }

      // Process profiles
      let allProfiles: any[] = [];
      if (profilesRes.status === "fulfilled") {
        const pData = profilesRes.value as any;
        allProfiles = Array.isArray(pData) ? pData : pData?.results || [];
      }

      // Process analytics
      let analytics: any = null;
      if (analyticsRes.status === "fulfilled") {
        analytics = analyticsRes.value;
      }

      // Process pending approvals
      if (pendingRes.status === "fulfilled" && pendingRes.value) {
        setPendingApprovals(pendingRes.value);
      }

      console.log("🟢 Datos cargados:", {
        candidates: allCandidates.length,
        profiles: allProfiles.length,
        analytics: !!analytics,
      });

      // ========================================
      // COMPUTE STATS
      // ========================================
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

      const activeProfiles = allProfiles.filter(
        (p: any) => !["completed", "cancelled"].includes(p.status)
      );
      const activeCandidates = allCandidates.filter(
        (c: any) => !["hired", "rejected", "withdrawn"].includes(c.status)
      );
      const hiredTotal = allCandidates.filter((c: any) => c.status === "hired");
      const hiredThisMonth = allCandidates.filter(
        (c: any) => c.status === "hired" && new Date(c.updated_at) >= thirtyDaysAgo
      );
      const rejectedThisMonth = allCandidates.filter(
        (c: any) => c.status === "rejected" && new Date(c.updated_at) >= thirtyDaysAgo
      );
      const successRate =
        allCandidates.length > 0
          ? Math.round((hiredTotal.length / allCandidates.length) * 100)
          : 0;

      // Previous month approximation for comparison
      const prevMonthProfiles = allProfiles.filter(
        (p: any) =>
          new Date(p.created_at) >= sixtyDaysAgo && new Date(p.created_at) < thirtyDaysAgo
      );
      const prevMonthCandidates = allCandidates.filter(
        (c: any) =>
          new Date(c.created_at) >= sixtyDaysAgo && new Date(c.created_at) < thirtyDaysAgo
      );

      // AI score average
      const aiScores = allCandidates
        .map((c: any) => c.ai_match_score)
        .filter((s: any) => s != null && s > 0);
      const avgAiScore =
        aiScores.length > 0
          ? Math.round(aiScores.reduce((a: number, b: number) => a + b, 0) / aiScores.length)
          : 0;

      setStats({
        activeProcesses: activeProfiles.length,
        activeCandidates: activeCandidates.length,
        totalCandidates: allCandidates.length,
        totalProfiles: allProfiles.length,
        successRate,
        avgTimeToHire: analytics?.time_to_hire?.length
          ? Math.round(
              analytics.time_to_hire.reduce((s: number, t: any) => s + t.days, 0) /
                analytics.time_to_hire.length
            )
          : 0,
        pendingEvaluations: 0, // Would need evaluations API
        avgAiScore,
        hiredThisMonth: hiredThisMonth.length,
        rejectedThisMonth: rejectedThisMonth.length,
        prevMonthProcesses: prevMonthProfiles.length,
        prevMonthCandidates: prevMonthCandidates.length,
        prevSuccessRate: successRate > 0 ? successRate - 2 : 0,
      });

      // ========================================
      // COMPUTE TREND DATA (for regression)
      // ========================================
      const monthMap = new Map<string, TrendPoint>();

      // Initialize last 12 months
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        monthMap.set(key, {
          month: key,
          label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`,
          candidates: 0,
          profiles: 0,
          hired: 0,
        });
      }

      // Fill with real data
      allCandidates.forEach((c: any) => {
        if (c.created_at) {
          const d = new Date(c.created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (monthMap.has(key)) {
            monthMap.get(key)!.candidates++;
          }
        }
        if (c.status === "hired" && c.updated_at) {
          const d = new Date(c.updated_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (monthMap.has(key)) {
            monthMap.get(key)!.hired++;
          }
        }
      });

      allProfiles.forEach((p: any) => {
        if (p.created_at) {
          const d = new Date(p.created_at);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
          if (monthMap.has(key)) {
            monthMap.get(key)!.profiles++;
          }
        }
      });

      const trends = Array.from(monthMap.values());
      setTrendData(trends);

      // ========================================
      // COMPUTE REGRESSIONS
      // ========================================
      const candPoints = trends.map((t, i) => ({ x: i, y: t.candidates }));
      const hirePoints = trends.map((t, i) => ({ x: i, y: t.hired }));

      const candReg = linearRegression(candPoints);
      const hireReg = linearRegression(hirePoints);
      setCandidateRegression(candReg);
      setHireRegression(hireReg);

      console.log("📈 Regresión Candidatos:", {
        slope: candReg.slope.toFixed(2),
        r2: candReg.r2.toFixed(3),
        prediction3m: candReg.predict(trends.length + 2).toFixed(1),
      });
      console.log("📈 Regresión Contrataciones:", {
        slope: hireReg.slope.toFixed(2),
        r2: hireReg.r2.toFixed(3),
        prediction3m: hireReg.predict(trends.length + 2).toFixed(1),
      });

      // ========================================
      // COMPUTE FUNNEL
      // ========================================
      const funnelTotal = allCandidates.length || 1;
      const funnelStages: FunnelStage[] = [
        {
          label: "Total Candidatos",
          count: allCandidates.length,
          color: "#3B82F6",
          percentage: 100,
        },
        {
          label: "En Revisión",
          count: allCandidates.filter((c: any) =>
            ["screening", "qualified"].includes(c.status)
          ).length,
          color: "#F59E0B",
          percentage: 0,
        },
        {
          label: "En Entrevista",
          count: allCandidates.filter((c: any) =>
            ["interview", "offer", "hired"].includes(c.status)
          ).length,
          color: "#8B5CF6",
          percentage: 0,
        },
        {
          label: "Con Oferta",
          count: allCandidates.filter((c: any) => ["offer", "hired"].includes(c.status))
            .length,
          color: "#EC4899",
          percentage: 0,
        },
        {
          label: "Contratados",
          count: hiredTotal.length,
          color: "#059669",
          percentage: 0,
        },
      ];
      funnelStages.forEach((s) => {
        s.percentage = Math.round((s.count / funnelTotal) * 100);
      });
      setFunnelData(funnelStages);

      // ========================================
      // COMPUTE STATUS DISTRIBUTIONS
      // ========================================
      const candStatusMap = new Map<string, number>();
      allCandidates.forEach((c: any) => {
        candStatusMap.set(c.status, (candStatusMap.get(c.status) || 0) + 1);
      });
      setCandidatesByStatus(
        Array.from(candStatusMap.entries())
          .map(([status, count]) => ({ status, count }))
          .sort((a, b) => b.count - a.count)
      );

      const profStatusMap = new Map<string, number>();
      allProfiles.forEach((p: any) => {
        profStatusMap.set(p.status, (profStatusMap.get(p.status) || 0) + 1);
      });
      setProfilesByStatus(
        Array.from(profStatusMap.entries())
          .map(([status, count]) => ({ status, count }))
          .sort((a, b) => b.count - a.count)
      );

      // ========================================
      // SOURCE EFFECTIVENESS
      // ========================================
      if (analytics?.source_effectiveness) {
        setSourceData(
          analytics.source_effectiveness
            .filter((s: any) => s.source)
            .map((s: any) => ({
              source: s.source || "Desconocido",
              total: s.total,
              hired: s.hired,
              rate: s.total > 0 ? Math.round((s.hired / s.total) * 100) : 0,
            }))
        );
      } else {
        // Compute from raw candidate data
        const srcMap = new Map<string, { total: number; hired: number }>();
        allCandidates.forEach((c: any) => {
          const src = c.source || "Sin fuente";
          if (!srcMap.has(src)) srcMap.set(src, { total: 0, hired: 0 });
          srcMap.get(src)!.total++;
          if (c.status === "hired") srcMap.get(src)!.hired++;
        });
        setSourceData(
          Array.from(srcMap.entries())
            .map(([source, data]) => ({
              source,
              total: data.total,
              hired: data.hired,
              rate: data.total > 0 ? Math.round((data.hired / data.total) * 100) : 0,
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 8)
        );
      }

      // ========================================
      // STAGNANT CANDIDATES
      // ========================================
      if (analytics?.stagnant_candidates) {
        setStagnantCandidates(
          analytics.stagnant_candidates.map((c: any) => ({
            id: c.id,
            name: `${c.first_name} ${c.last_name}`,
            status: c.status,
            statusLabel: STATUS_LABELS[c.status] || c.status,
            daysSinceUpdate: daysBetween(new Date(c.updated_at), now),
            position: c.current_position || "Sin posición",
            supervisor: c.assigned_to__first_name
              ? `${c.assigned_to__first_name} ${c.assigned_to__last_name || ""}`
              : "Sin asignar",
          }))
        );
      } else {
        // Compute from raw data
        const stagnant = allCandidates
          .filter((c: any) => {
            if (!["new", "screening", "qualified", "interview"].includes(c.status)) return false;
            const lastUpdate = new Date(c.updated_at);
            return daysBetween(lastUpdate, now) > 14;
          })
          .map((c: any) => ({
            id: c.id,
            name: `${c.first_name} ${c.last_name}`,
            status: c.status,
            statusLabel: STATUS_LABELS[c.status] || c.status,
            daysSinceUpdate: daysBetween(new Date(c.updated_at), now),
            position: c.current_position || "Sin posición",
            supervisor: "—",
          }))
          .sort((a, b) => b.daysSinceUpdate - a.daysSinceUpdate)
          .slice(0, 10);
        setStagnantCandidates(stagnant);
      }

      // ========================================
      // PROCESSES (from profiles)
      // ========================================
      setProcesses(
        allProfiles.slice(0, 15).map((p: any) => ({
          id: p.id,
          position_title: p.position_title || "Sin título",
          department: p.department || "",
          client_name: p.client_name || p.client?.company_name || "Sin cliente",
          status: p.status,
          statusLabel: STATUS_LABELS[p.status] || p.status,
          candidates_count: p.candidates_count || 0,
          deadline: p.deadline || "",
          priority: p.priority || "medium",
        }))
      );

      console.log("✅ Dashboard del Supervisor cargado exitosamente");
    } catch (err) {
      console.error("❌ Error al cargar dashboard:", err);
    } finally {
      setLoading(false);
      setDashboardLoading(false);
    }
  }

  // ===== Chart Setup =====
  useEffect(() => {
    if (currentView !== "dashboard" || trendData.length === 0) return;

    // Clean up previous charts
    [trendChartInstance, funnelChartInstance, distributionChartInstance, sourceChartInstance].forEach(
      (ref) => {
        if (ref.current) {
          ref.current.destroy();
          ref.current = null;
        }
      }
    );

    // 1. TREND CHART with regression line + prediction
    if (trendChartRef.current) {
      const ctx = trendChartRef.current.getContext("2d");
      if (ctx && candidateRegression && hireRegression) {
        const labels = trendData.map((t) => t.label);
        const candidateValues = trendData.map((t) => t.candidates);
        const hiredValues = trendData.map((t) => t.hired);
        const profileValues = trendData.map((t) => t.profiles);

        // Regression lines (extend 3 months into future)
        const extendedLabels = [...labels];
        const now = new Date();
        for (let i = 1; i <= 3; i++) {
          const futureDate = new Date(now.getFullYear(), now.getMonth() + i, 1);
          extendedLabels.push(
            `${MONTH_NAMES[futureDate.getMonth()]} ${futureDate.getFullYear().toString().slice(-2)} *`
          );
        }

        const candRegressionLine = extendedLabels.map((_, i) =>
          Math.max(0, Number(candidateRegression.predict(i).toFixed(1)))
        );
        const hireRegressionLine = extendedLabels.map((_, i) =>
          Math.max(0, Number(hireRegression.predict(i).toFixed(1)))
        );

        // Pad actual data with nulls for prediction months
        const paddedCandidates = [...candidateValues, null, null, null];
        const paddedHired = [...hiredValues, null, null, null];
        const paddedProfiles = [...profileValues, null, null, null];

        trendChartInstance.current = new Chart(ctx, {
          type: "line",
          data: {
            labels: extendedLabels,
            datasets: [
              {
                label: "Candidatos Nuevos",
                data: paddedCandidates,
                borderColor: "#3B82F6",
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
              },
              {
                label: "Contratados",
                data: paddedHired,
                borderColor: "#059669",
                backgroundColor: "rgba(5, 150, 105, 0.1)",
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
              },
              {
                label: "Perfiles Creados",
                data: paddedProfiles,
                borderColor: "#8B5CF6",
                backgroundColor: "transparent",
                borderDash: [],
                tension: 0.4,
                pointRadius: 3,
                pointHoverRadius: 5,
              },
              {
                label: `Reg. Candidatos (R²=${candidateRegression.r2.toFixed(2)})`,
                data: candRegressionLine,
                borderColor: "rgba(59, 130, 246, 0.4)",
                borderDash: [8, 4],
                borderWidth: 2,
                pointRadius: 0,
                fill: false,
              },
              {
                label: `Reg. Contrataciones (R²=${hireRegression.r2.toFixed(2)})`,
                data: hireRegressionLine,
                borderColor: "rgba(5, 150, 105, 0.4)",
                borderDash: [8, 4],
                borderWidth: 2,
                pointRadius: 0,
                fill: false,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: "index" },
            plugins: {
              legend: { position: "bottom", labels: { usePointStyle: true, padding: 15 } },
              tooltip: {
                callbacks: {
                  title: (items) => {
                    const label = items[0]?.label || "";
                    return label.endsWith("*") ? `${label} (Predicción)` : label;
                  },
                },
              },
            },
            scales: {
              y: {
                beginAtZero: true,
                grid: { color: "rgba(0,0,0,0.05)" },
              },
              x: {
                grid: { display: false },
                ticks: {
                  callback: function (value: any, index: number) {
                    const label = extendedLabels[index];
                    return label?.endsWith("*") ? `📊 ${label.replace(" *", "")}` : label;
                  },
                },
              },
            },
          },
        });
      }
    }

    // 2. FUNNEL CHART (horizontal bar)
    if (funnelChartRef.current && funnelData.length > 0) {
      const ctx = funnelChartRef.current.getContext("2d");
      if (ctx) {
        funnelChartInstance.current = new Chart(ctx, {
          type: "bar",
          data: {
            labels: funnelData.map((f) => f.label),
            datasets: [
              {
                data: funnelData.map((f) => f.count),
                backgroundColor: funnelData.map((f) => f.color),
                borderRadius: 6,
                barPercentage: 0.7,
              },
            ],
          },
          options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const stage = funnelData[ctx.dataIndex];
                    return `${stage.count} candidatos (${stage.percentage}%)`;
                  },
                },
              },
            },
            scales: {
              x: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.05)" } },
              y: { grid: { display: false } },
            },
          },
        });
      }
    }

    // 3. DISTRIBUTION CHART (doughnut)
    if (distributionChartRef.current && candidatesByStatus.length > 0) {
      const ctx = distributionChartRef.current.getContext("2d");
      if (ctx) {
        distributionChartInstance.current = new Chart(ctx, {
          type: "doughnut",
          data: {
            labels: candidatesByStatus.map(
              (s) => STATUS_LABELS[s.status] || s.status
            ),
            datasets: [
              {
                data: candidatesByStatus.map((s) => s.count),
                backgroundColor: candidatesByStatus.map(
                  (s) => STATUS_COLORS[s.status] || "#6B7280"
                ),
                borderWidth: 2,
                borderColor: "#fff",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: "bottom", labels: { usePointStyle: true, padding: 12 } },
            },
          },
        });
      }
    }

    // 4. SOURCE EFFECTIVENESS CHART
    if (sourceChartRef.current && sourceData.length > 0) {
      const ctx = sourceChartRef.current.getContext("2d");
      if (ctx) {
        sourceChartInstance.current = new Chart(ctx, {
          type: "bar",
          data: {
            labels: sourceData.map((s) => s.source),
            datasets: [
              {
                label: "Total",
                data: sourceData.map((s) => s.total),
                backgroundColor: "rgba(59, 130, 246, 0.7)",
                borderRadius: 4,
              },
              {
                label: "Contratados",
                data: sourceData.map((s) => s.hired),
                backgroundColor: "rgba(5, 150, 105, 0.7)",
                borderRadius: 4,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { position: "bottom", labels: { usePointStyle: true } },
            },
            scales: {
              y: { beginAtZero: true, grid: { color: "rgba(0,0,0,0.05)" } },
              x: { grid: { display: false } },
            },
          },
        });
      }
    }

    return () => {
      [trendChartInstance, funnelChartInstance, distributionChartInstance, sourceChartInstance].forEach(
        (ref) => {
          if (ref.current) {
            ref.current.destroy();
            ref.current = null;
          }
        }
      );
    };
  }, [currentView, trendData, funnelData, candidatesByStatus, sourceData, candidateRegression, hireRegression]);

  // ===== Actions =====
  const refreshDashboard = async () => {
    setDashboardLoading(true);
    await loadDashboardData();
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("user");
    router.push("/auth");
  };

  // ===== Helpers =====
  const navClass = (view: typeof currentView) =>
    currentView === view
      ? "bg-purple-50 text-purple-700 font-semibold"
      : "text-gray-700 hover:bg-gray-50";

  const priorityBadge = (priority: string) => {
    const map: Record<string, string> = {
      urgent: "bg-red-100 text-red-800",
      high: "bg-orange-100 text-orange-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-green-100 text-green-800",
    };
    return map[priority] || "bg-gray-100 text-gray-800";
  };

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  return (
    <div className="bg-gray-50 font-sans antialiased min-h-screen">
      {/* Loading */}
      {loading && (
        <div className="fixed inset-0 bg-white/90 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
            <p className="text-gray-600">Cargando dashboard...</p>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 relative z-30">
        <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="lg:hidden mr-4 p-2 rounded-lg hover:bg-gray-100"
              >
                <i className="fas fa-bars text-gray-600" />
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center">
                  <i className="fas fa-chart-line text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Bausen</h1>
                  <p className="text-xs text-gray-500">Panel de Supervisión</p>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden md:block relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar candidatos, procesos..."
                  className="w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <i className="fas fa-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              </div>

              <button className="p-2 rounded-full hover:bg-gray-100 relative">
                <i className="fas fa-bell text-gray-600" />
                {pendingApprovals.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center">
                    {pendingApprovals.length}
                  </span>
                )}
              </button>

              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center text-sm rounded-full focus:outline-none p-1 hover:bg-gray-50"
                >
                  <img
                    className="h-8 w-8 rounded-full border-2 border-purple-200"
                    src="https://ui-avatars.com/api/?name=Supervisor+RH&background=9333ea&color=fff"
                    alt="Supervisor"
                  />
                  <span className="ml-2 text-gray-700 font-medium hidden sm:block">
                    Supervisor RH
                  </span>
                  <i className="fas fa-chevron-down ml-1 text-gray-400" />
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="p-4 border-b">
                      <p className="text-sm font-semibold text-gray-900">Supervisor RH</p>
                      <p className="text-xs text-gray-500">supervisor@bausen.com</p>
                    </div>
                    <div className="border-t py-2">
                      <button
                        onClick={logout}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                      >
                        <i className="fas fa-sign-out-alt mr-2" />
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={`bg-white border-r border-gray-200 fixed lg:sticky top-0 h-screen z-20 transition-transform duration-300 w-64 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-purple-500 to-purple-600 flex items-center justify-center">
                <i className="fas fa-chart-line text-white text-sm" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Panel Supervisor</h2>
                <p className="text-xs text-gray-500">Analytics Avanzados</p>
              </div>
            </div>
          </div>

          <nav className="p-4">
            <ul className="space-y-1">
              {[
                { view: "dashboard" as const, icon: "fas fa-tachometer-alt", label: "Dashboard" },
                { view: "my-processes" as const, icon: "fas fa-briefcase", label: "Procesos" },
                { view: "candidates" as const, icon: "fas fa-users", label: "Candidatos" },
                { view: "clients" as const, icon: "fas fa-building", label: "Clientes" },
                { view: "reports" as const, icon: "fas fa-chart-bar", label: "Reportes" },
                { view: "team-metrics" as const, icon: "fas fa-trophy", label: "Métricas" },
              ].map((item) => (
                <li key={item.view}>
                  <button
                    onClick={() => {
                      setCurrentView(item.view);
                      if (window.innerWidth < 1024) setSidebarOpen(false);
                    }}
                    className={`sidebar-item flex w-full items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all ${navClass(
                      item.view
                    )}`}
                  >
                    <i className={`${item.icon} mr-3 w-5 text-center`} />
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Quick Stats */}
          <div className="p-4 border-t border-gray-100 mt-auto">
            <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">
              Resumen Rápido
            </h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Procesos Activos</span>
                <span className="text-xs font-bold text-blue-600">{stats.activeProcesses}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Candidatos Activos</span>
                <span className="text-xs font-bold text-green-600">{stats.activeCandidates}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Tasa Éxito</span>
                <span className="text-xs font-bold text-purple-600">{stats.successRate}%</span>
              </div>
              {pendingApprovals.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">Pend. Aprobación</span>
                  <span className="text-xs font-bold text-red-600">
                    {pendingApprovals.length}
                  </span>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto" onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false); }}>
          {/* ═══════════════════════════════════════════════ */}
          {/* DASHBOARD VIEW */}
          {/* ═══════════════════════════════════════════════ */}
          {currentView === "dashboard" && (
            <div className="p-6 max-w-[1600px] mx-auto">
              {/* Header */}
              <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">
                    Panel de Supervisión
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Analytics avanzados con predicciones y regresión lineal
                  </p>
                </div>
                <div className="mt-4 sm:mt-0 flex space-x-3">
                  <button
                    onClick={refreshDashboard}
                    disabled={dashboardLoading}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <i className={`fas fa-sync mr-2 ${dashboardLoading ? "animate-spin" : ""}`} />
                    Actualizar
                  </button>
                </div>
              </div>

              {/* ═══════ 6 KPI CARDS ═══════ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
                {/* Procesos Activos */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <i className="fas fa-briefcase text-blue-600" />
                    </div>
                    {(() => {
                      const ch = percentChange(stats.activeProcesses, stats.prevMonthProcesses);
                      return (
                        <span className={`text-xs font-semibold ${ch.isUp ? "text-green-600" : "text-red-600"}`}>
                          {ch.isUp ? "↑" : "↓"} {ch.value}%
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeProcesses}</p>
                  <p className="text-xs text-gray-500 mt-1">Procesos Activos</p>
                </div>

                {/* Candidatos Activos */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <i className="fas fa-users text-green-600" />
                    </div>
                    {(() => {
                      const ch = percentChange(stats.activeCandidates, stats.prevMonthCandidates);
                      return (
                        <span className={`text-xs font-semibold ${ch.isUp ? "text-green-600" : "text-red-600"}`}>
                          {ch.isUp ? "↑" : "↓"} {ch.value}%
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeCandidates}</p>
                  <p className="text-xs text-gray-500 mt-1">Candidatos Activos</p>
                </div>

                {/* Tasa de Éxito */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <i className="fas fa-chart-line text-purple-600" />
                    </div>
                    {(() => {
                      const ch = percentChange(stats.successRate, stats.prevSuccessRate);
                      return (
                        <span className={`text-xs font-semibold ${ch.isUp ? "text-green-600" : "text-red-600"}`}>
                          {ch.isUp ? "↑" : "↓"} {ch.value}%
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.successRate}%</p>
                  <p className="text-xs text-gray-500 mt-1">Tasa de Éxito</p>
                </div>

                {/* Contratados Este Mes */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-emerald-100 rounded-lg">
                      <i className="fas fa-user-check text-emerald-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats.hiredThisMonth}</p>
                  <p className="text-xs text-gray-500 mt-1">Contratados (mes)</p>
                </div>

                {/* Tiempo Promedio */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <i className="fas fa-clock text-amber-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.avgTimeToHire > 0 ? `${stats.avgTimeToHire}d` : "—"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">T. Prom. Contratación</p>
                </div>

                {/* Score IA Promedio */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                      <i className="fas fa-robot text-indigo-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.avgAiScore > 0 ? `${stats.avgAiScore}%` : "—"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">Score IA Promedio</p>
                </div>
              </div>

              {/* ═══════ TREND CHART WITH REGRESSION ═══════ */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      <i className="fas fa-chart-line text-purple-600 mr-2" />
                      Tendencia + Regresión Lineal (12 meses)
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Líneas punteadas = regresión lineal con predicción a 3 meses
                    </p>
                  </div>
                  {candidateRegression && (
                    <div className="hidden md:flex items-center space-x-4 text-xs">
                      <div className="bg-blue-50 px-3 py-1.5 rounded-lg">
                        <span className="text-blue-700 font-semibold">
                          Candidatos: pendiente = {candidateRegression.slope >= 0 ? "+" : ""}
                          {candidateRegression.slope.toFixed(2)}/mes
                        </span>
                        <span className="text-blue-500 ml-2">
                          R² = {candidateRegression.r2.toFixed(3)}
                        </span>
                      </div>
                      <div className="bg-green-50 px-3 py-1.5 rounded-lg">
                        <span className="text-green-700 font-semibold">
                          Contrataciones: pendiente = {hireRegression!.slope >= 0 ? "+" : ""}
                          {hireRegression!.slope.toFixed(2)}/mes
                        </span>
                        <span className="text-green-500 ml-2">
                          R² = {hireRegression!.r2.toFixed(3)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ height: 350 }}>
                  <canvas ref={trendChartRef} />
                </div>
                {/* Prediction Summary */}
                {candidateRegression && hireRegression && (
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-blue-600 font-medium">
                        Predicción Candidatos (3 meses)
                      </p>
                      <p className="text-xl font-bold text-blue-800">
                        ~{Math.round(candidateRegression.predict(trendData.length + 2))}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-green-600 font-medium">
                        Predicción Contrataciones (3 meses)
                      </p>
                      <p className="text-xl font-bold text-green-800">
                        ~{Math.round(hireRegression.predict(trendData.length + 2))}
                      </p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-purple-600 font-medium">
                        Tendencia General
                      </p>
                      <p className="text-xl font-bold text-purple-800">
                        {candidateRegression.slope > 0 ? "📈 Creciente" : candidateRegression.slope < 0 ? "📉 Decreciente" : "➡️ Estable"}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* ═══════ FUNNEL + DISTRIBUTION ═══════ */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Recruitment Funnel */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    <i className="fas fa-filter text-blue-600 mr-2" />
                    Embudo de Reclutamiento
                  </h3>
                  <div style={{ height: 280 }}>
                    <canvas ref={funnelChartRef} />
                  </div>
                  {/* Conversion rates */}
                  {funnelData.length >= 2 && (
                    <div className="mt-4 space-y-2">
                      {funnelData.slice(1).map((stage, i) => {
                        const prevCount = funnelData[i].count || 1;
                        const convRate = Math.round((stage.count / prevCount) * 100);
                        return (
                          <div key={stage.label} className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">
                              {funnelData[i].label} → {stage.label}
                            </span>
                            <div className="flex items-center">
                              <div className="w-24 bg-gray-200 rounded-full h-1.5 mr-2">
                                <div
                                  className="h-1.5 rounded-full"
                                  style={{ width: `${convRate}%`, backgroundColor: stage.color }}
                                />
                              </div>
                              <span className="font-semibold text-gray-700">{convRate}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Candidate Distribution */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    <i className="fas fa-chart-pie text-purple-600 mr-2" />
                    Distribución de Candidatos por Estado
                  </h3>
                  <div style={{ height: 280 }}>
                    <canvas ref={distributionChartRef} />
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {candidatesByStatus.slice(0, 6).map((s) => (
                      <div key={s.status} className="flex items-center text-xs">
                        <div
                          className="w-3 h-3 rounded-full mr-2 shrink-0"
                          style={{ backgroundColor: STATUS_COLORS[s.status] || "#6B7280" }}
                        />
                        <span className="text-gray-600 truncate">
                          {STATUS_LABELS[s.status] || s.status}
                        </span>
                        <span className="ml-auto font-bold text-gray-800">{s.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* ═══════ SOURCE EFFECTIVENESS + STAGNANT ALERTS ═══════ */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                {/* Source Effectiveness */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    <i className="fas fa-bullseye text-orange-600 mr-2" />
                    Efectividad por Fuente de Reclutamiento
                  </h3>
                  {sourceData.length > 0 ? (
                    <div style={{ height: 280 }}>
                      <canvas ref={sourceChartRef} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-64 text-gray-400">
                      <div className="text-center">
                        <i className="fas fa-chart-bar text-4xl mb-2" />
                        <p className="text-sm">Sin datos de fuentes aún</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Stagnant Candidates Alert */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    <i className="fas fa-exclamation-triangle text-amber-600 mr-2" />
                    Candidatos Estancados
                    {stagnantCandidates.length > 0 && (
                      <span className="ml-2 bg-amber-100 text-amber-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {stagnantCandidates.length}
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-500 mb-4">
                    Candidatos sin cambio de estado por más de 14 días
                  </p>
                  {stagnantCandidates.length > 0 ? (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {stagnantCandidates.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-100"
                        >
                          <div className="flex items-center space-x-3">
                            <img
                              className="h-8 w-8 rounded-full border-2 border-amber-200"
                              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=F59E0B&color=fff&size=32`}
                              alt={c.name}
                            />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{c.name}</p>
                              <p className="text-xs text-gray-500">{c.statusLabel}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 text-xs font-bold rounded-full">
                              <i className="fas fa-clock mr-1" />
                              {c.daysSinceUpdate} días
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-48 text-green-500">
                      <div className="text-center">
                        <i className="fas fa-check-circle text-4xl mb-2" />
                        <p className="text-sm text-gray-500">
                          No hay candidatos estancados
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ═══════ PENDING APPROVALS TABLE ═══════ */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
                <div className="px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      <i className="fas fa-user-check text-green-600 mr-2" />
                      Aprobaciones Pendientes
                    </h3>
                    <span className="bg-red-100 text-red-800 text-xs font-medium px-3 py-1 rounded-full">
                      {pendingApprovals.length} pendientes
                    </span>
                  </div>
                </div>
                {pendingApprovals.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {["Candidato", "Posición", "Cliente", "Score IA", "Supervisor"].map((h) => (
                            <th
                              key={h}
                              className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {pendingApprovals.map((a) => (
                          <tr key={a.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <img
                                  className="h-9 w-9 rounded-full border-2 border-gray-200"
                                  src={`https://ui-avatars.com/api/?name=${encodeURIComponent(a.candidate)}&background=random&size=36`}
                                  alt={a.candidate}
                                />
                                <div className="ml-3">
                                  <p className="text-sm font-medium text-gray-900">
                                    {a.candidate}
                                  </p>
                                  <p className="text-xs text-gray-500">{a.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <p className="text-sm text-gray-900">{a.position}</p>
                              {a.department && (
                                <p className="text-xs text-gray-500">{a.department}</p>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {a.client || "—"}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  a.score >= 80
                                    ? "bg-green-100 text-green-800"
                                    : a.score >= 60
                                    ? "bg-yellow-100 text-yellow-800"
                                    : a.score > 0
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {a.score > 0 ? `${a.score}%` : "—"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {a.supervisor}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <i className="fas fa-check-circle text-5xl text-gray-300 mb-3" />
                    <p className="text-gray-500">No hay aprobaciones pendientes</p>
                  </div>
                )}
              </div>

              {/* ═══════ PROCESSES TABLE ═══════ */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
                <div className="px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900">
                      <i className="fas fa-tasks text-blue-600 mr-2" />
                      Procesos de Reclutamiento
                    </h3>
                    <span className="text-sm text-gray-500">
                      {processes.length} procesos
                    </span>
                  </div>
                </div>
                {processes.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          {["Posición", "Cliente", "Estado", "Prioridad", "Candidatos", "Fecha Límite"].map(
                            (h) => (
                              <th
                                key={h}
                                className="px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-left"
                              >
                                {h}
                              </th>
                            )
                          )}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {processes.map((p) => (
                          <tr key={p.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {p.position_title}
                                </p>
                                {p.department && (
                                  <p className="text-xs text-gray-500">{p.department}</p>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {p.client_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className="px-2.5 py-1 text-xs font-medium rounded-full"
                                style={{
                                  backgroundColor: `${STATUS_COLORS[p.status] || "#6B7280"}20`,
                                  color: STATUS_COLORS[p.status] || "#6B7280",
                                }}
                              >
                                {p.statusLabel}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-2.5 py-1 text-xs font-medium rounded-full ${priorityBadge(
                                  p.priority
                                )}`}
                              >
                                {p.priority === "urgent"
                                  ? "Urgente"
                                  : p.priority === "high"
                                  ? "Alta"
                                  : p.priority === "medium"
                                  ? "Media"
                                  : "Baja"}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {p.candidates_count}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {p.deadline
                                ? new Date(p.deadline).toLocaleDateString("es-MX")
                                : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <i className="fas fa-briefcase text-5xl text-gray-300 mb-3" />
                    <p className="text-gray-500">No hay procesos registrados</p>
                  </div>
                )}
              </div>

              {/* ═══════ PROFILES BY STATUS ═══════ */}
              {profilesByStatus.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    <i className="fas fa-th-large text-indigo-600 mr-2" />
                    Perfiles por Estado
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                    {profilesByStatus.map((s) => (
                      <div
                        key={s.status}
                        className="rounded-lg p-4 text-center border"
                        style={{
                          backgroundColor: `${STATUS_COLORS[s.status] || "#6B7280"}10`,
                          borderColor: `${STATUS_COLORS[s.status] || "#6B7280"}30`,
                        }}
                      >
                        <p
                          className="text-2xl font-bold"
                          style={{ color: STATUS_COLORS[s.status] || "#6B7280" }}
                        >
                          {s.count}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {STATUS_LABELS[s.status] || s.status}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════ */}
          {/* OTHER VIEWS (stubs with improved messaging) */}
          {/* ═══════════════════════════════════════════════ */}
          {currentView !== "dashboard" && (
            <div className="p-6">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900">
                  {currentView === "my-processes"
                    ? "Mis Procesos"
                    : currentView === "candidates"
                    ? "Gestión de Candidatos"
                    : currentView === "clients"
                    ? "Gestión de Clientes"
                    : currentView === "reports"
                    ? "Reportes y Analytics"
                    : currentView === "team-metrics"
                    ? "Métricas del Equipo"
                    : "Documentos"}
                </h2>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                <i className="fas fa-tools text-5xl text-gray-300 mb-4" />
                <p className="text-gray-600 text-lg">
                  Esta sección está en desarrollo
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  Vuelve al Dashboard para ver analytics avanzados con predicciones
                </p>
                <button
                  onClick={() => setCurrentView("dashboard")}
                  className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  <i className="fas fa-arrow-left mr-2" />
                  Volver al Dashboard
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

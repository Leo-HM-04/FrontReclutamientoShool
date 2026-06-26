'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Chart from 'chart.js/auto';

/* ════════════════════════════════════════════════════════════
   TYPES
   ════════════════════════════════════════════════════════════ */

interface RandomForestData {
  total_records: number;
  train_size: number;
  test_size: number;
  accuracy: number;
  oob_score: number;
  cross_validation: { mean: number; std: number; scores: number[] };
  confusion_matrix: { true_negative: number; false_positive: number; false_negative: number; true_positive: number };
  feature_importances: Record<string, number>;
  class_distribution: { recommended: number; not_recommended: number };
  tree_progression: { n_trees: number; accuracy: number }[];
  predictions: {
    candidate: string; profile: string; status: string;
    real_class: string; predicted_class: string;
    confidence: number; prob_recommended: number; match_percentage: number;
  }[];
}

interface ClusterStats {
  cluster_id: number; count: number; label: string; color: string; recommendation: string;
  avg_years_experience: number; avg_education_level: number; avg_skills_count: number;
  avg_salary_expectation: number; avg_eval_score: number; avg_technical_score: number;
  avg_experience_score: number; avg_match_percentage: number; pct_recommended: number;
}

interface KMeansData {
  total_records: number; n_clusters: number; silhouette_score: number;
  clusters: ClusterStats[];
  assignments: {
    candidate: string; profile: string; cluster: number; cluster_label: string;
    match_percentage: number; years_experience: number; skills_count: number; status: string;
  }[];
  elbow_data: { k: number; inertia: number; silhouette: number }[];
}

interface PCAData {
  total_records: number; n_features: number; n_components: number;
  total_variance_2d: number;
  variance_explained: { component: number; variance: number; cumulative: number }[];
  loadings: { feature: string; pc1: number; pc2: number; magnitude: number }[];
  top_features: {
    pc1: { feature: string; weight: number }[];
    pc2: { feature: string; weight: number }[];
  };
  scatter_data: {
    candidate: string; profile: string; x: number; y: number;
    label: number; class: string; match_percentage: number; status: string;
  }[];
}

interface NeuralNetData {
  total_records: number; train_size: number; test_size: number;
  accuracy: number;
  cross_validation: { mean: number; std: number; scores: number[] };
  confusion_matrix: { true_negative: number; false_positive: number; false_negative: number; true_positive: number };
  architecture: {
    input_layer: number; hidden_layers: number[]; output_layer: number;
    activation: string; solver: string; total_params: number; n_iterations: number;
  };
  loss_curve: { epoch: number; loss: number }[];
  model_comparison: { model: string; accuracy: number; icon: string }[];
  class_distribution: { recommended: number; not_recommended: number };
  predictions: {
    candidate: string; profile: string; status: string;
    real_class: string; predicted_class: string;
    confidence: number; prob_recommended: number;
  }[];
}

type TabKey = 'random-forest' | 'kmeans' | 'pca' | 'neural-network';

const FEATURE_LABELS: Record<string, string> = {
  years_experience: 'Años Experiencia',
  education_level: 'Nivel Educativo',
  skills_count: 'Cant. Habilidades',
  salary_expectation: 'Expectativa Salarial',
  eval_avg_score: 'Prom. Evaluaciones',
  technical_score: 'Score Técnico',
  experience_score: 'Score Experiencia',
  match_percentage: '% Match',
};

const TABS: { key: TabKey; label: string; icon: string; color: string; accent: string; bg: string }[] = [
  { key: 'random-forest', label: 'Bosque Aleatorio', icon: 'fas fa-tree', color: '#059669', accent: 'text-emerald-600', bg: 'bg-emerald-50' },
  { key: 'kmeans', label: 'Segmentación K-Means', icon: 'fas fa-object-group', color: '#2563eb', accent: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'pca', label: 'Análisis PCA', icon: 'fas fa-compress-arrows-alt', color: '#7c3aed', accent: 'text-purple-600', bg: 'bg-purple-50' },
  { key: 'neural-network', label: 'Red Neuronal', icon: 'fas fa-brain', color: '#d97706', accent: 'text-amber-600', bg: 'bg-amber-50' },
];

const CHART_GRID = 'rgba(0,0,0,0.06)';
const CHART_TICK = '#6b7280';
const CHART_TITLE = '#1e293b';

/* ════════════════════════════════════════════════════════════
   COMPONENT
   ════════════════════════════════════════════════════════════ */

export default function AdvancedAnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>('random-forest');
  const [kClusters, setKClusters] = useState(3);

  // Data
  const [rfData, setRfData] = useState<RandomForestData | null>(null);
  const [kmData, setKmData] = useState<KMeansData | null>(null);
  const [pcaData, setPcaData] = useState<PCAData | null>(null);
  const [nnData, setNnData] = useState<NeuralNetData | null>(null);

  // Loading / error
  const [loading, setLoading] = useState<Record<TabKey, boolean>>({
    'random-forest': false, 'kmeans': false, 'pca': false, 'neural-network': false,
  });
  const [errors, setErrors] = useState<Record<TabKey, string | null>>({
    'random-forest': null, 'kmeans': null, 'pca': null, 'neural-network': null,
  });

  // Chart refs
  const chartRefs = useRef<Record<string, HTMLCanvasElement | null>>({});
  const chartInstances = useRef<Record<string, Chart>>({});

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const setRef = useCallback((key: string) => (el: HTMLCanvasElement | null) => {
    chartRefs.current[key] = el;
  }, []);

  const destroyChart = (key: string) => {
    chartInstances.current[key]?.destroy();
    delete chartInstances.current[key];
  };

  /* ── API fetchers ── */
  const fetchData = async (tab: TabKey, extraParams = '') => {
    setLoading(prev => ({ ...prev, [tab]: true }));
    setErrors(prev => ({ ...prev, [tab]: null }));
    const endpoints: Record<TabKey, string> = {
      'random-forest': '/director/analytics/ml/random-forest/',
      'kmeans': `/director/analytics/ml/kmeans/?k=${kClusters}`,
      'pca': '/director/analytics/ml/pca/',
      'neural-network': '/director/analytics/ml/neural-network/',
    };
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${apiBase}${endpoints[tab]}${extraParams}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      if (data.error) { setErrors(prev => ({ ...prev, [tab]: data.error })); return; }
      if (tab === 'random-forest') setRfData(data);
      if (tab === 'kmeans') setKmData(data);
      if (tab === 'pca') setPcaData(data);
      if (tab === 'neural-network') setNnData(data);
    } catch (e: any) {
      setErrors(prev => ({ ...prev, [tab]: e.message }));
    } finally {
      setLoading(prev => ({ ...prev, [tab]: false }));
    }
  };

  useEffect(() => {
    if (activeTab === 'random-forest' && !rfData && !loading['random-forest']) fetchData('random-forest');
    if (activeTab === 'kmeans' && !kmData && !loading['kmeans']) fetchData('kmeans');
    if (activeTab === 'pca' && !pcaData && !loading['pca']) fetchData('pca');
    if (activeTab === 'neural-network' && !nnData && !loading['neural-network']) fetchData('neural-network');
  }, [activeTab]);

  // Re-fetch K-Means when user changes the number of clusters
  useEffect(() => {
    if (activeTab === 'kmeans' && !kmData && !loading['kmeans']) {
      fetchData('kmeans');
    }
  }, [kClusters, kmData]);

  /* ════════════════════════════════════════════════════════
     CHARTS — Bosque Aleatorio
     ════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!rfData) return;

    // Feature importance bar chart
    if (chartRefs.current['rf-importance']) {
      destroyChart('rf-importance');
      const imp = rfData.feature_importances;
      const sorted = Object.entries(imp).sort((a, b) => b[1] - a[1]);
      const colors = ['#059669', '#2563eb', '#7c3aed', '#d97706', '#dc2626', '#6b7280', '#db2777'];
      chartInstances.current['rf-importance'] = new Chart(chartRefs.current['rf-importance'], {
        type: 'bar',
        data: {
          labels: sorted.map(([f]) => FEATURE_LABELS[f] || f),
          datasets: [{ label: 'Importancia', data: sorted.map(([, v]) => v), backgroundColor: colors.slice(0, sorted.length), borderRadius: 6, borderSkipped: false }],
        },
        options: {
          indexAxis: 'y', responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false }, title: { display: true, text: 'Importancia de cada variable en el modelo', color: CHART_TITLE, font: { size: 14, weight: 'bold' } } },
          scales: { x: { beginAtZero: true, max: 1, ticks: { color: CHART_TICK }, grid: { color: CHART_GRID } }, y: { ticks: { color: CHART_TICK }, grid: { display: false } } },
        },
      });
    }

    // Tree progression line chart
    if (chartRefs.current['rf-progression']) {
      destroyChart('rf-progression');
      chartInstances.current['rf-progression'] = new Chart(chartRefs.current['rf-progression'], {
        type: 'line',
        data: {
          labels: rfData.tree_progression.map(t => `${t.n_trees} árboles`),
          datasets: [{
            label: 'Accuracy',
            data: rfData.tree_progression.map(t => t.accuracy * 100),
            borderColor: '#059669', backgroundColor: 'rgba(5,150,105,0.08)',
            fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#059669',
            pointBorderColor: '#fff', pointBorderWidth: 2,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: { display: true, text: 'Precisión vs Número de Árboles', color: CHART_TITLE, font: { size: 14, weight: 'bold' } },
          },
          scales: {
            y: { min: 0, max: 100, ticks: { callback: (v) => `${v}%`, color: CHART_TICK }, grid: { color: CHART_GRID } },
            x: { ticks: { color: CHART_TICK }, grid: { color: CHART_GRID } },
          },
        },
      });
    }

    return () => { destroyChart('rf-importance'); destroyChart('rf-progression'); };
  }, [rfData, activeTab]);

  /* ════════════════════════════════════════════════════════
     CHARTS — K-Means
     ════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!kmData) return;

    // Elbow chart
    if (chartRefs.current['km-elbow']) {
      destroyChart('km-elbow');
      chartInstances.current['km-elbow'] = new Chart(chartRefs.current['km-elbow'], {
        type: 'line',
        data: {
          labels: kmData.elbow_data.map(d => `K=${d.k}`),
          datasets: [
            {
              label: 'Silhouette Score',
              data: kmData.elbow_data.map(d => d.silhouette),
              borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,0.08)',
              fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#2563eb',
              yAxisID: 'y',
            },
            {
              label: 'Inercia',
              data: kmData.elbow_data.map(d => d.inertia),
              borderColor: '#d97706', borderDash: [5, 5],
              tension: 0.4, pointRadius: 5, pointBackgroundColor: '#d97706',
              yAxisID: 'y1',
            },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: 'Método del Codo — Selección óptima de K', color: CHART_TITLE, font: { size: 14, weight: 'bold' } },
            legend: { labels: { color: CHART_TICK } },
          },
          scales: {
            y: { position: 'left', title: { display: true, text: 'Silhouette', color: CHART_TICK }, ticks: { color: CHART_TICK }, grid: { color: CHART_GRID } },
            y1: { position: 'right', title: { display: true, text: 'Inercia', color: CHART_TICK }, ticks: { color: CHART_TICK }, grid: { drawOnChartArea: false } },
            x: { ticks: { color: CHART_TICK }, grid: { color: CHART_GRID } },
          },
        },
      });
    }

    // Cluster distribution donut
    if (chartRefs.current['km-dist']) {
      destroyChart('km-dist');
      chartInstances.current['km-dist'] = new Chart(chartRefs.current['km-dist'], {
        type: 'doughnut',
        data: {
          labels: kmData.clusters.map(c => c.label),
          datasets: [{
            data: kmData.clusters.map(c => c.count),
            backgroundColor: kmData.clusters.map(c => c.color),
            borderWidth: 3, borderColor: '#ffffff',
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: 'Distribución de Candidatos por Cluster', color: CHART_TITLE, font: { size: 14, weight: 'bold' } },
            legend: { position: 'bottom', labels: { color: CHART_TICK, font: { size: 12 }, padding: 16 } },
          },
        },
      });
    }

    return () => { destroyChart('km-elbow'); destroyChart('km-dist'); };
  }, [kmData, activeTab]);

  /* ════════════════════════════════════════════════════════
     CHARTS — PCA
     ════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!pcaData) return;

    // Scatter 2D
    if (chartRefs.current['pca-scatter']) {
      destroyChart('pca-scatter');
      const recommended = pcaData.scatter_data.filter(p => p.label === 1);
      const notRecommended = pcaData.scatter_data.filter(p => p.label === 0);
      chartInstances.current['pca-scatter'] = new Chart(chartRefs.current['pca-scatter'], {
        type: 'scatter',
        data: {
          datasets: [
            {
              label: 'Recomendado',
              data: recommended.map(p => ({ x: p.x, y: p.y })),
              backgroundColor: 'rgba(255, 15, 15, 0.6)', borderColor: '#059669',
              pointRadius: 8, pointHoverRadius: 12,
            },
            {
              label: 'No Recomendado',
              data: notRecommended.map(p => ({ x: p.x, y: p.y })),
              backgroundColor: 'rgba(220,38,38,0.6)', borderColor: '#dc2626',
              pointRadius: 8, pointHoverRadius: 12,
            },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: 'Mapa de Candidatos (Componentes Principales)', color: CHART_TITLE, font: { size: 14, weight: 'bold' } },
            legend: { labels: { color: CHART_TICK, font: { size: 13 } } },
            tooltip: {
              callbacks: {
                label: (ctx) => {
                  const ds = ctx.datasetIndex === 0 ? recommended : notRecommended;
                  const p = ds[ctx.dataIndex];
                  return p ? `${p.candidate} (${p.match_percentage}% match)` : '';
                },
              },
            },
          },
          scales: {
            x: { title: { display: true, text: 'Componente Principal 1', color: CHART_TICK }, ticks: { color: CHART_TICK }, grid: { color: CHART_GRID } },
            y: { title: { display: true, text: 'Componente Principal 2', color: CHART_TICK }, ticks: { color: CHART_TICK }, grid: { color: CHART_GRID } },
          },
        },
      });
    }

    // Variance bar chart
    if (chartRefs.current['pca-variance']) {
      destroyChart('pca-variance');
      chartInstances.current['pca-variance'] = new Chart(chartRefs.current['pca-variance'], {
        type: 'bar',
        data: {
          labels: pcaData.variance_explained.map(v => `PC${v.component}`),
          datasets: [
            {
              label: 'Varianza Individual (%)',
              data: pcaData.variance_explained.map(v => v.variance),
              backgroundColor: 'rgba(124,58,237,0.65)', borderRadius: 6, borderSkipped: false,
            },
            {
              label: 'Varianza Acumulada (%)',
              data: pcaData.variance_explained.map(v => v.cumulative),
              type: 'line',
              borderColor: '#d97706', pointRadius: 5, pointBackgroundColor: '#d97706',
              tension: 0.3, fill: false,
            },
          ],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: 'Varianza Explicada por Componente', color: CHART_TITLE, font: { size: 14, weight: 'bold' } },
            legend: { labels: { color: CHART_TICK } },
          },
          scales: {
            y: { beginAtZero: true, max: 100, ticks: { callback: (v) => `${v}%`, color: CHART_TICK }, grid: { color: CHART_GRID } },
            x: { ticks: { color: CHART_TICK }, grid: { color: CHART_GRID } },
          },
        },
      });
    }

    return () => { destroyChart('pca-scatter'); destroyChart('pca-variance'); };
  }, [pcaData, activeTab]);

  /* ════════════════════════════════════════════════════════
     CHARTS — Neural Network
     ════════════════════════════════════════════════════════ */
  useEffect(() => {
    if (!nnData) return;

    // Loss curve
    if (chartRefs.current['nn-loss'] && nnData.loss_curve.length > 0) {
      destroyChart('nn-loss');
      chartInstances.current['nn-loss'] = new Chart(chartRefs.current['nn-loss'], {
        type: 'line',
        data: {
          labels: nnData.loss_curve.map(l => l.epoch),
          datasets: [{
            label: 'Pérdida (Loss)',
            data: nnData.loss_curve.map(l => l.loss),
            borderColor: '#d97706', backgroundColor: 'rgba(217,119,6,0.08)',
            fill: true, tension: 0.3, pointRadius: 2,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: 'Curva de Aprendizaje (Loss por Época)', color: CHART_TITLE, font: { size: 14, weight: 'bold' } },
            legend: { display: false },
          },
          scales: {
            y: { title: { display: true, text: 'Loss', color: CHART_TICK }, ticks: { color: CHART_TICK }, grid: { color: CHART_GRID } },
            x: { title: { display: true, text: 'Época', color: CHART_TICK }, ticks: { color: CHART_TICK, maxTicksLimit: 20 }, grid: { color: CHART_GRID } },
          },
        },
      });
    }

    // Model comparison bar chart
    if (chartRefs.current['nn-comparison']) {
      destroyChart('nn-comparison');
      const colors = ['#dc2626', '#059669', '#d97706'];
      chartInstances.current['nn-comparison'] = new Chart(chartRefs.current['nn-comparison'], {
        type: 'bar',
        data: {
          labels: nnData.model_comparison.map(m => m.model),
          datasets: [{
            label: 'Accuracy (%)',
            data: nnData.model_comparison.map(m => m.accuracy * 100),
            backgroundColor: colors,
            borderRadius: 6, borderSkipped: false,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: 'Comparación de Modelos', color: CHART_TITLE, font: { size: 14, weight: 'bold' } },
            legend: { display: false },
          },
          scales: {
            y: { beginAtZero: true, max: 100, ticks: { callback: (v) => `${v}%`, color: CHART_TICK }, grid: { color: CHART_GRID } },
            x: { ticks: { color: CHART_TICK }, grid: { display: false } },
          },
        },
      });
    }

    return () => { destroyChart('nn-loss'); destroyChart('nn-comparison'); };
  }, [nnData, activeTab]);

  /* ════════════════════════════════════════════════════════
     HELPER: precision color/badge
     ════════════════════════════════════════════════════════ */
  const getAccuracyBadge = (val: number) => {
    if (val >= 0.85) return { text: 'Excelente', bg: 'bg-emerald-50', border: 'border-emerald-200', textColor: 'text-emerald-700' };
    if (val >= 0.70) return { text: 'Bueno', bg: 'bg-blue-50', border: 'border-blue-200', textColor: 'text-blue-700' };
    if (val >= 0.50) return { text: 'Aceptable', bg: 'bg-amber-50', border: 'border-amber-200', textColor: 'text-amber-700' };
    return { text: 'Bajo', bg: 'bg-red-50', border: 'border-red-200', textColor: 'text-red-700' };
  };

  const silhouetteBadge = (val: number) => {
    if (val >= 0.5) return { text: 'Buena separación', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' };
    if (val >= 0.25) return { text: 'Aceptable', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' };
    return { text: 'Débil', color: 'text-red-700', bg: 'bg-red-50 border-red-200' };
  };

  /* ════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════ */
  const currentTab = TABS.find(t => t.key === activeTab)!;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <i className="fas fa-robot text-blue-600" />
            Análisis Inteligente Avanzado
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Machine Learning aplicado al reclutamiento — 4 algoritmos avanzados entrenados con datos reales
          </p>
        </div>
        <button
          onClick={() => fetchData(activeTab)}
          disabled={loading[activeTab]}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm"
        >
          <i className={`fas fa-sync-alt ${loading[activeTab] ? 'animate-spin' : ''}`} />
          Reentrenar modelo
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl border border-gray-200">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm border border-gray-200'
                : 'text-gray-500 hover:text-gray-900 hover:bg-white/60'
            }`}
          >
            <i className={`${tab.icon} ${activeTab === tab.key ? tab.accent : ''}`} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ── Loading ── */}
      {loading[activeTab] && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-gray-200 animate-spin" style={{ borderTopColor: currentTab.color }} />
          <p className="text-gray-500 text-sm">Entrenando modelo, analizando datos…</p>
        </div>
      )}

      {/* ── Error ── */}
      {errors[activeTab] && !loading[activeTab] && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <i className="fas fa-exclamation-triangle text-amber-500 text-3xl mb-3" />
          <p className="text-gray-700">{errors[activeTab]}</p>
          <button onClick={() => fetchData(activeTab)} className="mt-4 px-5 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm hover:bg-amber-100 border border-amber-200 font-medium transition-colors">
            Reintentar
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          TAB 1: RANDOM FOREST
          ═══════════════════════════════════════════════════ */}
      {activeTab === 'random-forest' && rfData && !loading['random-forest'] && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Precisión</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <i className="fas fa-bullseye text-emerald-600 text-sm" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{(rfData.accuracy * 100).toFixed(1)}%</p>
              <div className="mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getAccuracyBadge(rfData.accuracy).bg} ${getAccuracyBadge(rfData.accuracy).textColor} border ${getAccuracyBadge(rfData.accuracy).border}`}>
                  {getAccuracyBadge(rfData.accuracy).text}
                </span>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Auto-Verificación</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <i className="fas fa-check-double text-blue-600 text-sm" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{(rfData.oob_score * 100).toFixed(1)}%</p>
              <p className="text-xs text-gray-500 mt-1.5">Prueba interna del modelo</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Validación Cruzada</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <i className="fas fa-layer-group text-purple-600 text-sm" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{(rfData.cross_validation.mean * 100).toFixed(1)}%</p>
              <p className="text-xs text-gray-500 mt-1.5">±{(rfData.cross_validation.std * 100).toFixed(1)}% (5 pruebas)</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Candidatos</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <i className="fas fa-users text-amber-600 text-sm" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{rfData.total_records}</p>
              <p className="text-xs text-gray-500 mt-1.5">{rfData.class_distribution.recommended} recomendados</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="h-80"><canvas ref={setRef('rf-importance')} /></div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="h-80"><canvas ref={setRef('rf-progression')} /></div>
            </div>
          </div>

          {/* Confusion Matrix */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
              <i className="fas fa-th text-emerald-600" />
              Tabla de Aciertos y Errores
            </h3>
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-emerald-600">{rfData.confusion_matrix.true_negative}</p>
                <p className="text-xs text-gray-500 mt-1.5 font-medium">Rechazos Correctos</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-red-500">{rfData.confusion_matrix.false_positive}</p>
                <p className="text-xs text-gray-500 mt-1.5 font-medium">Falsas Alarmas</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-red-500">{rfData.confusion_matrix.false_negative}</p>
                <p className="text-xs text-gray-500 mt-1.5 font-medium">No Detectados</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-emerald-600">{rfData.confusion_matrix.true_positive}</p>
                <p className="text-xs text-gray-500 mt-1.5 font-medium">Aciertos</p>
              </div>
            </div>
          </div>

          {/* Predictions table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <i className="fas fa-list-alt text-emerald-600" />
                Predicciones del Modelo
              </h3>
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">{rfData.predictions.length} candidatos</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase border-b border-gray-200 bg-gray-50/50">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Candidato</th>
                    <th className="px-4 py-3 font-semibold">Perfil</th>
                    <th className="px-4 py-3 font-semibold">Match</th>
                    <th className="px-4 py-3 font-semibold">Predicción</th>
                    <th className="px-4 py-3 font-semibold">Confianza</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rfData.predictions.slice(0, 15).map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-900 font-medium">{p.candidate}</td>
                      <td className="px-4 py-3 text-gray-500">{p.profile}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium">{p.match_percentage}%</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          p.predicted_class === 'Recomendado'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {p.predicted_class}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${p.confidence}%`,
                                backgroundColor: p.confidence >= 80 ? '#059669' : p.confidence >= 60 ? '#d97706' : '#dc2626',
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 font-medium">{p.confidence}%</span>
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

      {/* ═══════════════════════════════════════════════════
          TAB 2: K-MEANS
          ═══════════════════════════════════════════════════ */}
      {activeTab === 'kmeans' && !loading['kmeans'] && (
        <div className="space-y-6">
          {/* K selector */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 flex flex-wrap items-center gap-4">
            <span className="text-sm font-medium text-gray-700">Número de grupos a crear:</span>
            <div className="flex gap-2">
              {[2, 3, 4, 5].map(k => (
                <button
                  key={k}
                  onClick={() => { setKClusters(k); setKmData(null); }}
                  className={`w-10 h-10 rounded-lg text-sm font-bold transition-all ${
                    kClusters === k
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 text-gray-500 hover:text-gray-900 hover:bg-gray-200 border border-gray-200'
                  }`}
                >
                  {k}
                </button>
              ))}
            </div>
            {kmData && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs text-gray-500">Entrenado con K={kmData.n_clusters}</span>
              </div>
            )}
          </div>

          {kmData && (
            <>
              {/* Silhouette score bar */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-gray-700 font-semibold">Calidad del Agrupamiento — Índice de Separación</span>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl font-bold text-gray-900">{kmData.silhouette_score.toFixed(2)}</span>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${silhouetteBadge(kmData.silhouette_score).bg} ${silhouetteBadge(kmData.silhouette_score).color}`}>
                      {silhouetteBadge(kmData.silhouette_score).text}
                    </span>
                  </div>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(kmData.silhouette_score * 100, 100)}%`,
                      background: 'linear-gradient(90deg, #dc2626 0%, #d97706 40%, #059669 100%)',
                    }}
                  />
                </div>
              </div>

              {/* Cluster cards */}
              <div className={`grid gap-4 ${kmData.clusters.length <= 3 ? 'grid-cols-1 md:grid-cols-' + kmData.clusters.length : 'grid-cols-1 md:grid-cols-2 xl:grid-cols-' + kmData.clusters.length}`}>
                {kmData.clusters.map(cluster => (
                  <div
                    key={cluster.cluster_id}
                    className="bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 p-5 space-y-4"
                    style={{ borderLeftColor: cluster.color }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="text-xs font-semibold px-3 py-1 rounded-full"
                        style={{ backgroundColor: cluster.color + '15', color: cluster.color, border: `1px solid ${cluster.color}33` }}
                      >
                        {cluster.label}
                      </span>
                      <span className="text-sm text-gray-500 font-medium">{cluster.count} candidatos</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">Exp. Prom.</p>
                        <p className="text-lg font-bold text-gray-900">{cluster.avg_years_experience} años</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">Match Prom.</p>
                        <p className="text-lg font-bold text-gray-900">{cluster.avg_match_percentage}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">Habilidades</p>
                        <p className="text-lg font-bold text-gray-900">{cluster.avg_skills_count}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wider">% Recomendados</p>
                        <p className="text-lg font-bold text-gray-900">{cluster.pct_recommended}%</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 border-t border-gray-100 pt-3 italic">
                      {cluster.recommendation}
                    </p>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="h-72"><canvas ref={setRef('km-dist')} /></div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <div className="h-72"><canvas ref={setRef('km-elbow')} /></div>
                </div>
              </div>

              {/* Assignments table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                    <i className="fas fa-users text-blue-600" />
                    Asignación de Candidatos
                  </h3>
                  <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">{kmData.assignments.length} candidatos</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-xs text-gray-500 uppercase border-b border-gray-200 bg-gray-50/50">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Candidato</th>
                        <th className="px-4 py-3 font-semibold">Perfil</th>
                        <th className="px-4 py-3 font-semibold">Experiencia</th>
                        <th className="px-4 py-3 font-semibold">Match</th>
                        <th className="px-4 py-3 font-semibold">Cluster</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {kmData.assignments.slice(0, 15).map((a, i) => (
                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-900 font-medium">{a.candidate}</td>
                          <td className="px-4 py-3 text-gray-500">{a.profile}</td>
                          <td className="px-4 py-3 text-gray-700">{a.years_experience} años</td>
                          <td className="px-4 py-3 text-gray-700 font-medium">{a.match_percentage}%</td>
                          <td className="px-4 py-3">
                            <span
                              className="text-xs px-2.5 py-1 rounded-full font-semibold"
                              style={{
                                backgroundColor: kmData.clusters[a.cluster]?.color + '15',
                                color: kmData.clusters[a.cluster]?.color,
                                border: `1px solid ${kmData.clusters[a.cluster]?.color}33`,
                              }}
                            >
                              {a.cluster_label}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          TAB 3: PCA
          ═══════════════════════════════════════════════════ */}
      {activeTab === 'pca' && pcaData && !loading['pca'] && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Variables originales</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                  <i className="fas fa-database text-purple-600 text-sm" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{pcaData.n_features}</p>
              <p className="text-xs text-gray-500 mt-1.5">características analizadas</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Simplificadas a</span>
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                  <i className="fas fa-compress-arrows-alt text-violet-600 text-sm" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">2</p>
              <p className="text-xs text-gray-500 mt-1.5">dimensiones visuales</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Info. Conservada</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <i className="fas fa-chart-pie text-amber-600 text-sm" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{pcaData.total_variance_2d}%</p>
              <p className="text-xs text-gray-500 mt-1.5">de los datos originales</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Candidatos</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <i className="fas fa-users text-emerald-600 text-sm" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{pcaData.total_records}</p>
              <p className="text-xs text-gray-500 mt-1.5">en el mapa</p>
            </div>
          </div>

          {/* Scatter + Variance */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="h-96"><canvas ref={setRef('pca-scatter')} /></div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="h-96"><canvas ref={setRef('pca-variance')} /></div>
            </div>
          </div>

          {/* Feature loadings */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
              <i className="fas fa-arrows-alt text-purple-600" />
              ¿Qué características influyen más en cada eje del mapa?
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h4 className="text-sm font-semibold text-gray-600 mb-3">Eje Horizontal (PC1)</h4>
                {pcaData.top_features.pc1.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 mb-2.5">
                    <span className="text-sm text-gray-700 w-40 truncate">{FEATURE_LABELS[f.feature] || f.feature}</span>
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-purple-500" style={{ width: `${f.weight * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right font-medium">{(f.weight * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-600 mb-3">Eje Vertical (PC2)</h4>
                {pcaData.top_features.pc2.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 mb-2.5">
                    <span className="text-sm text-gray-700 w-40 truncate">{FEATURE_LABELS[f.feature] || f.feature}</span>
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-amber-500" style={{ width: `${f.weight * 100}%` }} />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right font-medium">{(f.weight * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Loadings table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
              <i className="fas fa-table text-violet-600" />
              Peso de cada variable en el análisis
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase border-b border-gray-200 bg-gray-50/50">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Variable</th>
                    <th className="px-4 py-3 font-semibold">Eje Horiz.</th>
                    <th className="px-4 py-3 font-semibold">Eje Vert.</th>
                    <th className="px-4 py-3 font-semibold">Importancia</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pcaData.loadings.map((l, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-900 font-medium">{FEATURE_LABELS[l.feature] || l.feature}</td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${l.pc1 >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{l.pc1.toFixed(3)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`font-medium ${l.pc2 >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{l.pc2.toFixed(3)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-violet-500" style={{ width: `${l.magnitude * 100}%` }} />
                          </div>
                          <span className="text-xs text-gray-500 font-medium">{l.magnitude.toFixed(3)}</span>
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

      {/* ═══════════════════════════════════════════════════
          TAB 4: NEURAL NETWORK
          ═══════════════════════════════════════════════════ */}
      {activeTab === 'neural-network' && nnData && !loading['neural-network'] && (
        <div className="space-y-6">
          {/* Architecture visual */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
              <i className="fas fa-project-diagram text-amber-600" />
              Arquitectura de la Red Neuronal
            </h3>
            <div className="flex items-center justify-center gap-3 flex-wrap py-4">
              {/* Input */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center min-w-[80px]">
                <p className="text-2xl font-bold text-blue-600">{nnData.architecture.input_layer}</p>
                <p className="text-[10px] text-gray-500 mt-1 uppercase font-medium">Entrada</p>
              </div>
              {nnData.architecture.hidden_layers.map((neurons, i) => (
                <div key={i} className="flex items-center gap-3">
                  <i className="fas fa-long-arrow-alt-right text-gray-300" />
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center min-w-[80px]">
                    <p className="text-2xl font-bold text-amber-600">{neurons}</p>
                    <p className="text-[10px] text-gray-500 mt-1 uppercase font-medium">Capa {i + 1}</p>
                  </div>
                </div>
              ))}
              <i className="fas fa-long-arrow-alt-right text-gray-300" />
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center min-w-[80px]">
                <p className="text-2xl font-bold text-emerald-600">{nnData.architecture.output_layer}</p>
                <p className="text-[10px] text-gray-500 mt-1 uppercase font-medium">Salida</p>
              </div>
            </div>
            <div className="flex justify-center gap-6 mt-3 text-xs text-gray-500">
              <span>Función de Activación: <strong className="text-gray-700">{nnData.architecture.activation.toUpperCase()}</strong></span>
              <span>Optimizador: <strong className="text-gray-700">{nnData.architecture.solver.toUpperCase()}</strong></span>
              <span>Conexiones: <strong className="text-gray-700">{nnData.architecture.total_params.toLocaleString()}</strong></span>
              <span>Ciclos de aprendizaje: <strong className="text-gray-700">{nnData.architecture.n_iterations}</strong></span>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Precisión</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <i className="fas fa-bullseye text-amber-600 text-sm" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{(nnData.accuracy * 100).toFixed(1)}%</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getAccuracyBadge(nnData.accuracy).bg} ${getAccuracyBadge(nnData.accuracy).textColor} border ${getAccuracyBadge(nnData.accuracy).border}`}>
                {getAccuracyBadge(nnData.accuracy).text}
              </span>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Validación Cruzada</span>
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                  <i className="fas fa-layer-group text-violet-600 text-sm" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{(nnData.cross_validation.mean * 100).toFixed(1)}%</p>
              <p className="text-xs text-gray-500 mt-1.5">±{(nnData.cross_validation.std * 100).toFixed(1)}% (5 pruebas)</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Recomendados</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <i className="fas fa-check-circle text-emerald-600 text-sm" />
                </div>
              </div>
              <p className="text-3xl font-bold text-emerald-600">{nnData.class_distribution.recommended}</p>
              <p className="text-xs text-gray-500 mt-1.5">por la red</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">No Recomendados</span>
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
                  <i className="fas fa-times-circle text-red-500 text-sm" />
                </div>
              </div>
              <p className="text-3xl font-bold text-red-500">{nnData.class_distribution.not_recommended}</p>
              <p className="text-xs text-gray-500 mt-1.5">por la red</p>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="h-80"><canvas ref={setRef('nn-loss')} /></div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="h-80"><canvas ref={setRef('nn-comparison')} /></div>
            </div>
          </div>

          {/* Confusion matrix */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
              <i className="fas fa-th text-amber-600" />
              Tabla de Aciertos y Errores
            </h3>
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-emerald-600">{nnData.confusion_matrix.true_negative}</p>
                <p className="text-xs text-gray-500 mt-1.5 font-medium">Rechazos Correctos</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-red-500">{nnData.confusion_matrix.false_positive}</p>
                <p className="text-xs text-gray-500 mt-1.5 font-medium">Falsas Alarmas</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-red-500">{nnData.confusion_matrix.false_negative}</p>
                <p className="text-xs text-gray-500 mt-1.5 font-medium">No Detectados</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-emerald-600">{nnData.confusion_matrix.true_positive}</p>
                <p className="text-xs text-gray-500 mt-1.5 font-medium">Aciertos</p>
              </div>
            </div>
          </div>

          {/* Predictions table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <i className="fas fa-brain text-amber-600" />
                Predicciones de la Red Neuronal
              </h3>
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">{nnData.predictions.length} candidatos</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase border-b border-gray-200 bg-gray-50/50">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Candidato</th>
                    <th className="px-4 py-3 font-semibold">Perfil</th>
                    <th className="px-4 py-3 font-semibold">Real</th>
                    <th className="px-4 py-3 font-semibold">Predicción IA</th>
                    <th className="px-4 py-3 font-semibold">Confianza</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {nnData.predictions.slice(0, 15).map((p, i) => (
                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-900 font-medium">{p.candidate}</td>
                      <td className="px-4 py-3 text-gray-500">{p.profile}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          p.real_class === 'Recomendado'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                          {p.real_class}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                          p.predicted_class === 'Recomendado'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {p.predicted_class}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${p.confidence}%`,
                                backgroundColor: p.confidence >= 80 ? '#059669' : p.confidence >= 60 ? '#d97706' : '#dc2626',
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 font-medium">{p.confidence}%</span>
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
    </div>
  );
}

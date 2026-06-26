'use client';

/* ════════════════════════════════════════════════════════════════════
   DASHBOARD DE ANÁLISIS — Reclutamiento con PySpark MLlib
   ────────────────────────────────────────────────────────────────────
   Reemplaza a "Análisis Inteligente" y "Análisis Avanzado".
   3 tipos de análisis (fáciles de explicar en presentación):

     1. PREDICCIÓN     → Regresión Lineal (PySpark)
        "¿Qué tan compatible es el candidato con el puesto?"

     2. CLASIFICACIÓN  → Árbol de Decisión (PySpark)
        "¿Lo recomendamos o no?"

     3. SEGMENTACIÓN   → K-Means Clustering (PySpark)
        "¿En qué pool de talento encaja?"
   ════════════════════════════════════════════════════════════════════ */

import { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

/* ── Tipos ────────────────────────────────────────────────────────── */

interface PredictionData {
  algorithm: string;
  total_records: number;
  train_size: number;
  test_size: number;
  feature_names: string[];
  metrics: { r2: number; rmse: number; mae: number; intercept: number };
  coefficients: Record<string, number>;
  predictions: {
    candidate: string;
    real: number;
    predicted: number;
    years_experience: number;
    education_level: number;
  }[];
  used_pyspark: boolean;
}

interface ClassificationData {
  algorithm: string;
  total_records: number;
  train_size: number;
  test_size: number;
  feature_names: string[];
  accuracy: number;
  confusion_matrix: {
    true_negative: number;
    false_positive: number;
    false_negative: number;
    true_positive: number;
  };
  feature_importances: Record<string, number>;
  tree_rules: string;
  class_distribution: { recommended: number; not_recommended: number };
  max_depth: number;
  predictions: {
    candidate: string;
    status: string;
    real_class: string;
    predicted_class: string;
    match_percentage: number;
  }[];
  used_pyspark: boolean;
}

interface SegmentationData {
  algorithm: string;
  total_records: number;
  n_clusters: number;
  silhouette_score: number;
  quality: string;
  clusters: {
    cluster_id: number;
    count: number;
    label: string;
    color: string;
    recommendation: string;
    avg_years_experience: number;
    avg_education_level: number;
    avg_skills_count: number;
    avg_salary_expectation: number;
    avg_eval_score: number;
    avg_match_percentage: number;
  }[];
  assignments: {
    candidate: string;
    cluster: number;
    cluster_label: string;
    match_percentage: number;
    years_experience: number;
    skills_count: number;
    status: string;
  }[];
  used_pyspark: boolean;
}

type TabKey = 'prediction' | 'classification' | 'segmentation';

const ANALYSIS_TIMEOUT_MS = 90000;

const FEATURE_LABELS: Record<string, string> = {
  years_experience: 'Años de Experiencia',
  education_level: 'Nivel Educativo',
  skills_count: 'Cant. Habilidades',
  salary_expectation: 'Expectativa Salarial (k)',
  eval_avg_score: 'Promedio Evaluaciones',
  technical_score: 'Score Técnico',
  experience_score: 'Score Experiencia',
};

/* ── Componente principal ────────────────────────────────────────── */

export default function AnalysisDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>('prediction');
  const [kClusters, setKClusters] = useState(3);

  const [predData, setPredData] = useState<PredictionData | null>(null);
  const [clsData, setClsData] = useState<ClassificationData | null>(null);
  const [segData, setSegData] = useState<SegmentationData | null>(null);

  const [loading, setLoading] = useState<Record<TabKey, boolean>>({
    prediction: false,
    classification: false,
    segmentation: false,
  });
  const [errors, setErrors] = useState<Record<TabKey, string | null>>({
    prediction: null,
    classification: null,
    segmentation: null,
  });

  /* ── Refs de los gráficos ── */
  const coefChartRef = useRef<HTMLCanvasElement>(null);
  const realVsPredChartRef = useRef<HTMLCanvasElement>(null);
  const importanceChartRef = useRef<HTMLCanvasElement>(null);
  const distChartRef = useRef<HTMLCanvasElement>(null);
  const clustersChartRef = useRef<HTMLCanvasElement>(null);
  const clusterStatsChartRef = useRef<HTMLCanvasElement>(null);

  const coefChart = useRef<Chart | null>(null);
  const realVsPredChart = useRef<Chart | null>(null);
  const importanceChart = useRef<Chart | null>(null);
  const distChart = useRef<Chart | null>(null);
  const clustersChart = useRef<Chart | null>(null);
  const clusterStatsChart = useRef<Chart | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  /* ── Detectar rol (director o supervisor) ── */
  const getRolePath = () => {
    if (typeof window === 'undefined') return 'director';
    return window.location.pathname.includes('/supervisor') ? 'supervisor' : 'director';
  };

  /* ── Fetcher genérico ── */
  const fetchAnalysis = async (tab: TabKey, extra = '') => {
    setLoading(p => ({ ...p, [tab]: true }));
    setErrors(p => ({ ...p, [tab]: null }));

    const role = getRolePath();
    const endpoints: Record<TabKey, string> = {
      prediction: `/${role}/analytics/spark/prediction/`,
      classification: `/${role}/analytics/spark/classification/`,
      segmentation: `/${role}/analytics/spark/segmentation/?k=${kClusters}`,
    };

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), ANALYSIS_TIMEOUT_MS);

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${apiBase}${endpoints[tab]}${extra}`, {
        signal: controller.signal,
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      if (data.error) {
        setErrors(p => ({ ...p, [tab]: data.error }));
        return;
      }
      if (tab === 'prediction') setPredData(data);
      if (tab === 'classification') setClsData(data);
      if (tab === 'segmentation') setSegData(data);
    } catch (e: any) {
      const message = e?.name === 'AbortError'
        ? 'El análisis está tardando demasiado. Spark sigue iniciando o el proceso quedó bloqueado; intenta recargar en unos segundos.'
        : e.message || 'Error desconocido';
      setErrors(p => ({ ...p, [tab]: message }));
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(p => ({ ...p, [tab]: false }));
    }
  };

  /* ── Auto-fetch al cambiar de pestaña ── */
  useEffect(() => {
    if (activeTab === 'prediction' && !predData && !loading.prediction) fetchAnalysis('prediction');
    if (activeTab === 'classification' && !clsData && !loading.classification) fetchAnalysis('classification');
    if (activeTab === 'segmentation' && !segData && !loading.segmentation) fetchAnalysis('segmentation');
  }, [activeTab]);

  /* ── Re-fetch segmentación si cambia k ── */
  useEffect(() => {
    if (activeTab === 'segmentation') {
      setSegData(null);
      fetchAnalysis('segmentation');
    }
  }, [kClusters]);

  /* ──────────────────────────────────────────────────────────────
     GRÁFICOS — PREDICCIÓN
     ────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!predData || activeTab !== 'prediction') return;

    // Influencia de cada variable (coeficientes)
    if (coefChartRef.current) {
      coefChart.current?.destroy();
      const entries = Object.entries(predData.coefficients);
      coefChart.current = new Chart(coefChartRef.current, {
        type: 'bar',
        data: {
          labels: entries.map(([k]) => FEATURE_LABELS[k] || k),
          datasets: [{
            label: 'Peso en la predicción',
            data: entries.map(([, v]) => v),
            backgroundColor: entries.map(([, v]) =>
              v >= 0 ? 'rgba(16,185,129,0.8)' : 'rgba(239,68,68,0.8)'
            ),
            borderRadius: 6,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: {
              display: true,
              text: '¿Qué datos del candidato pesan más en la predicción?',
              font: { size: 14, weight: 'bold' },
            },
          },
        },
      });
    }

    // Real vs Predicho (scatter)
    if (realVsPredChartRef.current) {
      realVsPredChart.current?.destroy();
      realVsPredChart.current = new Chart(realVsPredChartRef.current, {
        type: 'scatter',
        data: {
          datasets: [
            {
              label: 'Candidatos (cada punto = un candidato)',
              data: predData.predictions.map(p => ({ x: p.real, y: p.predicted })),
              backgroundColor: 'rgba(59,130,246,0.7)',
              pointRadius: 6,
            },
            {
              label: 'Predicción perfecta (línea ideal)',
              type: 'line' as any,
              data: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
              borderColor: 'rgba(107,114,128,0.6)',
              borderDash: [6, 4],
              pointRadius: 0,
              fill: false,
            } as any,
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: 'Real vs Predicho — entre más cerca de la línea, mejor',
              font: { size: 14, weight: 'bold' },
            },
          },
          scales: {
            x: { title: { display: true, text: 'Match Real (%)' }, min: 0, max: 100 },
            y: { title: { display: true, text: 'Predicho por el sistema (%)' }, min: 0, max: 100 },
          },
        },
      });
    }

    return () => {
      coefChart.current?.destroy();
      realVsPredChart.current?.destroy();
    };
  }, [predData, activeTab]);

  /* ──────────────────────────────────────────────────────────────
     GRÁFICOS — CLASIFICACIÓN
     ────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!clsData || activeTab !== 'classification') return;

    // Importancia de variables
    if (importanceChartRef.current) {
      importanceChart.current?.destroy();
      const entries = Object.entries(clsData.feature_importances)
        .sort((a, b) => b[1] - a[1]);
      const colors = [
        '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b',
        '#ef4444', '#6366f1', '#ec4899',
      ];
      importanceChart.current = new Chart(importanceChartRef.current, {
        type: 'bar',
        data: {
          labels: entries.map(([k]) => FEATURE_LABELS[k] || k),
          datasets: [{
            label: 'Importancia',
            data: entries.map(([, v]) => v),
            backgroundColor: colors.slice(0, entries.length),
            borderRadius: 6,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: {
              display: true,
              text: '¿Qué factor decide más si un candidato es Recomendado?',
              font: { size: 14, weight: 'bold' },
            },
          },
          scales: { x: { beginAtZero: true, max: 1 } },
        },
      });
    }

    // Distribución (dona)
    if (distChartRef.current) {
      distChart.current?.destroy();
      distChart.current = new Chart(distChartRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Recomendado', 'No Recomendado'],
          datasets: [{
            data: [
              clsData.class_distribution.recommended,
              clsData.class_distribution.not_recommended,
            ],
            backgroundColor: ['rgba(16,185,129,0.85)', 'rgba(239,68,68,0.85)'],
            borderWidth: 3,
            borderColor: '#fff',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: 'Cuántos candidatos cayeron en cada grupo',
              font: { size: 14, weight: 'bold' },
            },
            legend: { position: 'bottom' },
          },
        },
      });
    }

    return () => {
      importanceChart.current?.destroy();
      distChart.current?.destroy();
    };
  }, [clsData, activeTab]);

  /* ──────────────────────────────────────────────────────────────
     GRÁFICOS — SEGMENTACIÓN
     ────────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (!segData || activeTab !== 'segmentation') return;

    // Distribución de candidatos por cluster (dona)
    if (clustersChartRef.current) {
      clustersChart.current?.destroy();
      clustersChart.current = new Chart(clustersChartRef.current, {
        type: 'doughnut',
        data: {
          labels: segData.clusters.map(c => c.label),
          datasets: [{
            data: segData.clusters.map(c => c.count),
            backgroundColor: segData.clusters.map(c => c.color),
            borderWidth: 3,
            borderColor: '#fff',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: 'Cuántos candidatos hay en cada pool de talento',
              font: { size: 14, weight: 'bold' },
            },
            legend: { position: 'bottom' },
          },
        },
      });
    }

    // Comparativa de los clusters (barras agrupadas)
    if (clusterStatsChartRef.current) {
      clusterStatsChart.current?.destroy();
      clusterStatsChart.current = new Chart(clusterStatsChartRef.current, {
        type: 'bar',
        data: {
          labels: segData.clusters.map(c => c.label),
          datasets: [
            {
              label: 'Años Exp. (promedio)',
              data: segData.clusters.map(c => c.avg_years_experience),
              backgroundColor: 'rgba(59,130,246,0.85)',
              borderRadius: 6,
            },
            {
              label: 'Habilidades (promedio)',
              data: segData.clusters.map(c => c.avg_skills_count),
              backgroundColor: 'rgba(139,92,246,0.85)',
              borderRadius: 6,
            },
            {
              label: '% Match (promedio)',
              data: segData.clusters.map(c => c.avg_match_percentage),
              backgroundColor: 'rgba(16,185,129,0.85)',
              borderRadius: 6,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: {
              display: true,
              text: 'Características promedio de cada pool',
              font: { size: 14, weight: 'bold' },
            },
            legend: { position: 'bottom' },
          },
          scales: { y: { beginAtZero: true } },
        },
      });
    }

    return () => {
      clustersChart.current?.destroy();
      clusterStatsChart.current?.destroy();
    };
  }, [segData, activeTab]);

  /* ════════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════════ */

  return (
    <div className="p-6 space-y-6">
      {/* ── Header ── */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900 flex items-center">
          <i className="fas fa-chart-pie text-blue-600 mr-3" />
          Análisis
        </h2>
        <p className="text-gray-500 mt-1">
          3 análisis automáticos sobre los candidatos, ejecutados con{' '}
          <span className="font-semibold text-blue-700">PySpark</span>{' '}
          (procesamiento distribuido)
        </p>
      </div>

      {/* ── Tabs ── */}
      <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('prediction')}
          className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'prediction'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <i className="fas fa-chart-line mr-2" />
          1. Predicción
        </button>
        <button
          onClick={() => setActiveTab('classification')}
          className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'classification'
              ? 'bg-white text-purple-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <i className="fas fa-project-diagram mr-2" />
          2. Clasificación
        </button>
        <button
          onClick={() => setActiveTab('segmentation')}
          className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'segmentation'
              ? 'bg-white text-emerald-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <i className="fas fa-object-group mr-2" />
          3. Segmentación
        </button>
      </div>

      {/* ════════════════ TAB 1: PREDICCIÓN ════════════════ */}
      {activeTab === 'prediction' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <h3 className="font-semibold text-blue-900 mb-2 text-lg">
              <i className="fas fa-info-circle mr-2" />
              ¿Qué hace este análisis?
            </h3>
            <p className="text-blue-900 leading-relaxed">
              El sistema <strong>predice qué tan compatible</strong> es un candidato con el puesto.
              Toma los datos del candidato (experiencia, educación, habilidades, evaluaciones)
              y calcula automáticamente un <strong>porcentaje de match esperado</strong>.
            </p>
            <p className="text-blue-800 mt-2 text-sm">
              <strong>Algoritmo:</strong> Regresión Lineal con PySpark MLlib —
              el modelo aprende del historial y predice valores nuevos.
            </p>
          </div>

          {loading.prediction && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
              <div className="max-w-md text-sm text-gray-600">
                Cargando análisis y preparando el modelo. Esto puede tardar unos segundos según el entorno local.
              </div>
            </div>
          )}

          {errors.prediction && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
              <p className="text-yellow-800">{errors.prediction}</p>
              <button
                onClick={() => fetchAnalysis('prediction')}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Reintentar
              </button>
            </div>
          )}

          {predData && (
            <>
              {/* Métricas */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  value={predData.total_records}
                  label="Candidatos analizados"
                  color="text-blue-600"
                />
                <MetricCard
                  value={`${Math.max(0, Math.round(predData.metrics.r2 * 100))}%`}
                  label="Precisión del modelo (R²)"
                  color="text-emerald-600"
                />
                <MetricCard
                  value={predData.metrics.mae.toFixed(1)}
                  label="Error promedio (puntos)"
                  color="text-amber-600"
                />
                <MetricCard
                  value={predData.train_size}
                  label="Para entrenar"
                  color="text-purple-600"
                />
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="h-80"><canvas ref={coefChartRef} /></div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="h-80"><canvas ref={realVsPredChartRef} /></div>
                </div>
              </div>

              {/* Tabla de predicciones */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h4 className="font-semibold text-gray-900 mb-4">
                  Predicciones por candidato (primeros 10)
                </h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium text-gray-700">Candidato</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-700">Match Real</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-700">Predicción</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-700">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {predData.predictions.slice(0, 10).map((p, i) => {
                        const diff = Math.abs(p.real - p.predicted);
                        return (
                          <tr key={i} className="border-t">
                            <td className="px-4 py-2">{p.candidate}</td>
                            <td className="px-4 py-2 text-right font-medium">{p.real}%</td>
                            <td className="px-4 py-2 text-right text-blue-700 font-medium">{p.predicted}%</td>
                            <td className={`px-4 py-2 text-right ${diff > 10 ? 'text-red-600' : 'text-emerald-600'}`}>
                              {diff.toFixed(1)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════════ TAB 2: CLASIFICACIÓN ════════════════ */}
      {activeTab === 'classification' && (
        <div className="space-y-6">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
            <h3 className="font-semibold text-purple-900 mb-2 text-lg">
              <i className="fas fa-info-circle mr-2" />
              ¿Qué hace este análisis?
            </h3>
            <p className="text-purple-900 leading-relaxed">
              El sistema <strong>clasifica a cada candidato</strong> en una de dos categorías:
              <strong className="text-emerald-700"> Recomendado</strong> o
              <strong className="text-red-700"> No Recomendado</strong>.
              Lo hace generando reglas claras del tipo: «si tiene más de 5 años de experiencia
              <strong>Y</strong> su match es mayor al 75% → Recomendado».
            </p>
            <p className="text-purple-800 mt-2 text-sm">
              <strong>Algoritmo:</strong> Árbol de Decisión con PySpark MLlib —
              construye reglas tipo «si/entonces» fáciles de explicar.
            </p>
          </div>

          {loading.classification && (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
            </div>
          )}

          {errors.classification && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
              <p className="text-yellow-800">{errors.classification}</p>
              <button
                onClick={() => fetchAnalysis('classification')}
                className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700"
              >
                Reintentar
              </button>
            </div>
          )}

          {clsData && (
            <>
              {/* Métricas */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  value={`${(clsData.accuracy * 100).toFixed(1)}%`}
                  label="Aciertos del modelo"
                  color="text-purple-600"
                />
                <MetricCard
                  value={clsData.class_distribution.recommended}
                  label="Recomendados"
                  color="text-emerald-600"
                />
                <MetricCard
                  value={clsData.class_distribution.not_recommended}
                  label="No Recomendados"
                  color="text-red-600"
                />
                <MetricCard
                  value={clsData.total_records}
                  label="Candidatos analizados"
                  color="text-blue-600"
                />
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="h-80"><canvas ref={distChartRef} /></div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="h-80"><canvas ref={importanceChartRef} /></div>
                </div>
              </div>

              {/* Reglas del árbol */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h4 className="font-semibold text-gray-900 mb-3">
                  <i className="fas fa-sitemap mr-2 text-purple-600" />
                  Reglas que aprendió el árbol
                </h4>
                <p className="text-sm text-gray-600 mb-3">
                  Estas son las reglas que el sistema descubrió automáticamente:
                </p>
                <pre className="bg-gray-900 text-emerald-400 p-4 rounded-lg overflow-x-auto text-xs">
                  {clsData.tree_rules}
                </pre>
              </div>
            </>
          )}
        </div>
      )}

      {/* ════════════════ TAB 3: SEGMENTACIÓN ════════════════ */}
      {activeTab === 'segmentation' && (
        <div className="space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
            <h3 className="font-semibold text-emerald-900 mb-2 text-lg">
              <i className="fas fa-info-circle mr-2" />
              ¿Qué hace este análisis?
            </h3>
            <p className="text-emerald-900 leading-relaxed">
              El sistema <strong>agrupa automáticamente a los candidatos</strong> en pools
              de talento similares (sin que nadie le diga cómo agruparlos). Sirve para
              identificar perfiles tipo: <em>Senior Estratégico</em>, <em>Talento Operativo</em>,
              etc., basándose únicamente en los datos.
            </p>
            <p className="text-emerald-800 mt-2 text-sm">
              <strong>Algoritmo:</strong> K-Means Clustering con PySpark MLlib —
              encuentra patrones ocultos sin necesidad de etiquetas previas.
            </p>
          </div>

          {/* Selector de K */}
          <div className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4">
            <span className="font-medium text-gray-700">¿Cuántos pools quieres ver?</span>
            <div className="flex gap-2">
              {[2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  onClick={() => setKClusters(n)}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
                    kClusters === n
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {n} pools
                </button>
              ))}
            </div>
          </div>

          {loading.segmentation && (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
            </div>
          )}

          {errors.segmentation && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
              <p className="text-yellow-800">{errors.segmentation}</p>
              <button
                onClick={() => fetchAnalysis('segmentation')}
                className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
              >
                Reintentar
              </button>
            </div>
          )}

          {segData && (
            <>
              {/* Métricas */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                <MetricCard
                  value={segData.total_records}
                  label="Candidatos agrupados"
                  color="text-emerald-600"
                />
                <MetricCard
                  value={segData.n_clusters}
                  label="Pools detectados"
                  color="text-blue-600"
                />
                <MetricCard
                  value={segData.silhouette_score.toFixed(3)}
                  label={`Calidad: ${segData.quality}`}
                  color="text-purple-600"
                />
              </div>

              {/* Tarjetas por cluster */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {segData.clusters.map(c => (
                  <div
                    key={c.cluster_id}
                    className="bg-white rounded-xl shadow-sm border p-5"
                    style={{ borderTopWidth: 4, borderTopColor: c.color }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{c.label}</h4>
                      <span
                        className="text-xs px-2 py-1 rounded-full font-medium"
                        style={{ backgroundColor: `${c.color}22`, color: c.color }}
                      >
                        Pool {c.cluster_id}
                      </span>
                    </div>
                    <p className="text-3xl font-bold mb-2" style={{ color: c.color }}>
                      {c.count}
                    </p>
                    <p className="text-xs text-gray-500 mb-3">candidatos</p>
                    <p className="text-sm text-gray-600 italic mb-3">{c.recommendation}</p>
                    <div className="space-y-1 text-xs text-gray-600 border-t pt-2">
                      <div>Experiencia promedio: <strong>{c.avg_years_experience} años</strong></div>
                      <div>Match promedio: <strong>{c.avg_match_percentage}%</strong></div>
                      <div>Habilidades promedio: <strong>{c.avg_skills_count}</strong></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="h-80"><canvas ref={clustersChartRef} /></div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="h-80"><canvas ref={clusterStatsChartRef} /></div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Tarjeta de métrica reutilizable ── */
function MetricCard({
  value,
  label,
  color,
}: {
  value: string | number;
  label: string;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-5 text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

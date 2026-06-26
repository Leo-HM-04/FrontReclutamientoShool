'use client';

import { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

interface RegressionModel {
  r2: number;
  mae: number;
  rmse: number;
  intercept: number;
  coefficients: Record<string, number>;
}

interface RegressionData {
  total_records: number;
  train_size: number;
  test_size: number;
  feature_names: string[];
  models: Record<string, RegressionModel>;
  best_model: string;
  predictions: {
    candidate: string;
    real: number;
    predicted: number;
    years_experience: number;
    education_level: number;
  }[];
}

interface DecisionTreeData {
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
  class_distribution: {
    recommended: number;
    not_recommended: number;
  };
  max_depth: number;
  predictions: {
    candidate: string;
    status: string;
    real_label: number;
    predicted_label: number;
    real_class: string;
    predicted_class: string;
    match_percentage: number;
  }[];
}

const FEATURE_LABELS: Record<string, string> = {
  years_experience: 'Años Experiencia',
  education_level: 'Nivel Educativo',
  skills_count: 'Cant. Habilidades',
  salary_expectation: 'Expectativa Salarial (k)',
  eval_avg_score: 'Promedio Evaluaciones',
  technical_score: 'Score Técnico',
  experience_score: 'Score Experiencia',
  match_percentage: '% Match',
};

export default function MLAnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState<'regression' | 'decision-tree'>('regression');
  const [regressionData, setRegressionData] = useState<RegressionData | null>(null);
  const [treeData, setTreeData] = useState<DecisionTreeData | null>(null);
  const [loadingReg, setLoadingReg] = useState(false);
  const [loadingTree, setLoadingTree] = useState(false);
  const [errorReg, setErrorReg] = useState<string | null>(null);
  const [errorTree, setErrorTree] = useState<string | null>(null);

  // Chart refs
  const coefChartRef = useRef<HTMLCanvasElement>(null);
  const distChartRef = useRef<HTMLCanvasElement>(null);
  const importanceChartRef = useRef<HTMLCanvasElement>(null);

  const coefChartInstance = useRef<Chart | null>(null);
  const distChartInstance = useRef<Chart | null>(null);
  const importanceChartInstance = useRef<Chart | null>(null);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const fetchRegression = async () => {
    setLoadingReg(true);
    setErrorReg(null);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${apiBase}/director/analytics/ml/regression/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      if (data.error) {
        setErrorReg(data.error);
      } else {
        setRegressionData(data);
      }
    } catch (e: any) {
      setErrorReg(e.message);
    } finally {
      setLoadingReg(false);
    }
  };

  const fetchDecisionTree = async () => {
    setLoadingTree(true);
    setErrorTree(null);
    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch(`${apiBase}/director/analytics/ml/decision-tree/`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data = await res.json();
      if (data.error) {
        setErrorTree(data.error);
      } else {
        setTreeData(data);
      }
    } catch (e: any) {
      setErrorTree(e.message);
    } finally {
      setLoadingTree(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'regression' && !regressionData && !loadingReg) fetchRegression();
    if (activeTab === 'decision-tree' && !treeData && !loadingTree) fetchDecisionTree();
  }, [activeTab]);

  // ── Regression chart: Variables ──
  useEffect(() => {
    if (!regressionData) return;
    const models = regressionData.models;

    // Qué variables importan más para la predicción
    if (coefChartRef.current && regressionData.best_model) {
      coefChartInstance.current?.destroy();
      const best = models[regressionData.best_model];
      const feats = Object.keys(best.coefficients);
      const vals = feats.map(f => best.coefficients[f]);
      coefChartInstance.current = new Chart(coefChartRef.current, {
        type: 'bar',
        data: {
          labels: feats.map(f => FEATURE_LABELS[f] || f),
          datasets: [{
            label: 'Influencia',
            data: vals,
            backgroundColor: vals.map(v => v >= 0 ? 'rgba(16,185,129,0.8)' : 'rgba(239,68,68,0.8)'),
            borderRadius: 6,
            borderSkipped: false,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, title: { display: true, text: '¿Qué datos del candidato influyen más?', font: { size: 16, weight: 'bold' } } },
        },
      });
    }

    return () => {
      coefChartInstance.current?.destroy();
    };
  }, [regressionData]);

  // ── Decision Tree charts: Distribution + Feature Importance ──
  useEffect(() => {
    if (!treeData) return;

    // Chart 1: Recomendado vs No Recomendado (doughnut)
    if (distChartRef.current) {
      distChartInstance.current?.destroy();
      const dist = treeData.class_distribution;
      distChartInstance.current = new Chart(distChartRef.current, {
        type: 'doughnut',
        data: {
          labels: ['Recomendado', 'No Recomendado'],
          datasets: [{
            data: [dist.recommended, dist.not_recommended],
            backgroundColor: ['rgba(16,185,129,0.8)', 'rgba(239,68,68,0.8)'],
            borderWidth: 3,
            borderColor: '#fff',
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: 'Clasificación de Candidatos', font: { size: 16, weight: 'bold' } },
            legend: { position: 'bottom', labels: { font: { size: 14 }, padding: 20 } },
          },
        },
      });
    }

    // Chart 2: Feature importance (horizontal bar)
    if (importanceChartRef.current) {
      importanceChartInstance.current?.destroy();
      const imp = treeData.feature_importances;
      const sorted = Object.entries(imp).sort((a, b) => b[1] - a[1]);
      const feats = sorted.map(([f]) => f);
      const vals = sorted.map(([, v]) => v);
      const barColors = [
        'rgba(139,92,246,0.8)', 'rgba(59,130,246,0.8)', 'rgba(16,185,129,0.8)',
        'rgba(245,158,11,0.8)', 'rgba(239,68,68,0.8)', 'rgba(107,114,128,0.6)',
        'rgba(107,114,128,0.5)', 'rgba(107,114,128,0.4)',
      ];
      importanceChartInstance.current = new Chart(importanceChartRef.current, {
        type: 'bar',
        data: {
          labels: feats.map(f => FEATURE_LABELS[f] || f),
          datasets: [{
            label: 'Importancia',
            data: vals,
            backgroundColor: barColors.slice(0, feats.length),
            borderRadius: 6,
            borderSkipped: false,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false }, title: { display: true, text: '¿Qué factores influyen más en la decisión?', font: { size: 16, weight: 'bold' } } },
          scales: { x: { beginAtZero: true, max: 1, title: { display: true, text: 'Importancia (más largo = más influye)' } } },
        },
      });
    }

    return () => {
      distChartInstance.current?.destroy();
      importanceChartInstance.current?.destroy();
    };
  }, [treeData]);

  // ── RENDER ──
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">
          <i className="fas fa-brain text-purple-600 mr-3" />
          Análisis Inteligente
        </h2>
        <p className="text-gray-500 mt-1">
          El sistema aprende de los datos para predecir y clasificar candidatos automáticamente
        </p>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('regression')}
          className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'regression'
              ? 'bg-white text-blue-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <i className="fas fa-chart-line mr-2" />
          Predicción
        </button>
        <button
          onClick={() => setActiveTab('decision-tree')}
          className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
            activeTab === 'decision-tree'
              ? 'bg-white text-purple-700 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <i className="fas fa-project-diagram mr-2" />
          Clasificación
        </button>
      </div>

      {/* ═══════ TAB: REGRESIÓN ═══════ */}
      {activeTab === 'regression' && (
        <div className="space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
            <h3 className="font-semibold text-blue-900 mb-1">
              <i className="fas fa-info-circle mr-2" />
              ¿Cómo predice el sistema?
            </h3>
            <p className="text-blue-800 text-sm">
              El sistema analiza los datos de cada candidato (experiencia, educación, habilidades, etc.)
              para <strong>predecir su % de compatibilidad</strong> con un perfil.
              La gráfica muestra qué datos del candidato son los que más influyen en esa predicción.
            </p>
          </div>

          {loadingReg && (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
            </div>
          )}

          {errorReg && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
              <p className="text-yellow-800">{errorReg}</p>
              <button onClick={fetchRegression} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                Reintentar
              </button>
            </div>
          )}

          {regressionData && (
            <>
              {/* Metric cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-xl shadow-sm border p-5 text-center">
                  <p className="text-3xl font-bold text-blue-600">{regressionData.total_records}</p>
                  <p className="text-sm text-gray-500 mt-1">Candidatos analizados</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-5 text-center">
                  <p className="text-3xl font-bold text-purple-600">
                    {regressionData.models[regressionData.best_model]
                      ? Math.round(regressionData.models[regressionData.best_model].r2 * 100) + '%'
                      : '-'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">Precisión del sistema</p>
                </div>
              </div>

              {/* Chart */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <div className="h-80"><canvas ref={coefChartRef} /></div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════ TAB: ÁRBOL DE DECISIÓN ═══════ */}
      {activeTab === 'decision-tree' && (
        <div className="space-y-6">
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
            <h3 className="font-semibold text-purple-900 mb-1">
              <i className="fas fa-info-circle mr-2" />
              ¿Cómo clasifica el sistema?
            </h3>
            <p className="text-purple-800 text-sm">
              El sistema aprende de los candidatos anteriores para <strong>clasificar automáticamente</strong> a cada nuevo candidato como
              <strong> Recomendado</strong> o <strong>No Recomendado</strong>.
              La dona muestra cuántos hay de cada tipo. La gráfica de barras muestra qué datos
              del candidato fueron más importantes para esa clasificación.
            </p>
          </div>

          {loadingTree && (
            <div className="flex justify-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
            </div>
          )}

          {errorTree && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
              <p className="text-yellow-800">{errorTree}</p>
              <button onClick={fetchDecisionTree} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
                Reintentar
              </button>
            </div>
          )}

          {treeData && (
            <>
              {/* Metric cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl shadow-sm border p-5 text-center">
                  <p className="text-3xl font-bold text-purple-600">{(treeData.accuracy * 100).toFixed(1)}%</p>
                  <p className="text-sm text-gray-500 mt-1">Precisión del modelo</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-5 text-center">
                  <p className="text-3xl font-bold text-green-600">{treeData.class_distribution.recommended}</p>
                  <p className="text-sm text-gray-500 mt-1">Recomendados</p>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-5 text-center">
                  <p className="text-3xl font-bold text-red-600">{treeData.class_distribution.not_recommended}</p>
                  <p className="text-sm text-gray-500 mt-1">No Recomendados</p>
                </div>
              </div>

              {/* 2 Charts side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="h-80"><canvas ref={distChartRef} /></div>
                </div>
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <div className="h-80"><canvas ref={importanceChartRef} /></div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

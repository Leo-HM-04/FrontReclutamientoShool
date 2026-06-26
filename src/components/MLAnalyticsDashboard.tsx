'use client';

import { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';

interface RegressionModel {
  r2: number;
  mae: number;
  mse: number;
  rmse: number;
  intercept: number;
  coefficients: Record<string, number>;
}

interface RegressionOptimization {
  baseline_alpha: number;
  best_alpha: number;
  baseline_mse: number;
  optimized_mse: number;
  baseline_mae: number;
  optimized_mae: number;
  optimized_r2: number;
  mse_improvement_pct: number;
}

interface RegressionData {
  total_records: number;
  train_size: number;
  test_size: number;
  feature_names: string[];
  models: Record<string, RegressionModel>;
  best_model: string;
  optimization?: Record<string, RegressionOptimization>;
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
  precision: number;
  recall: number;
  f1_score: number;
  optimization?: {
    baseline_max_depth: number;
    baseline_accuracy: number;
    best_max_depth: number | null;
    best_min_samples_split?: number;
    optimized_accuracy?: number;
    optimized_precision?: number;
    optimized_recall?: number;
    optimized_f1?: number;
    cv_best_score?: number;
    error?: string;
  };
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

              {/* ¿Qué tan confiable es la predicción? (lenguaje sencillo) */}
              {(() => {
                const best = regressionData.models[regressionData.best_model];
                if (!best) return null;
                const r2pct = Math.max(0, Math.round(best.r2 * 100));
                const grade =
                  best.r2 >= 0.8 ? { t: 'Excelente', c: 'text-green-600' } :
                  best.r2 >= 0.6 ? { t: 'Buena', c: 'text-green-600' } :
                  best.r2 >= 0.4 ? { t: 'Aceptable', c: 'text-amber-600' } :
                  { t: 'En aprendizaje', c: 'text-gray-600' };
                const margin = Math.round(best.mae);
                return (
                  <div className="bg-white rounded-xl shadow-sm border p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">
                      <i className="fas fa-bullseye text-blue-600 mr-2" />
                      ¿Qué tan confiable es la predicción?
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="bg-blue-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">En promedio, la predicción se desvía por</p>
                        <p className="text-3xl font-bold text-blue-700">± {best.mae.toFixed(1)} pts</p>
                        <p className="text-xs text-gray-400 mt-1">de los 100 puntos de compatibilidad</p>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-4">
                        <p className="text-sm text-gray-600">Calidad general de las predicciones</p>
                        <p className={`text-3xl font-bold ${grade.c}`}>{grade.t}</p>
                        <p className="text-xs text-gray-400 mt-1">explica el {r2pct}% del comportamiento</p>
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
                      <i className="fas fa-lightbulb text-amber-500 mr-2" />
                      Dicho fácil: si el sistema estima que un candidato tiene un <strong>80%</strong> de
                      compatibilidad, lo más probable es que el valor real esté entre{' '}
                      <strong>{Math.max(0, 80 - margin)}%</strong> y <strong>{Math.min(100, 80 + margin)}%</strong>.
                    </div>

                    {/* Detalle técnico (oculto, para el reporte académico) */}
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-600 select-none">
                        Ver detalle técnico (para el reporte académico)
                      </summary>
                      <div className="overflow-x-auto mt-3">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-500 border-b">
                              <th className="py-2 pr-4">Modelo</th>
                              <th className="py-2 px-3 text-right" title="Coeficiente de determinación">R²</th>
                              <th className="py-2 px-3 text-right" title="Error Absoluto Medio">MAE</th>
                              <th className="py-2 px-3 text-right" title="Error Cuadrático Medio">MSE</th>
                              <th className="py-2 px-3 text-right" title="Raíz del Error Cuadrático Medio">RMSE</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(regressionData.models).map(([name, m]) => {
                              const isBest = name === regressionData.best_model;
                              return (
                                <tr key={name} className={`border-b last:border-0 ${isBest ? 'bg-green-50 font-medium' : ''}`}>
                                  <td className="py-2 pr-4">
                                    {name}
                                    {isBest && <span className="ml-2 text-xs text-green-700">★ mejor</span>}
                                  </td>
                                  <td className="py-2 px-3 text-right">{m.r2.toFixed(3)}</td>
                                  <td className="py-2 px-3 text-right">{m.mae.toFixed(3)}</td>
                                  <td className="py-2 px-3 text-right">{m.mse.toFixed(3)}</td>
                                  <td className="py-2 px-3 text-right">{m.rmse.toFixed(3)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        <p className="text-xs text-gray-400 mt-2">
                          Evaluado sobre {regressionData.test_size} registros de prueba. Menor error = mejor; R² cercano a 1 = mejor ajuste.
                        </p>
                      </div>
                    </details>
                  </div>
                );
              })()}

              {/* El sistema se ajustó solo (optimización en lenguaje sencillo) */}
              {regressionData.optimization && Object.keys(regressionData.optimization).length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    <i className="fas fa-magic text-purple-600 mr-2" />
                    El sistema se ajustó solo para equivocarse menos
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Probó varias configuraciones automáticamente y se quedó con la que comete menos errores.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(regressionData.optimization).map(([name, o]) => (
                      <div key={name} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-800">{name}</span>
                          {o.mse_improvement_pct > 0 ? (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                              <i className="fas fa-arrow-down mr-1" />{o.mse_improvement_pct}% menos error
                            </span>
                          ) : (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                              ya estaba bien ajustado
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700">
                          Antes se desviaba <strong>± {o.baseline_mae.toFixed(1)} pts</strong>{' '}
                          <i className="fas fa-long-arrow-alt-right mx-1 text-gray-400" />{' '}
                          ahora <strong className="text-green-700">± {o.optimized_mae.toFixed(1)} pts</strong>.
                        </p>
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600 select-none">
                            Detalle técnico
                          </summary>
                          <div className="text-xs text-gray-500 mt-1 space-y-0.5">
                            <div className="flex justify-between"><span>Regularización α</span><span className="font-mono">{o.baseline_alpha} → {o.best_alpha}</span></div>
                            <div className="flex justify-between"><span>MSE</span><span className="font-mono">{o.baseline_mse.toFixed(3)} → {o.optimized_mse.toFixed(3)}</span></div>
                            <div className="flex justify-between"><span>R² optimizado</span><span className="font-mono">{o.optimized_r2.toFixed(3)}</span></div>
                          </div>
                        </details>
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
                  <p className="text-3xl font-bold text-purple-600">{(treeData.accuracy * 100).toFixed(0)}%</p>
                  <p className="text-sm text-gray-500 mt-1">Aciertos del sistema</p>
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

              {/* ¿Qué tan confiable es la clasificación? (lenguaje sencillo) */}
              <div className="bg-white rounded-xl shadow-sm border p-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  <i className="fas fa-bullseye text-purple-600 mr-2" />
                  ¿Qué tan confiable es la clasificación?
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">Cuando dice <strong>"Recomendado"</strong>, acierta el</p>
                    <p className="text-3xl font-bold text-blue-700">{(treeData.precision * 100).toFixed(0)}%</p>
                    <p className="text-xs text-gray-400 mt-1">de las veces</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-4">
                    <p className="text-sm text-gray-600">De los buenos candidatos reales, encuentra al</p>
                    <p className="text-3xl font-bold text-emerald-700">{(treeData.recall * 100).toFixed(0)}%</p>
                    <p className="text-xs text-gray-400 mt-1">no se le escapan</p>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700">
                  <i className="fas fa-lightbulb text-amber-500 mr-2" />
                  En total, el sistema clasifica correctamente a <strong>{(treeData.accuracy * 100).toFixed(0)} de cada 100</strong> candidatos.
                </div>

                {/* Detalle técnico (oculto, para el reporte académico) */}
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-600 select-none">
                    Ver detalle técnico (para el reporte académico)
                  </summary>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                    <div className="border rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-purple-600">{(treeData.accuracy * 100).toFixed(1)}%</p>
                      <p className="text-xs text-gray-500 mt-1">Exactitud (Accuracy)</p>
                    </div>
                    <div className="border rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">{(treeData.precision * 100).toFixed(1)}%</p>
                      <p className="text-xs text-gray-500 mt-1">Precisión</p>
                    </div>
                    <div className="border rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-emerald-600">{(treeData.recall * 100).toFixed(1)}%</p>
                      <p className="text-xs text-gray-500 mt-1">Sensibilidad (Recall)</p>
                    </div>
                    <div className="border rounded-lg p-4 text-center">
                      <p className="text-2xl font-bold text-amber-600">{(treeData.f1_score * 100).toFixed(1)}%</p>
                      <p className="text-xs text-gray-500 mt-1">F1-Score</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Evaluado sobre {treeData.test_size} registros de prueba. Valores más cercanos al 100% = mejor.
                  </p>
                </details>
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

              {/* El sistema se afinó solo (optimización en lenguaje sencillo) */}
              {treeData.optimization && !treeData.optimization.error && (
                <div className="bg-white rounded-xl shadow-sm border p-6">
                  <h3 className="font-semibold text-gray-900 mb-1">
                    <i className="fas fa-magic text-purple-600 mr-2" />
                    El sistema se afinó solo para acertar más
                  </h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Probó distintas formas de decidir y se quedó con la que más acierta.
                  </p>
                  <div className="bg-purple-50 rounded-lg p-4 text-gray-700">
                    <p className="text-base">
                      Pasó de acertar <strong>{(treeData.optimization.baseline_accuracy * 100).toFixed(0)}%</strong>{' '}
                      <i className="fas fa-long-arrow-alt-right mx-1 text-gray-400" />{' '}
                      a acertar{' '}
                      <strong className="text-green-700">{((treeData.optimization.optimized_accuracy ?? 0) * 100).toFixed(0)}%</strong>{' '}
                      de las veces.
                    </p>
                  </div>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-gray-400 hover:text-gray-600 select-none">
                      Ver detalle técnico (para el reporte académico)
                    </summary>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mt-3">
                      <div className="border rounded-lg p-4 space-y-1">
                        <div className="flex justify-between">
                          <span>Profundidad (max_depth)</span>
                          <span className="font-mono">
                            {treeData.optimization.baseline_max_depth} → {treeData.optimization.best_max_depth ?? 'sin límite'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Exactitud</span>
                          <span className="font-mono">
                            {(treeData.optimization.baseline_accuracy * 100).toFixed(1)}% → {((treeData.optimization.optimized_accuracy ?? 0) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="border rounded-lg p-4 space-y-1">
                        <div className="flex justify-between">
                          <span>Precisión optimizada</span>
                          <span className="font-mono">{((treeData.optimization.optimized_precision ?? 0) * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>F1 optimizado</span>
                          <span className="font-mono">{((treeData.optimization.optimized_f1 ?? 0) * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  </details>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

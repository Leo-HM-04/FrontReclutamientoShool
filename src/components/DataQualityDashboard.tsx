'use client';

/* ════════════════════════════════════════════════════════════════════
   DASHBOARD DE CALIDAD DE DATOS
   ────────────────────────────────────────────────────────────────────
   Consume /api/data-quality/ del backend.
   3 secciones:
     1. Calidad      → completitud, issues, scans
     2. Importación  → preview + mapping + dedupe
     3. KDD          → corridas del pipeline KDD
   ════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useRef, useState } from 'react';

type SectionKey = 'quality' | 'imports' | 'kdd';

interface SeverityCount { severity: string; count: number; }
interface IssueTypeCount { issue_type: string; count: number; }
interface ScanSummary {
  id?: string | number;
  status?: string;
  total_records?: number;
  issues_total?: number;
  completeness_pct?: number;
  issue_counts_by_type?: Record<string, number>;
  issue_counts_by_severity?: Record<string, number>;
  finished_at?: string | null;
}
interface ImportJob {
  id: string | number;
  status: string;
  source_filename: string;
  source_format: string;
  rows_total: number;
  rows_created: number;
  rows_updated: number;
  rows_skipped: number;
  rows_errors: number;
  errors_summary: { row: number; field: string; severity: string; message: string }[];
  null_strategy: string;
  dedupe_policy: string;
  created_at: string;
}
interface KDDRun {
  id: string | number;
  status: string;
  algorithm: string;
  null_strategy: string;
  step_results: any[];
  summary: any;
  elapsed_seconds: number;
  started_at: string;
}
interface DashboardData {
  totals: { scans: number; imports: number; kdd_runs: number; open_issues: number };
  last_scans: { candidates: ScanSummary | null; clients: ScanSummary | null };
  severity_breakdown: SeverityCount[];
  top_issue_types: IssueTypeCount[];
  recent_imports: ImportJob[];
  recent_kdd_runs: KDDRun[];
  null_strategy_options: { value: string; label: string }[];
}

interface PreviewResponse {
  headers: string[];
  suggested_mapping: Record<string, string>;
  available_target_fields: string[];
  sample_rows: Record<string, any>[];
  total_rows: number;
  xlsx_supported: boolean;
  filename: string;
  format: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200',
  error: 'bg-orange-100 text-orange-700 border-orange-200',
  warning: 'bg-amber-100 text-amber-700 border-amber-200',
  info: 'bg-blue-100 text-blue-700 border-blue-200',
};

const ALGORITHMS = [
  { value: 'quality_only', label: 'Solo calidad (sin algoritmo)' },
  { value: 'regression', label: 'Regresión Lineal' },
  { value: 'decision_tree', label: 'Árbol de Decisión' },
  { value: 'kmeans', label: 'K-Means' },
];

const KDD_ALGORITHM_LABELS: Record<string, string> = {
  quality_only: 'Solo calidad',
  regression: 'Regresión lineal',
  decision_tree: 'Árbol de decisión',
  kmeans: 'K-Means',
};

const KDD_STEP_LABELS: Record<string, string> = {
  selection: 'Selección de datos',
  cleaning: 'Limpieza',
  transformation: 'Transformación',
  data_mining: 'Minería de datos',
  evaluation: 'Evaluación',
};

const NULL_STRATEGY_META: Record<string, { label: string; description: string }> = {
  drop_nulls: {
    label: 'Descartar filas con nulos',
    description: 'Elimina los registros que tengan vacíos en campos críticos. Útil cuando quieres trabajar solo con datos completos.',
  },
  keep_and_flag: {
    label: 'Conservar y marcar nulos',
    description: 'Mantiene los registros incompletos, pero los deja identificados para revisión posterior.',
  },
  impute_defaults: {
    label: 'Rellenar con valores seguros',
    description: 'Completa automáticamente los vacíos con valores por defecto para no detener el proceso.',
  },
};

function getNullStrategyMeta(value: string) {
  return NULL_STRATEGY_META[value] || {
    label: value,
    description: 'Estrategia aplicada para manejar valores nulos o vacíos.',
  };
}

function getKddAlgorithmLabel(value: string) {
  return KDD_ALGORITHM_LABELS[value] || value;
}

function getKddStepLabel(value: string) {
  return KDD_STEP_LABELS[value] || value;
}

function getKddResultDescription(grade?: string, algorithm?: string) {
  if (!grade) return 'La corrida terminó, pero no devolvió una interpretación resumida del resultado.';
  if (grade === 'Excelente') {
    return 'El resultado del pipeline es fuerte. El modelo o agrupamiento encontró un patrón muy útil para apoyar decisiones.';
  }
  if (grade === 'Bueno') {
    return 'El resultado es confiable para apoyo operativo. Hay una señal clara en los datos, aunque todavía puede mejorarse con más información o ajuste.';
  }
  if (grade === 'Aceptable') {
    return 'El resultado da una referencia útil, pero debe interpretarse con cautela. Conviene complementarlo con revisión humana.';
  }
  if (grade === 'Pobre') {
    return 'El modelo encontró una relación débil en los datos. No conviene usar este resultado por sí solo para tomar decisiones.';
  }
  if (grade === 'Débil') {
    return 'Los grupos detectados no quedaron bien separados. Eso significa que los clusters no representan diferencias claras entre candidatos.';
  }
  if (grade === 'n/a') {
    return algorithm === 'quality_only'
      ? 'Esta corrida se usó para revisar calidad y preparar datos, sin ejecutar un algoritmo de minería.'
      : 'La corrida terminó sin una calificación interpretable del algoritmo.';
  }
  return 'Resultado generado por el pipeline KDD.';
}

function getKddGradeMeta(grade?: string) {
  const map: Record<string, { tone: string; dot: string; label: string }> = {
    Excelente: {
      tone: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dot: 'bg-emerald-500',
      label: 'Semáforo verde',
    },
    Bueno: {
      tone: 'bg-lime-50 text-lime-700 border-lime-200',
      dot: 'bg-lime-500',
      label: 'Semáforo verde',
    },
    Aceptable: {
      tone: 'bg-amber-50 text-amber-700 border-amber-200',
      dot: 'bg-amber-500',
      label: 'Semáforo amarillo',
    },
    Pobre: {
      tone: 'bg-red-50 text-red-700 border-red-200',
      dot: 'bg-red-500',
      label: 'Semáforo rojo',
    },
    Débil: {
      tone: 'bg-orange-50 text-orange-700 border-orange-200',
      dot: 'bg-orange-500',
      label: 'Semáforo naranja',
    },
    'n/a': {
      tone: 'bg-gray-50 text-gray-700 border-gray-200',
      dot: 'bg-gray-400',
      label: 'Sin calificación',
    },
  };

  return map[grade || ''] || map['n/a'];
}

function getKddMetricMeta(run: KDDRun) {
  const mining = run.summary?.mining_result;
  if (!mining || typeof mining !== 'object') return null;

  if (typeof mining.r2 === 'number') {
    return {
      label: 'R²',
      value: String(mining.r2),
      explanation: 'Indica qué tanto del comportamiento de los datos logra explicar la regresión. Mientras más alto, mejor ajuste.',
    };
  }
  if (typeof mining.accuracy === 'number') {
    return {
      label: 'Precisión',
      value: `${(mining.accuracy * 100).toFixed(1)}%`,
      explanation: 'Mide qué porcentaje de casos clasificó correctamente el modelo. Mientras más alto, más aciertos.',
    };
  }
  if (typeof mining.silhouette === 'number') {
    return {
      label: 'Silhouette',
      value: `${mining.silhouette}${typeof mining.k === 'number' ? ` · K=${mining.k}` : ''}`,
      explanation: 'Indica qué tan bien separados quedaron los grupos creados por K-Means. Más alto significa clusters más claros.',
    };
  }
  if (typeof mining.note === 'string') {
    return {
      label: 'Observación',
      value: mining.note,
      explanation: 'En esta corrida no se ejecutó minería de datos; se utilizó el pipeline para revisar calidad y preparación.',
    };
  }
  return null;
}

function getKddStepExplanation(step: any) {
  switch (step?.step) {
    case 'selection':
      return 'Aquí se arma el conjunto base de datos que entrará al análisis. En este proyecto normalmente se seleccionan candidatos con aplicaciones disponibles.';
    case 'cleaning':
      return 'Aquí se revisan nulos o faltantes según la estrategia elegida. Dependiendo de la opción, los registros se descartan, se marcan o se completan con valores seguros.';
    case 'transformation':
      return 'Aquí no se corrigen errores de negocio ni se eliminan registros. Lo que se hace es preparar los datos para el algoritmo: convertir campos a números, asegurar formato consistente y rellenar faltantes técnicos con 0 cuando aplica.';
    case 'data_mining':
      return 'En esta etapa corre el algoritmo seleccionado, como regresión, árbol de decisión o K-Means, para encontrar patrones o hacer predicciones.';
    case 'evaluation':
      return 'Aquí se interpreta el resultado del algoritmo y se resume su calidad para que sea más fácil entender si el análisis fue útil o no.';
    default:
      return 'Paso del pipeline KDD.';
  }
}

function getKddStepDetails(step: any) {
  const details: string[] = [];
  if (typeof step.rows_in === 'number' && typeof step.rows_out === 'number') {
    if (step.step === 'selection') {
      details.push(`${step.rows_out} registros seleccionados`);
    } else if (step.step === 'transformation') {
      if (step.rows_in === step.rows_out) {
        details.push(`${step.rows_out} registros preparados para el modelo`);
      } else {
        details.push(`${step.rows_in} -> ${step.rows_out} registros transformados`);
      }
    } else if (step.step === 'cleaning') {
      details.push(`${step.rows_out} registros después de limpieza`);
    } else {
      details.push(`${step.rows_in} -> ${step.rows_out} registros`);
    }
  }
  if (typeof step.dropped === 'number' && step.dropped > 0) {
    details.push(`${step.dropped} descartados`);
  }
  if (typeof step.flagged === 'number' && step.flagged > 0) {
    details.push(`${step.flagged} marcados`);
  }
  if (step.imputed_fields && typeof step.imputed_fields === 'object' && Object.keys(step.imputed_fields).length > 0) {
    details.push('se completaron campos vacíos');
  }
  if (step.grade) {
    details.push(`resultado ${step.grade}`);
  }
  return details.join(' · ');
}

function getKddStepTone(step: any) {
  if (step?.error) return 'bg-red-500';
  if (step?.step === 'evaluation') return 'bg-emerald-500';
  return 'bg-indigo-500';
}

function formatRunId(id: string | number) {
  const text = String(id);
  return text.length > 12 ? `#${text.slice(-12)}` : `#${text}`;
}

export default function DataQualityDashboard() {
  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api').replace(/\/$/, '');
  const dataQualityBase = apiBase.endsWith('/api') ? apiBase : `${apiBase}/api`;
  const [section, setSection] = useState<SectionKey>('quality');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  // Imports state
  const [previewFile, setPreviewFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [nullStrategy, setNullStrategy] = useState('keep_and_flag');
  const [dedupePolicy, setDedupePolicy] = useState<'skip' | 'update'>('skip');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // KDD state
  const [kddAlgorithm, setKddAlgorithm] = useState('quality_only');
  const [kddNullStrategy, setKddNullStrategy] = useState('keep_and_flag');
  const [kddKValue, setKddKValue] = useState(3);
  const [runningKdd, setRunningKdd] = useState(false);

  const authHeaders = useCallback((): Record<string, string> => {
    if (typeof window === 'undefined') return {};
    const token = localStorage.getItem('authToken');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${dataQualityBase}/data-quality/dashboard/`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (e: any) {
      setError(e.message || 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }, [dataQualityBase, authHeaders]);

  useEffect(() => { loadDashboard(); }, [loadDashboard]);

  const flash = (msg: string) => {
    setActionMsg(msg);
    setTimeout(() => setActionMsg(null), 4000);
  };

  /* ── Scans ── */
  const triggerScan = async (entity: 'candidates' | 'clients') => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${dataQualityBase}/data-quality/scans/${entity}/`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      flash(`Scan de ${entity} ejecutado.`);
      await loadDashboard();
    } catch (e: any) {
      setError(e.message || 'Error en scan');
    } finally {
      setLoading(false);
    }
  };

  /* ── Import preview + run ── */
  const onSelectFile = async (file: File | null) => {
    setPreviewFile(file);
    setPreview(null);
    setMapping({});
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${dataQualityBase}/data-quality/imports/preview/`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Error ${res.status}: ${txt.slice(0, 200)}`);
      }
      const json: PreviewResponse = await res.json();
      setPreview(json);
      setMapping(json.suggested_mapping || {});
    } catch (e: any) {
      setError(e.message || 'Error en preview');
    } finally {
      setLoading(false);
    }
  };

  const runImport = async () => {
    if (!previewFile) return;
    const formData = new FormData();
    formData.append('file', previewFile);
    formData.append('column_mapping', JSON.stringify(mapping));
    formData.append('null_strategy', nullStrategy);
    formData.append('dedupe_policy', dedupePolicy);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${dataQualityBase}/data-quality/imports/run/`, {
        method: 'POST',
        headers: authHeaders(),
        body: formData,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Error ${res.status}: ${txt.slice(0, 200)}`);
      }
      const job: ImportJob = await res.json();
      flash(
        `Import «${job.source_filename}»: ${job.rows_created} creados, ` +
        `${job.rows_updated} actualizados, ${job.rows_skipped} omitidos, ` +
        `${job.rows_errors} errores.`
      );
      setPreviewFile(null);
      setPreview(null);
      setMapping({});
      if (fileInputRef.current) fileInputRef.current.value = '';
      await loadDashboard();
    } catch (e: any) {
      setError(e.message || 'Error ejecutando import');
    } finally {
      setLoading(false);
    }
  };

  /* ── KDD ── */
  const runKdd = async () => {
    setRunningKdd(true);
    setError(null);
    try {
      const body: Record<string, any> = {
        algorithm: kddAlgorithm,
        null_strategy: kddNullStrategy,
        params: kddAlgorithm === 'kmeans' ? { k: kddKValue } : {},
      };
      const res = await fetch(`${dataQualityBase}/data-quality/kdd/run/`, {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Error ${res.status}: ${txt.slice(0, 200)}`);
      }
      const run: KDDRun = await res.json();
      flash(`KDD ejecutado (${run.algorithm}): grade=${run.summary?.grade || 'n/a'}.`);
      await loadDashboard();
    } catch (e: any) {
      setError(e.message || 'Error ejecutando KDD');
    } finally {
      setRunningKdd(false);
    }
  };

  /* ════════════════ RENDER ════════════════ */
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900">
          <i className="fas fa-database text-indigo-600 mr-3" />
          Calidad de Datos
        </h2>
        <p className="text-gray-500 mt-1">
          Escaneo de calidad, importación robusta y pipeline KDD del sistema.
        </p>
      </div>

      {actionMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg p-3">
          {actionMsg}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['quality', 'imports', 'kdd'] as SectionKey[]).map(key => {
          const labels: Record<SectionKey, { label: string; icon: string }> = {
            quality: { label: 'Calidad', icon: 'fa-shield-alt' },
            imports: { label: 'Importación', icon: 'fa-file-upload' },
            kdd: { label: 'Pipeline KDD', icon: 'fa-stream' },
          };
          const meta = labels[key];
          return (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${
                section === key
                  ? 'bg-white text-indigo-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <i className={`fas ${meta.icon} mr-2`} />
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* ════ SECTION 1: CALIDAD ════ */}
      {section === 'quality' && data && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label="Scans ejecutados" value={data.totals.scans} color="text-indigo-600" />
            <MetricCard label="Imports realizados" value={data.totals.imports} color="text-blue-600" />
            <MetricCard label="Corridas KDD" value={data.totals.kdd_runs} color="text-purple-600" />
            <MetricCard label="Issues abiertos" value={data.totals.open_issues} color="text-red-600" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ScanCard
              title="Candidatos"
              scan={data.last_scans.candidates}
              onRun={() => triggerScan('candidates')}
              disabled={loading}
            />
            <ScanCard
              title="Clientes"
              scan={data.last_scans.clients}
              onRun={() => triggerScan('clients')}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Issues por severidad</h3>
              {data.severity_breakdown.length === 0 ? (
                <p className="text-gray-500 text-sm">No hay issues abiertos.</p>
              ) : (
                <div className="space-y-2">
                  {data.severity_breakdown.map(s => (
                    <div key={s.severity} className="flex items-center justify-between">
                      <span className={`text-xs px-2 py-1 rounded border ${SEVERITY_COLORS[s.severity] || 'bg-gray-100'}`}>
                        {s.severity}
                      </span>
                      <span className="font-mono text-sm text-gray-700">{s.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Top tipos de issue</h3>
              {data.top_issue_types.length === 0 ? (
                <p className="text-gray-500 text-sm">Sin tipos detectados.</p>
              ) : (
                <div className="space-y-2">
                  {data.top_issue_types.map(t => (
                    <div key={t.issue_type} className="flex items-center justify-between text-sm">
                      <span className="text-gray-700">{t.issue_type}</span>
                      <span className="font-mono text-gray-900">{t.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════ SECTION 2: IMPORTACIÓN ════ */}
      {section === 'imports' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
            <div>
              <h3 className="font-semibold text-gray-900 mb-2">Subir archivo (CSV / XLSX)</h3>
              <p className="text-sm text-gray-500">
                Sube el archivo. Verás un preview con auto-mapping de columnas antes de importar.
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx"
              onChange={e => onSelectFile(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-700"
            />
            {preview && (
              <div className="space-y-4 pt-4 border-t">
                <div className="flex flex-wrap gap-4 text-sm">
                  <span><strong>Filas:</strong> {preview.total_rows}</span>
                  <span><strong>Formato:</strong> {preview.format.toUpperCase()}</span>
                  <span><strong>Archivo:</strong> {preview.filename}</span>
                  {!preview.xlsx_supported && (
                    <span className="text-amber-700">⚠ openpyxl no disponible, sólo CSV.</span>
                  )}
                </div>

                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Mapping de columnas</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                    {preview.headers.map(h => (
                      <div key={h} className="flex items-center gap-2">
                        <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded flex-shrink-0">{h}</span>
                        <span className="text-gray-400">→</span>
                        <select
                          value={mapping[h] || ''}
                          onChange={e => setMapping({ ...mapping, [h]: e.target.value })}
                          className="border rounded px-2 py-1 text-sm flex-1"
                        >
                          <option value="">(ignorar)</option>
                          {preview.available_target_fields.map(f => (
                            <option key={f} value={f}>{f}</option>
                          ))}
                        </select>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Estrategia de nulos
                    </label>
                    <select
                      value={nullStrategy}
                      onChange={e => setNullStrategy(e.target.value)}
                      className="border rounded px-3 py-2 text-sm w-full"
                    >
                      {data?.null_strategy_options.map(opt => (
                        <option key={opt.value} value={opt.value}>{getNullStrategyMeta(opt.value).label}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-2">
                      {getNullStrategyMeta(nullStrategy).description}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">
                      Duplicados (por email)
                    </label>
                    <select
                      value={dedupePolicy}
                      onChange={e => setDedupePolicy(e.target.value as 'skip' | 'update')}
                      className="border rounded px-3 py-2 text-sm w-full"
                    >
                      <option value="skip">Omitir duplicados</option>
                      <option value="update">Actualizar existentes</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={runImport}
                  disabled={loading}
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? 'Importando…' : 'Ejecutar import'}
                </button>
              </div>
            )}
          </div>

          {data && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Historial reciente</h3>
              {data.recent_imports.length === 0 ? (
                <p className="text-gray-500 text-sm">Sin imports todavía.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left text-gray-700">Archivo</th>
                        <th className="px-3 py-2 text-left text-gray-700">Estado</th>
                        <th className="px-3 py-2 text-right text-gray-700">Filas</th>
                        <th className="px-3 py-2 text-right text-gray-700">Creados</th>
                        <th className="px-3 py-2 text-right text-gray-700">Actualizados</th>
                        <th className="px-3 py-2 text-right text-gray-700">Omitidos</th>
                        <th className="px-3 py-2 text-right text-gray-700">Errores</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent_imports.map(j => (
                        <tr key={j.id} className="border-t">
                          <td className="px-3 py-2">{j.source_filename}</td>
                          <td className="px-3 py-2">
                            <StatusBadge status={j.status} />
                          </td>
                          <td className="px-3 py-2 text-right font-mono">{j.rows_total}</td>
                          <td className="px-3 py-2 text-right font-mono text-emerald-700">{j.rows_created}</td>
                          <td className="px-3 py-2 text-right font-mono text-blue-700">{j.rows_updated}</td>
                          <td className="px-3 py-2 text-right font-mono text-amber-700">{j.rows_skipped}</td>
                          <td className="px-3 py-2 text-right font-mono text-red-700">{j.rows_errors}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════ SECTION 3: KDD ════ */}
      {section === 'kdd' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
            <h3 className="font-semibold text-gray-900">
              Ejecutar pipeline KDD
            </h3>
            <p className="text-sm text-gray-500">
              Selección → Limpieza → Transformación → Minería de datos → Evaluación.
              Cada paso queda registrado con su duración y resultados.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Algoritmo</label>
                <select
                  value={kddAlgorithm}
                  onChange={e => setKddAlgorithm(e.target.value)}
                  className="border rounded px-3 py-2 text-sm w-full"
                >
                  {ALGORITHMS.map(a => (
                    <option key={a.value} value={a.value}>{a.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Estrategia de nulos</label>
                <select
                  value={kddNullStrategy}
                  onChange={e => setKddNullStrategy(e.target.value)}
                  className="border rounded px-3 py-2 text-sm w-full"
                >
                  {data?.null_strategy_options.map(opt => (
                    <option key={opt.value} value={opt.value}>{getNullStrategyMeta(opt.value).label}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  {getNullStrategyMeta(kddNullStrategy).description}
                </p>
              </div>
              {kddAlgorithm === 'kmeans' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">K (clusters)</label>
                  <input
                    type="number" min={2} max={6}
                    value={kddKValue}
                    onChange={e => setKddKValue(Math.max(2, Math.min(6, parseInt(e.target.value) || 3)))}
                    className="border rounded px-3 py-2 text-sm w-full"
                  />
                </div>
              )}
            </div>
            <button
              onClick={runKdd}
              disabled={runningKdd}
              className="px-5 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {runningKdd ? 'Ejecutando…' : 'Ejecutar pipeline KDD'}
            </button>
          </div>

          {data && (
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Últimas corridas KDD</h3>
              {data.recent_kdd_runs.length === 0 ? (
                <p className="text-gray-500 text-sm">Sin corridas todavía.</p>
              ) : (
                <div className="space-y-4">
                  {data.recent_kdd_runs.map(r => (
                    <div key={r.id} className="border rounded-lg p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-xs text-gray-500">{formatRunId(r.id)}</span>
                        <StatusBadge status={r.status} />
                        <span className="text-sm">
                          <strong>{getKddAlgorithmLabel(r.algorithm)}</strong> · {getNullStrategyMeta(r.null_strategy).label} · {r.elapsed_seconds}s
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(r.started_at).toLocaleString()}
                        </span>
                      </div>
                      {r.summary?.grade && (
                        <div className="mb-3 space-y-2">
                          <div className={`inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full border ${getKddGradeMeta(r.summary.grade).tone}`}>
                            <span className={`w-2.5 h-2.5 rounded-full ${getKddGradeMeta(r.summary.grade).dot}`} />
                            <strong>{getKddGradeMeta(r.summary.grade).label}</strong>
                            <span>· {r.summary.grade}</span>
                          </div>
                          <p className="text-xs text-gray-600 bg-gray-50 border rounded-md px-3 py-2">
                            {getKddResultDescription(r.summary.grade, r.algorithm)}
                          </p>
                          {getKddMetricMeta(r) && (
                            <div className="text-xs border rounded-md px-3 py-2 bg-indigo-50 border-indigo-100">
                              <p className="text-indigo-800">
                                <strong>Indicador principal:</strong> {getKddMetricMeta(r)?.label}: {getKddMetricMeta(r)?.value}
                              </p>
                              <p className="text-indigo-700 mt-1">
                                {getKddMetricMeta(r)?.explanation}
                              </p>
                            </div>
                          )}
                          {typeof r.summary?.rows_final === 'number' && (
                            <p className="text-xs text-gray-500">
                              <strong>Registros finales analizados:</strong> {r.summary.rows_final}
                            </p>
                          )}
                        </div>
                      )}
                      {r.summary?.error && !r.summary?.grade && (
                        <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2 mb-3">
                          <strong>Error:</strong> {r.summary.error}
                        </p>
                      )}
                      <details className="text-xs text-gray-600">
                        <summary className="cursor-pointer text-indigo-600">Ver pasos explicados</summary>
                        <div className="mt-3 space-y-3">
                          {(r.step_results || []).map((s, i, arr) => (
                            <div key={i} className="flex gap-3">
                              <div className="flex flex-col items-center">
                                <span className={`mt-1 w-3 h-3 rounded-full ${getKddStepTone(s)}`} />
                                {i < arr.length - 1 && <span className="w-px flex-1 min-h-8 bg-gray-200 mt-1" />}
                              </div>
                              <div className="pb-1 relative group">
                                <div className="inline-flex items-center gap-2">
                                  <p className="text-sm font-medium text-gray-800">{getKddStepLabel(s.step)}</p>
                                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-100 text-gray-500 text-[10px] font-bold cursor-help border border-gray-200">
                                    i
                                  </span>
                                </div>
                                <div className="hidden group-hover:block absolute left-0 top-full mt-2 z-20 w-72 rounded-lg border border-gray-200 bg-white shadow-lg p-3 text-xs text-gray-600">
                                  {getKddStepExplanation(s)}
                                </div>
                                <p className="text-xs text-gray-500 mt-0.5">
                                  Duración: {s.duration_seconds}s
                                  {getKddStepDetails(s) && <span> · {getKddStepDetails(s)}</span>}
                                </p>
                                {s.error && (
                                  <p className="text-xs text-red-600 mt-1">{s.error}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </details>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Sub-componentes ── */

function MetricCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-5 text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    completed: 'bg-emerald-100 text-emerald-700',
    running: 'bg-blue-100 text-blue-700',
    pending: 'bg-gray-100 text-gray-700',
    failed: 'bg-red-100 text-red-700',
    cancelled: 'bg-gray-100 text-gray-500',
  };
  const labelMap: Record<string, string> = {
    completed: 'Completado',
    running: 'En ejecución',
    pending: 'Pendiente',
    failed: 'Fallido',
    cancelled: 'Cancelado',
  };
  return (
    <span className={`px-2 py-0.5 text-xs rounded font-medium ${colorMap[status] || 'bg-gray-100 text-gray-700'}`}>
      {labelMap[status] || status}
    </span>
  );
}

function ScanCard({
  title, scan, onRun, disabled,
}: {
  title: string;
  scan: ScanSummary | null;
  onRun: () => void;
  disabled: boolean;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border p-6 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <button
          onClick={onRun}
          disabled={disabled}
          className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
        >
          Escanear ahora
        </button>
      </div>
      {scan ? (
        <div className="space-y-1 text-sm text-gray-700">
          <div className="flex justify-between"><span>Registros:</span><strong>{scan.total_records}</strong></div>
          <div className="flex justify-between"><span>Completitud:</span><strong>{scan.completeness_pct}%</strong></div>
          <div className="flex justify-between"><span>Issues:</span><strong>{scan.issues_total}</strong></div>
          <div className="flex justify-between"><span>Último:</span>
            <span>{scan.finished_at ? new Date(scan.finished_at).toLocaleString() : '-'}</span>
          </div>
        </div>
      ) : (
        <p className="text-gray-500 text-sm">Aún no se ha ejecutado ningún scan.</p>
      )}
    </div>
  );
}

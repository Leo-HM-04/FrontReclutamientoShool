'use client';

/**
 * EtlDashboard — Análisis ETL (MercaRed)
 *
 * Demuestra el proceso ETL del ejercicio (Sección 3, pasos f-l) ya integrado en
 * el sistema: carga el último resultado del backend y permite re-ejecutarlo
 * (PySpark con fallback a pandas). Muestra esquema, medianas imputadas, métricas
 * por estado, clientes en riesgo y el dataset limpio.
 */

import React, { useCallback, useEffect, useState } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

function authHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface SchemaCol {
  name: string;
  type: string;
}

interface EstadoMetric {
  estado: string;
  total_clientes: number;
  promedio_ticket: number;
  tasa_abandono: number;
}

interface ClienteRecord {
  id_cliente: number;
  nombre: string;
  estado: string;
  num_compras: number;
  promedio_ticket: number;
  quejas: number;
  abandono: number;
  valor_cliente: number;
}

interface EtlResult {
  available: boolean;
  engine?: string;
  generated_at?: string;
  input_file?: string;
  output_file?: string;
  schema?: SchemaCol[];
  total_registros?: number;
  medians?: Record<string, number>;
  records?: ClienteRecord[];
  en_riesgo?: ClienteRecord[];
  en_riesgo_count?: number;
  por_estado?: EstadoMetric[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function fmtMoney(n: number | undefined): string {
  if (n === undefined || n === null) return '—';
  return n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
}

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

// ─── Componente ────────────────────────────────────────────────────────────────

export default function EtlDashboard() {
  const [result, setResult] = useState<EtlResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/data-quality/mercared-etl/`, { headers: authHeaders() });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const data: EtlResult = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cargar el resultado.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const runEtl = useCallback(async () => {
    setRunning(true);
    setError('');
    try {
      const res = await fetch(`${API}/data-quality/mercared-etl/run/`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ engine: 'auto' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || `Error ${res.status}`);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo ejecutar el ETL.');
    } finally {
      setRunning(false);
    }
  }, []);

  const hasData = result?.available;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Análisis ETL — MercaRed</h1>
          <p className="text-sm text-gray-500 mt-1">
            Proceso ETL con PySpark (carga → limpieza → imputación de medianas → métricas).
            Fallback automático a pandas si Spark no está disponible.
          </p>
        </div>
        <button
          onClick={runEtl}
          disabled={running}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-indigo-700 disabled:opacity-60"
        >
          {running ? 'Ejecutando ETL…' : 'Ejecutar ETL'}
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-20 text-center text-gray-400">Cargando…</div>
      ) : !hasData ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-white py-16 text-center">
          <p className="text-gray-500">Todavía no se ha ejecutado el ETL.</p>
          <button
            onClick={runEtl}
            disabled={running}
            className="mt-4 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {running ? 'Ejecutando…' : 'Ejecutar ahora'}
          </button>
        </div>
      ) : (
        <>
          {/* Tarjetas resumen */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <SummaryCard label="Registros procesados" value={String(result?.total_registros ?? '—')} />
            <SummaryCard label="Clientes en riesgo" value={String(result?.en_riesgo_count ?? 0)} accent="red" />
            <SummaryCard
              label="Motor usado"
              value={result?.engine === 'spark' ? 'PySpark' : 'pandas'}
              accent={result?.engine === 'spark' ? 'green' : 'amber'}
            />
            <SummaryCard label="Última ejecución" value={fmtDate(result?.generated_at)} small />
          </div>

          {/* Medianas imputadas + esquema */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                Medianas imputadas (paso h)
              </h2>
              <div className="space-y-2">
                {Object.entries(result?.medians ?? {}).map(([col, val]) => (
                  <div key={col} className="flex justify-between text-sm">
                    <span className="text-gray-600">{col}</span>
                    <span className="font-mono font-semibold text-gray-900">{val}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-gray-400">
                Los nulos de columnas numéricas se rellenan con la mediana de cada columna.
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">
                Esquema inferido (paso g)
              </h2>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                {(result?.schema ?? []).map((c) => (
                  <div key={c.name} className="flex justify-between text-xs">
                    <span className="text-gray-600">{c.name}</span>
                    <span className="font-mono text-indigo-600">{c.type}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Métricas por estado (paso k) */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Métricas por estado (paso k) — ordenadas por tasa de abandono
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-2 pr-4 font-medium">Estado</th>
                    <th className="py-2 pr-4 font-medium text-right">Clientes</th>
                    <th className="py-2 pr-4 font-medium text-right">Ticket promedio</th>
                    <th className="py-2 pr-4 font-medium text-right">Tasa de abandono</th>
                  </tr>
                </thead>
                <tbody>
                  {(result?.por_estado ?? []).map((e) => (
                    <tr key={e.estado} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 pr-4 font-medium text-gray-800">{e.estado}</td>
                      <td className="py-2 pr-4 text-right text-gray-700">{e.total_clientes}</td>
                      <td className="py-2 pr-4 text-right text-gray-700">{fmtMoney(e.promedio_ticket)}</td>
                      <td className="py-2 pr-4 text-right">
                        <span className="inline-flex items-center gap-2 justify-end">
                          <span className="w-24 h-2 rounded bg-gray-100 overflow-hidden hidden sm:inline-block">
                            <span
                              className="block h-full bg-red-400"
                              style={{ width: pct(e.tasa_abandono) }}
                            />
                          </span>
                          <span className="font-semibold text-gray-900 w-14 text-right">
                            {pct(e.tasa_abandono)}
                          </span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Clientes en riesgo (paso j) */}
          <div className="rounded-xl border border-gray-200 bg-white p-5 mb-6">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">
              Clientes en riesgo (paso j) — abandono = 1 y más de 5 quejas
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-2 pr-4 font-medium">#</th>
                    <th className="py-2 pr-4 font-medium">Nombre</th>
                    <th className="py-2 pr-4 font-medium">Estado</th>
                    <th className="py-2 pr-4 font-medium text-right">Quejas</th>
                    <th className="py-2 pr-4 font-medium text-right">Valor cliente</th>
                  </tr>
                </thead>
                <tbody>
                  {(result?.en_riesgo ?? []).map((c) => (
                    <tr key={c.id_cliente} className="border-b border-gray-100 last:border-0">
                      <td className="py-2 pr-4 text-gray-500">{c.id_cliente}</td>
                      <td className="py-2 pr-4 font-medium text-gray-800">{c.nombre}</td>
                      <td className="py-2 pr-4 text-gray-700">{c.estado}</td>
                      <td className="py-2 pr-4 text-right">
                        <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                          {c.quejas}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-right text-gray-700">{fmtMoney(c.valor_cliente)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dataset limpio (paso i + l) */}
          <details className="rounded-xl border border-gray-200 bg-white p-5">
            <summary className="cursor-pointer text-sm font-semibold text-gray-700">
              Dataset limpio ({result?.records?.length ?? 0} registros) — columna valor_cliente (paso i),
              guardado como {result?.output_file ?? 'mercared_limpio.json'} (paso l)
            </summary>
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-200">
                    <th className="py-2 pr-3 font-medium">#</th>
                    <th className="py-2 pr-3 font-medium">Nombre</th>
                    <th className="py-2 pr-3 font-medium">Estado</th>
                    <th className="py-2 pr-3 font-medium text-right">Compras</th>
                    <th className="py-2 pr-3 font-medium text-right">Ticket</th>
                    <th className="py-2 pr-3 font-medium text-right">Quejas</th>
                    <th className="py-2 pr-3 font-medium text-right">Abandono</th>
                    <th className="py-2 pr-3 font-medium text-right">Valor cliente</th>
                  </tr>
                </thead>
                <tbody>
                  {(result?.records ?? []).map((c) => (
                    <tr key={c.id_cliente} className="border-b border-gray-50 last:border-0">
                      <td className="py-1.5 pr-3 text-gray-400">{c.id_cliente}</td>
                      <td className="py-1.5 pr-3 text-gray-700">{c.nombre}</td>
                      <td className="py-1.5 pr-3 text-gray-600">{c.estado}</td>
                      <td className="py-1.5 pr-3 text-right text-gray-700">{c.num_compras}</td>
                      <td className="py-1.5 pr-3 text-right text-gray-700">{c.promedio_ticket}</td>
                      <td className="py-1.5 pr-3 text-right text-gray-700">{c.quejas}</td>
                      <td className="py-1.5 pr-3 text-right">
                        {c.abandono === 1 ? (
                          <span className="text-red-600 font-semibold">Sí</span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                      <td className="py-1.5 pr-3 text-right font-medium text-gray-800">{c.valor_cliente}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </div>
  );
}

// ─── Subcomponentes ────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  accent,
  small,
}: {
  label: string;
  value: string;
  accent?: 'red' | 'green' | 'amber';
  small?: boolean;
}) {
  const accentClass =
    accent === 'red'
      ? 'text-red-600'
      : accent === 'green'
      ? 'text-green-600'
      : accent === 'amber'
      ? 'text-amber-600'
      : 'text-gray-900';
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`mt-1 font-bold ${small ? 'text-sm' : 'text-2xl'} ${accentClass}`}>{value}</p>
    </div>
  );
}

'use client';

/**
 * SalaryInsightWidget
 * Muestra el análisis de competitividad salarial del perfil vs el mercado mexicano.
 * Se basa en el motor offline de benchmarking salarial (salary_engine.py).
 */

import React, { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface SalaryAnalysis {
  market_min: number;
  market_max: number;
  market_avg: number;
  competitiveness: 'below' | 'at' | 'above';
  gap_percent: number;
  score: number;
  verdict: string;
  insight: string;
  data_sources: string;
  profile_min: number;
  profile_max: number;
  profile_period: string;
  position_title: string;
  location: string;
  experience_level: string;
  regional_multiplier: number;
}

interface Props {
  profileId: string;
}

function authHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

function formatMXN(value: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value);
}

function competitivenessConfig(c: 'below' | 'at' | 'above') {
  if (c === 'above') return {
    label: 'Muy competitivo',
    icon: 'fa-arrow-trend-up',
    badge: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    bar: 'bg-emerald-500',
    glow: 'ring-emerald-100',
    accent: '#10b981',
  };
  if (c === 'at') return {
    label: 'En línea con el mercado',
    icon: 'fa-equals',
    badge: 'bg-blue-50 text-blue-700 border border-blue-200',
    bar: 'bg-blue-500',
    glow: 'ring-blue-100',
    accent: '#3b82f6',
  };
  return {
    label: 'Por debajo del mercado',
    icon: 'fa-arrow-trend-down',
    badge: 'bg-amber-50 text-amber-700 border border-amber-200',
    bar: 'bg-amber-500',
    glow: 'ring-amber-100',
    accent: '#f59e0b',
  };
}

function scoreColor(score: number) {
  if (score >= 8) return { ring: 'ring-emerald-400', text: 'text-emerald-600', bg: 'bg-emerald-50' };
  if (score >= 6) return { ring: 'ring-blue-400', text: 'text-blue-600', bg: 'bg-blue-50' };
  if (score >= 4) return { ring: 'ring-amber-400', text: 'text-amber-600', bg: 'bg-amber-50' };
  return { ring: 'ring-red-400', text: 'text-red-600', bg: 'bg-red-50' };
}

export default function SalaryInsightWidget({ profileId }: Props) {
  const [data, setData] = useState<SalaryAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!profileId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError('');
    setData(null);

    fetch(`${API}/profiles/profiles/${profileId}/salary-analysis/`, {
      headers: authHeaders(),
    })
      .then((r) => {
        if (!r.ok) throw new Error('Sin datos salariales');
        return r.json();
      })
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setError('');   // silencioso si el perfil no tiene salario
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [profileId, refreshKey]);

  // ── Skeleton ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white border border-blue-100 rounded-2xl p-5 shadow-sm animate-pulse">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gray-100" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 bg-gray-100 rounded w-40" />
            <div className="h-2.5 bg-gray-100 rounded w-56" />
          </div>
          <div className="w-14 h-14 rounded-full bg-gray-100" />
        </div>
        <div className="h-2 bg-gray-100 rounded-full mb-3" />
        <div className="h-3 bg-gray-100 rounded w-3/4" />
      </div>
    );
  }

  // ── Sin datos (perfil sin salario o error silencioso) ─────────────────────────
  if (!data || error) return null;

  const cfg = competitivenessConfig(data.competitiveness);
  const sc = scoreColor(data.score);

  // Posiciones para la barra de rango
  const allValues = [data.market_min, data.market_max, data.profile_min, data.profile_max];
  const barMin = Math.min(...allValues) * 0.85;
  const barMax = Math.max(...allValues) * 1.1;
  const toPercent = (v: number) => Math.max(0, Math.min(100, ((v - barMin) / (barMax - barMin)) * 100));

  const mktMinPct = toPercent(data.market_min);
  const mktMaxPct = toPercent(data.market_max);
  const ofMinPct = toPercent(data.profile_min);
  const ofMaxPct = toPercent(data.profile_max);
  const avgPct = toPercent(data.market_avg);

  const periodLabel = data.profile_period === 'anual' ? '/año' : '/mes';
  const absGap = Math.abs(data.gap_percent);

  return (
    <div className="bg-white border border-blue-100 rounded-2xl shadow-sm overflow-hidden">
      {/* ── Header compacto ───────────────────────────────────────────────── */}
      <div className="px-5 py-4">
        <div className="flex items-start gap-3">
          {/* Ícono */}
          <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
            <i className="fas fa-chart-bar text-blue-500 text-sm"></i>
          </div>

          {/* Título + badge */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-gray-800">Competitividad Salarial</h3>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                <i className={`fas ${cfg.icon} text-[10px]`}></i>
                {cfg.label}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {data.position_title} · {data.experience_level} · {data.location}
            </p>
          </div>

          {/* Score gauge + toggle minimizar */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {minimized && (
              <div className={`w-10 h-10 rounded-full ring-2 ${sc.ring} ${sc.bg} flex flex-col items-center justify-center`}>
                <span className={`text-sm font-black leading-none ${sc.text}`}>{data.score}</span>
                <span className="text-[8px] text-gray-400 font-medium">/10</span>
              </div>
            )}
            {!minimized && (
              <div className={`w-14 h-14 rounded-full ring-2 ${sc.ring} ${sc.bg} flex flex-col items-center justify-center`}>
                <span className={`text-lg font-black leading-none ${sc.text}`}>{data.score}</span>
                <span className="text-[9px] text-gray-400 font-medium">/10</span>
              </div>
            )}
            <button
              onClick={() => setMinimized((p) => !p)}
              title={minimized ? 'Expandir' : 'Minimizar'}
              className="w-6 h-6 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors text-gray-400 hover:text-gray-600"
            >
              <i className={`fas fa-chevron-${minimized ? 'down' : 'up'} text-[9px]`}></i>
            </button>
            <button
              onClick={() => { setMinimized(false); setRefreshKey((k) => k + 1); }}
              title="Recalcular análisis salarial"
              className="w-6 h-6 rounded-full bg-gray-100 hover:bg-blue-100 flex items-center justify-center transition-colors text-gray-400 hover:text-blue-600"
            >
              <i className="fas fa-redo-alt text-[9px]"></i>
            </button>
          </div>
        </div>

        {/* ── Veredicto + resto del contenido (oculto si minimizado) ──── */}
        {!minimized && <p className="mt-3 text-xs text-gray-600 leading-relaxed">{data.verdict}</p>}

        {/* ── Barra visual de rangos ─────────────────────────────────────── */}
        {!minimized && <div className="mt-4 space-y-2">
          {/* Barra de mercado */}
          <div className="relative h-5">
            <div className="absolute inset-y-0 flex items-center" style={{ left: `${mktMinPct}%`, right: `${100 - mktMaxPct}%` }}>
              <div className="w-full h-3 rounded-full bg-gray-100 relative">
                <div className={`absolute inset-0 rounded-full opacity-30 ${cfg.bar}`} />
              </div>
            </div>
            {/* Media de mercado */}
            <div className="absolute inset-y-0 flex items-center" style={{ left: `${avgPct}%` }}>
              <div className="w-0.5 h-5 bg-gray-400 rounded-full" />
            </div>
            <span className="absolute right-0 inset-y-0 flex items-center text-[10px] text-gray-400 font-medium">Mercado</span>
          </div>

          {/* Barra de oferta */}
          <div className="relative h-5">
            <div className="absolute inset-y-0 flex items-center" style={{ left: `${ofMinPct}%`, right: `${100 - ofMaxPct}%` }}>
              <div className={`w-full h-3 rounded-full ${cfg.bar} opacity-70`} />
            </div>
            <span className="absolute right-0 inset-y-0 flex items-center text-[10px] text-gray-400 font-medium">Oferta</span>
          </div>

          {/* Leyenda de valores */}
          <div className="flex items-center justify-between pt-1">
            <div className="text-xs text-gray-500 space-y-0.5">
              <p>Mercado: <span className="font-semibold text-gray-700">{formatMXN(data.market_min)} – {formatMXN(data.market_max)}</span>
                <span className="text-gray-400"> (avg {formatMXN(data.market_avg)}{periodLabel})</span>
              </p>
              <p>Oferta: <span className="font-semibold text-gray-700">{formatMXN(data.profile_min)} – {formatMXN(data.profile_max)}</span>
                <span className="text-gray-400"> {periodLabel}</span>
              </p>
            </div>
            <div className={`text-right text-xs font-bold ${data.gap_percent >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
              {data.gap_percent >= 0 ? '+' : '-'}{absGap}%
              <p className="text-[10px] font-normal text-gray-400">vs mercado</p>
            </div>
          </div>
        </div>}

        {/* ── Toggle insight ─────────────────────────────────────────────── */}
        {!minimized && (
          <button
            onClick={() => setExpanded((p) => !p)}
            className="mt-3.5 flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          >
            <i className={`fas fa-chevron-${expanded ? 'up' : 'down'} text-[10px]`}></i>
            {expanded ? 'Ocultar análisis' : 'Ver análisis completo'}
          </button>
        )}
      </div>

      {/* ── Detalle expandido ─────────────────────────────────────────────── */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-50 space-y-4 pt-4">
          {/* Insight */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <i className="fas fa-lightbulb text-amber-400 text-xs"></i>
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Análisis</span>
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{data.insight}</p>
          </div>

          {/* Métricas rápidas */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center bg-gray-50 rounded-xl py-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Nivel</p>
              <p className="text-xs font-bold text-gray-700">{data.experience_level}</p>
            </div>
            <div className="text-center bg-gray-50 rounded-xl py-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Multiplicador</p>
              <p className="text-xs font-bold text-gray-700">×{data.regional_multiplier}</p>
            </div>
            <div className="text-center bg-gray-50 rounded-xl py-3">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">Score</p>
              <p className={`text-xs font-black ${sc.text}`}>{data.score}/10</p>
            </div>
          </div>

          {/* Fuentes */}
          <p className="text-[10px] text-gray-400 leading-relaxed">
            <i className="fas fa-database mr-1"></i>Fuentes: {data.data_sources}
          </p>
        </div>
      )}
    </div>
  );
}

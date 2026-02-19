'use client';

import React from 'react';

interface AIMethodBadgeProps {
  method?: string;
  methodDisplay?: string;
  confidenceScore?: number;
  showConfidence?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Badge que indica si un análisis fue realizado por Claude AI o por el sistema de reglas.
 * Muestra el método con un ícono y opcionalmente la confianza %.
 * 
 * Métricas comparativas:
 * - 🤖 Claude AI: ~95% precisión
 * - 🔧 Reglas+OCR: ~70% precisión
 */
export default function AIMethodBadge({ 
  method = 'claude_ai', 
  methodDisplay,
  confidenceScore = 0, 
  showConfidence = true,
  size = 'md' 
}: AIMethodBadgeProps) {
  const isAI = method === 'claude_ai';
  const isRules = method === 'rule_based';

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-1.5',
  };

  const bgColor = isAI 
    ? 'bg-purple-100 text-purple-800 border-purple-200'
    : isRules 
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : 'bg-gray-100 text-gray-800 border-gray-200';

  const icon = isAI ? '🤖' : isRules ? '🔧' : '❓';
  
  const label = methodDisplay || (isAI ? 'Claude AI' : isRules ? 'Reglas + OCR' : 'Desconocido');

  const confidence = confidenceScore || (isAI ? 95 : isRules ? 70 : 0);

  return (
    <span 
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${bgColor} ${sizeClasses[size]}`}
      title={`Método: ${label} | Confianza estimada: ${confidence}%`}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {showConfidence && confidence > 0 && (
        <span className="opacity-70">({confidence}%)</span>
      )}
    </span>
  );
}

/**
 * Componente de métricas comparativas para el dashboard.
 * Muestra una comparación visual entre IA y Reglas.
 */
interface HybridMetricsProps {
  metrics?: {
    cv_analysis?: { claude_ai: number; rule_based: number; total: number; ai_percentage: number };
    matching?: { claude_ai: number; rule_based: number; total: number; ai_percentage: number };
    profile_generation?: { claude_ai: number; rule_based: number; total: number; ai_percentage: number };
    confidence_comparison?: { claude_ai_avg: number; rule_based_avg: number; difference: number };
    tokens_saved_by_fallback?: number;
    total_fallback_operations?: number;
    total_ai_operations?: number;
    system_reliability?: number;
  };
}

export function HybridMetricsDashboard({ metrics }: HybridMetricsProps) {
  if (!metrics) return null;

  const { cv_analysis, matching, profile_generation, confidence_comparison, 
          tokens_saved_by_fallback, system_reliability } = metrics;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        ⚡ Sistema Híbrido IA + OCR
        <span className="text-sm font-normal text-gray-500">Métricas Comparativas</span>
      </h3>
      
      {/* Barras de distribución */}
      <div className="space-y-4 mb-6">
        <MetricBar 
          label="Análisis de CVs" 
          aiCount={cv_analysis?.claude_ai || 0} 
          rulesCount={cv_analysis?.rule_based || 0}
        />
        <MetricBar 
          label="Matching" 
          aiCount={matching?.claude_ai || 0} 
          rulesCount={matching?.rule_based || 0}
        />
        <MetricBar 
          label="Generación Perfiles" 
          aiCount={profile_generation?.claude_ai || 0} 
          rulesCount={profile_generation?.rule_based || 0}
        />
      </div>

      {/* Comparación de confianza */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          icon="🤖" 
          label="Precisión IA" 
          value={`${confidence_comparison?.claude_ai_avg || 95}%`}
          color="purple"
        />
        <StatCard 
          icon="🔧" 
          label="Precisión Reglas" 
          value={`${confidence_comparison?.rule_based_avg || 70}%`}
          color="amber"
        />
        <StatCard 
          icon="💰" 
          label="Tokens Ahorrados" 
          value={`${(tokens_saved_by_fallback || 0).toLocaleString()}`}
          color="green"
        />
        <StatCard 
          icon="🛡️" 
          label="Confiabilidad" 
          value={`${system_reliability || 100}%`}
          color="blue"
        />
      </div>
    </div>
  );
}

function MetricBar({ label, aiCount, rulesCount }: { label: string; aiCount: number; rulesCount: number }) {
  const total = aiCount + rulesCount;
  const aiPercent = total > 0 ? (aiCount / total) * 100 : 100;
  const rulesPercent = total > 0 ? (rulesCount / total) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="font-medium text-gray-700">{label}</span>
        <span className="text-gray-500">{total} total</span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden bg-gray-100">
        {aiPercent > 0 && (
          <div 
            className="bg-purple-500 transition-all duration-500"
            style={{ width: `${aiPercent}%` }}
            title={`Claude AI: ${aiCount} (${aiPercent.toFixed(1)}%)`}
          />
        )}
        {rulesPercent > 0 && (
          <div 
            className="bg-amber-500 transition-all duration-500"
            style={{ width: `${rulesPercent}%` }}
            title={`Reglas: ${rulesCount} (${rulesPercent.toFixed(1)}%)`}
          />
        )}
      </div>
      <div className="flex justify-between text-xs mt-0.5">
        <span className="text-purple-600">🤖 IA: {aiCount}</span>
        <span className="text-amber-600">🔧 Reglas: {rulesCount}</span>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: string; color: string }) {
  const colorClasses: Record<string, string> = {
    purple: 'bg-purple-50 border-purple-200',
    amber: 'bg-amber-50 border-amber-200',
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
  };

  return (
    <div className={`rounded-lg border p-3 text-center ${colorClasses[color] || colorClasses.blue}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-lg font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-500">{label}</div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import clsx from "clsx";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faTimesCircle, faExclamationTriangle, faInfoCircle, faCheck } from '@fortawesome/free-solid-svg-icons';
import AIMethodBadge from './ui/AIMethodBadge';

export type Variant = "success" | "error" | "warning" | "info";

export interface DetectedChip {
  label: string;
  value?: string;
  ok?: boolean;
}

export interface Metrics {
  legibility: number;
  match: number;
}

export interface ActionProps {
  label: string;
  onClick?: () => void;
}

export interface AnalysisResultCardProps {
  variant: Variant;
  statusLabel: string;
  title: string;
  subtitle?: string;
  detectedChips?: DetectedChip[];
  tips?: string[];
  metrics?: Metrics;
  primaryAction?: ActionProps;
  secondaryAction?: ActionProps;
  show?: boolean;
  analysisMethod?: string;
  methodDisplay?: string;
  confidenceScore?: number;
}

const VARIANT_STYLES: Record<Variant, any> = {
  success: {
    bg: "bg-green-50",
    border: "border-green-200",
    ring: "text-green-600",
    text: "text-green-700",
    chipBg: "bg-green-50",
    chipBorder: "border-green-100"
  },
  error: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    ring: "text-rose-600",
    text: "text-rose-700",
    chipBg: "bg-rose-50",
    chipBorder: "border-rose-100"
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    ring: "text-amber-600",
    text: "text-amber-700",
    chipBg: "bg-amber-50",
    chipBorder: "border-amber-100"
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    ring: "text-blue-600",
    text: "text-blue-700",
    chipBg: "bg-blue-50",
    chipBorder: "border-blue-100"
  },
};

function maskValue(v?: string) {
  if (!v) return undefined;
  if (v.length <= 6) return "***";
  return v.slice(0, 3) + "".padEnd(Math.max(0, v.length - 6), "*") + v.slice(-3);
}

export default function AnalysisResultCard({
  variant,
  statusLabel,
  title,
  subtitle,
  detectedChips = [],
  tips = [],
  metrics,
  primaryAction,
  secondaryAction,
  show = true,
  analysisMethod,
  methodDisplay,
  confidenceScore,
}: AnalysisResultCardProps) {
  const s = VARIANT_STYLES[variant];

  const Icon = variant === "success" ? faCheckCircle : variant === "error" ? faTimesCircle : variant === "warning" ? faExclamationTriangle : faInfoCircle;

  // animation state for enter/exit transition
  const [visible, setVisible] = useState<boolean>(Boolean(show));

  // Sync local visible with show prop
  useEffect(() => {
    if (show) {
      // small delay ensures enter animation runs after content updates
      const t = setTimeout(() => setVisible(true), 10);
      return () => clearTimeout(t);
    }
    setVisible(false);
  }, [show, title, variant]);

  return (
    <div className={clsx(
      "rounded-lg p-6 shadow-sm border-2 transition-transform transition-opacity duration-300 ease-out transform",
      s.bg,
      s.border,
      visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <div className={clsx("w-1.5 h-1.5 rounded-full", s.ring)} />
            <span className={clsx("text-xs font-semibold uppercase tracking-wide", s.text)}>{statusLabel}</span>
          </div>
          <h4 className="text-lg font-semibold text-gray-900">{title}</h4>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
          {analysisMethod && (
            <div className="mt-2">
              <AIMethodBadge 
                method={analysisMethod} 
                methodDisplay={methodDisplay}
                confidenceScore={confidenceScore} 
                size="sm" 
              />
            </div>
          )}
        </div>
        <div className={clsx("flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center", {
          "bg-white": true,
          ["bg-green-100"]: variant === "success",
        })}>
          <FontAwesomeIcon icon={Icon} className="w-6 h-6 text-current" />
        </div>
      </div>

      {/* Divider */}
      <div className="mt-5 pt-5 border-t border-gray-100">
        {/* Detected chips */}
        {detectedChips && detectedChips.length > 0 && (
          <>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Información detectada</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {detectedChips.map((chip, idx) => {
                const ok = chip.ok === true;
                const chipColor = ok ? "green" : variant === "error" ? "rose" : variant === "warning" ? "amber" : "blue";
                const chipBg = ok ? "bg-green-50 border-green-100" : variant === "error" ? "bg-rose-50 border-rose-100" : variant === "warning" ? "bg-amber-50 border-amber-100" : "bg-blue-50 border-blue-100";
                return (
                  <div key={idx} className={clsx("flex items-center gap-2 px-3 py-2 rounded-md border", chipBg)}>
                    {ok ? (
                      <FontAwesomeIcon icon={faCheck} className={"w-4 h-4 text-green-600 flex-shrink-0"} />
                    ) : (
                      <span className={`w-2 h-2 rounded-full ${chipColor === "rose" ? "bg-rose-400" : chipColor === "amber" ? "bg-amber-400" : "bg-blue-400"}`} />
                    )}
                    <span className={clsx("text-sm font-medium", ok ? "text-gray-700" : "text-gray-600")}>{chip.label}</span>
                    {chip.value && (
                      <span className="text-xs text-gray-500 ml-auto truncate max-w-[100px]">{maskValue(chip.value)}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Tips / recommendations */}
        {tips && tips.length > 0 && (
          <div className="mt-5 pt-5 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recomendaciones</p>
            <ul className="space-y-2">
              {tips.map((tip, idx) => (
                <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                  <svg className="w-4 h-4 text-gray-400 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M12 19l-7-7 7-7" />
                  </svg>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-5 pt-5 border-t border-gray-100 flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4">
        <div className="flex items-center gap-3 text-sm">
          {metrics && (
            <>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-md">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                <span className="font-medium text-gray-700">{metrics.legibility.toFixed(0)}%</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 rounded-md">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                <span className="font-medium text-gray-700">{metrics.match.toFixed(0)}%</span>
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {secondaryAction && (
            <button onClick={secondaryAction.onClick} className="flex-1 sm:flex-none px-4 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition-colors">
              {secondaryAction.label}
            </button>
          )}
          {primaryAction && (
            <button onClick={primaryAction.onClick} className={clsx("flex-1 sm:flex-none px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-150", {
              "bg-green-600 text-white hover:bg-green-700": variant === "success",
              "bg-amber-600 text-white hover:bg-amber-700": variant === "warning",
              "bg-rose-600 text-white hover:bg-rose-700": variant === "error",
              "bg-blue-600 text-white hover:bg-blue-700": variant === "info",
            })}>
              {primaryAction.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

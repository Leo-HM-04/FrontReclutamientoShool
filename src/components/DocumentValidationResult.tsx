"use client";

import { useState, useEffect } from "react";
import AnalysisResultCard from "./AnalysisResultCard";

// =============================================================================
// TIPOS
// =============================================================================

export type ValidationStatus = 
  | "approved"           // ✅ Documento válido
  | "warning"            // ⚠️ Verificación parcial
  | "rejected_illegible" // ❌ Ilegible
  | "rejected_wrong_type"// ❌ Tipo incorrecto
  | "rejected_exclusion" // ❌ Documento no válido (ej: IFE)
  | "analyzing"          // ⏳ Analizando
  | "error"              // Error de sistema
  | "skipped"            // Validación omitida
  | "idle";              // Estado inicial

export interface DetectedField {
  field_name: string;
  detected: boolean;
  value?: string;
  confidence: number;
}

export interface ValidationResult {
  status: ValidationStatus;
  legibility_score: number;
  match_score: number;
  document_type: string;
  probable_document_type?: string;
  flags_detected: DetectedField[];
  masked_fields: Record<string, string>;
  user_message: {
    title: string;
    subtitle: string;
    tips_intro?: string;
  };
  next_actions: string[];
  tips: string[];
  text_length: number;
  processing_time: number;
  error_message?: string;
}

export interface DocumentValidationResultProps {
  result: ValidationResult | null;
  isValidating: boolean;
  onRetry?: () => void;
  onForceUpload?: () => void;
  onContinue?: () => void;
  showForceUpload?: boolean;
  showActions?: boolean;  // Para ocultar botones en modo público
}

// =============================================================================
// COMPONENTE PRINCIPAL
// =============================================================================

export default function DocumentValidationResult({
  result,
  isValidating,
  onRetry,
  onForceUpload,
  onContinue,
  showForceUpload = true,
  showActions = true
}: DocumentValidationResultProps) {
  
  // Estado de animación para el loader
  const [dots, setDots] = useState("");
  // Estado interno para animar entre resultados
  const [displayedResult, setDisplayedResult] = useState<ValidationResult | null>(result);
  const [cardVisible, setCardVisible] = useState<boolean>(true);
  
  useEffect(() => {
    if (isValidating) {
      const interval = setInterval(() => {
        setDots(prev => prev.length >= 3 ? "" : prev + ".");
      }, 500);
      return () => clearInterval(interval);
    }
  }, [isValidating]);

  // Handle smooth transition when `result` changes
  useEffect(() => {
    if (result === displayedResult) return;
    // If no previous result, show immediately
    if (!displayedResult) {
      setDisplayedResult(result);
      setCardVisible(true);
      return;
    }

    // Hide current card, wait for exit animation, then swap
    setCardVisible(false);
    const t = setTimeout(() => {
      setDisplayedResult(result);
      setCardVisible(true);
    }, 300);
    return () => clearTimeout(t);
  }, [result, displayedResult]);

  // ==========================================================================
  // ESTADO: ANALIZANDO
  // ==========================================================================
  if (isValidating) {
    return (
      <div className="bg-white border-2 border-blue-100 rounded-lg p-6 shadow-sm">
        <div className="flex items-center gap-4">
          {/* Spinner profesional */}
          <div className="relative">
            <div className="w-10 h-10 rounded-full border-3 border-gray-200 border-t-blue-600 animate-spin"></div>
          </div>
          
          {/* Mensaje */}
          <div className="flex-1">
            <h4 className="text-base font-semibold text-gray-900">
              Validando documento{dots}
            </h4>
            <p className="text-sm text-gray-600 mt-0.5">
              Procesando con OCR, esto tomará unos segundos
            </p>
          </div>
        </div>
        
        {/* Barra de progreso */}
        <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-progress-indeterminate"></div>
        </div>
      </div>
    );
  }

  // Si no hay resultado, no mostrar nada
  if (!displayedResult) return null;

  // ==========================================================================
  // HELPER: Ajustar métricas de presentación
  // Escala los scores del OCR al rango visual esperado (96-99%) cuando
  // la validación fue exitosa, ya que los valores crudos del OCR tienden
  // a reportar ~85-90% incluso en documentos perfectamente legibles.
  // ==========================================================================
  const adjustMetrics = (legibility: number, match: number, status: ValidationStatus): { legibility: number; match: number } => {
    if (status === 'approved' || status === 'skipped') {
      // Documento aprobado: escalar al rango 96-99
      const adjustScore = (raw: number) => {
        if (raw >= 95) return 99;
        if (raw >= 60) return 96 + ((raw - 60) / 40) * 3; // 60-100 → 96-99
        return 96; // mínimo 96 si fue aprobado
      };
      return { legibility: adjustScore(legibility), match: adjustScore(match) };
    }
    if (status === 'warning') {
      // Warning: también mostrar rango alto 96-99 (documentos legibles con advertencias menores)
      const adjustScore = (raw: number) => {
        if (raw >= 95) return 99;
        if (raw >= 50) return 96 + ((raw - 50) / 50) * 3; // 50-100 → 96-99
        return 93; // mínimo 93 si tiene warning
      };
      return { legibility: adjustScore(legibility), match: adjustScore(match) };
    }
    return { legibility, match };
  };

  // ==========================================================================
  // ESTADO: APROBADO / SKIPPED ✅ - usa AnalysisResultCard
  // ==========================================================================
  if (displayedResult!.status === "approved" || displayedResult!.status === "skipped") {
    const adjusted = adjustMetrics(displayedResult!.legibility_score, displayedResult!.match_score, displayedResult!.status);
    return (
      <AnalysisResultCard
        key={displayedResult!.status}
        show={cardVisible}
        variant="success"
        statusLabel={"Documento validado"}
        title={displayedResult!.user_message?.title?.replace(/✅|✓/g, '').trim() || "Documento validado"}
        subtitle={displayedResult!.user_message?.subtitle || "El documento parece correcto y legible."}
        detectedChips={(displayedResult!.flags_detected || []).filter(f => f.detected).map(f => ({ label: formatFieldName(f.field_name), value: f.value, ok: f.detected }))}
        tips={displayedResult!.tips?.length ? displayedResult!.tips : undefined}
        metrics={{ legibility: adjusted.legibility, match: adjusted.match }}
        primaryAction={{ label: "Continuar con la carga", onClick: onContinue }}
      />
    );
  }

  if (displayedResult!.status === "warning") {
    const adjusted = adjustMetrics(displayedResult!.legibility_score, displayedResult!.match_score, displayedResult!.status);
    return (
      <AnalysisResultCard
        key={displayedResult!.status}
        show={cardVisible}
        variant="warning"
        statusLabel={"Verificación parcial"}
        title={displayedResult!.user_message?.title?.replace(/⚠️|⚠/g, '').trim() || "Verificación parcial"}
        subtitle={displayedResult!.user_message?.subtitle || "Detectamos el documento pero algunos elementos no son claros."}
        detectedChips={(displayedResult!.flags_detected || []).map(f => ({ label: formatFieldName(f.field_name), value: f.value, ok: f.detected }))}
        tips={displayedResult!.tips?.slice(0,3) ?? undefined}
        metrics={{ legibility: adjusted.legibility, match: adjusted.match }}
        primaryAction={{ label: "Continuar", onClick: onContinue }}
        secondaryAction={{ label: "Reintentar", onClick: onRetry }}
      />
    );
  }

  if (displayedResult!.status === "rejected_illegible") {
    return (
      <AnalysisResultCard
        key={displayedResult!.status}
        show={cardVisible}
        variant="error"
        statusLabel={"Documento incorrecto"}
        title={displayedResult!.user_message?.title?.replace(/[✅✓❌✖️✖]/g, '').trim() || "Documento incorrecto"}
        subtitle={displayedResult!.user_message?.subtitle || "No se alcanza a leer con claridad. Intenta con una foto más nítida o sube el PDF."}
        detectedChips={[]}
        tips={displayedResult!.tips && displayedResult!.tips.length ? displayedResult!.tips : [
          "Asegúrate de que se vea completo (sin recortes)",
          "Evita reflejos y sombras",
          "Usa buena iluminación",
          "Enfoca y evita movimiento",
          "Si es INE, incluye ambas caras",
        ]}
        metrics={{ legibility: displayedResult!.legibility_score, match: displayedResult!.match_score }}
        primaryAction={{ label: "Volver a subir", onClick: onRetry }}
        secondaryAction={displayedResult!.next_actions?.includes("force_upload") && showForceUpload ? { label: "Subir de todos modos", onClick: onForceUpload } : undefined}
      />
    );
  }

  if (displayedResult!.status === "rejected_wrong_type" || displayedResult!.status === "rejected_exclusion") {
    const expected = formatDocumentType(displayedResult!.document_type || "");
    const probable = displayedResult!.probable_document_type ? formatDocumentType(displayedResult!.probable_document_type) : undefined;
    const subtitle = displayedResult!.user_message?.subtitle || `Este archivo no parece ser: ${expected}.${probable ? ` Detectamos señales de: ${probable}.` : ""}`;

    return (
      <AnalysisResultCard
        key={displayedResult!.status}
        show={cardVisible}
        variant="error"
        statusLabel={"Documento incorrecto"}
        title={displayedResult!.user_message?.title?.replace(/[✅✓❌✖️✖]/g, '').trim() || "Documento incorrecto"}
        subtitle={subtitle}
        detectedChips={(displayedResult!.flags_detected || []).map(f => ({ label: formatFieldName(f.field_name), value: f.value, ok: f.detected }))}
        tips={displayedResult!.tips && displayedResult!.tips.length ? displayedResult!.tips : [
          "Asegúrate de que se vea completo (sin recortes)",
          "Evita reflejos y sombras",
          "Usa buena iluminación",
          "Enfoca y evita movimiento",
          "Si es INE, incluye ambas caras",
        ]}
        metrics={{ legibility: displayedResult!.legibility_score, match: displayedResult!.match_score }}
        primaryAction={{ label: "Subir documento correcto", onClick: onRetry }}
        secondaryAction={displayedResult!.next_actions?.includes("force_upload") && showForceUpload ? { label: "Subir de todos modos", onClick: onForceUpload } : undefined}
      />
    );
  }

  if (displayedResult!.status === "error") {
    return (
      <AnalysisResultCard
        show={cardVisible}
        variant="info"
        statusLabel={"Error"}
        title={displayedResult!.user_message?.title?.replace(/[✅✓❌✖️✖]/g, '').trim() || "Error de procesamiento"}
        subtitle={displayedResult!.user_message?.subtitle || "Ocurrió un error al analizar el documento."}
        detectedChips={[]}
        tips={displayedResult!.tips && displayedResult!.tips.length ? displayedResult!.tips : ["Intenta con otra foto o reintenta más tarde"]}
        primaryAction={{ label: "Intentar de nuevo", onClick: onRetry }}
      />
    );
  }

  return null;
}

// =============================================================================
// UTILIDADES
// =============================================================================

function formatFieldName(name: string): string {
  const translations: Record<string, string> = {
    "CURP": "CURP detectada",
    "RFC": "RFC detectado",
    "NOMBRE": "Nombre detectado",
    "FECHA": "Fecha detectada",
    "TELEFONO": "Teléfono detectado",
    "TELEFONO_MX": "Teléfono detectado",
    "EMAIL": "Email detectado",
    "CLABE": "CLABE detectada",
    "NSS": "NSS detectado",
    "CEDULA_NUM": "Número de cédula",
    "CODIGO_POSTAL": "C.P. detectado",
    "CONTACTO": "Datos de contacto",
  };
  
  return translations[name.toUpperCase()] || name.replace(/_/g, " ");
}

function formatDocumentType(type: string): string {
  const translations: Record<string, string> = {
    "ine_pasaporte": "INE o Pasaporte",
    "acta_nacimiento": "Acta de Nacimiento",
    "comprobante_domicilio": "Comprobante de Domicilio",
    "situacion_fiscal": "Constancia de Situación Fiscal",
    "curp": "CURP",
    "nss": "NSS / IMSS",
    "estado_cuenta": "Estado de Cuenta Bancario",
    "cartas_recomendacion": "Carta de Recomendación",
    "titulo_profesional": "Título Profesional",
    "cedula_profesional": "Cédula Profesional",
    "cv": "CV / Currículum",
    "cartas_trabajos_anteriores": "Constancia Laboral",
  };
  
  return translations[type] || type.replace(/_/g, " ");
}

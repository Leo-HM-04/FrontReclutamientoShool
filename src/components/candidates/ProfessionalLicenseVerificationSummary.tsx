interface ProfessionalLicenseScoreMatch {
  status?: string;
  score?: number;
}

interface ProfessionalLicenseCandidateNameMatch extends ProfessionalLicenseScoreMatch {
  candidate_name?: string;
  official_name?: string;
}

interface ProfessionalLicenseExtractedNameMatch extends ProfessionalLicenseScoreMatch {
  document_name?: string;
  official_name?: string;
}

interface ProfessionalLicenseCurpMatch {
  status?: string;
  document_curp?: string;
  official_curp?: string;
}

interface ProfessionalLicenseProfessionMatch extends ProfessionalLicenseScoreMatch {
  official_profession?: string;
}

interface ProfessionalLicenseInstitutionMatch extends ProfessionalLicenseScoreMatch {
  official_institution?: string;
}

interface ProfessionalLicenseOfficialLookupSummary {
  status?: string;
  search_method?: string;
  result_count?: number;
  license_number?: string;
  official_license_match?: string;
  candidate_name_match?: ProfessionalLicenseCandidateNameMatch;
  extracted_name_match?: ProfessionalLicenseExtractedNameMatch;
  curp_match?: ProfessionalLicenseCurpMatch;
  profession_match?: ProfessionalLicenseProfessionMatch;
  institution_match?: ProfessionalLicenseInstitutionMatch;
}

interface ProfessionalLicenseComparisonSummary {
  official_lookup?: ProfessionalLicenseOfficialLookupSummary;
  [key: string]: unknown;
}

export interface ProfessionalLicenseVerificationData {
  status?: string;
  status_display?: string;
  source_system?: string;
  attempt_count?: number;
  verified_at?: string | null;
  last_attempt_at?: string | null;
  last_error?: string | null;
  evidence_summary?: string | null;
  comparison_summary?: ProfessionalLicenseComparisonSummary;
}

interface ProfessionalLicenseVerificationSummaryProps {
  verification?: ProfessionalLicenseVerificationData | null;
  compact?: boolean;
  showComparisonDetails?: boolean;
  title?: string;
  description?: string;
  emptyLabel?: string;
}

const PROFESSIONAL_LICENSE_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-slate-100 text-slate-700',
  extracted: 'bg-amber-100 text-amber-700',
  queued: 'bg-sky-100 text-sky-700',
  verified: 'bg-emerald-100 text-emerald-700',
  not_found: 'bg-rose-100 text-rose-700',
  mismatch: 'bg-orange-100 text-orange-700',
  manual_review: 'bg-fuchsia-100 text-fuchsia-700',
  error: 'bg-red-100 text-red-700',
};

const PROFESSIONAL_LICENSE_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  extracted: 'Datos extraidos',
  queued: 'En cola',
  verified: 'Verificada',
  not_found: 'No encontrada',
  mismatch: 'Mismatch',
  manual_review: 'Revision manual',
  error: 'Error',
};

const PROFESSIONAL_LICENSE_STATUS_DESCRIPTIONS: Record<string, string> = {
  pending: 'La cédula ya fue subida, pero la extracción OCR específica aún no comienza.',
  extracted: 'La extracción OCR terminó y la cédula ya quedó lista para consulta oficial SEP/RNP.',
  queued: 'La verificación está en cola y se procesará en segundo plano en cuanto el worker la tome.',
  verified: 'La SEP/RNP confirmó la cédula y los datos relevantes coinciden con el candidato.',
  not_found: 'La SEP/RNP no encontró una cédula oficial con el número detectado.',
  mismatch: 'La SEP/RNP encontró la cédula, pero hay diferencias importantes contra los datos del candidato o del documento.',
  manual_review: 'El sistema no pudo concluir automáticamente y la cédula requiere revisión manual.',
  error: 'Ocurrió un error técnico durante la extracción OCR o la consulta oficial SEP/RNP.',
  uninitialized: 'La verificación todavía no se ha inicializado para esta cédula profesional.',
  not_applicable: 'Este documento no es una cédula profesional, por eso la verificación SEP/RNP no aplica.',
};

const MATCH_STATUS_STYLES: Record<string, string> = {
  exact: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  partial: 'bg-amber-50 text-amber-700 border-amber-200',
  mismatch: 'bg-rose-50 text-rose-700 border-rose-200',
  missing: 'bg-slate-50 text-slate-600 border-slate-200',
  missing_official: 'bg-slate-50 text-slate-600 border-slate-200',
  not_available_officially: 'bg-slate-50 text-slate-600 border-slate-200',
  missing_extracted: 'bg-slate-50 text-slate-600 border-slate-200',
  found: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  not_found: 'bg-rose-50 text-rose-700 border-rose-200',
  skipped_missing_license_number: 'bg-slate-50 text-slate-600 border-slate-200',
};

const MATCH_STATUS_LABELS: Record<string, string> = {
  exact: 'Coincidencia exacta',
  partial: 'Coincidencia parcial',
  mismatch: 'Mismatch',
  missing: 'Sin dato',
  missing_official: 'Sin dato oficial',
  not_available_officially: 'No disponible oficialmente',
  missing_extracted: 'Sin dato extraido',
  found: 'Encontrado',
  not_found: 'No encontrado',
  skipped_missing_license_number: 'Sin numero de cedula',
};

export function getProfessionalLicenseStatusClass(status?: string) {
  if (!status) {
    return 'bg-slate-100 text-slate-600';
  }

  return PROFESSIONAL_LICENSE_STATUS_STYLES[status] || 'bg-slate-100 text-slate-700';
}

export function getProfessionalLicenseStatusDescription(status?: string) {
  if (!status) {
    return PROFESSIONAL_LICENSE_STATUS_DESCRIPTIONS.uninitialized;
  }

  return PROFESSIONAL_LICENSE_STATUS_DESCRIPTIONS[status] || PROFESSIONAL_LICENSE_STATUS_DESCRIPTIONS.uninitialized;
}

function getProfessionalLicenseStatusLabel(status?: string, statusDisplay?: string) {
  if (statusDisplay) {
    return statusDisplay;
  }

  if (!status) {
    return 'Pendiente de inicializar';
  }

  return PROFESSIONAL_LICENSE_STATUS_LABELS[status] || status;
}

function getMatchStatusClass(status?: string) {
  if (!status) {
    return 'bg-slate-50 text-slate-600 border-slate-200';
  }

  return MATCH_STATUS_STYLES[status] || 'bg-slate-50 text-slate-600 border-slate-200';
}

function getMatchStatusLabel(status?: string) {
  if (!status) {
    return 'Sin dato';
  }

  return MATCH_STATUS_LABELS[status] || status;
}

function formatOptionalDate(dateString?: string | null) {
  if (!dateString) {
    return 'Sin registro';
  }

  return new Date(dateString).toLocaleString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatScore(score?: number) {
  if (typeof score !== 'number' || Number.isNaN(score)) {
    return 'Sin score';
  }

  return `${Math.round(score)}%`;
}

function truncateText(text?: string | null, maxLength: number = 140) {
  if (!text) {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

function ComparisonCard({
  label,
  status,
  score,
  primary,
  secondary,
}: {
  label: string;
  status?: string;
  score?: number;
  primary: string;
  secondary?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getMatchStatusClass(status)}`}>
          {getMatchStatusLabel(status)}
        </span>
      </div>
      <p className="mt-3 text-sm font-semibold text-gray-900">{primary}</p>
      {secondary && <p className="mt-1 text-xs leading-5 text-gray-500">{secondary}</p>}
      {typeof score === 'number' && (
        <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Score: {formatScore(score)}</p>
      )}
    </div>
  );
}

export default function ProfessionalLicenseVerificationSummary({
  verification,
  compact = false,
  showComparisonDetails = false,
  title = 'Verificacion oficial SEP/RNP',
  description,
  emptyLabel = 'Pendiente de inicializar',
}: ProfessionalLicenseVerificationSummaryProps) {
  if (!verification) {
    return (
      <span
        title={getProfessionalLicenseStatusDescription('uninitialized')}
        className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
      >
        {emptyLabel}
      </span>
    );
  }

  const officialLookup = verification.comparison_summary?.official_lookup;
  const statusLabel = getProfessionalLicenseStatusLabel(verification.status, verification.status_display);
  const statusDescription = getProfessionalLicenseStatusDescription(verification.status);

  if (compact) {
    return (
      <div className="space-y-2 max-w-xs">
        <span
          title={statusDescription}
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${getProfessionalLicenseStatusClass(verification.status)}`}
        >
          {statusLabel}
        </span>
        {verification.evidence_summary && (
          <p className="text-xs leading-5 text-gray-500">{truncateText(verification.evidence_summary)}</p>
        )}
      </div>
    );
  }

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
      </div>

      <div className="p-4 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <span
            title={statusDescription}
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${getProfessionalLicenseStatusClass(verification.status)}`}
          >
            {statusLabel}
          </span>
          <p className="text-sm text-gray-500">Fuente: {verification.source_system || 'SEP/RNP'}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Intentos</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{verification.attempt_count ?? 0}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Ultimo intento</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{formatOptionalDate(verification.last_attempt_at)}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Confirmado</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">{formatOptionalDate(verification.verified_at)}</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Evidencia</label>
          <div className="bg-slate-50 rounded-lg p-4 text-sm leading-6 text-gray-700">
            {verification.evidence_summary || 'La verificacion oficial aun no genera evidencia resumida para este documento.'}
          </div>
        </div>

        {showComparisonDetails && (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-2">Comparacion oficial</label>

            {officialLookup ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Cedula consultada</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{officialLookup.license_number || 'Sin dato'}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Resultados SEP/RNP</p>
                    <p className="text-sm font-semibold text-gray-900 mt-1">{officialLookup.result_count ?? 0}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Resultado de lookup</p>
                    <span className={`mt-1 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${getMatchStatusClass(officialLookup.status)}`}>
                      {getMatchStatusLabel(officialLookup.status)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <ComparisonCard
                    label="Nombre del candidato"
                    status={officialLookup.candidate_name_match?.status}
                    score={officialLookup.candidate_name_match?.score}
                    primary={officialLookup.candidate_name_match?.candidate_name || 'Sin nombre del candidato'}
                    secondary={`Oficial: ${officialLookup.candidate_name_match?.official_name || 'Sin nombre oficial'}`}
                  />
                  <ComparisonCard
                    label="Nombre extraido"
                    status={officialLookup.extracted_name_match?.status}
                    score={officialLookup.extracted_name_match?.score}
                    primary={officialLookup.extracted_name_match?.document_name || 'Sin nombre extraido'}
                    secondary={`Oficial: ${officialLookup.extracted_name_match?.official_name || 'Sin nombre oficial'}`}
                  />
                  <ComparisonCard
                    label="CURP"
                    status={officialLookup.curp_match?.status}
                    primary={officialLookup.curp_match?.document_curp || 'Sin CURP en documento'}
                    secondary={`Oficial: ${officialLookup.curp_match?.official_curp || 'Sin CURP oficial'}`}
                  />
                  <ComparisonCard
                    label="Profesion"
                    status={officialLookup.profession_match?.status}
                    score={officialLookup.profession_match?.score}
                    primary={officialLookup.profession_match?.official_profession || 'Sin profesion oficial'}
                  />
                  <ComparisonCard
                    label="Institucion"
                    status={officialLookup.institution_match?.status}
                    score={officialLookup.institution_match?.score}
                    primary={officialLookup.institution_match?.official_institution || 'Sin institucion oficial'}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-slate-50 p-4 text-sm text-gray-600">
                La consulta oficial aun no genera un resumen comparativo para este documento.
              </div>
            )}
          </div>
        )}

        {verification.last_error && (
          <div>
            <label className="block text-sm font-medium text-red-600 mb-1">Ultimo error</label>
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
              {verification.last_error}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
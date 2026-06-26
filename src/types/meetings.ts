/**
 * TypeScript types para el módulo de Reuniones/Entrevistas
 */

export type MeetingStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'rescheduled';
export type MeetingType = 'initial' | 'hr' | 'technical' | 'final' | 'group' | 'follow_up';
export type MeetingFormat = 'virtual' | 'in_person' | 'hybrid';
export type FeedbackRecommendation = 'advance' | 'hold' | 'reject';
export type AiAnalysisStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped' | '';

export interface MeetingInterviewer {
  id: number;
  email: string;
  full_name: string;
  avatar?: string;
}

export interface InterviewFeedback {
  id: number;
  meeting: number;
  interviewer: number;
  interviewer_name: string;
  overall_rating: number;
  technical_score?: number;
  soft_skills_score?: number;
  communication_score?: number;
  recommendation: FeedbackRecommendation;
  recommendation_display: string;
  strengths: string;
  weaknesses: string;
  notes: string;
  is_ai_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface Meeting {
  id: number;
  title: string;

  // Candidato del sistema
  candidate_profile?: number;

  // Candidato externo
  external_candidate_name?: string;
  external_candidate_email?: string;

  // Perfil/Vacante
  profile?: number;

  // Campos derivados (read-only)
  candidate_name: string;
  candidate_email: string;
  profile_title?: string;

  interviewers: number[];
  interviewers_data: MeetingInterviewer[];

  interview_type: MeetingType;
  interview_type_display: string;
  format: MeetingFormat;
  format_display: string;
  status: MeetingStatus;
  status_display: string;

  scheduled_at: string;
  duration_minutes: number;

  location: string;
  teams_join_url: string;
  teams_join_meeting_id: string;   // Código numérico corto (ej. "123 456 789")
  manual_video_url: string;
  join_url: string;

  preparation_notes: string;
  bot_custom_questions: string[];
  transcription: string;

  // Análisis IA post-entrevista (Gemini)
  ai_analysis_status: AiAnalysisStatus;
  ai_analysis_result?: {
    overall_rating?: number;
    technical_score?: number;
    soft_skills_score?: number;
    communication_score?: number;
    recommendation?: string;
    strengths?: string;
    weaknesses?: string;
    notes?: string;
    key_topics?: string[];
    red_flags?: string[];
    candidate_questions?: string[];
    confidence?: number;
  } | null;

  feedbacks: InterviewFeedback[];
  feedbacks_count?: number;

  teams_configured?: boolean;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
}

export interface MeetingFormData {
  title: string;
  candidate_profile?: number | null;
  external_candidate_name?: string;
  external_candidate_email?: string;
  profile?: number | null;
  interviewers: number[];
  interview_type: MeetingType;
  format: MeetingFormat;
  scheduled_at: string;  // ISO string
  duration_minutes: number;
  location?: string;
  manual_video_url?: string;
  preparation_notes?: string;
  bot_custom_questions?: string[];
}

export interface FeedbackFormData {
  meeting: number;
  interviewer?: number;
  overall_rating: number;
  technical_score?: number;
  soft_skills_score?: number;
  communication_score?: number;
  recommendation: FeedbackRecommendation;
  strengths?: string;
  weaknesses?: string;
  notes: string;
}

export interface MeetingStats {
  total: number;
  scheduled: number;
  completed: number;
  cancelled: number;
  today: number;
  this_week: number;
  pending_feedback: number;
}

export interface CalendarEvent {
  id: number;
  title: string;
  start: string;
  end: string;
  status: MeetingStatus;
  type: MeetingType;
  candidate: string;
  join_url: string;
}

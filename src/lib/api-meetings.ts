/**
 * API calls para el módulo de Reuniones
 */
import type {
  Meeting,
  MeetingFormData,
  FeedbackFormData,
  InterviewFeedback,
  MeetingStats,
  CalendarEvent,
} from '@/types/meetings';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

// Token JWT desde localStorage (mismo patrón que el resto del frontend ACTUAL).
function getAuthToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
}

function headers() {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}/meetings${path}`, {
    ...init,
    headers: { ...headers(), ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.detail || err.error || 'Error en la petición'), {
      status: res.status,
      data: err,
    });
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ── Meetings ────────────────────────────────────────────────

export const meetingsApi = {
  list(params: Record<string, string | number | boolean> = {}): Promise<{ results: Meeting[]; count: number }> {
    const qs = new URLSearchParams(
      Object.entries(params).reduce((acc, [k, v]) => ({ ...acc, [k]: String(v) }), {})
    ).toString();
    return request(`/meetings/${qs ? `?${qs}` : ''}`);
  },

  get(id: number): Promise<Meeting> {
    return request(`/meetings/${id}/`);
  },

  create(data: MeetingFormData): Promise<Meeting> {
    return request('/meetings/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update(id: number, data: Partial<MeetingFormData>): Promise<Meeting> {
    return request(`/meetings/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete(id: number): Promise<void> {
    return request(`/meetings/${id}/`, { method: 'DELETE' });
  },

  complete(id: number, transcription?: string): Promise<Meeting> {
    return request(`/meetings/${id}/complete/`, {
      method: 'POST',
      body: JSON.stringify(transcription ? { transcription } : {}),
    });
  },

  cancel(id: number, reason?: string): Promise<Meeting> {
    return request(`/meetings/${id}/cancel/`, {
      method: 'POST',
      body: JSON.stringify(reason ? { reason } : {}),
    });
  },

  analyzeTranscript(id: number): Promise<{ message: string; ai_analysis_status: string }> {
    return request(`/meetings/${id}/analyze_transcript/`, { method: 'POST' });
  },

  upcoming(): Promise<Meeting[]> {
    return request('/meetings/upcoming/');
  },

  calendar(year: number, month: number): Promise<CalendarEvent[]> {
    return request(`/meetings/calendar/?year=${year}&month=${month}`);
  },

  stats(): Promise<MeetingStats> {
    return request('/meetings/stats/');
  },
};

// ── Feedback ────────────────────────────────────────────────

export const feedbackApi = {
  listByMeeting(meetingId: number): Promise<InterviewFeedback[]> {
    return request<{ results?: InterviewFeedback[] } | InterviewFeedback[]>(`/feedback/?meeting=${meetingId}`).then(
      (response) => Array.isArray(response) ? response : (response.results ?? [])
    );
  },

  create(data: FeedbackFormData): Promise<InterviewFeedback> {
    return request('/feedback/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  update(id: number, data: Partial<FeedbackFormData>): Promise<InterviewFeedback> {
    return request(`/feedback/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  },

  delete(id: number): Promise<void> {
    return request(`/feedback/${id}/`, { method: 'DELETE' });
  },
};

// ── Interviews Bot ───────────────────────────────────────────

export interface InterviewSession {
  answers: InterviewSessionAnswer[];
  candidate_name: string;
  candidate_name_display: string;
  completed_at: string | null;
  created_at: string;
  custom_questions_used: string[];
  custom_questions_used_count: number;
  expires_at: string;
  id: number;
  meeting: number;
  meeting_title: string;
  token: string;
  status: 'pending' | 'active' | 'completed' | 'expired';
  questions: string[];
  question_source: 'unknown' | 'gemini' | 'custom';
  question_source_display: string;
  transcript: string;
  started_at: string | null;
  public_url: string;
  recording_url: string | null;
}

export interface InterviewSessionAnswer {
  index: number;
  question: string;
  answer: string;
  is_followup?: boolean;
  question_origin?: 'intro' | 'closing' | 'custom' | 'gemini' | 'followup_gemini';
}

async function interviewsRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const res = await fetch(`${API_BASE}/interviews${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw Object.assign(new Error(err.detail || err.error || 'Error'), { status: res.status, data: err });
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const interviewsApi = {
  createSession(meetingId: number, options?: { useCustomQuestions?: boolean }): Promise<InterviewSession> {
    return interviewsRequest('/sessions/', {
      method: 'POST',
      body: JSON.stringify({
        meeting_id: meetingId,
        use_custom_questions: options?.useCustomQuestions ?? true,
      }),
    });
  },

  listSessions(meetingId: number): Promise<InterviewSession[]> {
    return interviewsRequest(`/sessions/?meeting=${meetingId}`);
  },

  deleteSession(id: number): Promise<void> {
    return interviewsRequest(`/sessions/${id}/`, { method: 'DELETE' });
  },
};

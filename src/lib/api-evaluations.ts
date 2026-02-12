// API Configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Helper function to get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    Authorization: token ? `Bearer ${token}` : "",
  };
};

// ============================================
// EVALUATION TEMPLATES
// ============================================

export const getEvaluationTemplates = async () => {
  const response = await fetch(`${API_URL}/evaluations/templates/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Error fetching templates");
  return response.json();
};

export const getEvaluationTemplate = async (id: number) => {
  const response = await fetch(`${API_URL}/evaluations/templates/${id}/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Error fetching template");
  return response.json();
};

export const createEvaluationTemplate = async (data: any) => {
  const response = await fetch(`${API_URL}/evaluations/templates/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Error creating template");
  return response.json();
};

export const updateEvaluationTemplate = async (id: number, data: any) => {
  const response = await fetch(`${API_URL}/evaluations/templates/${id}/`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Error updating template");
  return response.json();
};

export const deleteEvaluationTemplate = async (id: number) => {
  const response = await fetch(`${API_URL}/evaluations/templates/${id}/`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Error deleting template");
  return response.ok;
};

export const duplicateEvaluationTemplate = async (id: number) => {
  const response = await fetch(`${API_URL}/evaluations/templates/${id}/duplicate/`, {
    method: "POST",
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Error duplicating template");
  return response.json();
};

export const getTemplateStatistics = async (id: number) => {
  const response = await fetch(`${API_URL}/evaluations/templates/${id}/statistics/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Error fetching statistics");
  return response.json();
};

// ============================================
// EVALUATION QUESTIONS
// ============================================

export const getEvaluationQuestions = async (params?: { template_id?: number }) => {
  const queryParams = params?.template_id ? `?template=${params.template_id}` : "";
  const response = await fetch(`${API_URL}/evaluations/questions/${queryParams}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Error fetching questions");
  return response.json();
};

export const getEvaluationQuestion = async (id: number) => {
  const response = await fetch(`${API_URL}/evaluations/questions/${id}/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Error fetching question");
  return response.json();
};

export const createEvaluationQuestion = async (data: any) => {
  const response = await fetch(`${API_URL}/evaluations/questions/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Error creating question");
  return response.json();
};

export const updateEvaluationQuestion = async (id: number, data: any) => {
  const response = await fetch(`${API_URL}/evaluations/questions/${id}/`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Error updating question");
  return response.json();
};

export const deleteEvaluationQuestion = async (id: number) => {
  const response = await fetch(`${API_URL}/evaluations/questions/${id}/`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Error deleting question");
  return response.ok;
};

export const bulkCreateQuestions = async (templateId: number, questions: any[]) => {
  const response = await fetch(`${API_URL}/evaluations/questions/bulk_create/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({
      template_id: templateId,
      questions: questions,
    }),
  });
  if (!response.ok) throw new Error("Error creating questions");
  return response.json();
};

// ============================================
// CANDIDATE EVALUATIONS
// ============================================

export const getCandidateEvaluations = async (params?: {
  status?: string;
  candidate?: number;
  template?: number;
}) => {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append("status", params.status);
  if (params?.candidate) queryParams.append("candidate", params.candidate.toString());
  if (params?.template) queryParams.append("template", params.template.toString());

  const queryString = queryParams.toString();
  const response = await fetch(
    `${API_URL}/evaluations/candidate-evaluations/${queryString ? `?${queryString}` : ""}`,
    { headers: getAuthHeaders() }
  );
  if (!response.ok) throw new Error("Error fetching evaluations");
  return response.json();
};

export const getCandidateEvaluation = async (id: number) => {
  const response = await fetch(`${API_URL}/evaluations/candidate-evaluations/${id}/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Error fetching evaluation");
  return response.json();
};

export const createCandidateEvaluation = async (data: any) => {
  const response = await fetch(`${API_URL}/evaluations/candidate-evaluations/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Error creating evaluation");
  return response.json();
};

export const updateCandidateEvaluation = async (id: number, data: any) => {
  const response = await fetch(`${API_URL}/evaluations/candidate-evaluations/${id}/`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Error updating evaluation");
  return response.json();
};

export const deleteCandidateEvaluation = async (id: number) => {
  const response = await fetch(`${API_URL}/evaluations/candidate-evaluations/${id}/`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Error deleting evaluation");
  return response.ok;
};

export const startEvaluation = async (id: number) => {
  const response = await fetch(
    `${API_URL}/evaluations/candidate-evaluations/${id}/start/`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    }
  );
  if (!response.ok) throw new Error("Error starting evaluation");
  return response.json();
};

export const submitEvaluationAnswers = async (id: number, answers: any[]) => {
  const response = await fetch(
    `${API_URL}/evaluations/candidate-evaluations/${id}/submit/`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify({ answers }),
    }
  );
  if (!response.ok) throw new Error("Error submitting answers");
  return response.json();
};

export const reviewEvaluation = async (id: number, reviewData: any) => {
  const response = await fetch(
    `${API_URL}/evaluations/candidate-evaluations/${id}/review/`,
    {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(reviewData),
    }
  );
  if (!response.ok) throw new Error("Error reviewing evaluation");
  return response.json();
};

export const completeEvaluation = async (id: number) => {
  const response = await fetch(
    `${API_URL}/evaluations/candidate-evaluations/${id}/complete/`,
    {
      method: "POST",
      headers: getAuthHeaders(),
    }
  );
  if (!response.ok) throw new Error("Error completing evaluation");
  return response.json();
};

export const getMyEvaluations = async () => {
  const response = await fetch(
    `${API_URL}/evaluations/candidate-evaluations/my_evaluations/`,
    { headers: getAuthHeaders() }
  );
  if (!response.ok) throw new Error("Error fetching my evaluations");
  return response.json();
};

export const getPendingReviews = async () => {
  const response = await fetch(
    `${API_URL}/evaluations/candidate-evaluations/pending_reviews/`,
    { headers: getAuthHeaders() }
  );
  if (!response.ok) throw new Error("Error fetching pending reviews");
  return response.json();
};

export const getEvaluationStatistics = async () => {
  const response = await fetch(
    `${API_URL}/evaluations/candidate-evaluations/statistics/`,
    { headers: getAuthHeaders() }
  );
  if (!response.ok) throw new Error("Error fetching statistics");
  return response.json();
};

// ============================================
// EVALUATION ANSWERS
// ============================================

export const getEvaluationAnswers = async (params?: { evaluation?: number }) => {
  const queryParams = params?.evaluation ? `?evaluation=${params.evaluation}` : "";
  const response = await fetch(`${API_URL}/evaluations/answers/${queryParams}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Error fetching answers");
  return response.json();
};

export const getEvaluationAnswer = async (id: number) => {
  const response = await fetch(`${API_URL}/evaluations/answers/${id}/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Error fetching answer");
  return response.json();
};

export const createEvaluationAnswer = async (data: any) => {
  const response = await fetch(`${API_URL}/evaluations/answers/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Error creating answer");
  return response.json();
};

export const updateEvaluationAnswer = async (id: number, data: any) => {
  const response = await fetch(`${API_URL}/evaluations/answers/${id}/`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Error updating answer");
  return response.json();
};

export const deleteEvaluationAnswer = async (id: number) => {
  const response = await fetch(`${API_URL}/evaluations/answers/${id}/`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Error deleting answer");
  return response.ok;
};

// ============================================
// EVALUATION COMMENTS
// ============================================

export const getEvaluationComments = async (params?: { evaluation?: number }) => {
  const queryParams = params?.evaluation ? `?evaluation=${params.evaluation}` : "";
  const response = await fetch(`${API_URL}/evaluations/comments/${queryParams}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Error fetching comments");
  return response.json();
};

export const getEvaluationComment = async (id: number) => {
  const response = await fetch(`${API_URL}/evaluations/comments/${id}/`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Error fetching comment");
  return response.json();
};

export const createEvaluationComment = async (data: any) => {
  const response = await fetch(`${API_URL}/evaluations/comments/`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Error creating comment");
  return response.json();
};

export const updateEvaluationComment = async (id: number, data: any) => {
  const response = await fetch(`${API_URL}/evaluations/comments/${id}/`, {
    method: "PUT",
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error("Error updating comment");
  return response.json();
};

export const deleteEvaluationComment = async (id: number) => {
  const response = await fetch(`${API_URL}/evaluations/comments/${id}/`, {
    method: "DELETE",
    headers: getAuthHeaders(),
  });
  if (!response.ok) throw new Error("Error deleting comment");
  return response.ok;
};

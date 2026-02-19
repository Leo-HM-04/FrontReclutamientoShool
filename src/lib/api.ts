/**
 * API client utilities for the recruitment system
 * Actualizado con funciones completas de Candidatos, Aplicaciones, Documentos y Notas
 * 
 * @module api
 * @description Cliente API centralizado para todas las operaciones del sistema de reclutamiento
 */

/** URL base de la API del backend */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/** Tiempo máximo de espera para peticiones en milisegundos */
const REQUEST_TIMEOUT = 30000;

/** Claves de almacenamiento local para tokens */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  REFRESH_TOKEN: 'refreshToken',
  USER: 'user',
  USER_ROLE: 'userRole',
} as const;

interface LoginCredentials {
  email: string;
  password: string;
}

interface LoginResponse {
  access: string;
  refresh: string;
  user: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    role: string;
    role_display: string;
    is_active: boolean;
  };
}

interface ApiError {
  message: string;
  status: number;
  details?: any;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }

  /**
   * Make a HTTP request with proper error handling
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${token}`,
      };
    }

    console.log('🌐 API Request:', {
      url,
      method: options.method || 'GET',
      hasToken: !!token
    });

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        let errorData: any = null;
        try {
          errorData = await response.json();
        } catch (e) {
          // Ignorar errores de parseo
        }
        
        throw {
          message: errorData?.detail || `Error ${response.status}`,
          status: response.status,
          details: errorData,
        } as ApiError;
      }

      // Si la respuesta es 204 No Content o no tiene contenido, retornar objeto vacío
      if (response.status === 204 || response.headers.get('content-length') === '0') {
        return {} as T;
      }

      // Intentar parsear JSON, si falla retornar objeto vacío
      const text = await response.text();
      return text ? JSON.parse(text) : {} as T;
    } catch (error) {
      console.error('❌ API Request failed:', error);
      
      // ✅ Asegurar que siempre devolvemos un objeto de error con estructura
      throw {
        message: 'Error en la petición',
        status: 0,
        details: error
      };
    }
  }

  

  // ====== AUTHENTICATION ======

  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    return this.makeRequest<LoginResponse>('/auth/token/', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(refreshToken: string): Promise<{ access: string }> {
    return this.makeRequest<{ access: string }>('/auth/token/refresh/', {
      method: 'POST',
      body: JSON.stringify({ refresh: refreshToken }),
    });
  }

  /**
   * Get current user information
   */
  async getCurrentUser() {
    return this.makeRequest('/accounts/users/me/');
  }

  /**
   * Logout user (clear tokens)
   */
  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
  }

  // ====== CANDIDATES ENDPOINTS ======

  /**
   * Get candidates list with optional filters
   */
  async getCandidates(params?: any) {
    if (params) {
      const filteredParams: any = {};
      Object.keys(params).forEach(key => {
        if (params[key] && params[key] !== '' && params[key] !== 'all') {
          filteredParams[key] = params[key];
        }
      });
      
      const queryString = Object.keys(filteredParams).length > 0 
        ? '?' + new URLSearchParams(filteredParams).toString()
        : '';
      
      return this.makeRequest(`/candidates/candidates/${queryString}`);
    }
    
    return this.makeRequest('/candidates/candidates/');
  }

  /**
   * Get candidate by ID
   */
  async getCandidate(id: number) {
    return this.makeRequest(`/candidates/candidates/${id}/`);
  }

  /**
   * Create new candidate
   */
  async createCandidate(candidateData: any) {
    return this.makeRequest('/candidates/candidates/', {
      method: 'POST',
      body: JSON.stringify(candidateData),
    });
  }

  /**
   * Update candidate
   */
  async updateCandidate(id: number, candidateData: any) {
    return this.makeRequest(`/candidates/candidates/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(candidateData),
    });
  }

  /**
   * Delete candidate
   */
  async deleteCandidate(id: number) {
    return this.makeRequest(`/candidates/candidates/${id}/`, {
      method: 'DELETE',
    });

  }

  // ====== APPLICATIONS (CANDIDATEPROFILE) ENDPOINTS ======

  // ====== NOTIFICATIONS ======
  async getNotifications(params?: any) {
    const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
    return this.makeRequest(`/notifications/${qs}`);
  }

  async getUnreadNotifications() {
    return this.makeRequest(`/notifications/unread/`);
  }

  async markNotificationRead(id: number) {
    return this.makeRequest(`/notifications/${id}/mark_as_read/`, { method: 'POST' });
  }

  async markNotificationUnread(id: number) {
    return this.makeRequest(`/notifications/${id}/mark_as_unread/`, { method: 'POST' });
  }

  async markAllNotificationsRead() {
    return this.makeRequest(`/notifications/mark_all_as_read/`, { method: 'POST' });
  }

  async clearReadNotifications() {
    return this.makeRequest(`/notifications/clear_read/`, { method: 'DELETE' });
  }

  /**
   * Get candidate applications
   */
  async getCandidateApplications(candidateId?: number) {
    const endpoint = candidateId 
      ? `/candidates/applications/?candidate=${candidateId}` 
      : '/candidates/applications/';
    return this.makeRequest(endpoint);
  }

  /**
   * Get application by ID
   */
  async getCandidateApplication(id: number) {
    return this.makeRequest(`/candidates/applications/${id}/`);
  }

  /**
   * Create candidate application
   */
  async createCandidateApplication(applicationData: any) {
    return this.makeRequest('/candidates/applications/', {
      method: 'POST',
      body: JSON.stringify(applicationData),
    });
  }

  /**
   * Update candidate application
   */
  async updateCandidateApplication(id: number, applicationData: any) {
    return this.makeRequest(`/candidates/applications/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(applicationData),
    });
  }

  /**
   * Delete candidate application
   */
  async deleteCandidateApplication(id: number) {
    return this.makeRequest(`/candidates/applications/${id}/`, {
      method: 'DELETE',
    });
  }

  // ====== DOCUMENTS ENDPOINTS ======

  /**
   * Get candidate documents
   */
  async getCandidateDocuments(candidateId?: number) {
    const endpoint = candidateId 
      ? `/candidates/documents/?candidate=${candidateId}` 
      : '/candidates/documents/';
    return this.makeRequest(endpoint);
  }

  /**
   * Get document by ID
   */
  async getCandidateDocument(id: number) {
    return this.makeRequest(`/candidates/documents/${id}/`);
  }

  /**
   * Upload candidate document
   */
  async uploadCandidateDocument(formData: FormData) {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${this.baseURL}/candidates/documents/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.message || 'Error al subir documento',
        status: response.status,
        details: errorData,
      } as ApiError;
    }

    return await response.json();
  }

  /**
   * Delete candidate document
   */
  async deleteCandidateDocument(id: number) {
    return this.makeRequest(`/candidates/documents/${id}/`, {
      method: 'DELETE',
    });
  }

  // ====== DOCUMENT VALIDATION (OCR) ENDPOINTS ======

  /**
   * Validate a document using OCR before upload.
   * Returns validation status, scores, and detected fields.
   * Uses public endpoint if no auth token is available (for public document links).
   */
  async validateDocument(formData: FormData) {
    const token = localStorage.getItem('authToken');
    
    // Si no hay token de autenticación, usar el endpoint público
    const endpoint = token 
      ? `${this.baseURL}/documents/validate/`
      : `${this.baseURL}/public/documents/validate/`;
    
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.error || errorData.message || 'Error al validar documento',
        status: response.status,
        details: errorData,
      } as ApiError;
    }

    return await response.json();
  }

  /**
   * Get document validation rules and configuration.
   * Useful for showing which documents require validation.
   */
  async getValidationRules() {
    return this.makeRequest('/documents/validation-rules/');
  }

  // ====== NOTES ENDPOINTS ======

  /**
   * Get candidate notes
   */
  async getCandidateNotes(candidateId?: number) {
    const endpoint = candidateId 
      ? `/candidates/notes/?candidate=${candidateId}` 
      : '/candidates/notes/';
    return this.makeRequest(endpoint);
  }

  /**
   * Get note by ID
   */
  async getCandidateNote(id: number) {
    return this.makeRequest(`/candidates/notes/${id}/`);
  }

  /**
   * Create candidate note
   */
  async createCandidateNote(noteData: any) {
    return this.makeRequest('/candidates/notes/', {
      method: 'POST',
      body: JSON.stringify(noteData),
    });
  }

  /**
   * Update candidate note
   */
  async updateCandidateNote(id: number, noteData: any) {
    return this.makeRequest(`/candidates/notes/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(noteData),
    });
  }

  /**
   * Delete candidate note
   */
  async deleteCandidateNote(id: number) {
    return this.makeRequest(`/candidates/notes/${id}/`, {
      method: 'DELETE',
    });
  }

  // ====== CELERY TASKS ======

  /**
   * Get Celery tasks status and statistics
   */
  async getCeleryTasksStatus(): Promise<any> {
    return this.makeRequest<any>('/director/celery-tasks/');
  }

  /**
   * Get Celery task groups information
   */
  async getCeleryTaskGroups(): Promise<any> {
    return this.makeRequest<any>('/director/celery-groups/');
  }

  /**
   * Get AI services stats with hybrid metrics
   */
  async getAIHybridStats(): Promise<any> {
    return this.makeRequest<any>('/api/ai-services/logs/stats/');
  }

  // ====== CONTACTS ENDPOINTS ======
  
  /**
   * Get all contacts
   */
  async getContacts(params?: any): Promise<any> {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return this.makeRequest<any>(`/clients/contacts${queryString}`);
  }

  /**
   * Get single contact by ID
   */
  async getContact(id: number): Promise<any> {
    return this.makeRequest<any>(`/clients/contacts/${id}/`);
  }

  /**
   * Create new contact
   */
  async createContact(contactData: any): Promise<any> {
    return this.makeRequest<any>('/contacts/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(contactData),
    });
  }

  /**
   * Update contact
   */
  async updateContact(id: number, contactData: any): Promise<any> {
    return this.makeRequest<any>(`/clients/contacts/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(contactData),
    });
  }

  /**
   * Delete contact
   */
  async deleteContact(id: number): Promise<any> {
    return this.makeRequest<any>(`/clients/contacts/${id}/`, {
      method: 'DELETE',
    });
  }

  // ====== PROFILES ENDPOINTS ======

  /**
   * Get all profiles
   */
  async getProfiles(params?: Record<string, string>) {
    const cleanParams: Record<string, string> = {};
    
    if (params) {
      if (params.search && params.search.trim() !== '') {
        cleanParams.search = params.search;
      }
      if (params.status && params.status !== 'all') {
        cleanParams.status = params.status;
      }
      if (params.priority && params.priority !== 'all') {
        cleanParams.priority = params.priority;
      }
    }
    
    const queryString = Object.keys(cleanParams).length > 0
      ? '?' + new URLSearchParams(cleanParams).toString()
      : '';
    
    return this.makeRequest<any>(`/profiles/profiles/${queryString}`);
  }

  /**
   * Get single profile by ID
   */
  async getProfile(id: number): Promise<any> {
    return this.makeRequest<any>(`/profiles/profiles/${id}/`);
  }

  /**
   * Create new profile
   */
  async createProfile(profileData: Partial<Profile>): Promise<Profile> {
    return this.makeRequest<Profile>('/profiles/profiles/', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  }

  /**
   * Update profile
   */
  async updateProfile(id: number, profileData: Partial<Profile>): Promise<Profile> {
    return this.makeRequest<Profile>(`/profiles/profiles/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(profileData),
    });
  }

  /**
   * Delete profile
   */
  async deleteProfile(id: number): Promise<void> {
    return this.makeRequest<void>(`/profiles/profiles/${id}/`, {
      method: 'DELETE',
    });
  }

    /**
   * Approve or reject profile
   */
  async approveProfile(
    id: number,
    data: { approved: boolean; feedback?: string }
  ): Promise<any> {
    return this.makeRequest<any>(`/profiles/profiles/${id}/approve/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Change profile status
   */
  async changeProfileStatus(
    id: number,
    data: { status: string; notes?: string }
  ): Promise<any> {
    return this.makeRequest<any>(`/profiles/profiles/${id}/change_status/`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

    /**
   * Get profile statistics
   */
 async getProfileStats(): Promise<any> {
    return this.makeRequest<any>('/profiles/profiles/stats/');
  }

  /**
   * Get automatic candidate recommendations for a profile
   * Uses AI matching optimized to minimize token usage
   * @param profileId - The profile ID to get recommendations for
   * @param limit - Number of recommendations (default: 5, max: 10)
   * @param useAI - Whether to use AI analysis (default: true)
   */
  async getAutoRecommendations(
    profileId: number,
    limit: number = 5,
    useAI: boolean = true
  ): Promise<{
    profile_id: number;
    profile_title: string;
    candidates_analyzed: number;
    recommendations: Array<{
      candidate_id: number;
      candidate_name: string;
      candidate_email: string;
      current_position: string;
      current_company: string;
      years_of_experience: number;
      education_level: string;
      city: string;
      state: string;
      skills: string[];
      local_score: number;
      ai_score: number | null;
      analysis: string;
      strengths: string[];
      gaps: string[];
      recommendations: string;
      cached: boolean;
    }>;
    total_candidates_in_db: number;
    tokens_used: number;
    execution_time_seconds: number;
    used_ai: boolean;
  }> {
    const params = new URLSearchParams();
    params.append('limit', limit.toString());
    params.append('use_ai', useAI.toString());
    
    return this.makeRequest<any>(
      `/profiles/profiles/${profileId}/auto_recommend/?${params.toString()}`,
      { method: 'POST' }
    );
  }

  /**
   * Get profile status history for a given profile
   */
  async getProfileHistory(profileId: number): Promise<any> {
    return this.makeRequest<any>(`/profiles/profiles/${profileId}/history/`);
  }

  /**
   * Get documents associated to profiles
   */
  async getProfileDocuments(profileId?: number): Promise<any> {
    if (profileId) {
      // Si hay un profileId específico, usar la acción del perfil
      return this.makeRequest<any>(`/profiles/profiles/${profileId}/documents/`);
    }
    // Si no hay profileId, usar el endpoint general
    return this.makeRequest<any>('/profiles/documents/');
  }

  /**
   * Upload document for a profile
   */
  async uploadProfileDocument(profileId: number, formData: FormData): Promise<any> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
    
    const response = await fetch(
      `${this.baseURL}/profiles/profiles/${profileId}/upload_document/`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          // NO incluir Content-Type para que el navegador lo establezca automáticamente con boundary
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'Error desconocido' }));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Delete profile document
   */
  async deleteProfileDocument(id: number) {
    return this.makeRequest(`/profiles/documents/${id}/`, {
      method: 'DELETE',
    });
  }

  /**
   * Generate share link for a profile
   */
  async generateShareLink(profileId: number, options?: { duration_hours?: number }): Promise<any> {
    const body = options ? JSON.stringify(options) : '{}';
    return this.makeRequest<any>(`/profiles/profiles/${profileId}/generate_share_link/`, {
      method: 'POST',
      body: body,
    });
  }

  /**
   * Get shared links for profiles
   */
  async getSharedLinks(): Promise<any> {
    return this.makeRequest<any>('/profiles/shared-links/');
  }



  // ====== CLIENTS ENDPOINTS ======

  /**
   * Get all clients
   */
  async getClients(params?: Record<string, string>): Promise<any> {
    const cleanParams: Record<string, string> = {};
    
    if (params) {
      if (params.search && params.search.trim() !== '') {
        cleanParams.search = params.search;
      }
      if (params.industry && params.industry !== 'all') {
        cleanParams.industry = params.industry;
      }
      if (params.is_active !== undefined) {
        cleanParams.is_active = params.is_active;
      }
    }
    
    const queryString = Object.keys(cleanParams).length > 0
      ? '?' + new URLSearchParams(cleanParams).toString()
      : '';
    
    return this.makeRequest<any>(`/clients/${queryString}`);
  }

  /**
   * Get single client by ID
   */
  async getClient(id: number): Promise<any> {
    return this.makeRequest<any>(`/clients/${id}/`);
  }

  /**
   * Create new client
   */
  async createClient(clientData: Partial<Client>): Promise<Client> {
    return this.makeRequest<Client>('/clients/', {
      method: 'POST',
      body: JSON.stringify(clientData),
    });
  }

  /**
   * Update client
   */
  async updateClient(id: number, clientData: Partial<Client>): Promise<Client> {
    return this.makeRequest<Client>(`/clients/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(clientData),
    });
  }

  /**
   * Delete client
   */
  async deleteClient(id: number): Promise<void> {
    return this.makeRequest<void>(`/clients/${id}/`, {
      method: 'DELETE',
    });
  }

  /**
   * Generate share link for a client (to create profiles)
   */
  async generateClientShareLink(clientId: number, options?: { duration_hours?: number }): Promise<any> {
    const body = options ? JSON.stringify(options) : '{}';
    return this.makeRequest<any>(`/clients/${clientId}/generate_share_link/`, {
      method: 'POST',
      body: body,
    });
  }

  /**
   * Get shared links for clients (list of clients with active share tokens and status)
   */
  async getClientSharedLinks(): Promise<any> {
    return this.makeRequest<any>(`/clients/shared_links/`);
  }

  /**
   * Revoke a specific shared link for a client
   */
  async revokeClientSharedLink(clientId: number, token: string): Promise<any> {
    return this.makeRequest<any>(`/clients/${clientId}/revoke_shared_link/`, {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }



  // ====== USERS MANAGEMENT ======

  /**
   * Get all users with optional filters
   */
  async getUsers(params?: Record<string, string>): Promise<any> {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return this.makeRequest<any>(`/accounts/users/${queryString}`);
  }

  /**
   * Get single user by ID
   */
  async getUser(id: number): Promise<User> {
    return this.makeRequest<User>(`/accounts/users/${id}/`);
  }

  /**
   * Create new user
   */
  async createUser(userData: CreateUserData): Promise<User> {
    return this.makeRequest<User>('/accounts/users/', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  /**
   * Update user
   */
  async updateUser(id: number, userData: UpdateUserData): Promise<User> {
    return this.makeRequest<User>(`/accounts/users/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(userData),
    });
  }

  /**
   * Delete user (soft delete - set inactive)
   */
  async deleteUser(id: number): Promise<void> {
    return this.makeRequest<void>(`/accounts/users/${id}/`, {
      method: 'DELETE',
    });
  }

  /**
   * Toggle user active status
   */
  async toggleUserStatus(id: number, isActive: boolean): Promise<User> {
    return this.updateUser(id, { is_active: isActive });
  }

  /**
   * Get user activities
   */
  async getUserActivities(params?: Record<string, any>): Promise<any> {
    const queryParams = params ? `?${new URLSearchParams(params)}` : '';
    return this.makeRequest<any>(`/accounts/activities/${queryParams}`);
  }

  /**
   * Get activities for specific user
   */
  async getUserActivityById(userId: number): Promise<UserActivity[]> {
    return this.makeRequest<UserActivity[]>(`/accounts/users/${userId}/activities/`);
  }

  /**
   * Get system statistics
   */
  async getSystemStats(): Promise<any> {
    return this.makeRequest<any>('/accounts/users/stats/');
  }

  // ====== ADMIN DASHBOARD ======

  /**
   * Get admin dashboard statistics
   */
  async getAdminDashboard(): Promise<AdminDashboardStats> {
    try {
      const [users, clients, profiles, candidates, activities]: [any, any, any, any, any] = await Promise.all([
        this.getUsers(),
        this.getClients(),
        this.getProfiles(),
        this.getCandidates(),
        this.getUserActivities({ limit: 10 })
      ]);

      const usersList = users.results || users;
      const usersStats = {
        total: usersList.length,
        active: usersList.filter((u: User) => u.is_active).length,
        inactive: usersList.filter((u: User) => !u.is_active).length,
        by_role: {
          admin: usersList.filter((u: User) => u.role === 'admin').length,
          director: usersList.filter((u: User) => u.role === 'director').length,
          supervisor: usersList.filter((u: User) => u.role === 'supervisor').length,
        }
      };

      const clientsList = clients.results || clients;
      const clientsStats = {
        total: clientsList.length,
        active: clientsList.filter((c: Client) => c.is_active).length,
        inactive: clientsList.filter((c: Client) => !c.is_active).length,
      };

      const profilesList = profiles.results || profiles;
      const profilesStats = {
        total: profilesList.length,
        by_status: profilesList.reduce((acc: Record<string, number>, p: Profile) => {
          acc[p.status] = (acc[p.status] || 0) + 1;
          return acc;
        }, {})
      };

      const candidatesList = candidates.results || candidates;
      const candidatesStats = {
        total: candidatesList.length,
        by_status: candidatesList.reduce((acc: Record<string, number>, c: Candidate) => {
          acc[c.status] = (acc[c.status] || 0) + 1;
          return acc;
        }, {})
      };

      return {
        users: usersStats,
        clients: clientsStats,
        profiles: profilesStats,
        candidates: candidatesStats,
        recent_activities: activities.results || activities
      };
    } catch (error) {
      console.error('Error loading admin dashboard:', error);
      throw error;
    }
  }

  // ====== AI SERVICES ENDPOINTS ======

  /**
   * Analyze CV with AI
   * @param formData FormData with candidate_id and document_file
   */
  async analyzeCVWithAI(formData: FormData): Promise<any> {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${this.baseURL}/ai-services/cv-analysis/analyze/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.message || 'Error analyzing CV',
        status: response.status,
        details: errorData,
      } as ApiError;
    }

    return await response.json();
  }

  /**
   * Get CV analysis results
   */
  async getCVAnalyses(params?: Record<string, string>): Promise<any> {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return this.makeRequest<any>(`/ai-services/cv-analysis/${queryString}`);
  }

  /**
   * Get single CV analysis by ID
   */
  async getCVAnalysis(id: number): Promise<any> {
    return this.makeRequest<any>(`/ai-services/cv-analysis/${id}/`);
  }

  /**
   * Generate profile from meeting transcription
   */
  async generateProfileFromTranscription(data: {
    meeting_transcription: string;
    client_id?: number;
    additional_notes?: string;
  }): Promise<any> {
    return this.makeRequest<any>('/ai-services/profile-generation/generate/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get profile generations
   */
  async getProfileGenerations(params?: Record<string, string>): Promise<any> {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return this.makeRequest<any>(`/ai-services/profile-generation/${queryString}`);
  }

  /**
   * Get single profile generation by ID
   */
  async getProfileGeneration(id: number): Promise<any> {
    return this.makeRequest<any>(`/ai-services/profile-generation/${id}/`);
  }

  /**
   * Calculate candidate-profile matching with AI
   */
  async calculateMatching(data: {
    candidate_id: number;
    profile_id: number;
  }): Promise<any> {
    return this.makeRequest<any>('/ai-services/matching/calculate/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Get matching results
   */
  async getMatchings(params?: Record<string, string>): Promise<any> {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return this.makeRequest<any>(`/ai-services/matching/${queryString}`);
  }

  /**
   * Bulk upload CVs with AI analysis
   */
  async bulkUploadCVs(formData: FormData): Promise<any> {
    const token = localStorage.getItem('authToken');
    const response = await fetch(`${this.baseURL}/candidates/candidates/bulk_upload_cvs/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw {
        message: errorData.message || 'Error uploading CVs',
        status: response.status,
        details: errorData,
      } as ApiError;
    }

    return await response.json();
  }

  /**
   * Check bulk upload status
   */
  async getBulkUploadStatus(taskId: string): Promise<any> {
    return this.makeRequest<any>(`/candidates/candidates/bulk_upload_status/?task_id=${taskId}`);
  }

  
}

// ====== TYPE DEFINITIONS ======

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: 'admin' | 'director' | 'supervisor';
  role_display: string;
  phone?: string;
  avatar?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserActivity {
  id: number;
  user: number;
  user_email: string;
  user_name: string;
  action: string;
  description: string;
  ip_address: string;
  timestamp: string;
}

export interface Client {
  id: number;
  name: string;
  industry: string;
  size: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country: string;
  phone?: string;
  email?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: number;
  client: number;
  client_name: string;
  position_title: string;
  status: string;
  status_display: string;
  priority: string;
  service_type: string;
  assigned_to?: number;
  assigned_to_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone?: string;
  status: string;
  status_display: string;
  current_position?: string;
  current_company?: string;
  years_experience?: number;
  created_at: string;
  updated_at: string;
}

export interface AdminDashboardStats {
  users: {
    total: number;
    active: number;
    inactive: number;
    by_role: {
      admin: number;
      director: number;
      supervisor: number;
    };
  };
  clients: {
    total: number;
    active: number;
    inactive: number;
  };
  profiles: {
    total: number;
    by_status: Record<string, number>;
  };
  candidates: {
    total: number;
    by_status: Record<string, number>;
  };
  recent_activities: UserActivity[];
}

export interface CreateUserData {
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'director' | 'supervisor';
  phone?: string;
}

export interface UpdateUserData {
  email?: string;
  first_name?: string;
  last_name?: string;
  role?: 'admin' | 'director' | 'supervisor';
  phone?: string;
  is_active?: boolean;
}




// Create and export a default instance
export const apiClient = new ApiClient();



// Convenience function exports for components (profiles)
export const getProfiles = (params?: Record<string, string>) =>
  apiClient.getProfiles(params);

export const getProfile = (id: number) =>
  apiClient.getProfile(id);

export const approveProfile = (
  id: number,
  data: { approved: boolean; feedback?: string }
) => apiClient.approveProfile(id, data);

export const changeProfileStatus = (
  id: number,
  data: { status: string; notes?: string }
) => apiClient.changeProfileStatus(id, data);

export const createProfile = (profileData: Partial<Profile>) =>
  apiClient.createProfile(profileData);

export const updateProfile = (id: number, profileData: Partial<Profile>) =>
  apiClient.updateProfile(id, profileData);

export const deleteProfile = (id: number) =>
  apiClient.deleteProfile(id);

export const getProfileStats = () =>
  apiClient.getProfileStats();

export const getAutoRecommendations = (
  profileId: number,
  limit: number = 5,
  useAI: boolean = true
) => apiClient.getAutoRecommendations(profileId, limit, useAI);

export const getProfileDocuments = (profileId?: number) =>
  apiClient.getProfileDocuments(profileId);

export const uploadProfileDocument = (profileId: number, formData: FormData) =>
  apiClient.uploadProfileDocument(profileId, formData);

export const getProfileHistory = (profileId: number) =>
  apiClient.getProfileHistory(profileId);

// Candidates exports  <--- AGREGAR DESDE AQUÍ
export const getCandidates = (params?: any) =>
  apiClient.getCandidates(params);

export const getCandidate = (id: number) =>
  apiClient.getCandidate(id);

export const createCandidate = (candidateData: any) =>
  apiClient.createCandidate(candidateData);

export const updateCandidate = (id: number, candidateData: any) =>
  apiClient.updateCandidate(id, candidateData);

export const deleteCandidate = (id: number) =>
  apiClient.deleteCandidate(id);

// Clients exports
export const getClients = (params?: Record<string, string>) =>
  apiClient.getClients(params);

export const getClient = (id: number) =>
  apiClient.getClient(id);

export const createClient = (clientData: any) =>
  apiClient.createClient(clientData);

export const updateClient = (id: number, clientData: any) =>
  apiClient.updateClient(id, clientData);

export const deleteClient = (id: number) =>
  apiClient.deleteClient(id);


// AI Services exports
export const analyzeCVWithAI = (formData: FormData) =>
  apiClient.analyzeCVWithAI(formData);

export const getCVAnalyses = (params?: Record<string, string>) =>
  apiClient.getCVAnalyses(params);

export const getCVAnalysis = (id: number) =>
  apiClient.getCVAnalysis(id);

export const generateProfileFromTranscription = (data: {
  meeting_transcription: string;
  client_id?: number;
  additional_notes?: string;
}) => apiClient.generateProfileFromTranscription(data);

export const getProfileGenerations = (params?: Record<string, string>) =>
  apiClient.getProfileGenerations(params);

export const getProfileGeneration = (id: number) =>
  apiClient.getProfileGeneration(id);

export const calculateMatching = (data: { candidate_id: number; profile_id: number }) =>
  apiClient.calculateMatching(data);

export const getMatchings = (params?: Record<string, string>) =>
  apiClient.getMatchings(params);

export const bulkUploadCVs = (formData: FormData) =>
  apiClient.bulkUploadCVs(formData);

export const getBulkUploadStatus = (taskId: string) =>
  apiClient.getBulkUploadStatus(taskId);


// ============================================================
// DOCUMENT SHARE LINKS API
// ============================================================

export interface DocumentShareLink {
  id: number;
  token: string;
  candidate: number;
  candidate_name?: string;  // Campo del SummarySerializer
  candidate_info?: {
    id: number;
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
  };
  requested_document_types?: string[];  // Solo en detail
  uploaded_documents?: number[];  // Solo en detail
  documents_count?: string;  // En summary: "0/4", "1/3", etc.
  uploaded_count?: number; // Número explícito de documentos subidos
  requested_count?: number; // Número explícito de documentos solicitados
  status: 'active' | 'expired' | 'revoked' | 'completed';
  status_display: string;
  expires_at: string;
  message?: string;
  config?: Record<string, any>;
  created_by?: number;
  created_by_name?: string;
  created_at: string;
  updated_at?: string;
  access_count: number;
  last_accessed_at?: string | null;
  completed_at?: string | null;
  is_expired?: boolean;
  is_usable: boolean;
  progress_percentage: number;
  pending_document_types?: string[];
  share_url: string;
}

export interface DocumentShareLinkCreate {
  candidate: number;
  requested_document_types: string[];
  message?: string;
  config?: Record<string, any>;
  expiration_days?: number;
}

export interface PublicDocumentShareLink {
  token: string;
  candidate_name: string;
  message: string;
  requested_documents_info: Array<{ type: string; label: string }>;
  pending_documents: Array<{ type: string; label: string }>;
  progress_percentage: number;
  expires_at: string;
}

/**
 * Obtiene todos los document share links
 */
export const getDocumentShareLinks = async (params?: Record<string, string>): Promise<DocumentShareLink[]> => {
  const queryString = params ? '?' + new URLSearchParams(params).toString() : '';
  const response = await fetch(`${API_BASE_URL}/documents/share-links/${queryString}`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)}`,
    },
  });
  if (!response.ok) throw new Error('Error al obtener links');
  return response.json();
};

/**
 * Obtiene un document share link por ID
 */
export const getDocumentShareLink = async (id: number): Promise<DocumentShareLink> => {
  const response = await fetch(`${API_BASE_URL}/documents/share-links/${id}/`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)}`,
    },
  });
  if (!response.ok) throw new Error('Error al obtener link');
  return response.json();
};

/**
 * Crea un nuevo document share link
 */
export const createDocumentShareLink = async (data: DocumentShareLinkCreate): Promise<DocumentShareLink> => {
  const response = await fetch(`${API_BASE_URL}/documents/share-links/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || error.message || 'Error al crear link');
  }
  return response.json();
};

/**
 * Revoca un document share link
 */
export const revokeDocumentShareLink = async (id: number): Promise<{ message: string; link: DocumentShareLink }> => {
  const response = await fetch(`${API_BASE_URL}/documents/share-links/${id}/revoke/`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)}`,
    },
  });
  if (!response.ok) throw new Error('Error al revocar link');
  return response.json();
};

/**
 * Elimina un document share link
 */
export const deleteDocumentShareLink = async (id: number): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/documents/share-links/${id}/`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)}`,
    },
  });
  if (!response.ok) throw new Error('Error al eliminar link');
};

/**
 * Obtiene links de un candidato específico
 */
export const getDocumentShareLinksByCandidate = async (candidateId: number): Promise<DocumentShareLink[]> => {
  const response = await fetch(`${API_BASE_URL}/documents/share-links/by_candidate/${candidateId}/`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)}`,
    },
  });
  if (!response.ok) throw new Error('Error al obtener links del candidato');
  return response.json();
};

/**
 * Obtiene estadísticas de share links
 */
export const getDocumentShareLinksStats = async (): Promise<{
  total: number;
  active: number;
  completed: number;
  expired: number;
  revoked: number;
}> => {
  const response = await fetch(`${API_BASE_URL}/documents/share-links/stats/`, {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN)}`,
    },
  });
  if (!response.ok) throw new Error('Error al obtener estadísticas');
  return response.json();
};

// ============================================================
// PUBLIC DOCUMENT SHARE LINKS API (sin autenticación)
// ============================================================

/**
 * Obtiene información pública de un share link (sin auth)
 */
export const getPublicDocumentShareLink = async (token: string): Promise<PublicDocumentShareLink> => {
  const response = await fetch(`${API_BASE_URL}/public/documents/${token}/`);
  if (response.status === 410) {
    const error = await response.json();
    throw new Error(error.error || 'Link no disponible');
  }
  if (!response.ok) throw new Error('Link no encontrado');
  return response.json();
};

/**
 * Sube un documento a través de un link público (sin auth)
 */
export const uploadPublicDocument = async (
  token: string,
  documentType: string,
  file: File
): Promise<{
  message: string;
  document: { id: number; type: string; type_label: string; filename: string };
  progress: number;
  is_complete: boolean;
  pending_documents: Array<{ type: string; label: string }>;
}> => {
  const formData = new FormData();
  formData.append('document_type', documentType);
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/public/documents/${token}/`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error al subir documento');
  }
  return response.json();
};


// Export types for use in components
export type { LoginCredentials, LoginResponse, ApiError };




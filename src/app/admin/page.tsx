'use client';

/**
 * ============================================================
 * ADMIN DASHBOARD - CONECTADO CON BACKEND REAL
 * ============================================================
 * Este componente reemplaza el admin/page.tsx existente
 * Consume datos reales del backend Django
 */

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient, type User, type AdminDashboardStats, type UserActivity } from '@/lib/api';
import { useModal } from "@/context/ModalContext";
import EmailManagement from '@/components/EmailManagement';
import BackupsView from '@/components/BackupsView';

export default function AdminDashboard() {
  const router = useRouter();
  const { showAlert, showSuccess, showError, showConfirm } = useModal();
  
  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'users' | 'clients' | 'profiles' | 'candidates' | 'settings' | 'logs' | 'backups' | 'monitoring'>('dashboard');  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Data State
  const [dashboardData, setDashboardData] = useState<AdminDashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Candidate State
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<any | null>(null);
  const [showCandidateModal, setShowCandidateModal] = useState(false);

  // Candidate Filter State
  const [candidateFilters, setCandidateFilters] = useState({
    search: '',
    status: 'all',
  });

  // Candidate Form State
  const [candidateForm, setCandidateForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    alternative_phone: '',
    current_position: '',
    current_company: '',
    years_experience: 0,
    desired_salary: 0,
    linkedin_url: '',
    notes: '',
  });

  // Client State
const [clients, setClients] = useState<any[]>([]);
const [selectedClient, setSelectedClient] = useState<any | null>(null);
const [showClientModal, setShowClientModal] = useState(false);

// Client Filter State
const [clientFilters, setClientFilters] = useState({
  search: '',
  status: 'all',
});

// Client Form State
const [clientForm, setClientForm] = useState({
  company_name: '',      // ← CAMBIAR de 'name'
  industry: '',
  size: '',
  website: '',
  address_street: '',    // ← CAMBIAR de 'address'
  address_city: '',      // ← CAMBIAR de 'city'
  address_state: '',     // ← CAMBIAR de 'state'
  address_country: 'México',  // ← CAMBIAR de 'country'
  address_zip: '',       // ← AGREGAR
  contact_phone: '',     // ← CAMBIAR de 'phone'
  contact_email: '',     // ← CAMBIAR de 'email'
  contact_name: '',      // ← AGREGAR
  contact_position: '',  // ← AGREGAR
  rfc: '',              // ← AGREGAR
  notes: '',
});

// Profile State
const [profiles, setProfiles] = useState<any[]>([]);
const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
const [showProfileModal, setShowProfileModal] = useState(false);

// Profile Filter State
const [profileFilters, setProfileFilters] = useState({
  search: '',
  status: 'all',
  priority: 'all',
});

// Profile Form State
const [profileForm, setProfileForm] = useState({
  client: 0,
  position_title: '',
  department: '',
  location: '',
  employment_type: 'full_time',
  salary_min: 0,
  salary_max: 0,
  status: 'draft',
  priority: 'medium',
  service_type: 'contingency',
  required_experience: 0,
  required_education: '',
  job_description: '',
  requirements: '',
  responsibilities: '',
  benefits: '',
  deadline_date: '',
  notes: '',
});
  
  // Modal State
  const [showUserModal, setShowUserModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  
  // Filter State
  const [userFilters, setUserFilters] = useState({
    search: '',
    role: 'all',
    status: 'all',
  });
  
  // Form State
  const [userForm, setUserForm] = useState({
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
    role: 'supervisor' as 'admin' | 'director' | 'supervisor',
    phone: '',
  });

  // ============================================================
  // LIFECYCLE - Initial Load
  // ============================================================
  
  useEffect(() => {
    // Verificar autenticación
    const token = localStorage.getItem('authToken');
    const userRole = localStorage.getItem('userRole');
    
    if (!token || userRole !== 'admin') {
      router.push('/auth');
      return;
    }
    
    // Cargar datos iniciales
    loadInitialData();
  }, []);

  useEffect(() => {
    // Cargar datos según la vista actual
    if (!initialLoad) {
      loadViewData();
    }
  }, [currentView]);

  // ============================================================
  // DATA LOADING FUNCTIONS
  // ============================================================
  
  const loadInitialData = async () => {
    try {
      setLoading(true);
      
      // Cargar dashboard y usuarios en paralelo
      const [dashData, usersData] = await Promise.all([
        apiClient.getAdminDashboard(),
        apiClient.getUsers()
      ]);
      
      setDashboardData(dashData);
      setUsers(usersData.results || usersData);
      
      setInitialLoad(false);
    } catch (error: any) {
      console.error('Error loading initial data:', error);
      
      if (error?.status === 401) {
        // Token inválido, redirigir al login
        localStorage.removeItem('authToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        router.push('/auth');
      } else {
        // Mostrar error pero permitir usar la interfaz
        showError(' al cargar datos del sistema. Algunos datos pueden no estar disponibles.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadViewData = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem('authToken');
      console.log('🔑 Token presente:', token ? 'SÍ' : 'NO');
      console.log('🔑 Token (primeros 20 chars):', token?.substring(0, 20) + '...');
      
      switch (currentView) {
        case 'dashboard':
          const dashData = await apiClient.getAdminDashboard();
          setDashboardData(dashData);
          break;
          
        case 'users':
          const usersData = await apiClient.getUsers(userFilters);
          setUsers(usersData.results || usersData);
          break;

        case 'candidates':
        try {
          const candidatesData: any = await apiClient.getCandidates(candidateFilters);
          setCandidates(candidatesData.results || candidatesData);
        } catch (error) {
          console.error('Error loading candidates:', error);
          setCandidates([]);
        }
        break;

        case 'clients':
        try {
          console.log('🔵 Cargando clientes...');
          const clientsData: any = await apiClient.getClients(clientFilters);
          console.log('🟢 Clientes recibidos:', clientsData);
          setClients(clientsData.results || clientsData);
          console.log('🟢 Clientes recibidos:', clientsData);
          console.log('📊 Primer cliente:', (clientsData.results || clientsData)[0]);
          setClients(clientsData.results || clientsData);
        } catch (error: any) {
          console.error('❌ Error loading clients:', error);
          setClients([]);
          
        }
        break;

        case 'profiles':
        try {
          console.log('🔵 Cargando perfiles...');
          const profilesData: any = await apiClient.getProfiles(profileFilters);
          console.log('🟢 Perfiles recibidos:', profilesData);
          console.log('📊 Primer perfil:', (profilesData.results || profilesData)[0]);
          setProfiles(profilesData.results || profilesData);
        } catch (error: any) {
          console.error('❌ Error loading profiles:', error);
          setProfiles([]);
        }
        break;
          
        // Agregar más casos según sea necesario
        default:
          break;
      }
    } catch (error) {
      console.error(`Error loading ${currentView} data:`, error);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    await loadViewData();
  };

  // ============================================================
  // USER MANAGEMENT FUNCTIONS
  // ============================================================
  
  const openUserModal = (mode: 'create' | 'edit' = 'create', user?: User) => {
    setModalMode(mode);
    
    if (mode === 'edit' && user) {
      setSelectedUser(user);
      setUserForm({
        email: user.email,
        password: '',
        password_confirm: '',
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        phone: user.phone || '',
      });
    } else {
      setSelectedUser(null);
      setUserForm({
        email: '',
        password: '',
        password_confirm: '',
        first_name: '',
        last_name: '',
        role: 'supervisor',
        phone: '',
      });
    }
    
    setShowUserModal(true);
  };

  const closeUserModal = () => {
    setShowUserModal(false);
    setSelectedUser(null);
    setUserForm({
      email: '',
      password: '',
      password_confirm: '',
      first_name: '',
      last_name: '',
      role: 'supervisor',
      phone: '',
    });
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      if (modalMode === 'create') {
        // Validar passwords
        if (userForm.password !== userForm.password_confirm) {
          showError('Las contraseñas no coinciden');
          return;
        }
        
        if (userForm.password.length < 8) {
          showError('La contraseña debe tener al menos 8 caracteres');
          return;
        }
        
        // Crear usuario
        await apiClient.createUser(userForm);
        showSuccess('Usuario creado exitosamente');
      } else {
        // Actualizar usuario
        const updateData: any = {
          email: userForm.email,
          first_name: userForm.first_name,
          last_name: userForm.last_name,
          role: userForm.role,
          phone: userForm.phone,
        };
        
        await apiClient.updateUser(selectedUser!.id, updateData);
        showSuccess('Usuario actualizado exitosamente');
      }
      
      closeUserModal();
      await refreshData();
      
    } catch (error: any) {
      console.error('Error saving user:', error);
      await showAlert(error?.details?.message || 'Error al guardar usuario');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (user: User) => {
    const confirmed = await showConfirm(`¿${user.is_active ? 'Desactivar' : 'Activar'} usuario ${user.full_name}?`);
    if (!confirmed) {
      return;
    }
    
    try {
      setLoading(true);
      await apiClient.toggleUserStatus(user.id, !user.is_active);
      await showSuccess(`Usuario ${user.is_active ? 'desactivado' : 'activado'} exitosamente`);
      await refreshData();
    } catch (error) {
      console.error('Error toggling user status:', error);
      showError(' al cambiar estatus del usuario');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (user: User) => {
    const confirmed = await showConfirm(`¿Eliminar usuario ${user.full_name}? Esta acción no se puede deshacer.`);
    if (!confirmed) {
      return;
    }
    
    try {
      setLoading(true);
      await apiClient.deleteUser(user.id);
      showSuccess('Usuario eliminado exitosamente');
      await refreshData();
    } catch (error) {
      console.error('Error deleting user:', error);
      showError(' al eliminar usuario');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // CANDIDATE MANAGEMENT FUNCTIONS
  // ============================================================

  const openCandidateModal = (mode: 'create' | 'edit' = 'create', candidate?: any) => {
    setModalMode(mode);
    
    if (mode === 'edit' && candidate) {
      setSelectedCandidate(candidate);
      setCandidateForm({
        first_name: candidate.first_name,
        last_name: candidate.last_name,
        email: candidate.email,
        phone: candidate.phone || '',
        alternative_phone: candidate.alternative_phone || '',
        current_position: candidate.current_position || '',
        current_company: candidate.current_company || '',
        years_experience: candidate.years_experience || 0,
        desired_salary: candidate.desired_salary || 0,
        linkedin_url: candidate.linkedin_url || '',
        notes: candidate.notes || '',
      });
    } else {
      setSelectedCandidate(null);
      setCandidateForm({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        alternative_phone: '',
        current_position: '',
        current_company: '',
        years_experience: 0,
        desired_salary: 0,
        linkedin_url: '',
        notes: '',
      });
    }
    
    setShowCandidateModal(true);
  };

  const closeCandidateModal = () => {
    setShowCandidateModal(false);
    setSelectedCandidate(null);
    setCandidateForm({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      alternative_phone: '',
      current_position: '',
      current_company: '',
      years_experience: 0,
      desired_salary: 0,
      linkedin_url: '',
      notes: '',
    });
  };

  const handleCandidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      if (modalMode === 'create') {
        await apiClient.createCandidate(candidateForm);
        showSuccess('Candidato creado exitosamente');
      } else {
        await apiClient.updateCandidate(selectedCandidate!.id, candidateForm);
        showSuccess('Candidato actualizado exitosamente');
      }
      
      closeCandidateModal();
      await refreshData();
      
    } catch (error: any) {
      console.error('Error saving candidate:', error);
      await showAlert(error?.details?.message || 'Error al guardar candidato');
    } finally {
      setLoading(false);
    }
  };

  const deleteCandidate = async (candidate: any) => {
    const confirmed = await showConfirm(`¿Eliminar candidato ${candidate.full_name}? Esta acción no se puede deshacer.`);
    if (!confirmed) {
      return;
    }
    
    try {
      setLoading(true);
      await apiClient.deleteCandidate(candidate.id);
      showSuccess('Candidato eliminado exitosamente');
      await refreshData();
    } catch (error) {
      console.error('Error deleting candidate:', error);
      showError(' al eliminar candidato');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar candidatos
  const filteredCandidates = candidates.filter(candidate => {
    const matchesSearch = 
      candidate.full_name?.toLowerCase().includes(candidateFilters.search.toLowerCase()) ||
      candidate.email?.toLowerCase().includes(candidateFilters.search.toLowerCase());
    
    const matchesStatus = candidateFilters.status === 'all' || candidate.status === candidateFilters.status;
    
    return matchesSearch && matchesStatus;
  });

  // ============================================================
  // CLIENT MANAGEMENT FUNCTIONS
  // ============================================================

  const openClientModal = (mode: 'create' | 'edit' = 'create', client?: any) => {
    setModalMode(mode);
    
    if (mode === 'edit' && client) {
      setSelectedClient(client);
      setClientForm({
        company_name: client.company_name || '',
        industry: client.industry || '',
        size: client.size || '',
        website: client.website || '',
        address_street: client.address_street || '',
        address_city: client.address_city || '',
        address_state: client.address_state || '',
        address_country: client.address_country || 'México',
        address_zip: client.address_zip || '',
        contact_phone: client.contact_phone || '',
        contact_email: client.contact_email || '',
        contact_name: client.contact_name || '',
        contact_position: client.contact_position || '',
        rfc: client.rfc || '',
        notes: client.notes || '',
      });
    } else {
      setSelectedClient(null);
      setClientForm({
        company_name: '',
        industry: '',
        size: '',
        website: '',
        address_street: '',
        address_city: '',
        address_state: '',
        address_country: 'México',
        address_zip: '',
        contact_phone: '',
        contact_email: '',
        contact_name: '',
        contact_position: '',
        rfc: '',
        notes: '',
      });
    }
    
    setShowClientModal(true);
  };

  const closeClientModal = () => {
    setShowClientModal(false);
    setSelectedClient(null);
    setClientForm({
      company_name: '',
      industry: '',
      size: '',
      website: '',
      address_street: '',
      address_city: '',
      address_state: '',
      address_country: 'México',
      address_zip: '',
      contact_phone: '',
      contact_email: '',
      contact_name: '',
      contact_position: '',
      rfc: '',
      notes: '',
    });
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      if (modalMode === 'create') {
        await apiClient.createClient(clientForm);
        showSuccess('Cliente creado exitosamente');
      } else {
        await apiClient.updateClient(selectedClient!.id, clientForm);
        showSuccess('Cliente actualizado exitosamente');
      }
      
      closeClientModal();
      await refreshData();
      
    } catch (error: any) {
      console.error('Error saving client:', error);
      await showAlert(error?.details?.message || 'Error al guardar cliente');
    } finally {
      setLoading(false);
    }
  };

  const deleteClient = async (client: any) => {
    const confirmed = await showConfirm(`¿Eliminar cliente ${client.company_name}? Esta acción no se puede deshacer.`);
    if (!confirmed) {
      return;
    }
    
    try {
      setLoading(true);
      await apiClient.deleteClient(client.id);
      showSuccess('Cliente eliminado exitosamente');
      await refreshData();
    } catch (error) {
      console.error('Error deleting client:', error);
      showError(' al eliminar cliente');
    } finally {
      setLoading(false);
    }
  };


  // Filtrar clientes
  const filteredClients = clients.filter(client => {
    // Si no hay búsqueda, o el campo coincide con la búsqueda
    const matchesSearch = 
      !clientFilters.search ||
      clientFilters.search.trim() === '' ||
      client.company_name?.toLowerCase().includes(clientFilters.search.toLowerCase()) ||
      client.contact_email?.toLowerCase().includes(clientFilters.search.toLowerCase());
    
      // Si el filtro es 'all', o coincide con el estado
    const matchesStatus = 
      clientFilters.status === 'all' ||
      (clientFilters.status === 'active' && client.is_active) ||
      (clientFilters.status === 'inactive' && !client.is_active);
    
    return matchesSearch && matchesStatus;
  });

  // ============================================================
  // PROFILE MANAGEMENT FUNCTIONS
  // ============================================================

  const openProfileModal = (mode: 'create' | 'edit' = 'create', profile?: any) => {
    setModalMode(mode);
    
    if (mode === 'edit' && profile) {
      setSelectedProfile(profile);
      setProfileForm({
        client: profile.client || 0,
        position_title: profile.position_title || '',
        department: profile.department || '',
        location: profile.location || '',
        employment_type: profile.employment_type || 'full_time',
        salary_min: profile.salary_min || 0,
        salary_max: profile.salary_max || 0,
        status: profile.status || 'draft',
        priority: profile.priority || 'medium',
        service_type: profile.service_type || 'contingency',
        required_experience: profile.required_experience || 0,
        required_education: profile.required_education || '',
        job_description: profile.job_description || '',
        requirements: profile.requirements || '',
        responsibilities: profile.responsibilities || '',
        benefits: profile.benefits || '',
        deadline_date: profile.deadline_date || '',
        notes: profile.notes || '',
      });
    } else {
      setSelectedProfile(null);
      setProfileForm({
        client: 0,
        position_title: '',
        department: '',
        location: '',
        employment_type: 'full_time',
        salary_min: 0,
        salary_max: 0,
        status: 'draft',
        priority: 'medium',
        service_type: 'contingency',
        required_experience: 0,
        required_education: '',
        job_description: '',
        requirements: '',
        responsibilities: '',
        benefits: '',
        deadline_date: '',
        notes: '',
      });
    }
    
    setShowProfileModal(true);
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
    setSelectedProfile(null);
    setProfileForm({
      client: 0,
      position_title: '',
      department: '',
      location: '',
      employment_type: 'full_time',
      salary_min: 0,
      salary_max: 0,
      status: 'draft',
      priority: 'medium',
      service_type: 'contingency',
      required_experience: 0,
      required_education: '',
      job_description: '',
      requirements: '',
      responsibilities: '',
      benefits: '',
      deadline_date: '',
      notes: '',
    });
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      if (modalMode === 'create') {
        await apiClient.createProfile(profileForm);
        showSuccess('Perfil creado exitosamente');
      } else {
        await apiClient.updateProfile(selectedProfile!.id, profileForm);
        showSuccess('Perfil actualizado exitosamente');
      }
      
      closeProfileModal();
      await refreshData();
      
    } catch (error: any) {
      console.error('Error saving profile:', error);
      await showAlert(error?.details?.message || 'Error al guardar perfil');
    } finally {
      setLoading(false);
    }
  };

  const deleteProfile = async (profile: any) => {
    const confirmed = await showConfirm(`¿Eliminar perfil "${profile.position_title}"? Esta acción no se puede deshacer.`);
    if (!confirmed) {
      return;
    }
    
    try {
      setLoading(true);
      await apiClient.deleteProfile(profile.id);
      showSuccess('Perfil eliminado exitosamente');
      await refreshData();
    } catch (error) {
      console.error('Error deleting profile:', error);
      showError(' al eliminar perfil');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar perfiles
  const filteredProfiles = profiles.filter(profile => {
    const matchesSearch = 
      !profileFilters.search ||
      profileFilters.search.trim() === '' ||
      profile.position_title?.toLowerCase().includes(profileFilters.search.toLowerCase()) ||
      profile.client_name?.toLowerCase().includes(profileFilters.search.toLowerCase());
    
    const matchesStatus = profileFilters.status === 'all' || profile.status === profileFilters.status;
    const matchesPriority = profileFilters.priority === 'all' || profile.priority === profileFilters.priority;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  // ============================================================
  // UTILITY FUNCTIONS
  // ============================================================
  
  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    router.push('/auth');
  };

  const getNavItemClass = (view: typeof currentView) => {
    return currentView === view
      ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
      : 'text-gray-700 hover:bg-gray-50';
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-orange-100 text-orange-800';
      case 'director':
        return 'bg-blue-100 text-blue-800';
      case 'supervisor':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCompanySizeBadgeClass = (size: string) => {
  switch (size) {
    case 'small':
      return 'bg-blue-100 text-blue-800';
    case 'medium':
      return 'bg-purple-100 text-purple-800';
    case 'large':
      return 'bg-orange-100 text-orange-800';
    case 'enterprise':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getCompanySizeDisplay = (size: string) => {
  switch (size) {
    case 'small': return 'Pequeña (1-50)';
    case 'medium': return 'Mediana (51-250)';
    case 'large': return 'Grande (251-1000)';
    case 'enterprise': return 'Empresa (1000+)';
    default: return size;
  }
};

const getProfileStatusBadgeClass = (status: string) => {
  switch (status) {
    case 'draft':
      return 'bg-gray-100 text-gray-800';
    case 'open':
      return 'bg-green-100 text-green-800';
    case 'in_progress':
      return 'bg-blue-100 text-blue-800';
    case 'on_hold':
      return 'bg-yellow-100 text-yellow-800';
    case 'filled':
      return 'bg-purple-100 text-purple-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getProfileStatusDisplay = (status: string) => {
  switch (status) {
    case 'draft': return 'Borrador';
    case 'open': return 'Abierto';
    case 'in_progress': return 'En Proceso';
    case 'on_hold': return 'En Espera';
    case 'filled': return 'Cubierto';
    case 'cancelled': return 'Cancelado';
    default: return status;
  }
};

const getPriorityBadgeClass = (priority: string) => {
  switch (priority) {
    case 'low':
      return 'bg-blue-100 text-blue-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'high':
      return 'bg-orange-100 text-orange-800';
    case 'urgent':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getPriorityDisplay = (priority: string) => {
  switch (priority) {
    case 'low': return 'Baja';
    case 'medium': return 'Media';
    case 'high': return 'Alta';
    case 'urgent': return 'Urgente';
    default: return priority;
  }
};

  const getStatusBadgeClass = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800';
  };

  // Filtrar usuarios
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.full_name.toLowerCase().includes(userFilters.search.toLowerCase()) ||
      user.email.toLowerCase().includes(userFilters.search.toLowerCase());
    
    const matchesRole = userFilters.role === 'all' || user.role === userFilters.role;
    const matchesStatus = 
      userFilters.status === 'all' ||
      (userFilters.status === 'active' && user.is_active) ||
      (userFilters.status === 'inactive' && !user.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // ============================================================
  // LOADING STATE
  // ============================================================
  
  if (initialLoad && loading) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-700 font-semibold">Cargando Panel de Administración...</p>
          <p className="text-gray-500 mt-2">Conectando con el backend</p>
        </div>
      </div>
    );
  }

  

  return (
    <>
      {/* Font Awesome CSS */}
      <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" />
      
      <div className="min-h-screen bg-gray-50 font-sans antialiased">

  

  // ============================================================
  // RENDER -
  // ============================================================

  {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo y Menú */}
              <div className="flex items-center">
                <button 
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="lg:hidden mr-4 text-gray-600 hover:text-gray-900"
                >
                  <i className="fas fa-bars text-xl"></i>
                </button>
                
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-600 to-orange-700 rounded-lg flex items-center justify-center">
                    <i className="fas fa-tools text-white text-lg"></i>
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">Sistema de Reclutamiento</h1>
                    <p className="text-xs text-gray-500">Panel de Administración</p>
                  </div>
                </div>
              </div>

              {/* User Menu */}
              <div className="flex items-center space-x-4">
                <button className="text-gray-500 hover:text-gray-700 relative">
                  <i className="fas fa-bell text-xl"></i>
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {dashboardData?.recent_activities?.length || 0}
                  </span>
                </button>
                
                <div className="flex items-center space-x-3 border-l pl-4">
                  <div className="w-10 h-10 bg-gradient-to-r from-orange-600 to-orange-700 rounded-full flex items-center justify-center">
                    <i className="fas fa-user-shield text-white"></i>
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-semibold text-gray-900">Administrador</p>
                    <p className="text-xs text-gray-500">Admin del Sistema</p>
                  </div>
                </div>
                
                <button 
                  onClick={logout}
                  className="text-gray-500 hover:text-red-600 transition-colors"
                  title="Cerrar Sesión"
                >
                  <i className="fas fa-sign-out-alt text-xl"></i>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Sidebar */}
        <aside className={`fixed top-16 left-0 bottom-0 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out z-20 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}>
          {/* Sidebar Header */}
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 shrink-0 bg-gradient-to-br from-orange-600 to-orange-800 rounded-lg flex items-center justify-center">
                <i className="fas fa-tools text-white text-sm"></i>
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-semibold text-gray-900 truncate">Administración</h2>
                <p className="text-xs text-gray-500 truncate">Panel de Control</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-4">
            <ul className="space-y-1">
              <li>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all w-full text-left ${getNavItemClass('dashboard')}`}
                >
                  <i className="fas fa-chart-pie mr-3 w-5"></i>
                  Dashboard
                </button>
              </li>
              
              {/* Gestión */}
              <li className="pt-4 pb-2">
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Gestión</p>
              </li>
              
              <li>
                <button
                  onClick={() => setCurrentView('users')}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all w-full text-left ${getNavItemClass('users')}`}
                >
                  <i className="fas fa-users mr-3 w-5"></i>
                  Usuarios
                </button>
              </li>
              
              <li>
                <button
                  onClick={() => setCurrentView('clients')}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all w-full text-left ${getNavItemClass('clients')}`}
                >
                  <i className="fas fa-building mr-3 w-5"></i>
                  Clientes
                </button>
              </li>
              
              <li>
                <button
                  onClick={() => setCurrentView('profiles')}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all w-full text-left ${getNavItemClass('profiles')}`}
                >
                  <i className="fas fa-briefcase mr-3 w-5"></i>
                  Perfiles
                </button>
              </li>
              
              <li>
                <button
                  onClick={() => setCurrentView('candidates')}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all w-full text-left ${getNavItemClass('candidates')}`}
                >
                  <i className="fas fa-user-graduate mr-3 w-5"></i>
                  Candidatos
                </button>
              </li>
              
              {/* Sistema */}
              <li className="pt-4 pb-2">
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Sistema</p>
              </li>
              
              {/* Sistema */}
              <li className="pt-4 pb-2">
                <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Sistema</p>
              </li>
              
              <li>
                <button
                  onClick={() => setCurrentView('settings')}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all w-full text-left ${getNavItemClass('settings')}`}
                >
                  <i className="fas fa-cog mr-3 w-5"></i>
                  Configuración
                </button>
              </li>
              
              <li>
                <button
                  onClick={() => setCurrentView('logs')}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all w-full text-left ${getNavItemClass('logs')}`}
                >
                  <i className="fas fa-file-alt mr-3 w-5"></i>
                  Logs del Sistema
                </button>
              </li>
              
              <li>
                <button
                  onClick={() => setCurrentView('backups')}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all w-full text-left ${getNavItemClass('backups')}`}
                >
                  <i className="fas fa-database mr-3 w-5"></i>
                  Backups
                </button>
              </li>
              
              <li>
                <button
                  onClick={() => setCurrentView('monitoring')}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all w-full text-left ${getNavItemClass('monitoring')}`}
                >
                  <i className="fas fa-server mr-3 w-5"></i>
                  Monitoreo
                </button>
              </li>
            </ul>
          </nav>

          {/* System Status */}
          <div className="p-4 m-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-green-700">Estado del Sistema</span>
              <span className="flex h-2 w-2">
                <span className="animate-ping absolute h-2 w-2 rounded-full bg-green-400 opacity-75"></span>
                <span className="relative rounded-full h-2 w-2 bg-green-500"></span>
              </span>
            </div>
            <p className="text-xs text-gray-600">Backend Conectado ✓</p>
          </div>
        </aside>




        {/* Main Content */}
        <main 
          className={`flex-1 mt-16 p-6 transition-all ${sidebarOpen ? 'ml-64' : 'ml-0 lg:ml-64'}`}
          onClick={() => setSidebarOpen(false)}
        >
          
          {/* ============================================================ */}
          {/* DASHBOARD VIEW */}
          {/* ============================================================ */}
          {currentView === 'dashboard' && (
            <div className="space-y-6">
              {/* Page Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Panel de Administración</h2>
                  <p className="text-gray-600 mt-1">Monitoreo y gestión del sistema</p>
                </div>
                <div className="mt-4 sm:mt-0 flex space-x-3">
                  <button 
                    onClick={refreshData}
                    disabled={loading}
                    className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <i className={`fas fa-sync mr-2 ${loading ? 'animate-spin' : ''}`}></i>
                    Actualizar
                  </button>
                </div>
              </div>

              {/* KPI Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Total Users */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Usuarios</p>
                      <p className="text-3xl font-bold text-gray-900">{dashboardData?.users.total || 0}</p>
                      <div className="flex items-center mt-2 space-x-2">
                        <span className="text-xs text-green-600 flex items-center">
                          <i className="fas fa-check-circle mr-1"></i>
                          {dashboardData?.users.active || 0} activos
                        </span>
                      </div>
                    </div>
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                      <i className="fas fa-users text-white text-2xl"></i>
                    </div>
                  </div>
                </div>

                {/* Total Clients */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Clientes</p>
                      <p className="text-3xl font-bold text-gray-900">{dashboardData?.clients.total || 0}</p>
                      <div className="flex items-center mt-2 space-x-2">
                        <span className="text-xs text-green-600 flex items-center">
                          <i className="fas fa-check-circle mr-1"></i>
                          {dashboardData?.clients.active || 0} activos
                        </span>
                      </div>
                    </div>
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                      <i className="fas fa-building text-white text-2xl"></i>
                    </div>
                  </div>
                </div>

                {/* Total Profiles */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Perfiles</p>
                      <p className="text-3xl font-bold text-gray-900">{dashboardData?.profiles.total || 0}</p>
                      <div className="flex items-center mt-2 space-x-2">
                        <span className="text-xs text-blue-600 flex items-center">
                          <i className="fas fa-briefcase mr-1"></i>
                          Posiciones abiertas
                        </span>
                      </div>
                    </div>
                    <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center">
                      <i className="fas fa-briefcase text-white text-2xl"></i>
                    </div>
                  </div>
                </div>

                {/* Total Candidates */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Total Candidatos</p>
                      <p className="text-3xl font-bold text-gray-900">{dashboardData?.candidates.total || 0}</p>
                      <div className="flex items-center mt-2 space-x-2">
                        <span className="text-xs text-orange-600 flex items-center">
                          <i className="fas fa-user-graduate mr-1"></i>
                          En proceso
                        </span>
                      </div>
                    </div>
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                      <i className="fas fa-user-graduate text-white text-2xl"></i>
                    </div>
                  </div>
                </div>
              </div>

              {/* Users by Role */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Usuarios por Rol</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                          <i className="fas fa-user-shield text-orange-600"></i>
                        </div>
                        <span className="font-medium text-gray-900">Administradores</span>
                      </div>
                      <span className="text-2xl font-bold text-orange-600">
                        {dashboardData?.users.by_role.admin || 0}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <i className="fas fa-user-tie text-blue-600"></i>
                        </div>
                        <span className="font-medium text-gray-900">Directores</span>
                      </div>
                      <span className="text-2xl font-bold text-blue-600">
                        {dashboardData?.users.by_role.director || 0}
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          <i className="fas fa-users text-green-600"></i>
                        </div>
                        <span className="font-medium text-gray-900">Supervisores</span>
                      </div>
                      <span className="text-2xl font-bold text-green-600">
                        {dashboardData?.users.by_role.supervisor || 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Activities */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Actividad Reciente</h3>
                  <div className="space-y-4 max-h-80 overflow-y-auto">
                    {dashboardData?.recent_activities && dashboardData.recent_activities.length > 0 ? (
                      dashboardData.recent_activities.slice(0, 10).map((activity) => (
                        <div key={activity.id} className="flex items-start space-x-3 pb-3 border-b border-gray-100 last:border-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <i className="fas fa-history text-blue-600 text-sm"></i>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-900 font-medium">{activity.user_name}</p>
                            <p className="text-xs text-gray-600">{activity.description}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(activity.timestamp).toLocaleString('es-MX')}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-8">
                        No hay actividad reciente
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentView === 'users' && (
            <div className="space-y-6">
              {/* Page Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h2>
                  <p className="text-gray-600 mt-1">Administra usuarios y sus permisos</p>
                </div>
                <div className="mt-4 sm:mt-0">
                  <button 
                    onClick={() => openUserModal('create')}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                  >
                    <i className="fas fa-user-plus mr-2"></i>
                    Crear Usuario
                  </button>
                </div>
              </div>

              {/* Filters */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <input 
                      type="text" 
                      value={userFilters.search}
                      onChange={(e) => setUserFilters({...userFilters, search: e.target.value})}
                      placeholder="Buscar por nombre o email..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <select
                      value={userFilters.role}
                      onChange={(e) => setUserFilters({...userFilters, role: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">Todos los roles</option>
                      <option value="admin">Administrador</option>
                      <option value="director">Director</option>
                      <option value="supervisor">Supervisor</option>
                    </select>
                  </div>
                  
                  <div>
                    <select
                      value={userFilters.status}
                      onChange={(e) => setUserFilters({...userFilters, status: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="all">Todos los estatus</option>
                      <option value="active">Activos</option>
                      <option value="inactive">Inactivos</option>
                    </select>
                  </div>
                  
                  <div>
                    <button
                      onClick={refreshData}
                      disabled={loading}
                      className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
                    >
                      <i className={`fas fa-sync mr-2 ${loading ? 'animate-spin' : ''}`}></i>
                      Actualizar
                    </button>
                  </div>
                </div>
              </div>

              {/* Users Table */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Usuario
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Email / Teléfono
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Rol
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estatus
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Registro
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loading ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center">
                            <div className="flex justify-center items-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                              <span className="ml-3 text-gray-600">Cargando usuarios...</span>
                            </div>
                          </td>
                        </tr>
                      ) : filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                            No se encontraron usuarios con los filtros aplicados
                          </td>
                        </tr>
                      ) : (
                        filteredUsers.map((user) => (
                          <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                                    {user.first_name[0]}{user.last_name[0]}
                                  </div>
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {user.full_name}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    ID: {user.id}
                                  </div>
                                </div>
                              </div>
                            </td>
                            
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm text-gray-900">{user.email}</div>
                              {user.phone && (
                                <div className="text-xs text-gray-500">{user.phone}</div>
                              )}
                            </td>
                            
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeClass(user.role)}`}>
                                {user.role_display}
                              </span>
                            </td>
                            
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(user.is_active)}`}>
                                {user.is_active ? 'Activo' : 'Inactivo'}
                              </span>
                            </td>
                            
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(user.created_at).toLocaleDateString('es-MX')}
                            </td>
                            
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => openUserModal('edit', user)}
                                  className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Editar"
                                >
                                  <i className="fas fa-edit"></i>
                                </button>
                                
                                <button
                                  onClick={() => toggleUserStatus(user)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    user.is_active 
                                      ? 'text-orange-600 hover:text-orange-900 hover:bg-orange-50'
                                      : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                                  }`}
                                  title={user.is_active ? 'Desactivar' : 'Activar'}
                                >
                                  <i className={`fas fa-${user.is_active ? 'user-slash' : 'user-check'}`}></i>
                                </button>
                                
                                <button
                                  onClick={() => deleteUser(user)}
                                  className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Eliminar"
                                >
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Pagination Info */}
                <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
                  <div className="text-sm text-gray-700">
                    Mostrando <span className="font-medium">{filteredUsers.length}</span> de{' '}
                    <span className="font-medium">{users.length}</span> usuarios
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* OTHER VIEWS - Placeholder */}
          {/* ============================================================ */}
          {currentView === 'clients' && (
          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Gestión de Clientes</h2>
                <p className="text-gray-600 mt-1">Administra empresas y clientes del sistema</p>
              </div>
              <div className="mt-4 sm:mt-0">
                <button 
                  onClick={() => openClientModal('create')}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 shadow-sm"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Agregar Cliente
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <input 
                    type="text" 
                    value={clientFilters.search}
                    onChange={(e) => setClientFilters({...clientFilters, search: e.target.value})}
                    placeholder="Buscar por nombre o email..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <select
                    value={clientFilters.status}
                    onChange={(e) => setClientFilters({...clientFilters, status: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="all">Todos los estatus</option>
                    <option value="active">Activos</option>
                    <option value="inactive">Inactivos</option>
                  </select>
                </div>
                
                <div>
                  <button
                    onClick={refreshData}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
                  >
                    <i className={`fas fa-sync mr-2 ${loading ? 'animate-spin' : ''}`}></i>
                    Actualizar
                  </button>
                </div>
              </div>
            </div>

            {/* Clients Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contacto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Industria
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tamaño
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estatus
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Registro
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <div className="flex justify-center items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                            <span className="ml-3 text-gray-600">Cargando clientes...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredClients.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          {clientFilters.search || clientFilters.status !== 'all' 
                            ? 'No se encontraron clientes con los filtros aplicados'
                            : 'No hay clientes registrados. Agrega el primero usando el botón "Agregar Cliente"'
                          }
                        </td>
                      </tr>
                    ) : (
                      filteredClients.map((client) => (
                        <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                                  {client.company_name?.[0]?.toUpperCase() || 'C'}
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {client.company_name || 'Sin nombre'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              {client.contact_email ? (
                                <div className="text-sm text-gray-900 flex items-center">
                                  <i className="fas fa-envelope text-gray-400 mr-2 text-xs"></i>
                                  {client.contact_email}
                                </div>
                              ) : null}
                              {client.contact_phone ? (
                                <div className="text-sm text-gray-600 flex items-center">
                                  <i className="fas fa-phone text-gray-400 mr-2 text-xs"></i>
                                  {client.contact_phone}
                                </div>
                              ) : null}
                              {!client.contact_email && !client.contact_phone ? (
                                <span className="text-sm text-gray-400 italic">Sin contacto</span>
                              ) : null}
                            </div>
                          </td>
                                                    
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {client.industry || 'N/A'}
                            </div>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap">
                            {client.size ? (
                              <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getCompanySizeBadgeClass(client.size)}`}>
                                {getCompanySizeDisplay(client.size)}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">N/A</span>
                            )}
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeClass(client.is_active)}`}>
                              {client.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {client.created_at ? new Date(client.created_at).toLocaleDateString('es-MX') : 'N/A'}
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => openClientModal('edit', client)}
                                className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              
                              <button
                                onClick={() => deleteClient(client)}
                                className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Info */}
              <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{filteredClients.length}</span> de{' '}
                  <span className="font-medium">{clients.length}</span> clientes
                </div>
              </div>
            </div>
          </div>
        )}

          {currentView === 'profiles' && (
          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Gestión de Perfiles</h2>
                <p className="text-gray-600 mt-1">Administra posiciones abiertas y requisiciones</p>
              </div>
              <div className="mt-4 sm:mt-0">
                <button 
                  onClick={() => openProfileModal('create')}
                  className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                >
                  <i className="fas fa-plus mr-2"></i>
                  Nuevo Perfil
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <input 
                    type="text" 
                    value={profileFilters.search}
                    onChange={(e) => setProfileFilters({...profileFilters, search: e.target.value})}
                    placeholder="Buscar posición o cliente..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <select
                    value={profileFilters.status}
                    onChange={(e) => setProfileFilters({...profileFilters, status: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="all">Todos los estatus</option>
                    <option value="draft">Borrador</option>
                    <option value="open">Abierto</option>
                    <option value="in_progress">En Proceso</option>
                    <option value="on_hold">En Espera</option>
                    <option value="filled">Cubierto</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>
                
                <div>
                  <select
                    value={profileFilters.priority}
                    onChange={(e) => setProfileFilters({...profileFilters, priority: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="all">Todas las prioridades</option>
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
                
                <div>
                  <button
                    onClick={refreshData}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
                  >
                    <i className={`fas fa-sync mr-2 ${loading ? 'animate-spin' : ''}`}></i>
                    Actualizar
                  </button>
                </div>
              </div>
            </div>

            {/* Profiles Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Posición
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Ubicación
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prioridad
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estatus
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Creado
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <div className="flex justify-center items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            <span className="ml-3 text-gray-600">Cargando perfiles...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredProfiles.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          {profileFilters.search || profileFilters.status !== 'all' || profileFilters.priority !== 'all'
                            ? 'No se encontraron perfiles con los filtros aplicados'
                            : 'No hay perfiles registrados. Crea el primero usando el botón "Nuevo Perfil"'
                          }
                        </td>
                      </tr>
                    ) : (
                      filteredProfiles.map((profile) => (
                        <tr key={profile.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                                  <i className="fas fa-briefcase"></i>
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {profile.position_title || 'Sin título'}
                                </div>
                                {profile.department && (
                                  <div className="text-xs text-gray-500">
                                    {profile.department}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {profile.client_name || 'N/A'}
                            </div>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {profile.location || 'N/A'}
                            </div>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getPriorityBadgeClass(profile.priority)}`}>
                              {getPriorityDisplay(profile.priority)}
                            </span>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getProfileStatusBadgeClass(profile.status)}`}>
                              {getProfileStatusDisplay(profile.status)}
                            </span>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {profile.created_at ? new Date(profile.created_at).toLocaleDateString('es-MX') : 'N/A'}
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => openProfileModal('edit', profile)}
                                className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              
                              <button
                                onClick={() => deleteProfile(profile)}
                                className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Info */}
              <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{filteredProfiles.length}</span> de{' '}
                  <span className="font-medium">{profiles.length}</span> perfiles
                </div>
              </div>
            </div>
          </div>
        )}

          {currentView === 'candidates' && (
          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Gestión de Candidatos</h2>
                <p className="text-gray-600 mt-1">Administra la base de datos de candidatos</p>
              </div>
              <div className="mt-4 sm:mt-0">
                <button 
                  onClick={() => openCandidateModal('create')}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 shadow-sm"
                >
                  <i className="fas fa-user-plus mr-2"></i>
                  Agregar Candidato
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <input 
                    type="text" 
                    value={candidateFilters.search}
                    onChange={(e) => setCandidateFilters({...candidateFilters, search: e.target.value})}
                    placeholder="Buscar por nombre o email..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                
                <div>
                  <select
                    value={candidateFilters.status}
                    onChange={(e) => setCandidateFilters({...candidateFilters, status: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="all">Todos los estatus</option>
                    <option value="new">Nuevo</option>
                    <option value="screening">En Revisión</option>
                    <option value="qualified">Calificado</option>
                    <option value="interview">En Entrevista</option>
                    <option value="offer">Oferta</option>
                    <option value="hired">Contratado</option>
                    <option value="rejected">Rechazado</option>
                  </select>
                </div>
                
                <div>
                  <button
                    onClick={refreshData}
                    disabled={loading}
                    className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50"
                  >
                    <i className={`fas fa-sync mr-2 ${loading ? 'animate-spin' : ''}`}></i>
                    Actualizar
                  </button>
                </div>
              </div>
            </div>

            {/* Candidates Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Candidato
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Contacto
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Posición Actual
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Experiencia
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Registro
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center">
                          <div className="flex justify-center items-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
                            <span className="ml-3 text-gray-600">Cargando candidatos...</span>
                          </div>
                        </td>
                      </tr>
                    ) : filteredCandidates.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          {candidateFilters.search || candidateFilters.status !== 'all' 
                            ? 'No se encontraron candidatos con los filtros aplicados'
                            : 'No hay candidatos registrados. Agrega el primero usando el botón "Agregar Candidato"'
                          }
                        </td>
                      </tr>
                    ) : (
                      filteredCandidates.map((candidate) => (
                        <tr key={candidate.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10">
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white font-semibold">
                                  {candidate.first_name?.[0]}{candidate.last_name?.[0]}
                                </div>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">
                                  {candidate.full_name || `${candidate.first_name} ${candidate.last_name}`}
                                </div>
                                <div className="text-xs text-gray-500">
                                  ID: {candidate.id}
                                </div>
                              </div>
                            </div>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{candidate.email}</div>
                            {candidate.phone && (
                              <div className="text-xs text-gray-500">{candidate.phone}</div>
                            )}
                          </td>
                          
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              {candidate.current_position || 'N/A'}
                            </div>
                            {candidate.current_company && (
                              <div className="text-xs text-gray-500">{candidate.current_company}</div>
                            )}
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {candidate.years_experience ? `${candidate.years_experience} años` : 'N/A'}
                            </div>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              candidate.status === 'new' ? 'bg-blue-100 text-blue-800' :
                              candidate.status === 'qualified' ? 'bg-green-100 text-green-800' :
                              candidate.status === 'interview' ? 'bg-purple-100 text-purple-800' :
                              candidate.status === 'hired' ? 'bg-emerald-100 text-emerald-800' :
                              candidate.status === 'rejected' ? 'bg-red-100 text-red-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {({new: 'Nuevo', screening: 'En Revisión', qualified: 'Calificado', interview: 'En Entrevista', offer: 'Oferta Extendida', hired: 'Contratado', rejected: 'Rechazado', withdrawn: 'Retirado'} as Record<string, string>)[candidate.status] || candidate.status}
                            </span>
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {candidate.created_at ? new Date(candidate.created_at).toLocaleDateString('es-MX') : 'N/A'}
                          </td>
                          
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => openCandidateModal('edit', candidate)}
                                className="text-blue-600 hover:text-blue-900 p-2 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <i className="fas fa-edit"></i>
                              </button>
                              
                              <button
                                onClick={() => deleteCandidate(candidate)}
                                className="text-red-600 hover:text-red-900 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination Info */}
              <div className="bg-gray-50 px-6 py-3 flex items-center justify-between border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">{filteredCandidates.length}</span> de{' '}
                  <span className="font-medium">{candidates.length}</span> candidatos
                </div>
              </div>
            </div>
          </div>
        )}

          {currentView === 'settings' && (
            <div className="text-center py-12">
              <i className="fas fa-cog text-6xl text-gray-300 mb-4"></i>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Configuración del Sistema</h3>
              <p className="text-gray-500">Próximamente disponible</p>
            </div>
          )}

          {currentView === 'logs' && (
          <div className="text-center py-12">
            <i className="fas fa-file-alt text-6xl text-gray-300 mb-4"></i>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Logs del Sistema</h3>
            <p className="text-gray-500">Próximamente disponible</p>
          </div>
        )}

        {currentView === 'backups' && (
          <BackupsView />
        )}

        {currentView === 'monitoring' && (
          <div className="text-center py-12">
            <i className="fas fa-server text-6xl text-gray-300 mb-4"></i>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Monitoreo del Sistema</h3>
            <p className="text-gray-500">Próximamente disponible</p>
          </div>
        )}
        </main>

        {/* ============================================================ */}
        {/* USER MODAL */}
        {/* ============================================================ */}
        {showUserModal && (
          <div className="fixed top-16 left-0 right-0 bottom-0  flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
            <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex items-center justify-between rounded-t-xl">
                <h3 className="text-xl font-semibold text-white flex items-center">
                  <i className={`fas fa-${modalMode === 'create' ? 'user-plus' : 'user-edit'} mr-3`}></i>
                  {modalMode === 'create' ? 'Crear Nuevo Usuario' : 'Editar Usuario'}
                </h3>
                <button 
                  onClick={closeUserModal}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <i className="fas fa-times text-2xl"></i>
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleUserSubmit} className="p-6">
                <div className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={userForm.email}
                      onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="usuario@ejemplo.com"
                    />
                  </div>

                  {/* Nombres */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre(s) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={userForm.first_name}
                        onChange={(e) => setUserForm({...userForm, first_name: e.target.value})}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Juan"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Apellido(s) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={userForm.last_name}
                        onChange={(e) => setUserForm({...userForm, last_name: e.target.value})}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Pérez"
                      />
                    </div>
                  </div>

                  {/* Rol */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rol <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={userForm.role}
                      onChange={(e) => setUserForm({...userForm, role: e.target.value as any})}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="supervisor">Supervisor</option>
                      <option value="director">Director</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>

                  {/* Teléfono */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={userForm.phone}
                      onChange={(e) => setUserForm({...userForm, phone: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="+52 123 456 7890"
                    />
                  </div>

                  {/* Contraseña (solo al crear) */}
                  {modalMode === 'create' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contraseña <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          value={userForm.password}
                          onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                          required
                          minLength={8}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Mínimo 8 caracteres"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confirmar Contraseña <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="password"
                          value={userForm.password_confirm}
                          onChange={(e) => setUserForm({...userForm, password_confirm: e.target.value})}
                          required
                          minLength={8}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Confirma la contraseña"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                  <button
                    type="button"
                    onClick={closeUserModal}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save mr-2"></i>
                        {modalMode === 'create' ? 'Crear Usuario' : 'Guardar Cambios'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* ============================================================ */}
        {/* CANDIDATE MODAL */}
        {/* ============================================================ */}
        {showCandidateModal && (
          <div className="fixed top-16 left-0 right-0 bottom-0  flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-green-600 to-green-700 px-6 py-4 flex items-center justify-between rounded-t-xl">
                <h3 className="text-xl font-semibold text-white flex items-center">
                  <i className={`fas fa-${modalMode === 'create' ? 'user-plus' : 'user-edit'} mr-3`}></i>
                  {modalMode === 'create' ? 'Agregar Nuevo Candidato' : 'Editar Candidato'}
                </h3>
                <button 
                  onClick={closeCandidateModal}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <i className="fas fa-times text-2xl"></i>
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleCandidateSubmit} className="p-6">
                <div className="space-y-4">
                  {/* Nombres */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre(s) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={candidateForm.first_name}
                        onChange={(e) => setCandidateForm({...candidateForm, first_name: e.target.value})}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Juan"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Apellido(s) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={candidateForm.last_name}
                        onChange={(e) => setCandidateForm({...candidateForm, last_name: e.target.value})}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Pérez"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={candidateForm.email}
                      onChange={(e) => setCandidateForm({...candidateForm, email: e.target.value})}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="candidato@ejemplo.com"
                    />
                  </div>

                  {/* Teléfonos */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Teléfono Principal
                      </label>
                      <input
                        type="tel"
                        value={candidateForm.phone}
                        onChange={(e) => setCandidateForm({...candidateForm, phone: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="+52 123 456 7890"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Teléfono Alternativo
                      </label>
                      <input
                        type="tel"
                        value={candidateForm.alternative_phone}
                        onChange={(e) => setCandidateForm({...candidateForm, alternative_phone: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="+52 123 456 7890"
                      />
                    </div>
                  </div>

                  {/* Posición y Empresa Actual */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Posición Actual
                      </label>
                      <input
                        type="text"
                        value={candidateForm.current_position}
                        onChange={(e) => setCandidateForm({...candidateForm, current_position: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Desarrollador Senior"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Empresa Actual
                      </label>
                      <input
                        type="text"
                        value={candidateForm.current_company}
                        onChange={(e) => setCandidateForm({...candidateForm, current_company: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="TechCorp"
                      />
                    </div>
                  </div>

                  {/* Experiencia y Salario */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Años de Experiencia
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={candidateForm.years_experience}
                        onChange={(e) => setCandidateForm({...candidateForm, years_experience: parseInt(e.target.value) || 0})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="5"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Salario Deseado (MXN)
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={candidateForm.desired_salary}
                        onChange={(e) => setCandidateForm({...candidateForm, desired_salary: parseInt(e.target.value) || 0})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="50000"
                      />
                    </div>
                  </div>

                  {/* LinkedIn */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      LinkedIn URL
                    </label>
                    <input
                      type="url"
                      value={candidateForm.linkedin_url}
                      onChange={(e) => setCandidateForm({...candidateForm, linkedin_url: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="https://linkedin.com/in/usuario"
                    />
                  </div>

                  {/* Notas */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notas Internas
                    </label>
                    <textarea
                      value={candidateForm.notes}
                      onChange={(e) => setCandidateForm({...candidateForm, notes: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Observaciones sobre el candidato..."
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                  <button
                    type="button"
                    onClick={closeCandidateModal}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save mr-2"></i>
                        {modalMode === 'create' ? 'Crear Candidato' : 'Guardar Cambios'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* ============================================================ */}
        {/* CLIENT MODAL */}
        {/* ============================================================ */}
        {showClientModal && (
          <div className="fixed top-16 left-0 right-0 bottom-0  flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
            <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex items-center justify-between rounded-t-xl">
                <h3 className="text-xl font-semibold text-white flex items-center">
                  <i className={`fas fa-${modalMode === 'create' ? 'plus' : 'edit'} mr-3`}></i>
                  {modalMode === 'create' ? 'Agregar Nuevo Cliente' : 'Editar Cliente'}
                </h3>
                <button 
                  onClick={closeClientModal}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <i className="fas fa-times text-2xl"></i>
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleClientSubmit} className="p-6">
                <div className="space-y-4">
                  {/* Nombre */}
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre de la Empresa <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={clientForm.company_name}
                    onChange={(e) => setClientForm({...clientForm, company_name: e.target.value})}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="TechCorp S.A. de C.V."
                  />
                </div>

                  {/* Industria y Tamaño */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Industria
                      </label>
                      <input
                        type="text"
                        value={clientForm.industry}
                        onChange={(e) => setClientForm({...clientForm, industry: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Tecnología"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tamaño de la Empresa
                      </label>
                      <select
                        value={clientForm.size}
                        onChange={(e) => setClientForm({...clientForm, size: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="small">Pequeña (1-50 empleados)</option>
                        <option value="medium">Mediana (51-250 empleados)</option>
                        <option value="large">Grande (251-1000 empleados)</option>
                        <option value="enterprise">Empresa (1000+ empleados)</option>
                      </select>
                    </div>
                  </div>

                  {/* Email y Teléfono */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={clientForm.contact_email}
                        onChange={(e) => setClientForm({...clientForm, contact_email: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="contacto@empresa.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={clientForm.contact_phone}
                        onChange={(e) => setClientForm({...clientForm, contact_phone: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="+52 123 456 7890"
                      />
                    </div>
                  </div>

                  {/* Website */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sitio Web
                    </label>
                    <input
                      type="url"
                      value={clientForm.website}
                      onChange={(e) => setClientForm({...clientForm, website: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="https://www.empresa.com"
                    />
                  </div>

                  {/* Dirección */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dirección
                    </label>
                    <input
                      type="text"
                     value={clientForm.address_street}
                      onChange={(e) => setClientForm({...clientForm, address_street: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Calle Principal #123, Colonia Centro"
                    />
                  </div>

                  {/* Ciudad, Estado, País */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Ciudad
                      </label>
                      <input
                        type="text"
                        value={clientForm.address_city}
                        onChange={(e) => setClientForm({...clientForm, address_city: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="Ciudad de México"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estado
                      </label>
                      <input
                        type="text"
                        value={clientForm.address_state}
                        onChange={(e) => setClientForm({...clientForm, address_state: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="CDMX"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        País
                      </label>
                      <input
                        type="text"
                        value={clientForm.address_country}
                        onChange={(e) => setClientForm({...clientForm, address_country: e.target.value})}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        placeholder="México"
                      />
                    </div>
                  </div>

                  {/* Notas */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notas Internas
                    </label>
                    <textarea
                      value={clientForm.notes}
                      onChange={(e) => setClientForm({...clientForm, notes: e.target.value})}
                      rows={3}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="Información adicional sobre el cliente..."
                    />
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                  <button
                    type="button"
                    onClick={closeClientModal}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save mr-2"></i>
                        {modalMode === 'create' ? 'Crear Cliente' : 'Guardar Cambios'}
                      </>
                    )}
                    
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* PROFILE MODAL */}
        {/* ============================================================ */}
        {showProfileModal && (
          <div className="fixed top-16 left-0 right-0 bottom-0  flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-4 flex items-center justify-between rounded-t-xl sticky top-0 z-10">
                <h3 className="text-xl font-semibold text-white flex items-center">
                  <i className={`fas fa-${modalMode === 'create' ? 'plus' : 'edit'} mr-3`}></i>
                  {modalMode === 'create' ? 'Crear Nuevo Perfil' : 'Editar Perfil'}
                </h3>
                <button 
                  onClick={closeProfileModal}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <i className="fas fa-times text-2xl"></i>
                </button>
              </div>

              {/* Modal Body */}
              <form onSubmit={handleProfileSubmit} className="p-6">
                <div className="space-y-6">
                  
                  {/* Información Básica */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <i className="fas fa-info-circle text-indigo-600 mr-2"></i>
                      Información Básica
                    </h4>
                    
                    <div className="space-y-4">
                      {/* Cliente */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cliente <span className="text-red-500">*</span>
                        </label>
                        <select
                        value={profileForm.client}
                        onChange={(e) => setProfileForm({...profileForm, client: parseInt(e.target.value) || 0})}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="0">Seleccionar cliente...</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.company_name || client.name}
                          </option>
                        ))}
                      </select>
                      </div>

                      {/* Título de Posición */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Título de la Posición <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={profileForm.position_title}
                          onChange={(e) => setProfileForm({...profileForm, position_title: e.target.value})}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Ej: Desarrollador Full Stack Senior"
                        />
                      </div>

                      {/* Departamento y Ubicación */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Departamento
                          </label>
                          <input
                            type="text"
                            value={profileForm.department}
                            onChange={(e) => setProfileForm({...profileForm, department: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="Ej: Tecnología"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Ubicación
                          </label>
                          <input
                            type="text"
                            value={profileForm.location}
                            onChange={(e) => setProfileForm({...profileForm, location: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="Ej: Ciudad de México (Remoto)"
                          />
                        </div>
                      </div>

                      {/* Tipo de Empleo y Servicio */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo de Empleo
                          </label>
                          <select
                            value={profileForm.employment_type}
                            onChange={(e) => setProfileForm({...profileForm, employment_type: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          >
                            <option value="full_time">Tiempo Completo</option>
                            <option value="part_time">Medio Tiempo</option>
                            <option value="contract">Contrato</option>
                            <option value="temporary">Temporal</option>
                            <option value="internship">Pasantía</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tipo de Servicio
                          </label>
                          <select
                            value={profileForm.service_type}
                            onChange={(e) => setProfileForm({...profileForm, service_type: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          >
                            <option value="contingency">Contingencia</option>
                            <option value="retained">Retainer</option>
                            <option value="exclusive">Exclusivo</option>
                          </select>
                        </div>
                      </div>

                      {/* Rango Salarial */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Salario Mínimo (MXN/mes)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={profileForm.salary_min}
                            onChange={(e) => setProfileForm({...profileForm, salary_min: parseInt(e.target.value) || 0})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="30000"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Salario Máximo (MXN/mes)
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={profileForm.salary_max}
                            onChange={(e) => setProfileForm({...profileForm, salary_max: parseInt(e.target.value) || 0})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="50000"
                          />
                        </div>
                      </div>

                      {/* Estado y Prioridad */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Estatus
                          </label>
                          <select
                            value={profileForm.status}
                            onChange={(e) => setProfileForm({...profileForm, status: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          >
                            <option value="draft">Borrador</option>
                            <option value="open">Abierto</option>
                            <option value="in_progress">En Proceso</option>
                            <option value="on_hold">En Espera</option>
                            <option value="filled">Cubierto</option>
                            <option value="cancelled">Cancelado</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Prioridad
                          </label>
                          <select
                            value={profileForm.priority}
                            onChange={(e) => setProfileForm({...profileForm, priority: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          >
                            <option value="low">Baja</option>
                            <option value="medium">Media</option>
                            <option value="high">Alta</option>
                            <option value="urgent">Urgente</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Requisitos */}
                  <div className="border-t pt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <i className="fas fa-clipboard-check text-indigo-600 mr-2"></i>
                      Requisitos
                    </h4>
                    
                    <div className="space-y-4">
                      {/* Experiencia y Educación */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Años de Experiencia Requeridos
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="50"
                            value={profileForm.required_experience}
                            onChange={(e) => setProfileForm({...profileForm, required_experience: parseInt(e.target.value) || 0})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="5"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nivel Educativo Requerido
                          </label>
                          <select
                            value={profileForm.required_education}
                            onChange={(e) => setProfileForm({...profileForm, required_education: e.target.value})}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          >
                            <option value="">Seleccionar...</option>
                            <option value="high_school">Preparatoria</option>
                            <option value="associate">Técnico/Asociado</option>
                            <option value="bachelor">Licenciatura</option>
                            <option value="master">Maestría</option>
                            <option value="doctorate">Doctorado</option>
                          </select>
                        </div>
                      </div>

                      {/* Fecha Límite */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fecha Límite para Cubrir
                        </label>
                        <input
                          type="date"
                          value={profileForm.deadline_date}
                          onChange={(e) => setProfileForm({...profileForm, deadline_date: e.target.value})}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Descripciones */}
                  <div className="border-t pt-6">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <i className="fas fa-file-alt text-indigo-600 mr-2"></i>
                      Descripciones Detalladas
                    </h4>
                    
                    <div className="space-y-4">
                      {/* Descripción del Trabajo */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Descripción del Puesto
                        </label>
                        <textarea
                          value={profileForm.job_description}
                          onChange={(e) => setProfileForm({...profileForm, job_description: e.target.value})}
                          rows={4}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Descripción general del puesto y sus objetivos..."
                        />
                      </div>

                      {/* Requisitos */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Requisitos Específicos
                        </label>
                        <textarea
                          value={profileForm.requirements}
                          onChange={(e) => setProfileForm({...profileForm, requirements: e.target.value})}
                          rows={4}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Habilidades técnicas, conocimientos específicos, certificaciones..."
                        />
                      </div>

                      {/* Responsabilidades */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Responsabilidades Principales
                        </label>
                        <textarea
                          value={profileForm.responsibilities}
                          onChange={(e) => setProfileForm({...profileForm, responsibilities: e.target.value})}
                          rows={4}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Tareas y responsabilidades diarias del puesto..."
                        />
                      </div>

                      {/* Beneficios */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Beneficios Ofrecidos
                        </label>
                        <textarea
                          value={profileForm.benefits}
                          onChange={(e) => setProfileForm({...profileForm, benefits: e.target.value})}
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Prestaciones, beneficios, bonos, etc..."
                        />
                      </div>

                      {/* Notas Internas */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Notas Internas
                        </label>
                        <textarea
                          value={profileForm.notes}
                          onChange={(e) => setProfileForm({...profileForm, notes: e.target.value})}
                          rows={3}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                          placeholder="Notas privadas para uso interno del equipo..."
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Modal Footer */}
                <div className="flex justify-end space-x-3 mt-6 pt-6 border-t sticky bottom-0 bg-white">
                  <button
                    type="button"
                    onClick={closeProfileModal}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-lg hover:from-indigo-700 hover:to-indigo-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <i className="fas fa-spinner fa-spin mr-2"></i>
                        Guardando...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-save mr-2"></i>
                        {modalMode === 'create' ? 'Crear Perfil' : 'Guardar Cambios'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </>
  );
}





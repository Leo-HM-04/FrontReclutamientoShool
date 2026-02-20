'use client';

/**
 * ============================================================
 * ADMIN DASHBOARD - CONECTADO CON BACKEND REAL
 * ============================================================
 * Este componente reemplaza el admin/page.tsx existente
 * Consume datos reales del backend Django
 */

import React, { useState, useEffect } from 'react';
import { useModal } from '@/context/ModalContext';
import { useRouter } from 'next/navigation';
import { apiClient, type User, type AdminDashboardStats, type UserActivity } from '@/lib/api';
import EmailManagement from '@/components/EmailManagement'; 

export default function AdminDashboard() {
  const router = useRouter();
  const { showAlert, showSuccess, showConfirm } = useModal();
  
  // ============================================================
  // STATE MANAGEMENT
  // ============================================================
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'users' | 'clients' | 'profiles' | 'candidates' | 'settings'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Data State
  const [dashboardData, setDashboardData] = useState<AdminDashboardStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
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
        await showAlert('Error al cargar datos del sistema. Algunos datos pueden no estar disponibles.');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadViewData = async () => {
    try {
      setLoading(true);
      
      switch (currentView) {
        case 'dashboard':
          const dashData = await apiClient.getAdminDashboard();
          setDashboardData(dashData);
          break;
          
        case 'users':
          const usersData = await apiClient.getUsers(userFilters);
          setUsers(usersData.results || usersData);
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
          await showAlert('Las contraseñas no coinciden');
          return;
        }
        
        if (userForm.password.length < 8) {
          await showAlert('La contraseña debe tener al menos 8 caracteres');
          return;
        }
        
        // Crear usuario
        await apiClient.createUser(userForm);
        await showSuccess('Usuario creado exitosamente');
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
        await showSuccess('Usuario actualizado exitosamente');
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
      await showAlert('Error al cambiar estatus del usuario');
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
      await showSuccess('Usuario eliminado exitosamente');
      await refreshData();
    } catch (error) {
      console.error('Error deleting user:', error);
      await showAlert('Error al eliminar usuario');
    } finally {
      setLoading(false);
    }
  };

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
              
              <li>
                <button
                  onClick={() => setCurrentView('settings')}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all w-full text-left ${getNavItemClass('settings')}`}
                >
                  <i className="fas fa-cog mr-3 w-5"></i>
                  Configuración
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
            <div className="text-center py-12">
              <i className="fas fa-building text-6xl text-gray-300 mb-4"></i>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Gestión de Clientes</h3>
              <p className="text-gray-500">Próximamente disponible</p>
            </div>
          )}

          {currentView === 'profiles' && (
            <div className="text-center py-12">
              <i className="fas fa-briefcase text-6xl text-gray-300 mb-4"></i>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Gestión de Perfiles</h3>
              <p className="text-gray-500">Próximamente disponible</p>
            </div>
          )}

          {currentView === 'candidates' && (
            <div className="text-center py-12">
              <i className="fas fa-user-graduate text-6xl text-gray-300 mb-4"></i>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Gestión de Candidatos</h3>
              <p className="text-gray-500">Próximamente disponible</p>
            </div>
          )}

          {currentView === 'settings' && (
            <div className="text-center py-12">
              <i className="fas fa-cog text-6xl text-gray-300 mb-4"></i>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Configuración del Sistema</h3>
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
      </div>
    </>
  );
}





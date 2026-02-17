'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUsers, 
  faEye, 
  faEyeSlash, 
  faArrowLeft, 
  faSignInAlt, 
  faCheck,
  faUser,
  faLock,
  faExclamationTriangle,
  faShieldAlt,
  faChartLine,
  faBriefcase
} from '@fortawesome/free-solid-svg-icons';
import { apiClient, type LoginCredentials, type ApiError } from '@/lib/api';
import RoleCard from '@/components/RoleCard';
import DirectorIcon from '@/components/icons/DirectorIcon';
import SupervisorIcon from '@/components/icons/SupervisorIcon';
import AdminIcon from '@/components/icons/AdminIcon';

export default function LoginPage() {
  const router = useRouter();
  
  // State
  const [selectedRole, setSelectedRole] = useState('');
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [redirectProgress, setRedirectProgress] = useState(0);
  const [showCredentials, setShowCredentials] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Accessibility: focus management for success modal
  const successModalRef = useRef<HTMLDivElement | null>(null);

  // Audio feedback for successful login
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (showSuccessModal && successModalRef.current) {
      // Move focus into the modal for screen reader users
      successModalRef.current.focus();

      // Play success tone (tonoalegre.mp3 in /public)
      if (!audioRef.current) {
        audioRef.current = new Audio('/reclutamiento/tonoalegre.mp3');
        audioRef.current.volume = 0.85;
        // Try to avoid playing twice
        audioRef.current.preload = 'auto';
      }

      try {
        // Reset time and play; handle browsers that require user gesture
        audioRef.current.currentTime = 0;
        const playPromise = audioRef.current.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch((err) => {
            // Silently handle the error (autoplay policy may block)
            console.warn('Audio play prevented:', err);
          });
        }
      } catch (err) {
        console.warn('Error playing audio:', err);
      }
    }
  }, [showSuccessModal]);
  
  // Form data
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
    remember: false
  });

  // Role selection
  const selectRole = (role: string) => {
    setSelectedRole(role);
    setShowLoginForm(true);
    setErrorMessage('');
    
    // Clear form when selecting a role - user needs to enter real credentials
    setLoginForm({ email: '', password: '', remember: false });
  };

  const goBack = () => {
    setShowLoginForm(false);
    setSelectedRole('');
    setErrorMessage('');
    setLoginForm({ email: '', password: '', remember: false });
  };

  // Role configuration
  const roles = {
    director: {
      name: 'Director RH',
      description: 'Acceso completo al sistema',
      color: 'blue' as const,
      icon: <DirectorIcon className="w-7 h-7" />,
    },
    supervisor: {
      name: 'Supervisor',
      description: 'Gestión de procesos y candidatos',
      color: 'green' as const,
      icon: <SupervisorIcon className="w-7 h-7" />,
    },
    admin: {
      name: 'Administrador',
      description: 'Configuración del sistema',
      color: 'orange' as const,
      icon: <AdminIcon className="w-7 h-7" />,
    },
  };

  const getCurrentRole = () => roles[selectedRole as keyof typeof roles];

  // Login handling
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    
    setLoading(true);
    setErrorMessage('');
    
    try {
      // Validate form
      if (!loginForm.email || !loginForm.password) {
        throw new Error('Por favor, completa todos los campos');
      }

      // Call API
      const credentials: LoginCredentials = {
        email: loginForm.email.trim(),
        password: loginForm.password
      };

      const response = await apiClient.login(credentials);
      
      // Verify user role matches selected role
      if (response.user.role !== selectedRole) {
        throw new Error(`El usuario no tiene el rol de ${getCurrentRole()?.name}`);
      }
      
      // Store auth data
      localStorage.setItem('authToken', response.access);
      localStorage.setItem('refreshToken', response.refresh);
      localStorage.setItem('user', JSON.stringify(response.user));
      localStorage.setItem('userRole', response.user.role);
      
      // Show success modal and redirect
      setShowSuccessModal(true);
      startRedirectProgress();
      
    } catch (error) {
      console.error('Login error:', error);
      
      if (error && typeof error === 'object' && 'message' in error) {
        const apiError = error as ApiError;
        
        // Handle specific error cases
        if (apiError.status === 401) {
          setErrorMessage('Credenciales inválidas. Verifica tu email y contraseña.');
        } else if (apiError.status === 0) {
          setErrorMessage('Error de conexión. Verifica que el servidor esté funcionando.');
        } else {
          setErrorMessage(apiError.message || 'Error desconocido');
        }
      } else if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Error inesperado. Intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  const startRedirectProgress = () => {
    const interval = setInterval(() => {
      setRedirectProgress(prev => {
        const newProgress = prev + 5;
        if (newProgress >= 100) {
          clearInterval(interval);
          setTimeout(() => redirectToDashboard(), 1000);
        }
        return newProgress;
      });
    }, 150);
  };

  const redirectToDashboard = () => {
    setShowSuccessModal(false);
    
    // Redirect based on role
    switch(selectedRole) {
      case 'director':
        router.push('/director');
        break;
      case 'admin':
        router.push('/admin');
        break;
      case 'supervisor':
        router.push('/supervisor');
        break;
      default:
        router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100 py-6 px-4">
      <div className="w-full max-w-md space-y-4">
        {/* Logo Bausen */}
        <div className="text-center">
          <img 
            src="/reclutamiento/bausen-logo.png" 
            alt="Bausen Logo" 
            className="mx-auto h-16 w-auto mb-3"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              console.log('Error loading logo from /reclutamiento/bausen-logo.png');
            }}
          />
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Sistema de Reclutamiento</h2>
          <p className="text-sm text-gray-600">Ingresa a tu cuenta para continuar</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-50 to-slate-50 px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-bold text-gray-900">
              {showLoginForm ? 'Iniciar Sesión' : 'Selecciona tu rol'}
            </h3>
            <p className="text-gray-600 mt-0.5 text-xs">
              {showLoginForm ? `Ingresando como ${getCurrentRole()?.name}` : 'Elige tu perfil para acceder al sistema'}
            </p>
          </div>

            {/* Content */}
            <div className="p-6">
              {/* Role Selection */}
              {!showLoginForm && (
                <div className="space-y-3 animate-[fadeIn_0.4s_ease-out]">
                  <RoleCard
                    id="director"
                    title="Director RH"
                    description="Acceso completo al sistema"
                    icon={<DirectorIcon className="w-6 h-6" />}
                    color="blue"
                    selected={selectedRole === 'director'}
                    onClick={() => selectRole('director')}
                  />
                  
                  <RoleCard
                    id="supervisor"
                    title="Supervisor"
                    description="Gestión de procesos y candidatos"
                    icon={<SupervisorIcon className="w-6 h-6" />}
                    color="green"
                    selected={selectedRole === 'supervisor'}
                    onClick={() => selectRole('supervisor')}
                  />
                  
                  <RoleCard
                    id="admin"
                    title="Administrador"
                    description="Configuración del sistema"
                    icon={<AdminIcon className="w-6 h-6" />}
                    color="orange"
                    selected={selectedRole === 'admin'}
                    onClick={() => selectRole('admin')}
                  />
                </div>
              )}

              {/* Login Form */}
              {showLoginForm && (
                <form onSubmit={handleLogin} className="space-y-4 animate-[fadeIn_0.4s_ease-out]">
                  {/* Back Button */}
                  <button 
                    onClick={goBack} 
                    type="button" 
                    className="flex items-center text-blue-600 hover:text-blue-700 transition-colors group"
                  >
                    <FontAwesomeIcon icon={faArrowLeft} className="mr-2 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-sm font-medium">Cambiar rol</span>
                  </button>

                  {/* Email Field */}
                  <div>
                    <label htmlFor="email" className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Correo Electrónico
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FontAwesomeIcon icon={faUser} className="text-gray-400" />
                      </div>
                      <input 
                        id="email" 
                        name="email" 
                        type="email" 
                        required
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                        className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm text-gray-900 placeholder-gray-400"
                        placeholder="ejemplo@empresa.com"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <label htmlFor="password" className="block text-xs font-semibold text-gray-700 mb-1.5">
                      Contraseña
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <FontAwesomeIcon icon={faLock} className="text-gray-400" />
                      </div>
                      <input 
                        id="password" 
                        name="password" 
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                        className="block w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm text-gray-900 placeholder-gray-400"
                        placeholder="••••••••"
                      />
                      <button 
                        onClick={() => setShowPassword(!showPassword)} 
                        type="button"
                        className="absolute inset-y-0 right-0 pr-4 flex items-center hover:scale-110 transition-transform"
                      >
                        <FontAwesomeIcon 
                          icon={showPassword ? faEyeSlash : faEye}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        />
                      </button>
                    </div>
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <input 
                        id="remember" 
                        name="remember" 
                        type="checkbox" 
                        checked={loginForm.remember}
                        onChange={(e) => setLoginForm({...loginForm, remember: e.target.checked})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded transition-colors"
                      />
                      <label htmlFor="remember" className="ml-2 block text-sm text-gray-700">
                        Recordarme
                      </label>
                    </div>
                    <div className="text-sm">
                      <a href="#" className="text-blue-600 hover:text-blue-700 font-medium transition-colors">
                        ¿Olvidaste tu contraseña?
                      </a>
                    </div>
                  </div>

                  {/* Error Message */}
                  {errorMessage && (
                    <div className="bg-red-50 border-l-4 border-red-500 rounded-lg p-4 animate-[shake_0.4s_ease-in-out]">
                      <div className="flex items-start">
                        <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                        <span className="text-sm text-red-700 leading-relaxed">{errorMessage}</span>
                      </div>
                    </div>
                  )}

                  {/* Login Button */}
                  <button 
                    type="submit" 
                    disabled={loading}
                    className="group relative w-full flex justify-center items-center py-2.5 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {!loading ? (
                      <>
                        <FontAwesomeIcon icon={faSignInAlt} className="mr-2 group-hover:translate-x-1 transition-transform" />
                        Iniciar Sesión
                      </>
                    ) : (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Iniciando sesión...
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>

        {/* Help text */}
        <div className="text-center mt-3">
          <p className="text-xs text-gray-600">
            ¿Necesitas ayuda? Contacta al administrador del sistema
          </p>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 mt-2">
          <p>&copy; 2024 Sistema de Reclutamiento. Todos los derechos reservados.</p>
        </div>
      </div>

      {/* Success Modal - Enhanced Version */}
      {showSuccessModal && (
        <div 
          ref={successModalRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-success-title"
          aria-describedby="login-success-desc"
          className="fixed inset-0 flex items-center justify-center z-50 animate-[fadeIn_0.3s_ease-out]"
          style={{ 
            backgroundColor: 'rgba(0, 0, 0, 0.6)', 
            backdropFilter: 'blur(12px)', 
            WebkitBackdropFilter: 'blur(12px)' 
          }}
        >
          <div className="bg-white rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] p-10 max-w-sm mx-4 animate-[scaleIn_0.4s_cubic-bezier(0.34,1.56,0.64,1)]">
            <div className="text-center">
              {/* Animated Success Icon with Circular Progress */}
              <div className="relative w-24 h-24 mx-auto mb-6">
                {/* Outer rotating circle */}
                <div className="absolute inset-0 rounded-full border-4 border-green-100 animate-[spin_3s_linear_infinite]"></div>
                
                {/* Animated progress circle */}
                <svg className="absolute inset-0 w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray="289.027"
                    strokeDashoffset="289.027"
                    className="animate-[progressCircle_2s_ease-out_forwards]"
                    style={{
                      filter: 'drop-shadow(0 0 8px rgba(34, 197, 94, 0.4))'
                    }}
                  />
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                  </defs>
                </svg>
                
                {/* Success icon with scale animation */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg animate-[iconPulse_2s_ease-in-out_infinite]">
                    <FontAwesomeIcon 
                      icon={faCheck} 
                      className="text-white text-3xl animate-[checkmark_0.6s_cubic-bezier(0.34,1.56,0.64,1)_0.3s_both]" 
                    />
                  </div>
                </div>
              </div>

              {/* Text with fade-in animation */}
              <h3 id="login-success-title" className="text-2xl font-bold text-gray-900 mb-2 animate-[fadeInUp_0.5s_ease-out_0.2s_both]">
                ¡Bienvenido!
              </h3>
              <p id="login-success-desc" className="text-gray-600 mb-8 animate-[fadeInUp_0.5s_ease-out_0.3s_both]" aria-live="polite" role="status">
                Login exitoso. Redirigiendo al dashboard...
                <span className="sr-only"> Serás redirigido automáticamente en 2 segundos.</span>
              </p>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes scaleIn {
          from { 
            opacity: 0;
            transform: scale(0.9);
          }
          to { 
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        @keyframes progressCircle {
          from {
            stroke-dashoffset: 289.027;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
        
        @keyframes checkmark {
          from {
            opacity: 0;
            transform: scale(0);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        
        @keyframes iconPulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 10px 25px rgba(34, 197, 94, 0.3);
          }
          50% {
            transform: scale(1.05);
            box-shadow: 0 15px 35px rgba(34, 197, 94, 0.4);
          }
        }

        @keyframes shake {
          0%, 100% {
            transform: translateX(0);
          }
          10%, 30%, 50%, 70%, 90% {
            transform: translateX(-5px);
          }
          20%, 40%, 60%, 80% {
            transform: translateX(5px);
          }
        }
      `}</style>
    </div>
  );
}

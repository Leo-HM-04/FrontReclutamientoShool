'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faTachometerAlt,
  faUsers,
  faBriefcase,
  faFileAlt,
  faChartBar,
  faCog,
  faSignOutAlt,
  faBars,
  faTimes,
  faUserCircle,
  faTools,
  faStickyNote,
  faFolderOpen,
  faChartLine,
  faLink,
  faCalendarCheck,
  faGlobe,
  faDatabase,
} from '@fortawesome/free-solid-svg-icons';
import { cn } from '@/lib/utils';

interface NavigationProps {
  userRole?: 'admin' | 'recruiter' | 'candidate' | 'director';
}

const navigation = {
  admin: [
    { name: 'Dashboard', href: '/dashboard', icon: faTachometerAlt },
    { name: 'Candidatos', href: '/dashboard/candidates', icon: faUsers },
    { name: 'Empleos', href: '/dashboard/jobs', icon: faBriefcase },
    { name: 'Reportes', href: '/dashboard/reports', icon: faChartBar },
    { name: 'Panel Admin', href: '/admin', icon: faTools },
    { name: 'Configuración', href: '/dashboard/settings', icon: faCog },
  ],
  director: [
    { name: 'Dashboard Ejecutivo', href: '/director', icon: faTachometerAlt },
    { name: 'Candidatos', href: '/director/candidates', icon: faUsers },
    { name: 'Aplicaciones', href: '/director/candidates/applications', icon: faBriefcase },
    { name: 'Documentos', href: '/director/candidates/documents', icon: faFolderOpen },
    { name: 'Notas', href: '/director/candidates/notes', icon: faStickyNote },
    { name: 'Reuniones', href: '/director/reuniones', icon: faCalendarCheck },
    { name: 'Talento Externo', href: '/director/talento-externo', icon: faGlobe },
    { name: 'Análisis ETL', href: '/director/analisis-etl', icon: faDatabase },
    { name: 'Avance de Cliente', href: '/director/client-progress', icon: faChartLine },
    { name: 'Procesos', href: '/director/processes', icon: faBriefcase },
    { name: 'Reportes', href: '/director/reports', icon: faChartBar },
    { name: 'Configuración', href: '/director/settings', icon: faCog },
  ],
  recruiter: [
    { name: 'Dashboard', href: '/dashboard', icon: faTachometerAlt },
    { name: 'Candidatos', href: '/dashboard/candidates', icon: faUsers },
    { name: 'Mis Empleos', href: '/dashboard/jobs', icon: faBriefcase },
    { name: 'Entrevistas', href: '/dashboard/interviews', icon: faFileAlt },
  ],
  candidate: [
    { name: 'Dashboard', href: '/dashboard', icon: faTachometerAlt },
    { name: 'Empleos', href: '/dashboard/jobs', icon: faBriefcase },
    { name: 'Mis Aplicaciones', href: '/dashboard/applications', icon: faFileAlt },
    { name: 'Perfil', href: '/dashboard/profile', icon: faUserCircle },
  ],
};

export function Navigation({ userRole = 'admin' }: NavigationProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const pathname = usePathname();
  
  const navItems = navigation[userRole];

  return (
    <>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-50" role="banner">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              aria-label={isSidebarOpen ? 'Cerrar menú de navegación' : 'Abrir menú de navegación'}
              aria-expanded={isSidebarOpen}
            >
              <FontAwesomeIcon icon={isSidebarOpen ? faTimes : faBars} aria-hidden="true" />
            </button>
            <Link href="/dashboard" className="ml-4 lg:ml-0">
              <h1 className="text-xl font-bold text-blue-600">RecruitPro</h1>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-700">
              <span className="font-medium">Admin User</span>
            </div>
            <button 
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <FontAwesomeIcon icon={faSignOutAlt} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={cn(
        'fixed top-0 left-0 z-40 w-64 h-screen pt-16 transition-transform bg-white border-r border-gray-200',
        isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      )}>
        <div className="h-full px-3 py-4 overflow-y-auto">
          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  )}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <FontAwesomeIcon icon={item.icon} className="w-5 h-5 mr-3" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-30  lg:hidden" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </>
  );
}

'use client';

/**
 * Página de Análisis ETL (MercaRed) para Director.
 * Demuestra el proceso ETL con PySpark integrado en el sistema (ejercicio Sección 3).
 */

import React from 'react';
import EtlDashboard from '@/components/EtlDashboard';
import { Navigation } from '@/components/Navigation';

export default function DirectorAnalisisEtlPage() {
  return (
    <>
      <Navigation userRole="director" />
      <main className="lg:ml-64 pt-16 min-h-screen bg-gray-50">
        <EtlDashboard />
      </main>
    </>
  );
}

'use client';

/**
 * Página de Talento Externo para Director.
 * Búsqueda de candidatos en People Data Labs e importación al proceso.
 */

import React from 'react';
import ExternalCandidatesView from '@/components/ExternalCandidatesView';
import { Navigation } from '@/components/Navigation';

export default function DirectorTalentoExternoPage() {
  return (
    <>
      <Navigation userRole="director" />
      <main className="lg:ml-64 pt-16 min-h-screen bg-gray-50">
        <ExternalCandidatesView />
      </main>
    </>
  );
}

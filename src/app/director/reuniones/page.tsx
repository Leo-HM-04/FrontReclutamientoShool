'use client';

/**
 * Página de Reuniones / Seguimiento para Director.
 * Monta el módulo de reuniones (Teams + análisis IA de entrevistas).
 */

import React from 'react';
import MeetingsMain from '@/components/meetings/MeetingsMain';
import { Navigation } from '@/components/Navigation';

export default function DirectorReunionesPage() {
  return (
    <>
      <Navigation userRole="director" />
      <main className="lg:ml-64 pt-16 min-h-screen bg-gray-50">
        <MeetingsMain />
      </main>
    </>
  );
}

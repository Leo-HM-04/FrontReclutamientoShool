'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart } from '@/components/charts/BarChart';
import { DoughnutChart } from '@/components/charts/DoughnutChart';

export default function ReportsPage() {
  // Datos para el gráfico de aplicaciones por mes
  const applicationsData = {
    labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
    datasets: [
      {
        label: 'Aplicaciones',
        data: [65, 78, 90, 81, 56, 85],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgba(59, 130, 246, 1)',
        borderWidth: 1,
      },
      {
        label: 'Contrataciones',
        data: [12, 15, 18, 16, 10, 14],
        backgroundColor: 'rgba(16, 185, 129, 0.8)',
        borderColor: 'rgba(16, 185, 129, 1)',
        borderWidth: 1,
      },
    ],
  };

  // Datos para el gráfico de estado de candidatos
  const candidateStatusData = {
    labels: ['Activos', 'En Proceso', 'Contratados', 'Rechazados'],
    datasets: [
      {
        data: [45, 25, 20, 10],
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(239, 68, 68, 0.8)',
        ],
        borderColor: [
          'rgba(59, 130, 246, 1)',
          'rgba(245, 158, 11, 1)',
          'rgba(16, 185, 129, 1)',
          'rgba(239, 68, 68, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  // Datos para el gráfico de ofertas por departamento
  const departmentData = {
    labels: ['Tecnología', 'Marketing', 'Ventas', 'RRHH', 'Operaciones'],
    datasets: [
      {
        label: 'Ofertas Activas',
        data: [12, 5, 8, 3, 7],
        backgroundColor: 'rgba(147, 51, 234, 0.8)',
        borderColor: 'rgba(147, 51, 234, 1)',
        borderWidth: 1,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Reportes y Análisis</h1>
        <p className="text-gray-600 mt-2">
          Análisis detallado del rendimiento del sistema de reclutamiento
        </p>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">87%</div>
              <p className="text-sm text-gray-600 mt-1">Tasa de Respuesta</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">23</div>
              <p className="text-sm text-gray-600 mt-1">Días Promedio</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">15%</div>
              <p className="text-sm text-gray-600 mt-1">Tasa de Contratación</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">€52k</div>
              <p className="text-sm text-gray-600 mt-1">Salario Promedio</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Aplicaciones y Contrataciones por Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <BarChart 
                data={applicationsData}
                options={{
                  maintainAspectRatio: false,
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 10,
                      },
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Estatus de Candidatos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <DoughnutChart 
                data={candidateStatusData}    
                options={{
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de departamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Ofertas Activas por Departamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <BarChart 
              data={departmentData}
              options={{
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                  x: {
                    beginAtZero: true,
                  },
                },
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabla de métricas detalladas */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas Detalladas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Métrica</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Este Mes</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Mes Anterior</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Cambio</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4">Nuevas Aplicaciones</td>
                  <td className="py-3 px-4">156</td>
                  <td className="py-3 px-4">142</td>
                  <td className="py-3 px-4 text-green-600">+9.9%</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4">Entrevistas Realizadas</td>
                  <td className="py-3 px-4">45</td>
                  <td className="py-3 px-4">38</td>
                  <td className="py-3 px-4 text-green-600">+18.4%</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4">Ofertas Enviadas</td>
                  <td className="py-3 px-4">12</td>
                  <td className="py-3 px-4">15</td>
                  <td className="py-3 px-4 text-red-600">-20.0%</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 px-4">Contrataciones</td>
                  <td className="py-3 px-4">8</td>
                  <td className="py-3 px-4">6</td>
                  <td className="py-3 px-4 text-green-600">+33.3%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// src/app/dashboard/page.tsx - Fleet Care SaaS
'use client';

import { DocumentStats } from '@/components/layout/DocumentStats';
import { MaintenanceMetrics } from '@/components/layout/MaintenanceMetrics';
import { HighRiskVehicles } from '@/components/layout/HighRiskVehicles';
import { MaintenanceCalendar } from '@/components/layout/MaintenanceCalendar';

// const maintenanceStats = [
//   { name: "Al día", value: 65, color: "#22c55e" },
//   { name: "Próximos", value: 25, color: "#eab308" },
//   { name: "Vencidos", value: 10, color: "#ef4444" },
// ];

export default function DashboardPage() {
  // const { user, loading } = useAuth();

  // if (loading) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center">
  //       <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
  //     </div>
  //   );
  // }

  return (
    <div>
      {/* Header de bienvenida */}
      <div className="mb-8"></div>

      {/* Grid de gráficos y estadísticas */}
      <div className="grid grid-cols-1 mt-8 gap-6">
        {/* KPIs Compactos de Mantenimiento */}
        <MaintenanceMetrics />

        {/* Layout de 2 columnas: Alto Riesgo + Calendario */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <HighRiskVehicles />
          <MaintenanceCalendar />
        </div>

        {/* Documentos por Vencer */}
        <DocumentStats />
      </div>

      {/* Comentado por migrar después */}
      {/* <DashboardChart stats={maintenanceStats} /> */}
    </div>
  );
}

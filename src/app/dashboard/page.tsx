// src/app/dashboard/page.tsx - Fleet Care SaaS
"use client";

import { DocumentStats } from "@/components/layout/DocumentStats";
import { MaintenanceStats } from "@/components/layout/MaintenanceStats";
import { MaintenanceMetrics } from "@/components/layout/MaintenanceMetrics";

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
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Dashboard - Fleet Care
        </h1>
      </div>

      {/* Grid de gráficos y estadísticas */}
      <div className="grid grid-cols-1 mt-8 xl:grid-cols-2 gap-6">
        <div className="space-y-6">
          {/* Métricas de mantenimiento - solo en la columna izquierda */}
          <MaintenanceMetrics />
          <MaintenanceStats />
        </div>
        <DocumentStats />
      </div>

      {/* Comentado por migrar después */}
      {/* <DashboardChart stats={maintenanceStats} /> */}
    </div>
  );
}

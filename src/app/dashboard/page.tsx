// src/app/dashboard/page.tsx - Fleet Care SaaS
"use client";

import { DocumentStats } from "@/components/layout/DocumentStats";
import { MaintenanceStats } from "@/components/layout/MaintenanceStats";

const maintenanceStats = [
  { name: "Al día", value: 65, color: "#22c55e" },
  { name: "Próximos", value: 25, color: "#eab308" },
  { name: "Vencidos", value: 10, color: "#ef4444" },
];

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

      {/* Grid principal de estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 lg:gap-x-20">
        {/* Aquí irían componentes adicionales si los tienes */}
      </div>

      {/* Grid de gráficos y estadísticas */}
      <div className="grid grid-cols-1 mt-12 xl:grid-cols-2 md:gap-x-10">
        <MaintenanceStats />
        <DocumentStats />
      </div>

      {/* Comentado por migrar después */}
      {/* <DashboardChart stats={maintenanceStats} /> */}
    </div>
  );
}

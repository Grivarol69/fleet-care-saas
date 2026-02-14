'use client';

import { useAlertStats } from '@/lib/hooks/useMaintenanceAlerts';

export function MaintenanceMetrics() {
  const stats = useAlertStats();

  return (
    <div className="flex items-center gap-6 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl px-6 py-4 shadow-md">
      {/* Vehículos Críticos */}
      <div className="flex items-center gap-3">
        <div className="bg-red-500 rounded-lg px-4 py-2 font-bold text-2xl shadow-lg">
          🔴 {stats.byLevel.CRITICAL}
        </div>
        <span className="text-sm font-medium opacity-90">Críticos</span>
      </div>

      <div className="w-px h-8 bg-blue-400"></div>

      {/* Vehículos en Advertencia */}
      <div className="flex items-center gap-3">
        <div className="bg-yellow-500 rounded-lg px-4 py-2 font-bold text-2xl shadow-lg">
          🟡 {stats.byLevel.HIGH}
        </div>
        <span className="text-sm font-medium opacity-90">Advertencia</span>
      </div>

      <div className="w-px h-8 bg-blue-400"></div>

      {/* Total de Alertas */}
      <div className="flex items-center gap-3">
        <div className="bg-blue-400 rounded-lg px-4 py-2 font-bold text-2xl shadow-lg">
          📊 {stats.total}
        </div>
        <span className="text-sm font-medium opacity-90">Total Alertas</span>
      </div>

      <div className="flex-1"></div>

      {/* Costo Estimado */}
      <div className="text-right">
        <p className="text-xs opacity-75">Inversión Estimada</p>
        <p className="text-xl font-bold">
          ${(stats.totalEstimatedCost / 1000).toFixed(0)}k
        </p>
      </div>
    </div>
  );
}

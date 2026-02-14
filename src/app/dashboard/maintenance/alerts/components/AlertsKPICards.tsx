'use client';

import { AlertTriangle, Clock, DollarSign, Wrench } from 'lucide-react';

interface KPIData {
  totalVehiclesWithAlerts: number;
  criticalAlerts: number;
  upcomingAlerts: number;
  totalEstimatedCost: number;
  totalEstimatedHours: number;
}

interface Props {
  data: KPIData;
}

export function AlertsKPICards({ data }: Props) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* Vehículos con Alertas */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="bg-white/20 rounded-lg p-2.5">
            <Wrench className="h-6 w-6" />
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              {data.totalVehiclesWithAlerts}
            </div>
          </div>
        </div>
        <div className="text-sm font-medium text-blue-100">Vehículos</div>
        <div className="text-xs text-blue-200">requieren mantenimiento</div>
      </div>

      {/* Alertas Críticas */}
      <div
        className={`rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow ${
          data.criticalAlerts > 0
            ? 'bg-gradient-to-br from-red-500 to-red-600 animate-pulse'
            : 'bg-gradient-to-br from-gray-400 to-gray-500'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="bg-white/20 rounded-lg p-2.5">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{data.criticalAlerts}</div>
          </div>
        </div>
        <div className="text-sm font-medium">Alertas Críticas</div>
        <div className="text-xs opacity-90">
          {data.criticalAlerts > 0
            ? 'acción inmediata requerida'
            : 'sin urgencias'}
        </div>
      </div>

      {/* Alertas Próximas */}
      <div
        className={`rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow ${
          data.upcomingAlerts > 0
            ? 'bg-gradient-to-br from-amber-500 to-orange-500'
            : 'bg-gradient-to-br from-gray-400 to-gray-500'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="bg-white/20 rounded-lg p-2.5">
            <Clock className="h-6 w-6" />
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{data.upcomingAlerts}</div>
          </div>
        </div>
        <div className="text-sm font-medium">Próximos Servicios</div>
        <div className="text-xs opacity-90">
          {data.upcomingAlerts > 0
            ? 'en los próximos 1,000 km'
            : 'flota al día'}
        </div>
      </div>

      {/* Costo Estimado Total */}
      <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg hover:shadow-xl transition-shadow">
        <div className="flex items-center justify-between mb-3">
          <div className="bg-white/20 rounded-lg p-2.5">
            <DollarSign className="h-6 w-6" />
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold">
              ${(data.totalEstimatedCost / 1000).toFixed(0)}k
            </div>
          </div>
        </div>
        <div className="text-sm font-medium">Inversión Estimada</div>
        <div className="text-xs opacity-90">
          ~{data.totalEstimatedHours.toFixed(0)} hrs de trabajo
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useAlertsGroupedByVehicle } from '@/lib/hooks/useMaintenanceAlerts';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import type { MaintenanceAlert } from '@/lib/hooks/useMaintenanceAlerts';

interface VehicleGroup {
  vehicleId: number;
  vehiclePlate: string;
  vehiclePhoto: string;
  brandName: string;
  lineName: string;
  alerts: MaintenanceAlert[];
}

type RiskCategory = 'immobilized' | 'critical' | 'warning';

interface RiskVehicle extends VehicleGroup {
  riskCategory: RiskCategory;
}

export function HighRiskVehicles() {
  const { groupedAlerts, isLoading } = useAlertsGroupedByVehicle();
  const [expandedVehicle, setExpandedVehicle] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="text-base font-semibold">Vehículos de Alto Riesgo</h3>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
        </div>
      </div>
    );
  }

  // Categorizar vehículos por riesgo
  const categorizedVehicles: RiskVehicle[] = groupedAlerts.map(vehicle => {
    const criticalAlerts = vehicle.alerts.filter(a => a.alertLevel === 'CRITICAL');
    const highAlerts = vehicle.alerts.filter(a => a.alertLevel === 'HIGH');
    const overdueAlerts = vehicle.alerts.filter(a => a.kmToMaintenance <= 0);

    let riskCategory: RiskCategory;

    if (overdueAlerts.length >= 3 || criticalAlerts.length >= 2) {
      riskCategory = 'immobilized';
    } else if (criticalAlerts.length > 0) {
      riskCategory = 'critical';
    } else if (highAlerts.length > 0) {
      riskCategory = 'warning';
    } else {
      return null; // No es de alto riesgo
    }

    return { ...vehicle, riskCategory };
  }).filter(Boolean) as RiskVehicle[];

  // Ordenar: inmovilizados primero, luego críticos, luego advertencia
  const sortedVehicles = categorizedVehicles.sort((a, b) => {
    const order = { immobilized: 0, critical: 1, warning: 2 };
    return order[a.riskCategory] - order[b.riskCategory];
  });

  const riskConfig = {
    immobilized: {
      bg: 'bg-red-50 border-red-300',
      border: 'border-l-4 border-l-red-600',
      badge: 'bg-red-600',
      icon: '🔴',
      label: 'INMOVILIZADO',
      textColor: 'text-red-700',
    },
    critical: {
      bg: 'bg-orange-50 border-orange-300',
      border: 'border-l-4 border-l-orange-600',
      badge: 'bg-orange-600',
      icon: '🟠',
      label: 'CRÍTICO',
      textColor: 'text-orange-700',
    },
    warning: {
      bg: 'bg-yellow-50 border-yellow-300',
      border: 'border-l-4 border-l-yellow-600',
      badge: 'bg-yellow-600',
      icon: '🟡',
      label: 'ADVERTENCIA',
      textColor: 'text-yellow-700',
    },
  };

  if (sortedVehicles.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="text-base font-semibold">Vehículos de Alto Riesgo</h3>
          </div>
        </div>

        {/* Empty State */}
        <div className="p-8 text-center">
          <div className="bg-green-100 rounded-full p-4 mx-auto w-16 h-16 flex items-center justify-center mb-3">
            <span className="text-3xl">✅</span>
          </div>
          <p className="font-semibold text-gray-900 mb-1">¡Excelente!</p>
          <p className="text-sm text-gray-600">
            No hay vehículos en situación de riesgo
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-md border-2 border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="text-base font-semibold">Vehículos de Alto Riesgo</h3>
          </div>
          <Badge className="bg-white/20 text-white border-white/30 font-bold">
            {sortedVehicles.length} vehículo{sortedVehicles.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </div>

      {/* Lista de Vehículos */}
      <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
        {sortedVehicles.map((vehicle, index) => {
          const config = riskConfig[vehicle.riskCategory];
          const isExpanded = expandedVehicle === vehicle.vehicleId;
          const overdueAlerts = vehicle.alerts.filter(a => a.kmToMaintenance <= 0);

          return (
            <motion.div
              key={vehicle.vehicleId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`${config.bg} ${config.border} transition-all`}
            >
              {/* Fila Principal */}
              <div
                className="p-3 cursor-pointer hover:bg-opacity-80"
                onClick={() => setExpandedVehicle(isExpanded ? null : vehicle.vehicleId)}
              >
                <div className="flex items-center gap-3">
                  {/* Foto */}
                  <div className="relative h-12 w-16 rounded-lg overflow-hidden bg-gray-200 border-2 border-white shadow-sm flex-shrink-0">
                    <Image
                      src={vehicle.vehiclePhoto}
                      alt={vehicle.vehiclePlate}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Info del Vehículo */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`font-bold text-base ${config.textColor}`}>
                        {vehicle.vehiclePlate}
                      </span>
                      <Badge className={`${config.badge} text-white text-xs px-2 py-0.5 font-semibold`}>
                        {config.icon} {config.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600">
                      {vehicle.brandName} {vehicle.lineName}
                    </p>
                    {overdueAlerts.length > 0 && (
                      <p className="text-xs font-semibold text-red-600 mt-1">
                        {overdueAlerts.length} mantenimiento{overdueAlerts.length > 1 ? 's' : ''} vencido{overdueAlerts.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Contador de Alertas */}
                  <div className="flex flex-col items-center gap-1">
                    <Badge variant="outline" className="text-xs font-bold">
                      {vehicle.alerts.length} alert{vehicle.alerts.length !== 1 ? 'as' : 'a'}
                    </Badge>
                  </div>

                  {/* Botón Expandir */}
                  <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                    {isExpanded ? (
                      <ChevronUp className="h-5 w-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-600" />
                    )}
                  </button>
                </div>
              </div>

              {/* Items Expandidos */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-1.5">
                      {vehicle.alerts
                        .sort((a, b) => a.kmToMaintenance - b.kmToMaintenance)
                        .slice(0, 5)
                        .map((alert) => {
                          const isOverdue = alert.kmToMaintenance <= 0;
                          const isUrgent = alert.kmToMaintenance > 0 && alert.kmToMaintenance <= 500;

                          return (
                            <div
                              key={alert.id}
                              className={`
                                bg-white rounded-md px-3 py-2 text-xs border-2
                                ${isOverdue ? 'border-red-400 bg-red-50' : ''}
                                ${isUrgent ? 'border-orange-400 bg-orange-50' : 'border-gray-200'}
                              `}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-gray-900">
                                  {alert.itemName}
                                </span>
                                <span className={`font-bold ${
                                  isOverdue ? 'text-red-600' :
                                  isUrgent ? 'text-orange-600' : 'text-gray-700'
                                }`}>
                                  {isOverdue
                                    ? `${Math.abs(alert.kmToMaintenance)} km VENCIDO`
                                    : `${alert.kmToMaintenance} km`
                                  }
                                </span>
                              </div>
                              <div className="flex items-center justify-between mt-1 text-gray-600">
                                <span>{alert.packageName}</span>
                                {alert.estimatedCost && (
                                  <span className="text-green-600 font-semibold">
                                    ${Math.round(alert.estimatedCost).toLocaleString()}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      {vehicle.alerts.length > 5 && (
                        <p className="text-center text-xs text-gray-500 py-1">
                          +{vehicle.alerts.length - 5} alerta{vehicle.alerts.length - 5 > 1 ? 's' : ''} más
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

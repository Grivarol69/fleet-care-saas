'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { MaintenanceAlert } from '@/lib/hooks/useMaintenanceAlerts';
import { ChevronDown, ChevronUp, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';

interface VehicleGroup {
  vehicleId: number;
  vehiclePlate: string;
  vehiclePhoto: string;
  brandName: string;
  lineName: string;
  alerts: MaintenanceAlert[];
}

interface Props {
  vehicle: VehicleGroup;
  selectedAlertIds: number[];
  onToggleAlert: (alertId: number) => void;
  onTogglePackage: (alerts: MaintenanceAlert[]) => void;
}

export function VehicleAlertRow({
  vehicle,
  selectedAlertIds,
  onToggleAlert,
  onTogglePackage,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  const criticalCount = vehicle.alerts.filter(a => a.alertLevel === 'CRITICAL').length;
  const highCount = vehicle.alerts.filter(a => a.alertLevel === 'HIGH').length;
  const mediumCount = vehicle.alerts.filter(a => a.alertLevel === 'MEDIUM').length;

  const totalCost = vehicle.alerts.reduce((sum, a) => sum + (a.estimatedCost || 0), 0);
  const totalDuration = vehicle.alerts.reduce((sum, a) => sum + (a.estimatedDuration || 0), 0);

  const nextAlert = [...vehicle.alerts].sort((a, b) => a.kmToMaintenance - b.kmToMaintenance)[0];

  // Determinar el estado del vehículo
  const vehicleStatus = criticalCount > 0 ? 'critical' : highCount > 0 ? 'warning' : 'normal';

  const statusConfig = {
    critical: {
      bg: 'bg-red-50 border-red-200 hover:bg-red-100',
      border: 'border-l-4 border-l-red-500',
      icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
      badge: 'bg-red-500',
    },
    warning: {
      bg: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
      border: 'border-l-4 border-l-amber-500',
      icon: <Clock className="h-5 w-5 text-amber-600" />,
      badge: 'bg-amber-500',
    },
    normal: {
      bg: 'bg-white border-gray-200 hover:bg-gray-50',
      border: 'border-l-4 border-l-gray-300',
      icon: <CheckCircle2 className="h-5 w-5 text-gray-400" />,
      badge: 'bg-gray-500',
    },
  };

  const config = statusConfig[vehicleStatus];

  return (
    <div className="mb-3">
      {/* Fila Principal del Vehículo */}
      <div
        className={`
          ${config.bg} ${config.border}
          border rounded-lg
          transition-all duration-200 cursor-pointer
          ${isExpanded ? 'shadow-md' : 'shadow-sm'}
        `}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="px-4 py-4">
          <div className="flex items-center gap-4">
            {/* Indicador Visual de Estado */}
            <div className="flex-shrink-0">
              {config.icon}
            </div>

            {/* Foto del Vehículo */}
            <div className="flex-shrink-0">
              <div className="relative h-14 w-20 rounded-lg overflow-hidden bg-gray-200 border-2 border-white shadow-sm">
                <Image
                  src={vehicle.vehiclePhoto}
                  alt={vehicle.vehiclePlate}
                  fill
                  className="object-cover"
                />
              </div>
            </div>

            {/* Info del Vehículo */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-bold text-gray-900">{vehicle.vehiclePlate}</h3>
                {/* Badges de Alertas */}
                <div className="flex gap-1.5">
                  {criticalCount > 0 && (
                    <Badge variant="destructive" className="text-xs px-2 py-0.5 font-semibold">
                      🔴 {criticalCount}
                    </Badge>
                  )}
                  {highCount > 0 && (
                    <Badge className="text-xs px-2 py-0.5 bg-amber-500 hover:bg-amber-600 font-semibold">
                      ⚠️ {highCount}
                    </Badge>
                  )}
                  {mediumCount > 0 && (
                    <Badge className="text-xs px-2 py-0.5 bg-yellow-500 hover:bg-yellow-600 font-semibold">
                      🕒 {mediumCount}
                    </Badge>
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600">
                {vehicle.brandName} {vehicle.lineName}
              </p>
            </div>

            {/* Km Actual */}
            <div className="text-center px-4 border-l border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Km Actual</p>
              <p className="text-lg font-bold text-gray-900">
                {nextAlert?.currentKm.toLocaleString()}
              </p>
            </div>

            {/* Próximo Vencimiento */}
            <div className="text-center px-4 border-l border-gray-200 min-w-[140px]">
              <p className="text-xs text-gray-500 mb-1">Próximo Venc.</p>
              {nextAlert && (
                <div>
                  <p className={`text-lg font-bold ${
                    nextAlert.kmToMaintenance <= 0 ? 'text-red-600' :
                    nextAlert.kmToMaintenance <= 500 ? 'text-amber-600' : 'text-gray-900'
                  }`}>
                    {nextAlert.kmToMaintenance <= 0
                      ? `VENCIDO`
                      : `${nextAlert.kmToMaintenance} km`
                    }
                  </p>
                  <p className="text-xs text-gray-500 truncate max-w-[120px]">
                    {nextAlert.itemName}
                  </p>
                </div>
              )}
            </div>

            {/* Costo Estimado */}
            <div className="text-right px-4 border-l border-gray-200">
              <p className="text-xs text-gray-500 mb-1">Costo Est.</p>
              <p className="text-lg font-bold text-green-600">
                ${(totalCost / 1000).toFixed(0)}k
              </p>
              <p className="text-xs text-gray-500">
                {totalDuration.toFixed(1)} hrs
              </p>
            </div>

            {/* Botón Expandir */}
            <div className="flex-shrink-0 pl-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5 text-gray-600" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-600" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Expandido con Animación */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-2 ml-4 mr-4 mb-2 bg-gray-50 rounded-lg border border-gray-200 p-4">
              {/* Agrupar por paquete */}
              {Object.values(
                vehicle.alerts.reduce((acc, alert) => {
                  const key = alert.packageName;
                  if (!acc[key]) {
                    acc[key] = {
                      packageName: alert.packageName,
                      scheduledKm: alert.scheduledKm,
                      alerts: [],
                    };
                  }
                  acc[key].alerts.push(alert);
                  return acc;
                }, {} as Record<string, { packageName: string; scheduledKm: number; alerts: MaintenanceAlert[] }>)
              )
              .sort((a, b) => a.scheduledKm - b.scheduledKm)
              .map((pkg, pkgIndex) => {
                const packageAlertIds = pkg.alerts.map(a => a.id);
                const allPackageSelected = packageAlertIds.every(id => selectedAlertIds.includes(id));
                const packageCritical = pkg.alerts.filter(a => a.alertLevel === 'CRITICAL').length;

                return (
                  <motion.div
                    key={pkg.packageName}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: pkgIndex * 0.1 }}
                    className="mb-4 last:mb-0"
                  >
                    {/* Header del Paquete */}
                    <div className="flex items-center gap-3 mb-3 bg-white rounded-lg px-4 py-3 border-2 border-gray-200 shadow-sm">
                      <Checkbox
                        checked={allPackageSelected}
                        onCheckedChange={() => onTogglePackage(pkg.alerts)}
                        className="h-5 w-5"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900 text-base">{pkg.packageName}</span>
                          <Badge variant="outline" className="text-xs font-semibold">
                            {pkg.scheduledKm.toLocaleString()} km
                          </Badge>
                          {packageCritical > 0 && (
                            <Badge variant="destructive" className="text-xs font-semibold animate-pulse">
                              {packageCritical} crítica{packageCritical > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <span className="text-sm text-gray-500 font-medium">
                        {pkg.alerts.length} items
                      </span>
                    </div>

                    {/* Items del Paquete */}
                    <div className="ml-8 space-y-2">
                      {pkg.alerts.map((alert, alertIndex) => {
                        const isSelected = selectedAlertIds.includes(alert.id);
                        const isOverdue = alert.kmToMaintenance <= 0;
                        const isUrgent = alert.kmToMaintenance > 0 && alert.kmToMaintenance <= 500;

                        return (
                          <motion.div
                            key={alert.id}
                            initial={{ x: -10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: (pkgIndex * 0.1) + (alertIndex * 0.05) }}
                            className={`
                              flex items-center gap-3 px-4 py-3 rounded-lg text-sm
                              transition-all duration-200
                              ${isSelected
                                ? 'bg-blue-50 border-2 border-blue-400 shadow-sm'
                                : 'bg-white border-2 border-gray-200 hover:border-gray-300'
                              }
                              ${isOverdue ? 'border-l-4 !border-l-red-500' : ''}
                              ${isUrgent ? 'border-l-4 !border-l-amber-500' : ''}
                            `}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => onToggleAlert(alert.id)}
                              className="h-5 w-5"
                            />

                            <div className="flex-1 flex items-center gap-4">
                              {/* Nombre del Item */}
                              <span className="font-semibold text-gray-900 min-w-[220px]">
                                {alert.itemName}
                              </span>

                              {/* Km Restantes */}
                              <div className="min-w-[140px]">
                                <span className={`font-bold text-base ${
                                  isOverdue ? 'text-red-600' :
                                  isUrgent ? 'text-amber-600' : 'text-gray-700'
                                }`}>
                                  {isOverdue
                                    ? `${Math.abs(alert.kmToMaintenance)} km VENCIDO`
                                    : `${alert.kmToMaintenance} km`
                                  }
                                </span>
                              </div>

                              {/* Costo */}
                              {alert.estimatedCost && (
                                <span className="text-green-600 font-semibold min-w-[100px]">
                                  ${Math.round(alert.estimatedCost).toLocaleString()}
                                </span>
                              )}

                              {/* Tiempo */}
                              {alert.estimatedDuration && (
                                <span className="text-gray-600 font-medium">
                                  {alert.estimatedDuration.toFixed(1)} hrs
                                </span>
                              )}
                            </div>

                            {/* Badge de Prioridad */}
                            {alert.priority === 'URGENT' && (
                              <Badge variant="destructive" className="text-xs font-bold animate-pulse">
                                URGENTE
                              </Badge>
                            )}
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

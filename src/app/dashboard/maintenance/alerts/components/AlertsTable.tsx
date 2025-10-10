'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { MaintenanceAlert } from '@/lib/hooks/useMaintenanceAlerts';
import {
  ChevronDown,
  ChevronUp,
  Plus,
} from 'lucide-react';
import Image from 'next/image';

interface VehicleGroup {
  vehicleId: number;
  vehiclePlate: string;
  vehiclePhoto: string;
  brandName: string;
  lineName: string;
  alerts: MaintenanceAlert[];
}

interface Props {
  vehicles: VehicleGroup[];
  selectedAlertIds: number[];
  onSelectionChange: (ids: number[]) => void;
  onCreateWorkOrder: () => void;
}

export function AlertsTable({
  vehicles,
  selectedAlertIds,
  onSelectionChange,
  onCreateWorkOrder,
}: Props) {
  const [expandedVehicleId, setExpandedVehicleId] = useState<number | null>(null);

  const handleToggleVehicle = (vehicleId: number) => {
    setExpandedVehicleId(expandedVehicleId === vehicleId ? null : vehicleId);
  };

  const handleToggleAlert = (alertId: number) => {
    if (selectedAlertIds.includes(alertId)) {
      onSelectionChange(selectedAlertIds.filter(id => id !== alertId));
    } else {
      onSelectionChange([...selectedAlertIds, alertId]);
    }
  };

  const handleTogglePackage = (packageAlerts: MaintenanceAlert[]) => {
    const packageAlertIds = packageAlerts.map(a => a.id);
    const allSelected = packageAlertIds.every(id => selectedAlertIds.includes(id));

    if (allSelected) {
      onSelectionChange(selectedAlertIds.filter(id => !packageAlertIds.includes(id)));
    } else {
      const newIds = [...new Set([...selectedAlertIds, ...packageAlertIds])];
      onSelectionChange(newIds);
    }
  };

  // Calcular totales de selección
  const selectedAlerts = vehicles.flatMap(v => v.alerts).filter(a => selectedAlertIds.includes(a.id));
  const selectedCost = selectedAlerts.reduce((sum, a) => sum + (a.estimatedCost || 0), 0);
  const selectedDuration = selectedAlerts.reduce((sum, a) => sum + (a.estimatedDuration || 0), 0);

  return (
    <div className="space-y-4">
      {/* Tabla principal */}
      <div className="border rounded-lg overflow-hidden bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="w-12 px-4 py-3 text-left">
                <Checkbox disabled />
              </th>
              <th className="w-16 px-2 py-3"></th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Vehículo</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Alertas</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Km Actual</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Próximo Venc.</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Costo Est.</th>
              <th className="px-4 py-3 text-right font-semibold text-gray-700">Tiempo Est.</th>
              <th className="w-12 px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => {
              const isExpanded = expandedVehicleId === vehicle.vehicleId;
              const criticalCount = vehicle.alerts.filter(a => a.alertLevel === 'CRITICAL').length;
              const highCount = vehicle.alerts.filter(a => a.alertLevel === 'HIGH').length;
              const mediumCount = vehicle.alerts.filter(a => a.alertLevel === 'MEDIUM').length;

              const totalCost = vehicle.alerts.reduce((sum, a) => sum + (a.estimatedCost || 0), 0);
              const totalDuration = vehicle.alerts.reduce((sum, a) => sum + (a.estimatedDuration || 0), 0);

              const nextAlert = [...vehicle.alerts].sort((a, b) => a.kmToMaintenance - b.kmToMaintenance)[0];

              const bgColor = criticalCount > 0 ? 'bg-red-50' : highCount > 0 ? 'bg-yellow-50' : '';

              return (
                <>
                  {/* Fila principal del vehículo */}
                  <tr
                    key={vehicle.vehicleId}
                    className={`border-b hover:bg-gray-50 cursor-pointer ${bgColor}`}
                    onClick={() => handleToggleVehicle(vehicle.vehicleId)}
                  >
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <Checkbox disabled />
                    </td>
                    <td className="px-2 py-3">
                      <div className="relative h-10 w-16 rounded overflow-hidden bg-gray-200">
                        <Image
                          src={vehicle.vehiclePhoto}
                          alt={vehicle.vehiclePlate}
                          fill
                          className="object-cover"
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{vehicle.vehiclePlate}</div>
                      <div className="text-xs text-gray-500">{vehicle.brandName} {vehicle.lineName}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5">
                        {criticalCount > 0 && (
                          <Badge variant="destructive" className="text-xs px-1.5 py-0">
                            🔴 {criticalCount}
                          </Badge>
                        )}
                        {highCount > 0 && (
                          <Badge className="text-xs px-1.5 py-0 bg-orange-500">
                            ⚠️ {highCount}
                          </Badge>
                        )}
                        {mediumCount > 0 && (
                          <Badge className="text-xs px-1.5 py-0 bg-yellow-500">
                            🕒 {mediumCount}
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {nextAlert?.currentKm.toLocaleString()} km
                    </td>
                    <td className="px-4 py-3">
                      {nextAlert && (
                        <div>
                          <span className={`font-semibold ${
                            nextAlert.kmToMaintenance <= 0 ? 'text-red-600' :
                            nextAlert.kmToMaintenance <= 500 ? 'text-orange-600' : 'text-gray-700'
                          }`}>
                            {nextAlert.kmToMaintenance <= 0
                              ? `${Math.abs(nextAlert.kmToMaintenance)} km VENCIDO`
                              : `${nextAlert.kmToMaintenance} km`
                            }
                          </span>
                          <div className="text-xs text-gray-500 truncate max-w-[200px]">
                            {nextAlert.itemName}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      ${Math.round(totalCost).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {totalDuration.toFixed(1)} hrs
                    </td>
                    <td className="px-4 py-3 text-center">
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-gray-500" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-500" />
                      )}
                    </td>
                  </tr>

                  {/* Fila expandida con items */}
                  {isExpanded && (
                    <tr>
                      <td colSpan={9} className="px-0 py-0 bg-gray-50">
                        <div className="px-6 py-4">
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
                          .map((pkg) => {
                            const packageAlertIds = pkg.alerts.map(a => a.id);
                            const allPackageSelected = packageAlertIds.every(id => selectedAlertIds.includes(id));
                            const packageCritical = pkg.alerts.filter(a => a.alertLevel === 'CRITICAL').length;

                            return (
                              <div key={pkg.packageName} className="mb-4 last:mb-0">
                                {/* Header del paquete */}
                                <div className="flex items-center gap-3 mb-2 bg-white rounded-lg px-4 py-2 border">
                                  <Checkbox
                                    checked={allPackageSelected}
                                    onCheckedChange={() => handleTogglePackage(pkg.alerts)}
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="font-semibold text-gray-900">{pkg.packageName}</span>
                                      <Badge variant="outline" className="text-xs">
                                        {pkg.scheduledKm.toLocaleString()} km
                                      </Badge>
                                      {packageCritical > 0 && (
                                        <Badge variant="destructive" className="text-xs">
                                          {packageCritical} crítica{packageCritical > 1 ? 's' : ''}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-sm text-gray-500">{pkg.alerts.length} items</span>
                                </div>

                                {/* Items del paquete - tabla compacta */}
                                <div className="ml-8 space-y-1">
                                  {pkg.alerts.map((alert) => {
                                    const isSelected = selectedAlertIds.includes(alert.id);
                                    const isOverdue = alert.kmToMaintenance <= 0;

                                    return (
                                      <div
                                        key={alert.id}
                                        className={`flex items-center gap-3 px-3 py-2 rounded text-sm ${
                                          isSelected ? 'bg-blue-50 border border-blue-300' : 'bg-white border border-gray-200'
                                        }`}
                                      >
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={() => handleToggleAlert(alert.id)}
                                        />
                                        <div className="flex-1 flex items-center gap-4">
                                          <span className="font-medium text-gray-900 min-w-[200px]">{alert.itemName}</span>
                                          <span className={`font-semibold min-w-[120px] ${
                                            isOverdue ? 'text-red-600' : 'text-gray-700'
                                          }`}>
                                            {isOverdue
                                              ? `${Math.abs(alert.kmToMaintenance)} km VENCIDO`
                                              : `${alert.kmToMaintenance} km`
                                            }
                                          </span>
                                          {alert.estimatedCost && (
                                            <span className="text-gray-600 min-w-[80px]">
                                              ${Math.round(alert.estimatedCost).toLocaleString()}
                                            </span>
                                          )}
                                          {alert.estimatedDuration && (
                                            <span className="text-gray-600">
                                              {alert.estimatedDuration.toFixed(1)} hrs
                                            </span>
                                          )}
                                        </div>
                                        {alert.priority === 'URGENT' && (
                                          <Badge variant="destructive" className="text-xs">URGENTE</Badge>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer con totales y botón crear WO */}
      {selectedAlertIds.length > 0 && (
        <div className="sticky bottom-4 bg-blue-600 text-white rounded-lg shadow-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-6">
              <div>
                <p className="text-xs text-blue-100">Items seleccionados</p>
                <p className="text-xl font-bold">{selectedAlertIds.length}</p>
              </div>
              <div>
                <p className="text-xs text-blue-100">Costo estimado</p>
                <p className="text-xl font-bold">${Math.round(selectedCost).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-blue-100">Tiempo estimado</p>
                <p className="text-xl font-bold">{selectedDuration.toFixed(1)} hrs</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onSelectionChange([])}
                className="bg-white text-blue-600 hover:bg-blue-50"
              >
                Cancelar
              </Button>
              <Button
                onClick={onCreateWorkOrder}
                className="gap-2 bg-white text-blue-600 hover:bg-blue-50"
              >
                <Plus className="h-4 w-4" />
                Crear Orden de Trabajo
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

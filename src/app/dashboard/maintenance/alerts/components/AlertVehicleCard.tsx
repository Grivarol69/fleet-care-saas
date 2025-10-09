'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { MaintenanceAlert } from '@/lib/hooks/useMaintenanceAlerts';
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Clock,
  DollarSign,
  Wrench,
  Plus,
  Lightbulb
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
  vehicleGroup: VehicleGroup;
  isExpanded: boolean;
  onToggle: () => void;
  selectedAlertIds: number[];
  onSelectionChange: (ids: number[]) => void;
  onCreateWorkOrder: () => void;
}

export function AlertVehicleCard({
  vehicleGroup,
  isExpanded,
  onToggle,
  selectedAlertIds,
  onSelectionChange,
  onCreateWorkOrder,
}: Props) {
  const { alerts, vehiclePlate, vehiclePhoto, brandName, lineName } = vehicleGroup;

  // Calcular estadísticas
  const criticalCount = alerts.filter(a => a.alertLevel === 'CRITICAL').length;
  const highCount = alerts.filter(a => a.alertLevel === 'HIGH').length;
  const mediumCount = alerts.filter(a => a.alertLevel === 'MEDIUM').length;

  const totalEstimatedCost = alerts.reduce((sum, a) => sum + (a.estimatedCost || 0), 0);
  const totalEstimatedDuration = alerts.reduce((sum, a) => sum + (a.estimatedDuration || 0), 0);

  // Encontrar próximo vencimiento
  const nextAlert = [...alerts].sort((a, b) => a.kmToMaintenance - b.kmToMaintenance)[0];

  // Determinar color del borde
  const getBorderColor = () => {
    if (criticalCount > 0) return 'border-l-red-500';
    if (highCount > 0) return 'border-l-yellow-500';
    return 'border-l-green-500';
  };

  const getBgColor = () => {
    if (criticalCount > 0) return 'bg-red-50';
    if (highCount > 0) return 'bg-yellow-50';
    return 'bg-white';
  };

  // Agrupar alertas por paquete
  const alertsByPackage = alerts.reduce((acc, alert) => {
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
  }, {} as Record<string, { packageName: string; scheduledKm: number; alerts: MaintenanceAlert[] }>);

  const packages = Object.values(alertsByPackage).sort((a, b) => a.scheduledKm - b.scheduledKm);

  // Handlers de selección
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
      // Deseleccionar todos
      onSelectionChange(selectedAlertIds.filter(id => !packageAlertIds.includes(id)));
    } else {
      // Seleccionar todos
      const newIds = [...new Set([...selectedAlertIds, ...packageAlertIds])];
      onSelectionChange(newIds);
    }
  };

  const selectedAlertsData = alerts.filter(a => selectedAlertIds.includes(a.id));
  const selectedCost = selectedAlertsData.reduce((sum, a) => sum + (a.estimatedCost || 0), 0);
  const selectedDuration = selectedAlertsData.reduce((sum, a) => sum + (a.estimatedDuration || 0), 0);

  return (
    <Card className={`border-l-4 ${getBorderColor()} ${getBgColor()} transition-all duration-300 hover:shadow-lg`}>
      <CardContent className="p-0">

        {/* Card Header - Siempre visible */}
        <div
          className="p-6 cursor-pointer flex items-center gap-6"
          onClick={onToggle}
        >
          {/* Foto del vehículo */}
          <div className="relative h-20 w-32 flex-shrink-0 rounded-lg overflow-hidden bg-gray-200">
            <Image
              src={vehiclePhoto}
              alt={vehiclePlate}
              fill
              className="object-cover"
            />
          </div>

          {/* Info del vehículo */}
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {brandName} {lineName}
                </h3>
                <p className="text-lg text-gray-600 font-semibold">{vehiclePlate}</p>
              </div>

              <Button variant="ghost" size="sm">
                {isExpanded ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </Button>
            </div>

            {/* Badges de alertas */}
            <div className="flex gap-2 mt-3">
              {criticalCount > 0 && (
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {criticalCount} crítica{criticalCount > 1 ? 's' : ''}
                </Badge>
              )}
              {highCount > 0 && (
                <Badge className="gap-1 bg-orange-500 hover:bg-orange-600">
                  <AlertTriangle className="h-3 w-3" />
                  {highCount} urgente{highCount > 1 ? 's' : ''}
                </Badge>
              )}
              {mediumCount > 0 && (
                <Badge className="gap-1 bg-yellow-500 hover:bg-yellow-600">
                  <Clock className="h-3 w-3" />
                  {mediumCount} próxima{mediumCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>

            {/* Métricas */}
            <div className="flex gap-6 mt-3 text-sm">
              <div className="flex items-center gap-1.5 text-gray-600">
                <DollarSign className="h-4 w-4" />
                <span className="font-semibold">
                  ${Math.round(totalEstimatedCost).toLocaleString()}
                </span>
                <span className="text-gray-400">est.</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600">
                <Wrench className="h-4 w-4" />
                <span className="font-semibold">{totalEstimatedDuration.toFixed(1)} hrs</span>
                <span className="text-gray-400">est.</span>
              </div>
            </div>

            {/* Próximo vencimiento */}
            {nextAlert && (
              <div className="mt-3 text-sm">
                <span className="text-gray-500">Próximo vencimiento: </span>
                <span
                  className={`font-bold ${
                    nextAlert.kmToMaintenance <= 0
                      ? 'text-red-600'
                      : nextAlert.kmToMaintenance <= 500
                      ? 'text-orange-600'
                      : 'text-yellow-600'
                  }`}
                >
                  {nextAlert.kmToMaintenance <= 0
                    ? `${Math.abs(nextAlert.kmToMaintenance)} km VENCIDO`
                    : `${nextAlert.kmToMaintenance} km`}
                </span>
                <span className="text-gray-500"> - {nextAlert.itemName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Card Expanded - Lista de items */}
        {isExpanded && (
          <div className="border-t bg-white">
            <div className="p-6 space-y-4">

              {/* Items agrupados por paquete */}
              {packages.map((pkg) => {
                const packageAlertIds = pkg.alerts.map(a => a.id);
                const allPackageSelected = packageAlertIds.every(id => selectedAlertIds.includes(id));

                const packageCritical = pkg.alerts.filter(a => a.alertLevel === 'CRITICAL').length;
                const packageCost = pkg.alerts.reduce((sum, a) => sum + (a.estimatedCost || 0), 0);
                const packageDuration = pkg.alerts.reduce((sum, a) => sum + (a.estimatedDuration || 0), 0);

                return (
                  <div
                    key={pkg.packageName}
                    className={`border rounded-lg p-4 ${
                      packageCritical > 0
                        ? 'border-red-300 bg-red-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    {/* Header del paquete */}
                    <div className="flex items-center gap-3 mb-3">
                      <Checkbox
                        checked={allPackageSelected}
                        onCheckedChange={() => handleTogglePackage(pkg.alerts)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{pkg.packageName}</h4>
                          <Badge variant="outline" className="text-xs">
                            {pkg.scheduledKm.toLocaleString()} km
                          </Badge>
                          {packageCritical > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {packageCritical} crítica{packageCritical > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-4 mt-1 text-sm text-gray-600">
                          <span>${Math.round(packageCost).toLocaleString()}</span>
                          <span>{packageDuration.toFixed(1)} hrs</span>
                          <span>{pkg.alerts.length} item{pkg.alerts.length > 1 ? 's' : ''}</span>
                        </div>
                      </div>
                    </div>

                    {/* Items del paquete */}
                    <div className="space-y-2 ml-8">
                      {pkg.alerts.map((alert) => {
                        const isSelected = selectedAlertIds.includes(alert.id);
                        const isOverdue = alert.kmToMaintenance <= 0;
                        const isUrgent = alert.kmToMaintenance <= 500;

                        return (
                          <div
                            key={alert.id}
                            className={`flex items-center gap-3 p-3 rounded-md border transition-all ${
                              isSelected
                                ? 'bg-blue-50 border-blue-300'
                                : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleAlert(alert.id)}
                            />

                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-gray-900">{alert.itemName}</p>
                                {alert.priority === 'URGENT' && (
                                  <Badge variant="destructive" className="text-xs">URGENTE</Badge>
                                )}
                              </div>
                              <div className="flex gap-4 mt-1 text-sm text-gray-600">
                                <span
                                  className={`font-semibold ${
                                    isOverdue
                                      ? 'text-red-600'
                                      : isUrgent
                                      ? 'text-orange-600'
                                      : 'text-green-600'
                                  }`}
                                >
                                  {isOverdue
                                    ? `${Math.abs(alert.kmToMaintenance)} km VENCIDO`
                                    : `${alert.kmToMaintenance} km`}
                                </span>
                                {alert.estimatedCost && (
                                  <span>${Math.round(alert.estimatedCost).toLocaleString()}</span>
                                )}
                                {alert.estimatedDuration && (
                                  <span>{alert.estimatedDuration.toFixed(1)} hrs</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Sugerencia si todos los items críticos están juntos */}
                    {packageCritical > 1 && (
                      <div className="mt-3 ml-8 flex items-start gap-2 text-sm bg-blue-50 border border-blue-200 rounded-md p-3">
                        <Lightbulb className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-blue-900">Recomendación</p>
                          <p className="text-blue-700">
                            Realizar los {packageCritical} items críticos juntos para optimizar tiempo y costos
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Footer con totales y acciones */}
              {selectedAlertIds.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-8">
                      <div>
                        <p className="text-sm text-gray-600">Items seleccionados</p>
                        <p className="text-2xl font-bold text-gray-900">
                          {selectedAlertIds.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Costo estimado</p>
                        <p className="text-2xl font-bold text-blue-600">
                          ${Math.round(selectedCost).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Tiempo estimado</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {selectedDuration.toFixed(1)} hrs
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => onSelectionChange([])}
                      >
                        Cancelar
                      </Button>
                      <Button onClick={onCreateWorkOrder} className="gap-2">
                        <Plus className="h-4 w-4" />
                        Crear Orden de Trabajo
                      </Button>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}

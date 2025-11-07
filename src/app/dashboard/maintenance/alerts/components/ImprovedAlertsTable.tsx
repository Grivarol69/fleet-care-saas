'use client';

import { Button } from '@/components/ui/button';
import { MaintenanceAlert } from '@/lib/hooks/useMaintenanceAlerts';
import { Plus, X } from 'lucide-react';
import { VehicleAlertRow } from './VehicleAlertRow';
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
  vehicles: VehicleGroup[];
  selectedAlertIds: number[];
  onSelectionChange: (ids: number[]) => void;
  onCreateWorkOrder: () => void;
}

export function ImprovedAlertsTable({
  vehicles,
  selectedAlertIds,
  onSelectionChange,
  onCreateWorkOrder,
}: Props) {
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

  // Validar si hay alertas en progreso
  const inProgressCount = selectedAlerts.filter(a => a.status === 'IN_PROGRESS').length;
  const hasInProgressAlerts = inProgressCount > 0;
  const allInProgress = inProgressCount === selectedAlerts.length;

  // Ordenar vehículos: críticos primero, luego advertencia, luego normales
  const sortedVehicles = [...vehicles].sort((a, b) => {
    const aCritical = a.alerts.filter(alert => alert.alertLevel === 'CRITICAL').length;
    const bCritical = b.alerts.filter(alert => alert.alertLevel === 'CRITICAL').length;
    const aHigh = a.alerts.filter(alert => alert.alertLevel === 'HIGH').length;
    const bHigh = b.alerts.filter(alert => alert.alertLevel === 'HIGH').length;

    if (aCritical !== bCritical) return bCritical - aCritical;
    if (aHigh !== bHigh) return bHigh - aHigh;
    return 0;
  });

  return (
    <div className="space-y-4">
      {/* Lista de Vehículos */}
      <div className="space-y-3">
        {sortedVehicles.map((vehicle, index) => (
          <motion.div
            key={vehicle.vehicleId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <VehicleAlertRow
              vehicle={vehicle}
              selectedAlertIds={selectedAlertIds}
              onToggleAlert={handleToggleAlert}
              onTogglePackage={handleTogglePackage}
            />
          </motion.div>
        ))}
      </div>

      {/* Footer Sticky con Totales y Botón Crear OT */}
      <AnimatePresence>
        {selectedAlertIds.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50"
            style={{ width: 'calc(100% - 48px)', maxWidth: '1200px' }}
          >
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl shadow-2xl p-6 border-4 border-blue-400">
              <div className="flex items-center justify-between">
                {/* Métricas de Selección */}
                <div className="flex gap-8">
                  <div className="text-center">
                    <p className="text-xs text-blue-100 uppercase tracking-wider mb-1">Items</p>
                    <p className="text-3xl font-black">{selectedAlertIds.length}</p>
                  </div>

                  <div className="w-px bg-blue-400"></div>

                  <div className="text-center">
                    <p className="text-xs text-blue-100 uppercase tracking-wider mb-1">Inversión</p>
                    <p className="text-3xl font-black">
                      ${(selectedCost / 1000).toFixed(0)}k
                    </p>
                    <p className="text-xs text-blue-200">
                      ${Math.round(selectedCost).toLocaleString()}
                    </p>
                  </div>

                  <div className="w-px bg-blue-400"></div>

                  <div className="text-center">
                    <p className="text-xs text-blue-100 uppercase tracking-wider mb-1">Tiempo</p>
                    <p className="text-3xl font-black">
                      {selectedDuration.toFixed(1)}h
                    </p>
                    <p className="text-xs text-blue-200">estimado</p>
                  </div>

                  <div className="w-px bg-blue-400"></div>

                  <div className="text-center">
                    <p className="text-xs text-blue-100 uppercase tracking-wider mb-1">Vehículos</p>
                    <p className="text-3xl font-black">
                      {new Set(selectedAlerts.map(a => {
                        const vehicle = vehicles.find(v => v.alerts.some(alert => alert.id === a.id));
                        return vehicle?.vehicleId;
                      })).size}
                    </p>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="flex flex-col gap-2 items-end">
                  {hasInProgressAlerts && (
                    <p className="text-xs text-yellow-200 font-semibold">
                      ⚠️ {inProgressCount} item{inProgressCount > 1 ? 's' : ''} ya {inProgressCount > 1 ? 'están' : 'está'} en progreso
                    </p>
                  )}
                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => onSelectionChange([])}
                      className="bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm font-semibold"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Cancelar
                    </Button>
                    <Button
                      onClick={onCreateWorkOrder}
                      disabled={allInProgress}
                      className="gap-2 bg-white text-blue-600 hover:bg-blue-50 font-bold text-lg px-8 py-6 shadow-xl hover:shadow-2xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <Plus className="h-5 w-5" />
                      Crear Orden de Trabajo
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

export interface ScheduleResponse {
  scheduledWorkOrders: {
    id: string;
    title: string;
    startDate: string;
    endDate: string | null;
    notes: string | null;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    status: 'PENDING' | 'APPROVED';
    vehicle: { licensePlate: string };
  }[];
  pendingAlerts: {
    id: string;
    itemName: string;
    vehiclePlate: string;
    kmToMaintenance: number;
    alertLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }[];
}

// Types
export interface MaintenanceAlert {
  id: string;
  programItemId: string;
  vehicleId: string;

  // Vehículo
  vehiclePlate: string;
  vehiclePhoto: string;
  brandName: string;
  lineName: string;

  // Mantenimiento
  itemName: string;
  packageName: string;
  description: string | null;

  // Kilometraje
  scheduledKm: number;
  currentKm: number;
  kmToMaintenance: number;

  // Priorización
  type: 'PREVENTIVE' | 'OVERDUE' | 'EARLY_WARNING';
  category: 'CRITICAL_SAFETY' | 'MAJOR_COMPONENT' | 'ROUTINE' | 'MINOR';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  alertLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  priorityScore: number;

  // Estado
  status:
  | 'PENDING'
  | 'ACKNOWLEDGED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CLOSED'
  | 'SNOOZED'
  | 'CANCELLED';

  // Costos
  estimatedCost: number | null;
  estimatedDuration: number | null;

  // WorkOrder
  workOrder: {
    id: string;
    title: string;
    status: string;
  } | null;

  // Tracking
  createdAt: string;
  acknowledgedAt: string | null;
  snoozedUntil: string | null;

  // Legacy
  mantItemDescription: string;
  executionKm: number;
  state: 'YELLOW' | 'RED';
}

interface AlertFilters {
  vehicleId?: string;
  status?: string;
  priority?: string;
}

/**
 * Hook para obtener alertas de mantenimiento
 */
export function useMaintenanceAlerts(filters?: AlertFilters) {
  return useQuery({
    queryKey: ['maintenance-alerts', filters],
    queryFn: async () => {
      const params = new URLSearchParams();

      if (filters?.vehicleId) {
        params.append('vehicleId', filters.vehicleId);
      }
      if (filters?.status) {
        params.append('status', filters.status);
      }
      if (filters?.priority) {
        params.append('priority', filters.priority);
      }

      const { data } = await axios.get<MaintenanceAlert[]>(
        `/api/maintenance/alerts?${params.toString()}`
      );
      return data;
    },
    staleTime: 30 * 1000, // 30 segundos (las alertas cambian frecuentemente)
    refetchOnWindowFocus: true,
  });
}

/**
 * Hook para obtener alertas de un vehículo específico
 */
export function useVehicleAlerts(vehicleId: string) {
  return useMaintenanceAlerts({ vehicleId });
}

/**
 * Hook para actualizar estado de una alerta
 */
export function useUpdateAlertStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      alertId: string;
      status: string;
      notes?: string;
      snoozedUntil?: Date;
    }) => {
      const { data } = await axios.patch('/api/maintenance/alerts', params);
      return data;
    },
    onSuccess: () => {
      // Invalidar queries para refetch
      queryClient.invalidateQueries({ queryKey: ['maintenance-alerts'] });
    },
  });
}

/**
 * Hook para reconocer (acknowledge) una alerta
 */
export function useAcknowledgeAlert() {
  const updateStatus = useUpdateAlertStatus();

  return {
    acknowledgeAlert: (alertId: string) => {
      return updateStatus.mutateAsync({
        alertId,
        status: 'ACKNOWLEDGED',
      });
    },
    isLoading: updateStatus.isPending,
  };
}

/**
 * Hook para posponer (snooze) una alerta
 */
export function useSnoozeAlert() {
  const updateStatus = useUpdateAlertStatus();

  return {
    snoozeAlert: (alertId: string, snoozedUntil: Date, reason?: string) => {
      const params: {
        alertId: string;
        status: string;
        snoozedUntil: Date;
        notes?: string;
      } = {
        alertId,
        status: 'SNOOZED',
        snoozedUntil,
      };
      if (reason) params.notes = reason;

      return updateStatus.mutateAsync(params);
    },
    isLoading: updateStatus.isPending,
  };
}

/**
 * Hook para cancelar una alerta
 */
export function useCancelAlert() {
  const updateStatus = useUpdateAlertStatus();

  return {
    cancelAlert: (alertId: string, reason: string) => {
      return updateStatus.mutateAsync({
        alertId,
        status: 'CANCELLED',
        notes: reason,
      });
    },
    isLoading: updateStatus.isPending,
  };
}

/**
 * Hook para agrupar alertas por vehículo
 */
export function useAlertsGroupedByVehicle(filters?: AlertFilters) {
  const { data: alerts, ...rest } = useMaintenanceAlerts(filters);

  const groupedAlerts = alerts?.reduce(
    (acc, alert) => {
      const key = alert.vehicleId;
      if (!acc[key]) {
        acc[key] = {
          vehicleId: alert.vehicleId,
          vehiclePlate: alert.vehiclePlate,
          vehiclePhoto: alert.vehiclePhoto,
          brandName: alert.brandName,
          lineName: alert.lineName,
          alerts: [],
        };
      }
      acc[key].alerts.push(alert);
      return acc;
    },
    {} as Record<
      string,
      {
        vehicleId: string;
        vehiclePlate: string;
        vehiclePhoto: string;
        brandName: string;
        lineName: string;
        alerts: MaintenanceAlert[];
      }
    >
  );

  return {
    groupedAlerts: groupedAlerts ? Object.values(groupedAlerts) : [],
    ...rest,
  };
}

/**
 * Hook para obtener el calendario de mantenimiento (WOs programados + alertas pendientes)
 */
export function useMaintenanceSchedule() {
  return useQuery({
    queryKey: ['maintenance-schedule'],
    queryFn: async () => {
      const { data } = await axios.get<ScheduleResponse>('/api/maintenance/schedule');
      return data;
    },
    staleTime: 60 * 1000, // 1 min (schedule cambia menos que alertas)
  });
}

/**
 * Hook para agrupar alertas por paquete
 */
export function useAlertsGroupedByPackage(vehicleId?: string) {
  const { data: alerts, ...rest } = useMaintenanceAlerts(
    vehicleId ? { vehicleId } : undefined
  );

  const groupedAlerts = alerts?.reduce(
    (acc, alert) => {
      const key = alert.packageName;
      if (!acc[key]) {
        acc[key] = {
          packageName: alert.packageName,
          scheduledKm: alert.scheduledKm,
          alerts: [],
          totalEstimatedCost: 0,
          totalEstimatedDuration: 0,
        };
      }
      acc[key].alerts.push(alert);
      acc[key].totalEstimatedCost += alert.estimatedCost || 0;
      acc[key].totalEstimatedDuration += alert.estimatedDuration || 0;
      return acc;
    },
    {} as Record<
      string,
      {
        packageName: string;
        scheduledKm: number;
        alerts: MaintenanceAlert[];
        totalEstimatedCost: number;
        totalEstimatedDuration: number;
      }
    >
  );

  return {
    groupedAlerts: groupedAlerts ? Object.values(groupedAlerts) : [],
    ...rest,
  };
}

/**
 * Hook para obtener estadísticas de alertas
 */
export function useAlertStats(filters?: AlertFilters) {
  const { data: alerts } = useMaintenanceAlerts(filters);

  if (!alerts) {
    return {
      total: 0,
      byPriority: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 },
      byLevel: { LOW: 0, MEDIUM: 0, HIGH: 0, CRITICAL: 0 },
      byStatus: {},
      totalEstimatedCost: 0,
      totalEstimatedDuration: 0,
    };
  }

  return {
    total: alerts.length,
    byPriority: {
      LOW: alerts.filter(a => a.priority === 'LOW').length,
      MEDIUM: alerts.filter(a => a.priority === 'MEDIUM').length,
      HIGH: alerts.filter(a => a.priority === 'HIGH').length,
      URGENT: alerts.filter(a => a.priority === 'URGENT').length,
    },
    byLevel: {
      LOW: alerts.filter(a => a.alertLevel === 'LOW').length,
      MEDIUM: alerts.filter(a => a.alertLevel === 'MEDIUM').length,
      HIGH: alerts.filter(a => a.alertLevel === 'HIGH').length,
      CRITICAL: alerts.filter(a => a.alertLevel === 'CRITICAL').length,
    },
    byStatus: alerts.reduce(
      (acc, alert) => {
        acc[alert.status] = (acc[alert.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
    totalEstimatedCost: alerts.reduce(
      (sum, a) => sum + (a.estimatedCost || 0),
      0
    ),
    totalEstimatedDuration: alerts.reduce(
      (sum, a) => sum + (a.estimatedDuration || 0),
      0
    ),
  };
}

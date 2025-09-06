import { MaintenanceItemWithStatus, MaintenanceItemCalculated } from './types';

// Calcular el estado de alerta basado en KM restantes
export function calculateAlertLevel(kmUntilDue: number, status: string): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
  if (status === 'COMPLETED') return 'LOW';
  if (status === 'CANCELLED') return 'LOW';
  
  if (kmUntilDue <= 0) return 'CRITICAL'; // Vencido
  if (kmUntilDue <= 500) return 'HIGH';   // Próximo (menos de 500km)
  if (kmUntilDue <= 1000) return 'MEDIUM'; // Planeado (menos de 1000km)
  
  return 'LOW'; // Lejano (más de 1000km)
}

// Estimar fecha de vencimiento basado en KM promedio por día
export function estimateMaintenanceDate(currentKm: number, executionKm: number, averageKmPerDay: number = 50): Date {
  const kmRemaining = executionKm - currentKm;
  const daysUntilDue = Math.max(0, Math.ceil(kmRemaining / averageKmPerDay));
  
  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + daysUntilDue);
  
  return estimatedDate;
}

// Calcular datos adicionales para un item de mantenimiento
export function calculateMaintenanceItemData(item: MaintenanceItemWithStatus): MaintenanceItemCalculated {
  const currentVehicleKm = item.vehicleMantPlan.vehicle.mileage;
  const kmUntilDue = item.executionMileage - currentVehicleKm;
  const isOverdue = kmUntilDue <= 0;
  const alertLevel = calculateAlertLevel(kmUntilDue, item.status);
  
  // Estimar fecha basada en promedio de 50km por día (ajustable)
  const estimatedDate = estimateMaintenanceDate(currentVehicleKm, item.executionMileage);
  const daysUntilDue = Math.ceil((estimatedDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  
  return {
    ...item,
    currentVehicleKm,
    kmUntilDue,
    alertLevel,
    isOverdue,
    daysUntilDue: daysUntilDue > 0 ? daysUntilDue : 0,
    estimatedDate,
  };
}

// Obtener color del badge según el nivel de alerta
export function getAlertLevelColor(alertLevel: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (alertLevel) {
    case 'CRITICAL':
      return 'destructive';
    case 'HIGH':
      return 'destructive';
    case 'MEDIUM':
      return 'secondary';
    case 'LOW':
    default:
      return 'default';
  }
}

// Obtener color del badge según el estado
export function getStatusColor(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'COMPLETED':
      return 'default'; // Verde
    case 'IN_PROGRESS':
      return 'secondary'; // Azul
    case 'CANCELLED':
      return 'outline'; // Gris
    case 'PENDING':
    default:
      return 'secondary';
  }
}

// Obtener icono según el tipo de mantenimiento
export function getMantTypeIcon(mantType: string): string {
  switch (mantType) {
    case 'PREVENTIVE':
      return '🔧';
    case 'PREDICTIVE':
      return '📊';
    case 'CORRECTIVE':
      return '⚠️';
    case 'EMERGENCY':
      return '🚨';
    default:
      return '🔧';
  }
}

// Obtener texto legible del tipo de mantenimiento
export function getMantTypeText(mantType: string): string {
  switch (mantType) {
    case 'PREVENTIVE':
      return 'Preventivo';
    case 'PREDICTIVE':
      return 'Predictivo';
    case 'CORRECTIVE':
      return 'Correctivo';
    case 'EMERGENCY':
      return 'Emergencia';
    default:
      return 'Desconocido';
  }
}

// Obtener texto legible del estado
export function getStatusText(status: string): string {
  switch (status) {
    case 'PENDING':
      return 'Pendiente';
    case 'IN_PROGRESS':
      return 'En Progreso';
    case 'COMPLETED':
      return 'Completado';
    case 'CANCELLED':
      return 'Cancelado';
    default:
      return 'Desconocido';
  }
}

// Formatear número de kilómetros
export function formatKilometers(km: number): string {
  return new Intl.NumberFormat('es-CO').format(km) + ' km';
}

// Formatear fecha
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
}
// Tipos específicos para MaintenanceItemsTable
export interface MaintenanceItemWithStatus {
  id: number;
  vehicleMantPlanId: number;
  mantItemId: number;
  executionMileage: number;
  technicianId?: number;
  providerId?: number;
  startDate?: Date;
  endDate?: Date;
  cost?: number;
  notes?: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: Date;
  updatedAt: Date;
  
  // Datos relacionados
  mantItem: {
    id: number;
    name: string;
    description?: string;
    mantType: 'PREVENTIVE' | 'PREDICTIVE' | 'CORRECTIVE' | 'EMERGENCY';
    estimatedTime: number;
  };
  
  vehicleMantPlan: {
    id: number;
    assignedAt: Date;
    lastKmCheck?: number;
    vehicle: {
      id: number;
      licensePlate: string;
      mileage: number;
      brand?: {
        name: string;
      };
      line?: {
        name: string;
      };
    };
    mantPlan: {
      name: string;
      description?: string;
    };
  };
  
  technician?: {
    id: number;
    name: string;
  };
  
  provider?: {
    id: number;
    name: string;
  };
}

// Tipos calculados
export interface MaintenanceItemCalculated extends MaintenanceItemWithStatus {
  currentVehicleKm: number;
  kmUntilDue: number;
  alertLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isOverdue: boolean;
  daysUntilDue?: number;
  estimatedDate?: Date;
}

// Props para el componente tabla
export interface MaintenanceItemsTableProps {
  // Opcional: filtrar por vehículo específico
  vehicleId?: number | undefined;
  // Opcional: filtrar por plan específico
  mantPlanId?: number | undefined;
}
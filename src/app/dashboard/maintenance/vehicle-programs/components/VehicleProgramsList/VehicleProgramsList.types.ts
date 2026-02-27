// Types para VehicleProgramsList
export interface VehicleProgramsListProps {
  id: string;
  name: string;
  description?: string;
  vehicleId: string;
  assignmentKm: number;
  nextMaintenanceKm?: number;
  nextMaintenanceDesc?: string;
  isActive: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  generatedFrom?: string;
  generatedBy: string;
  createdAt: string;
  updatedAt: string;

  // Relaciones
  vehicle: {
    id: string;
    licensePlate: string;
    model: string;
    year: number;
    mileage: number;
    brand: {
      id: string;
      name: string;
    };
    line: {
      id: string;
      name: string;
    };
  };

  packages: VehicleProgramPackage[];
}

export interface VehicleProgramPackage {
  id: string;
  name: string;
  description?: string;
  triggerKm?: number;
  packageType: 'PREVENTIVE' | 'CORRECTIVE' | 'PREDICTIVE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedCost?: number;
  estimatedTime?: number;
  actualCost?: number;
  actualTime?: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledKm?: number;
  executedKm?: number;
  startDate?: string;
  endDate?: string;
  items: VehicleProgramItem[];
}

export interface VehicleProgramItem {
  id: string;
  mantType: 'PREVENTIVE' | 'CORRECTIVE' | 'PREDICTIVE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  order: number;
  scheduledKm?: number;
  detectedKm?: number;
  executedKm?: number;
  scheduledDate?: string;
  detectedDate?: string;
  executedDate?: string;
  estimatedCost?: number;
  estimatedTime?: number;
  actualCost?: number;
  actualTime?: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  urgency: boolean;
  notes?: string;
  description?: string;
  isOptional: boolean;

  // Relaciones
  mantItem: {
    id: string;
    name: string;
    description?: string;
    mantType: 'PREVENTIVE' | 'CORRECTIVE' | 'PREDICTIVE';
    estimatedTime: number;
    estimatedCost?: number;
  };

  technician?: {
    id: string;
    name: string;
  };

  provider?: {
    id: string;
    name: string;
  };
}

// Interfaces para formularios
export interface VehicleOption {
  id: string;
  licensePlate: string;
  model: string;
  year: number;
  mileage: number;
  brand: {
    name: string;
  };
  line: {
    name: string;
  };
}

export interface TemplateOption {
  id: string;
  name: string;
  description?: string;
  vehicleBrandId?: string;
  vehicleLineId?: string;
  packages: {
    id: string;
    name: string;
    triggerKm: number;
    packageType: string;
  }[];
}

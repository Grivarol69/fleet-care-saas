// Types para VehicleProgramsList
export interface VehicleProgramsListProps {
  id: number;
  name: string;
  description?: string;
  vehicleId: number;
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
    id: number;
    licensePlate: string;
    model: string;
    year: number;
    mileage: number;
    brand: {
      id: number;
      name: string;
    };
    line: {
      id: number;
      name: string;
    };
  };

  packages: VehicleProgramPackage[];
}

export interface VehicleProgramPackage {
  id: number;
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
  id: number;
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
    id: number;
    name: string;
    description?: string;
    mantType: 'PREVENTIVE' | 'CORRECTIVE' | 'PREDICTIVE';
    estimatedTime: number;
    estimatedCost?: number;
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

// Interfaces para formularios
export interface VehicleOption {
  id: number;
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
  id: number;
  name: string;
  description?: string;
  vehicleBrandId?: number;
  vehicleLineId?: number;
  packages: {
    id: number;
    name: string;
    triggerKm: number;
    packageType: string;
  }[];
}
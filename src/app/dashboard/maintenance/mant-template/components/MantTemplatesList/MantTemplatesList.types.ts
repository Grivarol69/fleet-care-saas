export type MantTemplatesListProps = {
  id: number;
  tenantId: string;
  name: string;
  description?: string | null;
  vehicleBrandId: number;
  vehicleLineId: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  // Relaciones
  brand: {
    id: number;
    name: string;
  };
  line: {
    id: number;
    name: string;
  };
  packages?: MaintenancePackage[];
  planTasks?: PlanTaskProps[];
};

export type PlanTaskProps = {
  id: number;
  planId: number;
  mantItemId: number;
  triggerKm: number;
  createdAt: string;
  mantItem: {
    id: number;
    name: string;
    mantType: 'PREVENTIVE' | 'PREDICTIVE' | 'CORRECTIVE' | 'EMERGENCY';
    estimatedTime: number;
  };
};

export interface MaintenancePackage {
  id: number;
  name: string;
  description?: string;
  triggerKm: number;
  estimatedCost?: number;
  estimatedTime?: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  packageType: 'PREVENTIVE' | 'CORRECTIVE' | 'PREDICTIVE';
  templateId: number;
  status: 'ACTIVE' | 'INACTIVE';
  packageItems?: PackageItem[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    packageItems: number;
  };
}

export interface PackageItem {
  id: number;
  packageId: number;
  mantItemId: number;
  mantItem: MantItem;
  triggerKm: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedCost?: number;
  estimatedTime?: number;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
}

export interface MantItem {
  id: number;
  name: string;
  description?: string;
  mantType: 'PREVENTIVE' | 'CORRECTIVE' | 'PREDICTIVE' | 'EMERGENCY';
  categoryId: number;
  category: {
    id: number;
    name: string;
  };
  estimatedTime: number;
  estimatedCost?: number;
  status: 'ACTIVE' | 'INACTIVE';
}
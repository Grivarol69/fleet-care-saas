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

export interface PackageListProps {
  templateId: number;
}

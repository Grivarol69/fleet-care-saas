export interface MaintenancePackage {
  id: number;
  templateId: number;
  name: string;
  triggerKm: number;
  description?: string;
  estimatedCost?: number;
  estimatedTime?: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  packageType: 'PREVENTIVE' | 'CORRECTIVE' | 'PREDICTIVE';
  createdAt: string;
  _count?: {
    packageItems: number;
  };
}

export interface PackageListProps {
  templateId: number;
}
export interface PackageItem {
  id: string;
  packageId: string;
  mantItemId: string;
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
  id: string;
  name: string;
  description?: string;
  mantType: 'PREVENTIVE' | 'CORRECTIVE' | 'PREDICTIVE' | 'EMERGENCY';
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
  estimatedTime: number;
  estimatedCost?: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface FormEditPackageItemProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  item: PackageItem | null;
  onEditItem: (item: PackageItem) => void;
}

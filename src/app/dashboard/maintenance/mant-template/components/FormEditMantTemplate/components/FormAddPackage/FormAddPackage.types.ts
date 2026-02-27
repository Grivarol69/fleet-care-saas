export interface FormAddPackageProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  templateId: string;
  onAddPackage: () => void;
}

export interface AddPackageFormData {
  name: string;
  triggerKm: number;
  description?: string;
  estimatedCost?: number;
  estimatedTime?: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  packageType: 'PREVENTIVE' | 'CORRECTIVE' | 'PREDICTIVE';
}

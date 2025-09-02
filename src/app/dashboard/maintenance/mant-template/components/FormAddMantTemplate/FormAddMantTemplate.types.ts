export interface FormAddMantTemplateProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onAddTemplate: (template: MantTemplateResponse) => void;
}

export interface MantTemplateResponse {
  id: number;
  tenantId: string;
  name: string;
  description?: string | null;
  vehicleBrandId: number;
  vehicleLineId: number;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  brand: {
    id: number;
    name: string;
  };
  line: {
    id: number;
    name: string;
  };
  planTasks: {
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
  }[];
}

export interface VehicleBrand {
  id: number;
  tenantId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleLine {
  id: number;
  tenantId: string;
  name: string;
  brandId: number;
  createdAt: string;
  updatedAt: string;
  brand?: {
    name: string;
  };
}
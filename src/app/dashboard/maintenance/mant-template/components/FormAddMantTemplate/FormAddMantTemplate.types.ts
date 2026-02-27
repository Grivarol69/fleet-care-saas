export interface FormAddMantTemplateProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onAddTemplate: (template: MantTemplateResponse) => void;
}

export interface MantTemplateResponse {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  vehicleBrandId: string;
  vehicleLineId: string;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  brand: {
    id: string;
    name: string;
  };
  line: {
    id: string;
    name: string;
  };
  planTasks: {
    id: string;
    planId: number;
    mantItemId: string;
    triggerKm: number;
    createdAt: string;
    mantItem: {
      id: string;
      name: string;
      mantType: 'PREVENTIVE' | 'PREDICTIVE' | 'CORRECTIVE' | 'EMERGENCY';
      estimatedTime: number;
    };
  }[];
}

export interface VehicleBrand {
  id: string;
  tenantId: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleLine {
  id: string;
  tenantId: string;
  name: string;
  brandId: string;
  createdAt: string;
  updatedAt: string;
  brand?: {
    name: string;
  };
}

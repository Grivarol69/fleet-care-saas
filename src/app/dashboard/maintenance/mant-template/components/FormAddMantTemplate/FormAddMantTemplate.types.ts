export interface FormAddMantTemplateProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onAddTemplate: (template: MantTemplateResponse) => void;
}

export interface VehicleType {
  id: string;
  name: string;
}

export interface MantTemplateResponse {
  id: string;
  tenantId: string;
  name: string;
  description?: string | null;
  vehicleTypeId: string;
  vehicleBrandId: string | null;
  vehicleLineId: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  createdAt: string;
  updatedAt: string;
  vehicleType: {
    id: string;
    name: string;
  };
  brand: {
    id: string;
    name: string;
  } | null;
  line: {
    id: string;
    name: string;
  } | null;
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

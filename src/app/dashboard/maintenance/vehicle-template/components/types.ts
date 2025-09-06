// Tipos para la funcionalidad de vehicle-template
interface BaseEntity {
  id: number;
  tenantId: string;
}

// Tipos para Vehículos (basado en nuestro schema)
export interface Vehicle extends BaseEntity {
  licensePlate: string;
  brandId: number;
  lineId: number;
  typeId: number;
  year: number;
  color: string;
  mileage: number;
  // Datos relacionados que vienen del JOIN
  brand?: {
    name: string;
  };
  line?: {
    name: string;
  };
  type?: {
    name: string;
  };
  typePlate: string;
}

// Tipos para Planes de Mantenimiento (basado en nuestro schema)
export interface MantPlan extends BaseEntity {
  name: string;
  description?: string;
  vehicleBrandId: number;
  vehicleLineId: number;
  status: string;
  // Datos relacionados que vienen del JOIN
  brand?: {
    name: string;
  };
  line?: {
    name: string;
  };
}

// Tipos para la relación Vehicle-MantPlan (basado en nuestro schema VehicleMantPlan)
export interface VehicleMantPlan extends BaseEntity {
  vehicleId: number;
  mantPlanId: number;
  assignedAt: Date;
  lastKmCheck?: number;
  status: string;
  // Datos relacionados
  vehicle?: Vehicle;
  mantPlan?: MantPlan;
}

// Props para modales de selección
export interface VehicleSelectModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  vehicles: Vehicle[];
  onSelectVehicle: (vehicle: Vehicle) => void;
}

export interface MantPlanSelectModalProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  mantPlans: MantPlan[];
  onSelectMantPlan: (mantPlan: MantPlan) => void;
}

// Props para formularios
export interface FormAddVehicleTemplateProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  onAddVehicleTemplate: (vehicleMantPlan: VehicleMantPlan) => void;
}

export interface FormEditVehicleTemplateProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  item: VehicleMantPlan;
  onEditVehicleTemplate: (vehicleMantPlan: VehicleMantPlan) => void;
}
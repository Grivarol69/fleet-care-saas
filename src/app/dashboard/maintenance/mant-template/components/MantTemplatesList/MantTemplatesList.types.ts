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
  planTasks: PlanTaskProps[];
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
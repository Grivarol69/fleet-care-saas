export interface WORecipient {
  id: string;
  userId: string;
  phone: string;
  events: string[];
  isActive: boolean;
  user: {
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

export interface TenantUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string;
}

export const WO_EVENTS_LABELS = {
  OPENING: 'Apertura de OT',
  INSPECTION_DONE: 'Inspección completada',
  VEHICLE_GROUNDED: 'Vehículo inmovilizado',
  AUTH_REQUIRED: 'Autorización requerida',
  AUTHORIZED: 'OT autorizada',
  PO_CREATED: 'OC generadas',
} as const;

export type WOEventKey = keyof typeof WO_EVENTS_LABELS;

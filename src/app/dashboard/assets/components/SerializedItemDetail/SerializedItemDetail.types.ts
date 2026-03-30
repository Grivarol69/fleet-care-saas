export interface ActiveAlert {
  id: string;
  alertType: string;
  message: string;
  createdAt: string;
}

export interface SerializedItemDetailData {
  id: string;
  serialNumber: string;
  batchNumber: string | null;
  type: string;
  status: string;
  receivedAt: string;
  retiredAt: string | null;
  specs: Record<string, unknown> | null;
  notes: string | null;
  invoiceItem: {
    id: string;
    description: string;
    unitPrice: number;
    invoice: { invoiceNumber: string; invoiceDate: string };
  } | null;
  currentAssignment: {
    id: string;
    vehicleId: string;
    vehicleLicensePlate: string;
    position: string | null;
    installedAt: string;
  } | null;
  events: Array<{
    id: string;
    eventType: string;
    performedAt: string;
    performer: { id: string; firstName: string; lastName: string };
    vehicleKm: number | null;
    specs: Record<string, unknown> | null;
    notes: string | null;
  }>;
  activeAlerts: ActiveAlert[];
}

export interface SerializedItemDetailProps {
  itemId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefresh: () => void;
  vehicleContext?: {
    vehicleId: string;
    vehicleLicensePlate: string;
    position: string;
  };
}

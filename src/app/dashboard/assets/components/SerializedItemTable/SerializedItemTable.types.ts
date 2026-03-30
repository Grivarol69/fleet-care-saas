export interface SerializedItemRow {
  id: string;
  serialNumber: string;
  batchNumber: string | null;
  type: string;
  status: string;
  receivedAt: string;
  specs: Record<string, unknown> | null;
  invoiceItem: { description: string; unitPrice: number } | null;
  currentAssignment: {
    vehicleLicensePlate: string;
    position: string | null;
  } | null;
  activeAlertCount: number;
}

export interface SerializedItemTableProps {
  items: SerializedItemRow[];
  isLoading: boolean;
  onRowClick: (item: SerializedItemRow) => void;
}

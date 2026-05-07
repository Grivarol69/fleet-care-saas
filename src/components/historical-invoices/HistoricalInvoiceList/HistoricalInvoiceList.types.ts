export type HistoricalInvoiceDTO = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string; // ISO string
  totalAmount: number;
  supplierName: string | null;
  vehicleId: string | null;
  vehicleLicensePlate: string | null;
  workOrderId: string | null;
  itemCount: number;
  createdAt: string; // ISO string
};

export type HistoricalInvoiceListProps = {
  rows: HistoricalInvoiceDTO[];
  isLoading: boolean;
  total: number;
  limit: number;
  offset: number;
  onPageChange: (nextOffset: number) => void;
};

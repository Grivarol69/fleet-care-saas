export type FormFields = {
  invoiceNumber: string;
  invoiceDate: string; // YYYY-MM-DD, default today
  supplierName: string;
  description: string;
  subtotal: string; // controlled input — string until submit
  taxAmount: string;
  totalAmount: string;
  notes: string;
};

export type VehicleOption = {
  id: string;
  licensePlate: string;
  brandName: string;
  lineName: string;
  label: string;
};

export type ManualInvoiceFormProps = Record<string, never>; // self-contained, no props

// Discriminated union for fetch/load failures (per project rules — NO error class hierarchy)
export type LoadError =
  | { kind: 'network'; message: string }
  | { kind: 'unauthorized'; message: string }
  | { kind: 'unknown'; message: string };

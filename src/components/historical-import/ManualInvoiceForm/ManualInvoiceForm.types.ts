export type InvoiceItemDraft = {
  id: string; // crypto.randomUUID() for React key — NOT sent to API
  description: string;
  quantity: string; // controlled string while editing → parsed at submit
  unitPrice: string; // controlled string while editing → parsed at submit
  total: string; // auto = qty × unitPrice; operator can override
  mantItemId: string | null;
  mantItemName: string | null;
  categoryId: string | null;
  confidence: number; // 0-100, transient — NOT persisted
};

export type HeaderFields = {
  invoiceNumber: string;
  invoiceDate: string; // YYYY-MM-DD, default today
  supplierName: string;
  notes: string;
};

export type VehicleOption = {
  id: string;
  licensePlate: string;
  brandName: string;
  lineName: string;
  label: string;
};

export type ManualInvoiceFormProps = {
  /**
   * Called after a successful POST to /api/historical-import,
   * after the form has been reset and before focus restoration.
   * Use it to close the host Sheet/Dialog and refetch parent lists.
   */
  onSuccess?: () => void;
};

// Discriminated union for fetch/load failures (per project rules — NO error class hierarchy)
export type LoadError =
  | { kind: 'network'; message: string }
  | { kind: 'unauthorized'; message: string }
  | { kind: 'unknown'; message: string };

// OCR item shape returned by uploadthing server action
export type OcrItem = {
  description: string;
  quantity?: number;
  unitPrice?: number;
  total?: number;
};

import { z } from 'zod';

// Schema for a single InvoiceItem within a manual import row
export const historicalImportItemSchema = z.object({
  description: z.string().min(1, 'Descripción requerida').max(500),
  quantity: z.number().positive('Cantidad debe ser > 0'),
  unitPrice: z.number().nonnegative('Precio unitario debe ser ≥ 0'),
  total: z.number().nonnegative('Total debe ser ≥ 0'),
  mantItemId: z.string().uuid().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
});

export type HistoricalImportItem = z.infer<typeof historicalImportItemSchema>;

// One CSV row, after column-mapping (so keys are system-canonical, not raw CSV headers).
// - CSV path: uses flat description/subtotal/taxAmount/totalAmount
// - Manual form path: uses items[] (when provided, overrides flat fields for InvoiceItem creation)
export const historicalImportRowSchema = z.object({
  vehicleId: z.string().min(1, 'vehicleId requerido'),
  supplierName: z.string().min(1, 'Proveedor requerido').max(200),
  invoiceNumber: z.string().min(1, 'Número de factura requerido').max(64),
  invoiceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha ISO YYYY-MM-DD requerida'),
  description: z.string().max(500).optional(),
  subtotal: z.number().positive('Subtotal debe ser > 0'),
  taxAmount: z.number().min(0, 'Impuestos deben ser ≥ 0'),
  totalAmount: z.number().positive('Total debe ser > 0'),
  notes: z.string().max(1000).optional(),
  // Optional items array — when present, used for InvoiceItem creation
  items: z.array(historicalImportItemSchema).min(1).optional(),
});

export const historicalImportPayloadSchema = z
  .array(historicalImportRowSchema)
  .min(1, 'Al menos una fila requerida')
  .max(500, 'Máximo 500 filas por importación');

export type HistoricalImportRow = z.infer<typeof historicalImportRowSchema>;
export type HistoricalImportPayload = z.infer<
  typeof historicalImportPayloadSchema
>;

// Discriminated union — row error kinds (NOT a TS enum)
export type ImportRowErrorKind =
  | 'duplicate_invoice'
  | 'unknown_vehicle'
  | 'invalid_amount'
  | 'invalid_date'
  | 'missing_field'
  | 'amount_mismatch';

export type ImportRowError = {
  kind: ImportRowErrorKind;
  row: number; // 1-based row index in the user's payload
  field?: string;
  message: string;
};

export type HistoricalImportResponse = {
  imported: number;
  errors: ImportRowError[];
  importBatchId?: string;
};

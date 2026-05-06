import Papa from 'papaparse';

// Map system-canonical fields → CSV column header chosen by the user.
export type ColumnMap = {
  vehicleColumn: string; // CSV header that contains plate or raw vehicleId
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  description: string;
  subtotal: string;
  taxAmount: string;
  totalAmount: string;
  notes?: string;
};

export type RawRow = Record<string, string>;

export type ParsedRow = {
  rowNumber: number; // 1-based, stable across UI and server
  vehicleId: string; // resolved (after plate lookup) — empty string if unresolved
  vehicleInputRaw: string; // original CSV cell (for error messages)
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string; // ISO YYYY-MM-DD
  description: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes?: string;
};

export type RowValidationError = {
  kind:
    | 'invalid_date'
    | 'invalid_amount'
    | 'amount_mismatch'
    | 'missing_field'
    | 'unknown_vehicle';
  field: keyof ParsedRow | 'totalAmount';
  message: string;
};

export type RowValidation =
  | { ok: true; row: ParsedRow }
  | { ok: false; row: ParsedRow; errors: RowValidationError[] };

export type VehicleLookup = {
  byId: Map<string, { id: string; plate: string; name: string | null }>;
  byPlate: Map<string, { id: string; plate: string; name: string | null }>; // plate uppercased
};

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Normalize Spanish-locale decimals: "1.234,56" → "1234.56"
function parseLocaleNumber(raw: string): number {
  const normalized = raw.trim().replace(/\./g, '').replace(',', '.');
  return Number(normalized);
}

// 1. Read a File and produce raw header-keyed rows.
export function parseCsvFile(file: File): Promise<RawRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: h => h.trim(),
      complete: results => resolve(results.data),
      error: err => reject(err),
    });
  });
}

// 4. Build a VehicleLookup from the GET /api/vehicles response.
export function buildVehicleLookup(
  vehicles: Array<{ id: string; plate: string; name?: string | null }>
): VehicleLookup {
  const byId = new Map<
    string,
    { id: string; plate: string; name: string | null }
  >();
  const byPlate = new Map<
    string,
    { id: string; plate: string; name: string | null }
  >();

  for (const v of vehicles) {
    const entry = { id: v.id, plate: v.plate, name: v.name ?? null };
    byId.set(v.id, entry);
    byPlate.set(v.plate.toUpperCase(), entry);
  }

  return { byId, byPlate };
}

// 2. Apply user-defined column map → typed ParsedRow[].
// Resolves vehicle by UUID then plate (uppercased); normalizes locale decimals.
export function applyColumnMap(
  rawRows: RawRow[],
  map: ColumnMap,
  vehicles: VehicleLookup
): ParsedRow[] {
  return rawRows.map((raw, idx) => {
    const rowNumber = idx + 1;
    const vehicleInput = (raw[map.vehicleColumn] ?? '').trim();

    // Resolution order: (a) exact UUID in byId, (b) plate uppercase, (c) empty (unresolved)
    let vehicleId = '';
    if (vehicles.byId.has(vehicleInput)) {
      vehicleId = vehicleInput;
    } else {
      const byPlateMatch = vehicles.byPlate.get(vehicleInput.toUpperCase());
      if (byPlateMatch) {
        vehicleId = byPlateMatch.id;
      }
    }

    const subtotal = parseLocaleNumber(raw[map.subtotal] ?? '');
    const taxAmount = parseLocaleNumber(raw[map.taxAmount] ?? '');
    const totalAmount = parseLocaleNumber(raw[map.totalAmount] ?? '');
    const notesRaw = map.notes ? (raw[map.notes] ?? '').trim() : undefined;

    return {
      rowNumber,
      vehicleId,
      vehicleInputRaw: vehicleInput,
      supplierName: (raw[map.supplierName] ?? '').trim(),
      invoiceNumber: (raw[map.invoiceNumber] ?? '').trim(),
      invoiceDate: (raw[map.invoiceDate] ?? '').trim(),
      description: (raw[map.description] ?? '').trim(),
      subtotal,
      taxAmount,
      totalAmount,
      notes: notesRaw || undefined,
    };
  });
}

// 3. Pure client-side validators (mirror the server's Phase 1 row checks).
export function validateRowClient(
  row: ParsedRow,
  vehicles: VehicleLookup
): RowValidation {
  const errors: RowValidationError[] = [];

  // Required string fields
  if (!row.supplierName) {
    errors.push({
      kind: 'missing_field',
      field: 'supplierName',
      message: 'Proveedor requerido',
    });
  }
  if (!row.invoiceNumber) {
    errors.push({
      kind: 'missing_field',
      field: 'invoiceNumber',
      message: 'Número de factura requerido',
    });
  }
  if (!row.description) {
    errors.push({
      kind: 'missing_field',
      field: 'description',
      message: 'Descripción requerida',
    });
  }

  // Vehicle resolved
  if (!row.vehicleId || !vehicles.byId.has(row.vehicleId)) {
    errors.push({
      kind: 'unknown_vehicle',
      field: 'vehicleId',
      message: `Vehículo "${row.vehicleInputRaw}" no encontrado`,
    });
  }

  // ISO date validation
  if (!ISO_DATE_REGEX.test(row.invoiceDate)) {
    errors.push({
      kind: 'invalid_date',
      field: 'invoiceDate',
      message: 'Fecha debe estar en formato YYYY-MM-DD',
    });
  }

  // Amount validations
  if (isNaN(row.subtotal) || row.subtotal <= 0) {
    errors.push({
      kind: 'invalid_amount',
      field: 'subtotal',
      message: 'Subtotal debe ser mayor a 0',
    });
  }
  if (isNaN(row.taxAmount) || row.taxAmount < 0) {
    errors.push({
      kind: 'invalid_amount',
      field: 'taxAmount',
      message: 'Impuestos deben ser 0 o mayores',
    });
  }
  if (isNaN(row.totalAmount) || row.totalAmount <= 0) {
    errors.push({
      kind: 'invalid_amount',
      field: 'totalAmount',
      message: 'Total debe ser mayor a 0',
    });
  }

  // Amount mismatch check (tolerance of 1 unit)
  if (
    !isNaN(row.subtotal) &&
    !isNaN(row.taxAmount) &&
    !isNaN(row.totalAmount) &&
    Math.abs(row.subtotal + row.taxAmount - row.totalAmount) > 1
  ) {
    errors.push({
      kind: 'amount_mismatch',
      field: 'totalAmount',
      message: `Total (${row.totalAmount}) no coincide con subtotal + impuestos (${row.subtotal + row.taxAmount})`,
    });
  }

  if (errors.length === 0) {
    return { ok: true, row };
  }
  return { ok: false, row, errors };
}

export function validateRowsClient(
  rows: ParsedRow[],
  vehicles: VehicleLookup
): { valid: ParsedRow[]; invalid: Array<RowValidation & { ok: false }> } {
  const valid: ParsedRow[] = [];
  const invalid: Array<RowValidation & { ok: false }> = [];

  for (const row of rows) {
    const result = validateRowClient(row, vehicles);
    if (result.ok) {
      valid.push(result.row);
    } else {
      invalid.push(result as RowValidation & { ok: false });
    }
  }

  return { valid, invalid };
}

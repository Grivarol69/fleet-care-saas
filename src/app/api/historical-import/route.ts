import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { requireCurrentUser } from '@/lib/auth';
import { canImportHistoricalInvoices } from '@/lib/permissions';
import {
  historicalImportPayloadSchema,
  type HistoricalImportRow,
  type ImportRowError,
  type HistoricalImportResponse,
} from '@/lib/validations/historical-import';

export async function POST(request: Request): Promise<Response> {
  // 1. Auth
  const { user, tenantPrisma } = await requireCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canImportHistoricalInvoices(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2. Body parse + Zod
  let payload: HistoricalImportRow[];
  try {
    const body = await request.json();
    const parsed = historicalImportPayloadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: parsed.error.issues },
        { status: 422 }
      );
    }
    payload = parsed.data;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // 3. PHASE 1 — read-only validation (NO writes yet)
  const errors: ImportRowError[] = [];
  const uniqueVehicleIds = [...new Set(payload.map(r => r.vehicleId))];
  const uniqueInvoiceNumbers = [...new Set(payload.map(r => r.invoiceNumber))];
  const uniqueSupplierNames = [
    ...new Set(payload.map(r => r.supplierName.trim())),
  ];

  // 3a. Batch fetch vehicles (single query)
  const vehicles = await tenantPrisma.vehicle.findMany({
    where: { id: { in: uniqueVehicleIds } },
    select: { id: true, licensePlate: true, mileage: true },
  });
  const vehicleById = new Map(vehicles.map(v => [v.id, v]));

  // 3b. Batch fetch existing invoice numbers (single query)
  const existingInvoices = await tenantPrisma.invoice.findMany({
    where: { invoiceNumber: { in: uniqueInvoiceNumbers } },
    select: { invoiceNumber: true },
  });
  const existingInvoiceSet = new Set(
    existingInvoices.map(i => i.invoiceNumber)
  );

  // 3c. Per-row validation with within-payload duplicate scan
  const validRows: Array<HistoricalImportRow & { rowNumber: number }> = [];
  const seenInvoiceNumbers = new Set<string>();

  payload.forEach((row, idx) => {
    const rowNumber = idx + 1;

    if (!vehicleById.has(row.vehicleId)) {
      errors.push({
        kind: 'unknown_vehicle',
        row: rowNumber,
        field: 'vehicleId',
        message: `Vehículo ${row.vehicleId} no existe en este tenant`,
      });
      return;
    }

    // Within-payload duplicate check (before DB collision check)
    if (seenInvoiceNumbers.has(row.invoiceNumber)) {
      errors.push({
        kind: 'duplicate_invoice',
        row: rowNumber,
        field: 'invoiceNumber',
        message: `Factura ${row.invoiceNumber} duplicada en el payload`,
      });
      return;
    }
    seenInvoiceNumbers.add(row.invoiceNumber);

    if (existingInvoiceSet.has(row.invoiceNumber)) {
      errors.push({
        kind: 'duplicate_invoice',
        row: rowNumber,
        field: 'invoiceNumber',
        message: `Factura ${row.invoiceNumber} ya existe`,
      });
      return;
    }

    if (Math.abs(row.subtotal + row.taxAmount - row.totalAmount) > 1) {
      errors.push({
        kind: 'amount_mismatch',
        row: rowNumber,
        field: 'totalAmount',
        message: `Total no coincide con subtotal + impuestos`,
      });
      return;
    }

    if (Number.isNaN(Date.parse(`${row.invoiceDate}T00:00:00Z`))) {
      errors.push({
        kind: 'invalid_date',
        row: rowNumber,
        field: 'invoiceDate',
        message: `Fecha inválida`,
      });
      return;
    }

    validRows.push({ ...row, rowNumber });
  });

  // 4. If nothing valid → return early (no transaction needed)
  if (validRows.length === 0) {
    const body: HistoricalImportResponse = { imported: 0, errors };
    return NextResponse.json(body, { status: 200 });
  }

  // 5. PHASE 2 — transactional write
  const importBatchId = randomUUID();

  try {
    await tenantPrisma.$transaction(
      async tx => {
        // 5a. Provider upsert (sequential within tx — avoids race on unique constraint)
        const providerByName = new Map<string, string>(); // supplierName → providerId
        for (const name of uniqueSupplierNames) {
          const existing = await tx.provider.findFirst({
            where: { tenantId: user.tenantId, name },
          });
          if (existing) {
            providerByName.set(name, existing.id);
          } else {
            const created = await tx.provider.create({
              data: { tenantId: user.tenantId, name },
            });
            providerByName.set(name, created.id);
          }
        }

        // 5b. Group valid rows by vehicleId + YYYY-MM
        type Group = {
          vehicleId: string;
          yearMonth: string;
          rows: typeof validRows;
        };
        const groups = new Map<string, Group>();
        for (const row of validRows) {
          const ym = row.invoiceDate.slice(0, 7); // 'YYYY-MM'
          const key = `${row.vehicleId}::${ym}`;
          let g = groups.get(key);
          if (!g) {
            g = { vehicleId: row.vehicleId, yearMonth: ym, rows: [] };
            groups.set(key, g);
          }
          g.rows.push(row);
        }

        // 5c. Create synthetic WO per group + invoices
        for (const group of groups.values()) {
          const vehicle = vehicleById.get(group.vehicleId)!; // safe — validated in phase 1
          const monthLabel = formatMonthLabel(group.yearMonth); // e.g. 'Mar 2024'

          const wo = await tx.workOrder.create({
            data: {
              tenantId: user.tenantId,
              status: 'CLOSED',
              source: 'HISTORICAL_IMPORT',
              mantType: 'CORRECTIVE',
              priority: 'MEDIUM',
              title: `Histórico ${monthLabel} — ${vehicle.licensePlate}`,
              creationMileage: vehicle.mileage,
              requestedBy: user.id,
              vehicleId: vehicle.id,
              importBatchId,
            },
          });

          for (const row of group.rows) {
            await tx.invoice.create({
              data: {
                tenantId: user.tenantId,
                status: 'PAID',
                invoiceNumber: row.invoiceNumber,
                invoiceDate: new Date(`${row.invoiceDate}T00:00:00Z`),
                // Invoice model has no description field — store in notes
                notes: row.notes
                  ? `${row.description}\n\n${row.notes}`
                  : row.description,
                subtotal: row.subtotal,
                taxAmount: row.taxAmount,
                totalAmount: row.totalAmount,
                workOrderId: wo.id,
                supplierId: providerByName.get(row.supplierName.trim())!,
                registeredBy: user.id,
                importBatchId,
              },
            });
          }
        }
      },
      { timeout: 30_000, maxWait: 5_000 }
    );
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      return NextResponse.json(
        { error: 'Database error during import', code: e.code },
        { status: 500 }
      );
    }
    throw e;
  }

  const body: HistoricalImportResponse = {
    imported: validRows.length,
    errors,
    importBatchId,
  };
  return NextResponse.json(body, { status: 200 });
}

function formatMonthLabel(yearMonth: string): string {
  const [y, m] = yearMonth.split('-');
  const months = [
    'Ene',
    'Feb',
    'Mar',
    'Abr',
    'May',
    'Jun',
    'Jul',
    'Ago',
    'Sep',
    'Oct',
    'Nov',
    'Dic',
  ];
  return `${months[Number(m) - 1]} ${y}`;
}

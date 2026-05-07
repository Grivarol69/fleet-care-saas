import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { requireCurrentUser } from '@/lib/auth';
import { canImportHistoricalInvoices } from '@/lib/permissions';
import type { HistoricalInvoiceDTO } from '@/components/historical-invoices/HistoricalInvoiceList/HistoricalInvoiceList.types';

// ---------------------------------------------------------------------------
// UUID validation (no external dep)
// ---------------------------------------------------------------------------

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return UUID_REGEX.test(value);
}

// ISO date YYYY-MM-DD validation
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_REGEX.test(value)) return false;
  const ts = Date.parse(value + 'T00:00:00Z');
  return !Number.isNaN(ts);
}

// ---------------------------------------------------------------------------
// GET /api/historical-invoices
// ---------------------------------------------------------------------------

export async function GET(request: Request): Promise<Response> {
  // 1. Auth
  const { user, tenantPrisma } = await requireCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!canImportHistoricalInvoices(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 2. Parse query params
  const { searchParams } = new URL(request.url);

  const vehicleIdParam = searchParams.get('vehicleId');
  const dateFromParam = searchParams.get('dateFrom');
  const dateToParam = searchParams.get('dateTo');
  const limitParam = searchParams.get('limit') ?? '50';
  const offsetParam = searchParams.get('offset') ?? '0';

  // Validate vehicleId
  if (vehicleIdParam !== null && !isValidUuid(vehicleIdParam)) {
    return NextResponse.json({ error: 'Invalid vehicleId' }, { status: 400 });
  }

  // Validate dateFrom
  if (dateFromParam !== null && !isValidIsoDate(dateFromParam)) {
    return NextResponse.json(
      { error: 'Invalid dateFrom — expected YYYY-MM-DD' },
      { status: 400 }
    );
  }

  // Validate dateTo
  if (dateToParam !== null && !isValidIsoDate(dateToParam)) {
    return NextResponse.json(
      { error: 'Invalid dateTo — expected YYYY-MM-DD' },
      { status: 400 }
    );
  }

  // Validate limit
  const limit = parseInt(limitParam, 10);
  if (Number.isNaN(limit) || limit < 1 || limit > 200) {
    return NextResponse.json(
      { error: 'Invalid limit — must be an integer between 1 and 200' },
      { status: 400 }
    );
  }

  // Validate offset
  const offset = parseInt(offsetParam, 10);
  if (Number.isNaN(offset) || offset < 0) {
    return NextResponse.json(
      { error: 'Invalid offset — must be a non-negative integer' },
      { status: 400 }
    );
  }

  // 3. Build Prisma where clause
  const where: Prisma.InvoiceWhereInput = {
    workOrder: {
      is: {
        source: 'HISTORICAL_IMPORT',
        ...(vehicleIdParam ? { vehicleId: vehicleIdParam } : {}),
      },
    },
    ...(dateFromParam || dateToParam
      ? {
          invoiceDate: {
            ...(dateFromParam
              ? { gte: new Date(dateFromParam + 'T00:00:00Z') }
              : {}),
            ...(dateToParam
              ? { lte: new Date(dateToParam + 'T23:59:59Z') }
              : {}),
          },
        }
      : {}),
  };

  // 4. Query
  const [rows, total] = await Promise.all([
    tenantPrisma.invoice.findMany({
      where,
      orderBy: { invoiceDate: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        totalAmount: true,
        createdAt: true,
        supplier: { select: { name: true } },
        workOrder: {
          select: {
            id: true,
            vehicle: { select: { id: true, licensePlate: true } },
          },
        },
        _count: { select: { items: true } },
      },
    }),
    tenantPrisma.invoice.count({ where }),
  ]);

  // 5. Map to DTO
  const dto: HistoricalInvoiceDTO[] = rows.map(r => ({
    id: r.id,
    invoiceNumber: r.invoiceNumber,
    invoiceDate: r.invoiceDate.toISOString(),
    totalAmount: Number(r.totalAmount),
    supplierName: r.supplier?.name ?? null,
    vehicleId: r.workOrder?.vehicle?.id ?? null,
    vehicleLicensePlate: r.workOrder?.vehicle?.licensePlate ?? null,
    workOrderId: r.workOrder?.id ?? null,
    itemCount: r._count.items,
    createdAt: r.createdAt.toISOString(),
  }));

  return NextResponse.json({
    rows: dto,
    pagination: { total, limit, offset },
  });
}

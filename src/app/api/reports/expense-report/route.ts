import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { requireCurrentUser } from '@/lib/auth';
import { canViewCosts } from '@/lib/permissions';
import { ExpenseReportPDF } from '@/components/reports/pdf/ExpenseReportPDF';
import type {
  ExpenseReportResponse,
  CategorySummary,
  VehicleSummary,
  ExpenseReportLine,
} from '@/components/reports/pdf/ExpenseReportPDF/ExpenseReportPDF.types';
import { Prisma } from '@prisma/client';

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseDateParam(value: string | null): Date | null {
  if (!value || !DATE_REGEX.test(value)) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

function monthDiff(from: Date, to: Date): number {
  return (
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth())
  );
}

type CategoryFilterMode = 'any' | 'specific' | 'none';

type ExpenseFilters = {
  vehicleId: string | null;
  categoryId: string | null;
  categoryFilterMode: CategoryFilterMode;
  dateFrom: Date;
  dateTo: Date;
};

function buildInvoiceItemWhere(
  f: ExpenseFilters
): Prisma.InvoiceItemWhereInput {
  const dateTo = new Date(f.dateTo);
  dateTo.setUTCHours(23, 59, 59, 999);

  const invoiceWhere: Prisma.InvoiceWhereInput = {
    invoiceDate: { gte: f.dateFrom, lte: dateTo },
  };

  if (f.vehicleId) {
    invoiceWhere.workOrder = { vehicleId: f.vehicleId };
  }

  const where: Prisma.InvoiceItemWhereInput = {
    invoice: invoiceWhere,
  };

  if (f.categoryFilterMode === 'specific' && f.categoryId) {
    where.categoryId = f.categoryId;
  } else if (f.categoryFilterMode === 'none') {
    where.categoryId = null;
  }

  return where;
}

// Infer the item type from the select shape used in the query
const ITEM_SELECT = {
  id: true,
  description: true,
  quantity: true,
  unitPrice: true,
  total: true,
  categoryId: true,
  category: { select: { id: true, name: true } },
  invoice: {
    select: {
      id: true,
      invoiceNumber: true,
      invoiceDate: true,
      supplier: { select: { name: true } },
      workOrder: {
        select: {
          id: true,
          vehicleId: true,
          vehicle: {
            select: {
              id: true,
              licensePlate: true,
              brand: { select: { name: true } },
              line: { select: { name: true } },
            },
          },
        },
      },
    },
  },
} as const;

type RawItem = Prisma.InvoiceItemGetPayload<{ select: typeof ITEM_SELECT }>;

function summarize(items: RawItem[]) {
  const byCategory = new Map<string, CategorySummary>();
  const byVehicle = new Map<string, VehicleSummary>();
  let grandTotal = 0;
  let grandCount = 0;

  for (const it of items) {
    const lineTotal = Number(it.total);
    grandTotal += lineTotal;
    grandCount += 1;

    // by category
    const catKey = it.categoryId ?? '__none__';
    const catLabel = it.category?.name ?? 'Sin categoría';
    const cat = byCategory.get(catKey) ?? {
      key: catKey,
      label: catLabel,
      total: 0,
      count: 0,
    };
    cat.total += lineTotal;
    cat.count += 1;
    byCategory.set(catKey, cat);

    // by vehicle
    const v = it.invoice.workOrder?.vehicle ?? null;
    const vKey = v?.id ?? '__none__';
    const vLabel = v
      ? `${v.licensePlate} — ${v.brand.name} ${v.line.name}`
      : 'Sin vehículo';
    const veh = byVehicle.get(vKey) ?? {
      key: vKey,
      label: vLabel,
      total: 0,
      count: 0,
    };
    veh.total += lineTotal;
    veh.count += 1;
    byVehicle.set(vKey, veh);
  }

  return {
    byCategory: [...byCategory.values()].sort((a, b) => b.total - a.total),
    byVehicle: [...byVehicle.values()].sort((a, b) => b.total - a.total),
    grandTotal,
    grandCount,
  };
}

function buildLines(items: RawItem[]): ExpenseReportLine[] {
  return items.map(it => {
    const v = it.invoice.workOrder?.vehicle ?? null;
    const vehicleLabel = v
      ? `${v.licensePlate} — ${v.brand.name} ${v.line.name}`
      : 'Sin vehículo';
    const categoryLabel = it.category?.name ?? 'Sin categoría';

    return {
      id: it.id,
      invoiceId: it.invoice.id,
      invoiceNumber: it.invoice.invoiceNumber,
      invoiceDate: it.invoice.invoiceDate.toISOString(),
      providerName: it.invoice.supplier.name,
      vehicleLabel,
      categoryLabel,
      description: it.description,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice),
      total: Number(it.total),
    };
  });
}

export async function GET(request: NextRequest) {
  const { user, tenantPrisma } = await requireCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canViewCosts(user))
    return NextResponse.json(
      { error: 'Sin permisos para ver costos' },
      { status: 403 }
    );

  const { searchParams } = request.nextUrl;
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const vehicleIdParam = searchParams.get('vehicleId') ?? '';
  const categoryIdParam = searchParams.get('categoryId') ?? '';
  const format = searchParams.get('format') ?? 'json';

  // Validate required date params
  const dateFrom = parseDateParam(fromParam);
  const dateTo = parseDateParam(toParam);

  if (!dateFrom || !dateTo) {
    return NextResponse.json(
      { error: 'Parámetros from y to requeridos (formato YYYY-MM-DD)' },
      { status: 400 }
    );
  }

  if (dateFrom > dateTo) {
    return NextResponse.json(
      { error: 'El rango de fechas es inválido' },
      { status: 400 }
    );
  }

  if (monthDiff(dateFrom, dateTo) > 24) {
    return NextResponse.json(
      { error: 'El rango máximo permitido es 24 meses' },
      { status: 400 }
    );
  }

  // Resolve category filter mode (ADR-6)
  let categoryFilterMode: CategoryFilterMode = 'any';
  let categoryId: string | null = null;

  if (categoryIdParam === 'none') {
    categoryFilterMode = 'none';
  } else if (categoryIdParam) {
    categoryFilterMode = 'specific';
    categoryId = categoryIdParam;
  }

  const filters: ExpenseFilters = {
    vehicleId: vehicleIdParam || null,
    categoryId,
    categoryFilterMode,
    dateFrom,
    dateTo,
  };

  try {
    const where = buildInvoiceItemWhere(filters);
    const items = await tenantPrisma.invoiceItem.findMany({
      where,
      select: ITEM_SELECT,
      orderBy: [{ invoice: { invoiceDate: 'desc' } }, { id: 'asc' }],
    });

    const summary = summarize(items);
    const lines = buildLines(items);

    let vehicleFilter: ExpenseReportResponse['filters']['vehicle'] = null;
    if (filters.vehicleId) {
      const vehicle = await tenantPrisma.vehicle.findUnique({
        where: { id: filters.vehicleId },
        select: {
          id: true,
          licensePlate: true,
          brand: { select: { name: true } },
          line: { select: { name: true } },
        },
      });
      if (vehicle) {
        vehicleFilter = {
          id: vehicle.id,
          label: `${vehicle.licensePlate} — ${vehicle.brand.name} ${vehicle.line.name}`,
        };
      }
    }

    let categoryFilter: ExpenseReportResponse['filters']['category'] = null;
    if (categoryFilterMode === 'none') {
      categoryFilter = { id: null, label: 'Sin categoría' };
    } else if (categoryFilterMode === 'specific' && categoryId) {
      const cat = await tenantPrisma.mantCategory.findUnique({
        where: { id: categoryId },
        select: { id: true, name: true },
      });
      if (cat) {
        categoryFilter = { id: cat.id, label: cat.name };
      }
    }

    const payload: ExpenseReportResponse = {
      filters: {
        from: fromParam!,
        to: toParam!,
        vehicle: vehicleFilter,
        category: categoryFilter,
      },
      summary,
      lines,
    };

    if (format === 'pdf') {
      const buffer = await renderToBuffer(
        React.createElement(ExpenseReportPDF, payload) as any
      );
      const plateSlug = vehicleFilter
        ? `-${vehicleFilter.label.split(' ')[0].replace(/[^A-Z0-9]/gi, '')}`
        : '';
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="expense-report${plateSlug}-${fromParam}-${toParam}.pdf"`,
        },
      });
    }

    return NextResponse.json(payload);
  } catch (error) {
    console.error('[EXPENSE_REPORT] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

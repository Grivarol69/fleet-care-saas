import { NextRequest, NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import { requireCurrentUser } from '@/lib/auth';
import { canViewCosts } from '@/lib/permissions';
import { VehicleCostsPDF } from '@/components/reports/pdf/VehicleCostsPDF';

function parseMonthParam(value: string | null): { gte: Date; lte: Date } | null {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [year, month] = value.split('-').map(Number);
  const gte = new Date(year, month - 1, 1);
  const lte = new Date(year, month, 0, 23, 59, 59, 999);
  return { gte, lte };
}

export async function GET(request: NextRequest) {
  const { user, tenantPrisma } = await requireCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canViewCosts(user)) return NextResponse.json({ error: 'Sin permisos para ver costos' }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const vehicleId = searchParams.get('vehicleId');
  const fromParam = searchParams.get('from');
  const toParam = searchParams.get('to');
  const format = searchParams.get('format') ?? 'json';

  if (!vehicleId) return NextResponse.json({ error: 'Falta vehicleId' }, { status: 400 });

  const fromRange = parseMonthParam(fromParam);
  const toRange = parseMonthParam(toParam);
  if (!fromRange || !toRange) {
    return NextResponse.json({ error: 'Parámetros from y to requeridos (formato YYYY-MM)' }, { status: 400 });
  }

  const dateRange = { gte: fromRange.gte, lte: toRange.lte };

  const vehicle = await tenantPrisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { brand: true, line: true },
  });
  if (!vehicle) return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });

  // SUM maintenance: WorkOrder.actualCost WHERE status=COMPLETED AND createdAt in range
  const woResult = await tenantPrisma.workOrder.aggregate({
    where: { vehicleId, status: 'COMPLETED', createdAt: dateRange },
    _sum: { actualCost: true },
  });

  // SUM purchases: Invoice.totalAmount WHERE workOrder.vehicleId=vehicleId AND invoiceDate in range
  const invoices = await tenantPrisma.invoice.findMany({
    where: {
      invoiceDate: dateRange,
      workOrder: { vehicleId },
    },
    select: { totalAmount: true },
  });
  const purchasesTotal = invoices.reduce((acc, inv) => acc + Number(inv.totalAmount), 0);

  // SUM fuel: FuelVoucher.totalAmount WHERE vehicleId AND date in range
  const fuelResult = await tenantPrisma.fuelVoucher.aggregate({
    where: { vehicleId, date: dateRange, totalAmount: { not: null } },
    _sum: { totalAmount: true },
  });

  const maintenanceCost = Number(woResult._sum.actualCost ?? 0);
  const purchasesCost = purchasesTotal;
  const fuelCost = Number(fuelResult._sum.totalAmount ?? 0);
  const total = maintenanceCost + purchasesCost + fuelCost;

  const result = {
    vehicleId: vehicle.id,
    vehiclePlate: vehicle.licensePlate,
    vehicleBrand: `${vehicle.brand.name} ${vehicle.line.name}`,
    vehicleYear: vehicle.year,
    from: fromParam!,
    to: toParam!,
    costs: {
      maintenance: maintenanceCost,
      purchases: purchasesCost,
      fuel: fuelCost,
      total,
    },
  };

  if (format === 'pdf') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(React.createElement(VehicleCostsPDF, result) as any);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="costos-${vehicle.licensePlate}-${fromParam}-${toParam}.pdf"`,
      },
    });
  }

  return NextResponse.json(result);
}

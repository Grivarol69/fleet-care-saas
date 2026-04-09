import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { canViewCosts } from '@/lib/permissions';
import {
  analyzeFuelEfficiency,
  type FuelVoucherInput,
  type OdometerLogInput,
} from '@/lib/fuel-analytics';

/**
 * Parses a YYYY-MM string into start/end Date for that month.
 * Returns null if format is invalid.
 */
function parseMonthParam(value: string | null): { start: Date; end: Date } | null {
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return null;
  const [year, month] = value.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Returns a YYYY-MM string for N months ago from today.
 */
function monthsAgo(n: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 7);
}

export async function GET(request: NextRequest) {
  const { user, tenantPrisma } = await requireCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canViewCosts(user)) {
    return NextResponse.json({ error: 'Sin permisos para ver análisis de combustible' }, { status: 403 });
  }

  const { searchParams } = request.nextUrl;
  const vehicleId = searchParams.get('vehicleId');
  const fromParam = searchParams.get('from') ?? monthsAgo(6);
  const toParam = searchParams.get('to') ?? new Date().toISOString().slice(0, 7);

  if (!vehicleId) {
    return NextResponse.json({ error: 'Falta parámetro vehicleId' }, { status: 400 });
  }

  const fromRange = parseMonthParam(fromParam);
  const toRange = parseMonthParam(toParam);
  if (!fromRange || !toRange) {
    return NextResponse.json(
      { error: 'Parámetros from y to deben tener formato YYYY-MM' },
      { status: 400 }
    );
  }

  // Fetch vehicle info
  const vehicle = await tenantPrisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: { brand: true, line: true },
  });
  if (!vehicle) {
    return NextResponse.json({ error: 'Vehículo no encontrado' }, { status: 404 });
  }

  // Fetch FuelVoucher rows in date range ordered by date ASC
  const rawVouchers = await tenantPrisma.fuelVoucher.findMany({
    where: {
      vehicleId,
      date: { gte: fromRange.start, lte: toRange.end },
    },
    orderBy: { date: 'asc' },
  });

  // Fetch OdometerLog rows for ±3 day fallback window
  // We expand the window by 3 days on both sides to cover fallback lookups at the boundary
  const FALLBACK_MS = 3 * 24 * 60 * 60 * 1000;
  const odomFrom = new Date(fromRange.start.getTime() - FALLBACK_MS);
  const odomTo = new Date(toRange.end.getTime() + FALLBACK_MS);

  const rawOdometerLogs = await tenantPrisma.odometerLog.findMany({
    where: {
      vehicleId,
      recordedAt: { gte: odomFrom, lte: odomTo },
    },
    orderBy: { recordedAt: 'asc' },
  });

  // Map to engine input types (handle Decimal → number)
  const vouchers: FuelVoucherInput[] = rawVouchers.map((v) => ({
    id: v.id,
    date: v.date,
    odometer: v.odometer,
    quantity: Number(v.quantity),
    totalAmount: v.totalAmount !== null ? Number(v.totalAmount) : null,
  }));

  const odometerLogs: OdometerLogInput[] = rawOdometerLogs.map((o) => ({
    id: o.id,
    vehicleId: o.vehicleId,
    recordedAt: o.recordedAt,
    kilometers: o.kilometers,
  }));

  const vehicleBrand = `${vehicle.brand.name} ${vehicle.line.name}`;

  const result = analyzeFuelEfficiency(
    vehicleId,
    vehicle.licensePlate,
    vehicleBrand,
    fromParam,
    toParam,
    vouchers,
    odometerLogs
  );

  return NextResponse.json(result);
}

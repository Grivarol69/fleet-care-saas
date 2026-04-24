import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { canViewFuelVouchers, canCreateFuelVouchers } from '@/lib/permissions';
import { MaintenanceAlertService } from '@/lib/services/MaintenanceAlertService';
import { FinancialWatchdogService } from '@/lib/services/FinancialWatchdogService';
import { Decimal } from '@prisma/client/runtime/library';

// GET /api/fuel/vouchers
export async function GET(request: NextRequest) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canViewFuelVouchers(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId') ?? undefined;
    const driverId = searchParams.get('driverId') ?? undefined;
    const fuelType = searchParams.get('fuelType') ?? undefined;
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10))
    );

    const where = {
      ...(vehicleId ? { vehicleId } : {}),
      ...(driverId ? { driverId } : {}),
      ...(fuelType
        ? { fuelType: fuelType as import('@prisma/client').FuelVoucherFuelType }
        : {}),
      ...(dateFrom || dateTo
        ? {
            date: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo) } : {}),
            },
          }
        : {}),
    };

    const [total, vouchers] = await Promise.all([
      tenantPrisma.fuelVoucher.count({ where }),
      tenantPrisma.fuelVoucher.findMany({
        where,
        include: {
          vehicle: { select: { id: true, licensePlate: true } },
          driver: { select: { id: true, name: true } },
          provider: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    return NextResponse.json({ data: vouchers, total, page, pageSize });
  } catch (error) {
    console.error('[FUEL_VOUCHERS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

// POST /api/fuel/vouchers
export async function POST(request: NextRequest) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canCreateFuelVouchers(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      vehicleId,
      driverId,
      providerId,
      date,
      fuelType,
      quantity,
      volumeUnit,
      odometer,
      pricePerUnit,
      notes,
      receiptUrl,
    } = body;

    // Validate required fields
    if (
      !vehicleId ||
      !date ||
      !fuelType ||
      quantity === undefined ||
      odometer === undefined
    ) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: vehicleId, date, fuelType, quantity, odometer',
        },
        { status: 400 }
      );
    }

    if (Number(quantity) <= 0) {
      return NextResponse.json(
        { error: 'quantity must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate vehicle belongs to tenant
    const vehicle = await tenantPrisma.vehicle.findFirst({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    // Nivel 1: block if vehicle has a CRITICAL checklist today
    // Nivel 2: block if vehicle has an active CRITICAL incident
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [criticalChecklist, criticalIncident] = await Promise.all([
      tenantPrisma.dailyChecklist.findFirst({
        where: { vehicleId, status: 'CRITICAL', createdAt: { gte: today } },
        select: { id: true },
      }),
      tenantPrisma.incidentAlert.findFirst({
        where: {
          vehicleId,
          severity: 'CRITICAL',
          status: { in: ['REPORTED', 'REVIEWED'] },
        },
        select: { id: true },
      }),
    ]);
    if (criticalChecklist) {
      return NextResponse.json(
        {
          error: 'VEHICLE_BLOCKED_CHECKLIST',
          message:
            'El vehículo tiene un checklist CRÍTICO hoy. Resuelva las observaciones antes de registrar combustible.',
        },
        { status: 409 }
      );
    }
    if (criticalIncident) {
      return NextResponse.json(
        {
          error: 'VEHICLE_BLOCKED_INCIDENT',
          message:
            'El vehículo tiene una novedad CRÍTICA activa. Resuelva el incidente antes de registrar combustible.',
        },
        { status: 409 }
      );
    }

    // Validate odometer > last reading for vehicle
    const lastReading = await tenantPrisma.odometerLog.findFirst({
      where: { vehicleId, measureType: 'KILOMETERS' },
      orderBy: { recordedAt: 'desc' },
    });

    if (
      lastReading &&
      lastReading.kilometers !== null &&
      odometer <= lastReading.kilometers
    ) {
      return NextResponse.json(
        {
          error: 'ODOMETER_TOO_LOW',
          message: `Odometer reading (${odometer}) must be greater than the last recorded reading (${lastReading.kilometers})`,
        },
        { status: 400 }
      );
    }

    const voucherDate = new Date(date);
    const yearMonth = `${voucherDate.getFullYear()}${String(voucherDate.getMonth() + 1).padStart(2, '0')}`;

    // Compute totalAmount when both quantity and pricePerUnit are present
    let totalAmount: Decimal | null = null;
    if (pricePerUnit !== undefined && pricePerUnit !== null) {
      totalAmount = new Decimal(quantity).mul(new Decimal(pricePerUnit));
    }

    // Run everything atomically
    const { fuelVoucher, odometerLog } = await tenantPrisma.$transaction(
      async tx => {
        // Auto-generate voucherNumber inside transaction (safe against concurrency)
        const count = await tx.fuelVoucher.count({
          where: {
            tenantId: user.tenantId,
            voucherNumber: { startsWith: `COMB-${yearMonth}-` },
          },
        });
        const voucherNumber = `COMB-${yearMonth}-${String(count + 1).padStart(5, '0')}`;

        // Create FuelVoucher
        const newVoucher = await tx.fuelVoucher.create({
          data: {
            tenantId: user.tenantId,
            voucherNumber,
            vehicleId,
            driverId: driverId ?? null,
            providerId: providerId ?? null,
            date: voucherDate,
            fuelType,
            quantity: new Decimal(quantity),
            volumeUnit: volumeUnit ?? 'LITERS',
            odometer: Number(odometer),
            pricePerUnit:
              pricePerUnit !== undefined && pricePerUnit !== null
                ? new Decimal(pricePerUnit)
                : null,
            totalAmount,
            notes: notes ?? null,
            receiptUrl: receiptUrl ?? null,
            createdBy: user.id,
          },
        });

        // Create OdometerLog linked to FuelVoucher
        const newOdometerLog = await tx.odometerLog.create({
          data: {
            tenantId: user.tenantId,
            vehicleId,
            driverId: driverId ?? null,
            kilometers: Number(odometer),
            measureType: 'KILOMETERS',
            recordedAt: voucherDate,
            fuelVoucherId: newVoucher.id,
          },
        });

        // Update vehicle current odometer
        await tx.vehicle.update({
          where: { id: vehicleId },
          data: {
            mileage: Number(odometer),
            lastKilometers: Number(odometer),
            lastRecorder: voucherDate,
          },
        });

        return { fuelVoucher: newVoucher, odometerLog: newOdometerLog };
      }
    );

    // Non-blocking maintenance alert check (fire-and-forget)
    try {
      await MaintenanceAlertService.checkAndGenerateAlerts(
        vehicleId,
        Number(odometer),
        user.tenantId
      );
    } catch (alertError) {
      console.error(
        '[FUEL_VOUCHERS] Error checking maintenance alerts:',
        alertError
      );
    }

    // Non-blocking watchdog: detect unusual fuel price vs rolling average
    if (pricePerUnit !== undefined && pricePerUnit !== null) {
      FinancialWatchdogService.checkFuelPriceDeviation(
        user.tenantId,
        fuelType,
        Number(pricePerUnit),
        fuelVoucher.id,
        vehicleId
      ).catch(err => console.error('[WATCHDOG] fuel check failed:', err));
    }

    return NextResponse.json({ fuelVoucher, odometerLog }, { status: 201 });
  } catch (error) {
    console.error('[FUEL_VOUCHERS_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

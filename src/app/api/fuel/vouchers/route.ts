import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { canViewFuelVouchers, canCreateFuelVouchers } from '@/lib/permissions';
import { MaintenanceAlertService } from '@/lib/services/MaintenanceAlertService';
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
      liters,
      odometer,
      pricePerLiter,
      notes,
    } = body;

    // Validate required fields
    if (
      !vehicleId ||
      !date ||
      !fuelType ||
      liters === undefined ||
      odometer === undefined
    ) {
      return NextResponse.json(
        {
          error:
            'Missing required fields: vehicleId, date, fuelType, liters, odometer',
        },
        { status: 400 }
      );
    }

    if (Number(liters) <= 0) {
      return NextResponse.json(
        { error: 'liters must be greater than 0' },
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

    // Compute totalAmount when both liters and pricePerLiter are present
    let totalAmount: Decimal | null = null;
    if (pricePerLiter !== undefined && pricePerLiter !== null) {
      totalAmount = new Decimal(liters).mul(new Decimal(pricePerLiter));
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
            liters: new Decimal(liters),
            odometer: Number(odometer),
            pricePerLiter:
              pricePerLiter !== undefined && pricePerLiter !== null
                ? new Decimal(pricePerLiter)
                : null,
            totalAmount,
            notes: notes ?? null,
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

    return NextResponse.json({ fuelVoucher, odometerLog }, { status: 201 });
  } catch (error) {
    console.error('[FUEL_VOUCHERS_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { canViewFuelVouchers, canManageFuelVouchers } from '@/lib/permissions';
import { Decimal } from '@prisma/client/runtime/library';

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/fuel/vouchers/[id]
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canViewFuelVouchers(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const voucher = await tenantPrisma.fuelVoucher.findFirst({
      where: { id },
      include: {
        vehicle: { select: { id: true, licensePlate: true } },
        driver: { select: { id: true, name: true } },
        provider: { select: { id: true, name: true } },
        odometerLog: {
          select: { id: true, recordedAt: true, kilometers: true },
        },
      },
    });

    if (!voucher) {
      return NextResponse.json(
        { error: 'Fuel voucher not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(voucher);
  } catch (error) {
    console.error('[FUEL_VOUCHER_GET_ONE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

// PUT /api/fuel/vouchers/[id]
// Allowed editable fields: driverId, providerId, fuelType, liters, pricePerLiter, notes, date
// NOT allowed: vehicleId, odometer
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canManageFuelVouchers(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const existing = await tenantPrisma.fuelVoucher.findFirst({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Fuel voucher not found' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const {
      driverId,
      providerId,
      fuelType,
      liters,
      pricePerLiter,
      notes,
      date,
    } = body;

    // Recompute totalAmount if liters or pricePerLiter changed
    const newLiters =
      liters !== undefined ? new Decimal(liters) : existing.liters;
    const newPricePerLiter =
      pricePerLiter !== undefined
        ? pricePerLiter !== null
          ? new Decimal(pricePerLiter)
          : null
        : existing.pricePerLiter;

    const newTotalAmount =
      newLiters && newPricePerLiter ? newLiters.mul(newPricePerLiter) : null;

    const updated = await tenantPrisma.fuelVoucher.update({
      where: { id },
      data: {
        ...(driverId !== undefined ? { driverId: driverId ?? null } : {}),
        ...(providerId !== undefined ? { providerId: providerId ?? null } : {}),
        ...(fuelType !== undefined ? { fuelType } : {}),
        ...(liters !== undefined ? { liters: new Decimal(liters) } : {}),
        ...(pricePerLiter !== undefined
          ? {
              pricePerLiter:
                pricePerLiter !== null ? new Decimal(pricePerLiter) : null,
            }
          : {}),
        totalAmount: newTotalAmount,
        ...(notes !== undefined ? { notes: notes ?? null } : {}),
        ...(date !== undefined ? { date: new Date(date) } : {}),
      },
      include: {
        vehicle: { select: { id: true, licensePlate: true } },
        driver: { select: { id: true, name: true } },
        provider: { select: { id: true, name: true } },
        odometerLog: {
          select: { id: true, recordedAt: true, kilometers: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[FUEL_VOUCHER_PUT]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

// DELETE /api/fuel/vouchers/[id]
// Blocks deletion if linked OdometerLog is the latest for the vehicle
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canManageFuelVouchers(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    const voucher = await tenantPrisma.fuelVoucher.findFirst({
      where: { id },
      include: { odometerLog: true },
    });

    if (!voucher) {
      return NextResponse.json(
        { error: 'Fuel voucher not found' },
        { status: 404 }
      );
    }

    // Block deletion if this voucher's OdometerLog is the latest for the vehicle
    if (voucher.odometerLog) {
      const latestLog = await tenantPrisma.odometerLog.findFirst({
        where: { vehicleId: voucher.vehicleId, measureType: 'KILOMETERS' },
        orderBy: { recordedAt: 'desc' },
      });

      if (latestLog && latestLog.id === voucher.odometerLog.id) {
        return NextResponse.json(
          {
            error: 'LINKED_TO_LATEST_ODOMETER',
            message:
              'Cannot delete this fuel voucher because its odometer reading is the most recent for this vehicle. Please add a newer odometer reading first.',
          },
          { status: 409 }
        );
      }

      // Unlink OdometerLog (set fuelVoucherId = null)
      await tenantPrisma.odometerLog.update({
        where: { id: voucher.odometerLog.id },
        data: { fuelVoucherId: null },
      });
    }

    await tenantPrisma.fuelVoucher.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[FUEL_VOUCHER_DELETE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

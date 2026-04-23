import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { getTenantPrisma } from '@/lib/tenant-prisma';

// GET /api/driver/me
// Returns current driver's profile + active vehicle assignment.
export async function GET() {
  try {
    const { user } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const tp = getTenantPrisma(user.tenantId);

    const driver = await tp.driver.findUnique({
      where: { userId: user.id },
    });

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver no encontrado para este usuario' },
        { status: 404 }
      );
    }

    const assignment = await tp.vehicleDriver.findFirst({
      where: { driverId: driver.id, status: 'ACTIVE' },
      orderBy: [{ isPrimary: 'desc' }, { startDate: 'desc' }],
      include: {
        vehicle: {
          include: {
            brand: true,
            line: true,
            type: true,
            odometerLogs: {
              orderBy: { recordedAt: 'desc' },
              take: 1,
            },
          },
        },
      },
    });

    const vehicle = assignment?.vehicle ?? null;
    const lastOdometer = vehicle?.odometerLogs[0] ?? null;

    return NextResponse.json({
      driver: {
        id: driver.id,
        name: driver.name,
        email: driver.email,
        phone: driver.phone,
        licenseNumber: driver.licenseNumber,
        licenseExpiry: driver.licenseExpiry,
        status: driver.status,
      },
      vehicle: vehicle
        ? {
            id: vehicle.id,
            licensePlate: vehicle.licensePlate,
            situation: vehicle.situation,
            brandName: vehicle.brand?.name ?? null,
            lineName: vehicle.line?.name ?? null,
            typeId: vehicle.type?.id ?? null,
            typeName: vehicle.type?.name ?? null,
            lastOdometerKm: lastOdometer?.kilometers ?? null,
            lastOdometerDate: lastOdometer?.recordedAt ?? null,
          }
        : null,
    });
  } catch (error) {
    console.error('[DRIVER_ME_GET]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

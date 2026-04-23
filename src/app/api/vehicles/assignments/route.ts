import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  const { user, tenantPrisma } = await requireCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const vehicleId = searchParams.get('vehicleId');

  if (!vehicleId) {
    return NextResponse.json({ error: 'vehicleId requerido' }, { status: 400 });
  }

  const assignment = await tenantPrisma.vehicleDriver.findFirst({
    where: { vehicleId, status: 'ACTIVE' },
    include: {
      driver: {
        select: { id: true, name: true, email: true, licenseNumber: true },
      },
    },
    orderBy: { startDate: 'desc' },
  });

  return NextResponse.json(assignment);
}

export async function POST(req: Request) {
  const { user, tenantPrisma } = await requireCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { vehicleId, driverId, isPrimary, notes } = await req.json();

  if (!vehicleId || !driverId) {
    return NextResponse.json(
      { error: 'vehicleId y driverId son requeridos' },
      { status: 400 }
    );
  }

  const assignment = await tenantPrisma.$transaction(async tx => {
    // Desactivar asignación activa anterior del vehículo
    await tx.vehicleDriver.updateMany({
      where: { vehicleId, status: 'ACTIVE' },
      data: { status: 'INACTIVE', endDate: new Date() },
    });

    return tx.vehicleDriver.create({
      data: {
        tenantId: user.tenantId,
        vehicleId,
        driverId,
        isPrimary: isPrimary ?? true,
        notes: notes ?? null,
        assignedBy: user.id,
        status: 'ACTIVE',
      },
      include: {
        driver: { select: { id: true, name: true, email: true } },
      },
    });
  });

  return NextResponse.json(assignment, { status: 201 });
}

export async function DELETE(req: Request) {
  const { user, tenantPrisma } = await requireCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { vehicleId } = await req.json();

  if (!vehicleId) {
    return NextResponse.json({ error: 'vehicleId requerido' }, { status: 400 });
  }

  await tenantPrisma.vehicleDriver.updateMany({
    where: { vehicleId, status: 'ACTIVE' },
    data: { status: 'INACTIVE', endDate: new Date() },
  });

  return NextResponse.json({ ok: true });
}

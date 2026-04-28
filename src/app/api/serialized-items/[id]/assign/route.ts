import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { canOperateSerializedAssets } from '@/lib/permissions';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, tenantPrisma } = await requireCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canOperateSerializedAssets(user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { vehicleId, position, installedAt, installedAtKm } = body;

  // Verify item exists, belongs to tenant, and is IN_STOCK
  const item = await tenantPrisma.serializedItem.findFirst({
    where: { id, tenantId: user.tenantId },
  });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (item.status !== 'IN_STOCK')
    return NextResponse.json({ error: 'ITEM_NOT_IN_STOCK' }, { status: 409 });

  // Check no active assignment
  const activeAssignment = await tenantPrisma.vehicleItemAssignment.findFirst({
    where: { serializedItemId: id, removedAt: null },
    include: { vehicle: { select: { licensePlate: true } } },
  });
  if (activeAssignment) {
    return NextResponse.json(
      {
        error: 'ITEM_ALREADY_INSTALLED',
        currentVehicle: activeAssignment.vehicle.licensePlate,
        position: activeAssignment.position,
      },
      { status: 409 }
    );
  }

  // Verify vehicle belongs to tenant
  const vehicle = await tenantPrisma.vehicle.findFirst({
    where: { id: vehicleId },
  });
  if (!vehicle)
    return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });

  const installedAtDate = installedAt ? new Date(installedAt) : new Date();

  const [assignment] = await tenantPrisma.$transaction([
    tenantPrisma.vehicleItemAssignment.create({
      data: {
        tenantId: user.tenantId,
        vehicleId,
        serializedItemId: id,
        position: position ?? null,
        installedAt: installedAtDate,
        installedAtKm: installedAtKm ?? null,
      },
    }),
    tenantPrisma.serializedItem.update({
      where: { id },
      data: { status: 'INSTALLED' },
    }),
  ]);

  return NextResponse.json(
    {
      assignmentId: assignment.id,
      position: assignment.position,
      installedAt: assignment.installedAt,
    },
    { status: 201 }
  );
}

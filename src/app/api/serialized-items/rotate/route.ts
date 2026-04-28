import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { canOperateSerializedAssets } from '@/lib/permissions';

export async function POST(request: NextRequest) {
  const { user, tenantPrisma } = await requireCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canOperateSerializedAssets(user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await request.json();
  const { vehicleId, itemAId, itemBId } = body;

  if (!vehicleId || !itemAId || !itemBId) {
    return NextResponse.json({ error: 'MISSING_FIELDS' }, { status: 400 });
  }

  // Validate that both items have active assignment with that vehicleId
  const assignments = await tenantPrisma.vehicleItemAssignment.findMany({
    where: {
      serializedItemId: { in: [itemAId, itemBId] },
      vehicleId,
      removedAt: null,
    },
  });

  if (assignments.length !== 2) {
    return NextResponse.json(
      { error: 'BOTH_ITEMS_MUST_BE_ASSIGNED_TO_VEHICLE' },
      { status: 400 }
    );
  }

  const assignmentA = assignments.find(a => a.serializedItemId === itemAId)!;
  const assignmentB = assignments.find(a => a.serializedItemId === itemBId)!;

  const posA = assignmentA.position;
  const posB = assignmentB.position;

  await tenantPrisma.$transaction(async tx => {
    // Swap positions
    await tx.vehicleItemAssignment.update({
      where: { id: assignmentA.id },
      data: { position: posB },
    });

    await tx.vehicleItemAssignment.update({
      where: { id: assignmentB.id },
      data: { position: posA },
    });

    // Create ROTACION event for each one
    await tx.serializedItemEvent.create({
      data: {
        tenantId: user.tenantId,
        serializedItemId: itemAId,
        eventType: 'ROTACION',
        performedAt: new Date(),
        performedById: user.id,
        notes: `Rotado de posición ${posA} a ${posB}`,
      },
    });

    await tx.serializedItemEvent.create({
      data: {
        tenantId: user.tenantId,
        serializedItemId: itemBId,
        eventType: 'ROTACION',
        performedAt: new Date(),
        performedById: user.id,
        notes: `Rotado de posición ${posB} a ${posA}`,
      },
    });
  });

  return NextResponse.json({
    success: true,
    itemANewPosition: posB,
    itemBNewPosition: posA,
  });
}

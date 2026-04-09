import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import {
  canOperateSerializedAssets,
  canManageSerializedAssets,
} from '@/lib/permissions';

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
  const { removedAt, retire } = body;

  // If retiring, require MANAGE role
  if (retire && !canManageSerializedAssets(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Verify active assignment exists
  const assignment = await tenantPrisma.vehicleItemAssignment.findFirst({
    where: { serializedItemId: id, removedAt: null },
  });
  if (!assignment)
    return NextResponse.json(
      { error: 'NO_ACTIVE_ASSIGNMENT' },
      { status: 400 }
    );

  const closedAt = removedAt ? new Date(removedAt) : new Date();

  await tenantPrisma.$transaction(async tx => {
    await tx.vehicleItemAssignment.update({
      where: { id: assignment.id },
      data: { removedAt: closedAt },
    });

    if (retire) {
      await tx.serializedItem.update({
        where: { id },
        data: { status: 'RETIRED', retiredAt: closedAt },
      });
      await tx.serializedItemEvent.create({
        data: {
          tenantId: user.tenantId,
          serializedItemId: id,
          eventType: 'BAJA',
          performedAt: closedAt,
          performedById: user.id,
          notes: 'Dado de baja al desinstalar',
        },
      });
    } else {
      await tx.serializedItem.update({
        where: { id },
        data: { status: 'IN_STOCK' },
      });
    }
  });

  return NextResponse.json({
    status: retire ? 'RETIRED' : 'IN_STOCK',
    removedAt: closedAt,
  });
}

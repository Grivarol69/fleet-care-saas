import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import {
  canManageSerializedAssets,
  canOperateSerializedAssets,
} from '@/lib/permissions';
import { ALLOWED_EVENT_TYPES } from '@/lib/serialized-asset-constants';
import { evaluateAndCreateAlerts } from '@/lib/services/serialized-item-alert';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, tenantPrisma } = await requireCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const { eventType, performedAt, vehicleKm, specs, notes } = body;

  // Permission check (BAJA requires MANAGE role)
  if (eventType === 'BAJA') {
    if (!canManageSerializedAssets(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  } else {
    if (!canOperateSerializedAssets(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Validate eventType
  if (!ALLOWED_EVENT_TYPES.includes(eventType)) {
    return NextResponse.json({ error: 'INVALID_EVENT_TYPE' }, { status: 400 });
  }

  // Verify item exists and belongs to tenant
  const item = await tenantPrisma.serializedItem.findFirst({
    where: { id, tenantId: user.tenantId },
  });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const performedAtDate = performedAt ? new Date(performedAt) : new Date();

  await tenantPrisma.$transaction(async tx => {
    await tx.serializedItemEvent.create({
      data: {
        tenantId: user.tenantId,
        serializedItemId: id,
        eventType,
        performedAt: performedAtDate,
        performedById: user.id,
        vehicleKm: vehicleKm ?? null,
        specs: specs ?? null,
        notes: notes ?? null,
      },
    });

    if (eventType === 'BAJA') {
      await tx.serializedItem.update({
        where: { id },
        data: { status: 'RETIRED', retiredAt: performedAtDate },
      });
    }
  });

  // After transaction: evaluate alerts if REVISION with specs
  if (eventType === 'REVISION' && specs) {
    const assignment = await tenantPrisma.vehicleItemAssignment.findFirst({
      where: { serializedItemId: id, removedAt: null },
    });
    await evaluateAndCreateAlerts(
      id,
      specs,
      user.tenantId,
      assignment?.vehicleId ?? null,
      tenantPrisma
    );
  }

  return NextResponse.json(
    { id, eventType, performedAt: performedAtDate },
    { status: 201 }
  );
}

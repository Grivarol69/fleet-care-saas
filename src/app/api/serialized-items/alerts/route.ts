import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { canViewSerializedAssets } from '@/lib/permissions';
import type { SerializedItemAlertStatus } from '@prisma/client';

export async function GET(request: NextRequest) {
  const { user, tenantPrisma } = await requireCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canViewSerializedAssets(user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const status = (searchParams.get('status') ??
    'ACTIVE') as SerializedItemAlertStatus;

  const alerts = await tenantPrisma.serializedItemAlert.findMany({
    where: { tenantId: user.tenantId, status },
    include: {
      serializedItem: { select: { id: true, serialNumber: true, type: true } },
      vehicle: { select: { id: true, licensePlate: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ alerts });
}

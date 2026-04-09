import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { canManageSerializedAssets } from '@/lib/permissions';

export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { user, tenantPrisma } = await requireCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManageSerializedAssets(user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { id } = await params;

  const alert = await tenantPrisma.serializedItemAlert.findFirst({
    where: { id, tenantId: user.tenantId },
  });
  if (!alert) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = await tenantPrisma.serializedItemAlert.update({
    where: { id },
    data: { status: 'RESOLVED', resolvedAt: new Date(), resolvedById: user.id },
  });

  return NextResponse.json({ id: updated.id, status: updated.status });
}

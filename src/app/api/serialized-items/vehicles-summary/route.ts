import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { canViewSerializedAssets } from '@/lib/permissions';
import { AXLE_CONFIG_POSITIONS } from '@/lib/serialized-asset-constants';

export async function GET(request: NextRequest) {
  const { user, tenantPrisma } = await requireCurrentUser();
  if (!user)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canViewSerializedAssets(user.role))
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { searchParams } = request.nextUrl;
  const type = searchParams.get('type') || undefined;
  const search = searchParams.get('search') || undefined;

  const vehicles = await tenantPrisma.vehicle.findMany({
    where: {
      status: 'ACTIVE',
      ...(search
        ? { licensePlate: { contains: search, mode: 'insensitive' } }
        : {}),
    },
    include: {
      brand: { select: { name: true } },
      line: { select: { name: true } },
      itemAssignments: {
        where: { removedAt: null },
        include: {
          serializedItem: {
            select: { id: true, serialNumber: true, type: true, specs: true },
            include: {
              alerts: { where: { status: 'ACTIVE' }, select: { id: true } },
            },
          },
        },
      },
      itemAlerts: { where: { status: 'ACTIVE' }, select: { id: true } },
    },
    orderBy: { licensePlate: 'asc' },
  });

  const result = vehicles.map(v => {
    const assignments = v.itemAssignments
      .filter(a => !type || a.serializedItem.type === type)
      .map(a => ({
        assignmentId: a.id,
        position: a.position,
        serializedItemId: a.serializedItem.id,
        serialNumber: a.serializedItem.serialNumber,
        type: a.serializedItem.type,
        specs: a.serializedItem.specs,
        activeAlertCount: a.serializedItem.alerts.length,
      }));

    return {
      vehicleId: v.id,
      licensePlate: v.licensePlate,
      brandName: v.brand.name,
      lineName: v.line.name,
      axleConfig: v.axleConfig ?? 'STANDARD_4',
      totalSlots: (
        AXLE_CONFIG_POSITIONS[v.axleConfig ?? 'STANDARD_4'] ??
        AXLE_CONFIG_POSITIONS['STANDARD_4']
      ).length,
      activeAlertCount: v.itemAlerts.length,
      assignments,
    };
  });

  return NextResponse.json({ vehicles: result });
}

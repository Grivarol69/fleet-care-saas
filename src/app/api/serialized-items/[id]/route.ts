import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { canViewSerializedAssets } from '@/lib/permissions';

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/serialized-items/[id]
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canViewSerializedAssets(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = await params;

    const item = await tenantPrisma.serializedItem.findFirst({
      where: { id, tenantId: user.tenantId },
      include: {
        invoiceItem: {
          select: { id: true, description: true, unitPrice: true },
          include: {
            invoice: { select: { invoiceNumber: true, invoiceDate: true } },
          },
        },
        vehicleAssignments: {
          where: { removedAt: null },
          take: 1,
          include: { vehicle: { select: { id: true, licensePlate: true } } },
        },
        events: {
          include: {
            performer: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
          orderBy: { performedAt: 'desc' },
        },
        alerts: { where: { status: 'ACTIVE' } },
      },
    });

    if (!item)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const assignment = item.vehicleAssignments[0] ?? null;

    return NextResponse.json({
      ...item,
      currentAssignment: assignment
        ? {
            id: assignment.id,
            vehicleId: assignment.vehicleId,
            vehicleLicensePlate: assignment.vehicle.licensePlate,
            position: assignment.position,
            installedAt: assignment.installedAt,
          }
        : null,
      vehicleAssignments: undefined,
      activeAlerts: item.alerts,
      alerts: undefined,
    });
  } catch (error) {
    console.error('[SERIALIZED_ITEM_GET_ONE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

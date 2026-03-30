import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { canViewSerializedAssets } from '@/lib/permissions';

// GET /api/serialized-items
export async function GET(request: NextRequest) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!canViewSerializedAssets(user.role))
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = request.nextUrl;
    const status = searchParams.get('status') || undefined;
    const type = searchParams.get('type') || undefined;
    const vehicleId = searchParams.get('vehicleId') || undefined;
    const batchNumber = searchParams.get('batchNumber') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get('pageSize') || '25'))
    );
    const skip = (page - 1) * pageSize;

    const where: Record<string, unknown> = { tenantId: user.tenantId };
    if (status) where.status = status;
    if (type) where.type = type;
    if (vehicleId)
      where.vehicleAssignments = { some: { vehicleId, removedAt: null } };
    if (batchNumber) where.batchNumber = batchNumber;
    if (search)
      where.OR = [
        { serialNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];

    const [total, rawItems] = await Promise.all([
      tenantPrisma.serializedItem.count({ where }),
      tenantPrisma.serializedItem.findMany({
        where,
        include: {
          invoiceItem: {
            select: { id: true, description: true, unitPrice: true },
          },
          vehicleAssignments: {
            where: { removedAt: null },
            take: 1,
            include: { vehicle: { select: { licensePlate: true } } },
          },
          alerts: { where: { status: 'ACTIVE' }, select: { id: true } },
        },
        skip,
        take: pageSize,
        orderBy: { receivedAt: 'desc' },
      }),
    ]);

    const items = rawItems.map(item => {
      const assignment = item.vehicleAssignments[0] ?? null;
      return {
        id: item.id,
        serialNumber: item.serialNumber,
        batchNumber: item.batchNumber,
        type: item.type,
        status: item.status,
        receivedAt: item.receivedAt,
        specs: item.specs,
        invoiceItem: item.invoiceItem
          ? {
              description: item.invoiceItem.description,
              unitPrice: item.invoiceItem.unitPrice,
            }
          : null,
        currentAssignment: assignment
          ? {
              vehicleLicensePlate: assignment.vehicle.licensePlate,
              position: assignment.position,
            }
          : null,
        activeAlertCount: item.alerts.length,
      };
    });

    return NextResponse.json({ items, total, page, pageSize });
  } catch (error) {
    console.error('[SERIALIZED_ITEMS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

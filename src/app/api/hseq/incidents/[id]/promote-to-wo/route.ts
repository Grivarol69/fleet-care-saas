import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';

const MANAGE_ROLES = ['OWNER', 'MANAGER', 'COORDINATOR'];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!MANAGE_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, priority, mantType, technicianId, providerId, workType } =
      body;

    if (!title || !priority || !mantType) {
      return NextResponse.json(
        { error: 'title, priority y mantType son requeridos' },
        { status: 400 }
      );
    }

    const incident = await tenantPrisma.incidentAlert.findUnique({
      where: { id },
    });
    if (!incident)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (incident.status === 'WO_CREATED') {
      return NextResponse.json(
        { error: 'Ya existe una OT para esta novedad' },
        { status: 409 }
      );
    }

    const vehicle = await tenantPrisma.vehicle.findUnique({
      where: { id: incident.vehicleId },
      select: { mileage: true },
    });

    const result = await tenantPrisma.$transaction(async tx => {
      const workOrder = await tx.workOrder.create({
        data: {
          tenantId: user.tenantId,
          vehicleId: incident.vehicleId,
          title,
          description: `Generada desde novedad HSEQ ${incident.code}: ${incident.description}`,
          mantType,
          priority,
          workType: workType ?? 'EXTERNAL',
          requestedBy: user.id,
          creationMileage: vehicle?.mileage ?? 0,
          ...(technicianId && { technicianId }),
          ...(providerId && { providerId }),
        },
      });

      await tx.incidentAlert.update({
        where: { id },
        data: { status: 'WO_CREATED', workOrderId: workOrder.id },
      });

      return workOrder;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    console.error('[HSEQ_PROMOTE_TO_WO]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Error' },
      { status: 500 }
    );
  }
}

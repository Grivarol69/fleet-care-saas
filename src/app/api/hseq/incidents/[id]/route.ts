import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';

const MANAGE_ROLES = ['OWNER', 'MANAGER', 'COORDINATOR'];

export async function PATCH(
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
    const { status, dismissNote } = body;

    const incident = await tenantPrisma.incidentAlert.findUnique({
      where: { id },
    });
    if (!incident)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updated = await tenantPrisma.incidentAlert.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(status === 'DISMISSED' && {
          dismissedBy: user.id,
          dismissNote: dismissNote ?? null,
        }),
      },
      include: {
        vehicle: { select: { id: true, licensePlate: true } },
        driver: { select: { id: true, name: true } },
        workOrder: { select: { id: true, code: true } },
      },
    });

    return NextResponse.json(updated);
  } catch (error: unknown) {
    console.error('[HSEQ_INCIDENT_PATCH]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Error' },
      { status: 500 }
    );
  }
}

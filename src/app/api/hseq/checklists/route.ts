import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { ChecklistItemStatus } from '@prisma/client';

const READ_ROLES = ['OWNER', 'MANAGER', 'COORDINATOR'];

export async function GET(request: NextRequest) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!READ_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');
    const driverId = searchParams.get('driverId');
    const status = searchParams.get('status');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const checklists = await tenantPrisma.dailyChecklist.findMany({
      where: {
        ...(vehicleId && { vehicleId }),
        ...(driverId && { driverId }),
        ...(status && { status: status as never }),
        ...(from || to
          ? {
              createdAt: {
                ...(from && { gte: new Date(from) }),
                ...(to && { lte: new Date(to) }),
              },
            }
          : {}),
      },
      include: {
        vehicle: { select: { id: true, licensePlate: true } },
        driver: { select: { id: true, name: true } },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(checklists);
  } catch (error: unknown) {
    console.error('[HSEQ_CHECKLISTS_GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { clientUuid, vehicleId, driverId, odometer, notes, items } = body;

    if (
      !clientUuid ||
      !vehicleId ||
      !driverId ||
      odometer === undefined ||
      !Array.isArray(items)
    ) {
      return NextResponse.json(
        {
          error:
            'clientUuid, vehicleId, driverId, odometer e items son requeridos',
        },
        { status: 400 }
      );
    }

    // Status general = el peor entre los ítems
    const worstStatus = items.reduce(
      (worst: ChecklistItemStatus, item: { status: ChecklistItemStatus }) => {
        if (item.status === 'CRITICAL') return 'CRITICAL';
        if (item.status === 'OBSERVATION' && worst !== 'CRITICAL')
          return 'OBSERVATION';
        return worst;
      },
      'OK' as ChecklistItemStatus
    );

    // Generar código
    const maxResult = await tenantPrisma.dailyChecklist.findFirst({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      select: { code: true },
    });
    const maxVal = maxResult?.code
      ? parseInt(maxResult.code.replace('CHK-', ''), 10)
      : 0;

    const seq = await tenantPrisma.tenantSequence.upsert({
      where: {
        tenantId_entityType: {
          tenantId: user.tenantId,
          entityType: 'CHECKLIST',
        },
      },
      update: { lastValue: { increment: 1 } },
      create: {
        tenantId: user.tenantId,
        entityType: 'CHECKLIST',
        lastValue: maxVal + 1,
        prefix: 'CHK-',
      },
    });
    const code = `CHK-${String(seq.lastValue).padStart(4, '0')}`;

    try {
      const checklist = await tenantPrisma.dailyChecklist.create({
        data: {
          tenantId: user.tenantId,
          clientUuid,
          code,
          vehicleId,
          driverId,
          odometer,
          status: worstStatus,
          notes: notes ?? null,
          items: {
            create: items.map(
              (item: {
                category: string;
                label: string;
                status: ChecklistItemStatus;
                notes?: string;
              }) => ({
                category: item.category,
                label: item.label,
                status: item.status,
                notes: item.notes ?? null,
              })
            ),
          },
        },
        include: {
          vehicle: { select: { id: true, licensePlate: true } },
          driver: { select: { id: true, name: true } },
          items: true,
        },
      });

      // Si hay ítems CRITICAL → generar IncidentAlert automáticamente
      const criticalItems = items.filter(
        (i: { status: string }) => i.status === 'CRITICAL'
      );
      if (criticalItems.length > 0) {
        const criticalLabels = criticalItems
          .map((i: { label: string }) => i.label)
          .join(', ');
        const incMaxResult = await tenantPrisma.incidentAlert.findFirst({
          where: { tenantId: user.tenantId },
          orderBy: { createdAt: 'desc' },
          select: { code: true },
        });
        const incMaxVal = incMaxResult?.code
          ? parseInt(incMaxResult.code.replace('INC-', ''), 10)
          : 0;
        const incSeq = await tenantPrisma.tenantSequence.upsert({
          where: {
            tenantId_entityType: {
              tenantId: user.tenantId,
              entityType: 'INCIDENT',
            },
          },
          update: { lastValue: { increment: 1 } },
          create: {
            tenantId: user.tenantId,
            entityType: 'INCIDENT',
            lastValue: incMaxVal + 1,
            prefix: 'INC-',
          },
        });
        const incCode = `INC-${String(incSeq.lastValue).padStart(4, '0')}`;

        await tenantPrisma.incidentAlert.create({
          data: {
            tenantId: user.tenantId,
            clientUuid: `checklist-${checklist.id}`,
            code: incCode,
            vehicleId,
            driverId,
            reportedBy: user.id,
            description: `Checklist ${code} con ítems críticos: ${criticalLabels}`,
            severity: 'CRITICAL',
          },
        });
      }

      return NextResponse.json(checklist, { status: 201 });
    } catch (e: unknown) {
      if ((e as { code?: string }).code === 'P2002') {
        const existing = await tenantPrisma.dailyChecklist.findUnique({
          where: {
            tenantId_clientUuid: { tenantId: user.tenantId, clientUuid },
          },
          include: {
            vehicle: { select: { id: true, licensePlate: true } },
            driver: { select: { id: true, name: true } },
            items: true,
          },
        });
        return NextResponse.json(existing, { status: 200 });
      }
      throw e;
    }
  } catch (error: unknown) {
    console.error('[HSEQ_CHECKLISTS_POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Error' },
      { status: 500 }
    );
  }
}

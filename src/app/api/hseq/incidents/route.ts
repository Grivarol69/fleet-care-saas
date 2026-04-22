import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { AlertLevel } from '@prisma/client';

const ALLOWED_ROLES = [
  'OWNER',
  'MANAGER',
  'COORDINATOR',
  'TECHNICIAN',
  'DRIVER',
];

export async function GET(request: NextRequest) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const severity = searchParams.get('severity');
    const vehicleId = searchParams.get('vehicleId');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    const incidents = await tenantPrisma.incidentAlert.findMany({
      where: {
        ...(status && { status: status as never }),
        ...(severity && { severity: severity as AlertLevel }),
        ...(vehicleId && { vehicleId }),
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
        workOrder: { select: { id: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(incidents);
  } catch (error: unknown) {
    console.error('[HSEQ_INCIDENTS_GET]', error);
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
    const {
      clientUuid,
      vehicleId,
      driverId,
      description,
      photoUrl,
      latitude,
      longitude,
      severity,
    } = body;

    if (!clientUuid || !vehicleId || !description || !severity) {
      return NextResponse.json(
        {
          error: 'clientUuid, vehicleId, description y severity son requeridos',
        },
        { status: 400 }
      );
    }

    // Generar código autonumerado
    const maxResult = await tenantPrisma.incidentAlert.findFirst({
      where: { tenantId: user.tenantId },
      orderBy: { createdAt: 'desc' },
      select: { code: true },
    });
    const maxVal = maxResult?.code
      ? parseInt(maxResult.code.replace('INC-', ''), 10)
      : 0;

    const seq = await tenantPrisma.tenantSequence.upsert({
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
        lastValue: maxVal + 1,
        prefix: 'INC-',
      },
    });
    const code = `INC-${String(seq.lastValue).padStart(4, '0')}`;

    try {
      const incident = await tenantPrisma.incidentAlert.create({
        data: {
          tenantId: user.tenantId,
          clientUuid,
          code,
          vehicleId,
          driverId: driverId ?? null,
          reportedBy: user.id,
          description,
          photoUrl: photoUrl ?? null,
          latitude: latitude ?? null,
          longitude: longitude ?? null,
          severity,
        },
        include: {
          vehicle: { select: { id: true, licensePlate: true } },
          driver: { select: { id: true, name: true } },
        },
      });
      return NextResponse.json(incident, { status: 201 });
    } catch (e: unknown) {
      // Idempotencia: clientUuid duplicado → devolver el existente
      if ((e as { code?: string }).code === 'P2002') {
        const existing = await tenantPrisma.incidentAlert.findUnique({
          where: {
            tenantId_clientUuid: { tenantId: user.tenantId, clientUuid },
          },
          include: {
            vehicle: { select: { id: true, licensePlate: true } },
            driver: { select: { id: true, name: true } },
          },
        });
        return NextResponse.json(existing, { status: 200 });
      }
      throw e;
    }
  } catch (error: unknown) {
    console.error('[HSEQ_INCIDENTS_POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Error' },
      { status: 500 }
    );
  }
}

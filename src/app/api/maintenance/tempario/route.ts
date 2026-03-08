import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { requireMasterDataMutationPermission } from '@/lib/permissions';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const mantItemId = searchParams.get('mantItemId');
    const vehicleBrandId = searchParams.get('vehicleBrandId');
    const vehicleLineId = searchParams.get('vehicleLineId');
    const isGlobalParam = searchParams.get('isGlobal');

    const where: Prisma.MantItemProcedureWhereInput = {
      OR: [{ isGlobal: true }, { tenantId: user.tenantId }],
    };

    if (mantItemId) where.mantItemId = mantItemId;
    if (vehicleBrandId) where.vehicleBrandId = vehicleBrandId;
    if (vehicleLineId) where.vehicleLineId = vehicleLineId;
    if (isGlobalParam !== null) where.isGlobal = isGlobalParam === 'true';

    const procedures = await tenantPrisma.mantItemProcedure.findMany({
      where,
      include: {
        mantItem: { select: { id: true, name: true } },
        vehicleBrand: { select: { id: true, name: true } },
        vehicleLine: { select: { id: true, name: true } },
      },
      orderBy: [
        { vehicleBrand: { name: 'asc' } },
        { vehicleLine: { name: 'asc' } },
      ],
    });

    return NextResponse.json(procedures);
  } catch (error) {
    console.error('[TEMPARIO_GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      mantItemId,
      vehicleBrandId,
      vehicleLineId,
      baseHours,
      steps = [],
      isGlobal = false,
    } = body;

    if (!mantItemId)
      return NextResponse.json({ error: 'mantItemId requerido' }, { status: 400 });
    if (baseHours === undefined || baseHours <= 0)
      return NextResponse.json({ error: 'baseHours debe ser > 0' }, { status: 400 });

    const itemScope = {
      isGlobal: isGlobal as boolean,
      tenantId: isGlobal ? null : user.tenantId,
    };

    try {
      requireMasterDataMutationPermission(user, itemScope);
    } catch (permError) {
      return NextResponse.json(
        { error: (permError as Error).message },
        { status: 403 }
      );
    }

    const existing = await tenantPrisma.mantItemProcedure.findFirst({
      where: {
        mantItemId,
        vehicleBrandId: vehicleBrandId ?? null,
        vehicleLineId: vehicleLineId ?? null,
        tenantId: itemScope.tenantId,
        isGlobal: itemScope.isGlobal,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe un procedimiento para esta combinación' },
        { status: 409 }
      );
    }

    const created = await tenantPrisma.mantItemProcedure.create({
      data: {
        tenantId: itemScope.tenantId,
        isGlobal: itemScope.isGlobal,
        mantItemId,
        vehicleBrandId: vehicleBrandId ?? null,
        vehicleLineId: vehicleLineId ?? null,
        baseHours,
        steps,
      },
      include: {
        mantItem: { select: { id: true, name: true } },
        vehicleBrand: { select: { id: true, name: true } },
        vehicleLine: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('[TEMPARIO_POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

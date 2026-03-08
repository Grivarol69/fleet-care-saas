import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { Prisma } from '@prisma/client';

type MantItemProcedureClient = {
  mantItemProcedure: {
    findFirst(args: {
      where: Prisma.MantItemProcedureWhereInput;
    }): Promise<{ id: string; steps: Prisma.JsonValue; [key: string]: unknown } | null>;
  };
};

export async function resolveProcedure(
  tenantPrisma: MantItemProcedureClient,
  mantItemId: string,
  vehicleBrandId: string | null,
  vehicleLineId: string | null,
  tenantId: string
) {
  const variations: Prisma.MantItemProcedureWhereInput[] = [
    { tenantId, mantItemId, vehicleBrandId, vehicleLineId, isGlobal: false },
    { isGlobal: true, mantItemId, vehicleBrandId, vehicleLineId },
    { tenantId, mantItemId, vehicleBrandId, vehicleLineId: null, isGlobal: false },
    { isGlobal: true, mantItemId, vehicleBrandId, vehicleLineId: null },
    { isGlobal: true, mantItemId, vehicleBrandId: null, vehicleLineId: null },
  ];

  for (const where of variations) {
    const match = await tenantPrisma.mantItemProcedure.findFirst({ where });
    if (match) return match;
  }
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const mantItemId = searchParams.get('mantItemId');
    const vehicleBrandId = searchParams.get('vehicleBrandId');
    const vehicleLineId = searchParams.get('vehicleLineId');

    if (!mantItemId) {
      return NextResponse.json({ error: 'mantItemId es requerido' }, { status: 400 });
    }

    const procedure = await resolveProcedure(
      tenantPrisma,
      mantItemId,
      vehicleBrandId,
      vehicleLineId,
      user.tenantId
    );

    if (!procedure) {
      return NextResponse.json(
        { error: 'No hay procedimiento registrado para esta combinación' },
        { status: 404 }
      );
    }

    return NextResponse.json(procedure);
  } catch (error) {
    console.error('[TEMPARIO_LOOKUP_GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

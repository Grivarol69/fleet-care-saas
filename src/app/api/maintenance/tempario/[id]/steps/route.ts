import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { requireMasterDataMutationPermission } from '@/lib/permissions';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: procedureId } = await params;

    const steps = await tenantPrisma.mantItemProcedureStep.findMany({
      where: { procedureId },
      include: {
        temparioItem: {
          select: {
            id: true,
            code: true,
            description: true,
            referenceHours: true,
          },
        },
      },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(steps);
  } catch (error) {
    console.error('[TEMPARIO_STEPS_GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: procedureId } = await params;

    const procedure = await tenantPrisma.mantItemProcedure.findUnique({
      where: { id: procedureId },
    });

    if (!procedure) {
      return NextResponse.json(
        { error: 'Procedimiento no encontrado' },
        { status: 404 }
      );
    }

    try {
      requireMasterDataMutationPermission(user, procedure);
    } catch (permError) {
      return NextResponse.json(
        { error: (permError as Error).message },
        { status: 403 }
      );
    }

    const { temparioItemId, order, standardHours } = await req.json();

    if (!temparioItemId || order === undefined || standardHours === undefined) {
      return NextResponse.json(
        { error: 'temparioItemId, order y standardHours son requeridos' },
        { status: 400 }
      );
    }

    const existingOrder = await tenantPrisma.mantItemProcedureStep.findUnique({
      where: { procedureId_order: { procedureId, order } },
    });

    if (existingOrder) {
      return NextResponse.json(
        { error: `El orden ${order} ya está en uso en este procedimiento` },
        { status: 409 }
      );
    }

    const step = await tenantPrisma.mantItemProcedureStep.create({
      data: { procedureId, temparioItemId, order, standardHours },
      include: {
        temparioItem: {
          select: {
            id: true,
            code: true,
            description: true,
            referenceHours: true,
          },
        },
      },
    });

    return NextResponse.json(step, { status: 201 });
  } catch (error) {
    console.error('[TEMPARIO_STEPS_POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

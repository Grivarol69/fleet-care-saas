import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { requireMasterDataMutationPermission } from '@/lib/permissions';
import { Prisma } from '@prisma/client';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: procedureId, stepId } = await params;

    const step = await tenantPrisma.mantItemProcedureStep.findUnique({
      where: { id: stepId },
      include: { procedure: true },
    });

    if (!step || step.procedureId !== procedureId) {
      return NextResponse.json(
        { error: 'Paso no encontrado' },
        { status: 404 }
      );
    }

    try {
      requireMasterDataMutationPermission(user, step.procedure);
    } catch (permError) {
      return NextResponse.json(
        { error: (permError as Error).message },
        { status: 403 }
      );
    }

    const { order, standardHours } = await req.json();
    const data: Prisma.MantItemProcedureStepUpdateInput = {};

    if (order !== undefined) {
      if (order !== step.order) {
        const existingOrder =
          await tenantPrisma.mantItemProcedureStep.findUnique({
            where: { procedureId_order: { procedureId, order } },
          });
        if (existingOrder) {
          return NextResponse.json(
            { error: `El orden ${order} ya está en uso en este procedimiento` },
            { status: 409 }
          );
        }
      }
      data.order = order;
    }

    if (standardHours !== undefined) {
      data.standardHours = standardHours;
    }

    const updated = await tenantPrisma.mantItemProcedureStep.update({
      where: { id: stepId },
      data,
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

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[TEMPARIO_STEP_ID_PATCH]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; stepId: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: procedureId, stepId } = await params;

    const step = await tenantPrisma.mantItemProcedureStep.findUnique({
      where: { id: stepId },
      include: { procedure: true },
    });

    if (!step || step.procedureId !== procedureId) {
      return NextResponse.json(
        { error: 'Paso no encontrado' },
        { status: 404 }
      );
    }

    try {
      requireMasterDataMutationPermission(user, step.procedure);
    } catch (permError) {
      return NextResponse.json(
        { error: (permError as Error).message },
        { status: 403 }
      );
    }

    await tenantPrisma.mantItemProcedureStep.delete({ where: { id: stepId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[TEMPARIO_STEP_ID_DELETE]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

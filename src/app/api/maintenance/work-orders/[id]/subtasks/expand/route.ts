import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { resolveProcedure } from '../../../../tempario/lookup/route';

type ProcedureStep = {
  order: number;
  standardHours: number;
  temparioItemId: string;
  temparioItem: {
    id: string;
    description: string;
  };
};

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: workOrderId } = await params;

    const body = await req.json();
    const { workOrderItemId } = body;

    if (!workOrderItemId)
      return NextResponse.json(
        { error: 'workOrderItemId es requerido' },
        { status: 400 }
      );

    const workOrderItem = await tenantPrisma.workOrderItem.findUnique({
      where: { id: workOrderItemId, workOrderId },
      include: {
        workOrder: {
          select: { vehicle: { select: { brandId: true, lineId: true } } },
        },
      },
    });

    if (!workOrderItem)
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    const { brandId, lineId } = workOrderItem.workOrder.vehicle;

    const procedure = await resolveProcedure(
      tenantPrisma,
      workOrderItem.mantItemId,
      brandId,
      lineId,
      user.tenantId
    );

    if (!procedure)
      return NextResponse.json(
        { error: 'Sin procedimiento registrado para este vehículo/tarea' },
        { status: 404 }
      );

    const existing = await tenantPrisma.workOrderSubTask.findFirst({
      where: { workOrderItemId, procedureId: { not: null } },
    });

    if (existing)
      return NextResponse.json(
        { error: 'El tempario ya fue expandido para esta tarea' },
        { status: 409 }
      );

    const steps = (procedure.steps as ProcedureStep[]) ?? [];

    if (steps.length === 0)
      return NextResponse.json(
        { message: 'El procedimiento no tiene pasos para expandir' },
        { status: 200 }
      );

    await tenantPrisma.workOrderSubTask.createMany({
      data: steps.map(step => ({
        workOrderItemId,
        procedureId: procedure.id,
        temparioItemId: step.temparioItemId,
        description: step.temparioItem.description,
        standardHours: step.standardHours,
        sequence: step.order,
        status: 'PENDING' as const,
      })),
    });

    const created = await tenantPrisma.workOrderSubTask.findMany({
      where: { workOrderItemId, procedureId: procedure.id as string },
      orderBy: { sequence: 'asc' },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('[SUBTASKS_EXPAND_POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

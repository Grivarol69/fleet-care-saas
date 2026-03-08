import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id } = await params;

    const workOrder = await tenantPrisma.workOrder.findUnique({
      where: { id, tenantId: user.tenantId },
    });
    if (!workOrder) return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    const subTasks = await tenantPrisma.workOrderSubTask.findMany({
      where: { workOrderItem: { workOrderId: id } },
      include: {
        procedure: { select: { id: true, mantItemId: true, baseHours: true } },
        technician: { select: { id: true, name: true } },
      },
      orderBy: [{ workOrderItemId: 'asc' }, { sequence: 'asc' }],
    });

    type SubTask = (typeof subTasks)[number];
    const grouped = subTasks.reduce<Record<string, SubTask[]>>((acc, task) => {
      const key = task.workOrderItemId;
      if (!acc[key]) acc[key] = [];
      acc[key]!.push(task);
      return acc;
    }, {});

    return NextResponse.json(grouped);
  } catch (error) {
    console.error('[SUBTASKS_GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { id: workOrderId } = await params;

    const body = await req.json();
    const { workOrderItemId, description, directHours, indirectHours, technicianId, notes, sequence } = body;

    if (!description)
      return NextResponse.json({ error: 'description es requerido' }, { status: 400 });

    const workOrderItem = await tenantPrisma.workOrderItem.findUnique({
      where: { id: workOrderItemId, workOrderId },
    });
    if (!workOrderItem)
      return NextResponse.json({ error: 'WorkOrderItem no pertenece a esta OT' }, { status: 400 });

    const subTask = await tenantPrisma.workOrderSubTask.create({
      data: {
        workOrderItemId,
        description,
        procedureId: null,
        stepOrder: null,
        standardHours: null,
        directHours: directHours ?? null,
        indirectHours: indirectHours ?? null,
        technicianId: technicianId ?? null,
        notes: notes ?? null,
        sequence: sequence ?? 0,
        status: 'PENDING',
      },
    });

    return NextResponse.json(subTask, { status: 201 });
  } catch (error) {
    console.error('[SUBTASKS_POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

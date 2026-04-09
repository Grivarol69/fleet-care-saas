import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; subTaskId: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { subTaskId } = await params;

    const body = await req.json();
    const { directHours, status, notes } = body;

    const existing = await tenantPrisma.workOrderSubTask.findUnique({
      where: { id: subTaskId },
    });
    if (!existing)
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    const data: Prisma.WorkOrderSubTaskUpdateInput = {};

    if (directHours !== undefined && directHours >= 0)
      data.directHours = directHours;
    if (notes !== undefined) data.notes = notes;

    if (status !== undefined) {
      data.status = status;
      if (status === 'DONE' && !existing.completedAt) {
        data.completedAt = new Date();
      } else if (status === 'PENDING' || status === 'IN_PROGRESS') {
        data.completedAt = null;
      }
    }

    const updated = await tenantPrisma.workOrderSubTask.update({
      where: { id: subTaskId },
      data,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[SUBTASK_ID_PATCH]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; subTaskId: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { subTaskId } = await params;

    const existing = await tenantPrisma.workOrderSubTask.findUnique({
      where: { id: subTaskId },
    });
    if (!existing)
      return NextResponse.json({ error: 'No encontrado' }, { status: 404 });

    if (existing.status !== 'PENDING')
      return NextResponse.json(
        { error: 'No se puede eliminar una subtarea en progreso o completada' },
        { status: 400 }
      );

    await tenantPrisma.workOrderSubTask.delete({ where: { id: subTaskId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[SUBTASK_ID_DELETE]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

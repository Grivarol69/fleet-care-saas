import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { canApproveWorkOrder } from '@/lib/permissions';
import {
  notifyWOEvent,
  WO_NOTIFICATION_EVENTS,
} from '@/lib/notifications/wo-events';

/**
 * POST — Authorize a WorkOrder (Step 3 of wizard).
 * Guards:
 *   - Role must be OWNER, MANAGER, or SUPER_ADMIN
 *   - TECHNICIAN cannot self-authorize (openingBy === user.id)
 *   - WO must be in DRAFTING or PENDING status
 *   - All workOrderItems must have unitPrice > 0
 *
 * Side effects:
 *   - Sets status = APPROVED, authorizedBy = user.id, authorizedAt = now()
 *   - Fires WhatsApp AUTHORIZED event (fire-and-forget)
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canApproveWorkOrder(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para autorizar órdenes de trabajo' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const workOrder = await tenantPrisma.workOrder.findUnique({
      where: { id },
      include: {
        workOrderItems: {
          select: { id: true, unitPrice: true, description: true },
        },
        vehicle: { select: { licensePlate: true } },
      },
    });

    if (!workOrder) {
      return NextResponse.json(
        { error: 'Orden de trabajo no encontrada' },
        { status: 404 }
      );
    }

    // Guard: TECHNICIAN cannot self-authorize
    if (workOrder.openingBy === user.id && user.role === 'TECHNICIAN') {
      return NextResponse.json(
        { error: 'Un técnico no puede autorizar su propia OT' },
        { status: 403 }
      );
    }

    // Status precondition
    const validStatuses = ['DRAFTING', 'PENDING'];
    if (!validStatuses.includes(workOrder.status)) {
      return NextResponse.json(
        {
          error: `La OT debe estar en estado DRAFTING o PENDING para ser autorizada (estado actual: ${workOrder.status})`,
        },
        { status: 409 }
      );
    }

    // Price validation
    const itemsWithoutPrice = workOrder.workOrderItems.filter(
      i => Number(i.unitPrice) <= 0
    );

    if (itemsWithoutPrice.length > 0) {
      return NextResponse.json(
        {
          error: 'Todos los ítems deben tener precio mayor a 0',
          items: itemsWithoutPrice.map(i => i.id),
        },
        { status: 422 }
      );
    }

    // Authorize
    const updatedWO = await tenantPrisma.workOrder.update({
      where: { id },
      data: {
        status: 'APPROVED',
        authorizedBy: user.id,
        authorizedAt: new Date(),
      },
    });

    // Fire-and-forget WhatsApp
    notifyWOEvent(user.tenantId, WO_NOTIFICATION_EVENTS.AUTHORIZED, {
      workOrderId: id,
      vehiclePlate: workOrder.vehicle?.licensePlate,
    }).catch(err =>
      console.error('[WO_NOTIFY] AUTHORIZED failed:', {
        workOrderId: id,
        error: err,
      })
    );

    const serialized = JSON.parse(
      JSON.stringify(updatedWO, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );

    return NextResponse.json(serialized);
  } catch (error: unknown) {
    console.error('[WO_AUTHORIZE_POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { canExecuteWorkOrders } from '@/lib/permissions';
import {
  notifyWOEvent,
  WO_NOTIFICATION_EVENTS,
} from '@/lib/notifications/wo-events';

/**
 * POST — Register inspection for a WorkOrder (Step 2 of wizard).
 * Transitions WO from OPENING → INSPECTING.
 * Creates a 1:1 WorkOrderInspection record.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canExecuteWorkOrders(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para registrar inspecciones' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Fetch WO with vehicle info
    const workOrder = await tenantPrisma.workOrder.findUnique({
      where: { id },
      include: {
        vehicle: { select: { licensePlate: true } },
      },
    });

    if (!workOrder) {
      return NextResponse.json(
        { error: 'Orden de trabajo no encontrada' },
        { status: 404 }
      );
    }

    if (workOrder.status !== 'OPENING') {
      return NextResponse.json(
        {
          error: 'La OT debe estar en estado OPENING para registrar inspección',
        },
        { status: 409 }
      );
    }

    // Guard: no duplicate inspection
    const existing = await tenantPrisma.workOrderInspection.findUnique({
      where: { workOrderId: id },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe una inspección para esta OT' },
        { status: 409 }
      );
    }

    const body = await request.json();

    // Basic field validation
    if (!body.date || !body.description) {
      return NextResponse.json(
        { error: 'Los campos date y description son requeridos' },
        { status: 400 }
      );
    }

    // Transaction: create inspection + update WO status
    const inspection = await tenantPrisma.$transaction(async tx => {
      const created = await tx.workOrderInspection.create({
        data: {
          workOrderId: id,
          tenantId: user.tenantId,
          date: new Date(body.date),
          description: body.description,
          inspectedBy: body.inspectedBy || user.id,
          vehicleGrounded: body.vehicleGrounded ?? false,
          estimatedRepairHours: body.estimatedRepairHours
            ? Number(body.estimatedRepairHours)
            : null,
        },
      });

      await tx.workOrder.update({
        where: { id },
        data: { status: 'INSPECTING' },
      });

      return created;
    });

    // Fire-and-forget WhatsApp notifications
    const vehiclePlate = workOrder.vehicle?.licensePlate;
    const description = body.description as string;

    if (body.vehicleGrounded) {
      notifyWOEvent(user.tenantId, WO_NOTIFICATION_EVENTS.VEHICLE_GROUNDED, {
        workOrderId: id,
        vehiclePlate,
        description,
      }).catch(err =>
        console.error('[WO_NOTIFY] INSPECTION VEHICLE_GROUNDED failed:', {
          workOrderId: id,
          error: err,
        })
      );
    }

    notifyWOEvent(user.tenantId, WO_NOTIFICATION_EVENTS.INSPECTION_DONE, {
      workOrderId: id,
      vehiclePlate,
      description,
    }).catch(err =>
      console.error('[WO_NOTIFY] INSPECTION_DONE failed:', {
        workOrderId: id,
        error: err,
      })
    );

    return NextResponse.json(inspection, { status: 201 });
  } catch (error: unknown) {
    console.error('[WO_INSPECTION_POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

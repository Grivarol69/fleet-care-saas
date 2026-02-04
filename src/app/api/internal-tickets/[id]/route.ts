import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/internal-tickets/[id] - Obtener ticket interno por ID
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;

    const ticket = await prisma.internalWorkTicket.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
      },
      include: {
        workOrder: {
          select: {
            id: true,
            title: true,
            status: true,
            vehicle: {
              select: { licensePlate: true },
            },
          },
        },
        technician: {
          select: { id: true, name: true },
        },
        laborEntries: true,
        partEntries: {
          include: {
            inventoryItem: {
              include: { masterPart: true },
            },
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
    }

    return NextResponse.json(ticket);
  } catch (error: unknown) {
    console.error('[INTERNAL_TICKET_GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/internal-tickets/[id] - Actualizar estado del ticket
 * Al aprobar (status → APPROVED): cierra toda la OT
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return NextResponse.json(
        { error: 'No tienes permisos para aprobar tickets internos' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { status, notes } = body;

    if (!status) {
      return NextResponse.json({ error: 'Status es requerido' }, { status: 400 });
    }

    // Fetch the ticket with all related data
    const ticket = await prisma.internalWorkTicket.findFirst({
      where: {
        id,
        tenantId: user.tenantId,
      },
      include: {
        workOrder: true,
        partEntries: {
          include: {
            inventoryItem: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
    }

    // If approving the ticket, close the entire work order
    if (status === 'APPROVED') {
      const result = await prisma.$transaction(async (tx) => {
        // 1. Approve the ticket
        const updatedTicket = await tx.internalWorkTicket.update({
          where: { id },
          data: {
            status: 'APPROVED',
            approvedBy: user.id,
            approvedAt: new Date(),
            notes: notes || ticket.notes,
          },
        });

        const workOrderId = ticket.workOrderId;

        // 2. Close all WorkOrderItems with INTERNAL_TICKET closureType
        await tx.workOrderItem.updateMany({
          where: { workOrderId },
          data: {
            status: 'COMPLETED',
            closureType: 'INTERNAL_TICKET',
            closedAt: new Date(),
            closedBy: user.id,
          },
        });

        // 3. Close the WorkOrder
        await tx.workOrder.update({
          where: { id: workOrderId },
          data: {
            status: 'COMPLETED',
            endDate: new Date(),
            actualCost: ticket.totalCost,
          },
        });

        // 4. Close related MaintenanceAlerts
        await tx.maintenanceAlert.updateMany({
          where: { workOrderId },
          data: {
            status: 'COMPLETED',
            closedAt: new Date(),
          },
        });

        // 5. Update VehicleProgramItems to COMPLETED
        const alerts = await tx.maintenanceAlert.findMany({
          where: { workOrderId },
          select: { programItemId: true },
        });

        if (alerts.length > 0) {
          const programItemIds = alerts.map((a) => a.programItemId);
          await tx.vehicleProgramItem.updateMany({
            where: { id: { in: programItemIds } },
            data: {
              status: 'COMPLETED',
              executedDate: new Date(),
            },
          });
        }

        return updatedTicket;
      });

      return NextResponse.json(result);
    }

    // For other status changes (SUBMITTED, REJECTED, CANCELLED)
    const updatedTicket = await prisma.internalWorkTicket.update({
      where: { id },
      data: {
        status,
        ...(notes && { notes }),
      },
    });

    return NextResponse.json(updatedTicket);
  } catch (error: unknown) {
    console.error('[INTERNAL_TICKET_PATCH]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

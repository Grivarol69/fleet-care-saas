import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ItemSource, ItemClosureType } from '@prisma/client';

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

    // If approving the ticket, close internal items and potentially the entire work order
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

        // 2. FASE 6.6: Solo cerrar items INTERNOS (INTERNAL_STOCK) con INTERNAL_TICKET
        // Los items EXTERNAL se cierran con factura
        await tx.workOrderItem.updateMany({
          where: {
            workOrderId,
            itemSource: { in: [ItemSource.INTERNAL_STOCK, ItemSource.INTERNAL_PURCHASE] },
          },
          data: {
            status: 'COMPLETED',
            closureType: ItemClosureType.INTERNAL_TICKET,
            closedAt: new Date(),
            closedBy: user.id,
          },
        });

        // 3. Verificar si TODOS los items de la OT están cerrados
        const pendingItems = await tx.workOrderItem.count({
          where: {
            workOrderId,
            closureType: ItemClosureType.PENDING,
            status: { not: 'CANCELLED' },
          },
        });

        // Solo cerrar OT completamente si no quedan items pendientes
        if (pendingItems === 0) {
          // Obtener el actualCost actual para sumar el costo del ticket
          const currentWO = await tx.workOrder.findUnique({
            where: { id: workOrderId },
            select: { actualCost: true },
          });

          const currentCost = currentWO?.actualCost ? Number(currentWO.actualCost) : 0;
          const newTotalCost = currentCost + Number(ticket.totalCost);

          // Cerrar la WorkOrder
          await tx.workOrder.update({
            where: { id: workOrderId },
            data: {
              status: 'COMPLETED',
              endDate: new Date(),
              actualCost: newTotalCost,
            },
          });

          // Cerrar MaintenanceAlerts
          await tx.maintenanceAlert.updateMany({
            where: { workOrderId },
            data: {
              status: 'COMPLETED',
              closedAt: new Date(),
            },
          });

          // Cerrar VehicleProgramItems
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
        } else {
          // Si hay items externos pendientes, solo sumar el costo del ticket al actualCost
          const currentWO = await tx.workOrder.findUnique({
            where: { id: workOrderId },
            select: { actualCost: true },
          });

          const currentCost = currentWO?.actualCost ? Number(currentWO.actualCost) : 0;
          await tx.workOrder.update({
            where: { id: workOrderId },
            data: {
              actualCost: currentCost + Number(ticket.totalCost),
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

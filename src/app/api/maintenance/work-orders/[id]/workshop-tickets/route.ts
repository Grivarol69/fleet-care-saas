import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { canExecuteWorkOrders } from '@/lib/permissions';
import { z } from 'zod';

const createTicketSchema = z.object({
  itemIds: z.string().array().min(1),
});

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
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: workOrderId } = await params;
    const json = await request.json();
    const validation = createTicketSchema.safeParse(json);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten() },
        { status: 400 }
      );
    }
    const { itemIds } = validation.data;

    // Load work order to get technician
    const workOrder = await tenantPrisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: { id: true, technicianId: true },
    });
    if (!workOrder) {
      return NextResponse.json(
        { error: 'Orden de trabajo no encontrada' },
        { status: 404 }
      );
    }
    if (!workOrder.technicianId) {
      return NextResponse.json(
        { error: 'La OT no tiene técnico asignado' },
        { status: 400 }
      );
    }

    // Load items
    const items = await tenantPrisma.workOrderItem.findMany({
      where: { id: { in: itemIds } },
      include: {
        mantItem: { select: { type: true, name: true } },
      },
    });

    if (items.length !== itemIds.length) {
      return NextResponse.json(
        { error: 'Algunos ítems no fueron encontrados' },
        { status: 404 }
      );
    }
    if (items.some(i => i.workOrderId !== workOrderId)) {
      return NextResponse.json(
        { error: 'Algunos ítems no pertenecen a esta orden de trabajo' },
        { status: 400 }
      );
    }

    // Resolve inventoryItemId for PART items via masterPartId
    const partItems = items.filter(i => i.mantItem.type === 'PART');
    const masterPartIds = partItems
      .map(i => i.masterPartId)
      .filter((id): id is string => id !== null);

    const inventoryItems =
      masterPartIds.length > 0
        ? await tenantPrisma.inventoryItem.findMany({
            where: { masterPartId: { in: masterPartIds } },
            select: { id: true, masterPartId: true, averageCost: true },
          })
        : [];

    const inventoryByMasterPart = new Map(
      inventoryItems.map(ii => [ii.masterPartId!, ii])
    );

    // Compute totals
    const laborItems = items.filter(i => i.mantItem.type !== 'PART');
    const totalLaborCost = laborItems.reduce(
      (sum, i) => sum + Number(i.totalCost),
      0
    );
    const totalPartsCost = partItems.reduce(
      (sum, i) => sum + Number(i.totalCost),
      0
    );
    const totalCost = totalLaborCost + totalPartsCost;

    const year = new Date().getFullYear();

    const ticket = await tenantPrisma.$transaction(async tx => {
      const count = await tx.internalWorkTicket.count({
        where: {
          tenantId: user.tenantId,
          ticketNumber: { startsWith: `TKT-${year}-` },
        },
      });
      const ticketNumber = `TKT-${year}-${String(count + 1).padStart(6, '0')}`;

      const created = await tx.internalWorkTicket.create({
        data: {
          tenantId: user.tenantId,
          workOrderId,
          ticketNumber,
          technicianId: workOrder.technicianId!,
          totalLaborHours: 0,
          totalLaborCost,
          totalPartsCost,
          totalCost,
          status: 'DRAFT',
          laborEntries: {
            create: laborItems.map(item => ({
              tenantId: user.tenantId,
              workOrderItemId: item.id,
              technicianId: workOrder.technicianId,
              description: item.mantItem.name,
              hours: 0,
              hourlyRate: 0,
              laborCost: Number(item.totalCost),
            })),
          },
          partEntries: {
            create: partItems
              .filter(
                item =>
                  item.masterPartId &&
                  inventoryByMasterPart.has(item.masterPartId)
              )
              .map(item => {
                const inv = inventoryByMasterPart.get(item.masterPartId!)!;
                return {
                  tenantId: user.tenantId,
                  workOrderItemId: item.id,
                  inventoryItemId: inv.id,
                  quantity: item.quantity,
                  unitCost: Number(inv.averageCost),
                  totalCost: Number(item.totalCost),
                };
              }),
          },
        },
      });

      await tx.workOrderItem.updateMany({
        where: { id: { in: itemIds } },
        data: { closureType: 'INTERNAL_TICKET' },
      });

      return created;
    });

    return NextResponse.json(
      { id: ticket.id, ticketNumber: ticket.ticketNumber },
      { status: 201 }
    );
  } catch (error) {
    console.error('[WORKSHOP_TICKETS_POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

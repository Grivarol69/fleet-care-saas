import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { ItemSource, ItemClosureType, WorkOrderStatus } from '@prisma/client';
import { z } from 'zod';
import { canExecuteWorkOrders } from '@/lib/permissions';

const updateItemSchema = z.object({
  itemSource: z
    .enum(['EXTERNAL', 'INTERNAL_STOCK', 'INTERNAL_PURCHASE'])
    .optional(),
  closureType: z
    .enum(['PENDING', 'EXTERNAL_INVOICE', 'INTERNAL_TICKET', 'NOT_APPLICABLE'])
    .optional(),
  status: z
    .enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'])
    .optional(),
  supplier: z.string().optional(),
  unitPrice: z.number().min(0).optional(),
  quantity: z.number().positive().optional(),
});

/**
 * PATCH /api/maintenance/work-orders/[id]/items/[itemId]
 * Actualiza un WorkOrderItem específico
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (!canExecuteWorkOrders(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const { id, itemId } = await params;

    const workOrderId = id;
    const workOrderItemId = itemId;

    if (workOrderId === null || workOrderItemId === null) {
      return NextResponse.json({ error: 'IDs inválidos' }, { status: 400 });
    }

    const json = await request.json();
    const validation = updateItemSchema.safeParse(json);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const updates = validation.data;

    // Verificar que el item existe y pertenece al tenant
    const existingItem = await prisma.workOrderItem.findUnique({
      where: { id: workOrderItemId },
      include: {
        workOrder: { select: { tenantId: true, id: true } },
      },
    });

    if (!existingItem || existingItem.workOrder.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: 'Item no encontrado' },
        { status: 404 }
      );
    }

    if (existingItem.workOrderId !== workOrderId) {
      return NextResponse.json(
        { error: 'Item no pertenece a esta orden de trabajo' },
        { status: 400 }
      );
    }

    // Preparar datos para actualizar
    const updateData: {
      itemSource?: ItemSource;
      closureType?: ItemClosureType;
      status?: WorkOrderStatus;
      supplier?: string;
      unitPrice?: number;
      quantity?: number;
      totalCost?: number;
    } = {};

    if (updates.itemSource) {
      updateData.itemSource = updates.itemSource as ItemSource;
    }
    if (updates.closureType) {
      updateData.closureType = updates.closureType as ItemClosureType;
    }
    if (updates.status) {
      updateData.status = updates.status as WorkOrderStatus;
    }
    if (updates.supplier !== undefined) {
      updateData.supplier = updates.supplier;
    }
    if (updates.unitPrice !== undefined) {
      updateData.unitPrice = updates.unitPrice;
    }
    if (updates.quantity !== undefined) {
      updateData.quantity = updates.quantity;
    }

    // Recalcular totalCost si cambia precio o cantidad
    if (updates.unitPrice !== undefined || updates.quantity !== undefined) {
      const newPrice = updates.unitPrice ?? Number(existingItem.unitPrice);
      const newQty = updates.quantity ?? existingItem.quantity;
      updateData.totalCost = newPrice * newQty;
    }

    const updatedItem = await prisma.workOrderItem.update({
      where: { id: workOrderItemId },
      data: updateData,
      include: {
        mantItem: {
          select: { id: true, name: true, type: true },
        },
        masterPart: {
          select: { id: true, code: true, description: true },
        },
      },
    });

    // TASK 2.5: Auto-trigger PENDING_INVOICE when all items are closed
    // If a closureType was updated, check whether any items in this WO
    // still have closureType === PENDING. If none remain, auto-advance
    // the WO status to PENDING_INVOICE (only if currently IN_PROGRESS).
    let woPendingInvoiceTriggered = false;
    if (updates.closureType !== undefined) {
      const currentWO = await prisma.workOrder.findUnique({
        where: { id: workOrderId },
        select: { status: true },
      });

      if (currentWO?.status === 'IN_PROGRESS') {
        const pendingCount = await prisma.workOrderItem.count({
          where: {
            workOrderId,
            closureType: ItemClosureType.PENDING,
            status: { not: 'CANCELLED' },
          },
        });

        if (pendingCount === 0) {
          await prisma.workOrder.update({
            where: { id: workOrderId },
            data: { status: 'PENDING_INVOICE' },
          });
          woPendingInvoiceTriggered = true;
        }
      }
    }

    return NextResponse.json({
      success: true,
      item: {
        id: updatedItem.id,
        mantItemName: updatedItem.mantItem.name,
        mantItemType: updatedItem.mantItem.type,
        itemSource: updatedItem.itemSource,
        closureType: updatedItem.closureType,
        status: updatedItem.status,
        supplier: updatedItem.supplier,
        quantity: updatedItem.quantity,
        unitPrice: Number(updatedItem.unitPrice),
        totalCost: Number(updatedItem.totalCost),
      },
      ...(woPendingInvoiceTriggered
        ? { workOrderStatusChanged: 'PENDING_INVOICE' }
        : {}),
    });
  } catch (error) {
    console.error('[WORK_ORDER_ITEM_PATCH]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/maintenance/work-orders/[id]/items/[itemId]
 * Obtiene un WorkOrderItem específico
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id, itemId } = await params;

    const workOrderId = id;
    const workOrderItemId = itemId;

    if (workOrderId === null || workOrderItemId === null) {
      return NextResponse.json({ error: 'IDs inválidos' }, { status: 400 });
    }

    const item = await prisma.workOrderItem.findUnique({
      where: { id: workOrderItemId },
      include: {
        workOrder: { select: { tenantId: true, id: true } },
        mantItem: {
          select: {
            id: true,
            name: true,
            type: true,
            description: true,
            category: { select: { name: true } },
          },
        },
        masterPart: {
          select: { id: true, code: true, description: true },
        },
      },
    });

    if (!item || item.workOrder.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: 'Item no encontrado' },
        { status: 404 }
      );
    }

    if (item.workOrderId !== workOrderId) {
      return NextResponse.json(
        { error: 'Item no pertenece a esta orden de trabajo' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      workOrderItemId: item.id,
      mantItemId: item.mantItem.id,
      mantItemName: item.mantItem.name,
      mantItemType: item.mantItem.type,
      categoryName: item.mantItem.category.name,
      masterPartId: item.masterPart?.id || null,
      masterPartCode: item.masterPart?.code || null,
      masterPartDescription: item.masterPart?.description || null,
      description: item.description || item.mantItem.name,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      totalCost: Number(item.totalCost),
      supplier: item.supplier,
      itemSource: item.itemSource,
      closureType: item.closureType,
      status: item.status,
    });
  } catch (error) {
    console.error('[WORK_ORDER_ITEM_GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

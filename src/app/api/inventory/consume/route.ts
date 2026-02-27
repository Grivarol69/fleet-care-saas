import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import {
  MovementType,
  MovementReferenceType,
  ItemSource,
  ItemClosureType,
} from '@prisma/client';
import { canExecuteWorkOrders } from '@/lib/permissions';

interface ConsumeItem {
  workOrderItemId: string;
  inventoryItemId: string;
  masterPartId?: string;
  quantity: number;
}

/**
 * POST /api/inventory/consume
 * Descuenta múltiples items del inventario vinculados a una OT.
 * Body: { workOrderId: string, items: ConsumeItem[] }
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { workOrderId, items } = body as {
      workOrderId: string;
      items: ConsumeItem[];
    };

    if (!workOrderId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'workOrderId y items son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que la OT existe y pertenece al tenant
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId, tenantId: user.tenantId },
    });

    if (!workOrder) {
      return NextResponse.json(
        { error: 'Orden de trabajo no encontrada' },
        { status: 404 }
      );
    }

    // Procesar todos los items en una transacción
    const result = await prisma.$transaction(async tx => {
      const processedItems: Array<{
        workOrderItemId: string;
        inventoryItemId: string;
        quantity: number;
        unitCost: number;
        movementId: string;
      }> = [];

      for (const item of items) {
        // 1. Verificar que el WorkOrderItem existe y pertenece a la OT
        const workOrderItem = await tx.workOrderItem.findUnique({
          where: { id: item.workOrderItemId },
          include: { workOrder: { select: { tenantId: true } } },
        });

        if (
          !workOrderItem ||
          workOrderItem.workOrder.tenantId !== user.tenantId
        ) {
          throw new Error(`Item de OT #${item.workOrderItemId} no encontrado`);
        }

        if (workOrderItem.workOrderId !== workOrderId) {
          throw new Error(
            `Item #${item.workOrderItemId} no pertenece a esta OT`
          );
        }

        // 2. Verificar el InventoryItem
        const inventoryItem = await tx.inventoryItem.findUnique({
          where: { id: item.inventoryItemId },
        });

        if (!inventoryItem || inventoryItem.tenantId !== user.tenantId) {
          throw new Error(`Item de inventario no encontrado`);
        }

        const currentStock = Number(inventoryItem.quantity);
        const requestedQty = Number(item.quantity);

        if (currentStock < requestedQty) {
          throw new Error(
            `Stock insuficiente para ${inventoryItem.id}. Disponible: ${currentStock}, Solicitado: ${requestedQty}`
          );
        }

        // 3. Calcular nuevos valores
        const currentAvgCost = Number(inventoryItem.averageCost);
        const currentTotalValue = Number(inventoryItem.totalValue);
        const movementTotalCost = requestedQty * currentAvgCost;
        const newStock = currentStock - requestedQty;
        const newTotalValue =
          newStock === 0 ? 0 : currentTotalValue - movementTotalCost;

        // 4. Actualizar InventoryItem
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: {
            quantity: newStock,
            totalValue: newTotalValue,
            status:
              newStock <= Number(inventoryItem.minStock)
                ? newStock === 0
                  ? 'OUT_OF_STOCK'
                  : 'LOW_STOCK'
                : 'ACTIVE',
          },
        });

        // 5. Crear InventoryMovement
        const movement = await tx.inventoryMovement.create({
          data: {
            tenantId: user.tenantId,
            inventoryItemId: item.inventoryItemId,
            movementType: MovementType.CONSUMPTION,
            quantity: requestedQty,
            unitCost: currentAvgCost,
            totalCost: movementTotalCost,
            previousStock: currentStock,
            newStock: newStock,
            previousAvgCost: currentAvgCost,
            newAvgCost: currentAvgCost, // No cambia en salidas
            referenceType: MovementReferenceType.INTERNAL_TICKET,
            referenceId: `WO-${workOrderId}`,
            performedBy: user.id,
          },
        });

        // 6. Actualizar WorkOrderItem
        await tx.workOrderItem.update({
          where: { id: item.workOrderItemId },
          data: {
            itemSource: ItemSource.INTERNAL_STOCK,
            closureType: ItemClosureType.INTERNAL_TICKET,
            supplier: 'INTERNAL_INVENTORY',
            unitPrice: currentAvgCost,
            totalCost: requestedQty * currentAvgCost,
          },
        });

        processedItems.push({
          workOrderItemId: item.workOrderItemId,
          inventoryItemId: item.inventoryItemId,
          quantity: requestedQty,
          unitCost: currentAvgCost,
          movementId: movement.id,
        });
      }

      return processedItems;
    });

    return NextResponse.json({
      success: true,
      message: `${result.length} item(s) descontados del inventario`,
      items: result,
    });
  } catch (error) {
    console.error('[INVENTORY_CONSUME]', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    const status = message.includes('insuficiente') ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

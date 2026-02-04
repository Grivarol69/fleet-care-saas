import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { safeParseInt } from '@/lib/validation';

// Schema validation
const createItemSchema = z.object({
  mantItemId: z.number().int().positive(),
  masterPartId: z.string().optional(),
  description: z.string().min(1).max(500),
  quantity: z.number().positive().max(10000),
  unitPrice: z.number().min(0).max(999999999).optional(),
  source: z.enum(['EXTERNAL', 'STOCK']),
  stockItemId: z.string().optional(),
});

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

    const workOrderId = safeParseInt(id);
    if (workOrderId === null) {
      return NextResponse.json(
        { error: 'ID de orden de trabajo inválido' },
        { status: 400 }
      );
    }

    const workOrder = await prisma.workOrder.findUnique({
      where: {
        id: workOrderId,
        tenantId: user.tenantId,
      },
      include: {
        workOrderItems: {
          include: {
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
              select: {
                id: true,
                code: true,
                description: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!workOrder) {
      return NextResponse.json(
        { error: 'Orden de trabajo no encontrada' },
        { status: 404 }
      );
    }

    const formattedItems = workOrder.workOrderItems.map((item) => ({
      workOrderItemId: item.id,
      mantItemId: item.mantItem.id,
      mantItemName: item.mantItem.name,
      mantItemType: item.mantItem.type,
      categoryName: item.mantItem.category.name,
      masterPartCode: item.masterPart?.code || null,
      masterPartDescription: item.masterPart?.description || null,
      description: item.description || item.mantItem.name || 'Sin descripción',
      details: item.mantItem.description || item.notes || '',
      quantity: item.quantity || 1,
      unitPrice: parseFloat(item.unitPrice?.toString() || '0'),
      totalCost: parseFloat(item.totalCost?.toString() || '0'),
      supplier: item.supplier,
      closureType: item.closureType,
      status: item.status,
    }));

    return NextResponse.json({
      workOrderId: workOrder.id,
      estimatedTotal: parseFloat(workOrder.estimatedCost?.toString() || '0'),
      items: formattedItems,
    });
  } catch (error: unknown) {
    console.error('[WORK_ORDER_ITEMS_GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;

    const workOrderId = safeParseInt(id);
    if (workOrderId === null) {
      return NextResponse.json(
        { error: 'ID de orden de trabajo inválido' },
        { status: 400 }
      );
    }

    const json = await request.json();

    const validation = createItemSchema.safeParse(json);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const body = validation.data;

    // 1. Verify WorkOrder exists and belongs to tenant
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId, tenantId: user.tenantId }
    });

    if (!workOrder) {
      return NextResponse.json(
        { error: 'Orden de trabajo no encontrada' },
        { status: 404 }
      );
    }

    // 2. Verify mantItemId exists and is accessible to tenant
    const mantItem = await prisma.mantItem.findFirst({
      where: {
        id: body.mantItemId,
        OR: [
          { tenantId: user.tenantId },
          { tenantId: null, isGlobal: true }
        ]
      }
    });

    if (!mantItem) {
      return NextResponse.json(
        { error: 'Item de mantenimiento no encontrado' },
        { status: 404 }
      );
    }

    // 3. If masterPartId provided, verify it exists
    if (body.masterPartId) {
      const masterPart = await prisma.masterPart.findUnique({
        where: { id: body.masterPartId }
      });
      if (!masterPart) {
        return NextResponse.json(
          { error: 'Repuesto (MasterPart) no encontrado' },
          { status: 404 }
        );
      }
    }

    // Execute transaction
    const result = await prisma.$transaction(async (tx) => {
      let finalUnitCost = body.unitPrice || 0;

      // 4. Handle STOCK Logic
      if (body.source === 'STOCK' && body.stockItemId) {
        const inventoryItem = await tx.inventoryItem.findUnique({
          where: {
            id: body.stockItemId,
            tenantId: user.tenantId
          }
        });

        if (!inventoryItem) {
          throw new Error("Item de inventario no encontrado");
        }

        if (Number(inventoryItem.quantity) < body.quantity) {
          throw new Error(`Stock insuficiente. Disponible: ${inventoryItem.quantity}`);
        }

        finalUnitCost = Number(inventoryItem.averageCost);

        const newQuantity = Number(inventoryItem.quantity) - body.quantity;
        const newTotalValue = Number(inventoryItem.totalValue) - (finalUnitCost * body.quantity);

        await tx.inventoryItem.update({
          where: { id: body.stockItemId },
          data: {
            quantity: newQuantity,
            totalValue: newTotalValue
          }
        });

        await tx.inventoryMovement.create({
          data: {
            tenantId: user.tenantId,
            inventoryItemId: body.stockItemId,
            movementType: 'CONSUMPTION',
            quantity: body.quantity,
            unitCost: finalUnitCost,
            totalCost: finalUnitCost * body.quantity,
            previousStock: inventoryItem.quantity,
            newStock: newQuantity,
            previousAvgCost: inventoryItem.averageCost,
            newAvgCost: inventoryItem.averageCost,
            referenceType: 'MANUAL_ADJUSTMENT',
            referenceId: `WO-${workOrderId}`,
            performedBy: user.id
          }
        });
      }

      // 5. Create WorkOrderItem
      const newItem = await tx.workOrderItem.create({
        data: {
          workOrderId,
          mantItemId: body.mantItemId,
          masterPartId: body.masterPartId || null,
          description: body.description,
          quantity: body.quantity,
          unitPrice: finalUnitCost,
          totalCost: finalUnitCost * body.quantity,
          supplier: body.source === 'STOCK' ? 'INTERNAL_INVENTORY' : 'EXTERNAL',
          status: 'PENDING',
          purchasedBy: user.id
        }
      });

      return newItem;
    });

    return NextResponse.json({ success: true, item: result }, { status: 201 });

  } catch (error) {
    console.error('[WO_ADD_ITEM]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

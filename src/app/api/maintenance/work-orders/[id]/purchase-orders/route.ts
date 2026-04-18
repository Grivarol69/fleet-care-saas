import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  canExecuteWorkOrders,
  canOverrideWorkOrderFreeze,
} from '@/lib/permissions';
import { z } from 'zod';

const createPOSchema = z.object({
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
    const validation = createPOSchema.safeParse(json);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten() },
        { status: 400 }
      );
    }
    const { itemIds } = validation.data;

    const items = await tenantPrisma.workOrderItem.findMany({
      where: {
        id: { in: itemIds },
      },
      include: {
        purchaseOrderItems: {
          select: { id: true },
        },
        mantItem: {
          select: { type: true },
        },
      },
    });

    const itemsBelongToWorkOrder = items.every(
      item => item.workOrderId === workOrderId
    );
    if (!itemsBelongToWorkOrder || items.length !== itemIds.length) {
      return NextResponse.json(
        {
          error:
            'Algunos ítems no fueron encontrados o no pertenecen a esta orden de trabajo',
        },
        { status: 404 }
      );
    }

    const missingProvider = items.some(item => !item.providerId);
    if (missingProvider) {
      return NextResponse.json(
        { error: 'Todos los ítems deben tener proveedor asignado' },
        { status: 400 }
      );
    }

    const isOverride = canOverrideWorkOrderFreeze(user);
    if (!isOverride) {
      for (const item of items) {
        if (item.purchaseOrderItems && item.purchaseOrderItems.length > 0) {
          return NextResponse.json(
            { error: `El ítem ${item.id} ya tiene OC activa` },
            { status: 400 }
          );
        }
      }
    } else {
      // OWNER: cancel any open POs for this WO (DRAFT or PENDING_APPROVAL)
      await tenantPrisma.purchaseOrder.updateMany({
        where: {
          workOrderId,
          status: { in: ['DRAFT', 'PENDING_APPROVAL'] },
        },
        data: { status: 'CANCELLED' },
      });
    }

    const groupedByProvider = items.reduce(
      (acc, item) => {
        const pId = item.providerId!;
        if (!acc[pId]) acc[pId] = [];
        acc[pId].push(item);
        return acc;
      },
      {} as Record<string, typeof items>
    );

    const year = new Date().getFullYear();
    const createdOrders = [];

    for (const [providerId, providerItems] of Object.entries(
      groupedByProvider
    )) {
      try {
        const purchaseOrder = await prisma.$transaction(async tx => {
          const seq = await tx.tenantSequence.upsert({
            where: {
              tenantId_entityType: {
                tenantId: user.tenantId,
                entityType: 'PURCHASE_ORDER',
              },
            },
            update: { lastValue: { increment: 1 } },
            create: {
              tenantId: user.tenantId,
              entityType: 'PURCHASE_ORDER',
              lastValue: 1,
              prefix: 'OC-',
            },
          });
          const orderNumber = `OC-${year}-${String(seq.lastValue).padStart(6, '0')}`;

          const allParts = providerItems.every(
            item => item.mantItem?.type === 'PART'
          );
          const type = allParts ? 'PARTS' : 'SERVICES';

          const subtotal = providerItems.reduce(
            (sum, item) => sum + Number(item.totalCost),
            0
          );

          return await tx.purchaseOrder.create({
            data: {
              tenantId: user.tenantId,
              workOrderId,
              providerId,
              orderNumber,
              type,
              status: 'DRAFT',
              requestedBy: user.id,
              subtotal,
              taxRate: 0,
              taxAmount: 0,
              total: subtotal,
              items: {
                create: providerItems.map(item => ({
                  tenantId: user.tenantId,
                  workOrderItemId: item.id,
                  mantItemId: item.mantItemId,
                  masterPartId: item.masterPartId,
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  total: item.totalCost,
                  status: 'PENDING',
                  receivedQty: 0,
                })),
              },
            },
            include: { items: true },
          });
        });

        createdOrders.push(purchaseOrder);
      } catch (err) {
        if (
          err instanceof Error &&
          'code' in err &&
          (err as { code: string }).code === 'P2002'
        ) {
          return NextResponse.json(
            { error: 'Conflicto en número de OC, reintente' },
            { status: 409 }
          );
        }
        throw err;
      }
    }

    await tenantPrisma.workOrderItem.updateMany({
      where: { id: { in: itemIds } },
      data: { closureType: 'PURCHASE_ORDER' },
    });

    const serializedOrders = createdOrders.map(po => ({
      id: po.id,
      orderNumber: po.orderNumber,
      providerId: po.providerId,
      type: po.type,
      status: po.status,
      subtotal: Number(po.subtotal),
      taxRate: Number(po.taxRate),
      taxAmount: Number(po.taxAmount),
      total: Number(po.total),
      items: po.items.map(i => ({
        id: i.id,
        workOrderItemId: i.workOrderItemId,
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unitPrice),
        total: Number(i.total),
      })),
    }));

    return NextResponse.json(serializedOrders, { status: 201 });
  } catch (error) {
    console.error('[PURCHASE_ORDERS_POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

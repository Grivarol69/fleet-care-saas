import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { canManagePurchases } from '@/lib/permissions';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET - Listar items de una OC
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;

    // Verificar que OC existe y pertenece al tenant
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id, tenantId: user.tenantId },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Orden de compra no encontrada' },
        { status: 404 }
      );
    }

    const items = await prisma.purchaseOrderItem.findMany({
      where: { purchaseOrderId: id },
      include: {
        workOrderItem: true,
        mantItem: { select: { name: true, type: true } },
        masterPart: { select: { code: true, description: true, unit: true } },
      },
    });

    return NextResponse.json(items);
  } catch (error: unknown) {
    console.error('[PO_ITEMS_GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

/**
 * POST - Agregar item a OC (solo si DRAFT)
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (!canManagePurchases(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Verificar OC y estado
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id, tenantId: user.tenantId },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: 'Orden de compra no encontrada' },
        { status: 404 }
      );
    }

    if (purchaseOrder.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Solo se pueden agregar items a OC en estado DRAFT' },
        { status: 400 }
      );
    }

    const {
      workOrderItemId,
      mantItemId,
      masterPartId,
      description,
      quantity,
      unitPrice,
    } = body;

    if (!description || !quantity || !unitPrice) {
      return NextResponse.json(
        { error: 'description, quantity y unitPrice son requeridos' },
        { status: 400 }
      );
    }

    const itemTotal = Number(quantity) * Number(unitPrice);

    // Crear item y actualizar totales
    const result = await prisma.$transaction(async tx => {
      const newItem = await tx.purchaseOrderItem.create({
        data: {
          purchaseOrderId: id,
          workOrderItemId: workOrderItemId || null,
          mantItemId: mantItemId || null,
          masterPartId: masterPartId || null,
          description,
          quantity,
          unitPrice,
          total: itemTotal,
          status: 'PENDING',
        },
      });

      // Recalcular totales de OC
      const allItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id },
      });

      const newSubtotal = allItems.reduce(
        (sum, item) => sum + Number(item.total),
        0
      );
      const newTaxAmount = newSubtotal * (Number(purchaseOrder.taxRate) / 100);
      const newTotal = newSubtotal + newTaxAmount;

      await tx.purchaseOrder.update({
        where: { id },
        data: {
          subtotal: newSubtotal,
          taxAmount: newTaxAmount,
          total: newTotal,
        },
      });

      return newItem;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    console.error('[PO_ITEMS_POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

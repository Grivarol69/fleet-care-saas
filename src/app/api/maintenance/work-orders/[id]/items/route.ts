import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;

    // Obtener WorkOrder con sus items
    const workOrder = await prisma.workOrder.findUnique({
      where: {
        id: parseInt(id),
        tenantId: user.tenantId,
      },
      include: {
        workOrderItems: {
          include: {
            mantItem: true,
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

    // Formatear items para el frontend
    const formattedItems = workOrder.workOrderItems.map((item) => ({
      workOrderItemId: item.id,
      description: item.description || item.mantItem?.name || 'Sin descripción',
      details: item.mantItem?.description || item.notes || '',
      category: item.brand || '',
      quantity: item.quantity || 1,
      estimatedUnitPrice: parseFloat(item.unitPrice?.toString() || '0'),
      estimatedTotal: parseFloat(item.totalCost?.toString() || '0'),
      // Campos para que el usuario llene
      realUnitPrice: null,
      realTotal: null,
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

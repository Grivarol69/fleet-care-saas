import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { FinancialWatchdogService } from '@/lib/services/FinancialWatchdogService';
import { InventoryService } from '@/lib/services/InventoryService';
import { ItemType } from '@prisma/client';

/**
 * GET /api/maintenance/work-orders/[id]/items
 * Fetch items for a Work Order, optionally filtered by type.
 */
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
    const workOrderId = id;
    if (!workOrderId) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const typeParam = searchParams.get('type');

    // Verify parent WorkOrder belongs to tenant
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId, tenantId: user.tenantId },
    });
    if (!workOrder) {
      return NextResponse.json({ error: 'Not Found' }, { status: 404 });
    }

    // Support multiple types: "SERVICE,ACTION" or single "PART"
    let typeFilter: ItemType[] | undefined;
    if (typeParam) {
      const types = typeParam.split(',').map(t => t.trim()) as ItemType[];
      const validTypes: ItemType[] = types.filter(t =>
        ['PART', 'SERVICE', 'ACTION'].includes(t)
      );
      if (validTypes.length > 0) {
        typeFilter = validTypes;
      }
    }

    const items = await prisma.workOrderItem.findMany({
      where: {
        workOrderId,
        tenantId: user.tenantId,
        ...(typeFilter ? { mantItem: { type: { in: typeFilter } } } : {}),
      },
      include: {
        mantItem: {
          include: {
            category: { select: { name: true } },
          },
        },
        masterPart: true,
      },
    });

    // Map items to match frontend expectations (flattened fields)
    const mappedItems = items.map(item => ({
      workOrderItemId: item.id,
      mantItemId: item.mantItemId,
      mantItemName: item.mantItem?.name || '-',
      mantItemType: item.mantItem?.type || 'ACTION',
      categoryName: item.mantItem?.category?.name || '-',
      masterPartId: item.masterPartId || null,
      masterPartCode: item.masterPart?.code || null,
      masterPartDescription: item.masterPart?.description || null,
      description: item.description,
      partNumber: item.partNumber,
      brand: item.brand,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      totalCost: Number(item.totalCost),
      supplier: item.supplier,
      closureType: item.closureType,
      status: item.status,
      itemSource: item.itemSource,
    }));

    return NextResponse.json({ items: mappedItems });
  } catch (error) {
    console.error('[GET WO ITEMS]', error);
    return NextResponse.json(
      { error: 'Error fetching items' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/maintenance/work-orders/[id]/items
 * Adds a new item (Part or Service) to an existing Work Order.
 */
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
    const workOrderId = id;
    if (!workOrderId) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();
    const {
      mantItemId,
      masterPartId, // Optional master part ID
      quantity = 1,
      unitPrice,
      description,
      providerId, // Optional, for initial supplier assignment
      itemSource = 'EXTERNAL', // EXTERNAL | INTERNAL_STOCK
    } = body;

    // 2. Fetch MantItem details
    const mantItem = await prisma.mantItem.findUnique({
      where: { id: mantItemId },
      include: { parts: { include: { masterPart: true } } },
    });

    if (!mantItem) {
      return NextResponse.json(
        { error: 'Item de mantenimiento no encontrado' },
        { status: 404 }
      );
    }

    const finalDescription = description || mantItem.name;
    const totalCost = Number(unitPrice) * Number(quantity);

    // 3. Financial Watchdog Check (Price Deviation)
    // If it's a part and has a master part linked, check price
    if (mantItem.type === 'PART' && mantItem.parts.length > 0) {
      // Check against the first linked master part (simplified logic)
      // ideally we should pass masterPartId from frontend if specific brand selected
      // If masterPartId was provided in body, use that. Otherwise fallback to first linked.
      const targetMasterPartId =
        masterPartId || mantItem.parts[0]?.masterPartId;

      if (targetMasterPartId) {
        // Non-blocking check
        FinancialWatchdogService.checkPriceDeviation(
          user.tenantId,
          targetMasterPartId,
          unitPrice,
          undefined,
          workOrderId,
          `Item agregado: ${finalDescription}`
        ).catch(console.error);
      }
    }

    // 4. Inventory Check (Visual Warning / Validation)
    if (itemSource === 'INTERNAL_STOCK' && mantItem.type === 'PART') {
      const { available, currentStock } =
        await InventoryService.checkAvailability(
          user.tenantId,
          mantItemId,
          quantity
        );
      if (!available) {
        // We allow adding it but maybe with a warning?
        console.warn(
          `[WO ITEM] Added internal item with low stock: ${currentStock} < ${quantity}`
        );
      }
    }

    // 5. Create Work Order Item
    const newItem = await prisma.workOrderItem.create({
      data: {
        tenantId: user.tenantId,
        workOrderId,
        mantItemId,
        masterPartId: masterPartId || null, // Ensure null if undefined/empty
        description: finalDescription,
        quantity,
        unitPrice,
        totalCost,
        itemSource,
        supplier: providerId
          ? 'Provider #' + providerId
          : itemSource === 'INTERNAL_STOCK'
            ? 'Internal Inventory'
            : 'TBD',
        purchasedBy: user.id,
        status: 'PENDING',
        // Link closure type if internal
        closureType: 'PENDING',
      },
      include: {
        mantItem: true,
      },
    });

    // 6. Update Work Order Estimated/Actual Cost?
    // Usually we update totals when items are processed, but estimated cost might need update
    // Logic: If status is PENDING, maybe update estimatedCost.
    // Logic: If status is IN_PROGRESS, this is an "extra" cost.

    // Check Budget Overrun
    FinancialWatchdogService.checkBudgetOverrun(
      user.tenantId,
      workOrderId,
      totalCost
    ).catch(console.error);

    return NextResponse.json(newItem, { status: 201 });
  } catch (error: unknown) {
    console.error('[POST WO ITEM]', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error interno',
      },
      { status: 500 }
    );
  }
}

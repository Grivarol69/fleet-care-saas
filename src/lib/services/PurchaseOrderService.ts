import { prisma } from '@/lib/prisma';
import { PurchaseOrderType, PurchaseOrderStatus } from '@prisma/client';

/**
 * Service dedicated to Purchase Order management.
 */
export class PurchaseOrderService {
  /**
   * Creates a Purchase Order for external services or parts.
   * Can be linked to a Work Order.
   */
  static async createFromWorkItems(
    tenantId: string,
    workOrderId: number,
    providerId: number,
    type: PurchaseOrderType,
    items: Array<{
      workOrderItemId: number;
      mantItemId: number;
      masterPartId?: string;
      description: string;
      quantity: number;
      unitPrice: number;
    }>,
    notes?: string
  ) {
    // 1. Calculate totals
    const subtotal = items.reduce(
      (sum, item) => sum + item.quantity * item.unitPrice,
      0
    );
    const taxAmount = 0; // Customize tax logic as needed
    const total = subtotal + taxAmount;

    // 2. Generate Order Number (Simple auto-increment fallback)
    // ideally this should be a transaction with a counter table, but for now:
    const count = await prisma.purchaseOrder.count({ where: { tenantId } });
    const orderNumber = `OC-${new Date().getFullYear()}-${(count + 1).toString().padStart(6, '0')}`;

    // 3. Create PO
    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        tenantId,
        workOrderId,
        providerId,
        status: PurchaseOrderStatus.DRAFT,
        orderNumber,
        type,
        notes: notes ?? null, // Ensure null if undefined
        subtotal,
        taxAmount,
        total,
        requestedBy: 'SYSTEM', // Should be passed in context, but using placeholder for now
      },
    });

    // 4. Create PO Items and Link WO Items
    await Promise.all(
      items.map(async item => {
        await prisma.purchaseOrderItem.create({
          data: {
            tenantId,
            purchaseOrderId: purchaseOrder.id,
            mantItemId: item.mantItemId,
            masterPartId: item.masterPartId ?? null, // Ensure null if undefined
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
            workOrderItemId: item.workOrderItemId,
          },
        });
      })
    );

    return purchaseOrder;
  }
}

import { prisma } from '@/lib/prisma';
import { MovementType, MovementReferenceType } from '@prisma/client';

/**
 * Service dedicated to Inventory management.
 */
export class InventoryService {
  /**
   * Checks if there is enough stock for a given master part.
   */
  static async checkAvailability(
    tenantId: string,
    masterPartId: string,
    quantityNeeded: number
  ): Promise<{
    available: boolean;
    currentStock: number;
    inventoryItemId?: string;
  }> {
    const inventoryItem = await prisma.inventoryItem.findFirst({
      where: {
        tenantId,
        masterPartId,
        status: 'ACTIVE',
      },
    });

    if (!inventoryItem) {
      return { available: false, currentStock: 0 };
    }

    const currentStock = Number(inventoryItem.quantity);
    return {
      available: currentStock >= quantityNeeded,
      currentStock,
      inventoryItemId: inventoryItem.id,
    };
  }

  /**
   * Consumes stock for a Work Order Item.
   * Returns the movement created.
   */
  static async consumeStockForWorkOrder(
    tenantId: string,
    workOrderId: number,
    _workOrderItemId: number,
    userId: string,
    masterPartId: string,
    quantity: number
  ) {
    const { available, inventoryItemId, currentStock } =
      await this.checkAvailability(tenantId, masterPartId, quantity);

    if (!available || !inventoryItemId) {
      throw new Error(
        `Insufficient stock. Requested: ${quantity}, Available: ${currentStock}`
      );
    }

    // Get current item for cost calculations
    const currentItem = await prisma.inventoryItem.findUniqueOrThrow({
      where: { id: inventoryItemId },
    });

    const unitCost = Number(currentItem.averageCost);
    const totalCost = unitCost * quantity;
    const previousStock = Number(currentItem.quantity);
    const newStock = previousStock - quantity;

    // 1. Create OUT Movement
    const movement = await prisma.inventoryMovement.create({
      data: {
        tenantId,
        inventoryItemId,
        movementType: MovementType.CONSUMPTION,
        quantity,
        unitCost,
        totalCost,
        previousStock,
        newStock,
        previousAvgCost: Number(currentItem.averageCost),
        newAvgCost: Number(currentItem.averageCost), // avg cost doesn't change on consumption
        referenceType: MovementReferenceType.INTERNAL_TICKET,
        referenceId: workOrderId.toString(),
        performedBy: userId,
      },
    });

    // 2. Update Inventory Stock
    await prisma.inventoryItem.update({
      where: { id: inventoryItemId },
      data: {
        quantity: {
          decrement: quantity,
        },
      },
    });

    return movement;
  }
}

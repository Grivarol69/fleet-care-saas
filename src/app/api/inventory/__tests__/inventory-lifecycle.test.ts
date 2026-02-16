import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST as PURCHASE } from '../purchases/route';
import { POST as CONSUME } from '../consume/route';
import { prisma } from '@/lib/prisma';
import { InventoryService } from '@/lib/services/InventoryService';
import {
  createTestTenant,
  createTestUser,
  createTestVehicle,
  createTestMantItem,
  createTestProvider,
  createTestMasterPart,
  createTestInventoryItem,
  createTestWorkOrder,
  mockAuthAsUser,
  cleanupTenant,
} from '@test/helpers';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  isSuperAdmin: vi.fn().mockResolvedValue(false),
}));

describe('Inventory Lifecycle', () => {
  let tenant: Awaited<ReturnType<typeof createTestTenant>>;
  let user: Awaited<ReturnType<typeof createTestUser>>;
  let provider: Awaited<ReturnType<typeof createTestProvider>>;
  let masterPart: Awaited<ReturnType<typeof createTestMasterPart>>;

  beforeEach(async () => {
    tenant = await createTestTenant();
    user = await createTestUser(tenant.id, { role: 'OWNER' });
    provider = await createTestProvider(tenant.id);
    masterPart = await createTestMasterPart(tenant.id, {
      referencePrice: 50000,
    });

    mockAuthAsUser({ id: user.id, tenantId: tenant.id, role: user.role });
  });

  afterEach(async () => {
    await cleanupTenant(tenant.id);
    vi.clearAllMocks();
  });

  describe('InventoryService.checkAvailability', () => {
    it('returns true when stock is sufficient', async () => {
      const inv = await createTestInventoryItem(tenant.id, masterPart.id, {
        quantity: 100,
      });

      const result = await InventoryService.checkAvailability(
        tenant.id,
        masterPart.id,
        50
      );

      expect(result.available).toBe(true);
      expect(result.currentStock).toBe(100);
      expect(result.inventoryItemId).toBe(inv.id);
    });

    it('returns false when stock is insufficient', async () => {
      await createTestInventoryItem(tenant.id, masterPart.id, {
        quantity: 10,
      });

      const result = await InventoryService.checkAvailability(
        tenant.id,
        masterPart.id,
        50
      );

      expect(result.available).toBe(false);
      expect(result.currentStock).toBe(10);
    });

    it('returns false when no inventory item exists', async () => {
      const result = await InventoryService.checkAvailability(
        tenant.id,
        'non-existent-id',
        10
      );

      expect(result.available).toBe(false);
      expect(result.currentStock).toBe(0);
    });
  });

  describe('InventoryService.consumeStockForWorkOrder', () => {
    it('decrements stock and creates movement', async () => {
      await createTestInventoryItem(tenant.id, masterPart.id, {
        quantity: 100,
        averageCost: 50000,
      });

      const vd = await createTestVehicle(tenant.id);
      const wo = await createTestWorkOrder(tenant.id, vd.vehicle.id, user.id);

      const movement = await InventoryService.consumeStockForWorkOrder(
        tenant.id,
        wo.id,
        1, // woItemId (unused in service)
        user.id,
        masterPart.id,
        10
      );

      expect(Number(movement.quantity)).toBe(10);
      expect(Number(movement.unitCost)).toBe(50000);
      expect(Number(movement.totalCost)).toBe(500000);
      expect(Number(movement.previousStock)).toBe(100);
      expect(Number(movement.newStock)).toBe(90);

      // Verify stock decremented
      const item = await prisma.inventoryItem.findFirst({
        where: { tenantId: tenant.id, masterPartId: masterPart.id },
      });
      expect(Number(item?.quantity)).toBe(90);
    });

    it('throws on insufficient stock', async () => {
      await createTestInventoryItem(tenant.id, masterPart.id, {
        quantity: 5,
      });

      const vd = await createTestVehicle(tenant.id);
      const wo = await createTestWorkOrder(tenant.id, vd.vehicle.id, user.id);

      await expect(
        InventoryService.consumeStockForWorkOrder(
          tenant.id,
          wo.id,
          1,
          user.id,
          masterPart.id,
          10
        )
      ).rejects.toThrow('Insufficient stock');
    });
  });

  describe('POST /inventory/purchases', () => {
    it('creates purchase entry and updates stock with WAC', async () => {
      // First create existing inventory at $50
      await createTestInventoryItem(tenant.id, masterPart.id, {
        quantity: 100,
        averageCost: 50000,
      });

      // Purchase 50 more at $80
      const res = await PURCHASE(
        new NextRequest('http://localhost:3000/api/inventory/purchases', {
          method: 'POST',
          body: JSON.stringify({
            invoiceNumber: `PUR-${Date.now()}`,
            supplierId: provider.id,
            invoiceDate: new Date().toISOString(),
            items: [
              {
                masterPartId: masterPart.id,
                description: 'Test Part',
                quantity: 50,
                unitPrice: 80000,
                taxRate: 0,
              },
            ],
          }),
        })
      );

      expect(res.status).toBe(200);

      // Check WAC: (100*50000 + 50*80000) / 150 = 9000000/150 = 60000
      const inv = await prisma.inventoryItem.findFirst({
        where: { tenantId: tenant.id, masterPartId: masterPart.id },
      });
      expect(Number(inv?.quantity)).toBe(150);
      expect(Number(inv?.averageCost)).toBeCloseTo(60000, 0);

      // Check movement created
      const movements = await prisma.inventoryMovement.findMany({
        where: { tenantId: tenant.id, movementType: 'PURCHASE' },
      });
      expect(movements.length).toBeGreaterThanOrEqual(1);
    });

    it('first purchase sets avgCost = unitPrice', async () => {
      const newPart = await createTestMasterPart(tenant.id, {
        referencePrice: 0,
      });

      const res = await PURCHASE(
        new NextRequest('http://localhost:3000/api/inventory/purchases', {
          method: 'POST',
          body: JSON.stringify({
            invoiceNumber: `PUR-NEW-${Date.now()}`,
            supplierId: provider.id,
            invoiceDate: new Date().toISOString(),
            items: [
              {
                masterPartId: newPart.id,
                description: 'Brand New Part',
                quantity: 50,
                unitPrice: 80000,
                taxRate: 0,
              },
            ],
          }),
        })
      );

      expect(res.status).toBe(200);

      const inv = await prisma.inventoryItem.findFirst({
        where: { tenantId: tenant.id, masterPartId: newPart.id },
      });
      expect(Number(inv?.quantity)).toBe(50);
      expect(Number(inv?.averageCost)).toBe(80000);
    });

    it('creates price alert when price exceeds 10% of reference', async () => {
      // masterPart has referencePrice=50000
      const res = await PURCHASE(
        new NextRequest('http://localhost:3000/api/inventory/purchases', {
          method: 'POST',
          body: JSON.stringify({
            invoiceNumber: `PUR-ALERT-${Date.now()}`,
            supplierId: provider.id,
            invoiceDate: new Date().toISOString(),
            items: [
              {
                masterPartId: masterPart.id,
                description: 'Expensive Part',
                quantity: 10,
                unitPrice: 60000, // 20% over reference
                taxRate: 0,
              },
            ],
          }),
        })
      );

      expect(res.status).toBe(200);

      const alerts = await prisma.financialAlert.findMany({
        where: { tenantId: tenant.id, type: 'PRICE_DEVIATION' },
      });
      expect(alerts.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POST /inventory/consume', () => {
    it('consumes stock from inventory for work order', async () => {
      const inv = await createTestInventoryItem(tenant.id, masterPart.id, {
        quantity: 50,
        averageCost: 40000,
      });

      const vd = await createTestVehicle(tenant.id);
      const wo = await createTestWorkOrder(tenant.id, vd.vehicle.id, user.id);
      const mi = await createTestMantItem(tenant.id);

      const woItem = await prisma.workOrderItem.create({
        data: {
          workOrderId: wo.id,
          mantItemId: mi.mantItem.id,
          description: 'Test consume',
          supplier: 'TBD',
          unitPrice: 0,
          quantity: 10,
          totalCost: 0,
          purchasedBy: user.id,
          status: 'PENDING',
        },
      });

      const res = await CONSUME(
        new NextRequest('http://localhost:3000/api/inventory/consume', {
          method: 'POST',
          body: JSON.stringify({
            workOrderId: wo.id,
            items: [
              {
                workOrderItemId: woItem.id,
                inventoryItemId: inv.id,
                quantity: 10,
              },
            ],
          }),
        })
      );

      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.items).toHaveLength(1);

      // Verify stock decreased
      const updatedInv = await prisma.inventoryItem.findUnique({ where: { id: inv.id } });
      expect(Number(updatedInv?.quantity)).toBe(40);

      // Verify WO item updated
      const updatedWoItem = await prisma.workOrderItem.findUnique({ where: { id: woItem.id } });
      expect(updatedWoItem?.itemSource).toBe('INTERNAL_STOCK');
      expect(updatedWoItem?.closureType).toBe('INTERNAL_TICKET');
    });

    it('rejects consumption when stock is insufficient', async () => {
      const inv = await createTestInventoryItem(tenant.id, masterPart.id, {
        quantity: 5,
      });

      const vd = await createTestVehicle(tenant.id);
      const wo = await createTestWorkOrder(tenant.id, vd.vehicle.id, user.id);
      const mi = await createTestMantItem(tenant.id);

      const woItem = await prisma.workOrderItem.create({
        data: {
          workOrderId: wo.id,
          mantItemId: mi.mantItem.id,
          description: 'Test consume fail',
          supplier: 'TBD',
          unitPrice: 0,
          quantity: 20,
          totalCost: 0,
          purchasedBy: user.id,
          status: 'PENDING',
        },
      });

      const res = await CONSUME(
        new NextRequest('http://localhost:3000/api/inventory/consume', {
          method: 'POST',
          body: JSON.stringify({
            workOrderId: wo.id,
            items: [
              {
                workOrderItemId: woItem.id,
                inventoryItemId: inv.id,
                quantity: 20,
              },
            ],
          }),
        })
      );

      expect(res.status).toBe(400);
      const error = await res.json();
      expect(error.error).toContain('insuficiente');
    });
  });
});

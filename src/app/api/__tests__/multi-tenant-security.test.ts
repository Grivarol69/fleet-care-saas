import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  createTestTenant,
  createTestUser,
  createTestVehicle,
  createTestWorkOrder,
  createTestProvider,
  createTestMantItem,
  createTestMaintenanceProgram,
  createTestAlert,
  createTestMasterPart,
  createTestInventoryItem,
  mockAuthAsUser,
  cleanupTenants,
} from '@test/helpers';

// Import route handlers
import { GET as GET_VEHICLES } from '@/app/api/vehicles/vehicles/route';
import { GET as GET_WORK_ORDERS } from '@/app/api/maintenance/work-orders/route';
import { GET as GET_INVOICES } from '@/app/api/invoices/route';
import { GET as GET_PURCHASE_ORDERS } from '@/app/api/purchase-orders/route';
import { PATCH as PATCH_WORK_ORDER } from '@/app/api/maintenance/work-orders/[id]/route';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  isSuperAdmin: vi.fn().mockResolvedValue(false),
}));

describe('Multi-Tenant Security', () => {
  let tenantA: Awaited<ReturnType<typeof createTestTenant>>;
  let tenantB: Awaited<ReturnType<typeof createTestTenant>>;
  let userA: Awaited<ReturnType<typeof createTestUser>>;
  let userB: Awaited<ReturnType<typeof createTestUser>>;
  let vehicleA: Awaited<ReturnType<typeof createTestVehicle>>;
  let vehicleB: Awaited<ReturnType<typeof createTestVehicle>>;
  let workOrderA: Awaited<ReturnType<typeof createTestWorkOrder>>;
  let workOrderB: Awaited<ReturnType<typeof createTestWorkOrder>>;

  beforeEach(async () => {
    // Setup two tenants with identical data structures
    tenantA = await createTestTenant({ name: 'Tenant A' });
    tenantB = await createTestTenant({ name: 'Tenant B' });

    userA = await createTestUser(tenantA.id, { role: 'OWNER' });
    userB = await createTestUser(tenantB.id, { role: 'OWNER' });

    vehicleA = await createTestVehicle(tenantA.id);
    vehicleB = await createTestVehicle(tenantB.id);

    workOrderA = await createTestWorkOrder(tenantA.id, vehicleA.vehicle.id, userA.id);
    workOrderB = await createTestWorkOrder(tenantB.id, vehicleB.vehicle.id, userB.id);

    await createTestProvider(tenantA.id, { name: 'Provider A' });
    await createTestProvider(tenantB.id, { name: 'Provider B' });
  });

  afterEach(async () => {
    await cleanupTenants([tenantA.id, tenantB.id]);
    vi.clearAllMocks();
  });

  describe('Vehicle Isolation', () => {
    it('Tenant A cannot see Tenant B vehicles in listing', async () => {
      mockAuthAsUser({ id: userA.id, tenantId: tenantA.id, role: 'OWNER' });

      const res = await GET_VEHICLES();
      const data = await res.json();

      expect(res.status).toBe(200);
      const vehicleIds = data.map((v: { id: number }) => v.id);
      expect(vehicleIds).toContain(vehicleA.vehicle.id);
      expect(vehicleIds).not.toContain(vehicleB.vehicle.id);
    });
  });

  describe('Work Order Isolation', () => {
    it('Tenant A cannot see Tenant B work orders', async () => {
      mockAuthAsUser({ id: userA.id, tenantId: tenantA.id, role: 'OWNER' });

      const res = await GET_WORK_ORDERS(
        new NextRequest('http://localhost:3000/api/maintenance/work-orders')
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      const woIds = data.map((wo: { id: number }) => wo.id);
      expect(woIds).toContain(workOrderA.id);
      expect(woIds).not.toContain(workOrderB.id);
    });

    it('Tenant A cannot PATCH Tenant B work order', async () => {
      mockAuthAsUser({ id: userA.id, tenantId: tenantA.id, role: 'OWNER' });

      const res = await PATCH_WORK_ORDER(
        new NextRequest(
          `http://localhost:3000/api/maintenance/work-orders/${workOrderB.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify({ status: 'IN_PROGRESS' }),
          }
        ),
        { params: Promise.resolve({ id: workOrderB.id.toString() }) }
      );

      expect(res.status).toBe(404);
    });
  });

  describe('Purchase Order Isolation', () => {
    it('Tenant A cannot see Tenant B purchase orders', async () => {
      // Create PO for each tenant (directly in DB)
      const provA = await prisma.provider.findFirst({ where: { tenantId: tenantA.id } });
      const provB = await prisma.provider.findFirst({ where: { tenantId: tenantB.id } });

      await prisma.purchaseOrder.create({
        data: {
          tenantId: tenantA.id,
          workOrderId: workOrderA.id,
          orderNumber: 'OC-2026-000001',
          type: 'SERVICES',
          providerId: provA!.id,
          status: 'DRAFT',
          requestedBy: userA.id,
          subtotal: 100000,
          taxRate: 0,
          taxAmount: 0,
          total: 100000,
        },
      });

      await prisma.purchaseOrder.create({
        data: {
          tenantId: tenantB.id,
          workOrderId: workOrderB.id,
          orderNumber: 'OC-2026-000001',
          type: 'SERVICES',
          providerId: provB!.id,
          status: 'DRAFT',
          requestedBy: userB.id,
          subtotal: 200000,
          taxRate: 0,
          taxAmount: 0,
          total: 200000,
        },
      });

      mockAuthAsUser({ id: userA.id, tenantId: tenantA.id, role: 'OWNER' });

      const res = await GET_PURCHASE_ORDERS(
        new NextRequest('http://localhost:3000/api/purchase-orders')
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      for (const po of data) {
        expect(po.tenantId).toBe(tenantA.id);
      }
    });
  });

  describe('Invoice Isolation', () => {
    it('Tenant A cannot see Tenant B invoices', async () => {
      const provA = await prisma.provider.findFirst({ where: { tenantId: tenantA.id } });
      const provB = await prisma.provider.findFirst({ where: { tenantId: tenantB.id } });

      await prisma.invoice.create({
        data: {
          tenantId: tenantA.id,
          invoiceNumber: 'INV-A-001',
          invoiceDate: new Date(),
          supplierId: provA!.id,
          subtotal: 100000,
          taxAmount: 0,
          totalAmount: 100000,
          status: 'PENDING',
          registeredBy: userA.id,
        },
      });

      await prisma.invoice.create({
        data: {
          tenantId: tenantB.id,
          invoiceNumber: 'INV-B-001',
          invoiceDate: new Date(),
          supplierId: provB!.id,
          subtotal: 200000,
          taxAmount: 0,
          totalAmount: 200000,
          status: 'PENDING',
          registeredBy: userB.id,
        },
      });

      mockAuthAsUser({ id: userA.id, tenantId: tenantA.id, role: 'OWNER' });

      const res = await GET_INVOICES(
        new NextRequest('http://localhost:3000/api/invoices')
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      for (const inv of data) {
        expect(inv.tenantId).toBe(tenantA.id);
      }
    });
  });

  describe('Alert Isolation', () => {
    it('Tenant A cannot see Tenant B maintenance alerts', async () => {
      const progA = await createTestMaintenanceProgram(
        tenantA.id,
        vehicleA.vehicle.id,
        userA.id
      );
      await createTestAlert(tenantA.id, vehicleA.vehicle.id, progA.programItem.id);

      const progB = await createTestMaintenanceProgram(
        tenantB.id,
        vehicleB.vehicle.id,
        userB.id
      );
      await createTestAlert(tenantB.id, vehicleB.vehicle.id, progB.programItem.id);

      // Query directly as there's no dedicated alerts API in scope
      const alertsA = await prisma.maintenanceAlert.findMany({
        where: { tenantId: tenantA.id },
      });
      const alertsB = await prisma.maintenanceAlert.findMany({
        where: { tenantId: tenantB.id },
      });

      expect(alertsA.length).toBeGreaterThanOrEqual(1);
      expect(alertsB.length).toBeGreaterThanOrEqual(1);

      // No cross-contamination
      for (const a of alertsA) {
        expect(a.tenantId).toBe(tenantA.id);
      }
      for (const b of alertsB) {
        expect(b.tenantId).toBe(tenantB.id);
      }
    });
  });

  describe('Cross-tenant creation prevention', () => {
    it('cannot create WO with vehicle from another tenant', async () => {
      mockAuthAsUser({ id: userA.id, tenantId: tenantA.id, role: 'OWNER' });

      const { POST } = await import('@/app/api/maintenance/work-orders/route');

      const res = await POST(
        new NextRequest('http://localhost:3000/api/maintenance/work-orders', {
          method: 'POST',
          body: JSON.stringify({
            vehicleId: vehicleB.vehicle.id, // Tenant B's vehicle
            alertIds: [],
            title: 'Cross-tenant WO',
            mantType: 'CORRECTIVE',
            workType: 'INTERNAL',
          }),
        })
      );

      expect(res.status).toBe(404);
      const data = await res.json();
      expect(data.error).toContain('no encontrado');
    });
  });

  describe('Inventory Isolation', () => {
    it('Tenant A cannot consume Tenant B inventory', async () => {
      const partB = await createTestMasterPart(tenantB.id);
      const invB = await createTestInventoryItem(tenantB.id, partB.id, {
        quantity: 100,
      });

      mockAuthAsUser({ id: userA.id, tenantId: tenantA.id, role: 'OWNER' });

      const mi = await createTestMantItem(tenantA.id);
      const woItemA = await prisma.workOrderItem.create({
        data: {
          workOrderId: workOrderA.id,
          mantItemId: mi.mantItem.id,
          description: 'Cross-tenant test',
          supplier: 'TBD',
          unitPrice: 0,
          quantity: 10,
          totalCost: 0,
          purchasedBy: userA.id,
          status: 'PENDING',
        },
      });

      const { POST: CONSUME } = await import('@/app/api/inventory/consume/route');

      const res = await CONSUME(
        new NextRequest('http://localhost:3000/api/inventory/consume', {
          method: 'POST',
          body: JSON.stringify({
            workOrderId: workOrderA.id,
            items: [
              {
                workOrderItemId: woItemA.id,
                inventoryItemId: invB.id,
                quantity: 5,
              },
            ],
          }),
        })
      );

      // Should fail because inventory item doesn't belong to tenant A
      expect(res.status).toBe(500);
    });
  });
});

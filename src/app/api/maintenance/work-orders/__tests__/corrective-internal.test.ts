import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { PATCH, DELETE } from '../[id]/route';
import { POST as POST_ITEMS } from '../[id]/items/route';
import { prisma } from '@/lib/prisma';
import {
  createTestTenant,
  createTestUser,
  createTestVehicle,
  createTestMantItem,
  createTestMaintenanceProgram,
  createTestAlert,
  mockAuthAsUser,
  mockAuthAsUnauthenticated,
  cleanupTenant,
} from '@test/helpers';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  isSuperAdmin: vi.fn().mockResolvedValue(false),
}));

// Mock FinancialWatchdogService to avoid side effects
vi.mock('@/lib/services/FinancialWatchdogService', () => ({
  FinancialWatchdogService: {
    checkPriceDeviation: vi.fn().mockResolvedValue(undefined),
    checkBudgetOverrun: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock InventoryService
vi.mock('@/lib/services/InventoryService', () => ({
  InventoryService: {
    checkAvailability: vi.fn().mockResolvedValue({ available: true, currentStock: 100 }),
  },
}));

describe('Corrective Internal Work Order Circuit', () => {
  let tenant: Awaited<ReturnType<typeof createTestTenant>>;
  let user: Awaited<ReturnType<typeof createTestUser>>;
  let vehicleData: Awaited<ReturnType<typeof createTestVehicle>>;
  let mantItemData: Awaited<ReturnType<typeof createTestMantItem>>;

  beforeEach(async () => {
    tenant = await createTestTenant();
    user = await createTestUser(tenant.id, { role: 'OWNER' });
    vehicleData = await createTestVehicle(tenant.id);
    mantItemData = await createTestMantItem(tenant.id, { mantType: 'CORRECTIVE', type: 'SERVICE' });

    mockAuthAsUser({ id: user.id, tenantId: tenant.id, role: user.role });
  });

  afterEach(async () => {
    await cleanupTenant(tenant.id);
    vi.clearAllMocks();
  });

  // Helper to create corrective WO
  async function createCorrectiveWO(overrides: Record<string, unknown> = {}) {
    const body = {
      vehicleId: vehicleData.vehicle.id,
      alertIds: [],
      title: 'Corrective Repair',
      mantType: 'CORRECTIVE',
      workType: 'INTERNAL',
      priority: 'HIGH',
      ...overrides,
    };

    const res = await POST(
      new NextRequest('http://localhost:3000/api/maintenance/work-orders', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    );

    return { res, data: await res.json() };
  }

  // Helper to add item to WO
  async function addItem(woId: number, itemBody: Record<string, unknown>) {
    const req = new NextRequest(
      `http://localhost:3000/api/maintenance/work-orders/${woId}/items`,
      { method: 'POST', body: JSON.stringify(itemBody) }
    );
    return POST_ITEMS(req, { params: Promise.resolve({ id: woId.toString() }) });
  }

  // Helper to patch WO status
  async function patchWO(woId: number, body: Record<string, unknown>) {
    const req = new NextRequest(
      `http://localhost:3000/api/maintenance/work-orders/${woId}`,
      { method: 'PATCH', body: JSON.stringify(body) }
    );
    return PATCH(req, { params: Promise.resolve({ id: woId.toString() }) });
  }

  // Helper to delete/cancel WO
  async function deleteWO(woId: number) {
    const req = new NextRequest(
      `http://localhost:3000/api/maintenance/work-orders/${woId}`,
      { method: 'DELETE' }
    );
    return DELETE(req, { params: Promise.resolve({ id: woId.toString() }) });
  }

  it('creates corrective WO without alerts (workType: INTERNAL)', async () => {
    const { res, data } = await createCorrectiveWO();

    expect(res.status).toBe(201);
    expect(data.status).toBe('PENDING');
    expect(data.mantType).toBe('CORRECTIVE');
    expect(data.workType).toBe('INTERNAL');
    expect(data.vehicleId).toBe(vehicleData.vehicle.id);
    expect(data.isPackageWork).toBe(false);
  });

  it('adds items to existing WO', async () => {
    const { data: wo } = await createCorrectiveWO();

    const itemRes = await addItem(wo.id, {
      mantItemId: mantItemData.mantItem.id,
      quantity: 2,
      unitPrice: 50000,
      description: 'Brake service',
      itemSource: 'EXTERNAL',
    });

    expect(itemRes.status).toBe(201);
    const item = await itemRes.json();
    expect(Number(item.quantity)).toBe(2);
    expect(Number(item.unitPrice)).toBe(50000);
    expect(Number(item.totalCost)).toBe(100000);
    expect(item.status).toBe('PENDING');
    expect(item.closureType).toBe('PENDING');
  });

  it('transitions PENDING -> IN_PROGRESS', async () => {
    const { data: wo } = await createCorrectiveWO();

    const res = await patchWO(wo.id, { status: 'IN_PROGRESS' });

    expect(res.status).toBe(200);
    const updated = await res.json();
    expect(updated.status).toBe('IN_PROGRESS');
    expect(updated.startDate).toBeDefined();
  });

  it('blocks COMPLETED if items have closureType PENDING', async () => {
    const { data: wo } = await createCorrectiveWO();

    // Add item (defaults to closureType PENDING)
    await addItem(wo.id, {
      mantItemId: mantItemData.mantItem.id,
      quantity: 1,
      unitPrice: 25000,
      itemSource: 'EXTERNAL',
    });

    // Move to IN_PROGRESS
    await patchWO(wo.id, { status: 'IN_PROGRESS' });

    // Try to complete - should fail
    const completeRes = await patchWO(wo.id, { status: 'COMPLETED' });

    expect(completeRes.status).toBe(400);
    const error = await completeRes.json();
    expect(error.error).toContain('pendientes de cierre');
  });

  it('allows COMPLETED when all items have closureType != PENDING', async () => {
    const { data: wo } = await createCorrectiveWO();

    // Add item
    await addItem(wo.id, {
      mantItemId: mantItemData.mantItem.id,
      quantity: 1,
      unitPrice: 30000,
      itemSource: 'EXTERNAL',
    });

    // Move to IN_PROGRESS
    await patchWO(wo.id, { status: 'IN_PROGRESS' });

    // Update items closure type to non-PENDING
    await prisma.workOrderItem.updateMany({
      where: { workOrderId: wo.id },
      data: { closureType: 'EXTERNAL_INVOICE' },
    });

    // Now complete should succeed
    const completeRes = await patchWO(wo.id, { status: 'COMPLETED' });

    expect(completeRes.status).toBe(200);
    const completed = await completeRes.json();
    expect(completed.status).toBe('COMPLETED');
    expect(completed.endDate).toBeDefined();
  });

  it('completing WO marks all items as COMPLETED', async () => {
    const { data: wo } = await createCorrectiveWO();

    // Add 2 items
    await addItem(wo.id, {
      mantItemId: mantItemData.mantItem.id,
      quantity: 1,
      unitPrice: 20000,
      itemSource: 'EXTERNAL',
    });
    await addItem(wo.id, {
      mantItemId: mantItemData.mantItem.id,
      quantity: 2,
      unitPrice: 15000,
      itemSource: 'EXTERNAL',
    });

    // Move to IN_PROGRESS
    await patchWO(wo.id, { status: 'IN_PROGRESS' });

    // Set items closure type
    await prisma.workOrderItem.updateMany({
      where: { workOrderId: wo.id },
      data: { closureType: 'INTERNAL_TICKET' },
    });

    // Complete
    await patchWO(wo.id, { status: 'COMPLETED' });

    // Verify all items are COMPLETED
    const items = await prisma.workOrderItem.findMany({ where: { workOrderId: wo.id } });
    expect(items).toHaveLength(2);
    for (const item of items) {
      expect(item.status).toBe('COMPLETED');
    }
  });

  it('CANCEL reverts alerts to PENDING', async () => {
    // Create a preventive WO with alerts for this test
    const prog = await createTestMaintenanceProgram(
      tenant.id,
      vehicleData.vehicle.id,
      user.id,
      { estimatedCost: 100 }
    );
    const testAlert = await createTestAlert(
      tenant.id,
      vehicleData.vehicle.id,
      prog.programItem.id,
      { status: 'PENDING' }
    );

    // Create WO from alert
    const { data: wo } = await createCorrectiveWO({
      alertIds: [testAlert.id],
      mantType: 'PREVENTIVE',
      title: 'To Cancel',
    });

    // Verify alert linked
    const alertAfter = await prisma.maintenanceAlert.findUnique({ where: { id: testAlert.id } });
    expect(alertAfter?.status).toBe('IN_PROGRESS');
    expect(alertAfter?.workOrderId).toBe(wo.id);

    // Cancel WO
    const delRes = await deleteWO(wo.id);
    expect(delRes.status).toBe(200);

    // Verify alert reverted
    const alertReverted = await prisma.maintenanceAlert.findUnique({ where: { id: testAlert.id } });
    expect(alertReverted?.status).toBe('PENDING');
    expect(alertReverted?.workOrderId).toBeNull();

    // Verify WO cancelled
    const cancelledWO = await prisma.workOrder.findUnique({ where: { id: wo.id } });
    expect(cancelledWO?.status).toBe('CANCELLED');
  });

  it('cannot cancel COMPLETED WO', async () => {
    const { data: wo } = await createCorrectiveWO();

    // Start then complete (no items = no blocking)
    await patchWO(wo.id, { status: 'IN_PROGRESS' });
    await patchWO(wo.id, { status: 'COMPLETED' });

    // Try to cancel
    const delRes = await deleteWO(wo.id);
    expect(delRes.status).toBe(400);
    const error = await delRes.json();
    expect(error.error).toContain('completada');
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuthAsUnauthenticated();

    const { res } = await createCorrectiveWO();
    expect(res.status).toBe(401);
  });

  it('adds multiple items and total costs are correct', async () => {
    const { data: wo } = await createCorrectiveWO();

    const itemRes1 = await addItem(wo.id, {
      mantItemId: mantItemData.mantItem.id,
      quantity: 3,
      unitPrice: 20000,
      itemSource: 'EXTERNAL',
    });
    const item1 = await itemRes1.json();
    expect(Number(item1.totalCost)).toBe(60000);

    const itemRes2 = await addItem(wo.id, {
      mantItemId: mantItemData.mantItem.id,
      quantity: 2,
      unitPrice: 35000,
      itemSource: 'EXTERNAL',
    });
    const item2 = await itemRes2.json();
    expect(Number(item2.totalCost)).toBe(70000);

    const items = await prisma.workOrderItem.findMany({ where: { workOrderId: wo.id } });
    expect(items).toHaveLength(2);
    const total = items.reduce((s, i) => s + Number(i.totalCost), 0);
    expect(total).toBe(130000);
  });
});

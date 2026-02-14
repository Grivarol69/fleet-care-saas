import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH } from '../route'; // Import directly from [id]/route.ts
import { prisma } from '@/lib/prisma';

// Mock Auth
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

import { getCurrentUser } from '@/lib/auth';

describe('Work Order Integration (PATCH)', () => {
  const tenantId = 'integration-patch-tenant-' + Date.now();
  const userId = 'owner-patch-' + Date.now();
  let vehicleId: number;
  let workOrderId: number;
  let mantItemId: number;

  beforeEach(async () => {
    // Mock User
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: userId,
      tenantId: tenantId,
      email: 'owner@patch.test',
      firstName: 'Owner',
      lastName: 'Patch',
      role: 'OWNER',
      permissions: [],
    } as any);

    // Setup DB
    await prisma.tenant.create({
      data: {
        id: tenantId,
        name: 'Patch Test Tenant',
        slug: `patch-${Date.now()}`,
      },
    });

    await prisma.user.create({
      data: {
        id: userId,
        tenantId: tenantId,
        email: 'owner@patch.test',
        role: 'OWNER',
      },
    });

    const brand = await prisma.vehicleBrand.create({
      data: { name: 'PatchBrand', tenantId },
    });
    const line = await prisma.vehicleLine.create({
      data: { name: 'PatchLine', brandId: brand.id, tenantId },
    });
    const type = await prisma.vehicleType.create({
      data: { name: 'PatchType', tenantId },
    });

    const vehicle = await prisma.vehicle.create({
      data: {
        tenantId,
        licensePlate: 'PATCH-001',
        brandId: brand.id,
        lineId: line.id,
        typeId: type.id,
        year: 2024,
        color: 'Black',
        mileage: 10000,
        status: 'ACTIVE',
      },
    });
    vehicleId = vehicle.id;

    const category = await prisma.mantCategory.create({
      data: { name: 'PatchCategory', tenantId },
    });
    const mantItem = await prisma.mantItem.create({
      data: {
        name: 'PatchItem',
        mantType: 'PREVENTIVE',
        categoryId: category.id,
        tenantId,
      },
    });
    mantItemId = mantItem.id;

    // Create initial Work Order
    const workOrder = await prisma.workOrder.create({
      data: {
        tenantId,
        vehicleId,
        title: 'Patch Test Order',
        mantType: 'PREVENTIVE',
        priority: 'MEDIUM',
        status: 'PENDING',
        creationMileage: 10000,
        requestedBy: userId,
        workOrderItems: {
          create: {
            mantItemId,
            description: 'Test Item',
            unitPrice: 100,
            quantity: 1,
            totalCost: 100,
            purchasedBy: userId,
            supplier: 'Test Supplier',
            closureType: 'PENDING', // Important!
            itemSource: 'EXTERNAL',
          },
        },
      },
    });
    workOrderId = workOrder.id;
  });

  afterEach(async () => {
    // Cleanup
    await prisma.workOrderItem.deleteMany({
      where: { workOrder: { tenantId } },
    });
    await prisma.workOrder.deleteMany({ where: { tenantId } });
    await prisma.mantItem.deleteMany({ where: { tenantId } });
    await prisma.mantCategory.deleteMany({ where: { tenantId } });
    await prisma.vehicle.deleteMany({ where: { tenantId } });
    await prisma.vehicleLine.deleteMany({ where: { tenantId } });
    await prisma.vehicleBrand.deleteMany({ where: { tenantId } });
    await prisma.vehicleType.deleteMany({ where: { tenantId } });
    await prisma.user.deleteMany({ where: { tenantId } });
    await prisma.tenant.deleteMany({ where: { id: tenantId } });
    vi.clearAllMocks();
  });

  it('should update status to IN_PROGRESS and set startDate', async () => {
    const body = { status: 'IN_PROGRESS' };
    const req = new NextRequest(
      `http://localhost:3000/api/maintenance/work-orders/${workOrderId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      }
    );

    // Mock params
    const params = Promise.resolve({ id: workOrderId.toString() });

    const response = await PATCH(req, { params });
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.status).toBe('IN_PROGRESS');
    expect(json.startDate).toBeDefined();

    const dbWO = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
    });
    expect(dbWO?.status).toBe('IN_PROGRESS');
    expect(dbWO?.startDate).toBeDefined();
  });

  it('should BLOCK setting status to COMPLETED if items are pending', async () => {
    const body = { status: 'COMPLETED' };
    const req = new NextRequest(
      `http://localhost:3000/api/maintenance/work-orders/${workOrderId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      }
    );

    const params = Promise.resolve({ id: workOrderId.toString() });

    const response = await PATCH(req, { params });
    expect(response.status).toBe(400); // Bad Request

    const json = await response.json();
    expect(json.error).toMatch(/pendientes de cierre/);
  });

  it('should ALLOW setting status to COMPLETED if items are closed', async () => {
    // First, close the item directly in DB
    await prisma.workOrderItem.updateMany({
      where: { workOrderId },
      data: { closureType: 'EXTERNAL_INVOICE' },
    });

    const body = { status: 'COMPLETED' };
    const req = new NextRequest(
      `http://localhost:3000/api/maintenance/work-orders/${workOrderId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      }
    );

    const params = Promise.resolve({ id: workOrderId.toString() });

    const response = await PATCH(req, { params });
    expect(response.status).toBe(200);

    const json = await response.json();
    expect(json.status).toBe('COMPLETED');
    expect(json.endDate).toBeDefined();

    const dbWO = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
    });
    expect(dbWO?.status).toBe('COMPLETED');
  });
});

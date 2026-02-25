import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { PATCH } from '../route'; // Import directly from [id]/route.ts
// NOTE: PATCH from items/[itemId]/route is imported inside the describe block below
// to avoid a TypeScript noUnusedLocals false-positive caused by vi.mock() hoisting.
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
            tenantId,
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
    // Advance WO to PENDING_INVOICE first (items still have closureType=PENDING)
    await prisma.workOrder.update({
      where: { id: workOrderId },
      data: { status: 'PENDING_INVOICE' },
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
    expect(response.status).toBe(400); // Bad Request

    const json = await response.json();
    expect(json.error).toMatch(/pendientes de cierre/);
  });

  it('should ALLOW setting status to COMPLETED if items are closed', async () => {
    // Close items and advance WO to PENDING_INVOICE (the valid predecessor of COMPLETED)
    await prisma.workOrderItem.updateMany({
      where: { workOrderId },
      data: { closureType: 'EXTERNAL_INVOICE' },
    });
    await prisma.workOrder.update({
      where: { id: workOrderId },
      data: { status: 'PENDING_INVOICE' },
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

// ========================================
// TASK 4.1 - 4.5: Role + Lifecycle Tests
// ========================================
describe('Work Order PATCH — Role-Based Transition Guards', () => {
  const tenantId = 'role-guard-tenant-' + Date.now();
  const ownerId = 'owner-guard-' + Date.now();
  const technicianId = 'tech-guard-' + Date.now();
  const managerId = 'manager-guard-' + Date.now();
  let vehicleId: number;
  let workOrderId: number;
  let mantItemId: number;

  // Helper: set the mocked user role
  const mockUser = (id: string, role: string) => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id,
      tenantId,
      email: `${role.toLowerCase()}@guard.test`,
      firstName: role,
      lastName: 'Guard',
      role,
      isSuperAdmin: false,
      permissions: [],
    } as any);
  };

  beforeEach(async () => {
    // Default to OWNER
    mockUser(ownerId, 'OWNER');

    await prisma.tenant.create({
      data: {
        id: tenantId,
        name: 'Guard Test Tenant',
        slug: `guard-${Date.now()}`,
      },
    });
    await prisma.user.create({
      data: { id: ownerId, tenantId, email: 'owner@guard.test', role: 'OWNER' },
    });
    await prisma.user.create({
      data: {
        id: technicianId,
        tenantId,
        email: 'tech@guard.test',
        role: 'TECHNICIAN',
      },
    });
    await prisma.user.create({
      data: {
        id: managerId,
        tenantId,
        email: 'manager@guard.test',
        role: 'MANAGER',
      },
    });

    const brand = await prisma.vehicleBrand.create({
      data: { name: 'GuardBrand', tenantId },
    });
    const line = await prisma.vehicleLine.create({
      data: { name: 'GuardLine', brandId: brand.id, tenantId },
    });
    const type = await prisma.vehicleType.create({
      data: { name: 'GuardType', tenantId },
    });

    const vehicle = await prisma.vehicle.create({
      data: {
        tenantId,
        licensePlate: 'GUARD-001',
        brandId: brand.id,
        lineId: line.id,
        typeId: type.id,
        year: 2024,
        color: 'White',
        mileage: 5000,
        status: 'ACTIVE',
      },
    });
    vehicleId = vehicle.id;

    const category = await prisma.mantCategory.create({
      data: { name: 'GuardCategory', tenantId },
    });
    const mantItem = await prisma.mantItem.create({
      data: {
        name: 'GuardItem',
        mantType: 'CORRECTIVE',
        categoryId: category.id,
        tenantId,
      },
    });
    mantItemId = mantItem.id;

    const workOrder = await prisma.workOrder.create({
      data: {
        tenantId,
        vehicleId,
        title: 'Guard Test Order',
        mantType: 'CORRECTIVE',
        priority: 'HIGH',
        status: 'PENDING',
        creationMileage: 5000,
        requestedBy: ownerId,
        workOrderItems: {
          create: {
            tenantId,
            mantItemId,
            description: 'Guard Item',
            unitPrice: 200,
            quantity: 1,
            totalCost: 200,
            purchasedBy: ownerId,
            supplier: 'Guard Supplier',
            closureType: 'PENDING',
            itemSource: 'EXTERNAL',
          },
        },
      },
    });
    workOrderId = workOrder.id;
  });

  afterEach(async () => {
    // Clean up in dependency order (most-dependent first)
    await prisma.maintenanceAlert.deleteMany({ where: { tenantId } });
    await prisma.vehicleProgramItem.deleteMany({ where: { tenantId } });
    await prisma.vehicleProgramPackage.deleteMany({ where: { tenantId } });
    await prisma.vehicleMantProgram.deleteMany({ where: { tenantId } });
    await prisma.maintenancePackage.deleteMany({
      where: { template: { tenantId } },
    });
    await prisma.maintenanceTemplate.deleteMany({ where: { tenantId } });
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

  // Task 4.1: TECHNICIAN cannot set status=COMPLETED → returns 403
  it('TECHNICIAN cannot set status=COMPLETED → returns 403', async () => {
    mockUser(technicianId, 'TECHNICIAN');

    // Advance WO to PENDING_INVOICE state so the transition would otherwise be valid
    await prisma.workOrder.update({
      where: { id: workOrderId },
      data: { status: 'PENDING_INVOICE' },
    });
    await prisma.workOrderItem.updateMany({
      where: { workOrderId },
      data: { closureType: 'EXTERNAL_INVOICE' },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/maintenance/work-orders/${workOrderId}`,
      { method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED' }) }
    );
    const params = Promise.resolve({ id: workOrderId.toString() });
    const response = await PATCH(req, { params });

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toMatch(/permisos/i);
  });

  // Task 4.2: TECHNICIAN cannot set status=APPROVED from PENDING_APPROVAL → returns 403
  it('TECHNICIAN cannot set status=APPROVED from PENDING_APPROVAL → returns 403', async () => {
    mockUser(technicianId, 'TECHNICIAN');

    await prisma.workOrder.update({
      where: { id: workOrderId },
      data: { status: 'PENDING_APPROVAL' },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/maintenance/work-orders/${workOrderId}`,
      { method: 'PATCH', body: JSON.stringify({ status: 'APPROVED' }) }
    );
    const params = Promise.resolve({ id: workOrderId.toString() });
    const response = await PATCH(req, { params });

    expect(response.status).toBe(403);
    const json = await response.json();
    expect(json.error).toMatch(/permisos/i);
  });

  // Task 4.3: MANAGER can transition PENDING_INVOICE → COMPLETED → returns 200 with updated actualCost
  it('MANAGER can transition PENDING_INVOICE → COMPLETED → returns 200 with updated actualCost', async () => {
    mockUser(managerId, 'MANAGER');

    // Advance WO to PENDING_INVOICE and close items
    await prisma.workOrder.update({
      where: { id: workOrderId },
      data: { status: 'PENDING_INVOICE' },
    });
    await prisma.workOrderItem.updateMany({
      where: { workOrderId },
      data: { closureType: 'EXTERNAL_INVOICE' },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/maintenance/work-orders/${workOrderId}`,
      { method: 'PATCH', body: JSON.stringify({ status: 'COMPLETED' }) }
    );
    const params = Promise.resolve({ id: workOrderId.toString() });
    const response = await PATCH(req, { params });

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json.status).toBe('COMPLETED');
    // actualCost should be auto-computed from items (200) + approved expenses (0) = 200
    expect(Number(json.actualCost)).toBe(200);
  });

  // Task 4.4: Invalid transition COMPLETED → IN_PROGRESS for any role → returns 400
  it('Invalid transition COMPLETED → IN_PROGRESS for any role → returns 400', async () => {
    mockUser(ownerId, 'OWNER');

    // Force WO to COMPLETED state directly in DB
    await prisma.workOrder.update({
      where: { id: workOrderId },
      data: { status: 'COMPLETED' },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/maintenance/work-orders/${workOrderId}`,
      { method: 'PATCH', body: JSON.stringify({ status: 'IN_PROGRESS' }) }
    );
    const params = Promise.resolve({ id: workOrderId.toString() });
    const response = await PATCH(req, { params });

    expect(response.status).toBe(400);
    const json = await response.json();
    expect(json.error).toMatch(/transición inválida/i);
  });

  // Task 4.5: REJECTED status reverts linked MaintenanceAlert from CLOSED to PENDING
  it('REJECTED status reverts linked MaintenanceAlert from CLOSED to PENDING', async () => {
    mockUser(managerId, 'MANAGER');

    // Advance WO to PENDING_APPROVAL first
    await prisma.workOrder.update({
      where: { id: workOrderId },
      data: { status: 'PENDING_APPROVAL' },
    });

    // Build the required hierarchy: Template → Package → Program → ProgramPackage → ProgramItem → Alert
    const brand = await prisma.vehicleBrand.findFirst({ where: { tenantId } });
    const line = await prisma.vehicleLine.findFirst({ where: { tenantId } });

    const template = await prisma.maintenanceTemplate.create({
      data: {
        tenantId,
        name: 'Guard Template',
        vehicleBrandId: brand!.id,
        vehicleLineId: line!.id,
      },
    });

    // Create a MaintenancePackage so cleanup cascade works; no need to keep the reference
    await prisma.maintenancePackage.create({
      data: {
        templateId: template.id,
        name: 'Guard Package',
        triggerKm: 5000,
      },
    });

    const program = await prisma.vehicleMantProgram.create({
      data: {
        tenantId,
        vehicleId,
        name: 'Guard Program',
        generatedBy: managerId,
        assignmentKm: 5000,
      },
    });

    const programPackage = await prisma.vehicleProgramPackage.create({
      data: {
        tenantId,
        programId: program.id,
        name: 'Guard ProgramPackage',
        triggerKm: 5000,
      },
    });

    const programItem = await prisma.vehicleProgramItem.create({
      data: {
        tenantId,
        packageId: programPackage.id,
        mantItemId,
        mantType: 'CORRECTIVE',
        scheduledKm: 5000,
        estimatedCost: 200,
        estimatedTime: 1,
        status: 'PENDING',
      },
    });

    // Create a MaintenanceAlert linked to this WO (simulating it was CLOSED when WO started)
    const alert = await prisma.maintenanceAlert.create({
      data: {
        tenantId,
        vehicleId,
        programItemId: programItem.id,
        itemName: 'Guard Alert',
        packageName: 'Guard Package',
        priority: 'HIGH',
        alertLevel: 'HIGH',
        priorityScore: 80,
        category: 'ROUTINE',
        status: 'CLOSED',
        workOrderId,
        scheduledKm: 5000,
        currentKmAtCreation: 5000,
        currentKm: 5000,
        kmToMaintenance: 0,
        alertThresholdKm: 1000,
      },
    });

    const req = new NextRequest(
      `http://localhost:3000/api/maintenance/work-orders/${workOrderId}`,
      { method: 'PATCH', body: JSON.stringify({ status: 'REJECTED' }) }
    );
    const params = Promise.resolve({ id: workOrderId.toString() });
    const response = await PATCH(req, { params });

    expect(response.status).toBe(200);

    // Verify the alert was reverted to PENDING
    const updatedAlert = await prisma.maintenanceAlert.findUnique({
      where: { id: alert.id },
    });
    expect(updatedAlert?.status).toBe('PENDING');
    expect(updatedAlert?.workOrderId).toBeNull();
  });
});

// ========================================
// TASK 4.6: Auto PENDING_INVOICE via item closure
// ========================================
describe('Work Order Item PATCH — Auto PENDING_INVOICE trigger', () => {
  const tenantId = 'auto-pi-tenant-' + Date.now();
  const userId = 'tech-auto-pi-' + Date.now();
  let vehicleId: number;
  let workOrderId: number;
  let mantItemId: number;
  let workOrderItemId: number;

  beforeEach(async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: userId,
      tenantId,
      email: 'tech@autopi.test',
      firstName: 'Tech',
      lastName: 'AutoPI',
      role: 'TECHNICIAN',
      isSuperAdmin: false,
      permissions: [],
    } as any);

    await prisma.tenant.create({
      data: {
        id: tenantId,
        name: 'AutoPI Tenant',
        slug: `autopi-${Date.now()}`,
      },
    });
    await prisma.user.create({
      data: {
        id: userId,
        tenantId,
        email: 'tech@autopi.test',
        role: 'TECHNICIAN',
      },
    });

    const brand = await prisma.vehicleBrand.create({
      data: { name: 'AutoPIBrand', tenantId },
    });
    const line = await prisma.vehicleLine.create({
      data: { name: 'AutoPILine', brandId: brand.id, tenantId },
    });
    const type = await prisma.vehicleType.create({
      data: { name: 'AutoPIType', tenantId },
    });

    const vehicle = await prisma.vehicle.create({
      data: {
        tenantId,
        licensePlate: 'AUTOPI-001',
        brandId: brand.id,
        lineId: line.id,
        typeId: type.id,
        year: 2024,
        color: 'Red',
        mileage: 8000,
        status: 'ACTIVE',
      },
    });
    vehicleId = vehicle.id;

    const category = await prisma.mantCategory.create({
      data: { name: 'AutoPICategory', tenantId },
    });
    const mantItem = await prisma.mantItem.create({
      data: {
        name: 'AutoPIItem',
        mantType: 'CORRECTIVE',
        categoryId: category.id,
        tenantId,
      },
    });
    mantItemId = mantItem.id;

    // Create WO with a single item and set WO to IN_PROGRESS
    const workOrder = await prisma.workOrder.create({
      data: {
        tenantId,
        vehicleId,
        title: 'AutoPI Test Order',
        mantType: 'CORRECTIVE',
        priority: 'MEDIUM',
        status: 'IN_PROGRESS',
        creationMileage: 8000,
        requestedBy: userId,
        workOrderItems: {
          create: {
            tenantId,
            mantItemId,
            description: 'AutoPI Item',
            unitPrice: 50,
            quantity: 2,
            totalCost: 100,
            purchasedBy: userId,
            supplier: 'AutoPI Supplier',
            closureType: 'PENDING',
            itemSource: 'EXTERNAL',
          },
        },
      },
      include: { workOrderItems: true },
    });
    workOrderId = workOrder.id;
    workOrderItemId = workOrder.workOrderItems[0]!.id;
  });

  afterEach(async () => {
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

  // Task 4.6: All items closed → WO auto-transitions to PENDING_INVOICE
  it('All items closed → WO auto-transitions to PENDING_INVOICE', async () => {
    // Import inside the test to avoid noUnusedLocals false-positive from vi.mock() hoisting
    const { PATCH: patchItem } = await import('../items/[itemId]/route');

    const req = new NextRequest(
      `http://localhost:3000/api/maintenance/work-orders/${workOrderId}/items/${workOrderItemId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ closureType: 'EXTERNAL_INVOICE' }),
      }
    );
    const params = Promise.resolve({
      id: workOrderId.toString(),
      itemId: workOrderItemId.toString(),
    });

    const response = await patchItem(req, { params });
    expect(response.status).toBe(200);

    const json = await response.json();
    // The response should signal the WO status changed to PENDING_INVOICE
    expect(json.workOrderStatusChanged).toBe('PENDING_INVOICE');

    // Verify in DB
    const dbWO = await prisma.workOrder.findUnique({
      where: { id: workOrderId },
    });
    expect(dbWO?.status).toBe('PENDING_INVOICE');
  });
});

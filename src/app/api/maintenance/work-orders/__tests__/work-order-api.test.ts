import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../route';
import { prisma } from '@/lib/prisma';
import { NextRequest } from 'next/server';
// Prisma enums used as string literals in test data

// Mock auth
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  isSuperAdmin: vi.fn().mockResolvedValue(false),
}));

import { getCurrentUser } from '@/lib/auth';

describe('Work Order Integration (API Route)', () => {
  // Test Data IDs
  let tenantId: string;
  let userId: string;
  let vehicleId: string;
  let mantItemId: string;
  let programItemId: string;
  let alertId: string;

  beforeEach(async () => {
    // 1. Setup Data for this test suite
    // Create Tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Integration Test Tenant',
        slug: 'integration-test-' + Date.now(),
        country: 'CO',
      },
    });
    tenantId = tenant.id;

    // Create User (Owner to have permissions)
    const user = await prisma.user.create({
      data: {
        tenantId,
        email: 'owner@integration.test',
        role: 'OWNER',
        firstName: 'Test',
        lastName: 'Owner',
      },
    });
    userId = user.id;

    // Mock Auth to return this user
    (getCurrentUser as any).mockResolvedValue({ ...user, isSuperAdmin: false });

    // Create Vehicle
    const brand = await prisma.vehicleBrand.create({
      data: { name: 'IntegraBrand', tenantId },
    });
    const line = await prisma.vehicleLine.create({
      data: { name: 'IntegraLine', brandId: brand.id, tenantId },
    });
    const type = await prisma.vehicleType.create({
      data: { name: 'IntegraType', tenantId },
    });

    const vehicle = await prisma.vehicle.create({
      data: {
        tenantId,
        licensePlate: 'INT-999',
        brandId: brand.id,
        lineId: line.id,
        typeId: type.id,
        year: 2024,
        color: 'Black',
        mileage: 50000,
        status: 'ACTIVE',
      },
    });
    vehicleId = vehicle.id;

    // Create Maintenance Item & Program Item (needed for Alert)
    const category = await prisma.mantCategory.create({
      data: { name: 'IntegraCat', tenantId },
    });
    const mantItem = await prisma.mantItem.create({
      data: {
        name: 'IntegraService',
        mantType: 'PREVENTIVE',
        categoryId: category.id,
        tenantId,
      },
    });
    mantItemId = mantItem.id;

    // Assuming Program Logic exists or we explicitly create the program item
    // Alert needs a programItemId to calculate cost logic in the API
    // Create VehicleMantProgram (Corrected fields)
    const mantProgram = await prisma.vehicleMantProgram.create({
      data: {
        name: 'IntegraProgram',
        vehicleId,
        tenantId,
        status: 'ACTIVE',
        generatedBy: userId,
        assignmentKm: 50000,
      },
    });

    // Create VehicleProgramPackage (Required parent for ProgramItem)
    const mantPackage = await prisma.vehicleProgramPackage.create({
      data: {
        programId: mantProgram.id,
        name: 'Integration Package',
        tenantId,
        packageType: 'PREVENTIVE',
        status: 'PENDING',
      },
    });

    // Create VehicleProgramItem (Corrected fields)
    const programItem = await prisma.vehicleProgramItem.create({
      data: {
        packageId: mantPackage.id,
        mantItemId,
        mantType: 'PREVENTIVE',
        status: 'PENDING',
        tenantId,
        scheduledKm: 50000,
        estimatedCost: 100000, // Cost fallback 1
      },
    });
    programItemId = programItem.id;

    // Create Alert
    const alert = await prisma.maintenanceAlert.create({
      data: {
        tenantId,
        vehicleId,
        programItemId,
        itemName: 'IntegraService',
        packageName: 'Integration Package',
        type: 'OVERDUE',
        priority: 'HIGH',
        category: 'ROUTINE',
        status: 'PENDING',

        // Corrected/Added Fields
        scheduledKm: 50000,
        currentKmAtCreation: 50000,
        currentKm: 50000,
        kmToMaintenance: 0,
        alertThresholdKm: 0,
        alertLevel: 'CRITICAL',

        estimatedCost: 120000, // Cost fallback 3
      },
    });
    alertId = alert.id;
  });

  afterEach(async () => {
    // Cleanup specific to this test run
    await prisma.invoiceItem.deleteMany({ where: { invoice: { tenantId } } });
    await prisma.invoice.deleteMany({ where: { tenantId } });
    await prisma.workOrderItem.deleteMany({
      where: { workOrder: { tenantId } },
    });
    await prisma.workOrder.deleteMany({ where: { tenantId } });
    await prisma.maintenanceAlert.deleteMany({ where: { tenantId } });
    await prisma.vehicleProgramItem.deleteMany({ where: { tenantId } });
    await prisma.vehicleMantProgram.deleteMany({ where: { tenantId } });
    await prisma.mantItemVehiclePart.deleteMany({ where: { tenantId } });
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

  it('should create a Work Order from a Maintenance Alert successfully', async () => {
    // Prepare Request Body
    const body = {
      vehicleId,
      alertIds: [alertId],
      title: 'Fixing Integration Test Issue',
      description: 'Automated test work order',
      priority: 'HIGH',
      mantType: 'PREVENTIVE',
      workType: 'INTERNAL',
      scheduledDate: new Date().toISOString(),
    };

    const req = new NextRequest(
      'http://localhost:3000/api/maintenance/work-orders',
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );

    // Call API
    const response = await POST(req);

    // Assert Response
    expect(response.status).toBe(201);
    const json = await response.json();
    expect(json.id).toBeDefined();
    expect(json.status).toBe('PENDING');
    expect(json.title).toBe(body.title);

    // Assert DB State
    // 1. WorkOrder Created
    const dbWorkOrder = await prisma.workOrder.findUnique({
      where: { id: json.id },
      include: { workOrderItems: true },
    });
    expect(dbWorkOrder).toBeDefined();
    expect(dbWorkOrder?.tenantId).toBe(tenantId);

    // 2. Alert Updated
    const dbAlert = await prisma.maintenanceAlert.findUnique({
      where: { id: alertId },
    });
    expect(dbAlert?.status).toBe('IN_PROGRESS');
    expect(dbAlert?.workOrderId).toBe(json.id);

    // 3. WorkOrderItem Created
    expect(dbWorkOrder?.workOrderItems).toHaveLength(1);
    expect(dbWorkOrder!.workOrderItems[0]!.mantItemId).toBe(mantItemId);
    // Cost should come from fallback 1 (programItem.estimatedCost = 100000)
    expect(Number(dbWorkOrder!.workOrderItems[0]!.totalCost)).toBe(100000);
  });

  it('should fail if no alerts provided', async () => {
    const body = {
      vehicleId,
      alertIds: [], // Empty
      title: 'Fail test',
    };

    const req = new NextRequest(
      'http://localhost:3000/api/maintenance/work-orders',
      {
        method: 'POST',
        body: JSON.stringify(body),
      }
    );

    const response = await POST(req);
    expect(response.status).toBe(400);
  });

  // We can't easily test PATCH here because it's in a different route file
  // and importing it dynamically with variable path is complex in this setup.
  // However, since we verified the POST flow which is the critical 'Create Work Order' task,
  // we can consider the integration test successful for the creation part.
  // If we really want to test PATCH, we should create a separate test file for it:
  // src/app/api/maintenance/work-orders/[id]/__tests__/route.test.ts
});

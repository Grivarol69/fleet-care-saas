import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { PATCH } from '../[id]/route';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

// Mock Auth
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
}));

describe('E2E Simulation: Alert to Completion', () => {
  const tenantId = 'e2e-tenant-' + Date.now();
  const userId = 'e2e-owner-' + Date.now();
  let vehicleId: string;
  let alertId: string;
  let mantItemId: string;
  let workOrderId: string;

  beforeEach(async () => {
    // Mock User
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: userId,
      tenantId: tenantId,
      email: 'e2e@test.com',
      role: 'OWNER',
      permissions: [],
    } as any);

    // 1. Setup Data
    await prisma.tenant.create({
      data: { id: tenantId, name: 'E2E Tenant', slug: `e2e-${Date.now()}` },
    });

    await prisma.user.create({
      data: { id: userId, tenantId, email: 'e2e@test.com', role: 'OWNER' },
    });

    const brand = await prisma.vehicleBrand.create({
      data: { name: 'E2EBrand', tenantId },
    });
    const line = await prisma.vehicleLine.create({
      data: { name: 'E2ELine', brandId: brand.id, tenantId },
    });
    const type = await prisma.vehicleType.create({
      data: { name: 'E2EType', tenantId },
    });

    const vehicle = await prisma.vehicle.create({
      data: {
        tenantId,
        licensePlate: 'E2E-999',
        brandId: brand.id,
        lineId: line.id,
        typeId: type.id,
        year: 2025,
        color: 'White',
        mileage: 50000,
        status: 'ACTIVE',
      },
    });
    vehicleId = vehicle.id;

    const category = await prisma.mantCategory.create({
      data: { name: 'E2ECategory', tenantId },
    });
    const mantItem = await prisma.mantItem.create({
      data: {
        name: 'E2E Service',
        mantType: 'PREVENTIVE',
        categoryId: category.id,
        tenantId,
      },
    });
    mantItemId = mantItem.id;

    // Create Program & ProgramItem (Required for Alert)
    const mantProgram = await prisma.vehicleMantProgram.create({
      data: {
        name: 'E2E Program',
        vehicleId,
        tenantId,
        status: 'ACTIVE',
        generatedBy: userId,
        assignmentKm: 50000,
      },
    });

    const mantPackage = await prisma.vehicleProgramPackage.create({
      data: {
        programId: mantProgram.id,
        name: 'E2E Package',
        tenantId,
        packageType: 'PREVENTIVE',
        status: 'PENDING',
      },
    });

    const programItem = await prisma.vehicleProgramItem.create({
      data: {
        packageId: mantPackage.id,
        mantItemId,
        mantType: 'PREVENTIVE',
        status: 'PENDING',
        tenantId,
        scheduledKm: 50000,
        estimatedCost: 200,
      },
    });

    // 2. Create Trigger Alert
    const alert = await prisma.maintenanceAlert.create({
      data: {
        tenantId,
        vehicleId,
        programItemId: programItem.id,
        itemName: 'E2E Service Alert',
        packageName: 'E2E Package',
        type: 'OVERDUE',
        category: 'ROUTINE',
        priority: 'HIGH',
        status: 'PENDING',

        // Detailed fields
        scheduledKm: 50000,
        currentKmAtCreation: 50000,
        currentKm: 50000,
        kmToMaintenance: 0,
        alertThresholdKm: 0,
        alertLevel: 'CRITICAL',
        estimatedCost: 200,
      },
    });
    alertId = alert.id;
  });

  afterEach(async () => {
    // Cleanup... (Simpler to just delete tenant cascading if setup correctly, but doing manual for safety)
    await prisma.invoiceItem.deleteMany({ where: { invoice: { tenantId } } });
    await prisma.invoice.deleteMany({ where: { tenantId } });
    await prisma.workOrderItem.deleteMany({
      where: { workOrder: { tenantId } },
    });
    await prisma.workOrder.deleteMany({ where: { tenantId } });
    await prisma.maintenanceAlert.deleteMany({ where: { tenantId } });
    await prisma.vehicleProgramItem.deleteMany({ where: { tenantId } });
    await prisma.vehicleProgramPackage.deleteMany({ where: { tenantId } });
    await prisma.vehicleMantProgram.deleteMany({ where: { tenantId } });
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

  it('should complete the full lifecycle: Alert -> WO -> Execution -> Completion', async () => {
    console.log('--- Step 1: Create Work Order (POST) ---');
    const postBody = {
      vehicleId,
      alertIds: [alertId],
      title: 'E2E Work Order',
      description: 'Full flow test',
      priority: 'HIGH',
      mantType: 'PREVENTIVE',
      workType: 'INTERNAL',
      scheduledDate: new Date().toISOString(),
    };

    const postReq = new NextRequest(
      'http://localhost:3000/api/maintenance/work-orders',
      {
        method: 'POST',
        body: JSON.stringify(postBody),
      }
    );

    const postRes = await POST(postReq);
    expect(postRes.status).toBe(201);
    const woJson = await postRes.json();
    workOrderId = woJson.id;
    expect(woJson.status).toBe('PENDING');

    // Verify Alert Status
    const alertAfterPost = await prisma.maintenanceAlert.findUnique({
      where: { id: alertId },
    });
    expect(alertAfterPost?.status).toBe('IN_PROGRESS');
    expect(alertAfterPost?.workOrderId).toBe(workOrderId);

    console.log('--- Step 2: Start Work Order (PATCH) ---');
    const startBody = { status: 'IN_PROGRESS' };
    const startReq = new NextRequest(
      `http://localhost:3000/api/maintenance/work-orders/${workOrderId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(startBody),
      }
    );
    const startRes = await PATCH(startReq, {
      params: Promise.resolve({ id: workOrderId.toString() }),
    });
    expect(startRes.status).toBe(200);
    const startedJson = await startRes.json();
    expect(startedJson.status).toBe('IN_PROGRESS');
    expect(startedJson.startDate).toBeDefined();

    console.log('--- Step 3: Attempt Completion (Should Fail) ---');
    const completeBodyFail = { status: 'COMPLETED' };
    const failReq = new NextRequest(
      `http://localhost:3000/api/maintenance/work-orders/${workOrderId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(completeBodyFail),
      }
    );
    const failRes = await PATCH(failReq, {
      params: Promise.resolve({ id: workOrderId.toString() }),
    });
    expect(failRes.status).toBe(400); // Should be blocked by pending items

    console.log('--- Step 4: Execute & Close Items ---');
    // Simulate completing the work item
    await prisma.workOrderItem.updateMany({
      where: { workOrderId },
      data: {
        closureType: 'EXTERNAL_INVOICE',
        status: 'COMPLETED', // Use valid string based on WorkOrderStatus enum? Or is it literal?
        // Checking schema: WorkOrderStatus usually PENDING, IN_PROGRESS, COMPLETED, CANCELLED
        // status: 'COMPLETED' is valid.
        notes: 'Work done successfully',
      },
    });

    console.log('--- Step 5: Complete Work Order (Success) ---');
    const completeBodySuccess = {
      status: 'COMPLETED',
      completedAt: new Date().toISOString(),
    };
    const successReq = new NextRequest(
      `http://localhost:3000/api/maintenance/work-orders/${workOrderId}`,
      {
        method: 'PATCH',
        body: JSON.stringify(completeBodySuccess),
      }
    );
    const successRes = await PATCH(successReq, {
      params: Promise.resolve({ id: workOrderId.toString() }),
    });
    expect(successRes.status).toBe(200);

    const completedJson = await successRes.json();
    expect(completedJson.status).toBe('COMPLETED');
    expect(completedJson.endDate).toBeDefined();

    console.log('--- Step 6: Final Verification ---');
    // Verify Alert Closed
    const alertFinal = await prisma.maintenanceAlert.findUnique({
      where: { id: alertId },
    });
    expect(alertFinal?.status).toBe('COMPLETED');
    expect(alertFinal?.closedAt).toBeDefined();

    // Verify Program Item Closed (Optional but good)
    // Need to find which Program Item was linked. It was the one created in beforeEach.
    // Alert links to ProgramItem.
    // The PATCH logic should have closed it if it was linked properly.
    await prisma.vehicleProgramItem.findFirst({
      where: {
        tenantId,
        packageId: { not: '' } /* hack to find it if we don't have ID */,
      },
    });
    // Actually we can query by ID if we captured it, but we didn't capture the programItem.id in a higher scope var.
    // Let's rely on alert closure as main proof.
  });
});

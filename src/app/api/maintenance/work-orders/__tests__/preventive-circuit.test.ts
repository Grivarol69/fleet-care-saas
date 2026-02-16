import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
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

describe('Preventive Circuit: Alert to Work Order', () => {
  let tenant: Awaited<ReturnType<typeof createTestTenant>>;
  let user: Awaited<ReturnType<typeof createTestUser>>;
  let vehicleData: Awaited<ReturnType<typeof createTestVehicle>>;
  let program: Awaited<ReturnType<typeof createTestMaintenanceProgram>>;
  let alert: Awaited<ReturnType<typeof createTestAlert>>;

  beforeEach(async () => {
    tenant = await createTestTenant();
    user = await createTestUser(tenant.id, { role: 'OWNER' });
    vehicleData = await createTestVehicle(tenant.id);
    program = await createTestMaintenanceProgram(
      tenant.id,
      vehicleData.vehicle.id,
      user.id,
      { estimatedCost: 100000 }
    );
    alert = await createTestAlert(tenant.id, vehicleData.vehicle.id, program.programItem.id, {
      status: 'PENDING',
      estimatedCost: 120000,
    });

    mockAuthAsUser({ id: user.id, tenantId: tenant.id, role: user.role });
  });

  afterEach(async () => {
    await cleanupTenant(tenant.id);
    vi.clearAllMocks();
  });

  function postWO(body: Record<string, unknown>) {
    return POST(
      new NextRequest('http://localhost:3000/api/maintenance/work-orders', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    );
  }

  it('creates preventive WO from alerts and links correctly', async () => {
    const res = await postWO({
      vehicleId: vehicleData.vehicle.id,
      alertIds: [alert.id],
      title: 'Preventive - Oil Change',
      mantType: 'PREVENTIVE',
      priority: 'MEDIUM',
      workType: 'EXTERNAL',
    });

    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.status).toBe('PENDING');
    expect(data.mantType).toBe('PREVENTIVE');
    expect(data.vehicleId).toBe(vehicleData.vehicle.id);
    expect(data.tenantId).toBe(tenant.id);

    // Alert linked and status changed
    const updatedAlert = await prisma.maintenanceAlert.findUnique({ where: { id: alert.id } });
    expect(updatedAlert?.status).toBe('IN_PROGRESS');
    expect(updatedAlert?.workOrderId).toBe(data.id);

    // ProgramItem moved to IN_PROGRESS
    const updatedPI = await prisma.vehicleProgramItem.findUnique({ where: { id: program.programItem.id } });
    expect(updatedPI?.status).toBe('IN_PROGRESS');

    // WorkOrderItem created
    const items = await prisma.workOrderItem.findMany({ where: { workOrderId: data.id } });
    expect(items).toHaveLength(1);
    expect(items[0]?.mantItemId).toBe(program.mantItemId);
  });

  it('uses programItem.estimatedCost as first cost fallback', async () => {
    // programItem has estimatedCost=100000 (from setup)
    const res = await postWO({
      vehicleId: vehicleData.vehicle.id,
      alertIds: [alert.id],
      title: 'Cost Test - ProgramItem',
      mantType: 'PREVENTIVE',
      workType: 'EXTERNAL',
    });

    expect(res.status).toBe(201);
    const data = await res.json();

    const items = await prisma.workOrderItem.findMany({ where: { workOrderId: data.id } });
    expect(items).toHaveLength(1);
    // programItem.estimatedCost=100000 is the first fallback
    expect(Number(items[0]?.totalCost)).toBe(100000);
  });

  it('uses alert.estimatedCost when programItem has no cost', async () => {
    // Need a separate vehicle since VehicleMantProgram has @@unique([vehicleId])
    const vd2 = await createTestVehicle(tenant.id);
    const mi = await createTestMantItem(tenant.id);
    const prog = await createTestMaintenanceProgram(
      tenant.id,
      vd2.vehicle.id,
      user.id,
      { mantItemId: mi.mantItem.id, estimatedCost: 0 }
    );
    const alertNoCost = await createTestAlert(
      tenant.id,
      vd2.vehicle.id,
      prog.programItem.id,
      { status: 'PENDING', estimatedCost: 150000 }
    );

    const res = await postWO({
      vehicleId: vd2.vehicle.id,
      alertIds: [alertNoCost.id],
      title: 'Cost Test - Alert Fallback',
      mantType: 'PREVENTIVE',
      workType: 'EXTERNAL',
    });

    expect(res.status).toBe(201);
    const data = await res.json();

    const items = await prisma.workOrderItem.findMany({ where: { workOrderId: data.id } });
    expect(items).toHaveLength(1);
    expect(Number(items[0]?.totalCost)).toBe(150000);
  });

  it('uses 0 when no cost reference available', async () => {
    const vd3 = await createTestVehicle(tenant.id);
    const mi = await createTestMantItem(tenant.id);
    const prog = await createTestMaintenanceProgram(
      tenant.id,
      vd3.vehicle.id,
      user.id,
      { mantItemId: mi.mantItem.id, estimatedCost: 0 }
    );
    const alertZero = await createTestAlert(
      tenant.id,
      vd3.vehicle.id,
      prog.programItem.id,
      { status: 'PENDING', estimatedCost: 0 }
    );

    const res = await postWO({
      vehicleId: vd3.vehicle.id,
      alertIds: [alertZero.id],
      title: 'Cost Test - Zero',
      mantType: 'PREVENTIVE',
      workType: 'EXTERNAL',
    });

    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.estimatedCost).toBe(0);

    const items = await prisma.workOrderItem.findMany({ where: { workOrderId: data.id } });
    expect(Number(items[0]?.totalCost)).toBe(0);
  });

  it('rejects creation without alertIds for PREVENTIVE (400)', async () => {
    const res = await postWO({
      vehicleId: vehicleData.vehicle.id,
      alertIds: [],
      title: 'Should Fail',
      mantType: 'PREVENTIVE',
      workType: 'EXTERNAL',
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('alertIds son requeridos');
  });

  it('rejects creation without title (400)', async () => {
    const res = await postWO({
      vehicleId: vehicleData.vehicle.id,
      alertIds: [alert.id],
      title: '',
      mantType: 'PREVENTIVE',
      workType: 'EXTERNAL',
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('título es requerido');
  });

  it('rejects creation without vehicleId (400)', async () => {
    const res = await postWO({
      alertIds: [alert.id],
      title: 'No Vehicle',
      mantType: 'PREVENTIVE',
      workType: 'EXTERNAL',
    });

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('vehicleId es requerido');
  });

  it('rejects creation with alerts from another tenant (404)', async () => {
    const otherTenant = await createTestTenant();
    const otherUser = await createTestUser(otherTenant.id);
    const otherVehicle = await createTestVehicle(otherTenant.id);
    const otherProg = await createTestMaintenanceProgram(
      otherTenant.id,
      otherVehicle.vehicle.id,
      otherUser.id
    );
    const otherAlert = await createTestAlert(
      otherTenant.id,
      otherVehicle.vehicle.id,
      otherProg.programItem.id,
      { status: 'PENDING' }
    );

    const res = await postWO({
      vehicleId: vehicleData.vehicle.id,
      alertIds: [otherAlert.id],
      title: 'Cross-Tenant Test',
      mantType: 'PREVENTIVE',
      workType: 'EXTERNAL',
    });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain('No se encontraron alertas válidas');

    await cleanupTenant(otherTenant.id);
  });

  it('rejects creation if user lacks permissions (403)', async () => {
    const driver = await createTestUser(tenant.id, { role: 'DRIVER' });
    mockAuthAsUser({ id: driver.id, tenantId: tenant.id, role: driver.role });

    const res = await postWO({
      vehicleId: vehicleData.vehicle.id,
      alertIds: [alert.id],
      title: 'No Perms',
      mantType: 'PREVENTIVE',
      workType: 'EXTERNAL',
    });

    expect(res.status).toBe(403);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuthAsUnauthenticated();

    const res = await postWO({
      vehicleId: vehicleData.vehicle.id,
      alertIds: [alert.id],
      title: 'Unauth',
      mantType: 'PREVENTIVE',
      workType: 'EXTERNAL',
    });

    expect(res.status).toBe(401);
  });

  it('handles multiple alerts in a single WO', async () => {
    // Each alert needs a unique programItemId+status, so create extra programItems
    const mi2 = await createTestMantItem(tenant.id);
    const programItem2 = await prisma.vehicleProgramItem.create({
      data: {
        packageId: program.package.id,
        mantItemId: mi2.mantItem.id,
        mantType: 'PREVENTIVE',
        status: 'PENDING',
        tenantId: tenant.id,
        scheduledKm: 50000,
        estimatedCost: 100000,
      },
    });
    const alert2 = await createTestAlert(
      tenant.id,
      vehicleData.vehicle.id,
      programItem2.id,
      { status: 'PENDING', itemName: 'Service 2' }
    );

    const mi3 = await createTestMantItem(tenant.id);
    const programItem3 = await prisma.vehicleProgramItem.create({
      data: {
        packageId: program.package.id,
        mantItemId: mi3.mantItem.id,
        mantType: 'PREVENTIVE',
        status: 'PENDING',
        tenantId: tenant.id,
        scheduledKm: 50000,
        estimatedCost: 100000,
      },
    });
    const alert3 = await createTestAlert(
      tenant.id,
      vehicleData.vehicle.id,
      programItem3.id,
      { status: 'PENDING', itemName: 'Service 3' }
    );

    const res = await postWO({
      vehicleId: vehicleData.vehicle.id,
      alertIds: [alert.id, alert2.id, alert3.id],
      title: 'Package Maintenance',
      mantType: 'PREVENTIVE',
      priority: 'HIGH',
      workType: 'EXTERNAL',
    });

    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.isPackageWork).toBe(true);

    const items = await prisma.workOrderItem.findMany({ where: { workOrderId: data.id } });
    expect(items).toHaveLength(3);

    // All alerts should be IN_PROGRESS
    const a1 = await prisma.maintenanceAlert.findUnique({ where: { id: alert.id } });
    const a2 = await prisma.maintenanceAlert.findUnique({ where: { id: alert2.id } });
    const a3 = await prisma.maintenanceAlert.findUnique({ where: { id: alert3.id } });
    expect(a1?.status).toBe('IN_PROGRESS');
    expect(a2?.status).toBe('IN_PROGRESS');
    expect(a3?.status).toBe('IN_PROGRESS');
  });

  it('only picks up alerts with valid status (PENDING/ACKNOWLEDGED/SNOOZED)', async () => {
    // Create an alert that's already COMPLETED
    const completedAlert = await createTestAlert(
      tenant.id,
      vehicleData.vehicle.id,
      program.programItem.id,
      { status: 'COMPLETED' }
    );

    const res = await postWO({
      vehicleId: vehicleData.vehicle.id,
      alertIds: [completedAlert.id],
      title: 'Invalid Alert Status',
      mantType: 'PREVENTIVE',
      workType: 'EXTERNAL',
    });

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toContain('No se encontraron alertas válidas');
  });

  it('sets creationMileage from vehicle current mileage', async () => {
    await prisma.vehicle.update({
      where: { id: vehicleData.vehicle.id },
      data: { mileage: 75000 },
    });

    const res = await postWO({
      vehicleId: vehicleData.vehicle.id,
      alertIds: [alert.id],
      title: 'Mileage Test',
      mantType: 'PREVENTIVE',
      workType: 'EXTERNAL',
    });

    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.creationMileage).toBe(75000);
  });
});

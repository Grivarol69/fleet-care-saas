import { describe, it, expect, vi, afterEach } from 'vitest';
import { GET as GET_NAVBAR_STATS } from '../navbar-stats/route';
import { GET as GET_FLEET_STATUS } from '../fleet-status/route';
import { prisma } from '@/lib/prisma';
import {
  createTestTenant,
  createTestUser,
  createTestVehicle,
  createTestMaintenanceProgram,
  createTestAlert,
  createTestWorkOrder,
  mockAuthAsUser,
  mockAuthAsUnauthenticated,
  cleanupTenant,
} from '@test/helpers';
import type { FleetStatusResponse } from '../fleet-status/route';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  isSuperAdmin: vi.fn().mockResolvedValue(false),
}));

describe('Dashboard API Integration Tests', () => {
  const tenantIds: string[] = [];

  afterEach(async () => {
    for (const tenantId of tenantIds) {
      await cleanupTenant(tenantId);
    }
    tenantIds.length = 0;
    vi.clearAllMocks();
  });

  describe('GET /api/dashboard/navbar-stats', () => {
    it('returns correct counts for vehicles, alerts, and work orders', async () => {
      const tenant = await createTestTenant();
      tenantIds.push(tenant.id);

      const user = await createTestUser(tenant.id, { role: 'OWNER' });
      mockAuthAsUser({ id: user.id, tenantId: tenant.id, role: user.role });

      const vd1 = await createTestVehicle(tenant.id, { status: 'ACTIVE' });
      const vd2 = await createTestVehicle(tenant.id, { status: 'ACTIVE' });

      const prog1 = await createTestMaintenanceProgram(tenant.id, vd1.vehicle.id, user.id);
      await createTestAlert(tenant.id, vd1.vehicle.id, prog1.programItem.id, {
        status: 'PENDING',
      });

      const wo = await createTestWorkOrder(tenant.id, vd2.vehicle.id, user.id);
      await prisma.workOrder.update({
        where: { id: wo.id },
        data: { status: 'IN_PROGRESS' },
      });

      const response = await GET_NAVBAR_STATS();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        totalVehicles: 2,
        criticalAlerts: 1,
        openWorkOrders: 1,
        monthCosts: '16.8',
      });
    });

    it('returns zeros when no data exists', async () => {
      const tenant = await createTestTenant();
      tenantIds.push(tenant.id);

      const user = await createTestUser(tenant.id, { role: 'OWNER' });
      mockAuthAsUser({ id: user.id, tenantId: tenant.id, role: user.role });

      const response = await GET_NAVBAR_STATS();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        totalVehicles: 0,
        criticalAlerts: 0,
        openWorkOrders: 0,
        monthCosts: '16.8',
      });
    });

    it('returns 401 when unauthenticated', async () => {
      mockAuthAsUnauthenticated();

      const response = await GET_NAVBAR_STATS();
      expect(response.status).toBe(401);
    });

    it('ignores inactive vehicles', async () => {
      const tenant = await createTestTenant();
      tenantIds.push(tenant.id);

      const user = await createTestUser(tenant.id, { role: 'OWNER' });
      mockAuthAsUser({ id: user.id, tenantId: tenant.id, role: user.role });

      await createTestVehicle(tenant.id, { status: 'ACTIVE' });
      await createTestVehicle(tenant.id, { status: 'INACTIVE' });

      const response = await GET_NAVBAR_STATS();
      const data = await response.json();

      expect(data.totalVehicles).toBe(1);
    });

    it('only counts PENDING alerts', async () => {
      const tenant = await createTestTenant();
      tenantIds.push(tenant.id);

      const user = await createTestUser(tenant.id, { role: 'OWNER' });
      mockAuthAsUser({ id: user.id, tenantId: tenant.id, role: user.role });

      const vd1 = await createTestVehicle(tenant.id, { status: 'ACTIVE' });
      const vd2 = await createTestVehicle(tenant.id, { status: 'ACTIVE' });

      const prog1 = await createTestMaintenanceProgram(tenant.id, vd1.vehicle.id, user.id);
      const prog2 = await createTestMaintenanceProgram(tenant.id, vd2.vehicle.id, user.id);

      await createTestAlert(tenant.id, vd1.vehicle.id, prog1.programItem.id, {
        status: 'PENDING',
      });
      await createTestAlert(tenant.id, vd2.vehicle.id, prog2.programItem.id, {
        status: 'COMPLETED',
      });

      const response = await GET_NAVBAR_STATS();
      const data = await response.json();

      expect(data.criticalAlerts).toBe(1);
    });

    it('only counts IN_PROGRESS work orders', async () => {
      const tenant = await createTestTenant();
      tenantIds.push(tenant.id);

      const user = await createTestUser(tenant.id, { role: 'OWNER' });
      mockAuthAsUser({ id: user.id, tenantId: tenant.id, role: user.role });

      const vd = await createTestVehicle(tenant.id, { status: 'ACTIVE' });

      await createTestWorkOrder(tenant.id, vd.vehicle.id, user.id); // PENDING
      const woInProgress = await createTestWorkOrder(tenant.id, vd.vehicle.id, user.id);
      const woCompleted = await createTestWorkOrder(tenant.id, vd.vehicle.id, user.id);

      await prisma.workOrder.update({
        where: { id: woInProgress.id },
        data: { status: 'IN_PROGRESS' },
      });
      await prisma.workOrder.update({
        where: { id: woCompleted.id },
        data: { status: 'COMPLETED' },
      });

      const response = await GET_NAVBAR_STATS();
      const data = await response.json();

      expect(data.openWorkOrders).toBe(1);
    });
  });

  describe('GET /api/dashboard/fleet-status', () => {
    it('returns vehicle list with summary', async () => {
      const tenant = await createTestTenant();
      tenantIds.push(tenant.id);

      const user = await createTestUser(tenant.id, { role: 'OWNER' });
      mockAuthAsUser({ id: user.id, tenantId: tenant.id, role: user.role });

      await createTestVehicle(tenant.id, { status: 'ACTIVE' });
      await createTestVehicle(tenant.id, { status: 'ACTIVE' });

      const response = await GET_FLEET_STATUS();
      const data: FleetStatusResponse = await response.json();

      expect(response.status).toBe(200);
      expect(data.vehicles).toHaveLength(2);
      expect(data.summary.total).toBe(2);
      expect(data.thresholds).toEqual({
        warningDays: 5,
        criticalDays: 10,
      });
    });

    it('is scoped to tenant - only returns own vehicles', async () => {
      const tenantA = await createTestTenant({ name: 'Tenant A' });
      const tenantB = await createTestTenant({ name: 'Tenant B' });
      tenantIds.push(tenantA.id, tenantB.id);

      const userA = await createTestUser(tenantA.id, { role: 'OWNER' });
      await createTestUser(tenantB.id, { role: 'OWNER' });

      const vehicleA = await createTestVehicle(tenantA.id, { status: 'ACTIVE' });
      await createTestVehicle(tenantB.id, { status: 'ACTIVE' });

      mockAuthAsUser({ id: userA.id, tenantId: tenantA.id, role: userA.role });

      const response = await GET_FLEET_STATUS();
      const data: FleetStatusResponse = await response.json();

      expect(data.vehicles).toHaveLength(1);
      expect(data.vehicles[0]!.id).toBe(vehicleA.vehicle.id);
      expect(data.summary.total).toBe(1);
    });

    it('returns 401 when unauthenticated', async () => {
      mockAuthAsUnauthenticated();

      const response = await GET_FLEET_STATUS();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('calculates odometer status based on days since update', async () => {
      const tenant = await createTestTenant();
      tenantIds.push(tenant.id);

      const user = await createTestUser(tenant.id, { role: 'OWNER' });
      mockAuthAsUser({ id: user.id, tenantId: tenant.id, role: user.role });

      // Vehicle 1: odometer 3 days ago (OK)
      const vd1 = await createTestVehicle(tenant.id, { status: 'ACTIVE' });
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      await prisma.odometerLog.create({
        data: {
          vehicleId: vd1.vehicle.id,
          kilometers: 50000,
          measureType: 'KILOMETERS',
          recordedAt: threeDaysAgo,
        },
      });

      // Vehicle 2: odometer 7 days ago (WARNING)
      const vd2 = await createTestVehicle(tenant.id, { status: 'ACTIVE' });
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      await prisma.odometerLog.create({
        data: {
          vehicleId: vd2.vehicle.id,
          kilometers: 60000,
          measureType: 'KILOMETERS',
          recordedAt: sevenDaysAgo,
        },
      });

      // Vehicle 3: odometer 15 days ago (CRITICAL)
      const vd3 = await createTestVehicle(tenant.id, { status: 'ACTIVE' });
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      await prisma.odometerLog.create({
        data: {
          vehicleId: vd3.vehicle.id,
          kilometers: 70000,
          measureType: 'KILOMETERS',
          recordedAt: fifteenDaysAgo,
        },
      });

      const response = await GET_FLEET_STATUS();
      const data: FleetStatusResponse = await response.json();

      const vehicle1 = data.vehicles.find(v => v.id === vd1.vehicle.id);
      const vehicle2 = data.vehicles.find(v => v.id === vd2.vehicle.id);
      const vehicle3 = data.vehicles.find(v => v.id === vd3.vehicle.id);

      expect(vehicle1?.odometer.status).toBe('OK');
      expect(vehicle2?.odometer.status).toBe('WARNING');
      expect(vehicle3?.odometer.status).toBe('CRITICAL');
    });

    it('classifies alert priorities correctly (URGENT=critical, others=warning)', async () => {
      const tenant = await createTestTenant();
      tenantIds.push(tenant.id);

      const user = await createTestUser(tenant.id, { role: 'OWNER' });
      mockAuthAsUser({ id: user.id, tenantId: tenant.id, role: user.role });

      const vd1 = await createTestVehicle(tenant.id, { status: 'ACTIVE' });
      const prog1 = await createTestMaintenanceProgram(tenant.id, vd1.vehicle.id, user.id);
      await createTestAlert(tenant.id, vd1.vehicle.id, prog1.programItem.id, {
        priority: 'URGENT',
        status: 'PENDING',
      });

      const vd2 = await createTestVehicle(tenant.id, { status: 'ACTIVE' });
      const prog2 = await createTestMaintenanceProgram(tenant.id, vd2.vehicle.id, user.id);
      await createTestAlert(tenant.id, vd2.vehicle.id, prog2.programItem.id, {
        priority: 'HIGH',
        status: 'PENDING',
      });

      const response = await GET_FLEET_STATUS();
      const data: FleetStatusResponse = await response.json();

      const vehicle1 = data.vehicles.find(v => v.id === vd1.vehicle.id);
      const vehicle2 = data.vehicles.find(v => v.id === vd2.vehicle.id);

      expect(vehicle1?.maintenanceAlerts.critical).toBe(1);
      expect(vehicle1?.maintenanceAlerts.warning).toBe(0);

      expect(vehicle2?.maintenanceAlerts.critical).toBe(0);
      expect(vehicle2?.maintenanceAlerts.warning).toBe(1);
    });
  });
});

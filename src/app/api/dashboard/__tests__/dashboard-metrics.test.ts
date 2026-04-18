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
  requireCurrentUser: vi.fn(),
  isSuperAdmin: vi.fn().mockResolvedValue(false),
}));

const runIntegration = process.env['RUN_INTEGRATION_TESTS'] === '1';

describe.skipIf(!runIntegration)('Dashboard API integration metrics', () => {
  const tenantIds: string[] = [];

  async function createAuthenticatedOwnerTenant() {
    const tenant = await createTestTenant();
    tenantIds.push(tenant.id);

    const user = await createTestUser(tenant.id, { role: 'OWNER' });
    mockAuthAsUser({ id: user.id, tenantId: tenant.id, role: user.role });

    return { tenant, user };
  }

  afterEach(async () => {
    for (const tenantId of tenantIds) {
      await cleanupTenant(tenantId);
    }
    tenantIds.length = 0;
    vi.clearAllMocks();
  });

  describe('GET /api/dashboard/navbar-stats', () => {
    it('debe devolver metricas del tenant autenticado cuando existe operacion activa', async () => {
      const { tenant, user } = await createAuthenticatedOwnerTenant();

      const vd1 = await createTestVehicle(tenant.id, { status: 'ACTIVE' });
      const vd2 = await createTestVehicle(tenant.id, { status: 'ACTIVE' });

      const prog1 = await createTestMaintenanceProgram(
        tenant.id,
        vd1.vehicle.id,
        user.id
      );
      await createTestAlert(tenant.id, vd1.vehicle.id, prog1.programItem.id, {
        status: 'PENDING',
      });

      const wo = await createTestWorkOrder(tenant.id, vd2.vehicle.id, user.id);
      await prisma.workOrder.update({
        where: { id: wo.id },
        data: { status: 'APPROVED' },
      });

      const response = await GET_NAVBAR_STATS();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalVehicles).toBe(2);
      expect(data.criticalAlerts).toBe(1);
      expect(data.openWorkOrders).toBe(1);
      expect(data.monthCosts).toBe('16.8');
    });

    it('debe devolver contadores en cero cuando el tenant no tiene datos operativos', async () => {
      await createAuthenticatedOwnerTenant();

      const response = await GET_NAVBAR_STATS();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.totalVehicles).toBe(0);
      expect(data.criticalAlerts).toBe(0);
      expect(data.openWorkOrders).toBe(0);
      expect(data.monthCosts).toBe('16.8');
    });

    it('debe responder 401 cuando la solicitud no esta autenticada', async () => {
      mockAuthAsUnauthenticated();

      const response = await GET_NAVBAR_STATS();
      expect(response.status).toBe(401);
    });

    it('debe excluir vehiculos inactivos del contador de flota', async () => {
      const { tenant } = await createAuthenticatedOwnerTenant();

      await createTestVehicle(tenant.id, { status: 'ACTIVE' });
      await createTestVehicle(tenant.id, { status: 'INACTIVE' });

      const response = await GET_NAVBAR_STATS();
      const data = await response.json();

      expect(data.totalVehicles).toBe(1);
    });

    it('debe contar solo alertas pendientes en el resumen critico', async () => {
      const { tenant, user } = await createAuthenticatedOwnerTenant();

      const vd1 = await createTestVehicle(tenant.id, { status: 'ACTIVE' });
      const vd2 = await createTestVehicle(tenant.id, { status: 'ACTIVE' });

      const prog1 = await createTestMaintenanceProgram(
        tenant.id,
        vd1.vehicle.id,
        user.id
      );
      const prog2 = await createTestMaintenanceProgram(
        tenant.id,
        vd2.vehicle.id,
        user.id
      );

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

    it('debe contar solo work orders en progreso como abiertas', async () => {
      const { tenant, user } = await createAuthenticatedOwnerTenant();

      const vd = await createTestVehicle(tenant.id, { status: 'ACTIVE' });

      await createTestWorkOrder(tenant.id, vd.vehicle.id, user.id); // PENDING
      const woInProgress = await createTestWorkOrder(
        tenant.id,
        vd.vehicle.id,
        user.id
      );
      const woCompleted = await createTestWorkOrder(
        tenant.id,
        vd.vehicle.id,
        user.id
      );

      await prisma.workOrder.update({
        where: { id: woInProgress.id },
        data: { status: 'APPROVED' },
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
    it('debe devolver vehiculos activos con summary y thresholds del tablero', async () => {
      const { tenant } = await createAuthenticatedOwnerTenant();

      await createTestVehicle(tenant.id, { status: 'ACTIVE' });
      await createTestVehicle(tenant.id, { status: 'ACTIVE' });

      const response = await GET_FLEET_STATUS();
      const data: FleetStatusResponse = await response.json();

      expect(response.status).toBe(200);
      expect(data.vehicles).toHaveLength(2);
      expect(data.summary.total).toBe(2);
      expect(data.summary.ok).toBe(0);
      expect(data.summary.critical).toBe(2);
      expect(data.summary.warning).toBe(0);
      expect(data.thresholds).toEqual({
        warningDays: 5,
        criticalDays: 10,
      });
    });

    it('debe incluir solo vehiculos del tenant autenticado', async () => {
      const tenantA = await createTestTenant({ name: 'Tenant A' });
      const tenantB = await createTestTenant({ name: 'Tenant B' });
      tenantIds.push(tenantA.id, tenantB.id);

      const userA = await createTestUser(tenantA.id, { role: 'OWNER' });
      await createTestUser(tenantB.id, { role: 'OWNER' });

      const vehicleA = await createTestVehicle(tenantA.id, {
        status: 'ACTIVE',
      });
      await createTestVehicle(tenantB.id, { status: 'ACTIVE' });

      mockAuthAsUser({ id: userA.id, tenantId: tenantA.id, role: userA.role });

      const response = await GET_FLEET_STATUS();
      const data: FleetStatusResponse = await response.json();

      expect(data.vehicles).toHaveLength(1);
      expect(data.vehicles[0]!.id).toBe(vehicleA.vehicle.id);
      expect(data.summary.total).toBe(1);
    });

    it('debe responder 401 cuando fleet-status se consulta sin autenticacion', async () => {
      mockAuthAsUnauthenticated();

      const response = await GET_FLEET_STATUS();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('debe derivar el estado del odometro segun dias desde la ultima lectura', async () => {
      const { tenant } = await createAuthenticatedOwnerTenant();

      // Vehicle 1: odometer 3 days ago (OK)
      const vd1 = await createTestVehicle(tenant.id, { status: 'ACTIVE' });
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      await prisma.odometerLog.create({
        data: {
          tenantId: tenant.id,
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
          tenantId: tenant.id,
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
          tenantId: tenant.id,
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

    it('debe mapear alertas urgentes a critical y el resto a warning', async () => {
      const { tenant, user } = await createAuthenticatedOwnerTenant();

      const vd1 = await createTestVehicle(tenant.id, { status: 'ACTIVE' });
      await prisma.odometerLog.create({
        data: {
          tenantId: tenant.id,
          vehicleId: vd1.vehicle.id,
          kilometers: 50000,
          measureType: 'KILOMETERS',
          recordedAt: new Date(),
        },
      });
      const prog1 = await createTestMaintenanceProgram(
        tenant.id,
        vd1.vehicle.id,
        user.id
      );
      await createTestAlert(tenant.id, vd1.vehicle.id, prog1.programItem.id, {
        priority: 'URGENT',
        status: 'PENDING',
      });

      const vd2 = await createTestVehicle(tenant.id, { status: 'ACTIVE' });
      await prisma.odometerLog.create({
        data: {
          tenantId: tenant.id,
          vehicleId: vd2.vehicle.id,
          kilometers: 60000,
          measureType: 'KILOMETERS',
          recordedAt: new Date(),
        },
      });
      const prog2 = await createTestMaintenanceProgram(
        tenant.id,
        vd2.vehicle.id,
        user.id
      );
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
      expect(data.summary.critical).toBe(1);
      expect(data.summary.warning).toBe(1);
    });
  });
});

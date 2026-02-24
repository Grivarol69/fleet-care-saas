import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import {
  GET as LIST_VEHICLES,
  POST as CREATE_VEHICLE,
} from '../vehicles/route';
import {
  GET as GET_VEHICLE,
  PATCH as PATCH_VEHICLE,
  DELETE as DELETE_VEHICLE,
} from '../vehicles/[id]/route';
import { POST as CREATE_ODOMETER } from '../odometer/route';
import { prisma } from '@/lib/prisma';
import {
  createTestTenant,
  createTestUser,
  createTestVehicle,
  mockAuthAsUser,
  cleanupTenant,
} from '@test/helpers';

// Mock authentication
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  isSuperAdmin: vi.fn().mockResolvedValue(false),
}));

// Mock MaintenanceAlertService to avoid side effects
vi.mock('@/lib/services/MaintenanceAlertService', () => ({
  MaintenanceAlertService: {
    checkAndGenerateAlerts: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('Vehicle CRUD Integration Tests', () => {
  let tenant1: Awaited<ReturnType<typeof createTestTenant>>;
  let tenant2: Awaited<ReturnType<typeof createTestTenant>>;
  let user1: Awaited<ReturnType<typeof createTestUser>>;
  let user2: Awaited<ReturnType<typeof createTestUser>>;
  let driverUser: Awaited<ReturnType<typeof createTestUser>>;

  beforeEach(async () => {
    tenant1 = await createTestTenant({ name: 'Tenant 1' });
    user1 = await createTestUser(tenant1.id, { role: 'OWNER' });

    tenant2 = await createTestTenant({ name: 'Tenant 2' });
    user2 = await createTestUser(tenant2.id, { role: 'OWNER' });

    driverUser = await createTestUser(tenant1.id, { role: 'DRIVER' });
  });

  afterEach(async () => {
    await cleanupTenant(tenant1.id);
    await cleanupTenant(tenant2.id);
    vi.clearAllMocks();
  });

  describe('POST /api/vehicles/vehicles - Create Vehicle', () => {
    it('creates vehicle with all required fields (201)', async () => {
      mockAuthAsUser({ id: user1.id, tenantId: tenant1.id, role: user1.role });

      const brand = await prisma.vehicleBrand.create({
        data: { name: 'Toyota', tenantId: tenant1.id },
      });
      const line = await prisma.vehicleLine.create({
        data: { name: 'Camry', brandId: brand.id, tenantId: tenant1.id },
      });
      const type = await prisma.vehicleType.create({
        data: { name: 'Sedan', tenantId: tenant1.id },
      });

      const payload = {
        licensePlate: 'ABC-123',
        brandId: brand.id,
        lineId: line.id,
        typeId: type.id,
        year: 2024,
        color: 'Blue',
        mileage: 5000,
      };

      const request = new NextRequest(
        'http://localhost/api/vehicles/vehicles',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      const response = await CREATE_VEHICLE(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toMatchObject({
        licensePlate: 'ABC-123',
        brandId: brand.id,
        lineId: line.id,
        typeId: type.id,
        year: 2024,
        color: 'Blue',
        mileage: 5000,
        tenantId: tenant1.id,
        status: 'ACTIVE',
      });
      expect(data.id).toBeDefined();
    });

    it('rejects duplicate licensePlate in same tenant (409)', async () => {
      mockAuthAsUser({ id: user1.id, tenantId: tenant1.id, role: user1.role });

      const { brand, line, type } = await createTestVehicle(tenant1.id, {
        licensePlate: 'XYZ-999',
      });

      const payload = {
        licensePlate: 'XYZ-999',
        brandId: brand.id,
        lineId: line.id,
        typeId: type.id,
        year: 2023,
        color: 'Red',
        mileage: 10000,
      };

      const request = new NextRequest(
        'http://localhost/api/vehicles/vehicles',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      const response = await CREATE_VEHICLE(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('Ya existe un vehículo con esta placa');
    });

    it('allows same licensePlate in different tenant', async () => {
      await createTestVehicle(tenant1.id, { licensePlate: 'SHARED-001' });

      mockAuthAsUser({ id: user2.id, tenantId: tenant2.id, role: user2.role });

      const brand2 = await prisma.vehicleBrand.create({
        data: { name: 'Honda', tenantId: tenant2.id },
      });
      const line2 = await prisma.vehicleLine.create({
        data: { name: 'Civic', brandId: brand2.id, tenantId: tenant2.id },
      });
      const type2 = await prisma.vehicleType.create({
        data: { name: 'Coupe', tenantId: tenant2.id },
      });

      const payload = {
        licensePlate: 'SHARED-001',
        brandId: brand2.id,
        lineId: line2.id,
        typeId: type2.id,
        year: 2024,
        color: 'Green',
        mileage: 3000,
      };

      const request = new NextRequest(
        'http://localhost/api/vehicles/vehicles',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      const response = await CREATE_VEHICLE(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.licensePlate).toBe('SHARED-001');
      expect(data.tenantId).toBe(tenant2.id);
    });

    it('DRIVER cannot create vehicles (403)', async () => {
      mockAuthAsUser({
        id: driverUser.id,
        tenantId: tenant1.id,
        role: 'DRIVER',
      });

      const { brand, line, type } = await createTestVehicle(tenant1.id);

      const payload = {
        licensePlate: 'DRIVER-001',
        brandId: brand.id,
        lineId: line.id,
        typeId: type.id,
        year: 2024,
        color: 'Black',
        mileage: 0,
      };

      const request = new NextRequest(
        'http://localhost/api/vehicles/vehicles',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      const response = await CREATE_VEHICLE(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('No tienes permisos para esta acción');
    });
  });

  describe('GET /api/vehicles/vehicles - List Vehicles', () => {
    it('lists only ACTIVE vehicles for tenant', async () => {
      mockAuthAsUser({ id: user1.id, tenantId: tenant1.id, role: user1.role });

      const { vehicle: activeVehicle } = await createTestVehicle(tenant1.id, {
        licensePlate: 'ACTIVE-001',
      });

      const { vehicle: inactiveVehicle } = await createTestVehicle(tenant1.id, {
        licensePlate: 'INACTIVE-001',
      });
      await prisma.vehicle.update({
        where: { id: inactiveVehicle.id },
        data: { status: 'INACTIVE' },
      });

      // Create vehicle in different tenant
      await createTestVehicle(tenant2.id, { licensePlate: 'OTHER-001' });

      const response = await LIST_VEHICLES();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBe(1);
      expect(data[0].id).toBe(activeVehicle.id);
      expect(data[0].licensePlate).toBe('ACTIVE-001');
      expect(data[0].status).toBe('ACTIVE');
    });
  });

  describe('GET /api/vehicles/vehicles/[id] - Get Vehicle', () => {
    it('returns 404 for wrong tenant', async () => {
      const { vehicle } = await createTestVehicle(tenant1.id);

      mockAuthAsUser({ id: user2.id, tenantId: tenant2.id, role: user2.role });

      const request = new NextRequest(
        `http://localhost/api/vehicles/vehicles/${vehicle.id}`
      );
      const response = await GET_VEHICLE(request, {
        params: Promise.resolve({ id: vehicle.id.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Vehículo no encontrado');
    });
  });

  describe('PATCH /api/vehicles/vehicles/[id] - Update Vehicle', () => {
    it('updates vehicle fields', async () => {
      mockAuthAsUser({ id: user1.id, tenantId: tenant1.id, role: user1.role });

      const { vehicle } = await createTestVehicle(tenant1.id, {
        licensePlate: 'PATCH-001',
      });

      const payload = { color: 'Red', mileage: 60000 };

      const request = new NextRequest(
        `http://localhost/api/vehicles/vehicles/${vehicle.id}`,
        { method: 'PATCH', body: JSON.stringify(payload) }
      );

      const response = await PATCH_VEHICLE(request, {
        params: Promise.resolve({ id: vehicle.id.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.color).toBe('Red');
      expect(data.mileage).toBe(60000);
      expect(data.licensePlate).toBe('PATCH-001');
    });

    it('rejects duplicate license plate on change (409)', async () => {
      mockAuthAsUser({ id: user1.id, tenantId: tenant1.id, role: user1.role });

      await createTestVehicle(tenant1.id, { licensePlate: 'EXISTING-001' });
      const { vehicle: vehicle2 } = await createTestVehicle(tenant1.id, {
        licensePlate: 'CHANGE-001',
      });

      const request = new NextRequest(
        `http://localhost/api/vehicles/vehicles/${vehicle2.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ licensePlate: 'EXISTING-001' }),
        }
      );

      const response = await PATCH_VEHICLE(request, {
        params: Promise.resolve({ id: vehicle2.id.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('Ya existe un vehículo con esta placa');
    });
  });

  describe('DELETE /api/vehicles/vehicles/[id] - Soft Delete', () => {
    it('soft-deletes vehicle (sets INACTIVE)', async () => {
      mockAuthAsUser({ id: user1.id, tenantId: tenant1.id, role: user1.role });

      const { vehicle } = await createTestVehicle(tenant1.id, {
        licensePlate: 'DELETE-001',
      });

      const request = new NextRequest(
        `http://localhost/api/vehicles/vehicles/${vehicle.id}`
      );

      const response = await DELETE_VEHICLE(request, {
        params: Promise.resolve({ id: vehicle.id.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Vehículo desactivado');

      const updatedVehicle = await prisma.vehicle.findUnique({
        where: { id: vehicle.id },
      });
      expect(updatedVehicle?.status).toBe('INACTIVE');
    });
  });

  describe('POST /api/vehicles/odometer - Create Odometer Log', () => {
    it('odometer log updates vehicle mileage', async () => {
      mockAuthAsUser({ id: user1.id, tenantId: tenant1.id, role: user1.role });

      const { vehicle } = await createTestVehicle(tenant1.id, {
        mileage: 50000,
      });

      const driver = await prisma.driver.create({
        data: {
          tenantId: tenant1.id,
          name: 'Test Driver',
          email: 'driver@test.com',
          licenseNumber: 'LIC-12345',
        },
      });

      const payload = {
        vehicleId: vehicle.id,
        driverId: driver.id,
        kilometers: 52000,
        measureType: 'KILOMETERS',
        recordedAt: new Date().toISOString(),
      };

      const request = new NextRequest(
        'http://localhost/api/vehicles/odometer',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      const response = await CREATE_ODOMETER(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.vehicleId).toBe(vehicle.id);
      expect(data.kilometers).toBe(52000);

      const updatedVehicle = await prisma.vehicle.findUnique({
        where: { id: vehicle.id },
      });
      expect(updatedVehicle?.mileage).toBe(52000);
    });

    it('validates new reading >= previous reading', async () => {
      mockAuthAsUser({ id: user1.id, tenantId: tenant1.id, role: user1.role });

      const { vehicle } = await createTestVehicle(tenant1.id, {
        mileage: 50000,
      });

      await prisma.odometerLog.create({
        data: {
          tenantId: tenant1.id,
          vehicleId: vehicle.id,
          kilometers: 50000,
          measureType: 'KILOMETERS',
          recordedAt: new Date(),
        },
      });

      const payload = {
        vehicleId: vehicle.id,
        kilometers: 45000,
        measureType: 'KILOMETERS',
        recordedAt: new Date().toISOString(),
      };

      const request = new NextRequest(
        'http://localhost/api/vehicles/odometer',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      const response = await CREATE_ODOMETER(request);
      const text = await response.text();

      expect(response.status).toBe(400);
      expect(text).toContain('cannot be less than previous reading');
    });

    it('validates vehicle belongs to tenant', async () => {
      const { vehicle } = await createTestVehicle(tenant1.id);

      mockAuthAsUser({ id: user2.id, tenantId: tenant2.id, role: user2.role });

      const payload = {
        vehicleId: vehicle.id,
        kilometers: 60000,
        measureType: 'KILOMETERS',
        recordedAt: new Date().toISOString(),
      };

      const request = new NextRequest(
        'http://localhost/api/vehicles/odometer',
        {
          method: 'POST',
          body: JSON.stringify(payload),
        }
      );

      const response = await CREATE_ODOMETER(request);
      const text = await response.text();

      expect(response.status).toBe(404);
      expect(text).toBe('Vehicle not found or not accessible');
    });
  });
});

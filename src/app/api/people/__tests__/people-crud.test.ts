import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as GET_PROVIDERS, POST as POST_PROVIDER } from '../providers/route';
import {
  createTestTenant,
  createTestUser,
  createTestProvider,
  mockAuthAsUser,
  mockAuthAsUnauthenticated,
  cleanupTenant,
} from '@test/helpers';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  isSuperAdmin: vi.fn().mockResolvedValue(false),
}));

describe('People CRUD API Integration Tests', () => {
  let tenant: Awaited<ReturnType<typeof createTestTenant>>;
  let user: Awaited<ReturnType<typeof createTestUser>>;

  beforeEach(async () => {
    tenant = await createTestTenant();
    user = await createTestUser(tenant.id, { role: 'MANAGER' });
    mockAuthAsUser({ id: user.id, tenantId: tenant.id, role: user.role });
  });

  afterEach(async () => {
    await cleanupTenant(tenant.id);
    vi.clearAllMocks();
  });

  describe('POST /api/people/providers', () => {
    it('creates provider with all fields (201)', async () => {
      const providerData = {
        name: 'Complete Provider',
        email: 'provider@example.com',
        phone: '+57 300 123 4567',
        address: 'Calle 123 #45-67, Bogotá',
        specialty: 'REPUESTOS',
      };

      const request = new NextRequest('http://localhost:3000/api/people/providers', {
        method: 'POST',
        body: JSON.stringify(providerData),
      });

      const response = await POST_PROVIDER(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data).toMatchObject({
        name: providerData.name,
        email: providerData.email,
        phone: providerData.phone,
        address: providerData.address,
        specialty: providerData.specialty,
        tenantId: tenant.id,
        status: 'ACTIVE',
      });
      expect(data.id).toBeDefined();
    });

    it('creates provider with only name (201)', async () => {
      const request = new NextRequest('http://localhost:3000/api/people/providers', {
        method: 'POST',
        body: JSON.stringify({ name: 'Minimal Provider' }),
      });

      const response = await POST_PROVIDER(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('Minimal Provider');
      expect(data.email).toBeNull();
      expect(data.phone).toBeNull();
    });

    it('rejects duplicate provider name in same tenant (409)', async () => {
      await createTestProvider(tenant.id, { name: 'Duplicate Provider' });

      const request = new NextRequest('http://localhost:3000/api/people/providers', {
        method: 'POST',
        body: JSON.stringify({ name: 'Duplicate Provider' }),
      });

      const response = await POST_PROVIDER(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toBe('Ya existe un proveedor con este nombre');
    });

    it('rejects empty name (400)', async () => {
      const request = new NextRequest('http://localhost:3000/api/people/providers', {
        method: 'POST',
        body: JSON.stringify({ name: '' }),
      });

      const response = await POST_PROVIDER(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('El nombre es requerido');
    });

    it('DRIVER cannot create providers (403)', async () => {
      const driverUser = await createTestUser(tenant.id, { role: 'DRIVER' });
      mockAuthAsUser({ id: driverUser.id, tenantId: tenant.id, role: driverUser.role });

      const request = new NextRequest('http://localhost:3000/api/people/providers', {
        method: 'POST',
        body: JSON.stringify({ name: 'Provider by Driver' }),
      });

      const response = await POST_PROVIDER(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('No tienes permisos para esta acción');
    });

    it('PURCHASER can create providers (201)', async () => {
      const purchaserUser = await createTestUser(tenant.id, { role: 'PURCHASER' });
      mockAuthAsUser({ id: purchaserUser.id, tenantId: tenant.id, role: purchaserUser.role });

      const request = new NextRequest('http://localhost:3000/api/people/providers', {
        method: 'POST',
        body: JSON.stringify({ name: 'Provider by Purchaser', email: 'p@test.com' }),
      });

      const response = await POST_PROVIDER(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('Provider by Purchaser');
    });

    it('TECHNICIAN cannot create providers (403)', async () => {
      const techUser = await createTestUser(tenant.id, { role: 'TECHNICIAN' });
      mockAuthAsUser({ id: techUser.id, tenantId: tenant.id, role: techUser.role });

      const request = new NextRequest('http://localhost:3000/api/people/providers', {
        method: 'POST',
        body: JSON.stringify({ name: 'Provider by Tech' }),
      });

      const response = await POST_PROVIDER(request);
      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/people/providers', () => {
    it('lists only ACTIVE providers for tenant', async () => {
      await createTestProvider(tenant.id, { name: 'Provider 1' });
      await createTestProvider(tenant.id, { name: 'Provider 2' });

      const response = await GET_PROVIDERS();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.length).toBe(2);
      for (const p of data) {
        expect(p.status).toBe('ACTIVE');
        expect(p.tenantId).toBe(tenant.id);
      }
    });

    it('returns providers sorted by name ascending', async () => {
      await createTestProvider(tenant.id, { name: 'Zeta Provider' });
      await createTestProvider(tenant.id, { name: 'Alpha Provider' });
      await createTestProvider(tenant.id, { name: 'Beta Provider' });

      const response = await GET_PROVIDERS();
      const data = await response.json();

      expect(data[0].name).toBe('Alpha Provider');
      expect(data[1].name).toBe('Beta Provider');
      expect(data[2].name).toBe('Zeta Provider');
    });

    it('does not return providers from other tenants', async () => {
      await createTestProvider(tenant.id, { name: 'My Provider' });

      const otherTenant = await createTestTenant();
      await createTestProvider(otherTenant.id, { name: 'Other Provider' });

      const response = await GET_PROVIDERS();
      const data = await response.json();

      expect(data.length).toBe(1);
      expect(data[0].name).toBe('My Provider');

      await cleanupTenant(otherTenant.id);
    });

    it('allows duplicate provider names across different tenants', async () => {
      await createTestProvider(tenant.id, { name: 'Common Provider' });

      const secondTenant = await createTestTenant();
      const secondUser = await createTestUser(secondTenant.id, { role: 'MANAGER' });
      mockAuthAsUser({ id: secondUser.id, tenantId: secondTenant.id, role: secondUser.role });

      const request = new NextRequest('http://localhost:3000/api/people/providers', {
        method: 'POST',
        body: JSON.stringify({ name: 'Common Provider' }),
      });

      const response = await POST_PROVIDER(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.name).toBe('Common Provider');
      expect(data.tenantId).toBe(secondTenant.id);

      await cleanupTenant(secondTenant.id);
    });

    it('returns 401 when not authenticated', async () => {
      mockAuthAsUnauthenticated();

      const response = await GET_PROVIDERS();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('No autenticado');
    });
  });
});

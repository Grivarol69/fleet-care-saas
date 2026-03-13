import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as GET_PROVIDERS, POST as POST_PROVIDER } from '../providers/route';
import { prisma } from '@/lib/prisma';
import {
  createTestTenant,
  createTestUser,
  createTestProvider,
  mockAuthAsUser,
  mockAuthAsUnauthenticated,
  cleanupTenant,
} from '@test/helpers';

vi.mock('next/server', async importOriginal => {
  const actual = await importOriginal<typeof import('next/server')>();
  return {
    ...actual,
    after: vi.fn(),
  };
});

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  requireCurrentUser: vi.fn(),
  isSuperAdmin: vi.fn().mockResolvedValue(false),
}));

vi.mock('@/lib/services/siigo', () => ({
  SiigoSyncService: {
    syncProvider: vi.fn().mockResolvedValue(undefined),
  },
}));

const runIntegration = process.env['RUN_INTEGRATION_TESTS'] === '1';

describe.skipIf(!runIntegration)('People API integration CRUD', () => {
  let tenant: Awaited<ReturnType<typeof createTestTenant>>;
  let user: Awaited<ReturnType<typeof createTestUser>>;
  const tenantIds: string[] = [];

  beforeEach(async () => {
    tenant = await createTestTenant();
    tenantIds.push(tenant.id);
    user = await createTestUser(tenant.id, { role: 'MANAGER' });
    authenticateAs(user);
  });

  afterEach(async () => {
    for (const tenantId of tenantIds) {
      await cleanupTenant(tenantId);
    }
    tenantIds.length = 0;
    vi.clearAllMocks();
  });

  function authenticateAs(currentUser: {
    id: string;
    tenantId: string;
    role: string;
  }) {
    mockAuthAsUser({
      id: currentUser.id,
      tenantId: currentUser.tenantId,
      role: currentUser.role,
    });
  }

  function createProviderRequest(body: unknown) {
    return new NextRequest('http://localhost:3000/api/people/providers', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  describe('POST /api/people/providers', () => {
    it('debe crear un proveedor con todos los campos soportados cuando el usuario tiene permisos', async () => {
      const providerData = {
        name: 'Complete Provider',
        email: 'provider@example.com',
        phone: '+57 300 123 4567',
        address: 'Calle 123 #45-67, Bogotá',
        specialty: 'REPUESTOS',
      };

      const request = createProviderRequest(providerData);

      const response = await POST_PROVIDER(request);
      const data = await response.json();
      const savedProvider = await prisma.provider.findUnique({
        where: { id: data.id },
      });

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
      expect(savedProvider).toMatchObject({
        id: data.id,
        tenantId: tenant.id,
        name: providerData.name,
        email: providerData.email,
        specialty: providerData.specialty,
        fiscalResponsibilities: [],
        vatResponsible: false,
      });
    });

    it('debe crear un proveedor minimo cuando solo se envia el nombre', async () => {
      const request = createProviderRequest({ name: 'Minimal Provider' });

      const response = await POST_PROVIDER(request);
      const data = await response.json();
      const savedProvider = await prisma.provider.findUnique({
        where: { id: data.id },
      });

      expect(response.status).toBe(201);
      expect(data.name).toBe('Minimal Provider');
      expect(data.email).toBeNull();
      expect(data.phone).toBeNull();
      expect(data.address).toBeNull();
      expect(savedProvider).toMatchObject({
        id: data.id,
        name: 'Minimal Provider',
        tenantId: tenant.id,
        status: 'ACTIVE',
        fiscalResponsibilities: [],
        vatResponsible: false,
      });
    });

    it('debe rechazar nombres duplicados dentro del mismo tenant', async () => {
      await createTestProvider(tenant.id, { name: 'Duplicate Provider' });

      const request = createProviderRequest({ name: 'Duplicate Provider' });

      const response = await POST_PROVIDER(request);
      const data = await response.json();
      const duplicateCount = await prisma.provider.count({
        where: { tenantId: tenant.id, name: 'Duplicate Provider' },
      });

      expect(response.status).toBe(409);
      expect(data.error).toBe('Ya existe un proveedor con este nombre');
      expect(duplicateCount).toBe(1);
    });

    it('debe rechazar un nombre vacio', async () => {
      const request = createProviderRequest({ name: '' });

      const response = await POST_PROVIDER(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('El nombre es requerido');
    });

    it('debe rechazar la creacion cuando el usuario es DRIVER', async () => {
      const driverUser = await createTestUser(tenant.id, { role: 'DRIVER' });
      authenticateAs(driverUser);

      const request = createProviderRequest({ name: 'Provider by Driver' });

      const response = await POST_PROVIDER(request);
      const data = await response.json();
      const provider = await prisma.provider.findFirst({
        where: { tenantId: tenant.id, name: 'Provider by Driver' },
      });

      expect(response.status).toBe(403);
      expect(data.error).toBe('No tienes permisos para esta acción');
      expect(provider).toBeNull();
    });

    it('debe permitir la creacion cuando el usuario es PURCHASER', async () => {
      const purchaserUser = await createTestUser(tenant.id, { role: 'PURCHASER' });
      authenticateAs(purchaserUser);

      const request = createProviderRequest({
        name: 'Provider by Purchaser',
        email: 'p@test.com',
      });

      const response = await POST_PROVIDER(request);
      const data = await response.json();
      const savedProvider = await prisma.provider.findUnique({
        where: { id: data.id },
      });

      expect(response.status).toBe(201);
      expect(data.name).toBe('Provider by Purchaser');
      expect(savedProvider?.tenantId).toBe(tenant.id);
    });

    it('debe rechazar la creacion cuando el usuario es TECHNICIAN', async () => {
      const techUser = await createTestUser(tenant.id, { role: 'TECHNICIAN' });
      authenticateAs(techUser);

      const request = createProviderRequest({ name: 'Provider by Tech' });

      const response = await POST_PROVIDER(request);
      const savedProvider = await prisma.provider.findFirst({
        where: { tenantId: tenant.id, name: 'Provider by Tech' },
      });

      expect(response.status).toBe(403);
      expect(savedProvider).toBeNull();
    });
  });

  describe('GET /api/people/providers', () => {
    it('debe listar solo proveedores activos del tenant autenticado', async () => {
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

    it('debe devolver proveedores ordenados por nombre ascendente', async () => {
      await createTestProvider(tenant.id, { name: 'Zeta Provider' });
      await createTestProvider(tenant.id, { name: 'Alpha Provider' });
      await createTestProvider(tenant.id, { name: 'Beta Provider' });

      const response = await GET_PROVIDERS();
      const data = await response.json();

      expect(data[0].name).toBe('Alpha Provider');
      expect(data[1].name).toBe('Beta Provider');
      expect(data[2].name).toBe('Zeta Provider');
    });

    it('debe excluir proveedores de otros tenants', async () => {
      await createTestProvider(tenant.id, { name: 'My Provider' });

      const otherTenant = await createTestTenant();
      tenantIds.push(otherTenant.id);
      await createTestProvider(otherTenant.id, { name: 'Other Provider' });

      const response = await GET_PROVIDERS();
      const data = await response.json();

      expect(data.length).toBe(1);
      expect(data[0].name).toBe('My Provider');
    });

    it('debe permitir el mismo nombre de proveedor en otro tenant', async () => {
      await createTestProvider(tenant.id, { name: 'Common Provider' });

      const secondTenant = await createTestTenant();
      tenantIds.push(secondTenant.id);
      const secondUser = await createTestUser(secondTenant.id, { role: 'MANAGER' });
      authenticateAs(secondUser);

      const request = createProviderRequest({ name: 'Common Provider' });

      const response = await POST_PROVIDER(request);
      const data = await response.json();
      const providerCount = await prisma.provider.count({
        where: { name: 'Common Provider' },
      });

      expect(response.status).toBe(201);
      expect(data.name).toBe('Common Provider');
      expect(data.tenantId).toBe(secondTenant.id);
      expect(providerCount).toBe(2);
    });

    it('debe responder 401 cuando la solicitud no esta autenticada', async () => {
      mockAuthAsUnauthenticated();

      const response = await GET_PROVIDERS();
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });
});

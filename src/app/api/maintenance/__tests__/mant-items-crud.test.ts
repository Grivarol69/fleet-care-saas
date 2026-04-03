import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as GET_ITEMS, POST as POST_ITEM } from '../mant-items/route';
import {
  GET as GET_REQUESTS,
  POST as POST_REQUEST,
} from '../mant-item-requests/route';
import { PATCH as PATCH_REQUEST } from '../mant-item-requests/[id]/route';
import { prisma } from '@/lib/prisma';
import {
  createTestTenant,
  createTestUser,
  mockAuthAsUser,
  cleanupTenant,
} from '@test/helpers';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  requireCurrentUser: vi.fn(),
  isSuperAdmin: vi.fn().mockResolvedValue(false),
}));

describe('Maintenance Items & Item Requests API Integration Tests', () => {
  let tenant: Awaited<ReturnType<typeof createTestTenant>>;
  let ownerUser: Awaited<ReturnType<typeof createTestUser>>;
  let managerUser: Awaited<ReturnType<typeof createTestUser>>;
  let technicianUser: Awaited<ReturnType<typeof createTestUser>>;
  let category: Awaited<ReturnType<typeof prisma.mantCategory.create>>;

  beforeEach(async () => {
    tenant = await createTestTenant();
    ownerUser = await createTestUser(tenant.id, { role: 'OWNER' });
    managerUser = await createTestUser(tenant.id, { role: 'MANAGER' });
    technicianUser = await createTestUser(tenant.id, { role: 'TECHNICIAN' });

    category = await prisma.mantCategory.create({
      data: {
        name: `Category-${Date.now()}`,
        tenantId: tenant.id,
        isGlobal: false,
      },
    });
  });

  afterEach(async () => {
    if (tenant?.id) {
      await cleanupTenant(tenant.id);
    }
    vi.clearAllMocks();
  });

  function authenticateAs(user: { id: string; role: string }) {
    mockAuthAsUser({ id: user.id, tenantId: tenant.id, role: user.role });
  }

  function createJsonRequest(
    url: string,
    method: 'POST' | 'PATCH',
    body: unknown
  ) {
    return new Request(url, {
      method,
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });
  }

  describe('POST /api/maintenance/mant-items', () => {
    it('debe crear un item del tenant cuando el usuario es OWNER', async () => {
      authenticateAs(ownerUser);

      const requestBody = {
        name: 'Oil Filter Replacement',
        description: 'Change engine oil filter',
        categoryId: category.id,
        type: 'PART',
      };

      const request = createJsonRequest(
        'http://localhost:3000/api/maintenance/mant-items',
        'POST',
        requestBody
      );

      const response = await POST_ITEM(request);
      const data = await response.json();
      const createdItem = await prisma.mantItem.findUnique({
        where: { id: data.id },
      });

      expect(response.status).toBe(200);
      expect(data.name).toBe('Oil Filter Replacement');
      expect(data.description).toBe('Change engine oil filter');
      expect(data.type).toBe('PART');
      expect(data.categoryId).toBe(category.id);
      expect(data.tenantId).toBe(tenant.id);
      expect(data.isGlobal).toBe(false);
      expect(createdItem).toMatchObject({
        id: data.id,
        name: 'Oil Filter Replacement',
        tenantId: tenant.id,
        categoryId: category.id,
        type: 'PART',
      });
    });

    it('debe rechazar la creacion directa cuando el usuario es TECHNICIAN', async () => {
      authenticateAs(technicianUser);

      const request = createJsonRequest(
        'http://localhost:3000/api/maintenance/mant-items',
        'POST',
        {
          name: 'Brake Pads',
          categoryId: category.id,
        }
      );

      const response = await POST_ITEM(request);
      const data = await response.json();
      const persistedItem = await prisma.mantItem.findFirst({
        where: {
          tenantId: tenant.id,
          name: 'Brake Pads',
        },
      });

      expect(response.status).toBe(403);
      expect(data.needsRequest).toBe(true);
      expect(data.error).toContain('No tiene permisos');
      expect(persistedItem).toBeNull();
    });

    it('debe rechazar nombres duplicados dentro del mismo tenant', async () => {
      authenticateAs(ownerUser);

      await prisma.mantItem.create({
        data: {
          name: 'Tire Rotation',
          type: 'SERVICE',
          categoryId: category.id,
          tenantId: tenant.id,
        },
      });

      const request = createJsonRequest(
        'http://localhost:3000/api/maintenance/mant-items',
        'POST',
        {
          name: 'Tire Rotation',
          categoryId: category.id,
        }
      );

      const response = await POST_ITEM(request);
      const data = await response.json();
      const duplicateCount = await prisma.mantItem.count({
        where: {
          tenantId: tenant.id,
          name: 'Tire Rotation',
        },
      });

      expect(response.status).toBe(409);
      expect(data.error).toContain('ya existe');
      expect(duplicateCount).toBe(1);
    });
  });

  describe('GET /api/maintenance/mant-items', () => {
    it('debe listar items globales y del tenant autenticado', async () => {
      authenticateAs(ownerUser);

      const tenantItem = await prisma.mantItem.create({
        data: {
          name: 'Custom Tenant Service',
          type: 'SERVICE',
          categoryId: category.id,
          tenantId: tenant.id,
          isGlobal: false,
        },
      });

      const globalCategory = await prisma.mantCategory.create({
        data: { name: 'Global Category', tenantId: null, isGlobal: true },
      });

      const globalItem = await prisma.mantItem.create({
        data: {
          name: 'Global Standard Service',
          type: 'SERVICE',
          categoryId: globalCategory.id,
          tenantId: null,
          isGlobal: true,
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/maintenance/mant-items'
      );
      const response = await GET_ITEMS(request);
      const items = await response.json();

      expect(response.status).toBe(200);
      const itemIds = items.map((item: { id: number }) => item.id);
      expect(itemIds).toContain(tenantItem.id);
      expect(itemIds).toContain(globalItem.id);
    });

    it('debe filtrar items por texto de busqueda', async () => {
      authenticateAs(ownerUser);

      await prisma.mantItem.create({
        data: {
          name: 'Oil Change',
          type: 'SERVICE',
          categoryId: category.id,
          tenantId: tenant.id,
        },
      });

      await prisma.mantItem.create({
        data: {
          name: 'Brake Inspection',
          type: 'SERVICE',
          categoryId: category.id,
          tenantId: tenant.id,
        },
      });

      const request = new NextRequest(
        'http://localhost:3000/api/maintenance/mant-items?search=oil'
      );
      const response = await GET_ITEMS(request);
      const items = await response.json();

      expect(response.status).toBe(200);
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe('Oil Change');
    });
  });

  describe('POST /api/maintenance/mant-item-requests', () => {
    it('debe crear una solicitud pendiente cuando el usuario es TECHNICIAN', async () => {
      authenticateAs(technicianUser);

      const request = createJsonRequest(
        'http://localhost:3000/api/maintenance/mant-item-requests',
        'POST',
        {
          suggestedName: 'Hydraulic Fluid Change',
          description: 'Replace hydraulic brake fluid',
          categoryId: category.id,
          type: 'SERVICE',
          justification: 'We need this service for our vehicle fleet',
        }
      );

      const response = await POST_REQUEST(request);
      const data = await response.json();
      const persistedRequest = await prisma.mantItemRequest.findUnique({
        where: { id: data.id },
      });

      expect(response.status).toBe(201);
      expect(data.suggestedName).toBe('Hydraulic Fluid Change');
      expect(data.requestedBy).toBe(technicianUser.id);
      expect(data.status).toBe('PENDING');
      expect(data.type).toBe('SERVICE');
      expect(persistedRequest).toMatchObject({
        id: data.id,
        tenantId: tenant.id,
        requestedBy: technicianUser.id,
        suggestedName: 'Hydraulic Fluid Change',
        status: 'PENDING',
      });
    });

    it('debe validar la longitud minima del nombre sugerido', async () => {
      authenticateAs(technicianUser);

      const request = createJsonRequest(
        'http://localhost:3000/api/maintenance/mant-item-requests',
        'POST',
        {
          suggestedName: 'A',
          categoryId: category.id,
        }
      );

      const response = await POST_REQUEST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('al menos 2 caracteres');
    });
  });

  describe('PATCH /api/maintenance/mant-item-requests/:id', () => {
    it('debe aprobar una solicitud pendiente y crear el item asociado', async () => {
      const itemRequest = await prisma.mantItemRequest.create({
        data: {
          tenantId: tenant.id,
          suggestedName: 'Transmission Fluid Change',
          description: 'Change automatic transmission fluid',
          categoryId: category.id,
          type: 'SERVICE',
          requestedBy: technicianUser.id,
          status: 'PENDING',
        },
      });

      authenticateAs(managerUser);

      const request = createJsonRequest(
        `http://localhost:3000/api/maintenance/mant-item-requests/${itemRequest.id}`,
        'PATCH',
        { action: 'APPROVED' }
      );

      const response = await PATCH_REQUEST(request, {
        params: Promise.resolve({ id: itemRequest.id.toString() }),
      });
      const data = await response.json();
      const persistedRequest = await prisma.mantItemRequest.findUnique({
        where: { id: itemRequest.id },
      });
      const createdItem = await prisma.mantItem.findUnique({
        where: { id: data.createdItem.id },
      });

      expect(response.status).toBe(200);
      expect(data.request.status).toBe('APPROVED');
      expect(data.request.resolvedBy).toBe(managerUser.id);
      expect(data.createdItem.name).toBe('Transmission Fluid Change');
      expect(data.createdItem.tenantId).toBe(tenant.id);
      expect(createdItem).toMatchObject({
        id: data.createdItem.id,
        name: 'Transmission Fluid Change',
        tenantId: tenant.id,
        categoryId: category.id,
      });
      expect(persistedRequest).toMatchObject({
        id: itemRequest.id,
        status: 'APPROVED',
        resolvedBy: managerUser.id,
        createdMantItemId: data.createdItem.id,
      });
    });

    it('debe rechazar una solicitud pendiente cuando recibe un motivo valido', async () => {
      const itemRequest = await prisma.mantItemRequest.create({
        data: {
          tenantId: tenant.id,
          suggestedName: 'Custom Wash Service',
          categoryId: category.id,
          type: 'SERVICE',
          requestedBy: technicianUser.id,
          status: 'PENDING',
        },
      });

      authenticateAs(managerUser);

      const request = createJsonRequest(
        `http://localhost:3000/api/maintenance/mant-item-requests/${itemRequest.id}`,
        'PATCH',
        {
          action: 'REJECTED',
          rejectionReason: 'We already have a standard wash service item',
        }
      );

      const response = await PATCH_REQUEST(request, {
        params: Promise.resolve({ id: itemRequest.id.toString() }),
      });
      const data = await response.json();
      const persistedRequest = await prisma.mantItemRequest.findUnique({
        where: { id: itemRequest.id },
      });
      const createdItems = await prisma.mantItem.findMany({
        where: {
          tenantId: tenant.id,
          name: 'Custom Wash Service',
        },
      });

      expect(response.status).toBe(200);
      expect(data.status).toBe('REJECTED');
      expect(data.resolvedBy).toBe(managerUser.id);
      expect(data.rejectionReason).toBe(
        'We already have a standard wash service item'
      );
      expect(persistedRequest?.resolvedAt).toBeTruthy();
      expect(createdItems).toHaveLength(0);
    });

    it('debe exigir un motivo suficientemente descriptivo al rechazar', async () => {
      const itemRequest = await prisma.mantItemRequest.create({
        data: {
          tenantId: tenant.id,
          suggestedName: 'Test Service',
          categoryId: category.id,
          requestedBy: technicianUser.id,
          status: 'PENDING',
        },
      });

      authenticateAs(managerUser);

      const request = createJsonRequest(
        `http://localhost:3000/api/maintenance/mant-item-requests/${itemRequest.id}`,
        'PATCH',
        { action: 'REJECTED', rejectionReason: 'No' }
      );

      const response = await PATCH_REQUEST(request, {
        params: Promise.resolve({ id: itemRequest.id.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('motivo de rechazo');
    });

    it('debe impedir resolver una solicitud ya resuelta', async () => {
      const itemRequest = await prisma.mantItemRequest.create({
        data: {
          tenantId: tenant.id,
          suggestedName: 'Coolant Flush',
          categoryId: category.id,
          requestedBy: technicianUser.id,
          status: 'PENDING',
        },
      });

      authenticateAs(managerUser);

      // First approval
      const firstRequest = createJsonRequest(
        `http://localhost:3000/api/maintenance/mant-item-requests/${itemRequest.id}`,
        'PATCH',
        { action: 'APPROVED' }
      );
      const firstResponse = await PATCH_REQUEST(firstRequest, {
        params: Promise.resolve({ id: itemRequest.id.toString() }),
      });
      expect(firstResponse.status).toBe(200);

      // Try again
      const secondRequest = createJsonRequest(
        `http://localhost:3000/api/maintenance/mant-item-requests/${itemRequest.id}`,
        'PATCH',
        { action: 'APPROVED' }
      );
      const secondResponse = await PATCH_REQUEST(secondRequest, {
        params: Promise.resolve({ id: itemRequest.id.toString() }),
      });
      const data = await secondResponse.json();

      expect(secondResponse.status).toBe(409);
      expect(data.error).toContain('ya fue');
    });

    it('debe impedir que un TECHNICIAN apruebe o rechace solicitudes', async () => {
      const itemRequest = await prisma.mantItemRequest.create({
        data: {
          tenantId: tenant.id,
          suggestedName: 'Test Service',
          categoryId: category.id,
          requestedBy: technicianUser.id,
          status: 'PENDING',
        },
      });

      authenticateAs(technicianUser);

      const request = createJsonRequest(
        `http://localhost:3000/api/maintenance/mant-item-requests/${itemRequest.id}`,
        'PATCH',
        { action: 'APPROVED' }
      );

      const response = await PATCH_REQUEST(request, {
        params: Promise.resolve({ id: itemRequest.id.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toContain('OWNER o MANAGER');
    });
  });

  describe('GET /api/maintenance/mant-item-requests', () => {
    it('debe listar todas las solicitudes del tenant para un MANAGER', async () => {
      await prisma.mantItemRequest.create({
        data: {
          tenantId: tenant.id,
          suggestedName: 'Request 1',
          categoryId: category.id,
          requestedBy: technicianUser.id,
          status: 'PENDING',
        },
      });

      const otherTech = await createTestUser(tenant.id, { role: 'TECHNICIAN' });
      await prisma.mantItemRequest.create({
        data: {
          tenantId: tenant.id,
          suggestedName: 'Request 2',
          categoryId: category.id,
          requestedBy: otherTech.id,
          status: 'PENDING',
        },
      });

      authenticateAs(managerUser);

      const request = new NextRequest(
        'http://localhost:3000/api/maintenance/mant-item-requests'
      );
      const response = await GET_REQUESTS(request);
      const requests = await response.json();

      expect(response.status).toBe(200);
      expect(requests.length).toBe(2);
    });

    it('debe restringir a un TECHNICIAN solo a sus propias solicitudes', async () => {
      await prisma.mantItemRequest.create({
        data: {
          tenantId: tenant.id,
          suggestedName: 'My Request',
          categoryId: category.id,
          requestedBy: technicianUser.id,
          status: 'PENDING',
        },
      });

      const otherTech = await createTestUser(tenant.id, { role: 'TECHNICIAN' });
      await prisma.mantItemRequest.create({
        data: {
          tenantId: tenant.id,
          suggestedName: 'Other Request',
          categoryId: category.id,
          requestedBy: otherTech.id,
          status: 'PENDING',
        },
      });

      authenticateAs(technicianUser);

      const request = new NextRequest(
        'http://localhost:3000/api/maintenance/mant-item-requests'
      );
      const response = await GET_REQUESTS(request);
      const requests = await response.json();

      expect(response.status).toBe(200);
      expect(requests.length).toBe(1);
      expect(requests[0].requestedBy).toBe(technicianUser.id);
    });

    it('debe filtrar solicitudes por estado', async () => {
      await prisma.mantItemRequest.create({
        data: {
          tenantId: tenant.id,
          suggestedName: 'Pending Request',
          categoryId: category.id,
          requestedBy: technicianUser.id,
          status: 'PENDING',
        },
      });

      await prisma.mantItemRequest.create({
        data: {
          tenantId: tenant.id,
          suggestedName: 'Approved Request',
          categoryId: category.id,
          requestedBy: technicianUser.id,
          status: 'APPROVED',
          resolvedBy: managerUser.id,
          resolvedAt: new Date(),
        },
      });

      authenticateAs(managerUser);

      const request = new NextRequest(
        'http://localhost:3000/api/maintenance/mant-item-requests?status=PENDING'
      );
      const response = await GET_REQUESTS(request);
      const requests = await response.json();

      expect(response.status).toBe(200);
      expect(requests.length).toBe(1);
      expect(requests[0].status).toBe('PENDING');
    });
  });
});

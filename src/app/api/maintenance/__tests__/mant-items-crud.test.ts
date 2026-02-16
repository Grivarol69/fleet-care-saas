import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as GET_ITEMS, POST as POST_ITEM } from '../mant-items/route';
import { GET as GET_REQUESTS, POST as POST_REQUEST } from '../mant-item-requests/route';
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
    await cleanupTenant(tenant.id);
    vi.clearAllMocks();
  });

  describe('POST /api/maintenance/mant-items', () => {
    it('creates mant item with valid data (OWNER)', async () => {
      mockAuthAsUser({ id: ownerUser.id, tenantId: tenant.id, role: 'OWNER' });

      const requestBody = {
        name: 'Oil Filter Replacement',
        description: 'Change engine oil filter',
        mantType: 'PREVENTIVE',
        categoryId: category.id,
        type: 'PART',
      };

      const request = new Request('http://localhost:3000/api/maintenance/mant-items', {
        method: 'POST',
        body: JSON.stringify(requestBody),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST_ITEM(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.name).toBe('Oil Filter Replacement');
      expect(data.mantType).toBe('PREVENTIVE');
      expect(data.type).toBe('PART');
      expect(data.categoryId).toBe(category.id);
      expect(data.tenantId).toBe(tenant.id);
    });

    it('TECHNICIAN cannot create item directly (403 with needsRequest)', async () => {
      mockAuthAsUser({ id: technicianUser.id, tenantId: tenant.id, role: 'TECHNICIAN' });

      const request = new Request('http://localhost:3000/api/maintenance/mant-items', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Brake Pads',
          mantType: 'CORRECTIVE',
          categoryId: category.id,
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST_ITEM(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.needsRequest).toBe(true);
      expect(data.error).toContain('No tiene permisos');
    });

    it('rejects duplicate item name per tenant (409)', async () => {
      mockAuthAsUser({ id: ownerUser.id, tenantId: tenant.id, role: 'OWNER' });

      await prisma.mantItem.create({
        data: {
          name: 'Tire Rotation',
          mantType: 'PREVENTIVE',
          type: 'ACTION',
          categoryId: category.id,
          tenantId: tenant.id,
        },
      });

      const request = new Request('http://localhost:3000/api/maintenance/mant-items', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Tire Rotation',
          mantType: 'PREVENTIVE',
          categoryId: category.id,
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST_ITEM(request);
      const data = await response.json();

      expect(response.status).toBe(409);
      expect(data.error).toContain('ya existe');
    });
  });

  describe('GET /api/maintenance/mant-items', () => {
    it('lists global + tenant items', async () => {
      mockAuthAsUser({ id: ownerUser.id, tenantId: tenant.id, role: 'OWNER' });

      const tenantItem = await prisma.mantItem.create({
        data: {
          name: 'Custom Tenant Service',
          mantType: 'CORRECTIVE',
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
          mantType: 'PREVENTIVE',
          type: 'ACTION',
          categoryId: globalCategory.id,
          tenantId: null,
          isGlobal: true,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/maintenance/mant-items');
      const response = await GET_ITEMS(request);
      const items = await response.json();

      expect(response.status).toBe(200);
      const itemIds = items.map((item: { id: number }) => item.id);
      expect(itemIds).toContain(tenantItem.id);
      expect(itemIds).toContain(globalItem.id);
    });

    it('filters items by search query', async () => {
      mockAuthAsUser({ id: ownerUser.id, tenantId: tenant.id, role: 'OWNER' });

      await prisma.mantItem.create({
        data: {
          name: 'Oil Change',
          mantType: 'PREVENTIVE',
          type: 'SERVICE',
          categoryId: category.id,
          tenantId: tenant.id,
        },
      });

      await prisma.mantItem.create({
        data: {
          name: 'Brake Inspection',
          mantType: 'PREVENTIVE',
          type: 'ACTION',
          categoryId: category.id,
          tenantId: tenant.id,
        },
      });

      const request = new NextRequest('http://localhost:3000/api/maintenance/mant-items?search=oil');
      const response = await GET_ITEMS(request);
      const items = await response.json();

      expect(response.status).toBe(200);
      expect(items.length).toBeGreaterThan(0);
      expect(items.some((item: { name: string }) => item.name.toLowerCase().includes('oil'))).toBe(true);
    });
  });

  describe('POST /api/maintenance/mant-item-requests', () => {
    it('TECHNICIAN creates MantItemRequest', async () => {
      mockAuthAsUser({ id: technicianUser.id, tenantId: tenant.id, role: 'TECHNICIAN' });

      const request = new Request('http://localhost:3000/api/maintenance/mant-item-requests', {
        method: 'POST',
        body: JSON.stringify({
          suggestedName: 'Hydraulic Fluid Change',
          description: 'Replace hydraulic brake fluid',
          mantType: 'PREVENTIVE',
          categoryId: category.id,
          type: 'SERVICE',
          justification: 'We need this service for our vehicle fleet',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST_REQUEST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.suggestedName).toBe('Hydraulic Fluid Change');
      expect(data.mantType).toBe('PREVENTIVE');
      expect(data.requestedBy).toBe(technicianUser.id);
      expect(data.status).toBe('PENDING');
    });

    it('validates suggestedName minimum length', async () => {
      mockAuthAsUser({ id: technicianUser.id, tenantId: tenant.id, role: 'TECHNICIAN' });

      const request = new Request('http://localhost:3000/api/maintenance/mant-item-requests', {
        method: 'POST',
        body: JSON.stringify({
          suggestedName: 'A',
          mantType: 'PREVENTIVE',
          categoryId: category.id,
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await POST_REQUEST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('al menos 2 caracteres');
    });
  });

  describe('PATCH /api/maintenance/mant-item-requests/:id', () => {
    it('MANAGER approves request and MantItem is created', async () => {
      const itemRequest = await prisma.mantItemRequest.create({
        data: {
          tenantId: tenant.id,
          suggestedName: 'Transmission Fluid Change',
          description: 'Change automatic transmission fluid',
          mantType: 'PREVENTIVE',
          categoryId: category.id,
          type: 'SERVICE',
          requestedBy: technicianUser.id,
          status: 'PENDING',
        },
      });

      mockAuthAsUser({ id: managerUser.id, tenantId: tenant.id, role: 'MANAGER' });

      const request = new Request(
        `http://localhost:3000/api/maintenance/mant-item-requests/${itemRequest.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ action: 'APPROVED' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await PATCH_REQUEST(request, {
        params: Promise.resolve({ id: itemRequest.id.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.request.status).toBe('APPROVED');
      expect(data.request.resolvedBy).toBe(managerUser.id);
      expect(data.createdItem).toBeDefined();
      expect(data.createdItem.name).toBe('Transmission Fluid Change');
      expect(data.createdItem.mantType).toBe('PREVENTIVE');
      expect(data.createdItem.tenantId).toBe(tenant.id);
    });

    it('MANAGER rejects request with reason', async () => {
      const itemRequest = await prisma.mantItemRequest.create({
        data: {
          tenantId: tenant.id,
          suggestedName: 'Custom Wash Service',
          mantType: 'CORRECTIVE',
          categoryId: category.id,
          type: 'SERVICE',
          requestedBy: technicianUser.id,
          status: 'PENDING',
        },
      });

      mockAuthAsUser({ id: managerUser.id, tenantId: tenant.id, role: 'MANAGER' });

      const request = new Request(
        `http://localhost:3000/api/maintenance/mant-item-requests/${itemRequest.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            action: 'REJECTED',
            rejectionReason: 'We already have a standard wash service item',
          }),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await PATCH_REQUEST(request, {
        params: Promise.resolve({ id: itemRequest.id.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('REJECTED');
      expect(data.resolvedBy).toBe(managerUser.id);
      expect(data.rejectionReason).toBe('We already have a standard wash service item');
    });

    it('requires rejectionReason when rejecting (min 3 chars)', async () => {
      const itemRequest = await prisma.mantItemRequest.create({
        data: {
          tenantId: tenant.id,
          suggestedName: 'Test Service',
          mantType: 'PREVENTIVE',
          categoryId: category.id,
          requestedBy: technicianUser.id,
          status: 'PENDING',
        },
      });

      mockAuthAsUser({ id: managerUser.id, tenantId: tenant.id, role: 'MANAGER' });

      const request = new Request(
        `http://localhost:3000/api/maintenance/mant-item-requests/${itemRequest.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ action: 'REJECTED', rejectionReason: 'No' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );

      const response = await PATCH_REQUEST(request, {
        params: Promise.resolve({ id: itemRequest.id.toString() }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('motivo de rechazo');
    });

    it('cannot resolve already-resolved request (409)', async () => {
      const itemRequest = await prisma.mantItemRequest.create({
        data: {
          tenantId: tenant.id,
          suggestedName: 'Coolant Flush',
          mantType: 'PREVENTIVE',
          categoryId: category.id,
          requestedBy: technicianUser.id,
          status: 'PENDING',
        },
      });

      mockAuthAsUser({ id: managerUser.id, tenantId: tenant.id, role: 'MANAGER' });

      // First approval
      const firstRequest = new Request(
        `http://localhost:3000/api/maintenance/mant-item-requests/${itemRequest.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ action: 'APPROVED' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const firstResponse = await PATCH_REQUEST(firstRequest, {
        params: Promise.resolve({ id: itemRequest.id.toString() }),
      });
      expect(firstResponse.status).toBe(200);

      // Try again
      const secondRequest = new Request(
        `http://localhost:3000/api/maintenance/mant-item-requests/${itemRequest.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ action: 'APPROVED' }),
          headers: { 'Content-Type': 'application/json' },
        }
      );
      const secondResponse = await PATCH_REQUEST(secondRequest, {
        params: Promise.resolve({ id: itemRequest.id.toString() }),
      });
      const data = await secondResponse.json();

      expect(secondResponse.status).toBe(409);
      expect(data.error).toContain('ya fue');
    });

    it('TECHNICIAN cannot approve/reject requests (403)', async () => {
      const itemRequest = await prisma.mantItemRequest.create({
        data: {
          tenantId: tenant.id,
          suggestedName: 'Test Service',
          mantType: 'PREVENTIVE',
          categoryId: category.id,
          requestedBy: technicianUser.id,
          status: 'PENDING',
        },
      });

      mockAuthAsUser({ id: technicianUser.id, tenantId: tenant.id, role: 'TECHNICIAN' });

      const request = new Request(
        `http://localhost:3000/api/maintenance/mant-item-requests/${itemRequest.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ action: 'APPROVED' }),
          headers: { 'Content-Type': 'application/json' },
        }
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
    it('MANAGER sees all tenant requests', async () => {
      await prisma.mantItemRequest.create({
        data: {
          tenantId: tenant.id,
          suggestedName: 'Request 1',
          mantType: 'PREVENTIVE',
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
          mantType: 'CORRECTIVE',
          categoryId: category.id,
          requestedBy: otherTech.id,
          status: 'PENDING',
        },
      });

      mockAuthAsUser({ id: managerUser.id, tenantId: tenant.id, role: 'MANAGER' });

      const request = new NextRequest('http://localhost:3000/api/maintenance/mant-item-requests');
      const response = await GET_REQUESTS(request);
      const requests = await response.json();

      expect(response.status).toBe(200);
      expect(requests.length).toBe(2);
    });

    it('TECHNICIAN sees only own requests', async () => {
      await prisma.mantItemRequest.create({
        data: {
          tenantId: tenant.id,
          suggestedName: 'My Request',
          mantType: 'PREVENTIVE',
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
          mantType: 'CORRECTIVE',
          categoryId: category.id,
          requestedBy: otherTech.id,
          status: 'PENDING',
        },
      });

      mockAuthAsUser({ id: technicianUser.id, tenantId: tenant.id, role: 'TECHNICIAN' });

      const request = new NextRequest('http://localhost:3000/api/maintenance/mant-item-requests');
      const response = await GET_REQUESTS(request);
      const requests = await response.json();

      expect(response.status).toBe(200);
      expect(requests.length).toBe(1);
      expect(requests[0].requestedBy).toBe(technicianUser.id);
    });

    it('filters requests by status', async () => {
      await prisma.mantItemRequest.create({
        data: {
          tenantId: tenant.id,
          suggestedName: 'Pending Request',
          mantType: 'PREVENTIVE',
          categoryId: category.id,
          requestedBy: technicianUser.id,
          status: 'PENDING',
        },
      });

      await prisma.mantItemRequest.create({
        data: {
          tenantId: tenant.id,
          suggestedName: 'Approved Request',
          mantType: 'CORRECTIVE',
          categoryId: category.id,
          requestedBy: technicianUser.id,
          status: 'APPROVED',
          resolvedBy: managerUser.id,
          resolvedAt: new Date(),
        },
      });

      mockAuthAsUser({ id: managerUser.id, tenantId: tenant.id, role: 'MANAGER' });

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

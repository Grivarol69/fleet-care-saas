import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '../route';
import { PATCH, DELETE } from '../[id]/route';
import { prisma } from '@/lib/prisma';
import {
  createTestTenant,
  createTestUser,
  createTestVehicle,
  createTestWorkOrder,
  createTestProvider,
  mockAuthAsUser,
  cleanupTenant,
} from '@test/helpers';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  isSuperAdmin: vi.fn().mockResolvedValue(false),
}));

// Mock Resend and react-pdf for the 'send' action
vi.mock('resend', () => ({
  Resend: vi.fn().mockImplementation(() => ({
    emails: {
      send: vi
        .fn()
        .mockResolvedValue({ data: { id: 'mock-email-id' }, error: null }),
    },
  })),
}));

vi.mock('@react-pdf/renderer', () => ({
  renderToBuffer: vi.fn().mockResolvedValue(Buffer.from('mock-pdf')),
}));

vi.mock('@/components/pdf/PurchaseOrderPDF', () => ({
  PurchaseOrderPDF: vi.fn(),
}));

vi.mock('@/emails/PurchaseOrderEmail', () => ({
  PurchaseOrderEmail: vi.fn(),
}));

describe('Purchase Order Lifecycle', () => {
  let tenant: Awaited<ReturnType<typeof createTestTenant>>;
  let ownerUser: Awaited<ReturnType<typeof createTestUser>>;
  let purchaserUser: Awaited<ReturnType<typeof createTestUser>>;
  let technicianUser: Awaited<ReturnType<typeof createTestUser>>;
  let workOrderId: string;
  let providerId: string;

  beforeEach(async () => {
    tenant = await createTestTenant();
    ownerUser = await createTestUser(tenant.id, { role: 'OWNER' });
    purchaserUser = await createTestUser(tenant.id, { role: 'PURCHASER' });
    technicianUser = await createTestUser(tenant.id, { role: 'TECHNICIAN' });

    const vd = await createTestVehicle(tenant.id);
    const wo = await createTestWorkOrder(
      tenant.id,
      vd.vehicle.id,
      ownerUser.id
    );
    workOrderId = wo.id;

    const provider = await createTestProvider(tenant.id, {
      email: 'provider@test.com',
    });
    providerId = provider.id;

    mockAuthAsUser({
      id: ownerUser.id,
      tenantId: tenant.id,
      role: ownerUser.role,
    });
  });

  afterEach(async () => {
    await cleanupTenant(tenant.id);
    vi.clearAllMocks();
  });

  // Helper: create PO
  async function createPO(
    items?: Array<{ description: string; quantity: number; unitPrice: number }>
  ) {
    const res = await POST(
      new NextRequest('http://localhost:3000/api/purchase-orders', {
        method: 'POST',
        body: JSON.stringify({
          workOrderId,
          type: 'SERVICES',
          providerId,
          items: items ?? [
            { description: 'Test Service', quantity: 1, unitPrice: 50000 },
          ],
        }),
      })
    );
    return { res, data: await res.json() };
  }

  // Helper: patch PO action
  async function patchPO(poId: string, action: string, notes?: string) {
    const req = new NextRequest(
      `http://localhost:3000/api/purchase-orders/${poId}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ action, ...(notes ? { notes } : {}) }),
      }
    );
    return PATCH(req, { params: Promise.resolve({ id: poId }) });
  }

  // Helper: delete PO
  async function deletePO(poId: string) {
    const req = new NextRequest(
      `http://localhost:3000/api/purchase-orders/${poId}`,
      {
        method: 'DELETE',
      }
    );
    return DELETE(req, { params: Promise.resolve({ id: poId }) });
  }

  it('creates PO linked to WO with correct sequential number', async () => {
    const { res, data } = await createPO();

    expect(res.status).toBe(201);
    expect(data.status).toBe('DRAFT');
    expect(data.workOrderId).toBe(workOrderId);
    expect(data.providerId).toBe(providerId);
    expect(data.orderNumber).toMatch(/^OC-\d{4}-000001$/);
    expect(data.items).toHaveLength(1);
  });

  it('second PO gets correct sequential number', async () => {
    const { data: po1 } = await createPO();
    expect(po1.orderNumber).toMatch(/^OC-\d{4}-000001$/);

    const { data: po2 } = await createPO();
    expect(po2.orderNumber).toMatch(/^OC-\d{4}-000002$/);
  });

  it('calculates subtotal and total correctly', async () => {
    const { res, data } = await createPO([
      { description: 'Item X', quantity: 2, unitPrice: 50000 },
      { description: 'Item Y', quantity: 1, unitPrice: 100000 },
      { description: 'Item Z', quantity: 3, unitPrice: 30000 },
    ]);

    expect(res.status).toBe(201);
    // (2*50000) + (1*100000) + (3*30000) = 290000
    expect(Number(data.subtotal)).toBe(290000);
    expect(Number(data.taxRate)).toBe(0);
    expect(Number(data.total)).toBe(290000);
    expect(data.items).toHaveLength(3);
  });

  it('workflow: DRAFT -> submit -> PENDING_APPROVAL', async () => {
    const { data: po } = await createPO();
    expect(po.status).toBe('DRAFT');

    const res = await patchPO(po.id, 'submit');
    const updated = await res.json();

    expect(res.status).toBe(200);
    expect(updated.status).toBe('PENDING_APPROVAL');
  });

  it('workflow: PENDING_APPROVAL -> approve -> APPROVED', async () => {
    const { data: po } = await createPO();
    await patchPO(po.id, 'submit');

    const res = await patchPO(po.id, 'approve');
    const updated = await res.json();

    expect(res.status).toBe(200);
    expect(updated.status).toBe('APPROVED');
    expect(updated.approvedBy).toBe(ownerUser.id);
    expect(updated.approvedAt).toBeDefined();
  });

  it('workflow: reject returns to DRAFT', async () => {
    const { data: po } = await createPO();
    await patchPO(po.id, 'submit');

    const res = await patchPO(po.id, 'reject', 'Needs revision');
    const updated = await res.json();

    expect(res.status).toBe(200);
    expect(updated.status).toBe('DRAFT');
  });

  it('workflow: APPROVED -> send -> SENT (mocked email)', async () => {
    const { data: po } = await createPO();
    await patchPO(po.id, 'submit');
    await patchPO(po.id, 'approve');

    const res = await patchPO(po.id, 'send');
    const updated = await res.json();

    expect(res.status).toBe(200);
    expect(updated.status).toBe('SENT');
    expect(updated.sentAt).toBeDefined();
  });

  it('cancel from multiple valid states', async () => {
    // Cancel from DRAFT
    const { data: po1 } = await createPO();
    const cancelDraft = await patchPO(po1.id, 'cancel');
    expect(cancelDraft.status).toBe(200);
    const d1 = await cancelDraft.json();
    expect(d1.status).toBe('CANCELLED');

    // Cancel from PENDING_APPROVAL
    const { data: po2 } = await createPO();
    await patchPO(po2.id, 'submit');
    const cancelPending = await patchPO(po2.id, 'cancel');
    expect(cancelPending.status).toBe(200);
    const d2 = await cancelPending.json();
    expect(d2.status).toBe('CANCELLED');

    // Cancel from APPROVED
    const { data: po3 } = await createPO();
    await patchPO(po3.id, 'submit');
    await patchPO(po3.id, 'approve');
    const cancelApproved = await patchPO(po3.id, 'cancel');
    expect(cancelApproved.status).toBe(200);
    const d3 = await cancelApproved.json();
    expect(d3.status).toBe('CANCELLED');
  });

  it('invalid transition: send from DRAFT -> 400', async () => {
    const { data: po } = await createPO();

    const res = await patchPO(po.id, 'send');
    expect(res.status).toBe(400);
    const error = await res.json();
    expect(error.error).toContain('No se puede send');
  });

  it('TECHNICIAN cannot create PO (403)', async () => {
    mockAuthAsUser({
      id: technicianUser.id,
      tenantId: tenant.id,
      role: technicianUser.role,
    });

    const { res } = await createPO();
    expect(res.status).toBe(403);
  });

  it('PURCHASER can submit but not approve', async () => {
    // Create PO as PURCHASER
    mockAuthAsUser({
      id: purchaserUser.id,
      tenantId: tenant.id,
      role: purchaserUser.role,
    });

    const { res: createRes, data: po } = await createPO();
    expect(createRes.status).toBe(201);

    // Submit should work
    const submitRes = await patchPO(po.id, 'submit');
    expect(submitRes.status).toBe(200);

    // Approve should fail (PURCHASER not in requiredRole for approve)
    const approveRes = await patchPO(po.id, 'approve');
    expect(approveRes.status).toBe(403);
  });

  it('DELETE only works on DRAFT', async () => {
    // Create and submit PO
    mockAuthAsUser({
      id: ownerUser.id,
      tenantId: tenant.id,
      role: ownerUser.role,
    }); // Ensure we are owner
    const { res: createRes, data: po1 } = await createPO();
    console.log('CREATE RES:', createRes.status, po1);
    await patchPO(po1?.id, 'submit');

    // Delete submitted PO should fail
    const delRes1 = await deletePO(po1.id);
    expect(delRes1.status).toBe(400);
    const err = await delRes1.json();
    expect(err.error).toContain('DRAFT');

    // Create DRAFT PO and delete
    const { data: po2 } = await createPO();
    const delRes2 = await deletePO(po2.id);
    expect(delRes2.status).toBe(200);

    // Verify deleted
    const deleted = await prisma.purchaseOrder.findUnique({
      where: { id: po2.id },
    });
    expect(deleted).toBeNull();
  });

  it('GET with status filter (single and comma-separated)', async () => {
    // Create 3 POs: DRAFT, PENDING_APPROVAL, APPROVED
    const { data: _po1 } = await createPO();
    const { data: po2 } = await createPO();
    const { data: po3 } = await createPO();

    await patchPO(po2.id, 'submit');
    await patchPO(po3.id, 'submit');
    await patchPO(po3.id, 'approve');

    // Filter: DRAFT only
    const getRes1 = await GET(
      new NextRequest('http://localhost:3000/api/purchase-orders?status=DRAFT')
    );
    const data1 = await getRes1.json();
    expect(data1).toHaveLength(1);
    expect(data1[0].status).toBe('DRAFT');

    // Filter: comma-separated
    const getRes2 = await GET(
      new NextRequest(
        'http://localhost:3000/api/purchase-orders?status=PENDING_APPROVAL,APPROVED'
      )
    );
    const data2 = await getRes2.json();
    expect(data2).toHaveLength(2);
    const statuses = data2.map((po: { status: string }) => po.status);
    expect(statuses).toContain('PENDING_APPROVAL');
    expect(statuses).toContain('APPROVED');
  });
});

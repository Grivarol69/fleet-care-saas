import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET } from '../route';
import { prisma } from '@/lib/prisma';
import {
  createTestTenant,
  createTestUser,
  createTestVehicle,
  createTestMantItem,
  createTestProvider,
  createTestWorkOrder,
  createTestMasterPart,
  mockAuthAsUser,
  cleanupTenant,
} from '@test/helpers';

vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn(),
  isSuperAdmin: vi.fn().mockResolvedValue(false),
}));

describe('Invoice Lifecycle', () => {
  let tenant: Awaited<ReturnType<typeof createTestTenant>>;
  let user: Awaited<ReturnType<typeof createTestUser>>;
  let provider: Awaited<ReturnType<typeof createTestProvider>>;
  let workOrderId: string;

  beforeEach(async () => {
    tenant = await createTestTenant();
    user = await createTestUser(tenant.id, { role: 'OWNER' });
    provider = await createTestProvider(tenant.id);

    const vd = await createTestVehicle(tenant.id);
    const wo = await createTestWorkOrder(tenant.id, vd.vehicle.id, user.id);
    workOrderId = wo.id;

    mockAuthAsUser({ id: user.id, tenantId: tenant.id, role: user.role });
  });

  afterEach(async () => {
    await cleanupTenant(tenant.id);
    vi.clearAllMocks();
  });

  function postInvoice(body: Record<string, unknown>) {
    return POST(
      new NextRequest('http://localhost:3000/api/invoices', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    );
  }

  function baseInvoiceBody(overrides: Record<string, unknown> = {}) {
    return {
      invoiceNumber: `INV-${Date.now()}`,
      invoiceDate: new Date().toISOString(),
      supplierId: provider.id,
      workOrderId,
      subtotal: 100000,
      taxAmount: 19000,
      totalAmount: 119000,
      items: [
        {
          description: 'Service A',
          quantity: 1,
          unitPrice: 100000,
          subtotal: 100000,
          taxRate: 19,
          taxAmount: 19000,
          total: 119000,
        },
      ],
      ...overrides,
    };
  }

  it('creates invoice linked to work order', async () => {
    const res = await postInvoice(baseInvoiceBody());
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.status).toBe('PENDING');
    expect(data.workOrderId).toBe(workOrderId);
    expect(data.supplierId).toBe(provider.id);
    expect(data.items).toHaveLength(1);
  });

  it('creates standalone invoice (no workOrderId)', async () => {
    const res = await postInvoice(baseInvoiceBody({ workOrderId: undefined }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.workOrderId).toBeNull();
    expect(data.items).toHaveLength(1);
  });

  it('rejects duplicate invoice number for same tenant', async () => {
    const invoiceNumber = `INV-DUP-${Date.now()}`;
    await postInvoice(baseInvoiceBody({ invoiceNumber }));

    const res = await postInvoice(baseInvoiceBody({ invoiceNumber }));
    expect(res.status).toBe(400);
    const error = await res.json();
    expect(error.error).toContain('Ya existe una factura');
  });

  it('rejects missing required fields (400)', async () => {
    const res = await postInvoice({
      invoiceDate: new Date().toISOString(),
      supplierId: provider.id,
      items: [
        {
          description: 'X',
          quantity: 1,
          unitPrice: 100,
          subtotal: 100,
          total: 100,
        },
      ],
    });
    expect(res.status).toBe(400);
  });

  it('rejects empty items array (400)', async () => {
    const res = await postInvoice(baseInvoiceBody({ items: [] }));
    expect(res.status).toBe(400);
    const error = await res.json();
    expect(error.error).toContain('al menos un item');
  });

  it('rejects invoice for provider not in tenant (404)', async () => {
    const otherTenant = await createTestTenant();
    const otherProvider = await createTestProvider(otherTenant.id);

    const res = await postInvoice(
      baseInvoiceBody({ supplierId: otherProvider.id })
    );
    expect(res.status).toBe(404);
    const error = await res.json();
    expect(error.error).toContain('Proveedor no encontrado');

    await cleanupTenant(otherTenant.id);
  });

  it('detects price deviation >20% and creates FinancialAlert', async () => {
    // Create WO item with expected price
    const mi = await createTestMantItem(tenant.id, { type: 'PART' });
    const woItem = await prisma.workOrderItem.create({
      data: {
        tenantId: tenant.id,
        workOrderId,
        mantItemId: mi.mantItem.id,
        description: 'Brake Pad',
        supplier: 'Test',
        unitPrice: 100000,
        quantity: 1,
        totalCost: 100000,
        purchasedBy: user.id,
        status: 'PENDING',
      },
    });

    // Invoice with 50% higher price
    const res = await postInvoice(
      baseInvoiceBody({
        subtotal: 150000,
        taxAmount: 0,
        totalAmount: 150000,
        items: [
          {
            description: 'Brake Pad',
            quantity: 1,
            unitPrice: 150000,
            subtotal: 150000,
            taxRate: 0,
            taxAmount: 0,
            total: 150000,
            workOrderItemId: woItem.id,
          },
        ],
      })
    );

    expect(res.status).toBe(201);

    // Check FinancialAlert was created (deviation > 20%)
    const alerts = await prisma.financialAlert.findMany({
      where: { tenantId: tenant.id, type: 'PRICE_DEVIATION' },
    });
    expect(alerts.length).toBeGreaterThanOrEqual(1);
    expect(alerts[0]?.message).toContain('difiere');
  });

  it('does NOT create price deviation alert within 20% tolerance', async () => {
    const mi = await createTestMantItem(tenant.id);
    const woItem = await prisma.workOrderItem.create({
      data: {
        tenantId: tenant.id,
        workOrderId,
        mantItemId: mi.mantItem.id,
        description: 'Oil Filter',
        supplier: 'Test',
        unitPrice: 100000,
        quantity: 1,
        totalCost: 100000,
        purchasedBy: user.id,
        status: 'PENDING',
      },
    });

    // Invoice with 15% higher price (within 20% tolerance)
    const res = await postInvoice(
      baseInvoiceBody({
        subtotal: 115000,
        taxAmount: 0,
        totalAmount: 115000,
        items: [
          {
            description: 'Oil Filter',
            quantity: 1,
            unitPrice: 115000,
            subtotal: 115000,
            taxRate: 0,
            taxAmount: 0,
            total: 115000,
            workOrderItemId: woItem.id,
          },
        ],
      })
    );

    expect(res.status).toBe(201);

    const alerts = await prisma.financialAlert.findMany({
      where: { tenantId: tenant.id, type: 'PRICE_DEVIATION' },
    });
    expect(alerts).toHaveLength(0);
  });

  it('updates masterPart referencePrice and creates price history', async () => {
    const masterPart = await createTestMasterPart(tenant.id, {
      referencePrice: 50000,
    });

    const res = await postInvoice(
      baseInvoiceBody({
        subtotal: 60000,
        taxAmount: 0,
        totalAmount: 60000,
        items: [
          {
            description: 'Test Part',
            quantity: 1,
            unitPrice: 60000,
            subtotal: 60000,
            taxRate: 0,
            taxAmount: 0,
            total: 60000,
            masterPartId: masterPart.id,
          },
        ],
      })
    );

    expect(res.status).toBe(201);

    // Check referencePrice updated
    const updatedPart = await prisma.masterPart.findUnique({
      where: { id: masterPart.id },
    });
    expect(Number(updatedPart?.referencePrice)).toBe(60000);

    // Check price history created
    const history = await prisma.partPriceHistory.findMany({
      where: { masterPartId: masterPart.id, tenantId: tenant.id },
    });
    expect(history).toHaveLength(1);
    expect(Number(history[0]?.price)).toBe(60000);
  });

  it('GET filters invoices by tenant', async () => {
    await postInvoice(baseInvoiceBody());

    const getRes = await GET(
      new NextRequest('http://localhost:3000/api/invoices')
    );
    const data = await getRes.json();

    expect(getRes.status).toBe(200);
    expect(data.length).toBeGreaterThanOrEqual(1);
    for (const inv of data) {
      expect(inv.tenantId).toBe(tenant.id);
    }
  });

  it('TECHNICIAN cannot create invoices (403)', async () => {
    const tech = await createTestUser(tenant.id, { role: 'TECHNICIAN' });
    mockAuthAsUser({ id: tech.id, tenantId: tenant.id, role: tech.role });

    const res = await postInvoice(baseInvoiceBody());
    expect(res.status).toBe(403);
  });
});

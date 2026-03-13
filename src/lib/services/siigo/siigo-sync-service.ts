import { prisma } from '@/lib/prisma';
import { createSiigoClient, SiigoClient } from './siigo-api-client';
import { decryptAccessKey } from './siigo-crypto';
import type {
  BatchSyncResult,
  TenantSiigoConfig,
  SiigoProviderInput,
  SiigoProductInput,
  SiigoPurchaseInvoiceInput,
  SiigoPaymentInput
} from './siigo-types';

export class SiigoSyncService {
  private static async getClient(tenantId: string): Promise<SiigoClient | null> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true },
    });

    if (!tenant?.settings) return null;

    const settings = tenant.settings as Record<string, unknown>;
    const siigoConfig = settings.siigo as unknown as TenantSiigoConfig | undefined;

    if (!siigoConfig || !siigoConfig.enabled) return null;

    try {
      const accessKey = decryptAccessKey(siigoConfig.accessKeyEncrypted);
      return createSiigoClient(tenantId, {
        username: siigoConfig.username,
        accessKey,
      });
    } catch {
      return null;
    }
  }

  static async syncProvider(providerId: string, tenantId: string): Promise<void> {
    const client = await this.getClient(tenantId);
    if (!client) return;

    try {
      const provider = await prisma.provider.findUnique({
        where: { id: providerId, tenantId },
      });

      if (!provider) return;

      if (!provider.nit) {
        console.log(`[SIIGO_SYNC] SKIPPED syncProvider: Provider ${providerId} has no NIT`);
        return;
      }

      const input: SiigoProviderInput = {
        id: provider.id,
        name: provider.name,
        nit: provider.nit,
        siigoIdType: provider.siigoIdType || 'NIT', // Fallback to NIT if not specified for some reason
        siigoPersonType: provider.siigoPersonType || 'COMPANY',
        stateCode: provider.stateCode || '11',
        cityCode: provider.cityCode || '11001',
        address: provider.address,
        phone: provider.phone,
        email: provider.email,
        fiscalResponsibilities: provider.fiscalResponsibilities?.length > 0 ? provider.fiscalResponsibilities : ['R-99-PN'],
        vatResponsible: provider.vatResponsible ?? false,
      };

      const siigoId = await client.ensureProvider(input);

      await prisma.provider.update({
        where: { id: providerId },
        data: {
          siigoId,
          siigoSyncedAt: new Date(),
        },
      });
    } catch (error) {
      console.error(`[SIIGO_SYNC] { operation: 'syncProvider', entityId: '${providerId}', tenantId: '${tenantId}', message: '${error instanceof Error ? error.message : String(error)}' }`);
    }
  }

  static async syncPart(partId: string, tenantId: string): Promise<void> {
    const client = await this.getClient(tenantId);
    if (!client) return;

    try {
      const part = await prisma.masterPart.findUnique({
        where: { id: partId },
      });

      if (!part) return;

      if (part.tenantId === null) {
        console.log(`[SIIGO_SYNC] SKIPPED syncPart: Part ${partId} is a global part`);
        return;
      }

      if (part.tenantId !== tenantId) {
        return;
      }

      if (part.accountGroup === null || part.siigoTaxClassification === null || part.siigoUnit === null) {
        console.log(`[SIIGO_SYNC] SKIPPED syncPart: Part ${partId} missing accounting data`);
        return;
      }

      if (part.siigoProductId) {
        return; // Already synced
      }

      const input: SiigoProductInput = {
        id: part.id,
        code: part.code,
        description: part.description,
        accountGroup: part.accountGroup,
        siigoTaxClassification: part.siigoTaxClassification,
        siigoUnit: part.siigoUnit,
      };

      const siigoProductId = await client.ensureProduct(input);

      await prisma.masterPart.update({
        where: { id: partId },
        data: {
          siigoProductId,
          siigoSyncedAt: new Date(),
        },
      });
    } catch (error) {
      console.error(`[SIIGO_SYNC] { operation: 'syncPart', entityId: '${partId}', tenantId: '${tenantId}', message: '${error instanceof Error ? error.message : String(error)}' }`);
    }
  }

  static async syncInvoiceApproved(invoiceId: string, tenantId: string): Promise<void> {
    const client = await this.getClient(tenantId);
    if (!client) return;

    try {
      await prisma.invoice.update({
        where: { id: invoiceId, tenantId },
        data: { siigoSyncStatus: 'SYNCING', siigoError: null },
      });

      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId, tenantId },
        include: { supplier: true, items: { include: { masterPart: true } } },
      });

      if (!invoice) return;

      if (!invoice.supplier.nit) {
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: { siigoSyncStatus: 'SKIPPED', siigoError: 'Proveedor sin NIT y datos contables incompletos.' },
        });
        return;
      }

      // Sync provider
      await this.syncProvider(invoice.supplierId, tenantId);

      const refreshedSupplier = await prisma.provider.findUnique({ where: { id: invoice.supplierId } });

      if (!refreshedSupplier?.siigoId) {
        await prisma.invoice.update({
          where: { id: invoiceId },
          data: { siigoSyncStatus: 'FAILED', siigoError: 'No se pudo sincronizar el tercero (Proveedor) a Siigo.' },
        });
        return;
      }

      // Sync Parts
      for (const item of invoice.items) {
        if (item.masterPartId) {
          await this.syncPart(item.masterPartId, tenantId);
        }
      }

      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
      const settings = tenant?.settings as Record<string, unknown>;
      const siigoConfig = settings?.siigo as unknown as TenantSiigoConfig | undefined;

      // We parse the ID from string to number per siigo specs, or the schema might give it as number.
      // Default type ids are expected to be numbers or numerical strings based on config panel.
      const documentTypeId = Number(siigoConfig?.defaultDocumentTypeId || 0);
      const costCenterId = siigoConfig?.defaultCostCenterId ? Number(siigoConfig.defaultCostCenterId) : undefined;
      const paymentTypeId = Number(siigoConfig?.defaultPaymentTypeId || 0);

      const dateStr = invoice.invoiceDate.toISOString().split('T')[0] ?? '';
      const dueDateStr = invoice.dueDate ? invoice.dueDate.toISOString().split('T')[0] ?? '' : dateStr;

      const input: SiigoPurchaseInvoiceInput = {
        documentTypeId,
        date: dateStr,
        supplierNit: invoice.supplier.nit,
        ...(costCenterId !== undefined ? { costCenterId: costCenterId } : {}),
        ...(invoice.notes ? { observations: invoice.notes.slice(0, 255) } : {}),
        items: invoice.items.map((item) => ({
          id: item.id,
          code: item.masterPart?.code ?? `MISC-${item.id.slice(-8)}`,
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          masterPartId: item.masterPartId,
        })),
        payment: {
          paymentTypeId: paymentTypeId,
          value: Number(invoice.totalAmount),
          dueDate: dueDateStr,
        }
      };

      const siigoId = await client.createPurchaseInvoice(input);

      await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
          siigoId,
          siigoSyncStatus: 'SYNCED',
          siigoSyncedAt: new Date(),
          siigoError: null,
        },
      });

    } catch (error) {
      console.error(`[SIIGO_SYNC] { operation: 'syncInvoiceApproved', entityId: '${invoiceId}', tenantId: '${tenantId}', message: '${error instanceof Error ? error.message : String(error)}' }`);
      await prisma.invoice.update({
        where: { id: invoiceId, tenantId },
        data: {
          siigoSyncStatus: 'FAILED',
          siigoError: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  static async syncInvoicePaid(invoiceId: string, tenantId: string): Promise<void> {
    const client = await this.getClient(tenantId);
    if (!client) return;

    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId, tenantId },
        include: { payments: { orderBy: { createdAt: 'desc' }, take: 1 } },
      });

      if (!invoice || !invoice.siigoId || invoice.payments.length === 0) return;

      const latestPayment = invoice.payments[0]!;

      const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } });
      const settings = tenant?.settings as Record<string, unknown>;
      const siigoConfig = settings?.siigo as unknown as TenantSiigoConfig | undefined;
      const paymentTypeId = Number(siigoConfig?.defaultPaymentTypeId || 0);

      const dateStr = latestPayment.paymentDate.toISOString().split('T')[0] ?? '';

      const input: SiigoPaymentInput = {
        paymentTypeId,
        value: Number(latestPayment.amount),
        dueDate: dateStr,
      };

      await client.addPayment(invoice.siigoId, input);
      console.log(`[SIIGO_SYNC] { operation: 'syncInvoicePaid', entityId: '${invoiceId}', tenantId: '${tenantId}', status: 'SUCCESS' }`);
    } catch (error) {
      console.error(`[SIIGO_SYNC] { operation: 'syncInvoicePaid', entityId: '${invoiceId}', tenantId: '${tenantId}', message: '${error instanceof Error ? error.message : String(error)}' }`);
    }
  }

  static async batchSync(
    tenantId: string,
    options: { entityTypes: string[]; statusFilter?: string[]; limit?: number }
  ): Promise<BatchSyncResult> {
    const results: BatchSyncResult = {
      invoices: { success: 0, failed: 0, skipped: 0 },
      providers: { success: 0, failed: 0, skipped: 0 },
      parts: { success: 0, failed: 0, skipped: 0 },
    };

    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const limit = options.limit || 50;

    const includeProviders = options.entityTypes.includes('providers');
    const includeParts = options.entityTypes.includes('parts');
    const includeInvoices = options.entityTypes.includes('invoices');

    if (includeProviders) {
      const providers = await prisma.provider.findMany({
        // Note: siigoId: null ensures we don't sync already-synced items
        where: { tenantId, siigoId: null, nit: { not: null } },
        take: limit,
      });

      for (const p of providers) {
        try {
          await this.syncProvider(p.id, tenantId);
          const updated = await prisma.provider.findUnique({ where: { id: p.id } });
          if (updated?.siigoId) results.providers.success++;
          else results.providers.skipped++;
        } catch {
          results.providers.failed++;
        }
        await delay(250);
      }
    }

    if (includeParts) {
      const parts = await prisma.masterPart.findMany({
        where: { tenantId, siigoProductId: null, accountGroup: { not: null } },
        take: limit,
      });

      for (const p of parts) {
        try {
          await this.syncPart(p.id, tenantId);
          const updated = await prisma.masterPart.findUnique({ where: { id: p.id } });
          if (updated?.siigoProductId) results.parts.success++;
          else results.parts.skipped++;
        } catch {
          results.parts.failed++;
        }
        await delay(250);
      }
    }

    if (includeInvoices) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const statuses = (options.statusFilter || ['PENDING', 'FAILED']) as any[];
      const invoices = await prisma.invoice.findMany({
        where: { tenantId, siigoSyncStatus: { in: statuses } },
        take: limit,
      });

      for (const i of invoices) {
        try {
          await this.syncInvoiceApproved(i.id, tenantId);
          const updated = await prisma.invoice.findUnique({ where: { id: i.id } });
          if (updated?.siigoSyncStatus === 'SYNCED') results.invoices.success++;
          else if (updated?.siigoSyncStatus === 'SKIPPED') results.invoices.skipped++;
          else results.invoices.failed++;
        } catch {
          results.invoices.failed++;
        }
        await delay(250);
      }
    }

    return results;
  }
}

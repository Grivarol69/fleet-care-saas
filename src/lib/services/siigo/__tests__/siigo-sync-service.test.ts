import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SiigoSyncService } from '../siigo-sync-service';
import { prisma } from '@/lib/prisma';
import { decryptAccessKey } from '../siigo-crypto';
import * as siigoApiClient from '../siigo-api-client';

vi.mock('@/lib/prisma', () => ({
    prisma: {
        tenant: { findUnique: vi.fn(), update: vi.fn() },
        provider: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
        masterPart: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
        invoice: { findUnique: vi.fn(), update: vi.fn(), findMany: vi.fn() },
        $transaction: vi.fn((cb) => cb({
            provider: { update: vi.fn() },
            masterPart: { update: vi.fn() },
            invoice: { update: vi.fn() }
        })),
    },
}));

vi.mock('../siigo-crypto', () => ({
    decryptAccessKey: vi.fn(),
    encryptAccessKey: vi.fn((key: string) => `enc-${key}`),
    validateSiigoEncryptionKey: vi.fn(),
}));

// Mock the client factory correctly using the namespace import
vi.spyOn(siigoApiClient, 'createSiigoClient');

describe('SiigoSyncService', () => {
    const mockClient = {
        authenticate: vi.fn(),
        getCostCenters: vi.fn(),
        getPaymentTypes: vi.fn(),
        getDocumentTypes: vi.fn(),
        getTaxes: vi.fn(),
        ensureProvider: vi.fn(),
        ensureProduct: vi.fn(),
        createPurchaseInvoice: vi.fn(),
        addPayment: vi.fn(),
    };

    const MOCK_TENANT = 'tenant-xyz';

    beforeEach(() => {
        vi.mocked(decryptAccessKey).mockReturnValue('decrypted-key');
        vi.mocked(siigoApiClient.createSiigoClient).mockReturnValue(mockClient as any);

        // Default tenant response with valid config
        vi.mocked(prisma.tenant.findUnique).mockResolvedValue({
            id: MOCK_TENANT,
            name: 'Test Tenant',
            settings: {
                siigo: {
                    enabled: true,
                    username: 'test@siigo.com',
                    accessKeyEncrypted: 'enc-secret',
                },
            },
            createdAt: new Date(),
            updatedAt: new Date(),
            status: 'ACTIVE',
            ownerId: 'owner-id'
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('getClient resolution', () => {
        it('returns null if tenant is missing settings', async () => {
            vi.mocked(prisma.tenant.findUnique).mockResolvedValueOnce({ settings: null } as any);
            // We leverage syncProvider to trigger internal getClient logic, since getClient is private
            await SiigoSyncService.syncProvider('prov-1', MOCK_TENANT);
            expect(prisma.provider.findUnique).not.toHaveBeenCalled();
        });

        it('returns null if siigo is disabled', async () => {
            vi.mocked(prisma.tenant.findUnique).mockResolvedValueOnce({
                settings: { siigo: { enabled: false } },
            } as any);
            await SiigoSyncService.syncProvider('prov-1', MOCK_TENANT);
            expect(siigoApiClient.createSiigoClient).not.toHaveBeenCalled();
        });
    });

    describe('syncProvider', () => {
        it('skips sync if provider has no NIT', async () => {
            vi.mocked(prisma.provider.findUnique).mockResolvedValueOnce({
                id: 'prov-1',
                name: 'No NIT Prov',
                nit: null,
            } as any);

            await SiigoSyncService.syncProvider('prov-1', MOCK_TENANT);

            expect(mockClient.ensureProvider).not.toHaveBeenCalled();
            expect(prisma.provider.update).not.toHaveBeenCalled();
        });

        it('calls client.ensureProvider and updates DB on success', async () => {
            vi.mocked(prisma.provider.findUnique).mockResolvedValueOnce({
                id: 'prov-2',
                name: 'Full Prov',
                nit: '123456',
                tenantId: MOCK_TENANT,
                siigoIdType: 'NIT',
                siigoPersonType: 'COMPANY',
                stateCode: '11',
                cityCode: '11001',
                address: 'CR 12',
                phone: '310',
                email: 'test@prov.com',
                fiscalResponsibilities: [],
            } as any);

            mockClient.ensureProvider.mockResolvedValueOnce('siigo-p2');

            await SiigoSyncService.syncProvider('prov-2', MOCK_TENANT);

            expect(mockClient.ensureProvider).toHaveBeenCalled();
            const callArg = mockClient.ensureProvider.mock.calls[0][0];
            expect(callArg.nit).toBe('123456');

            expect(prisma.provider.update).toHaveBeenCalledWith({
                where: { id: 'prov-2' },
                data: { siigoId: 'siigo-p2', siigoSyncedAt: expect.any(Date) },
            });
        });
    });

    describe('syncPart', () => {
        it('skips global parts', async () => {
            vi.mocked(prisma.masterPart.findUnique).mockResolvedValueOnce({
                id: 'global-1',
                tenantId: null,      // global
            } as any);

            await SiigoSyncService.syncPart('global-1', MOCK_TENANT);
            expect(mockClient.ensureProduct).not.toHaveBeenCalled();
        });

        it('skips if it lacks accounting data', async () => {
            vi.mocked(prisma.masterPart.findUnique).mockResolvedValueOnce({
                id: 'part-2',
                tenantId: MOCK_TENANT,
                accountGroup: null,
            } as any);

            await SiigoSyncService.syncPart('part-2', MOCK_TENANT);
            expect(mockClient.ensureProduct).not.toHaveBeenCalled();
        });

        it('skips if already synced (has siigoProductId)', async () => {
            vi.mocked(prisma.masterPart.findUnique).mockResolvedValueOnce({
                id: 'part-3',
                tenantId: MOCK_TENANT,
                accountGroup: 10,
                siigoTaxClassification: 'TAXED',
                siigoUnit: 94,
                siigoProductId: 'siigo-already-set',
            } as any);

            await SiigoSyncService.syncPart('part-3', MOCK_TENANT);
            expect(mockClient.ensureProduct).not.toHaveBeenCalled();
        });

        it('syncs correctly if part meets all criteria', async () => {
            vi.mocked(prisma.masterPart.findUnique).mockResolvedValueOnce({
                id: 'part-4',
                code: 'P-TEST',
                description: 'Test P',
                tenantId: MOCK_TENANT,
                accountGroup: 12,
                siigoTaxClassification: 'EXEMPT',
                siigoUnit: 94,
                siigoProductId: null,
            } as any);

            mockClient.ensureProduct.mockResolvedValueOnce('siigo-mapped-1');

            await SiigoSyncService.syncPart('part-4', MOCK_TENANT);

            expect(mockClient.ensureProduct).toHaveBeenCalledWith({
                id: 'part-4',
                code: 'P-TEST',
                description: 'Test P',
                accountGroup: 12,
                siigoTaxClassification: 'EXEMPT',
                siigoUnit: 94,
            });

            expect(prisma.masterPart.update).toHaveBeenCalledWith({
                where: { id: 'part-4' },
                data: { siigoProductId: 'siigo-mapped-1', siigoSyncedAt: expect.any(Date) },
            });
        });
    });

    describe('syncInvoiceApproved', () => {
        it('fails if provider has no NIT', async () => {
            vi.mocked(prisma.invoice.findUnique).mockResolvedValueOnce({
                id: 'inv-1',
                tenantId: MOCK_TENANT,
                supplierId: 'prov-1',
                supplier: {
                    nit: null
                },
                items: []
            } as any);

            await SiigoSyncService.syncInvoiceApproved('inv-1', MOCK_TENANT);

            // First call is status to SYNCING, second is SKIPPED
            expect(prisma.invoice.update).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({ siigoSyncStatus: 'SKIPPED' })
            }));
        });

        it('syncs dependencies (provider and parts) and creates invoice in Siigo', async () => {
            vi.mocked(prisma.invoice.findUnique).mockResolvedValueOnce({
                id: 'inv-2',
                tenantId: MOCK_TENANT,
                supplierId: 'prov-with-nit',
                invoiceDate: new Date('2023-11-01'),
                totalAmount: 1250,
                notes: 'Test INV',
                supplier: { nit: '900' },
                items: [
                    { id: 'i-1', description: 'Item A', quantity: 2, unitPrice: 500, masterPartId: 'part-sync' }
                ]
            } as any);

            // refreshed provider mock
            vi.mocked(prisma.provider.findUnique).mockResolvedValueOnce({
                id: 'prov-with-nit',
                siigoId: 'siigo-p1', // After the provider sync finishes
            } as any);

            mockClient.createPurchaseInvoice.mockResolvedValueOnce('siigo-inv-234');

            // Temporarily mock internal sync functions to verify order
            const providerSyncSpy = vi.spyOn(SiigoSyncService, 'syncProvider').mockResolvedValue(undefined as any);
            const partSyncSpy = vi.spyOn(SiigoSyncService, 'syncPart').mockResolvedValue(undefined as any);

            await SiigoSyncService.syncInvoiceApproved('inv-2', MOCK_TENANT);

            expect(providerSyncSpy).toHaveBeenCalledWith('prov-with-nit', MOCK_TENANT);
            expect(partSyncSpy).toHaveBeenCalledWith('part-sync', MOCK_TENANT);

            expect(mockClient.createPurchaseInvoice).toHaveBeenCalled();

            const calls = prisma.invoice.update.mock.calls;
            const finalUpdate = calls[calls.length - 1][0];
            expect(finalUpdate.where.id).toBe('inv-2');
            expect(finalUpdate.data.siigoId).toBe('siigo-inv-234');
            expect(finalUpdate.data.siigoSyncStatus).toBe('SYNCED');

            // restore specific spies
            providerSyncSpy.mockRestore();
            partSyncSpy.mockRestore();
        });
    });
});

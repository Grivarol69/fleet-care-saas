import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import { SiigoSyncService } from '@/lib/services/siigo';

export const maxDuration = 60; // Override default 10s timeout from Vercel Serverless

const syncPayloadSchema = z.object({
    entityTypes: z.array(z.enum(['providers', 'parts', 'invoices'])),
    statusFilter: z.array(z.string()).optional(),
    limit: z.number().int().min(1).max(500).optional(),
});

export async function POST(req: Request) {
    try {
        const { user, tenantPrisma } = await requireCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        if (user.role !== UserRole.OWNER) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const json = await req.json();
        const body = syncPayloadSchema.parse(json);

        const counts = await SiigoSyncService.batchSync(user.tenantId, {
            entityTypes: body.entityTypes,
            statusFilter: body.statusFilter,
            limit: body.limit,
        });

        return NextResponse.json(
            { message: 'Sync process completed successfully.', counts },
            { status: 202 } // 202 Accepted because some syncs might fail internally
        );
    } catch (error) {
        console.error('[SIIGO_SYNC_POST]', error);
        if (error instanceof z.ZodError) {
            return NextResponse.json(error.issues, { status: 422 });
        }
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}

export async function GET() {
    try {
        const { user, tenantPrisma } = await requireCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        if (user.role !== UserRole.OWNER && user.role !== UserRole.MANAGER) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Invoices summary
        const totalInvoices = await tenantPrisma.invoice.count({ where: { tenantId: user.tenantId } });
        const syncedInvoices = await tenantPrisma.invoice.count({ where: { tenantId: user.tenantId, siigoSyncStatus: 'SYNCED' } });
        const pendingInvoices = await tenantPrisma.invoice.count({ where: { tenantId: user.tenantId, siigoSyncStatus: 'PENDING' } });
        const failedInvoices = await tenantPrisma.invoice.count({ where: { tenantId: user.tenantId, siigoSyncStatus: 'FAILED' } });
        const skippedInvoices = await tenantPrisma.invoice.count({ where: { tenantId: user.tenantId, siigoSyncStatus: 'SKIPPED' } });

        // Providers summary 
        // For sync counting: providers with NIT are candidates for sync. 
        const totalProvidersWithNit = await tenantPrisma.provider.count({ where: { tenantId: user.tenantId, nit: { not: null } } });
        const syncedProviders = await tenantPrisma.provider.count({ where: { tenantId: user.tenantId, siigoId: { not: null } } });

        // MasterParts summary
        const totalPartsForAccounting = await tenantPrisma.masterPart.count({ where: { tenantId: user.tenantId, accountGroup: { not: null } } });
        const syncedParts = await tenantPrisma.masterPart.count({ where: { tenantId: user.tenantId, siigoProductId: { not: null } } });

        return NextResponse.json({
            invoices: {
                total: totalInvoices,
                synced: syncedInvoices,
                pending: pendingInvoices,
                failed: failedInvoices,
                skipped: skippedInvoices,
            },
            providers: {
                totalSyncable: totalProvidersWithNit,
                synced: syncedProviders,
                pending: totalProvidersWithNit - syncedProviders,
            },
            parts: {
                totalSyncable: totalPartsForAccounting,
                synced: syncedParts,
                pending: totalPartsForAccounting - syncedParts,
            }
        });
    } catch (error) {
        console.error('[SIIGO_SYNC_GET]', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}

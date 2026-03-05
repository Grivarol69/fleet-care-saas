import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { createSiigoClient, decryptAccessKey, isSiigoError } from '@/lib/services/siigo';
import type { TenantSiigoConfig } from '@/lib/services/siigo';

export const maxDuration = 60;

export async function GET() {
    try {
        const { user, tenantPrisma } = await requireCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        if (user.role !== UserRole.OWNER && user.role !== UserRole.MANAGER) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const tenant = await tenantPrisma.tenant.findUnique({
            where: { id: user.tenantId },
            select: { settings: true },
        });

        const settings = (tenant?.settings as Record<string, unknown>) || {};
        const siigoConfig = settings.siigo as unknown as TenantSiigoConfig | undefined;

        if (!siigoConfig || !siigoConfig.accessKeyEncrypted) {
            return NextResponse.json({ success: false, error: 'Credenciales de Siigo no configuradas' });
        }

        const accessKey = decryptAccessKey(siigoConfig.accessKeyEncrypted);

        const client = createSiigoClient(user.tenantId, {
            username: siigoConfig.username,
            accessKey,
        });

        // 15 seconds manual timeout mapped via AbortController for all fetches 
        // to speed up failed attempts
        const timeout = new Promise<never>((_, r) => setTimeout(() => r(new Error('Timeout de 15 segundos excedido al buscar datos maestros de Siigo')), 15000));

        const bootstrapData = await Promise.race([
            Promise.all([
                client.getCostCenters(),
                client.getPaymentTypes(),
                client.getDocumentTypes(),
                client.getTaxes(),
            ]),
            timeout,
        ]);

        const [costCenters, paymentTypes, documentTypes, taxes] = bootstrapData;

        return NextResponse.json({ costCenters, paymentTypes, documentTypes, taxes });
    } catch (error) {
        console.error('[SIIGO_BOOTSTRAP_ERROR]', error);
        if (isSiigoError(error)) {
            return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        }
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Error al obtener datos maestros desde Siigo.' }, { status: 500 });
    }
}

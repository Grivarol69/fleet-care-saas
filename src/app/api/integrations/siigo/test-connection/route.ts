import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { createSiigoClient, decryptAccessKey, isSiigoError } from '@/lib/services/siigo';
import type { TenantSiigoConfig } from '@/lib/services/siigo';

export async function POST() {
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

        let accessKey = '';
        try {
            accessKey = decryptAccessKey(siigoConfig.accessKeyEncrypted);
        } catch {
            return NextResponse.json({ success: false, error: 'Las credenciales guardadas son inválidas o la llave de encriptación cambió.' });
        }

        const client = createSiigoClient(user.tenantId, {
            username: siigoConfig.username,
            accessKey,
        });

        // Validar autenticación real
        await client.authenticate();

        const lastTestAt = new Date().toISOString();

        // Update lastTestAt
        const newSiigoConfig = {
            ...siigoConfig,
            lastTestAt,
        };

        await tenantPrisma.tenant.update({
            where: { id: user.tenantId },
            data: {
                settings: {
                    ...settings,
                    siigo: newSiigoConfig,
                },
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[SIIGO_TEST_CONNECTION]', error);
        if (isSiigoError(error)) {
            return NextResponse.json({ success: false, error: error.message });
        }
        return NextResponse.json({ success: false, error: 'Error desconocido al probar la conexión con Siigo.' });
    }
}

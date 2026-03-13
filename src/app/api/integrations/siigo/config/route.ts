import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { z } from 'zod';
import {
  decryptAccessKey,
  encryptAccessKey,
  validateSiigoEncryptionKey,
} from '@/lib/services/siigo';
import type { TenantSiigoConfig } from '@/lib/services/siigo';

const configSchema = z.object({
  username: z.string().email(),
  accessKey: z.string().min(1),
  enabled: z.boolean(),
  defaultCostCenterId: z.number().optional(),
  defaultPaymentTypeId: z.number().optional(),
  defaultDocumentTypeId: z.number().optional(),
});

export async function GET(_req: Request) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== UserRole.OWNER && user.role !== UserRole.MANAGER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const tenant = await tenantPrisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settings: true },
    });

    const settings = (tenant?.settings as Record<string, unknown>) || {};
    const siigoConfig = settings.siigo as unknown as
      | TenantSiigoConfig
      | undefined;

    if (!siigoConfig) {
      return NextResponse.json({ configured: false, enabled: false });
    }

    let accessKeyMasked = '';
    try {
      const accessKey = decryptAccessKey(siigoConfig.accessKeyEncrypted);
      accessKeyMasked = '...' + accessKey.slice(-4);
    } catch {
      accessKeyMasked = '...[error]';
    }

    return NextResponse.json({
      configured: true,
      enabled: siigoConfig.enabled,
      username: siigoConfig.username,
      accessKeyMasked,
      defaultCostCenterId: siigoConfig.defaultCostCenterId,
      defaultPaymentTypeId: siigoConfig.defaultPaymentTypeId,
      defaultDocumentTypeId: siigoConfig.defaultDocumentTypeId,
      lastTestAt: siigoConfig.lastTestAt,
    });
  } catch (error) {
    console.error('[SIIGO_CONFIG_GET]', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Only OWNER can modify credentials
    if (user.role !== UserRole.OWNER) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    validateSiigoEncryptionKey();

    const json = await req.json();
    const body = configSchema.parse(json);

    // Merge existing config if present
    const tenant = await tenantPrisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { settings: true },
    });
    const settings = (tenant?.settings as Record<string, unknown>) || {};
    const existingSiigo = (settings.siigo as Record<string, unknown>) || {};

    // Do not encrypt placeholder mask if user didn't change it
    let accessKeyEncrypted = existingSiigo.accessKeyEncrypted as string;
    if (!body.accessKey.startsWith('...')) {
      accessKeyEncrypted = encryptAccessKey(body.accessKey);
    }

    const newSiigoConfig = {
      ...existingSiigo,
      username: body.username,
      accessKeyEncrypted,
      enabled: body.enabled,
      defaultCostCenterId:
        body.defaultCostCenterId ?? existingSiigo.defaultCostCenterId ?? 0,
      defaultPaymentTypeId:
        body.defaultPaymentTypeId ?? existingSiigo.defaultPaymentTypeId ?? 0,
      defaultDocumentTypeId:
        body.defaultDocumentTypeId ?? existingSiigo.defaultDocumentTypeId ?? 0,
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
    if (error instanceof z.ZodError) {
      return NextResponse.json(error.issues, { status: 422 });
    }
    console.error('[SIIGO_CONFIG_POST]', error);
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
  }
}

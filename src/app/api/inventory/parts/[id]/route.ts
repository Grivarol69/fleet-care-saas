import { requireCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { canManagePurchases, isSuperAdmin } from '@/lib/permissions';

export const maxDuration = 60;

const updateMasterPartSchema = z.object({
  code: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  subcategory: z.string().optional().nullable(),
  unit: z.string().min(1).optional(),
  referencePrice: z.number().min(0).optional().nullable(),
  isActive: z.boolean().optional(),
  accountGroup: z.number().int().optional().nullable(),
  siigoTaxClassification: z.enum(['TAXED', 'EXEMPT', 'EXCLUDED']).optional().nullable(),
  siigoUnit: z.number().int().optional().nullable(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const part = await tenantPrisma.masterPart.findFirst({
      where: {
        id,
        OR: [{ tenantId: null }, {}],
      },
      include: {
        inventoryItems: {
          where: {},
        },
      },
    });

    if (!part) {
      return NextResponse.json(
        { error: 'Autoparte no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(part);
  } catch (error) {
    console.error('[MASTER_PART_GET_BY_ID]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canManagePurchases(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await tenantPrisma.masterPart.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: 'Autoparte no encontrada' },
        { status: 404 }
      );
    }

    // Global parts can only be edited by SUPER_ADMIN
    if (existing.tenantId === null && !isSuperAdmin(user)) {
      return NextResponse.json(
        { error: 'Solo un Super Admin puede editar partes globales' },
        { status: 403 }
      );
    }

    // Tenant parts must belong to the user's tenant
    if (existing.tenantId !== null && existing.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta autoparte' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const validation = updateMasterPartSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check for code collision if code is being changed
    if (data.code && data.code !== existing.code) {
      const codeConflict = await tenantPrisma.masterPart.findFirst({
        where: {
          code: data.code,
          id: { not: id },
          OR: [{ tenantId: null }, {}],
        },
      });

      if (codeConflict) {
        return NextResponse.json(
          { error: `El código ${data.code} ya existe` },
          { status: 409 }
        );
      }
    }

    const updated = await tenantPrisma.masterPart.update({
      where: { id },
      data: {
        ...(data.code !== undefined && { code: data.code }),
        ...(data.description !== undefined && {
          description: data.description,
        }),
        ...(data.category !== undefined && { category: data.category }),
        ...(data.subcategory !== undefined && {
          subcategory: data.subcategory,
        }),
        ...(data.unit !== undefined && { unit: data.unit }),
        ...(data.referencePrice !== undefined && {
          referencePrice: data.referencePrice,
          lastPriceUpdate: new Date(),
        }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
        ...(data.accountGroup !== undefined && { accountGroup: data.accountGroup }),
        ...(data.siigoTaxClassification !== undefined && { siigoTaxClassification: data.siigoTaxClassification }),
        ...(data.siigoUnit !== undefined && { siigoUnit: data.siigoUnit }),
      },
    });

    const { after } = await import('next/server');
    after(async () => {
      const { SiigoSyncService } = await import('@/lib/services/siigo');
      await SiigoSyncService.syncPart(id, user.tenantId);
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[MASTER_PART_PATCH]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canManagePurchases(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const existing = await tenantPrisma.masterPart.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json(
        { error: 'Autoparte no encontrada' },
        { status: 404 }
      );
    }

    if (existing.tenantId === null && !isSuperAdmin(user)) {
      return NextResponse.json(
        { error: 'Solo un Super Admin puede desactivar partes globales' },
        { status: 403 }
      );
    }

    if (existing.tenantId !== null && existing.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta autoparte' },
        { status: 403 }
      );
    }

    // Soft delete: set isActive = false
    const deactivated = await tenantPrisma.masterPart.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json(deactivated);
  } catch (error) {
    console.error('[MASTER_PART_DELETE]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

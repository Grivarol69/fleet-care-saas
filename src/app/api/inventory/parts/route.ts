import { Prisma } from '@prisma/client';
import { requireCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { canManagePurchases } from '@/lib/permissions';

export const maxDuration = 60;

const createMasterPartSchema = z.object({
  code: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  subcategory: z.string().optional(),
  unit: z.string().default('UNIDAD'),
  referencePrice: z.number().min(0).optional(),
  isActive: z.boolean().default(true),
  accountGroup: z.number().int().optional(),
  siigoTaxClassification: z.enum(['TAXED', 'EXEMPT', 'EXCLUDED']).optional(),
  siigoUnit: z.number().int().optional(),
});

export async function GET(req: Request) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const whereClause: Prisma.MasterPartWhereInput = {
      isActive: true,
    };

    if (category) {
      whereClause.category = category;
    }

    if (search) {
      whereClause.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    const parts = await tenantPrisma.masterPart.findMany({
      where: whereClause,
      orderBy: { description: 'asc' },
    });

    return NextResponse.json(parts);
  } catch (error) {
    console.error('[MASTER_PARTS_GET]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
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

    const body = await req.json();
    const validation = createMasterPartSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const data = validation.data;

    // Check if code exists in this scope
    const existing = await tenantPrisma.masterPart.findFirst({
      where: {
        code: data.code,
        OR: [
          { tenantId: null }, // Conflict with global
          {}, // Conflict with local
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `El código ${data.code} ya existe` },
        { status: 409 }
      );
    }

    const part = await tenantPrisma.masterPart.create({
      data: {
        tenantId: user.tenantId,
        code: data.code,
        description: data.description,
        category: data.category,
        subcategory: data.subcategory ?? null,
        unit: data.unit,
        referencePrice: data.referencePrice ?? null,
        isActive: data.isActive,
        accountGroup: data.accountGroup ?? null,
        siigoTaxClassification: data.siigoTaxClassification ?? null,
        siigoUnit: data.siigoUnit ?? null,
      },
    });

    const { after } = await import('next/server');
    after(async () => {
      const { SiigoSyncService } = await import('@/lib/services/siigo');
      await SiigoSyncService.syncPart(part.id, user.tenantId);
    });

    return NextResponse.json(part, { status: 201 });
  } catch (error) {
    console.error('[MASTER_PARTS_POST]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

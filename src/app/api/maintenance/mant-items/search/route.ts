import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

/**
 * GET /api/maintenance/mant-items/search?q=aceite&type=PART
 * Search MantItems for combobox in WorkOrderItemsTab
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const type = searchParams.get('type'); // ACTION, PART, SERVICE

    const where: Prisma.MantItemWhereInput = {
      OR: [{ tenantId: user.tenantId }, { tenantId: null, isGlobal: true }],
      status: 'ACTIVE',
    };

    if (q.trim()) {
      where.name = { contains: q.trim(), mode: 'insensitive' };
    }

    if (type && ['ACTION', 'PART', 'SERVICE'].includes(type)) {
      where.type = type as 'ACTION' | 'PART' | 'SERVICE';
    }

    const items = await prisma.mantItem.findMany({
      where,
      include: {
        category: {
          select: { name: true },
        },
        parts: {
          include: {
            masterPart: {
              select: {
                id: true,
                code: true,
                description: true,
                referencePrice: true,
              },
            },
          },
        },
      },
      take: 20,
      orderBy: { name: 'asc' },
    });

    const results = items.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      type: item.type,
      categoryName: item.category.name,
      parts: item.parts.map(p => ({
        masterPartId: p.masterPart.id,
        code: p.masterPart.code,
        description: p.masterPart.description,
        referencePrice: p.masterPart.referencePrice
          ? Number(p.masterPart.referencePrice)
          : null,
        quantity: Number(p.quantity),
        isPrimary: p.isPrimary,
      })),
    }));

    return NextResponse.json(results);
  } catch (error: unknown) {
    console.error('[MANT_ITEMS_SEARCH]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { Prisma } from '@prisma/client';

/**
 * GET /api/maintenance/mant-items/search?q=aceite&type=PART
 * Search MantItems for combobox in WorkOrderItemsTab
 */
export async function GET(request: NextRequest) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const type = searchParams.get('type'); // PART, SERVICE

    const where: Prisma.MantItemWhereInput = {
      OR: [{ tenantId: user.tenantId }, { tenantId: null, isGlobal: true }],
      status: 'ACTIVE',
    };

    if (q.trim()) {
      where.name = { contains: q.trim(), mode: 'insensitive' };
    }

    if (type && ['PART', 'SERVICE'].includes(type)) {
      where.type = type as 'PART' | 'SERVICE';
    }

    const items = await tenantPrisma.mantItem.findMany({
      where,
      include: {
        category: {
          select: { name: true },
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

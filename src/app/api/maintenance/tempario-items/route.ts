import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = req.nextUrl;
    const temparioId = searchParams.get('temparioId');

    const where: Prisma.TemparioItemWhereInput = {
      tempario: {
        OR: [{ isGlobal: true }, { tenantId: user.tenantId }],
      },
    };

    if (temparioId) {
      where.temparioId = temparioId;
    }

    const items = await tenantPrisma.temparioItem.findMany({
      where,
      include: {
        tempario: { select: { id: true, name: true } },
      },
      orderBy: [{ tempario: { name: 'asc' } }, { code: 'asc' }],
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('[TEMPARIO_ITEMS_GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

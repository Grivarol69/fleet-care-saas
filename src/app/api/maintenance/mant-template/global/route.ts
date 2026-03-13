import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';

export async function GET(_req: Request) {
  try {
    const { user } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const templates = await prisma.maintenanceTemplate.findMany({
      where: {
        tenantId: null, // Global templates only
        isGlobal: true,
        status: 'ACTIVE',
      },
      include: {
        brand: true,
        line: true,
        packages: { select: { id: true } }, // Just count
      },
      orderBy: {
        name: 'asc',
      },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('[GLOBAL_TEMPLATES_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

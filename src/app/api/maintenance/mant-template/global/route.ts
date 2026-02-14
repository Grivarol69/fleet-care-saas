import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(_req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
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

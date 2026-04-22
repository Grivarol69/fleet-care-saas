import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const { user } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const vehicleTypeId = searchParams.get('vehicleTypeId');

    const templates = await prisma.maintenanceTemplate.findMany({
      where: {
        tenantId: null, // Global templates only
        isGlobal: true,
        status: 'ACTIVE',
        ...(vehicleTypeId ? { vehicleTypeId } : {}),
      },
      include: {
        vehicleType: { select: { id: true, name: true } },
        brand: true,
        line: true,
        packages: {
          select: {
            id: true,
            name: true,
            triggerKm: true,
            packageType: true,
            description: true,
            packageItems: {
              select: {
                order: true,
                mantItem: {
                  select: {
                    name: true,
                    category: { select: { name: true } },
                  },
                },
              },
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { triggerKm: 'asc' },
        },
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

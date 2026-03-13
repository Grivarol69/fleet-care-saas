import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { AlertStatus } from '@prisma/client';

export async function GET(req: Request) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = new URL(req.url).searchParams;
    const status = searchParams.get('status') as AlertStatus | null;

    const where: any = {
      // Default to showing only PENDING/ACKNOWLEDGED if not specified,
      // or maybe just fetching all and letting frontend filter.
      // Let's fetch PENDING by default if no param.
      status: status ? status : { in: ['PENDING', 'ACKNOWLEDGED'] },
    };

    const alerts = await tenantPrisma.financialAlert.findMany({
      where,
      orderBy: [
        { severity: 'desc' }, // High severity first
        { createdAt: 'desc' },
      ],
      include: {
        workOrder: {
          select: {
            id: true,
            title: true,
          },
        },
        masterPart: {
          select: {
            code: true,
            description: true,
          },
        },
      },
      take: 20, // Limit to recent 20
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error('[FINANCIAL_ALERTS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

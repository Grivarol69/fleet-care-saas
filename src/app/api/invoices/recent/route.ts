import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export type RecentInvoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: Date;
  totalAmount: number;
  status: string;
  supplier: {
    name: string;
  } | null;
  workOrder: {
    vehicle: {
      licensePlate: string;
    };
  } | null;
};

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const recentInvoices = await prisma.invoice.findMany({
      where: {
        tenantId: user.tenantId,
      },
      include: {
        supplier: {
          select: {
            name: true,
          },
        },
        workOrder: {
          select: {
            vehicle: {
              select: {
                licensePlate: true,
              },
            },
          },
        },
      },
      orderBy: {
        invoiceDate: 'desc',
      },
      take: 10,
    });

    return NextResponse.json(recentInvoices);
  } catch (error) {
    console.error('Error fetching recent invoices:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recent invoices' },
      { status: 500 }
    );
  }
}

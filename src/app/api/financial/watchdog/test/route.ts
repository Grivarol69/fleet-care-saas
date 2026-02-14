import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { FinancialWatchdogService } from '@/lib/services/FinancialWatchdogService';

export async function POST(_req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    // 1. Create a Dummy Master Part with reference price
    const dummyPart = await prisma.masterPart.upsert({
      where: { code: 'TEST-PART-001' },
      update: { referencePrice: 100 },
      create: {
        code: 'TEST-PART-001',
        description: 'Test Watchdog Part',
        category: 'TEST',
        referencePrice: 100, // Reference is $100
        tenantId: user.tenantId,
      },
    });

    // 2. Trigger Watchdog with a deviated price ($150 => 50% deviation)
    await FinancialWatchdogService.checkPriceDeviation(
      user.tenantId,
      dummyPart.id,
      150, // Proposed Price
      undefined,
      undefined,
      'Test Expense'
    );

    return NextResponse.json({
      success: true,
      message: 'Watchdog triggered. Check FinancialAlert table.',
    });
  } catch (error) {
    console.error('[WATCHDOG_TEST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

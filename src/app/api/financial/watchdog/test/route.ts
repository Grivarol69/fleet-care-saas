import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { FinancialWatchdogService } from '@/lib/services/FinancialWatchdogService';

export async function POST(_req: Request) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Create a Dummy Master Part with reference price
    const dummyPart = await tenantPrisma.masterPart.upsert({
      where: {
        tenantId_code: { tenantId: user.tenantId, code: 'TEST-PART-001' },
      },
      update: { referencePrice: 100 },
      create: {
        code: 'TEST-PART-001',
        description: 'Test Watchdog Part',
        category: 'TEST',
        referencePrice: 100, // Reference is $100
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

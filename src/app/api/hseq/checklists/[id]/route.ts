import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';

const READ_ROLES = ['OWNER', 'MANAGER', 'COORDINATOR'];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!READ_ROLES.includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const checklist = await tenantPrisma.dailyChecklist.findUnique({
      where: { id },
      include: {
        vehicle: { select: { id: true, licensePlate: true } },
        driver: { select: { id: true, name: true } },
        items: { orderBy: { category: 'asc' } },
      },
    });

    if (!checklist)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json(checklist);
  } catch (error: unknown) {
    console.error('[HSEQ_CHECKLIST_GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Error' },
      { status: 500 }
    );
  }
}

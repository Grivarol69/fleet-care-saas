import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { canApproveWorkOrder } from '@/lib/permissions';

/**
 * GET — List all active users in the current tenant.
 * Used by tenant-level configuration UIs (e.g. WO notification recipients).
 * Guarded by canApproveWorkOrder (OWNER, MANAGER, SUPER_ADMIN).
 */
export async function GET() {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canApproveWorkOrder(user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const users = await tenantPrisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        phone: true,
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
    });

    return NextResponse.json(users);
  } catch (error: unknown) {
    console.error('[USERS_GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

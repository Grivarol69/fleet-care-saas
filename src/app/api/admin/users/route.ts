import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { canManageUsers } from '@/lib/permissions';

export async function GET() {
  const { user, tenantPrisma } = await requireCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManageUsers(user)) return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 });

  const dbUsers = await tenantPrisma.user.findMany({
    where: { isActive: true },
    select: { id: true, email: true, role: true, firstName: true, lastName: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  return NextResponse.json(dbUsers);
}

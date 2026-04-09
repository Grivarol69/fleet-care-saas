import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { canViewAuditLogs } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  const { user, tenantPrisma } = await requireCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canViewAuditLogs(user)) return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const resource = searchParams.get('resource') ?? undefined;
  const page = parseInt(searchParams.get('page') ?? '1', 10);
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 100);
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    tenantPrisma.auditLog.findMany({
      where: { ...(resource ? { resource } : {}) },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        actor: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    }),
    tenantPrisma.auditLog.count({
      where: { ...(resource ? { resource } : {}) },
    }),
  ]);

  return NextResponse.json({ items, total, page, limit });
}

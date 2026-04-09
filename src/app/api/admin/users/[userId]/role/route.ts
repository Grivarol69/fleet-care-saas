import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { canManageUsers } from '@/lib/permissions';
import { UserRole } from '@prisma/client';
import { prisma } from '@/lib/prisma';

const VALID_ROLES: UserRole[] = [
  'OWNER',
  'MANAGER',
  'COORDINATOR',
  'PURCHASER',
  'TECHNICIAN',
  'DRIVER',
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { user, tenantPrisma } = await requireCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManageUsers(user)) return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 });

  const { userId } = await params;

  if (userId === user.id) {
    return NextResponse.json({ error: 'No puedes cambiar tu propio rol' }, { status: 400 });
  }

  const body = await request.json();
  const { role } = body as { role: UserRole };

  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
  }

  const target = await tenantPrisma.user.findFirst({
    where: { id: userId },
    select: { id: true, role: true, tenantId: true },
  });

  if (!target) {
    return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
  }

  const oldRole = target.role;

  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { role },
    }),
    prisma.auditLog.create({
      data: {
        tenantId: user.tenantId,
        actorId: user.id,
        action: 'USER_ROLE_CHANGED',
        resource: 'User',
        resourceId: userId,
        changes: { before: oldRole, after: role },
      },
    }),
  ]);

  return NextResponse.json(updatedUser);
}

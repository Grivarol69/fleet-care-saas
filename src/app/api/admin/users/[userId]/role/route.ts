import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { isPlatformSuperAdmin } from '@/lib/permissions';
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
  const { user } = await requireCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isPlatformSuperAdmin(user)) {
    return NextResponse.json(
      { error: 'Forbidden: platform SUPER_ADMIN required' },
      { status: 403 }
    );
  }

  const { userId } = await params;

  if (userId === user.id) {
    return NextResponse.json(
      { error: 'No puedes cambiar tu propio rol' },
      { status: 400 }
    );
  }

  const body = await request.json();
  const { role } = body as { role: UserRole };

  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Rol inválido' }, { status: 400 });
  }

  try {
    // Read target's tenantId FIRST — that's the scoping key for the update
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, tenantId: true },
    });

    if (!target) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Defensive: prevent platform admin from accidentally modifying
    // a row in the platform tenant from this endpoint
    if (target.tenantId === user.tenantId) {
      return NextResponse.json(
        {
          error:
            'Use otra ruta para cambiar roles dentro del tenant de plataforma',
        },
        { status: 400 }
      );
    }

    const oldRole = target.role;

    const [updatedUser] = await prisma.$transaction([
      prisma.user.update({
        where: { id: userId, tenantId: target.tenantId },
        data: { role },
      }),
      // Inline create — keeps the mutation atomic.
      // logPlatformAdminAccess is for non-transactional callers; here
      // we co-mutate inside $transaction so the audit row is durable.
      prisma.auditLog.create({
        data: {
          tenantId: target.tenantId, // log lives in TARGET tenant
          actorId: user.id,
          action: 'USER_ROLE_CHANGED',
          resource: 'User',
          resourceId: userId,
          changes: {
            before: oldRole,
            after: role,
            performedBy: 'PLATFORM_ADMIN',
          },
        },
      }),
    ]);

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('[ADMIN_USERS_ROLE] PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

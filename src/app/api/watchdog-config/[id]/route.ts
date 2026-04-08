import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { canManageUsers } from '@/lib/permissions';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { user, tenantPrisma } = await requireCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManageUsers(user)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const config = await tenantPrisma.watchdogConfiguration.findUnique({ where: { id } });
  if (!config || config.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'Configuración no encontrada' }, { status: 404 });
  }

  const body = await request.json();
  const { threshold } = body as { threshold: number };

  if (typeof threshold !== 'number' || threshold < 1 || threshold > 100) {
    return NextResponse.json({ error: 'threshold debe ser un número entre 1 y 100' }, { status: 400 });
  }

  const updated = await tenantPrisma.watchdogConfiguration.update({
    where: { id },
    data: { threshold },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const { user, tenantPrisma } = await requireCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManageUsers(user)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const config = await tenantPrisma.watchdogConfiguration.findUnique({ where: { id } });
  if (!config || config.tenantId !== user.tenantId) {
    return NextResponse.json({ error: 'Configuración no encontrada' }, { status: 404 });
  }

  await tenantPrisma.watchdogConfiguration.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}

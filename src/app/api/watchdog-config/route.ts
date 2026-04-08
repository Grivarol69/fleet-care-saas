import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { canManageUsers } from '@/lib/permissions';

export async function GET() {
  const { user, tenantPrisma } = await requireCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManageUsers(user)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const configs = await tenantPrisma.watchdogConfiguration.findMany({
    orderBy: [{ category: 'asc' }],
  });

  return NextResponse.json(configs);
}

export async function POST(request: NextRequest) {
  const { user, tenantPrisma } = await requireCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!canManageUsers(user)) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });

  const body = await request.json();
  const { category = null, threshold } = body as { category?: string | null; threshold: number };

  if (typeof threshold !== 'number' || threshold < 1 || threshold > 100) {
    return NextResponse.json({ error: 'threshold debe ser un número entre 1 y 100' }, { status: 400 });
  }

  try {
    const config = await tenantPrisma.watchdogConfiguration.create({
      data: {
        tenantId: user.tenantId,
        category: category ?? null,
        threshold,
      },
    });
    return NextResponse.json(config, { status: 201 });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'P2002') {
      return NextResponse.json(
        { error: `Ya existe una configuración para ${category ?? 'todas las categorías'}` },
        { status: 409 }
      );
    }
    throw err;
  }
}

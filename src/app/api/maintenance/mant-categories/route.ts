import { prisma } from '@/lib/prisma';
import { requireCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Devolver solo categorías del tenant (las globales se copian en onboarding)
    const categories = await prisma.mantCategory.findMany({
      where: {
        tenantId: user.tenantId,
      },
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json(categories);
  } catch (error) {
    console.error('[CATEGORIES_GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, isGlobal } = await req.json();

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    // Validar permisos según destino
    let targetTenant: string | null;

    if (isGlobal) {
      // Solo SUPER_ADMIN puede crear categorías globales
      const { requireSuperAdmin } = await import('@/lib/permissions');
      try {
        requireSuperAdmin(user);
        targetTenant = null;
      } catch (error: unknown) {
        const err = error as Error;
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
    } else {
      // OWNER/MANAGER pueden crear custom
      const { requireManagementRole } = await import('@/lib/permissions');
      try {
        requireManagementRole(user);
        targetTenant = user.tenantId;
      } catch (error: unknown) {
        const err = error as Error;
        return NextResponse.json({ error: err.message }, { status: 403 });
      }
    }

    // Verificar que no exista una categoría con el mismo nombre
    const existingCategory = await tenantPrisma.mantCategory.findFirst({
      where: {
        tenantId: targetTenant,
        name: name.trim(),
      },
    });

    if (existingCategory) {
      return NextResponse.json(
        { error: 'La categoría ya existe' },
        { status: 409 }
      );
    }

    const category = await tenantPrisma.mantCategory.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        tenantId: targetTenant,
        isGlobal: isGlobal || false,
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.log('[CATEGORY_POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

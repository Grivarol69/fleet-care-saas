import { requireCurrentUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { canCreateMantItems } from '@/lib/permissions';

export async function GET(request: NextRequest) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Búsqueda para autocompletado
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search');
    const typeFilter = searchParams.get('type');

    // Devolver items del tenant y globales confiando en tenantPrisma
    const mantItems = await tenantPrisma.mantItem.findMany({
      where: {
        ...(typeFilter &&
          ['PART', 'SERVICE'].includes(typeFilter) && {
            type: typeFilter as 'PART' | 'SERVICE',
          }),
        ...(search && {
          AND: [
            {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } },
              ],
            },
          ],
        }),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
      ...(search && { take: 15 }), // Limitar solo en búsquedas
    });
    return NextResponse.json(mantItems);
  } catch (error) {
    console.error('[MANT_ITEMS_GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, categoryId, type, isGlobal } = await req.json();

    // Validación de campos requeridos
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    if (!categoryId || categoryId.trim() === '') {
      return NextResponse.json(
        { error: 'Categoría inválida' },
        { status: 400 }
      );
    }

    if (type && !['PART', 'SERVICE'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo de item inválido' },
        { status: 400 }
      );
    }

    // Validar permisos según destino
    let targetTenant: string | null;

    if (isGlobal) {
      // Solo SUPER_ADMIN puede crear items globales
      const { requireSuperAdmin } = await import('@/lib/permissions');
      try {
        requireSuperAdmin(user);
        targetTenant = null;
      } catch (error) {
        return NextResponse.json(
          { error: (error as Error).message },
          { status: 403 }
        );
      }
    } else {
      // Solo OWNER/MANAGER pueden crear items directamente
      if (!canCreateMantItems(user)) {
        return NextResponse.json(
          {
            error:
              "No tiene permisos para crear items. Use la opción 'Solicitar Item' para que un administrador lo apruebe.",
            needsRequest: true,
          },
          { status: 403 }
        );
      }
      targetTenant = user.tenantId;
    }

    // Verificar que la categoría existe (global o del tenant)
    const category = await tenantPrisma.mantCategory.findFirst({
      where: {
        id: categoryId,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que no exista un item con el mismo nombre en el scope
    const existingItem = await tenantPrisma.mantItem.findFirst({
      where: {
        tenantId: targetTenant,
        name: name.trim(),
      },
    });

    if (existingItem) {
      return NextResponse.json({ error: 'El ítem ya existe' }, { status: 409 });
    }

    const mantItem = await tenantPrisma.mantItem.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        categoryId,
        type: type || 'SERVICE',
        tenantId: targetTenant,
        isGlobal: isGlobal || false,
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(mantItem);
  } catch (error) {
    console.log('[MANT_ITEM_POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { requireMasterDataMutationPermission } from '@/lib/permissions';

// GET - Obtener categoría específica por ID (incluye globales)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const categoryId = parseInt(id);

    if (isNaN(categoryId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const category = await prisma.mantCategory.findFirst({
      where: {
        id: categoryId,
        OR: [{ isGlobal: true }, { tenantId: user.tenantId }],
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(category);
  } catch (error) {
    console.error('[CATEGORY_GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// PUT - Actualizar categoría (OWNER/MANAGER para custom, SUPER_ADMIN para global)
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const categoryId = parseInt(id);

    if (isNaN(categoryId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const { name } = await req.json();

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    // Verificar que la categoría existe (global o del tenant)
    const existingCategory = await prisma.mantCategory.findFirst({
      where: {
        id: categoryId,
        OR: [{ isGlobal: true }, { tenantId: user.tenantId }],
      },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }

    // Validar permisos según isGlobal
    try {
      requireMasterDataMutationPermission(user, existingCategory);
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 403 }
      );
    }

    // Verificar duplicados en el mismo scope
    const duplicateCategory = await prisma.mantCategory.findFirst({
      where: {
        tenantId: existingCategory.tenantId,
        name: name.trim(),
        id: { not: categoryId },
      },
    });

    if (duplicateCategory) {
      return NextResponse.json(
        { error: 'La categoría ya existe' },
        { status: 409 }
      );
    }

    const updatedCategory = await prisma.mantCategory.update({
      where: { id: categoryId },
      data: { name: name.trim() },
    });

    return NextResponse.json(updatedCategory);
  } catch (error) {
    console.log('[CATEGORY_PUT]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// DELETE - Eliminar categoría (OWNER/MANAGER para custom, SUPER_ADMIN para global)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const categoryId = parseInt(id);

    if (isNaN(categoryId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const existingCategory = await prisma.mantCategory.findFirst({
      where: {
        id: categoryId,
        OR: [{ isGlobal: true }, { tenantId: user.tenantId }],
      },
    });

    if (!existingCategory) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }

    // Validar permisos según isGlobal
    try {
      requireMasterDataMutationPermission(user, existingCategory);
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 403 }
      );
    }

    await prisma.mantCategory.delete({
      where: { id: categoryId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.log('[CATEGORY_DELETE]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

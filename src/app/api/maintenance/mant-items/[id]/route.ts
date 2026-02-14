import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { requireMasterDataMutationPermission } from '@/lib/permissions';

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
    const mantItemId = parseInt(id);

    if (isNaN(mantItemId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Verificar que el item existe (global o del tenant)
    const existingItem = await prisma.mantItem.findFirst({
      where: {
        id: mantItemId,
        OR: [{ isGlobal: true }, { tenantId: user.tenantId }],
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item no encontrado' },
        { status: 404 }
      );
    }

    // Validar permisos según isGlobal
    try {
      requireMasterDataMutationPermission(user, existingItem);
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 403 }
      );
    }

    await prisma.mantItem.delete({
      where: { id: mantItemId },
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('[MANT_ITEM_DELETE]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const mantItemId = parseInt(id);

    if (isNaN(mantItemId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const { name, description, mantType, categoryId, type } = await req.json();

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    if (
      !mantType ||
      !['PREVENTIVE', 'PREDICTIVE', 'CORRECTIVE', 'EMERGENCY'].includes(
        mantType
      )
    ) {
      return NextResponse.json(
        { error: 'Tipo de mantenimiento inválido' },
        { status: 400 }
      );
    }

    if (!categoryId || categoryId <= 0) {
      return NextResponse.json(
        { error: 'Categoría inválida' },
        { status: 400 }
      );
    }

    if (type && !['ACTION', 'PART', 'SERVICE'].includes(type)) {
      return NextResponse.json(
        { error: 'Tipo de item inválido' },
        { status: 400 }
      );
    }

    // Verificar que el item existe (global o del tenant)
    const existingItem = await prisma.mantItem.findFirst({
      where: {
        id: mantItemId,
        OR: [{ isGlobal: true }, { tenantId: user.tenantId }],
      },
    });

    if (!existingItem) {
      return NextResponse.json(
        { error: 'Item no encontrado' },
        { status: 404 }
      );
    }

    // Validar permisos según isGlobal
    try {
      requireMasterDataMutationPermission(user, existingItem);
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 403 }
      );
    }

    // Verificar que la categoría existe
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

    // Verificar duplicados en el mismo scope
    const duplicateItem = await prisma.mantItem.findFirst({
      where: {
        tenantId: existingItem.tenantId,
        name: name.trim(),
        id: { not: mantItemId },
      },
    });

    if (duplicateItem) {
      return NextResponse.json(
        { error: 'Ya existe un item con este nombre' },
        { status: 409 }
      );
    }

    const updatedMantItem = await prisma.mantItem.update({
      where: { id: mantItemId },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        mantType,
        categoryId,
        type: type || existingItem.type,
      },
      include: {
        category: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(updatedMantItem);
  } catch (error) {
    console.error('[MANT_ITEM_PATCH]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

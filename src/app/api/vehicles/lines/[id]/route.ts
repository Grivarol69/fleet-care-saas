import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { safeParseInt } from '@/lib/validation';
import { requireMasterDataMutationPermission } from '@/lib/permissions';

// GET - Obtener línea específica por ID (incluye globales)
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
    const lineId = safeParseInt(id);

    if (lineId === null) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const line = await prisma.vehicleLine.findFirst({
      where: {
        id: lineId,
        OR: [{ isGlobal: true }, { tenantId: user.tenantId }],
      },
      include: {
        brand: {
          select: { name: true },
        },
      },
    });

    if (!line) {
      return NextResponse.json(
        { error: 'Línea no encontrada' },
        { status: 404 }
      );
    }

    const mappedLine = {
      id: line.id,
      name: line.name,
      brandId: line.brandId,
      brandName: line.brand?.name || 'Sin marca',
      isGlobal: line.isGlobal,
    };

    return NextResponse.json(mappedLine);
  } catch (error) {
    console.error('[LINE_GET]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar línea (OWNER/MANAGER para custom, SUPER_ADMIN para global)
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
    const lineId = safeParseInt(id);

    if (lineId === null) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const { name, brandId } = await req.json();

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    if (!brandId) {
      return NextResponse.json(
        { error: 'La marca es requerida' },
        { status: 400 }
      );
    }

    const parsedBrandId = safeParseInt(brandId);
    if (parsedBrandId === null) {
      return NextResponse.json(
        { error: 'ID de marca inválido' },
        { status: 400 }
      );
    }

    // Verificar que la línea existe (global o del tenant)
    const existingLine = await prisma.vehicleLine.findFirst({
      where: {
        id: lineId,
        OR: [{ isGlobal: true }, { tenantId: user.tenantId }],
      },
    });

    if (!existingLine) {
      return NextResponse.json(
        { error: 'Línea no encontrada' },
        { status: 404 }
      );
    }

    // Validar permisos según isGlobal
    try {
      requireMasterDataMutationPermission(user, existingLine);
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 403 }
      );
    }

    // Verificar que la marca existe
    const brand = await prisma.vehicleBrand.findFirst({
      where: {
        id: parsedBrandId,
        OR: [{ isGlobal: true }, { tenantId: user.tenantId }],
      },
    });

    if (!brand) {
      return NextResponse.json(
        { error: 'Marca no encontrada' },
        { status: 404 }
      );
    }

    // Verificar duplicados en el mismo scope
    const duplicateLine = await prisma.vehicleLine.findFirst({
      where: {
        tenantId: existingLine.tenantId,
        brandId: parsedBrandId,
        name: name.trim(),
        id: { not: lineId },
      },
    });

    if (duplicateLine) {
      return NextResponse.json(
        { error: 'La línea ya existe para esta marca' },
        { status: 409 }
      );
    }

    const updatedLine = await prisma.vehicleLine.update({
      where: { id: lineId },
      data: {
        name: name.trim(),
        brandId: parsedBrandId,
      },
      include: {
        brand: { select: { name: true } },
      },
    });

    const mappedLine = {
      id: updatedLine.id,
      name: updatedLine.name,
      brandId: updatedLine.brandId,
      brandName: updatedLine.brand?.name || 'Sin marca',
    };

    return NextResponse.json(mappedLine);
  } catch (error) {
    console.log('[LINE_PUT]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar parcialmente línea
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
    const lineId = safeParseInt(id);

    if (lineId === null) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await req.json();
    const { name, brandId } = body;

    // Verificar que la línea existe (global o del tenant)
    const existingLine = await prisma.vehicleLine.findFirst({
      where: {
        id: lineId,
        OR: [{ isGlobal: true }, { tenantId: user.tenantId }],
      },
    });

    if (!existingLine) {
      return NextResponse.json(
        { error: 'Línea no encontrada' },
        { status: 404 }
      );
    }

    // Validar permisos según isGlobal
    try {
      requireMasterDataMutationPermission(user, existingLine);
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 403 }
      );
    }

    if (name !== undefined && (!name || name.trim() === '')) {
      return NextResponse.json(
        { error: 'El nombre no puede estar vacío' },
        { status: 400 }
      );
    }

    let parsedBrandId: number | undefined;
    if (brandId !== undefined) {
      parsedBrandId = safeParseInt(brandId) ?? undefined;
      if (parsedBrandId === undefined) {
        return NextResponse.json(
          { error: 'ID de marca inválido' },
          { status: 400 }
        );
      }

      const brand = await prisma.vehicleBrand.findFirst({
        where: {
          id: parsedBrandId,
          OR: [{ isGlobal: true }, { tenantId: user.tenantId }],
        },
      });

      if (!brand) {
        return NextResponse.json(
          { error: 'Marca no encontrada' },
          { status: 404 }
        );
      }
    }

    const updateData: { name?: string; brandId?: number } = {};
    if (name !== undefined) updateData.name = name.trim();
    if (parsedBrandId !== undefined) updateData.brandId = parsedBrandId;

    // Verificar duplicados
    if (name !== undefined || parsedBrandId !== undefined) {
      const checkName = name !== undefined ? name.trim() : existingLine.name;
      const checkBrandId =
        parsedBrandId !== undefined ? parsedBrandId : existingLine.brandId;

      const duplicateLine = await prisma.vehicleLine.findFirst({
        where: {
          tenantId: existingLine.tenantId,
          brandId: checkBrandId,
          name: checkName,
          id: { not: lineId },
        },
      });

      if (duplicateLine) {
        return NextResponse.json(
          { error: 'La línea ya existe para esta marca' },
          { status: 409 }
        );
      }
    }

    const updatedLine = await prisma.vehicleLine.update({
      where: { id: lineId },
      data: updateData,
      include: {
        brand: { select: { name: true } },
      },
    });

    const mappedLine = {
      id: updatedLine.id,
      name: updatedLine.name,
      brandId: updatedLine.brandId,
      brandName: updatedLine.brand?.name || 'Sin marca',
    };

    return NextResponse.json(mappedLine);
  } catch (error) {
    console.log('[LINE_PATCH]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar línea (OWNER/MANAGER para custom, SUPER_ADMIN para global)
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
    const lineId = safeParseInt(id);

    if (lineId === null) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const existingLine = await prisma.vehicleLine.findFirst({
      where: {
        id: lineId,
        OR: [{ isGlobal: true }, { tenantId: user.tenantId }],
      },
    });

    if (!existingLine) {
      return NextResponse.json(
        { error: 'Línea no encontrada' },
        { status: 404 }
      );
    }

    // Validar permisos según isGlobal
    try {
      requireMasterDataMutationPermission(user, existingLine);
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 403 }
      );
    }

    // Verificar dependencias
    const hasVehicles = await prisma.vehicle.findFirst({
      where: { lineId, tenantId: user.tenantId },
    });

    const hasMantTemplates = await prisma.maintenanceTemplate.findFirst({
      where: { vehicleLineId: lineId, tenantId: user.tenantId },
    });

    if (hasVehicles || hasMantTemplates) {
      return NextResponse.json(
        {
          error:
            'No se puede eliminar la línea porque tiene vehículos o plantillas de mantenimiento asociadas',
        },
        { status: 409 }
      );
    }

    // Soft delete
    await prisma.vehicleLine.update({
      where: { id: lineId },
      data: { status: 'INACTIVE' },
    });

    return NextResponse.json({ success: true, message: 'Línea desactivada' });
  } catch (error) {
    console.log('[LINE_DELETE]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { safeParseInt } from '@/lib/validation';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Devolver líneas GLOBALES + del tenant (solo activas)
    const lines = await prisma.vehicleLine.findMany({
      where: {
        OR: [
          { isGlobal: true }, // Líneas globales (Knowledge Base)
          { tenantId: user.tenantId }, // Líneas custom del tenant
        ],
        status: 'ACTIVE',
      },
      orderBy: {
        name: 'asc',
      },
      include: {
        brand: {
          select: {
            name: true,
          },
        },
      },
    });

    // Mapear los datos para incluir brandName directamente
    const mappedLines = lines.map(line => ({
      id: line.id,
      name: line.name,
      brandId: line.brandId,
      brandName: line.brand?.name || 'Sin marca',
      isGlobal: line.isGlobal,
    }));

    return NextResponse.json(mappedLines);
  } catch (error) {
    console.error('[LINE_GET]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { name, brandId, isGlobal } = await req.json();

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

    // Validar permisos según destino
    let targetTenant: string | null;

    if (isGlobal) {
      // Solo SUPER_ADMIN puede crear líneas globales
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
      // OWNER/MANAGER pueden crear custom
      const { requireManagementRole } = await import('@/lib/permissions');
      try {
        requireManagementRole(user);
        targetTenant = user.tenantId;
      } catch (error) {
        return NextResponse.json(
          { error: (error as Error).message },
          { status: 403 }
        );
      }
    }

    const parsedBrandId = safeParseInt(String(brandId));

    if (parsedBrandId === null) {
      return NextResponse.json(
        { error: 'ID de marca inválido' },
        { status: 400 }
      );
    }

    // Verificar que no existe
    const existingLine = await prisma.vehicleLine.findFirst({
      where: {
        tenantId: targetTenant,
        brandId: parsedBrandId,
        name: name.trim(),
      },
    });

    if (existingLine) {
      return NextResponse.json(
        { error: 'La línea ya existe para esta marca' },
        { status: 409 }
      );
    }

    // Verificar que la marca existe (global o del tenant)
    const brand = await prisma.vehicleBrand.findFirst({
      where: {
        id: parsedBrandId,
        OR: [{ isGlobal: true }, { tenantId: targetTenant }],
      },
    });

    if (!brand) {
      return NextResponse.json(
        { error: 'Marca no encontrada' },
        { status: 404 }
      );
    }

    const line = await prisma.vehicleLine.create({
      data: {
        name: name.trim(),
        brandId: parsedBrandId,
        tenantId: targetTenant,
        isGlobal: isGlobal || false,
      },
      include: {
        brand: {
          select: {
            name: true,
          },
        },
      },
    });

    // Mapear para incluir brandName
    const mappedLine = {
      id: line.id,
      name: line.name,
      brandId: line.brandId,
      brandName: line.brand?.name || 'Sin marca',
      isGlobal: line.isGlobal,
    };

    return NextResponse.json(mappedLine, { status: 201 });
  } catch (error) {
    console.log('[LINE_POST]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

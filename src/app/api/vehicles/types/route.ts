import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Devolver tipos GLOBALES + del tenant (solo activos)
    const types = await prisma.vehicleType.findMany({
      where: {
        OR: [
          { isGlobal: true }, // Tipos globales (Knowledge Base)
          { tenantId: user.tenantId }, // Tipos custom del tenant
        ],
        status: 'ACTIVE',
      },
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json(types);
  } catch (error) {
    console.error('[TYPES_GET]', error);
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

    const { name, isGlobal } = await req.json();

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    // Validar permisos según destino
    let targetTenant: string | null;

    if (isGlobal) {
      // Solo SUPER_ADMIN puede crear tipos globales
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

    // Verificar que no exista un tipo con el mismo nombre
    const existingType = await prisma.vehicleType.findFirst({
      where: {
        tenantId: targetTenant,
        name: name.trim(),
      },
    });

    if (existingType) {
      return NextResponse.json({ error: 'El tipo ya existe' }, { status: 409 });
    }

    const type = await prisma.vehicleType.create({
      data: {
        name: name.trim(),
        tenantId: targetTenant,
        isGlobal: isGlobal || false,
      },
    });

    return NextResponse.json(type, { status: 201 });
  } catch (error) {
    console.error('[TYPE_POST]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

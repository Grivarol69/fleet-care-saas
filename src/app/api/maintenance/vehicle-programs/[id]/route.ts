import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { canManageMaintenancePrograms } from '@/lib/permissions';

// GET - Obtener programa específico por ID
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const programId = id;
    if (!programId) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const program = await tenantPrisma.vehicleMantProgram.findUnique({
      where: {
        id: programId,
        },
      include: {
        vehicle: {
          include: {
            brand: true,
            line: true,
          },
        },
        packages: {
          include: {
            items: {
              include: {
                mantItem: true,
                technician: true,
                provider: true,
              },
              orderBy: [{ status: 'asc' }, { order: 'asc' }],
            },
          },
          orderBy: [{ packageType: 'asc' }, { triggerKm: 'asc' }],
        },
      },
    });

    if (!program) {
      return new NextResponse('Program not found', { status: 404 });
    }

    return NextResponse.json(program);
  } catch (error) {
    console.error('[VEHICLE_MANT_PROGRAM_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

// PUT - Actualizar programa de mantenimiento
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canManageMaintenancePrograms(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const programId = id;
    if (!programId) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await req.json();

    const {
      name,
      description,
      nextMaintenanceKm,
      nextMaintenanceDesc,
      isActive,
      notes,
    } = body;

    // Verificar que el programa existe
    const existingProgram = await tenantPrisma.vehicleMantProgram.findUnique({
      where: {
        id: programId,
        },
    });

    if (!existingProgram) {
      return new NextResponse('Program not found', { status: 404 });
    }

    // Actualizar el programa
    const updatedProgram = await tenantPrisma.vehicleMantProgram.update({
      where: { id: programId },
      data: {
        name,
        description,
        nextMaintenanceKm,
        nextMaintenanceDesc,
        isActive,
        notes,
        status: isActive ? 'ACTIVE' : 'INACTIVE',
      },
    });

    // Retornar programa actualizado con relaciones
    const result = await tenantPrisma.vehicleMantProgram.findUnique({
      where: { id: updatedProgram.id },
      include: {
        vehicle: {
          include: {
            brand: true,
            line: true,
          },
        },
        packages: {
          include: {
            items: {
              include: {
                mantItem: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[VEHICLE_MANT_PROGRAM_PUT]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

// DELETE - Eliminar programa de mantenimiento
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canManageMaintenancePrograms(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const programId = id;
    if (!programId) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Verificar que el programa existe
    const existingProgram = await tenantPrisma.vehicleMantProgram.findUnique({
      where: {
        id: programId,
        },
      include: {
        packages: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!existingProgram) {
      return new NextResponse('Program not found', { status: 404 });
    }

    // Verificar que no hay items en progreso
    const itemsInProgress = existingProgram.packages.some(pkg =>
      pkg.items.some(item => item.status === 'IN_PROGRESS')
    );

    if (itemsInProgress) {
      return new NextResponse('Cannot delete program with items in progress', {
        status: 400,
      });
    }

    // Eliminar en cascada (Prisma debería manejar esto automáticamente)
    await tenantPrisma.vehicleMantProgram.delete({
      where: { id: programId },
    });

    return NextResponse.json({ message: 'Program deleted successfully' });
  } catch (error) {
    console.error('[VEHICLE_MANT_PROGRAM_DELETE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

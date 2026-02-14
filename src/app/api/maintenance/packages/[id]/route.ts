import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { canManageMaintenancePrograms } from '@/lib/permissions';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const id = parseInt(params.id);

    const package_ = await prisma.maintenancePackage.findFirst({
      where: {
        id,
        template: {
          tenantId: user.tenantId,
        },
      },
      include: {
        packageItems: {
          include: {
            mantItem: {
              select: {
                id: true,
                name: true,
                mantType: true,
                type: true,
                category: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            packageItems: true,
          },
        },
      },
    });

    if (!package_) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    return NextResponse.json(package_);
  } catch (error) {
    console.error('[PACKAGE_GET]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canManageMaintenancePrograms(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const id = parseInt(params.id);
    const body = await request.json();
    const {
      name,
      triggerKm,
      description,
      estimatedCost,
      estimatedTime,
      priority,
      packageType,
    } = body;

    // Verificar que el paquete existe y pertenece al tenant
    const existingPackage = await prisma.maintenancePackage.findFirst({
      where: {
        id,
        template: {
          tenantId: user.tenantId,
        },
      },
    });

    if (!existingPackage) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    // Si se está cambiando el triggerKm, verificar que no exista otro con el mismo km
    if (triggerKm && triggerKm !== existingPackage.triggerKm) {
      const duplicatePackage = await prisma.maintenancePackage.findFirst({
        where: {
          templateId: existingPackage.templateId,
          triggerKm: triggerKm,
          id: { not: id },
        },
      });

      if (duplicatePackage) {
        return NextResponse.json(
          {
            error:
              'Ya existe un paquete para este kilometraje en este template',
          },
          { status: 409 }
        );
      }
    }

    const updatedPackage = await prisma.maintenancePackage.update({
      where: { id },
      data: {
        name: name || existingPackage.name,
        triggerKm: triggerKm || existingPackage.triggerKm,
        description:
          description !== undefined ? description : existingPackage.description,
        estimatedCost:
          estimatedCost !== undefined
            ? estimatedCost
              ? parseFloat(estimatedCost)
              : null
            : existingPackage.estimatedCost,
        estimatedTime:
          estimatedTime !== undefined
            ? estimatedTime
              ? parseFloat(estimatedTime)
              : null
            : existingPackage.estimatedTime,
        priority: priority || existingPackage.priority,
        packageType: packageType || existingPackage.packageType,
      },
      include: {
        _count: {
          select: {
            packageItems: true,
          },
        },
      },
    });

    return NextResponse.json(updatedPackage);
  } catch (error) {
    console.error('[PACKAGE_PUT]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canManageMaintenancePrograms(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const id = parseInt(params.id);

    // Verificar que el paquete existe y pertenece al tenant
    const existingPackage = await prisma.maintenancePackage.findFirst({
      where: {
        id,
        template: {
          tenantId: user.tenantId,
        },
      },
    });

    if (!existingPackage) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    // Verificar si hay VehicleProgramPackages que referencian este package por nombre
    const vehicleProgramPackages = await prisma.vehicleProgramPackage.findFirst(
      {
        where: {
          name: existingPackage.name,
          triggerKm: existingPackage.triggerKm,
        },
      }
    );

    if (vehicleProgramPackages) {
      return NextResponse.json(
        {
          error:
            'No se puede eliminar este paquete porque ya está siendo usado en programas de vehículos',
        },
        { status: 400 }
      );
    }

    await prisma.maintenancePackage.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PACKAGE_DELETE]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

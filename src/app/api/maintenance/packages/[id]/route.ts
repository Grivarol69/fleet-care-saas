import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { canManageMaintenancePrograms } from '@/lib/permissions';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const package_ = await tenantPrisma.maintenancePackage.findFirst({
      where: {
        id,
        template: {},
      },
      include: {
        packageItems: {
          include: {
            mantItem: {
              select: {
                id: true,
                name: true,
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
    const existingPackage = await tenantPrisma.maintenancePackage.findFirst({
      where: {
        id,
        template: {},
      },
    });

    if (!existingPackage) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    // Si se está cambiando el triggerKm, verificar que no exista otro con el mismo km
    if (triggerKm && triggerKm !== existingPackage.triggerKm) {
      const duplicatePackage = await tenantPrisma.maintenancePackage.findFirst({
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

    const updatedPackage = await tenantPrisma.maintenancePackage.update({
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

    // Verificar que el paquete existe y pertenece al tenant
    const existingPackage = await tenantPrisma.maintenancePackage.findFirst({
      where: {
        id,
        template: {},
      },
    });

    if (!existingPackage) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    // Verificar si hay VehicleProgramPackages que referencian este package por nombre
    const vehicleProgramPackages =
      await tenantPrisma.vehicleProgramPackage.findFirst({
        where: {
          name: existingPackage.name,
          triggerKm: existingPackage.triggerKm,
        },
      });

    if (vehicleProgramPackages) {
      return NextResponse.json(
        {
          error:
            'No se puede eliminar este paquete porque ya está siendo usado en programas de vehículos',
        },
        { status: 400 }
      );
    }

    await tenantPrisma.maintenancePackage.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[PACKAGE_DELETE]', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

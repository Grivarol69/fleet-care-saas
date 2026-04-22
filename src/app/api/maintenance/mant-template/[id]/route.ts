import { requireCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { canManageMaintenancePrograms } from '@/lib/permissions';

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
    const mantTemplateId = id;

    if (!mantTemplateId) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const mantTemplate = await tenantPrisma.maintenanceTemplate.findFirst({
      where: {
        id: mantTemplateId,
      },
      include: {
        vehicleType: {
          select: {
            id: true,
            name: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
        line: {
          select: {
            id: true,
            name: true,
          },
        },
        packages: {
          include: {
            packageItems: {
              include: {
                mantItem: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    type: true,
                    category: {
                      select: {
                        id: true,
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
          },
          orderBy: {
            triggerKm: 'asc',
          },
        },
      },
    });

    if (!mantTemplate) {
      return NextResponse.json(
        { error: 'Template no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(mantTemplate);
  } catch (error) {
    console.error('[MANT_TEMPLATE_GET_BY_ID]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    const mantTemplateId = id;

    if (!mantTemplateId) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const { name, description, vehicleTypeId, vehicleBrandId, vehicleLineId } =
      await req.json();

    // Validación de campos requeridos
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre del template es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el template existe
    const existingTemplate = await tenantPrisma.maintenanceTemplate.findFirst({
      where: {
        id: mantTemplateId,
      },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template no encontrado' },
        { status: 404 }
      );
    }

    // Verificar vehicleType si se provee
    if (vehicleTypeId) {
      const vehicleType = await tenantPrisma.vehicleType.findFirst({
        where: { id: vehicleTypeId },
      });
      if (!vehicleType) {
        return NextResponse.json(
          { error: 'Tipo de vehículo no encontrado' },
          { status: 404 }
        );
      }
    }

    // Verificar que no exista otro template con el mismo nombre (excluyendo el actual)
    const duplicateTemplate = await tenantPrisma.maintenanceTemplate.findFirst({
      where: {
        name: name.trim(),
        id: { not: mantTemplateId },
      },
    });

    if (duplicateTemplate) {
      return NextResponse.json(
        { error: 'Ya existe un template con este nombre' },
        { status: 409 }
      );
    }

    const updatedTemplate = await tenantPrisma.maintenanceTemplate.update({
      where: {
        id: mantTemplateId,
      },
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        ...(vehicleTypeId ? { vehicleTypeId } : {}),
        vehicleBrandId: vehicleBrandId || null,
        vehicleLineId: vehicleLineId || null,
      },
      include: {
        vehicleType: {
          select: {
            id: true,
            name: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
          },
        },
        line: {
          select: {
            id: true,
            name: true,
          },
        },
        packages: {
          include: {
            packageItems: {
              include: {
                mantItem: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                  },
                },
              },
              orderBy: {
                order: 'asc',
              },
            },
          },
          orderBy: {
            triggerKm: 'asc',
          },
        },
      },
    });

    return NextResponse.json(updatedTemplate);
  } catch (error) {
    console.error('[MANT_TEMPLATE_PATCH]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

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
    const mantTemplateId = id;

    if (!mantTemplateId) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Verificar que el template existe y pertenece al tenant
    const existingTemplate = await tenantPrisma.maintenanceTemplate.findUnique({
      where: {
        id: mantTemplateId,
      },
    });

    if (!existingTemplate) {
      return NextResponse.json(
        { error: 'Template no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si hay vehículos asignados a este template antes de eliminar
    const vehiclePlansCount = await tenantPrisma.vehicleMantProgram.count({
      where: {
        generatedFrom: {
          contains: existingTemplate.name,
        },
        status: 'ACTIVE',
      },
    });

    if (vehiclePlansCount > 0) {
      return NextResponse.json(
        {
          error:
            'No se puede eliminar el template porque tiene asignaciones de vehículos activas. Por favor elimine las asignaciones primero.',
        },
        { status: 409 }
      );
    }

    // Usar soft delete cambiando el status a INACTIVE
    await tenantPrisma.maintenanceTemplate.update({
      where: {
        id: mantTemplateId,
      },
      data: {
        status: 'INACTIVE',
      },
    });

    return NextResponse.json({ success: true, message: 'Template eliminado' });
  } catch (error) {
    console.error('[MANT_TEMPLATE_DELETE]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

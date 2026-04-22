import { requireCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { canManageMaintenancePrograms } from '@/lib/permissions';

export async function GET(req: Request) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const source = searchParams.get('source');

    let sourceFilter = {};
    if (source === 'custom') {
      sourceFilter = { tenantId: user.tenantId, isGlobal: false };
    } else if (source === 'global') {
      sourceFilter = { isGlobal: true, tenantId: null };
    }
    // no source param → tenantPrisma OR filter applies naturally

    const mantTemplates = await tenantPrisma.maintenanceTemplate.findMany({
      where: {
        status: 'ACTIVE',
        ...sourceFilter,
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
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(mantTemplates);
  } catch (error) {
    console.error('[MANT_TEMPLATE_GET]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
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

    const {
      name,
      description,
      vehicleTypeId,
      vehicleBrandId,
      vehicleLineId,
      isGlobal,
    } = await req.json();

    // Validación de campos requeridos
    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre del template es requerido' },
        { status: 400 }
      );
    }

    if (!vehicleTypeId || vehicleTypeId.trim() === '') {
      return NextResponse.json(
        { error: 'El tipo de vehículo es requerido' },
        { status: 400 }
      );
    }

    // Validar permisos según destino
    let targetTenant: string | null;

    if (isGlobal) {
      // Solo SUPER_ADMIN puede crear templates globales
      if (user.role !== 'SUPER_ADMIN') {
        return NextResponse.json(
          { error: 'Solo SUPER_ADMIN puede crear templates globales' },
          { status: 403 }
        );
      }
      targetTenant = null;
    } else {
      // OWNER/MANAGER pueden crear custom
      if (!['SUPER_ADMIN', 'OWNER', 'MANAGER'].includes(user.role)) {
        return NextResponse.json(
          { error: 'Permisos insuficientes' },
          { status: 403 }
        );
      }
      targetTenant = user.tenantId;
    }

    // Verificar que el tipo de vehículo existe
    const vehicleType = await tenantPrisma.vehicleType.findFirst({
      where: { id: vehicleTypeId },
    });

    if (!vehicleType) {
      return NextResponse.json(
        { error: 'Tipo de vehículo no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que no exista un template con el mismo nombre en el scope
    const existingTemplate = await tenantPrisma.maintenanceTemplate.findFirst({
      where: {
        tenantId: targetTenant,
        name: name.trim(),
        status: 'ACTIVE',
      },
    });

    if (existingTemplate) {
      return NextResponse.json(
        { error: 'Ya existe un template con este nombre' },
        { status: 409 }
      );
    }

    const mantTemplate = await tenantPrisma.maintenanceTemplate.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        vehicleTypeId,
        vehicleBrandId: vehicleBrandId || null,
        vehicleLineId: vehicleLineId || null,
        tenantId: targetTenant,
        isGlobal: isGlobal || false,
        status: 'ACTIVE',
        version: '1.0',
        isDefault: false,
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
            },
          },
        },
      },
    });

    return NextResponse.json(mantTemplate, { status: 201 });
  } catch (error) {
    console.error('[MANT_TEMPLATE_POST]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

import { requireCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { canManageVehicles } from '@/lib/permissions';

export async function GET() {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vehicles = await tenantPrisma.vehicle.findMany({
      where: {
        status: 'ACTIVE',
      },
      include: {
        brand: true,
        line: true,
        type: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(vehicles);
  } catch (error) {
    console.error('[VEHICLES_GET]', error);
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

    if (!canManageVehicles(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { licensePlate, brandId, lineId, typeId, year, color, mileage } =
      body;

    if (
      !licensePlate ||
      !brandId ||
      !lineId ||
      !typeId ||
      !year ||
      !color ||
      mileage === undefined
    ) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    const existingVehicle = await tenantPrisma.vehicle.findFirst({
      where: {
        licensePlate: licensePlate,
      },
    });

    if (existingVehicle) {
      return NextResponse.json(
        { error: 'Ya existe un vehículo con esta placa' },
        { status: 409 }
      );
    }

    const vehicle = await tenantPrisma.vehicle.create({
      data: {
        ...body,
        tenantId: user.tenantId,
      },
    });

    return NextResponse.json(vehicle, { status: 201 });
  } catch (error) {
    console.error('[VEHICLES_POST]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

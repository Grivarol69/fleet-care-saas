import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { safeParseInt } from '@/lib/validation';
import { canManageVehicles, canDeleteVehicles } from '@/lib/permissions';

// GET a single vehicle by ID
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const vehicleId = safeParseInt(id);
    if (vehicleId === null) {
      return NextResponse.json(
        { error: 'ID de vehículo inválido' },
        { status: 400 }
      );
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: {
        id: vehicleId,
        tenantId: user.tenantId,
      },
      include: {
        brand: true,
        line: true,
        type: true,
        documents: true,
      },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(vehicle);
  } catch (error) {
    console.error('[VEHICLE_GET_BY_ID]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE a vehicle by ID
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (!canDeleteVehicles(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const vehicleId = safeParseInt(id);
    if (vehicleId === null) {
      return NextResponse.json(
        { error: 'ID de vehículo inválido' },
        { status: 400 }
      );
    }

    const vehicleToDelete = await prisma.vehicle.findUnique({
      where: {
        id: vehicleId,
        tenantId: user.tenantId,
      },
    });

    if (!vehicleToDelete) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 404 }
      );
    }

    // Soft delete - cambiar status a INACTIVE
    await prisma.vehicle.update({
      where: {
        id: vehicleId,
        tenantId: user.tenantId,
      },
      data: {
        status: 'INACTIVE',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Vehículo desactivado',
    });
  } catch (error) {
    console.error('[VEHICLE_DELETE]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PATCH (update) a vehicle by ID
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (!canManageVehicles(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const vehicleId = safeParseInt(id);
    if (vehicleId === null) {
      return NextResponse.json(
        { error: 'ID de vehículo inválido' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { licensePlate, ...otherData } = body;

    const vehicleToUpdate = await prisma.vehicle.findUnique({
      where: {
        id: vehicleId,
        tenantId: user.tenantId,
      },
    });

    if (!vehicleToUpdate) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 404 }
      );
    }

    // If license plate is being changed, check for duplicates
    if (licensePlate && licensePlate !== vehicleToUpdate.licensePlate) {
      const existingVehicle = await prisma.vehicle.findUnique({
        where: {
          tenantId_licensePlate: {
            tenantId: user.tenantId,
            licensePlate: licensePlate,
          },
        },
      });

      if (existingVehicle) {
        return NextResponse.json(
          { error: 'Ya existe un vehículo con esta placa' },
          { status: 409 }
        );
      }
    }

    const updatedVehicle = await prisma.vehicle.update({
      where: {
        id: vehicleId,
        tenantId: user.tenantId,
      },
      data: {
        licensePlate,
        ...otherData,
      },
    });

    return NextResponse.json(updatedVehicle);
  } catch (error) {
    console.error('[VEHICLE_PATCH]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

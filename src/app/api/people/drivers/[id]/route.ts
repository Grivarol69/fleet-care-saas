import { requireCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { canManageVehicles } from '@/lib/permissions';

// GET - Obtener conductor específico por ID
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const driverId = id;
    if (!driverId) {
      return NextResponse.json(
        { error: 'ID de conductor inválido' },
        { status: 400 }
      );
    }

    const driver = await tenantPrisma.driver.findUnique({
      where: {
        id: driverId,
        },
    });

    if (!driver) {
      return NextResponse.json(
        { error: 'Conductor no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(driver);
  } catch (error) {
    console.error('[DRIVER_GET]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar conductor específico
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const driverId = id;
    if (!driverId) {
      return NextResponse.json(
        { error: 'ID de conductor inválido' },
        { status: 400 }
      );
    }

    const { name, email, phone, licenseNumber, licenseExpiry } =
      await req.json();

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el conductor existe
    const existingDriver = await tenantPrisma.driver.findUnique({
      where: {
        id: driverId,
        },
    });

    if (!existingDriver) {
      return NextResponse.json(
        { error: 'Conductor no encontrado' },
        { status: 404 }
      );
    }

    // Verificar duplicado de licencia (si se proporciona y es diferente)
    if (licenseNumber && licenseNumber.trim() !== '') {
      const duplicateDriverWithLicense = await tenantPrisma.driver.findFirst({
        where: {
          licenseNumber: licenseNumber.trim(),
          id: {
            not: driverId,
          },
        },
      });

      if (duplicateDriverWithLicense) {
        return NextResponse.json(
          { error: 'Ya existe un conductor con este número de licencia' },
          { status: 409 }
        );
      }
    }

    const updatedDriver = await tenantPrisma.driver.update({
      where: {
        id: driverId,
        },
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        licenseNumber: licenseNumber?.trim() || null,
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
      },
    });

    return NextResponse.json(updatedDriver);
  } catch (error) {
    console.error('[DRIVER_PUT]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar conductor específico
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const driverId = id;
    if (!driverId) {
      return NextResponse.json(
        { error: 'ID de conductor inválido' },
        { status: 400 }
      );
    }

    const existingDriver = await tenantPrisma.driver.findUnique({
      where: {
        id: driverId,
        },
    });

    if (!existingDriver) {
      return NextResponse.json(
        { error: 'Conductor no encontrado' },
        { status: 404 }
      );
    }

    // Soft delete - cambiar status a INACTIVE
    await tenantPrisma.driver.update({
      where: {
        id: driverId,
        },
      data: {
        status: 'INACTIVE',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Conductor desactivado',
    });
  } catch (error) {
    console.error('[DRIVER_DELETE]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

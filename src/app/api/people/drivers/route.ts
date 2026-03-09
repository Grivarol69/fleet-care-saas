import { requireCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { canManageVehicles } from '@/lib/permissions';

export async function GET() {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const drivers = await tenantPrisma.driver.findMany({
      where: {
        status: 'ACTIVE',
      },
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json(drivers);
  } catch (error) {
    console.error('[DRIVERS_GET]', error);
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

    const { name, email, phone, licenseNumber, licenseExpiry } =
      await req.json();

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    // Verificar que no exista un conductor con la misma licencia (si se proporciona)
    if (licenseNumber && licenseNumber.trim() !== '') {
      const existingDriverWithLicense = await tenantPrisma.driver.findFirst({
        where: {
          licenseNumber: licenseNumber.trim(),
        },
      });

      if (existingDriverWithLicense) {
        return NextResponse.json(
          { error: 'Ya existe un conductor con este número de licencia' },
          { status: 409 }
        );
      }
    }

    const driver = await tenantPrisma.driver.create({
      data: {
        tenantId: user.tenantId,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        licenseNumber: licenseNumber?.trim() || null,
        licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null,
      },
    });

    return NextResponse.json(driver, { status: 201 });
  } catch (error) {
    console.error('[DRIVER_POST]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

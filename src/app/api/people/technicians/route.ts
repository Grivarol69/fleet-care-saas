import { requireCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { canManageMasterData } from '@/lib/permissions';

export async function GET() {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const technicians = await tenantPrisma.technician.findMany({
      where: {
        status: 'ACTIVE',
      },
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json(technicians);
  } catch (error) {
    console.error('[TECHNICIANS_GET]', error);
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

    if (!canManageMasterData(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const { name, email, phone, specialty } = await req.json();

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    // Verificar que no exista un técnico con el mismo nombre
    const existingTechnician = await tenantPrisma.technician.findFirst({
      where: {
        name: name.trim(),
      },
    });

    if (existingTechnician) {
      return NextResponse.json(
        { error: 'Ya existe un técnico con este nombre' },
        { status: 409 }
      );
    }

    const technician = await tenantPrisma.technician.create({
      data: {
        tenantId: user.tenantId,
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        specialty: specialty?.trim() || null,
      },
    });

    return NextResponse.json(technician, { status: 201 });
  } catch (error) {
    console.error('[TECHNICIAN_POST]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

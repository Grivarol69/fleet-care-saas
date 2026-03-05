import { requireCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { canManageProviders } from '@/lib/permissions';

export const maxDuration = 60;

// GET - Obtener proveedor específico por ID
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

    const providerId = id;
    if (!providerId) {
      return NextResponse.json(
        { error: 'ID de proveedor inválido' },
        { status: 400 }
      );
    }

    const provider = await tenantPrisma.provider.findUnique({
      where: {
        id: providerId,
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(provider);
  } catch (error) {
    console.error('[PROVIDER_GET]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar proveedor específico
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

    if (!canManageProviders(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const providerId = id;
    if (!providerId) {
      return NextResponse.json(
        { error: 'ID de proveedor inválido' },
        { status: 400 }
      );
    }

    const {
      name, email, phone, address, specialty,
      nit, siigoIdType, siigoPersonType, stateCode, cityCode, fiscalResponsibilities, vatResponsible
    } = await req.json();

    if (!name || name.trim() === '') {
      return NextResponse.json(
        { error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el proveedor existe
    const existingProvider = await tenantPrisma.provider.findUnique({
      where: {
        id: providerId,
      },
    });

    if (!existingProvider) {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    // Verificar duplicados
    const duplicateProvider = await tenantPrisma.provider.findFirst({
      where: {
        name: name.trim(),
        id: {
          not: providerId,
        },
      },
    });

    if (duplicateProvider) {
      return NextResponse.json(
        { error: 'Ya existe un proveedor con este nombre' },
        { status: 409 }
      );
    }

    const updatedProvider = await tenantPrisma.provider.update({
      where: {
        id: providerId,
      },
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        specialty: specialty?.trim() || null,
        nit: nit?.trim() || null,
        siigoIdType: siigoIdType || null,
        siigoPersonType: siigoPersonType || null,
        stateCode: stateCode?.trim() || null,
        cityCode: cityCode?.trim() || null,
        fiscalResponsibilities: Array.isArray(fiscalResponsibilities) ? fiscalResponsibilities : [],
        vatResponsible: vatResponsible !== undefined ? vatResponsible : null,
      },
    });

    const { after } = await import('next/server');
    after(async () => {
      const { SiigoSyncService } = await import('@/lib/services/siigo');
      await SiigoSyncService.syncProvider(providerId, user.tenantId);
    });

    return NextResponse.json(updatedProvider);
  } catch (error) {
    console.error('[PROVIDER_PUT]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar proveedor específico
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

    if (!canManageProviders(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const providerId = id;
    if (!providerId) {
      return NextResponse.json(
        { error: 'ID de proveedor inválido' },
        { status: 400 }
      );
    }

    const existingProvider = await tenantPrisma.provider.findUnique({
      where: {
        id: providerId,
      },
    });

    if (!existingProvider) {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    // Soft delete - cambiar status a INACTIVE
    await tenantPrisma.provider.update({
      where: {
        id: providerId,
      },
      data: {
        status: 'INACTIVE',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Proveedor desactivado',
    });
  } catch (error) {
    console.error('[PROVIDER_DELETE]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

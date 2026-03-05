import { requireCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { canManageProviders } from '@/lib/permissions';

export const maxDuration = 60;

export async function GET() {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const providers = await tenantPrisma.provider.findMany({
      where: {
        status: 'ACTIVE',
      },
      orderBy: {
        name: 'asc',
      },
    });
    return NextResponse.json(providers);
  } catch (error) {
    console.error('[PROVIDERS_GET]', error);
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

    if (!canManageProviders(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
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

    // Verificar que no exista un proveedor con el mismo nombre
    const existingProvider = await tenantPrisma.provider.findFirst({
      where: {
        name: name.trim(),
      },
    });

    if (existingProvider) {
      return NextResponse.json(
        { error: 'Ya existe un proveedor con este nombre' },
        { status: 409 }
      );
    }

    const provider = await tenantPrisma.provider.create({
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
        vatResponsible: vatResponsible ?? false,
      },
    });

    const { after } = await import('next/server');
    after(async () => {
      const { SiigoSyncService } = await import('@/lib/services/siigo');
      await SiigoSyncService.syncProvider(provider.id, user.tenantId);
    });

    return NextResponse.json(provider, { status: 201 });
  } catch (error) {
    console.error('[PROVIDER_POST]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}


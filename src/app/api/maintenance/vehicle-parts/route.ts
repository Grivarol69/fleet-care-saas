import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { requireMasterDataMutationPermission } from '@/lib/permissions';

/**
 * GET /api/maintenance/vehicle-parts
 * Lista MantItemVehiclePart con filtros opcionales.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const mantItemId = searchParams.get('mantItemId');
    const vehicleBrandId = searchParams.get('vehicleBrandId');
    const vehicleLineId = searchParams.get('vehicleLineId');

    const where: Record<string, unknown> = {
      OR: [{ isGlobal: true }, { tenantId: user.tenantId }],
    };

    if (mantItemId) where.mantItemId = parseInt(mantItemId);
    if (vehicleBrandId) where.vehicleBrandId = parseInt(vehicleBrandId);
    if (vehicleLineId) where.vehicleLineId = parseInt(vehicleLineId);

    const items = await prisma.mantItemVehiclePart.findMany({
      where,
      include: {
        mantItem: { select: { id: true, name: true, type: true } },
        vehicleBrand: { select: { id: true, name: true } },
        vehicleLine: { select: { id: true, name: true } },
        masterPart: { select: { id: true, code: true, description: true } },
      },
      orderBy: [
        { vehicleBrand: { name: 'asc' } },
        { vehicleLine: { name: 'asc' } },
        { yearFrom: 'asc' },
      ],
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('[VEHICLE_PARTS_GET]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

/**
 * POST /api/maintenance/vehicle-parts
 * Crear nuevo vínculo MantItem + vehículo → MasterPart.
 * OWNER/MANAGER para tenant, SUPER_ADMIN para global.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await req.json();
    const {
      mantItemId,
      vehicleBrandId,
      vehicleLineId,
      yearFrom,
      yearTo,
      masterPartId,
      alternativePartNumbers,
      notes,
      quantity,
      isGlobal,
    } = body;

    if (!mantItemId || !vehicleBrandId || !vehicleLineId || !masterPartId) {
      return NextResponse.json(
        {
          error:
            'mantItemId, vehicleBrandId, vehicleLineId y masterPartId son requeridos',
        },
        { status: 400 }
      );
    }

    // Validar permisos según isGlobal
    const itemScope = {
      isGlobal: isGlobal || false,
      tenantId: isGlobal ? null : user.tenantId,
    };

    try {
      requireMasterDataMutationPermission(user, itemScope);
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 403 }
      );
    }

    // Verificar que MantItem existe
    const mantItem = await prisma.mantItem.findFirst({
      where: {
        id: mantItemId,
        OR: [{ isGlobal: true }, { tenantId: user.tenantId }],
      },
    });
    if (!mantItem) {
      return NextResponse.json(
        { error: 'MantItem no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que MasterPart existe
    const masterPart = await prisma.masterPart.findUnique({
      where: { id: masterPartId },
    });
    if (!masterPart) {
      return NextResponse.json(
        { error: 'MasterPart no encontrado' },
        { status: 404 }
      );
    }

    // Verificar duplicados
    const existing = await prisma.mantItemVehiclePart.findFirst({
      where: {
        mantItemId,
        vehicleBrandId,
        vehicleLineId,
        yearFrom: yearFrom || null,
        masterPartId,
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'Ya existe un vínculo para esta combinación' },
        { status: 409 }
      );
    }

    const created = await prisma.mantItemVehiclePart.create({
      data: {
        tenantId: isGlobal ? null : user.tenantId,
        isGlobal: isGlobal || false,
        mantItemId,
        vehicleBrandId,
        vehicleLineId,
        yearFrom: yearFrom || null,
        yearTo: yearTo || null,
        masterPartId,
        alternativePartNumbers: alternativePartNumbers?.trim() || null,
        notes: notes?.trim() || null,
        quantity: quantity || 1,
      },
      include: {
        mantItem: { select: { id: true, name: true, type: true } },
        vehicleBrand: { select: { id: true, name: true } },
        vehicleLine: { select: { id: true, name: true } },
        masterPart: { select: { id: true, code: true, description: true } },
      },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error('[VEHICLE_PARTS_POST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

import { prisma } from '@/lib/prisma';
import { requireCurrentUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { requireMasterDataMutationPermission } from '@/lib/permissions';

/**
 * GET /api/maintenance/vehicle-parts
 * Lista MantItemVehiclePart con filtros opcionales.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const mantItemId = searchParams.get('mantItemId');
    const vehicleBrandId = searchParams.get('vehicleBrandId');
    const vehicleLineId = searchParams.get('vehicleLineId');

    const where: Record<string, unknown> = {
      OR: [{ isGlobal: true }, { tenantId: user.tenantId }],
    };

    if (mantItemId) where.mantItemId = mantItemId;
    if (vehicleBrandId) where.vehicleBrandId = vehicleBrandId;
    if (vehicleLineId) where.vehicleLineId = vehicleLineId;

    const items = await tenantPrisma.mantItemVehiclePart.findMany({
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
        { isGlobal: 'asc' }, // ensures tenant overrides (false) come before global (true) in sorting
      ],
    });

    // Deduplication Map: key -> mantItemId_brandId_lineId
    // We want to keep the tenant specific (isGlobal: false) version over the global one.
    // Since we ordered by `isGlobal: 'asc'`, tenant-specific items (false) are processed first.
    const map = new Map();

    items.forEach(item => {
      // Create a unique key for the relation (excluding the specific masterPartId to allow overriding the part itself)
      const key = `${item.mantItemId}_${item.vehicleBrandId}_${item.vehicleLineId}_${item.yearFrom || 'all'}`;

      if (!map.has(key)) {
        map.set(key, item);
      } else {
        // If the map already has it, we only replace it if the stored one is Global and the new one is Tenant
        const existing = map.get(key);
        if (existing.isGlobal && !item.isGlobal) {
          map.set(key, item);
        }
      }
    });

    const deduplicatedItems = Array.from(map.values());

    return NextResponse.json(deduplicatedItems);
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
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    const masterPart = await tenantPrisma.masterPart.findUnique({
      where: { id: masterPartId },
    });
    if (!masterPart) {
      return NextResponse.json(
        { error: 'MasterPart no encontrado' },
        { status: 404 }
      );
    }

    // Verificar duplicados
    const existing = await tenantPrisma.mantItemVehiclePart.findFirst({
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

    const created = await tenantPrisma.mantItemVehiclePart.create({
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

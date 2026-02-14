import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/maintenance/vehicle-parts/suggest?mantItemId=X&vehicleId=Y
 *
 * Dado un MantItem y un Vehículo, busca en MantItemVehiclePart
 * el repuesto específico por marca + línea + año del vehículo.
 * Retorna global + tenant-specific.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = req.nextUrl;
    const mantItemId = parseInt(searchParams.get('mantItemId') || '');
    const vehicleId = parseInt(searchParams.get('vehicleId') || '');

    if (isNaN(mantItemId) || isNaN(vehicleId)) {
      return NextResponse.json(
        { error: 'mantItemId y vehicleId son requeridos' },
        { status: 400 }
      );
    }

    // Obtener datos del vehículo
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, tenantId: user.tenantId },
      select: { brandId: true, lineId: true, year: true },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 404 }
      );
    }

    // Buscar repuestos específicos para este MantItem + vehículo
    const suggestions = await prisma.mantItemVehiclePart.findMany({
      where: {
        mantItemId,
        vehicleBrandId: vehicle.brandId,
        vehicleLineId: vehicle.lineId,
        OR: [{ isGlobal: true }, { tenantId: user.tenantId }],
        // Filtro de año: yearFrom <= year AND (yearTo >= year OR yearTo IS NULL)
        AND: [
          {
            OR: [{ yearFrom: null }, { yearFrom: { lte: vehicle.year } }],
          },
          {
            OR: [{ yearTo: null }, { yearTo: { gte: vehicle.year } }],
          },
        ],
      },
      include: {
        masterPart: {
          select: {
            id: true,
            code: true,
            description: true,
            category: true,
            unit: true,
            referencePrice: true,
          },
        },
        mantItem: {
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: [
        { isGlobal: 'asc' }, // Tenant-specific primero
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({
      vehicleBrandId: vehicle.brandId,
      vehicleLineId: vehicle.lineId,
      vehicleYear: vehicle.year,
      suggestions: suggestions.map(s => ({
        id: s.id,
        masterPart: s.masterPart,
        quantity: s.quantity,
        alternativePartNumbers: s.alternativePartNumbers,
        notes: s.notes,
        isGlobal: s.isGlobal,
        yearFrom: s.yearFrom,
        yearTo: s.yearTo,
      })),
      hasSuggestions: suggestions.length > 0,
    });
  } catch (error) {
    console.error('[VEHICLE_PARTS_SUGGEST]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

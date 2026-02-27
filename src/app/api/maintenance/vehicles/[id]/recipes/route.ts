import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET - List available Corrective Maintenace Recipes (Packages with null triggerKm)
 * applicable to this vehicle (based on Brand/Line Templates).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { id } = await params;
    const vehicleId = id;
    if (!vehicleId) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // 1. Get Vehicle Info (Brand/Line)
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId, tenantId: user.tenantId },
      include: { brand: true, line: true },
    });

    if (!vehicle) {
      return new NextResponse('Vehicle not found', { status: 404 });
    }

    // 2. Find Templates for this Brand/Line
    // (Matching Brand/Line OR IsGlobal)
    // Actually templates are usually specific to Brand/Line.

    const templates = await prisma.maintenanceTemplate.findMany({
      where: {
        vehicleBrandId: vehicle.brandId,
        vehicleLineId: vehicle.lineId,
        status: 'ACTIVE',
        OR: [{ tenantId: user.tenantId }, { tenantId: null, isGlobal: true }],
      },
      include: {
        packages: {
          where: {
            triggerKm: null, // ONLY Corrective (Recipes)
            status: 'ACTIVE',
          },
          include: {
            packageItems: {
              include: {
                mantItem: true,
              },
            },
          },
        },
      },
    });

    // 3. Flatten and Extract Packages
    const recipes = templates.flatMap(t =>
      t.packages.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        templateName: t.name,
        estimatedCost: p.estimatedCost,
        estimatedTime: p.estimatedTime,
        itemsCount: p.packageItems.length,
        isGlobal: t.isGlobal,
        items: p.packageItems.map(pi => ({
          id: pi.mantItemId,
          name: pi.mantItem.name,
          quantity: 1, // Package Items don't imply quantity in this schema, default to 1
        })),
      }))
    );

    return NextResponse.json(recipes);
  } catch (error) {
    console.error('[VEHICLE_RECIPES_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

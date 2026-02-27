import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const vehicleIdParam = searchParams.get('vehicleId');
    const category = searchParams.get('category'); // Optional filter

    if (!vehicleIdParam) {
      return new NextResponse('Missing vehicleId', { status: 400 });
    }

    const vehicleId = vehicleIdParam;
    if (!vehicleId) {
      return new NextResponse('Invalid vehicleId', { status: 400 });
    }

    // 1. Get Vehicle Specs
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: { brand: true, line: true },
    });

    if (!vehicle) {
      return new NextResponse('Vehicle not found', { status: 404 });
    }

    // 2. Find Compatible Parts
    // We look for PartCompatibility entries that match the vehicle specs OR are generic (nulls)
    // AND belong to proper MasterParts (optionally filtered by category)

    // Note: Filtering by 'brand/model' strings in Compatibility table requires
    // ensuring data consistency between VehicleBrand.name and PartCompatibility.brand.
    // Ideally we would use IDs, but the schema uses Strings for flexibility (aftermarket catalogs often use strings).
    // We will do a best-effort string match.

    const brandName = vehicle.brand.name;
    const modelName = vehicle.line.name;
    const year = vehicle.year;

    const compatibleParts = await prisma.masterPart.findMany({
      where: {
        OR: [{ tenantId: user.tenantId }, { tenantId: null }],
        isActive: true,
        ...(category ? { category } : {}), // Apply category filter if present
        compatibilities: {
          some: {
            AND: [
              {
                OR: [
                  { brand: null },
                  { brand: { equals: brandName, mode: 'insensitive' } },
                ],
              },
              {
                OR: [
                  { model: null },
                  { model: { contains: modelName, mode: 'insensitive' } },
                ],
              },
              {
                OR: [{ yearFrom: null }, { yearFrom: { lte: year } }],
              },
              {
                OR: [{ yearTo: null }, { yearTo: { gte: year } }],
              },
            ],
          },
        },
      },
      include: {
        compatibilities: {
          where: {
            // Include the specific compatibility info helping the user see WHY it fits
            OR: [
              { brand: { equals: brandName, mode: 'insensitive' } },
              { model: { contains: modelName, mode: 'insensitive' } },
              { brand: null, model: null }, // Generics
            ],
          },
        },
      },
      take: 20,
    });

    return NextResponse.json(compatibleParts);
  } catch (error) {
    console.error('[PARTS_RECOMMENDATION]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

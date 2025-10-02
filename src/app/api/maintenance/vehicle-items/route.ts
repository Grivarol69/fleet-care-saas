import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const TENANT_ID = 'mvp-default-tenant';

// GET - Obtener items de mantenimiento
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get('vehicleId');
    const packageId = searchParams.get('packageId');
    const mantType = searchParams.get('mantType');
    const status = searchParams.get('status');

    const whereClause: any = {
      tenantId: TENANT_ID
    };

    // Filtros opcionales
    if (packageId) {
      whereClause.packageId = parseInt(packageId);
    }

    if (vehicleId) {
      whereClause.package = {
        program: {
          vehicleId: parseInt(vehicleId)
        }
      };
    }

    if (mantType) {
      whereClause.mantType = mantType;
    }

    if (status) {
      whereClause.status = status;
    }

    const items = await prisma.vehicleMantItem.findMany({
      where: whereClause,
      include: {
        package: {
          include: {
            program: {
              include: {
                vehicle: {
                  include: {
                    brand: true,
                    line: true
                  }
                }
              }
            }
          }
        },
        mantItem: true,
        technician: true,
        provider: true
      },
      orderBy: [
        { status: 'asc' },
        { scheduledKm: 'asc' },
        { priority: 'desc' }
      ]
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("[VEHICLE_MANT_ITEMS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST - Crear item de mantenimiento correctivo
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      vehicleId,
      mantItemId,
      mantType = 'CORRECTIVE',
      priority = 'MEDIUM',
      detectedKm,
      scheduledKm,
      description,
      urgency = false,
      technicianId,
      providerId
    } = body;

    // Obtener el programa del vehículo
    const program = await prisma.vehicleMantProgram.findUnique({
      where: { vehicleId: vehicleId },
      include: {
        packages: {
          where: {
            packageType: mantType
          }
        }
      }
    });

    if (!program) {
      return new NextResponse("Vehicle doesn't have an active maintenance program", { status: 404 });
    }

    // Buscar o crear package para este tipo de mantenimiento
    let targetPackage = program.packages.find(p => p.packageType === mantType);

    if (!targetPackage) {
      // Crear package automáticamente si no existe
      const packageName = mantType === 'CORRECTIVE' ? 'Items Mantenimiento Correctivo' :
                         mantType === 'PREDICTIVE' ? 'Items Mantenimiento Predictivo' :
                         'Items Mantenimiento Preventivo';

      targetPackage = await prisma.vehicleMantPackage.create({
        data: {
          tenantId: TENANT_ID,
          programId: program.id,
          name: packageName,
          description: `Package automático para mantenimientos ${mantType.toLowerCase()}`,
          triggerKm: mantType === 'PREVENTIVE' ? scheduledKm : null,
          packageType: mantType as any,
          priority: priority as any,
          status: 'PENDING'
        }
      });
    }

    // Obtener datos del MantItem
    const mantItem = await prisma.mantItem.findUnique({
      where: { id: mantItemId }
    });

    if (!mantItem) {
      return new NextResponse("Maintenance item not found", { status: 404 });
    }

    // Crear el VehicleMantItem
    const vehicleItem = await prisma.vehicleMantItem.create({
      data: {
        tenantId: TENANT_ID,
        packageId: targetPackage.id,
        mantItemId: mantItemId,
        mantType: mantType as any,
        priority: priority as any,
        scheduledKm: scheduledKm,
        detectedKm: detectedKm,
        detectedDate: mantType === 'CORRECTIVE' ? new Date() : null,
        estimatedCost: mantItem.estimatedCost,
        estimatedTime: mantItem.estimatedTime,
        description: description,
        urgency: urgency,
        technicianId: technicianId,
        providerId: providerId,
        status: 'PENDING'
      }
    });

    // Retornar el item creado con todas las relaciones
    const createdItem = await prisma.vehicleMantItem.findUnique({
      where: { id: vehicleItem.id },
      include: {
        package: {
          include: {
            program: {
              include: {
                vehicle: {
                  include: {
                    brand: true,
                    line: true
                  }
                }
              }
            }
          }
        },
        mantItem: true,
        technician: true,
        provider: true
      }
    });

    return NextResponse.json(createdItem);
  } catch (error) {
    console.error("[VEHICLE_MANT_ITEMS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
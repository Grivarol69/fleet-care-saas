import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const TENANT_ID = 'cf68b103-12fd-4208-a352-42379ef3b6e1';

// GET - Obtener programas de mantenimiento para un vehículo o todos
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get('vehicleId');

    const whereClause = {
      tenantId: TENANT_ID,
      ...(vehicleId && { vehicleId: parseInt(vehicleId) })
    };

    const programs = await prisma.vehicleMantProgram.findMany({
      where: whereClause,
      include: {
        vehicle: {
          include: {
            brand: true,
            line: true
          }
        },
        packages: {
          include: {
            items: {
              include: {
                mantItem: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(programs);
  } catch (error) {
    console.error("[VEHICLE_MANT_PROGRAMS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST - Crear programa de mantenimiento basado en template
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { vehicleId, templateId, assignmentKm, generatedBy } = body;

    // Validar que el vehículo no tenga ya un programa activo
    const existingProgram = await prisma.vehicleMantProgram.findUnique({
      where: { vehicleId: vehicleId }
    });

    if (existingProgram) {
      return new NextResponse("Vehicle already has an active maintenance program", { status: 400 });
    }

    // Obtener el template con sus packages e items
    const template = await prisma.maintenanceTemplate.findUnique({
      where: { id: templateId },
      include: {
        packages: {
          include: {
            packageItems: {
              include: {
                mantItem: true
              }
            }
          }
        },
        brand: true,
        line: true
      }
    });

    if (!template) {
      return new NextResponse("Template not found", { status: 404 });
    }

    // Obtener datos del vehículo
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        brand: true,
        line: true
      }
    });

    if (!vehicle) {
      return new NextResponse("Vehicle not found", { status: 404 });
    }

    // Crear el programa de mantenimiento en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear VehicleMantProgram
      const program = await tx.vehicleMantProgram.create({
        data: {
          tenantId: TENANT_ID,
          vehicleId: vehicleId,
          name: `Programa ${vehicle.brand.name} ${vehicle.line.name} ${vehicle.licensePlate}`,
          description: `Generado desde template: ${template.name}`,
          generatedFrom: `Template: ${template.name} v${template.version}`,
          generatedBy: generatedBy,
          assignmentKm: assignmentKm,
          nextMaintenanceKm: null, // Se calculará después
          isActive: true,
          status: 'ACTIVE'
        }
      });

      // 2. Crear VehicleMantPackages y sus items
      for (const templatePackage of template.packages) {
        // Calcular kilómetraje programado específico para este vehículo
        const scheduledKm = assignmentKm + templatePackage.triggerKm;

        const vehiclePackage = await tx.vehicleProgramPackage.create({
          data: {
            tenantId: TENANT_ID,
            programId: program.id,
            name: templatePackage.name,
            description: templatePackage.description,
            triggerKm: templatePackage.triggerKm,
            packageType: templatePackage.packageType,
            priority: templatePackage.priority,
            estimatedCost: templatePackage.estimatedCost,
            estimatedTime: templatePackage.estimatedTime,
            scheduledKm: scheduledKm,
            status: 'PENDING'
          }
        });

        // 3. Crear VehicleProgramItems para cada item del package
        for (const packageItem of templatePackage.packageItems) {
          await tx.vehicleProgramItem.create({
            data: {
              tenantId: TENANT_ID,
              packageId: vehiclePackage.id,
              mantItemId: packageItem.mantItemId,
              mantType: packageItem.mantItem.mantType,
              priority: templatePackage.priority,
              order: packageItem.order,
              scheduledKm: scheduledKm,

              // ✅ Heredar tiempo universal desde PackageItem
              estimatedTime: packageItem.estimatedTime,

              // ✅ Costo local (inicialmente null, se calculará con precios locales)
              estimatedCost: null,

              // ✅ Notas locales (usuario puede agregar después)
              localNotes: null,

              isOptional: packageItem.isOptional,
              status: 'PENDING'
            }
          });
        }
      }

      // 4. Crear package para mantenimientos correctivos
      await tx.vehicleProgramPackage.create({
        data: {
          tenantId: TENANT_ID,
          programId: program.id,
          name: "Items Mantenimiento Correctivo",
          description: "Package automático para mantenimientos correctivos",
          triggerKm: null, // No tiene trigger específico
          packageType: 'CORRECTIVE',
          priority: 'MEDIUM',
          status: 'PENDING'
        }
      });

      return program;
    });

    // Obtener el programa completo creado
    const createdProgram = await prisma.vehicleMantProgram.findUnique({
      where: { id: result.id },
      include: {
        vehicle: {
          include: {
            brand: true,
            line: true
          }
        },
        packages: {
          include: {
            items: {
              include: {
                mantItem: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(createdProgram);
  } catch (error) {
    console.error("[VEHICLE_MANT_PROGRAMS_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
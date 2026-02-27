import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { canManageMaintenancePrograms } from '@/lib/permissions';

// GET - Obtener programas de mantenimiento para un vehículo o todos
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const vehicleId = searchParams.get('vehicleId');

    const whereClause = {
      tenantId: user.tenantId,
      ...(vehicleId && { vehicleId: vehicleId }),
    };

    const programs = await prisma.vehicleMantProgram.findMany({
      where: whereClause,
      include: {
        vehicle: {
          include: {
            brand: true,
            line: true,
          },
        },
        packages: {
          include: {
            items: {
              include: {
                mantItem: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(programs);
  } catch (error) {
    console.error('[VEHICLE_MANT_PROGRAMS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Infiere qué paquete del template corresponde al km ejecutado
 * Usa una tolerancia de ±500km para encontrar el match más cercano
 */
function inferPackageFromKm<T extends { triggerKm: number | null }>(
  executedKm: number,
  templatePackages: T[]
): T | null {
  const TOLERANCE = 500; // ±500 km de tolerancia

  // Filter only packages with triggerKm (Preventive)
  const candidates = templatePackages.filter(p => p.triggerKm !== null);

  if (candidates.length === 0) return null;

  // Buscar paquete más cercano
  const closest = candidates.reduce((prev, curr) => {
    // We cast to number because we filtered out nulls
    const prevDiff = Math.abs((prev.triggerKm as number) - executedKm);
    const currDiff = Math.abs((curr.triggerKm as number) - executedKm);
    return currDiff < prevDiff ? curr : prev;
  });

  const diff = Math.abs((closest.triggerKm as number) - executedKm);

  if (diff <= TOLERANCE) {
    return closest;
  }

  return null; // No se puede inferir
}

/**
 * Filtra solo los paquetes que están DESPUÉS del último paquete ejecutado
 */
function filterFuturePackages<T extends { triggerKm: number | null }>(
  templatePackages: T[],
  lastPackageKm: number
): T[] {
  return templatePackages
    .filter(pkg => pkg.triggerKm !== null && pkg.triggerKm > lastPackageKm)
    .sort((a, b) => (a.triggerKm as number) - (b.triggerKm as number));
}

// ========================================
// POST - Crear programa de mantenimiento basado en template
// ========================================
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!canManageMaintenancePrograms(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const body = await req.json();
    console.log('[DEBUG] Payload recibido:', JSON.stringify(body, null, 2));
    const {
      vehicleId,
      templateId,
      generatedBy,
      vehicleType = 'new',
      lastMaintenance,
    } = body;

    // Validar que el vehículo no tenga ya un programa activo
    const existingProgram = await prisma.vehicleMantProgram.findUnique({
      where: { vehicleId: vehicleId },
    });

    if (existingProgram) {
      return new NextResponse(
        'Vehicle already has an active maintenance program',
        { status: 400 }
      );
    }

    // Obtener el template con sus packages e items
    const template = await prisma.maintenanceTemplate.findUnique({
      where: { id: templateId },
      include: {
        packages: {
          include: {
            packageItems: {
              include: {
                mantItem: true,
              },
            },
          },
        },
        brand: true,
        line: true,
      },
    });

    if (!template) {
      return new NextResponse('Template not found', { status: 404 });
    }

    // Obtener datos del vehículo
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId, tenantId: user.tenantId },
      include: {
        brand: true,
        line: true,
      },
    });

    if (!vehicle) {
      return new NextResponse('Vehicle not found', { status: 404 });
    }

    // ========================================
    // LÓGICA DE FILTRADO DE PAQUETES
    // ========================================
    let packagesToAssign = template.packages;
    let lastMaintenancePackageKm = 0;

    if (vehicleType === 'used' && lastMaintenance?.executedKm) {
      // Vehículo usado: inferir paquete y filtrar solo futuros
      const inferredPackage = inferPackageFromKm(
        lastMaintenance.executedKm,
        template.packages
      );

      if (!inferredPackage) {
        return new NextResponse(
          `No se pudo inferir el paquete del último mantenimiento. Kilometraje ${lastMaintenance.executedKm} no coincide con ningún paquete del template (tolerancia ±500km)`,
          { status: 400 }
        );
      }

      lastMaintenancePackageKm = inferredPackage.triggerKm ?? 0;
      packagesToAssign = filterFuturePackages(
        template.packages,
        lastMaintenancePackageKm
      );

      if (packagesToAssign.length === 0) {
        return new NextResponse(
          `No hay paquetes futuros para asignar. El último paquete ejecutado fue de ${lastMaintenancePackageKm} km y es el último disponible en el template.`,
          { status: 400 }
        );
      }
    }
    // Si es vehículo nuevo (vehicleType === "new"), se asignan TODOS los paquetes

    // Crear el programa de mantenimiento en una transacción
    const result = await prisma.$transaction(async tx => {
      // 1. Crear VehicleMantProgram
      const program = await tx.vehicleMantProgram.create({
        data: {
          tenantId: user.tenantId,
          vehicleId: vehicleId,
          name: `Programa ${vehicle.brand.name} ${vehicle.line.name} ${vehicle.licensePlate}`,
          description:
            vehicleType === 'used'
              ? `Generado desde template: ${template.name} (último paquete: ${lastMaintenancePackageKm} km)`
              : `Generado desde template: ${template.name}`,
          generatedFrom: `Template: ${template.name} v${template.version}`,
          generatedBy: generatedBy,
          assignmentKm: vehicle.mileage, // Usar kilometraje actual del vehículo
          nextMaintenanceKm: null, // Se calculará después
          isActive: true,
          status: 'ACTIVE',
        },
      });

      // 2. Crear VehicleMantPackages y sus items (SOLO paquetes filtrados)
      for (const templatePackage of packagesToAssign) {
        // Usar el trigger del template directamente (NO sumar al km actual)
        const scheduledKm = templatePackage.triggerKm;

        const vehiclePackage = await tx.vehicleProgramPackage.create({
          data: {
            tenantId: user.tenantId,
            programId: program.id,
            name: templatePackage.name,
            description: templatePackage.description,
            triggerKm: templatePackage.triggerKm,
            packageType: templatePackage.packageType,
            priority: templatePackage.priority,
            estimatedCost: templatePackage.estimatedCost,
            estimatedTime: templatePackage.estimatedTime,
            scheduledKm: scheduledKm,
            status: 'PENDING',
          },
        });

        // 3. Crear VehicleProgramItems para cada item del package
        for (const packageItem of templatePackage.packageItems) {
          await tx.vehicleProgramItem.create({
            data: {
              tenantId: user.tenantId,
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
              status: 'PENDING',
            },
          });
        }
      }

      // 4. Crear package para mantenimientos correctivos
      await tx.vehicleProgramPackage.create({
        data: {
          tenantId: user.tenantId,
          programId: program.id,
          name: 'Items Mantenimiento Correctivo',
          description: 'Package automático para mantenimientos correctivos',
          triggerKm: null, // No tiene trigger específico
          packageType: 'CORRECTIVE',
          priority: 'MEDIUM',
          status: 'PENDING',
        },
      });

      // 5. Si es vehículo usado y hay datos del último mantenimiento,
      //    crear WorkOrder histórica y marcar items como COMPLETED
      if (
        vehicleType === 'used' &&
        lastMaintenance?.executedKm &&
        lastMaintenancePackageKm > 0
      ) {
        // Buscar el paquete que corresponde al último mantenimiento
        const historicalPackage = await tx.vehicleProgramPackage.findFirst({
          where: {
            programId: program.id,
            triggerKm: lastMaintenancePackageKm,
          },
          include: {
            items: true,
          },
        });

        // Si NO existe el paquete histórico (porque fue filtrado por ser pasado),
        // necesitamos crearlo como COMPLETED
        if (!historicalPackage) {
          // Buscar el template package original
          const templatePackage = template.packages.find(
            pkg => pkg.triggerKm === lastMaintenancePackageKm
          );

          if (templatePackage) {
            const historicalVehiclePackage =
              await tx.vehicleProgramPackage.create({
                data: {
                  tenantId: user.tenantId,
                  programId: program.id,
                  name: templatePackage.name,
                  description: templatePackage.description,
                  triggerKm: templatePackage.triggerKm,
                  packageType: templatePackage.packageType,
                  priority: templatePackage.priority,
                  estimatedCost: templatePackage.estimatedCost,
                  estimatedTime: templatePackage.estimatedTime,
                  scheduledKm: lastMaintenancePackageKm,
                  status: 'COMPLETED', // Histórico
                },
              });

            // Crear los items del paquete histórico
            for (const packageItem of templatePackage.packageItems) {
              await tx.vehicleProgramItem.create({
                data: {
                  tenantId: user.tenantId,
                  packageId: historicalVehiclePackage.id,
                  mantItemId: packageItem.mantItemId,
                  mantType: packageItem.mantItem.mantType,
                  priority: templatePackage.priority,
                  order: packageItem.order,
                  scheduledKm: lastMaintenancePackageKm,
                  estimatedTime: packageItem.estimatedTime,
                  estimatedCost: null,
                  localNotes: 'Item histórico (previo al sistema)',
                  isOptional: packageItem.isOptional,
                  status: 'COMPLETED',
                  executedDate: lastMaintenance.executedDate
                    ? new Date(lastMaintenance.executedDate)
                    : new Date(),
                  executedKm: lastMaintenance.executedKm,
                },
              });
            }
          }
        } else {
          // Si el paquete existe, marcar sus items como COMPLETED
          await tx.vehicleProgramItem.updateMany({
            where: { packageId: historicalPackage.id },
            data: {
              status: 'COMPLETED',
              executedDate: lastMaintenance.executedDate
                ? new Date(lastMaintenance.executedDate)
                : new Date(),
              executedKm: lastMaintenance.executedKm,
              localNotes: 'Item histórico (previo al sistema)',
            },
          });

          await tx.vehicleProgramPackage.update({
            where: { id: historicalPackage.id },
            data: { status: 'COMPLETED' },
          });
        }

        // Opcional: Crear WorkOrder histórica para trazabilidad
        if (lastMaintenance.provider || lastMaintenance.cost) {
          await tx.workOrder.create({
            data: {
              tenantId: user.tenantId,
              vehicleId: vehicleId,
              mantType: 'PREVENTIVE', // fixed: matches enum
              status: 'COMPLETED',
              priority: 'MEDIUM',
              title: `Mantenimiento ${lastMaintenancePackageKm} km (Histórico)`,
              description:
                lastMaintenance.notes ||
                `Mantenimiento previo al sistema, ejecutado a los ${lastMaintenance.executedKm} km`,
              startDate: lastMaintenance.executedDate
                ? new Date(lastMaintenance.executedDate)
                : new Date(),
              creationMileage: vehicle.mileage, // fixed: required field
              // updated simplified properties
              estimatedCost: lastMaintenance.cost || 0,
              actualCost: lastMaintenance.cost || 0,
              requestedBy: generatedBy, // User ID who generated the program
            },
          });
        }
      }

      return program;
    });

    // Obtener el programa completo creado
    const createdProgram = await prisma.vehicleMantProgram.findUnique({
      where: { id: result.id },
      include: {
        vehicle: {
          include: {
            brand: true,
            line: true,
          },
        },
        packages: {
          include: {
            items: {
              include: {
                mantItem: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(createdProgram);
  } catch (error) {
    console.error('[VEHICLE_MANT_PROGRAMS_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

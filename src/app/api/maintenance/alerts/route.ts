import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const TENANT_ID = 'mvp-default-tenant';

export async function GET() {
  try {
    // Obtener items de mantenimiento con la nueva arquitectura VehicleMantProgram
    const maintenanceItems = await prisma.vehicleProgramItem.findMany({
      where: {
        tenantId: TENANT_ID,
        status: 'PENDING',
        package: {
          program: {
            status: 'ACTIVE',
            isActive: true
          }
        },
        scheduledKm: { not: null } // Solo items con kilómetraje programado
      },
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
        mantItem: true
      },
      orderBy: {
        scheduledKm: 'asc'
      }
    });

    // Transformar datos para el formato esperado por el componente
    const alerts = maintenanceItems.map((item) => {
      const vehicle = item.package.program.vehicle;
      const currentKm = vehicle.mileage;
      const executionKm = item.scheduledKm!; // Ya filtramos que no sea null
      const kmToMaintenance = executionKm - currentKm;
      
      // Determinar el estado basado en kilómetros restantes
      let state: "YELLOW" | "RED" = "YELLOW";
      if (kmToMaintenance <= 500) {
        state = "RED"; // Crítico: menos de 500 km
      } else if (kmToMaintenance <= 2000) {
        state = "YELLOW"; // Atención: menos de 2000 km
      }

      return {
        id: item.id,
        vehiclePlate: vehicle.licensePlate,
        photo: vehicle.photo || "https://utfs.io/f/ed8f2e8a-1265-4310-b086-1385aa133fc8-zbbdk9.jpg",
        brandName: vehicle.brand.name,
        lineName: vehicle.line.name,
        mantItemDescription: item.mantItem.name,
        currentKm: currentKm,
        executionKm: executionKm,
        kmToMaintenance: Math.max(0, kmToMaintenance), // No negativos
        state: state,
        status: "ACTIVE" as const
      };
    });

    // Filtrar solo alertas que requieren atención (próximas o vencidas)
    const filteredAlerts = alerts.filter(alert => alert.kmToMaintenance <= 3000);

    // Ordenar por urgencia (menos kilómetros restantes primero)
    const sortedAlerts = filteredAlerts.sort((a, b) => a.kmToMaintenance - b.kmToMaintenance);

    return NextResponse.json(sortedAlerts);
  } catch (error) {
    console.error("[MAINTENANCE_ALERTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Fetch all odometer logs for tenant
export async function GET() {
  try {
    // TODO: Get tenant from auth session
    // For now, we'll use the hardcoded tenant for MVP
    const tenantId = "mvp-default-tenant";

    const odometerLogs = await prisma.odometerLog.findMany({
      where: {
        vehicle: {
          tenantId: tenantId,
        },
      },
      include: {
        vehicle: {
          include: {
            brand: true,
            line: true,
            type: true,
          },
        },
        driver: true,
      },
      orderBy: {
        recordedAt: "desc",
      },
    });

    return NextResponse.json(odometerLogs);
  } catch (error) {
    console.error("[ODOMETER_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// POST - Create new odometer log
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vehicleId, driverId, kilometers, hours, measureType, recordedAt } = body;

    // TODO: Get tenant from auth session
    const tenantId = "mvp-default-tenant";

    // Validate vehicle belongs to tenant
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        tenantId: tenantId,
      },
    });

    if (!vehicle) {
      return new NextResponse("Vehicle not found or not accessible", { status: 404 });
    }

    // Validate driver belongs to tenant (if provided)
    if (driverId) {
      const driver = await prisma.driver.findFirst({
        where: {
          id: driverId,
          tenantId: tenantId,
        },
      });

      if (!driver) {
        return new NextResponse("Driver not found or not accessible", { status: 404 });
      }
    }

    // Validate measure value based on type
    if (measureType === "KILOMETERS" && !kilometers) {
      return new NextResponse("Kilometers value is required", { status: 400 });
    }
    if (measureType === "HOURS" && !hours) {
      return new NextResponse("Hours value is required", { status: 400 });
    }

    // Get last odometer reading for validation
    const lastReading = await prisma.odometerLog.findFirst({
      where: {
        vehicleId: vehicleId,
        measureType: measureType,
      },
      orderBy: {
        recordedAt: "desc",
      },
    });

    // Validate new reading is not less than previous
    if (lastReading) {
      const lastValue = measureType === "KILOMETERS" ? lastReading.kilometers : lastReading.hours;
      const newValue = measureType === "KILOMETERS" ? kilometers : hours;
      
      if (lastValue && newValue && newValue < lastValue) {
        return new NextResponse(
          `New ${measureType.toLowerCase()} reading cannot be less than previous reading (${lastValue})`, 
          { status: 400 }
        );
      }
    }

    // Create odometer log
    const odometerLog = await prisma.odometerLog.create({
      data: {
        vehicleId,
        driverId: driverId || null,
        kilometers: measureType === "KILOMETERS" ? kilometers : null,
        hours: measureType === "HOURS" ? hours : null,
        measureType,
        recordedAt: new Date(recordedAt),
      },
      include: {
        vehicle: {
          include: {
            brand: true,
            line: true,
            type: true,
          },
        },
        driver: true,
      },
    });

    // Update vehicle mileage if kilometers
    if (measureType === "KILOMETERS" && kilometers) {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: {
          mileage: kilometers,
          lastKilometers: kilometers,
          lastRecorder: new Date(recordedAt),
        },
      });
    }

    // Check for maintenance alerts
    await checkMaintenanceAlerts(vehicleId, measureType === "KILOMETERS" ? kilometers : null);

    return NextResponse.json(odometerLog, { status: 201 });
  } catch (error) {
    console.error("[ODOMETER_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// TODO: Refactorizar checkMaintenanceAlerts para usar VehicleMantProgram/VehicleProgramPackage/VehicleProgramItem
// Esta función está temporalmente deshabilitada hasta migrar a la nueva arquitectura
async function checkMaintenanceAlerts(_vehicleId: number, _kilometers: number | null) {
  if (!_kilometers) return;

  // TODO: Implementar con nueva arquitectura VehicleMantProgram
  return;

  /* DEPRECATED - Usar VehicleMantProgram en vez de vehicleMantPlan
  try {
    // Get active maintenance plans for this vehicle
    const vehicleMaintPlans = await prisma.vehicleMantProgram.findMany({
      where: {
        vehicleId: vehicleId,
        status: "ACTIVE",
      },
      include: {
        packages: {
          include: {
            items: {
              include: {
                mantItem: true,
              },
              where: {
                status: "PENDING",
              },
            }
          }
        }
      },
    });

    for (const plan of vehicleMaintPlans) {
      for (const pkg of plan.packages) {
        for (const item of pkg.items) {
        const kmToMaintenance = item.executionMileage - kilometers;

        // Determine alert level
        let alertLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
        if (kmToMaintenance <= 0) {
          alertLevel = "CRITICAL";
        } else if (kmToMaintenance <= 500) {
          alertLevel = "HIGH";
        } else if (kmToMaintenance <= 1000) {
          alertLevel = "MEDIUM";
        } else {
          alertLevel = "LOW";
        }

        // Only create alerts for non-low levels
        if (alertLevel !== "LOW") {
          // Check if alert already exists
          const existingAlert = await prisma.maintenanceAlert.findFirst({
            where: {
              vehicleId: vehicleId,
              mantItemDescription: item.mantItem.name,
              executionKm: item.executionMileage,
              status: "ACTIVE",
            },
          });

          if (!existingAlert) {
            await prisma.maintenanceAlert.create({
              data: {
                vehicleId: vehicleId,
                mantItemDescription: item.mantItem.name,
                currentKm: kilometers,
                executionKm: item.executionMileage,
                kmToMaintenance: kmToMaintenance,
                alertLevel: alertLevel,
                status: "ACTIVE",
              },
            });
          } else {
            // Update existing alert
            await prisma.maintenanceAlert.update({
              where: { id: existingAlert.id },
              data: {
                currentKm: kilometers,
                kmToMaintenance: kmToMaintenance,
                alertLevel: alertLevel,
              },
            });
          }
        }
        }
      }
    }

    // Update last km check on plan
    await prisma.vehicleMantProgram.update({
      where: { id: plan.id },
      data: { lastKmCheck: kilometers },
    });
  } catch (error) {
    console.error("Error checking maintenance alerts:", error);
    // Don't throw error here, just log it
  }
  */
}
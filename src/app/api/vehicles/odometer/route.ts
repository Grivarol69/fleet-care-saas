import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MaintenanceAlertService } from "@/lib/services/MaintenanceAlertService";
import { getCurrentUser } from '@/lib/auth';

// GET - Fetch all odometer logs for tenant
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const odometerLogs = await prisma.odometerLog.findMany({
      where: {
        vehicle: {
          tenantId: user.tenantId,
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
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await request.json();
    const { vehicleId, driverId, kilometers, hours, measureType, recordedAt } = body;

    // Validate vehicle belongs to tenant
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        tenantId: user.tenantId,
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
          tenantId: user.tenantId,
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

    // Check for maintenance alerts (trigger automático)
    if (measureType === "KILOMETERS" && kilometers) {
      await checkMaintenanceAlerts(vehicleId, kilometers, user.tenantId);
    }

    return NextResponse.json(odometerLog, { status: 201 });
  } catch (error) {
    console.error("[ODOMETER_POST]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

/**
 * Verifica y genera alertas de mantenimiento automáticamente
 * cuando se actualiza el odómetro del vehículo
 */
async function checkMaintenanceAlerts(vehicleId: number, kilometers: number, tenantId: string) {
  try {
    await MaintenanceAlertService.checkAndGenerateAlerts(vehicleId, kilometers, tenantId);
  } catch (error) {
    console.error("[ODOMETER] Error checking maintenance alerts:", error);
    // No lanzar error para no bloquear el guardado del odómetro
  }
}
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - Fetch specific odometer log
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return new NextResponse("Invalid ID", { status: 400 });
    }

    // TODO: Get tenant from auth session
    const tenantId = "cf68b103-12fd-4208-a352-42379ef3b6e1";

    const odometerLog = await prisma.odometerLog.findFirst({
      where: {
        id: id,
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
    });

    if (!odometerLog) {
      return new NextResponse("Odometer log not found", { status: 404 });
    }

    return NextResponse.json(odometerLog);
  } catch (error) {
    console.error("[ODOMETER_GET_BY_ID]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// PUT - Update odometer log
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return new NextResponse("Invalid ID", { status: 400 });
    }

    const body = await request.json();
    const { vehicleId, driverId, kilometers, hours, measureType, recordedAt } = body;

    // TODO: Get tenant from auth session
    const tenantId = "cf68b103-12fd-4208-a352-42379ef3b6e1";

    // Verify odometer log exists and belongs to tenant
    const existingLog = await prisma.odometerLog.findFirst({
      where: {
        id: id,
        vehicle: {
          tenantId: tenantId,
        },
      },
    });

    if (!existingLog) {
      return new NextResponse("Odometer log not found", { status: 404 });
    }

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

    // Update odometer log
    const updatedLog = await prisma.odometerLog.update({
      where: { id: id },
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

    // Update vehicle mileage if this is the latest reading
    if (measureType === "KILOMETERS" && kilometers) {
      const latestReading = await prisma.odometerLog.findFirst({
        where: {
          vehicleId: vehicleId,
          measureType: "KILOMETERS",
        },
        orderBy: {
          recordedAt: "desc",
        },
      });

      if (latestReading && latestReading.id === id) {
        await prisma.vehicle.update({
          where: { id: vehicleId },
          data: {
            mileage: kilometers,
            lastKilometers: kilometers,
            lastRecorder: new Date(recordedAt),
          },
        });
      }
    }

    return NextResponse.json(updatedLog);
  } catch (error) {
    console.error("[ODOMETER_PUT]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

// DELETE - Delete odometer log
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return new NextResponse("Invalid ID", { status: 400 });
    }

    // TODO: Get tenant from auth session
    const tenantId = "cf68b103-12fd-4208-a352-42379ef3b6e1";

    // Verify odometer log exists and belongs to tenant
    const existingLog = await prisma.odometerLog.findFirst({
      where: {
        id: id,
        vehicle: {
          tenantId: tenantId,
        },
      },
    });

    if (!existingLog) {
      return new NextResponse("Odometer log not found", { status: 404 });
    }

    // Delete the log
    await prisma.odometerLog.delete({
      where: { id: id },
    });

    // Update vehicle mileage to the latest reading
    if (existingLog.measureType === "KILOMETERS" && existingLog.kilometers) {
      const latestReading = await prisma.odometerLog.findFirst({
        where: {
          vehicleId: existingLog.vehicleId,
          measureType: "KILOMETERS",
        },
        orderBy: {
          recordedAt: "desc",
        },
      });

      if (latestReading && latestReading.kilometers) {
        await prisma.vehicle.update({
          where: { id: existingLog.vehicleId },
          data: {
            mileage: latestReading.kilometers,
            lastKilometers: latestReading.kilometers,
            lastRecorder: latestReading.recordedAt,
          },
        });
      } else {
        // No more readings, reset to 0
        await prisma.vehicle.update({
          where: { id: existingLog.vehicleId },
          data: {
            mileage: 0,
            lastKilometers: 0,
            lastRecorder: null,
          },
        });
      }
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[ODOMETER_DELETE]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const TENANT_ID = "mvp-default-tenant";

/**
 * POST - Crear WorkOrder desde alertas de mantenimiento
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      vehicleId,
      alertIds,
      title,
      description,
      technicianId,
      providerId,
      scheduledDate,
      priority = 'MEDIUM',
    } = body;

    // Validaciones
    if (!vehicleId || !alertIds || alertIds.length === 0) {
      return NextResponse.json(
        { error: "vehicleId and alertIds are required" },
        { status: 400 }
      );
    }

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "title is required" },
        { status: 400 }
      );
    }

    // 1. Obtener las alertas seleccionadas
    const alerts = await prisma.maintenanceAlert.findMany({
      where: {
        id: { in: alertIds },
        status: { in: ['PENDING', 'ACKNOWLEDGED', 'SNOOZED'] },
        vehicleId,
      },
      include: {
        programItem: {
          include: {
            mantItem: true,
          },
        },
      },
    });

    if (alerts.length === 0) {
      return NextResponse.json(
        { error: "No valid alerts found" },
        { status: 404 }
      );
    }

    // 2. Calcular totales
    const estimatedCost = alerts.reduce(
      (sum, a) => sum + (a.estimatedCost?.toNumber() || 0),
      0
    );

    // 3. Obtener km actual del vehículo
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehicle not found" },
        { status: 404 }
      );
    }

    // 4. Crear WorkOrder
    const workOrder = await prisma.workOrder.create({
      data: {
        tenantId: TENANT_ID,
        vehicleId,
        title,
        description: description || null,
        mantType: 'PREVENTIVE',
        priority,
        status: 'PENDING',
        technicianId: technicianId ? parseInt(technicianId) : null,
        providerId: providerId ? parseInt(providerId) : null,
        creationMileage: vehicle.mileage,
        estimatedCost,
        requestedBy: "current-user-id", // TODO: Get from session
        startDate: scheduledDate ? new Date(scheduledDate) : null,
        isPackageWork: alerts.length > 1,
        packageName: alerts.length > 1 ? title : null,
      },
    });

    // 5. Actualizar alertas (vincular con WorkOrder y cambiar estado)
    const now = new Date();
    await prisma.maintenanceAlert.updateMany({
      where: { id: { in: alertIds } },
      data: {
        status: 'IN_PROGRESS',
        workOrderId: workOrder.id,
        workOrderCreatedAt: now,
        workOrderCreatedBy: "current-user-id",
        responseTimeMinutes: 0, // TODO: Calcular real
      },
    });

    // 6. Actualizar VehicleProgramItems
    const programItemIds = alerts.map((a) => a.programItemId);
    await prisma.vehicleProgramItem.updateMany({
      where: { id: { in: programItemIds } },
      data: { status: 'IN_PROGRESS' },
    });

    // 7. Crear WorkOrderItems
    await Promise.all(
      alerts.map((alert) =>
        prisma.workOrderItem.create({
          data: {
            workOrderId: workOrder.id,
            mantItemId: alert.programItem.mantItemId,
            description: alert.itemName,
            supplier: providerId ? "from-provider" : "N/A",
            unitPrice: alert.estimatedCost || 0,
            quantity: 1,
            totalCost: alert.estimatedCost || 0,
            purchasedBy: "current-user-id",
            status: 'PENDING',
          },
        })
      )
    );

    return NextResponse.json(workOrder, { status: 201 });
  } catch (error: unknown) {
    console.error("[WORK_ORDERS_POST]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Error",
      },
      { status: 500 }
    );
  }
}

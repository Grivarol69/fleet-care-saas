import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET - Listar WorkOrders con filtros
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get("vehicleId");
    const status = searchParams.get("status");
    const mantType = searchParams.get("mantType");
    const limit = searchParams.get("limit");

    // Construir filtros
    const where: any = {
      tenantId: user.tenantId,
    };

    if (vehicleId) {
      where.vehicleId = parseInt(vehicleId);
    }

    if (status) {
      where.status = status;
    }

    if (mantType) {
      where.mantType = mantType;
    }

    // Obtener WorkOrders con relaciones
    const workOrders = await prisma.workOrder.findMany({
      where,
      include: {
        vehicle: {
          select: {
            id: true,
            plate: true,
            brand: { select: { name: true } },
            line: { select: { name: true } },
          },
        },
        technician: {
          select: {
            id: true,
            name: true,
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
          },
        },
        maintenanceAlerts: {
          select: {
            id: true,
            itemName: true,
            status: true,
            priority: true,
          },
        },
        workOrderItems: {
          select: {
            id: true,
            description: true,
            totalCost: true,
            status: true,
          },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            totalAmount: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit ? parseInt(limit) : undefined,
    });

    return NextResponse.json(workOrders);
  } catch (error: unknown) {
    console.error("[WORK_ORDERS_GET]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Crear WorkOrder desde alertas de mantenimiento
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Validar permisos (OWNER, MANAGER pueden crear WO)
    const { canCreateWorkOrders } = await import("@/lib/permissions");
    if (!canCreateWorkOrders(user)) {
      return NextResponse.json(
        { error: "No tienes permisos para crear órdenes de trabajo" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      vehicleId,
      alertIds,
      title,
      description,
      technicianId,
      providerId,
      scheduledDate,
      priority = "MEDIUM",
      mantType = "PREVENTIVE",
    } = body;

    // Validaciones
    if (!vehicleId || !alertIds || alertIds.length === 0) {
      return NextResponse.json(
        { error: "vehicleId y alertIds son requeridos" },
        { status: 400 }
      );
    }

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: "El título es requerido" },
        { status: 400 }
      );
    }

    // 1. Obtener las alertas seleccionadas
    const alerts = await prisma.maintenanceAlert.findMany({
      where: {
        id: { in: alertIds },
        status: { in: ["PENDING", "ACKNOWLEDGED", "SNOOZED"] },
        vehicleId,
        tenantId: user.tenantId,
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
        { error: "No se encontraron alertas válidas" },
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
      where: { id: vehicleId, tenantId: user.tenantId },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehículo no encontrado" },
        { status: 404 }
      );
    }

    // 4. Crear WorkOrder
    const workOrder = await prisma.workOrder.create({
      data: {
        tenantId: user.tenantId,
        vehicleId,
        title,
        description: description || null,
        mantType,
        priority,
        status: "PENDING",
        technicianId: technicianId || null,
        providerId: providerId || null,
        creationMileage: vehicle.mileage,
        estimatedCost,
        requestedBy: user.id,
        startDate: scheduledDate ? new Date(scheduledDate) : null,
        isPackageWork: alerts.length > 1,
        packageName: alerts.length > 1 ? title : null,
      },
    });

    // 5. Actualizar alertas (vincular con WorkOrder y cambiar estado)
    const now = new Date();
    const alertCreatedAt = alerts[0].createdAt;
    const responseTimeMinutes = Math.floor(
      (now.getTime() - alertCreatedAt.getTime()) / (1000 * 60)
    );

    await prisma.maintenanceAlert.updateMany({
      where: { id: { in: alertIds } },
      data: {
        status: "IN_PROGRESS",
        workOrderId: workOrder.id,
        workOrderCreatedAt: now,
        workOrderCreatedBy: user.id,
        responseTimeMinutes,
      },
    });

    // 6. Actualizar VehicleProgramItems
    const programItemIds = alerts.map((a) => a.programItemId);
    await prisma.vehicleProgramItem.updateMany({
      where: { id: { in: programItemIds } },
      data: { status: "IN_PROGRESS" },
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
            purchasedBy: user.id,
            status: "PENDING",
          },
        })
      )
    );

    return NextResponse.json(workOrder, { status: 201 });
  } catch (error: unknown) {
    console.error("[WORK_ORDERS_POST]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error interno",
      },
      { status: 500 }
    );
  }
}

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

/**
 * GET - Obtener detalle de una WorkOrder específica
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log(`====== [GET WO] STARTING REQUEST ID: ${id} ======`);
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // const { id } = await params; (Removed, creating 'workOrderId' directly from existing 'id')
    const workOrderId = parseInt(id);

    const workOrder = await prisma.workOrder.findUnique({
      where: {
        id: workOrderId,
        tenantId: user.tenantId,
      },
      include: {
        vehicle: {
          select: {
            id: true,
            licensePlate: true,
            brand: { select: { name: true } },
            line: { select: { name: true } },
            mileage: true,
          },
        },
        technician: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        provider: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        maintenanceAlerts: {
          select: {
            id: true,
            itemName: true,
            status: true,
            priority: true,
            scheduledKm: true,
            estimatedCost: true,
          },
        },
        workOrderItems: {
          include: {
            mantItem: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            invoiceDate: true,
            totalAmount: true,
            status: true,
            supplier: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        workOrderExpenses: true,
        approvals: true,
      },
    });

    if (!workOrder) {
      return NextResponse.json(
        { error: "Orden de trabajo no encontrada" },
        { status: 404 }
      );
    }

    // FIX: Prisma Decimal/BigInt serialization issue in Next.js
    const serializedWorkOrder = JSON.parse(JSON.stringify(workOrder, (key, value) =>
      (typeof value === 'bigint' ? value.toString() : value)
    ));

    return NextResponse.json(serializedWorkOrder);

  } catch (error: unknown) {
    console.error("====== [GET WO] FATAL ERROR ======");
    console.error(error);

    try {
      const fs = require('fs');
      const path = require('path');
      const logPath = path.join(process.cwd(), 'debug_error_get_wo.log');
      const errorMsg = `
[${new Date().toISOString()}] FATAL ERROR IN GET /api/maintenance/work-orders/[id]
Params ID: ${await params.then(p => p.id).catch(() => 'unknown')}
Error: ${error instanceof Error ? error.message : String(error)}
Stack: ${error instanceof Error ? error.stack : 'N/A'}
----------------------------------------
`;
      fs.appendFileSync(logPath, errorMsg);
    } catch (logErr) {
      console.error("Failed to write to log file", logErr);
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error interno",
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Actualizar estado y campos de una WorkOrder
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;
    const workOrderId = parseInt(id);
    const body = await request.json();

    // Validar que la WO existe y pertenece al tenant
    const existingWO = await prisma.workOrder.findUnique({
      where: { id: workOrderId, tenantId: user.tenantId },
    });

    if (!existingWO) {
      return NextResponse.json(
        { error: "Orden de trabajo no encontrada" },
        { status: 404 }
      );
    }

    const { status, actualCost, completedAt, technicianId, providerId } =
      body;

    // Preparar datos para actualizar
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};

    if (status) {
      updateData.status = status;

      // Si se completa la WO
      if (status === "COMPLETED") {
        updateData.endDate = completedAt ? new Date(completedAt) : new Date();

        // Actualizar WorkOrderItems a COMPLETED
        await prisma.workOrderItem.updateMany({
          where: { workOrderId },
          data: { status: "COMPLETED" },
        });
      }

      // Si se inicia la WO
      if (status === "IN_PROGRESS" && !existingWO.startDate) {
        updateData.startDate = new Date();
      }
    }

    if (actualCost !== undefined) {
      updateData.actualCost = actualCost;
    }

    if (technicianId !== undefined) {
      updateData.technicianId = technicianId;
    }

    if (providerId !== undefined) {
      updateData.providerId = providerId;
    }

    // Actualizar WorkOrder
    const workOrder = await prisma.workOrder.update({
      where: { id: workOrderId },
      data: updateData,
      include: {
        vehicle: {
          select: {
            id: true,
            licensePlate: true,
          },
        },
        maintenanceAlerts: true,
        workOrderItems: true,
      },
    });

    // FIX: Prisma Decimal/BigInt serialization issue in Next.js
    const serializedWorkOrder = JSON.parse(JSON.stringify(workOrder, (key, value) =>
      (typeof value === 'bigint' ? value.toString() : value)
    ));

    return NextResponse.json(serializedWorkOrder);
  } catch (error: unknown) {
    console.error("[WORK_ORDER_PATCH]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error interno",
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Cancelar una WorkOrder (soft delete cambiando a CANCELLED)
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Validar permisos (solo OWNER/MANAGER pueden cancelar)
    const { canManageVehicles } = await import("@/lib/permissions");
    if (!canManageVehicles(user)) {
      return NextResponse.json(
        { error: "No tienes permisos para cancelar órdenes de trabajo" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const workOrderId = parseInt(id);

    // Validar que existe
    const existingWO = await prisma.workOrder.findUnique({
      where: { id: workOrderId, tenantId: user.tenantId },
      include: {
        maintenanceAlerts: true,
      },
    });

    if (!existingWO) {
      return NextResponse.json(
        { error: "Orden de trabajo no encontrada" },
        { status: 404 }
      );
    }

    // No permitir cancelar si ya está completada
    if (existingWO.status === "COMPLETED") {
      return NextResponse.json(
        { error: "No se puede cancelar una orden de trabajo completada" },
        { status: 400 }
      );
    }

    // Cancelar WorkOrder y revertir alertas a PENDING
    await prisma.$transaction(async (tx) => {
      // 1. Cambiar WO a CANCELLED
      await tx.workOrder.update({
        where: { id: workOrderId },
        data: { status: "CANCELLED" },
      });

      // 2. Cambiar WorkOrderItems a CANCELLED
      await tx.workOrderItem.updateMany({
        where: { workOrderId },
        data: { status: "CANCELLED" },
      });

      // 3. Revertir MaintenanceAlerts a PENDING (o ACKNOWLEDGED)
      const alertIds = existingWO.maintenanceAlerts.map((a) => a.id);
      if (alertIds.length > 0) {
        await tx.maintenanceAlert.updateMany({
          where: { id: { in: alertIds } },
          data: {
            status: "PENDING",
            workOrderId: null,
            workOrderCreatedAt: null,
            workOrderCreatedBy: null,
          },
        });

        // 4. Revertir VehicleProgramItems a PENDING
        const programItemIds = existingWO.maintenanceAlerts.map(
          (a) => a.programItemId
        );
        await tx.vehicleProgramItem.updateMany({
          where: { id: { in: programItemIds } },
          data: { status: "PENDING" },
        });
      }
    });

    return NextResponse.json({
      message: "Orden de trabajo cancelada exitosamente",
    });
  } catch (error: unknown) {
    console.error("[WORK_ORDER_DELETE]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error interno",
      },
      { status: 500 }
    );
  }
}

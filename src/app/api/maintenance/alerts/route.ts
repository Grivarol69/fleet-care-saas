import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const TENANT_ID = 'cf68b103-12fd-4208-a352-42379ef3b6e1';

/**
 * GET - Obtener todas las alertas de mantenimiento
 * Query params:
 * - vehicleId: Filtrar por vehículo específico
 * - status: Filtrar por estado (PENDING, IN_PROGRESS, etc.)
 * - priority: Filtrar por prioridad (LOW, MEDIUM, HIGH, URGENT)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const vehicleId = searchParams.get('vehicleId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    // Construir filtros dinámicos
    const where: Prisma.MaintenanceAlertWhereInput = { tenantId: TENANT_ID };

    if (vehicleId) {
      where.vehicleId = parseInt(vehicleId);
    }

    if (status) {
      where.status = status as Prisma.EnumAlertStatusFilter;
    } else {
      // Por defecto, solo alertas activas (no completadas)
      where.status = { in: ['PENDING', 'ACKNOWLEDGED', 'SNOOZED', 'IN_PROGRESS'] };
    }

    if (priority) {
      where.priority = priority as Prisma.EnumPriorityFilter;
    }

    // Obtener alertas desde la tabla MaintenanceAlert
    const alerts = await prisma.maintenanceAlert.findMany({
      where,
      include: {
        vehicle: {
          include: {
            brand: true,
            line: true
          }
        },
        programItem: {
          include: {
            mantItem: true,
            package: true
          }
        },
        workOrder: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      },
      orderBy: [
        { priorityScore: 'desc' }, // Primero por score de prioridad
        { kmToMaintenance: 'asc' }  // Luego por urgencia de km
      ]
    });

    // Transformar para el frontend
    const formattedAlerts = alerts.map(alert => ({
      // IDs
      id: alert.id,
      programItemId: alert.programItemId,
      vehicleId: alert.vehicleId,

      // Vehículo
      vehiclePlate: alert.vehicle.licensePlate,
      vehiclePhoto: alert.vehicle.photo || "https://utfs.io/f/ed8f2e8a-1265-4310-b086-1385aa133fc8-zbbdk9.jpg",
      brandName: alert.vehicle.brand.name,
      lineName: alert.vehicle.line.name,

      // Mantenimiento
      itemName: alert.itemName,
      packageName: alert.packageName,
      description: alert.description,

      // Kilometraje
      scheduledKm: alert.scheduledKm,
      currentKm: alert.currentKm,
      kmToMaintenance: alert.kmToMaintenance,

      // Priorización
      type: alert.type,
      category: alert.category,
      priority: alert.priority,
      alertLevel: alert.alertLevel,
      priorityScore: alert.priorityScore,

      // Estado
      status: alert.status,

      // Costos y tiempo
      estimatedCost: alert.estimatedCost?.toNumber() || null,
      estimatedDuration: alert.estimatedDuration?.toNumber() || null,

      // WorkOrder vinculada
      workOrder: alert.workOrder,

      // Tracking
      createdAt: alert.createdAt,
      acknowledgedAt: alert.acknowledgedAt,
      snoozedUntil: alert.snoozedUntil,

      // Legacy fields (para compatibilidad con componentes viejos)
      mantItemDescription: alert.itemName,
      executionKm: alert.scheduledKm,
      state: alert.alertLevel === 'CRITICAL' ? 'RED' :
             alert.alertLevel === 'HIGH' ? 'RED' : 'YELLOW'
    }));

    return NextResponse.json(formattedAlerts);
  } catch (error) {
    console.error("[MAINTENANCE_ALERTS_GET]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

/**
 * PATCH - Actualizar estado de una alerta
 * Body: { alertId, status, notes?, snoozedUntil? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { alertId, status, notes, snoozedUntil, acknowledgedBy } = body;

    if (!alertId) {
      return NextResponse.json({ error: "alertId is required" }, { status: 400 });
    }

    const updateData: Prisma.MaintenanceAlertUpdateInput = { status, updatedAt: new Date() };

    if (notes) updateData.notes = notes;
    if (snoozedUntil) updateData.snoozedUntil = new Date(snoozedUntil);

    if (status === 'ACKNOWLEDGED' && !acknowledgedBy) {
      updateData.acknowledgedBy = "current-user-id"; // TODO: Get from session
      updateData.acknowledgedAt = new Date();
    }

    const updatedAlert = await prisma.maintenanceAlert.update({
      where: { id: alertId },
      data: updateData
    });

    return NextResponse.json(updatedAlert);
  } catch (error) {
    console.error("[MAINTENANCE_ALERTS_PATCH]", error);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
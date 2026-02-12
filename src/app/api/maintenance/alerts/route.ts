import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';
import { safeParseInt } from '@/lib/validation';
import { canExecuteWorkOrders } from "@/lib/permissions";

// Schema for PATCH body validation
const updateAlertSchema = z.object({
  alertId: z.number().int().positive(),
  status: z.enum(['PENDING', 'ACKNOWLEDGED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'SNOOZED', 'CANCELLED']).optional(),
  notes: z.string().max(2000).optional(),
  snoozedUntil: z.string().datetime().optional(),
  snoozeReason: z.string().max(500).optional(),
  cancelReason: z.string().max(500).optional(),
}).strict();

/**
 * GET - Obtener todas las alertas de mantenimiento
 * Query params:
 * - vehicleId: Filtrar por vehículo específico
 * - status: Filtrar por estado (PENDING, IN_PROGRESS, etc.)
 * - priority: Filtrar por prioridad (LOW, MEDIUM, HIGH, URGENT)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = request.nextUrl;
    const vehicleIdParam = searchParams.get('vehicleId');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    // Construir filtros dinámicos
    const where: Prisma.MaintenanceAlertWhereInput = { tenantId: user.tenantId };

    // Safe parse vehicleId
    if (vehicleIdParam) {
      const vehicleId = safeParseInt(vehicleIdParam);
      if (vehicleId === null) {
        return NextResponse.json({ error: "vehicleId inválido" }, { status: 400 });
      }
      where.vehicleId = vehicleId;
    }

    if (status) {
      // Validate status enum
      const validStatuses = ['PENDING', 'ACKNOWLEDGED', 'SNOOZED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: "status inválido" }, { status: 400 });
      }
      where.status = status as Prisma.EnumAlertStatusFilter;
    } else {
      // Por defecto, solo alertas activas (no completadas)
      where.status = { in: ['PENDING', 'ACKNOWLEDGED', 'SNOOZED', 'IN_PROGRESS'] };
    }

    if (priority) {
      // Validate priority enum
      const validPriorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
      if (!validPriorities.includes(priority)) {
        return NextResponse.json({ error: "priority inválido" }, { status: 400 });
      }
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
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * PATCH - Actualizar estado de una alerta
 * Body: { alertId, status, notes?, snoozedUntil? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (!canExecuteWorkOrders(user)) {
      return NextResponse.json({ error: "No tienes permisos para esta acción" }, { status: 403 });
    }

    const body = await request.json();

    // Validate request body with Zod schema
    const validation = updateAlertSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: "Datos inválidos", details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { alertId, status, notes, snoozedUntil, snoozeReason, cancelReason } = validation.data;

    // Verify alert belongs to tenant
    const existingAlert = await prisma.maintenanceAlert.findFirst({
      where: {
        id: alertId,
        tenantId: user.tenantId
      }
    });

    if (!existingAlert) {
      return NextResponse.json({ error: "Alerta no encontrada" }, { status: 404 });
    }

    // Build update data with only validated fields
    const updateData: Prisma.MaintenanceAlertUpdateInput = { updatedAt: new Date() };

    if (status) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    if (status === 'ACKNOWLEDGED') {
      updateData.acknowledgedBy = user.id;
      updateData.acknowledgedAt = new Date();
    }

    if (status === 'SNOOZED' && snoozedUntil) {
      updateData.snoozedUntil = new Date(snoozedUntil);
      updateData.snoozedBy = user.id;
      if (snoozeReason) updateData.snoozeReason = snoozeReason;
    }

    if (status === 'CANCELLED') {
      updateData.cancelledBy = user.id;
      if (cancelReason) updateData.cancelReason = cancelReason;
    }

    const updatedAlert = await prisma.maintenanceAlert.update({
      where: { id: alertId },
      data: updateData
    });

    return NextResponse.json(updatedAlert);
  } catch (error) {
    console.error("[MAINTENANCE_ALERTS_PATCH]", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

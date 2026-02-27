import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { Prisma } from '@prisma/client';
import { canCreateWorkOrders } from '@/lib/permissions';

/**
 * GET - Listar WorkOrders con filtros
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');
    const status = searchParams.get('status');
    const mantType = searchParams.get('mantType');
    const limit = searchParams.get('limit');

    // Construir filtros
    const where: Prisma.WorkOrderWhereInput = {
      tenantId: user.tenantId,
    };

    if (vehicleId) {
      where.vehicleId = vehicleId;
    }

    if (status) {
      where.status = status as Prisma.EnumWorkOrderStatusFilter<'WorkOrder'>;
    }

    if (mantType) {
      where.mantType = mantType as Prisma.EnumMantTypeFilter<'WorkOrder'>;
    }

    // Obtener WorkOrders con relaciones
    const workOrders = await prisma.workOrder.findMany({
      where,
      include: {
        vehicle: {
          select: {
            id: true,
            licensePlate: true,
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
        createdAt: 'desc',
      },
      ...(limit ? { take: parseInt(limit) } : {}),
    });

    return NextResponse.json(workOrders);
  } catch (error: unknown) {
    console.error('[WORK_ORDERS_GET]', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal Error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Crear WorkOrder desde alertas de mantenimiento
 */
export async function POST(request: NextRequest) {
  let bodyLog: any = null;
  try {
    console.log('====== [POST WO] STARTING REQUEST ======');

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    console.log('[POST WO] User found:', user?.email);

    // Validar permisos (OWNER, MANAGER pueden crear WO)

    if (!canCreateWorkOrders(user)) {
      console.log('[POST WO] Permission denied for user:', user.email);
      return NextResponse.json(
        { error: 'No tienes permisos para crear órdenes de trabajo' },
        { status: 403 }
      );
    }
    console.log('[POST WO] Permission granted.');

    const body = await request.json();
    bodyLog = body;
    console.log('[POST WO] Payload received:', JSON.stringify(body));

    const {
      vehicleId,
      alertIds,
      title,
      description,
      technicianId: rawTechId,
      providerId: rawProvId,
      scheduledDate,
      priority = 'MEDIUM',
      mantType = 'PREVENTIVE',
      workType = 'EXTERNAL',
    } = body;

    // Sanitize IDs
    const technicianId = rawTechId ? String(rawTechId) : null;
    const providerId = rawProvId ? String(rawProvId) : null;

    // Validaciones
    // Si NO es Correctivo, requerimos alertIds
    if (!vehicleId) {
      return NextResponse.json(
        { error: 'vehicleId es requerido' },
        { status: 400 }
      );
    }

    if (mantType !== 'CORRECTIVE' && (!alertIds || alertIds.length === 0)) {
      return NextResponse.json(
        { error: 'alertIds son requeridos para mantenimientos no correctivos' },
        { status: 400 }
      );
    }

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'El título es requerido' },
        { status: 400 }
      );
    }

    // 1. Obtener las alertas seleccionadas con precios de referencia de partes
    let alerts: any[] = [];
    if (alertIds && alertIds.length > 0) {
      alerts = await prisma.maintenanceAlert.findMany({
        where: {
          id: { in: alertIds },
          status: { in: ['PENDING', 'ACKNOWLEDGED', 'SNOOZED'] },
          vehicleId,
          tenantId: user.tenantId,
        },
        include: {
          programItem: {
            include: {
              mantItem: {
                include: {
                  parts: {
                    include: {
                      masterPart: {
                        select: { referencePrice: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
    }

    // Validación: Si es preventivo O se enviaron alertIds, deben existir alertas válidas
    if (
      (mantType === 'PREVENTIVE' || (alertIds && alertIds.length > 0)) &&
      alerts.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            'No se encontraron alertas válidas para el mantenimiento preventivo',
        },
        { status: 404 }
      );
    }

    // Si es CORRECTIVE y no hay alertas, permitimos continuar
    if (mantType === 'CORRECTIVE' && alerts.length === 0) {
      // Logica para WO correctiva sin alertas
      console.log('[POST WO] Creating Corrective WO without alerts');
    }

    // 2. Calcular costos con fallback en cascada por alerta
    const alertCosts = alerts.map(alert => {
      if (!alert.programItem) return 0;

      // Fallback 1: programItem.estimatedCost
      const programItemCost = alert.programItem.estimatedCost?.toNumber();
      if (programItemCost && programItemCost > 0) return programItemCost;

      // Fallback 2: Suma de referencePrice * quantity de las partes del mantItem
      if (alert.programItem.mantItem && alert.programItem.mantItem.parts) {
        const partsCost = alert.programItem.mantItem.parts.reduce(
          (sum: number, part: any) => {
            const price = part.masterPart.referencePrice?.toNumber() || 0;
            const qty = Number(part.quantity) || 1;
            return sum + price * qty;
          },
          0
        );
        if (partsCost > 0) return partsCost;
      }

      // Fallback 3: alert.estimatedCost (snapshot al crear la alerta)
      const alertCost = alert.estimatedCost?.toNumber();
      if (alertCost && alertCost > 0) return alertCost;

      // Fallback 4: 0
      return 0;
    });

    const estimatedCost = alertCosts.reduce((sum, cost) => sum + cost, 0);

    // 3. Obtener km actual del vehículo
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId, tenantId: user.tenantId },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
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
        status: 'PENDING',
        workType: workType as 'EXTERNAL' | 'INTERNAL' | 'MIXED',
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
    if (alerts.length > 0) {
      const now = new Date();
      const firstAlert = alerts[0];
      // Safe access because length check passed
      const alertCreatedAt = firstAlert.createdAt;
      const responseTimeMinutes = Math.floor(
        (now.getTime() - alertCreatedAt.getTime()) / (1000 * 60)
      );

      await prisma.maintenanceAlert.updateMany({
        where: { id: { in: alertIds } },
        data: {
          status: 'IN_PROGRESS',
          workOrderId: workOrder.id,
          workOrderCreatedAt: now,
          workOrderCreatedBy: user.id,
          responseTimeMinutes,
        },
      });
    }

    // 6. Actualizar VehicleProgramItems
    const programItemIds = alerts
      .map(a => a.programItemId)
      .filter((id): id is string => !!id);
    if (programItemIds.length > 0) {
      await prisma.vehicleProgramItem.updateMany({
        where: { id: { in: programItemIds } },
        data: { status: 'IN_PROGRESS' },
      });
    }

    // 7. Crear WorkOrderItems con costos calculados
    await Promise.all(
      alerts.map((alert, index) => {
        const itemCost = alertCosts[index] ?? 0;
        return prisma.workOrderItem.create({
          data: {
            tenantId: user.tenantId,
            workOrderId: workOrder.id,
            mantItemId: alert.programItem.mantItemId,
            description: alert.itemName,
            supplier: providerId ? 'from-provider' : 'N/A',
            unitPrice: itemCost,
            quantity: 1,
            totalCost: itemCost,
            purchasedBy: user.id,
            status: 'PENDING',
          },
        });
      })
    );

    // 7. Crear WorkOrderItems
    // ... (item creation logic is fine)

    // FIX: Prisma Decimal/BigInt serialization issue in Next.js
    const serializedWorkOrder = JSON.parse(
      JSON.stringify(workOrder, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );

    // Also convert Decimals manually if needed, but typically JSON.stringify handles simple decimals as strings or validation fails.
    // Safest is to return just what we need or a sanitized copy.
    return NextResponse.json(
      {
        ...serializedWorkOrder,
        estimatedCost: workOrder.estimatedCost?.toNumber() || 0,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('====== [POST WO] FATAL ERROR ======');

    try {
      const fs = require('fs');
      const path = require('path');
      const logPath = path.join(process.cwd(), 'debug_error.log');
      const errorMsg = `
[${new Date().toISOString()}] FATAL ERROR IN POST /api/maintenance/work-orders
Error: ${error instanceof Error ? error.message : String(error)}
Stack: ${error instanceof Error ? error.stack : 'N/A'}
Payload: ${JSON.stringify(bodyLog || 'Payload not read')}
----------------------------------------
`;
      fs.appendFileSync(logPath, errorMsg);
    } catch (logErr) {
      console.error('Failed to write to log file', logErr);
    }

    console.error(error);
    if (error instanceof Error) {
      console.error('Msg:', error.message);
      console.error('Stack:', error.stack);
    }
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error interno',
      },
      { status: 500 }
    );
  }
}

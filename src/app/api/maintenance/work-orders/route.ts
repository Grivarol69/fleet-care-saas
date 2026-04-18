import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { Prisma, WorkOrderStatus } from '@prisma/client';
import { canCreateWorkOrders } from '@/lib/permissions';
import { workOrderPayloadSchema } from '@/lib/validations/work-order';

/**
 * GET - Listar WorkOrders con filtros
 */
export async function GET(request: NextRequest) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');
    const status = searchParams.get('status');
    const mantType = searchParams.get('mantType');
    const limit = searchParams.get('limit');
    const hasInternalWork = searchParams.get('hasInternalWork');
    const assignedToMe = searchParams.get('assignedToMe');

    // Construir filtros
    const where: Prisma.WorkOrderWhereInput = {};

    if (vehicleId) {
      where.vehicleId = vehicleId;
    }

    if (status) {
      const statusList = status.split(',').map(s => s.trim());
      if (statusList.length === 1) {
        where.status =
          statusList[0] as Prisma.EnumWorkOrderStatusFilter<'WorkOrder'>;
      } else {
        where.status = { in: statusList as WorkOrderStatus[] };
      }
    }

    if (mantType) {
      where.mantType = mantType as Prisma.EnumMantTypeFilter<'WorkOrder'>;
    }

    if (hasInternalWork === 'true') {
      where.workOrderItems = {
        some: {
          itemSource: 'INTERNAL_STOCK',
        },
      };
    }

    if (assignedToMe === 'true') {
      // Resolver el technicanId del usuario actual server-side
      const technician = await tenantPrisma.technician.findFirst({
        where: { userId: user.id },
        select: { id: true },
      });
      if (technician) {
        where.technicianId = technician.id;
      }
    }

    // Obtener WorkOrders con relaciones
    const workOrders = await tenantPrisma.workOrder.findMany({
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
            itemSource: true,
            _count: {
              select: { workOrderSubTasks: true },
            },
            workOrderSubTasks: {
              where: { status: 'DONE' },
              select: { id: true },
            },
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
        costCenterRef: {
          select: {
            id: true,
            name: true,
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
 * POST - Crear WorkOrder Unificada
 */
export async function POST(request: NextRequest) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canCreateWorkOrders(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para crear órdenes de trabajo' },
        { status: 403 }
      );
    }

    const json = await request.json();
    const result = workOrderPayloadSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Invalid payload', details: result.error.errors },
        { status: 400 }
      );
    }

    const data = result.data;

    // Si no vienen items pero sí alertIds, construirlos desde las alertas
    if (data.items.length === 0 && data.alertIds && data.alertIds.length > 0) {
      const alerts = await tenantPrisma.maintenanceAlert.findMany({
        where: { id: { in: data.alertIds } },
        include: { programItem: { select: { mantItemId: true } } },
      });

      if (alerts.length === 0) {
        return NextResponse.json(
          { error: 'No se encontraron alertas válidas' },
          { status: 400 }
        );
      }

      data.items = alerts.map(alert => ({
        mantItemId: alert.programItem?.mantItemId ?? alert.id,
        description: alert.itemName,
        unitPrice: alert.estimatedCost?.toNumber() ?? 0,
        quantity: 1,
        closureType: 'PENDING' as const,
        itemSource: 'EXTERNAL' as const,
        providerId: data.providerId || null,
      }));
    }

    // Obtener km actual del vehículo y su costCenterId
    const vehicle = await tenantPrisma.vehicle.findUnique({
      where: { id: data.vehicleId },
      select: { mileage: true, costCenterId: true },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 404 }
      );
    }

    // Calcular estimatedCost
    const estimatedCost = data.items.reduce(
      (acc, item) => acc + item.unitPrice * item.quantity,
      0
    );

    // Usaremos db.$transaction para asegurar atomicidad
    const workOrder = await tenantPrisma.$transaction(async tx => {
      // 0. Código se asigna al aprobar la OT, no al crearla

      // 1. Crear la Work Order
      const newWo = await tx.workOrder.create({
        data: {
          tenantId: user.tenantId,
          code: null,
          vehicleId: data.vehicleId,
          title: data.title,
          description: data.description || null,
          mantType: data.mantType,
          priority: data.priority,
          status: data.status,
          workType: data.workType,
          technicianId: data.technicianId || null,
          providerId: null, // Legacy, we use providerId on WorkOrderItems now
          creationMileage: vehicle.mileage,
          estimatedCost,
          requestedBy: user.id,
          startDate: (() => {
            if (!data.scheduledDate) return null;
            const base = new Date(data.scheduledDate);
            if (data.startTime) {
              const [h, m] = data.startTime.split(':').map(Number);
              base.setHours(h, m, 0, 0);
            }
            return base;
          })(),
          endDate: (() => {
            if (!data.scheduledDate || !data.endTime) return null;
            const base = new Date(data.scheduledDate);
            const [h, m] = data.endTime.split(':').map(Number);
            base.setHours(h, m, 0, 0);
            return base;
          })(),
          notes: data.vehicleLocation || null,
          costCenterId: data.costCenterId || vehicle.costCenterId || null,

          isPackageWork:
            data.alertIds && data.alertIds.length > 1 ? true : false,
          packageName:
            data.alertIds && data.alertIds.length > 1 ? data.title : null,

          // 2. Crear los WorkOrderItems con sus SubTasks
          workOrderItems: {
            create: data.items.map(item => ({
              tenantId: user.tenantId,
              mantItemId: item.mantItemId!,
              description: item.description,
              closureType: item.closureType as any,
              itemSource: item.itemSource as any,
              providerId: item.providerId || null,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              totalCost: item.unitPrice * item.quantity,
              purchasedBy: user.id,
              status: 'PENDING',
              supplier: 'N/A', // Legacy field, keeping string for safety
              masterPartId: item.masterPartId || null,

              // 3. Crear SubTasks si existen
              workOrderSubTasks:
                item.subTasks && item.subTasks.length > 0
                  ? {
                      create: item.subTasks.map((sub, idx) => ({
                        procedureId: sub.procedureId || null,
                        temparioItemId: sub.temparioItemId || null,
                        description: sub.description || null,
                        standardHours: sub.standardHours || null,
                        directHours: sub.directHours || null,
                        status: sub.status as any,
                        notes: sub.notes || null,
                        sequence: idx,
                      })),
                    }
                  : undefined,
            })),
          },
        },
        include: {
          workOrderItems: {
            include: {
              workOrderSubTasks: true,
            },
          },
        },
      });

      // 4. Actualizar estado de Alertas ligadas
      if (data.alertIds && data.alertIds.length > 0) {
        // Fetch alerts to get createdAt
        const alerts = await tx.maintenanceAlert.findMany({
          where: { id: { in: data.alertIds } },
        });

        if (alerts.length > 0) {
          const firstAlert = alerts[0];
          const now = new Date();
          const responseTimeMinutes = Math.floor(
            (now.getTime() - firstAlert.createdAt.getTime()) / (1000 * 60)
          );

          await tx.maintenanceAlert.updateMany({
            where: { id: { in: data.alertIds } },
            data: {
              status: 'IN_PROGRESS',
              workOrderId: newWo.id,
              workOrderCreatedAt: now,
              workOrderCreatedBy: user.id,
              responseTimeMinutes,
            },
          });

          // Actualizar VehicleProgramItems vinculados
          const programItemIds = alerts
            .map(a => a.programItemId)
            .filter((id): id is string => !!id);

          if (programItemIds.length > 0) {
            await tx.vehicleProgramItem.updateMany({
              where: { id: { in: programItemIds } },
              data: { status: 'APPROVED' },
            });
          }
        }
      }

      return newWo;
    });

    const serializedWorkOrder = JSON.parse(
      JSON.stringify(workOrder, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );

    return NextResponse.json(
      {
        ...serializedWorkOrder,
        estimatedCost: workOrder.estimatedCost?.toNumber() || 0,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('[POST WO] ERROR:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

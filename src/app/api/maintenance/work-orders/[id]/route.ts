import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { WorkOrderStatus } from '@prisma/client';
import {
  canExecuteWorkOrders,
  canApproveWorkOrder,
  canCloseWorkOrder,
  canOverrideWorkOrderFreeze,
} from '@/lib/permissions';
import { workOrderPayloadSchema } from '@/lib/validations/work-order';

// ========================================
// ALLOWED TRANSITIONS — WO Lifecycle FSM
// Format: 'FROM_STATUS' → array of { to, roles }
// Roles are checked via permission helpers; stored here as labels for
// documentation and role-guard dispatch.
// ========================================
type RoleGuard =
  | 'canExecuteWorkOrders'
  | 'canApproveWorkOrder'
  | 'canCloseWorkOrder';

const ALLOWED_TRANSITIONS: Record<string, Record<string, string>> = {
  PENDING: {
    PENDING_APPROVAL: 'canExecuteWorkOrders',
    CANCELLED: 'canApproveWorkOrder',
  },
  PENDING_APPROVAL: {
    APPROVED: 'canApproveWorkOrder',
    REJECTED: 'canApproveWorkOrder',
  },
  APPROVED: { IN_PROGRESS: 'canExecuteWorkOrders' },
  IN_PROGRESS: {
    PENDING_INVOICE: 'canCloseWorkOrder',
    CANCELLED: 'canApproveWorkOrder',
  },
  PENDING_INVOICE: { COMPLETED: 'canCloseWorkOrder' },
};

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
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const workOrderId = id;
    if (!workOrderId) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const workOrder = await tenantPrisma.workOrder.findUnique({
      where: {
        id: workOrderId,
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
            provider: {
              select: { id: true, name: true },
            },
            purchaseOrderItems: {
              select: { id: true },
            },
            workOrderSubTasks: {
              orderBy: { sequence: 'asc' },
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
        internalWorkTickets: {
          include: {
            laborEntries: {
              select: {
                id: true,
                workOrderItemId: true,
                hours: true,
                laborCost: true,
                notes: true,
              },
            },
            partEntries: {
              select: {
                id: true,
                workOrderItemId: true,
                quantity: true,
                unitCost: true,
                totalCost: true,
              },
            },
          },
        },
        purchaseOrders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            type: true,
            total: true,
            notes: true,
            provider: {
              select: { id: true, name: true },
            },
            items: {
              select: {
                id: true,
                description: true,
                quantity: true,
                unitPrice: true,
                workOrderItem: {
                  select: {
                    description: true,
                    mantItem: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
        costCenterRef: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!workOrder) {
      return NextResponse.json(
        { error: 'Orden de trabajo no encontrada' },
        { status: 404 }
      );
    }

    // FIX: Prisma Decimal/BigInt serialization issue in Next.js
    const serializedWorkOrder = JSON.parse(
      JSON.stringify(workOrder, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );

    return NextResponse.json(serializedWorkOrder);
  } catch (error: unknown) {
    console.error('====== [GET WO] FATAL ERROR ======');
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
      console.error('Failed to write to log file', logErr);
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error interno',
      },
      { status: 500 }
    );
  }
}

/**
 * Helper: resolve a role-guard label to the actual permission function result.
 */
function checkRoleGuard(
  guard: RoleGuard,
  user: NonNullable<Awaited<ReturnType<typeof requireCurrentUser>>['user']>
): boolean {
  if (!user) return false;
  switch (guard) {
    case 'canExecuteWorkOrders':
      return canExecuteWorkOrders(user);
    case 'canApproveWorkOrder':
      return canApproveWorkOrder(user);
    case 'canCloseWorkOrder':
      return canCloseWorkOrder(user);
    default:
      return false;
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
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const workOrderId = id;
    if (!workOrderId) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const body = await request.json();

    // Validar que la WO existe y pertenece al tenant
    const existingWO = await tenantPrisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: { maintenanceAlerts: true },
    });

    if (!existingWO) {
      return NextResponse.json(
        { error: 'Orden de trabajo no encontrada' },
        { status: 404 }
      );
    }

    const {
      status,
      actualCost,
      completedAt,
      completionMileage,
      technicianId,
      providerId,
      costCenterId,
      priority, // NUEVO
      description, // NUEVO
      notes, // NUEVO
    } = body;

    // Preparar datos para actualizar
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};

    if (costCenterId !== undefined) {
      updateData.costCenterId = costCenterId;
    }

    if (priority !== undefined) {
      updateData.priority = priority;
    }

    if (description !== undefined) {
      updateData.description = description;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (status) {
      const fromStatus = existingWO.status as WorkOrderStatus;
      const toStatus = status as WorkOrderStatus;

      // ──────────────────────────────────────────────────────────────
      // TASK 2.2: Transition Guard
      // 1. Check the transition is defined in ALLOWED_TRANSITIONS
      // 2. Check the user's role satisfies at least one allowed guard
      // ──────────────────────────────────────────────────────────────
      const allowedTargets = ALLOWED_TRANSITIONS[fromStatus];
      const requiredGuard = allowedTargets?.[toStatus];

      if (!requiredGuard) {
        return NextResponse.json(
          {
            error: `Transición inválida: no se puede pasar de ${fromStatus} a ${toStatus}`,
          },
          { status: 400 }
        );
      }

      // Check that user's role satisfies the required guard
      const hasRolePermission = checkRoleGuard(
        requiredGuard as RoleGuard,
        user
      );

      if (!hasRolePermission) {
        return NextResponse.json(
          {
            error: `No tienes permisos para mover una OT de ${fromStatus} a ${toStatus}`,
          },
          { status: 403 }
        );
      }

      // ──────────────────────────────────────────────────────────────
      // Status-specific side effects
      // ──────────────────────────────────────────────────────────────
      if (toStatus === 'APPROVED') {
        // APPROVED: generate PO for EXTERNAL/INTERNAL_PURCHASE items + create InternalWorkTicket
        const result = await tenantPrisma.$transaction(async tx => {
          const stockWarnings: string[] = [];

          const allActiveItems = await tx.workOrderItem.findMany({
            where: { workOrderId, status: { not: 'CANCELLED' } },
            include: {
              mantItem: { select: { type: true, name: true } },
              purchaseOrderItems: { select: { id: true } },
            },
          });

          // Load WO details
          const wo = await tx.workOrder.findUnique({
            where: { id: workOrderId },
            select: { providerId: true, technicianId: true },
          });

          // Group EXTERNAL / INTERNAL_PURCHASE items by providerId to create POs
          const purchaseItems = allActiveItems.filter(
            i =>
              (i.itemSource === 'EXTERNAL' ||
                i.itemSource === 'INTERNAL_PURCHASE') &&
              i.purchaseOrderItems.length === 0
          );

          const createdPurchaseOrderIds: string[] = [];
          const year = new Date().getFullYear();

          const grouped = new Map<string, typeof purchaseItems>();
          for (const item of purchaseItems) {
            const pid = item.providerId ?? null;
            if (!pid) {
              stockWarnings.push(
                `Sin proveedor para generar OC: ${item.mantItem.name}`
              );
              continue;
            }
            const arr = grouped.get(pid) ?? [];
            arr.push(item);
            grouped.set(pid, arr);
          }

          for (const [provId, provItems] of grouped.entries()) {
            const count = await tx.purchaseOrder.count({
              where: {
                tenantId: user.tenantId,
                orderNumber: { startsWith: `OC-${year}-` },
              },
            });
            const orderNumber = `OC-${year}-${String(count + 1).padStart(6, '0')}`;
            const subtotal = provItems.reduce(
              (sum, i) => sum + Number(i.totalCost),
              0
            );

            const allParts = provItems.every(i => i.mantItem.type === 'PART');
            const type = allParts ? 'PARTS' : 'SERVICES';

            const po = await tx.purchaseOrder.create({
              data: {
                tenantId: user.tenantId,
                workOrderId,
                providerId: provId,
                orderNumber,
                type,
                status: 'PENDING_APPROVAL',
                requestedBy: user.id,
                subtotal,
                taxRate: 0,
                taxAmount: 0,
                total: subtotal,
                items: {
                  create: provItems.map(item => ({
                    tenantId: user.tenantId,
                    workOrderItemId: item.id,
                    mantItemId: item.mantItemId,
                    masterPartId: item.masterPartId,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    total: item.totalCost,
                    status: 'PENDING' as const,
                    receivedQty: 0,
                  })),
                },
              },
            });

            createdPurchaseOrderIds.push(po.id);
          }

          // Create InternalWorkTicket (idempotent — only if not yet created)
          let ticket: { id: string; ticketNumber: string } | null = null;
          const woTechnicianId = wo?.technicianId ?? null;

          const existingTicket = await tx.internalWorkTicket.findFirst({
            where: { workOrderId: workOrderId },
          });

          if (!existingTicket && woTechnicianId) {
            const laborItems = allActiveItems.filter(
              i => i.mantItem.type !== 'PART'
            );
            const totalLaborCost = laborItems.reduce(
              (sum, i) => sum + Number(i.totalCost),
              0
            );

            const ticketCount = await tx.internalWorkTicket.count({
              where: {
                tenantId: user.tenantId,
                ticketNumber: { startsWith: `TKT-${year}-` },
              },
            });
            const ticketNumber = `TKT-${year}-${String(ticketCount + 1).padStart(6, '0')}`;

            const createdTicket = await tx.internalWorkTicket.create({
              data: {
                tenantId: user.tenantId,
                workOrderId,
                ticketNumber,
                technicianId: woTechnicianId,
                totalLaborHours: 0,
                totalLaborCost,
                totalPartsCost: 0,
                totalCost: totalLaborCost,
                status: 'DRAFT',
                laborEntries: {
                  create: laborItems.map(item => ({
                    tenantId: user.tenantId,
                    workOrderItemId: item.id,
                    technicianId: woTechnicianId,
                    description: item.mantItem.name,
                    hours: 0,
                    hourlyRate: 0,
                    laborCost: Number(item.totalCost),
                  })),
                },
              },
            });

            ticket = {
              id: createdTicket.id,
              ticketNumber: createdTicket.ticketNumber,
            };
          } else if (!woTechnicianId) {
            stockWarnings.push(
              'La OT no tiene técnico asignado — ticket de taller no generado'
            );
          }

          const updatedWo = await tx.workOrder.update({
            where: { id: workOrderId },
            data: { status: 'APPROVED' },
            include: {
              vehicle: { select: { id: true, licensePlate: true } },
              maintenanceAlerts: true,
              workOrderItems: true,
            },
          });

          return {
            workOrder: updatedWo,
            ticket,
            purchaseOrders: createdPurchaseOrderIds,
            stockWarnings,
          };
        });

        const serialized = JSON.parse(
          JSON.stringify(result, (_key, value) =>
            typeof value === 'bigint' ? value.toString() : value
          )
        );
        return NextResponse.json(serialized);
      } else if (toStatus === 'PENDING_INVOICE') {
        // T-02 (simplified): Only update status + compute actualCost + set endDate
        // PO/ticket generation was moved to APPROVED transition
        const result = await tenantPrisma.$transaction(async tx => {
          const itemsAgg = await tx.workOrderItem.aggregate({
            where: { workOrderId, status: { not: 'CANCELLED' } },
            _sum: { totalCost: true },
          });
          const expensesAgg = await tx.workOrderExpense.aggregate({
            where: { workOrderId, status: 'APPROVED' },
            _sum: { amount: true },
          });
          const computedActualCost =
            Number(itemsAgg._sum.totalCost ?? 0) +
            Number(expensesAgg._sum.amount ?? 0);

          const wo = await tx.workOrder.update({
            where: { id: workOrderId },
            data: {
              status: 'PENDING_INVOICE',
              actualCost: computedActualCost,
              endDate: new Date(),
              ...(completionMileage !== undefined
                ? { completionMileage: Number(completionMileage) }
                : {}),
              ...(technicianId !== undefined ? { technicianId } : {}),
              ...(providerId !== undefined ? { providerId } : {}),
            },
            include: {
              vehicle: { select: { id: true, licensePlate: true } },
              maintenanceAlerts: true,
              workOrderItems: true,
            },
          });

          return wo;
        });

        const serialized = JSON.parse(
          JSON.stringify(result, (_key, value) =>
            typeof value === 'bigint' ? value.toString() : value
          )
        );
        return NextResponse.json(serialized);
      } else if (toStatus === 'COMPLETED') {
        // T-03: COMPLETED branch — removed pendingItems guard; compute cost and close
        const result = await tenantPrisma.$transaction(async tx => {
          const itemsAgg = await tx.workOrderItem.aggregate({
            where: { workOrderId, status: { not: 'CANCELLED' } },
            _sum: { totalCost: true },
          });

          const expensesAgg = await tx.workOrderExpense.aggregate({
            where: { workOrderId, status: 'APPROVED' },
            _sum: { amount: true },
          });

          const itemsCost = Number(itemsAgg._sum.totalCost ?? 0);
          const expensesCost = Number(expensesAgg._sum.amount ?? 0);
          const computedActualCost = itemsCost + expensesCost;

          const closedAt = completedAt ? new Date(completedAt) : new Date();

          // Update WorkOrderItems to COMPLETED
          await tx.workOrderItem.updateMany({
            where: { workOrderId, status: { not: 'CANCELLED' } },
            data: { status: 'COMPLETED' },
          });

          // Close MaintenanceAlerts linked to this WO
          await tx.maintenanceAlert.updateMany({
            where: { workOrderId },
            data: {
              status: 'COMPLETED',
              closedAt: closedAt,
            },
          });

          // Close VehicleProgramItems linked via alerts
          const alerts = await tx.maintenanceAlert.findMany({
            where: { workOrderId },
            select: { programItemId: true },
          });

          if (alerts.length > 0) {
            const programItemIds = alerts.map(a => a.programItemId);
            await tx.vehicleProgramItem.updateMany({
              where: { id: { in: programItemIds } },
              data: {
                status: 'COMPLETED',
                executedDate: closedAt,
              },
            });
          }

          const wo = await tx.workOrder.update({
            where: { id: workOrderId },
            data: {
              status: 'COMPLETED',
              endDate: closedAt,
              actualCost: computedActualCost,
              ...(completionMileage !== undefined
                ? { completionMileage: Number(completionMileage) }
                : {}),
              ...(technicianId !== undefined ? { technicianId } : {}),
              ...(providerId !== undefined ? { providerId } : {}),
            },
            include: {
              vehicle: { select: { id: true, licensePlate: true } },
              maintenanceAlerts: true,
              workOrderItems: true,
            },
          });

          return wo;
        });

        const serializedWorkOrder = JSON.parse(
          JSON.stringify(result, (_key, value) =>
            typeof value === 'bigint' ? value.toString() : value
          )
        );
        return NextResponse.json(serializedWorkOrder);
      } else if (toStatus === 'REJECTED') {
        // TASK 2.3: REJECTED — revert linked MaintenanceAlerts from CLOSED → PENDING
        // (mirrors the CANCELLED logic in DELETE handler)
        await tenantPrisma.$transaction(async tx => {
          await tx.workOrder.update({
            where: { id: workOrderId },
            data: { status: 'REJECTED' },
          });

          const alertIds = existingWO.maintenanceAlerts.map(a => a.id);
          if (alertIds.length > 0) {
            await tx.maintenanceAlert.updateMany({
              where: { id: { in: alertIds } },
              data: {
                status: 'PENDING',
                workOrderId: null,
                workOrderCreatedAt: null,
                workOrderCreatedBy: null,
              },
            });

            const programItemIds = existingWO.maintenanceAlerts.map(
              a => a.programItemId
            );
            await tx.vehicleProgramItem.updateMany({
              where: { id: { in: programItemIds } },
              data: { status: 'PENDING' },
            });
          }
        });

        // Fetch updated WO to return
        const updatedWO = await tenantPrisma.workOrder.findUnique({
          where: { id: workOrderId },
          include: {
            vehicle: { select: { id: true, licensePlate: true } },
            maintenanceAlerts: true,
            workOrderItems: true,
          },
        });

        const serializedWorkOrder = JSON.parse(
          JSON.stringify(updatedWO, (_key, value) =>
            typeof value === 'bigint' ? value.toString() : value
          )
        );
        return NextResponse.json(serializedWorkOrder);
      } else {
        // All other valid transitions
        updateData.status = toStatus;
      }

      // If WO is being started, record startDate
      if (toStatus === 'IN_PROGRESS' && !existingWO.startDate) {
        updateData.startDate = new Date();
      }
    }

    if (actualCost !== undefined) {
      updateData.actualCost = actualCost;
    }

    if (completionMileage !== undefined) {
      updateData.completionMileage = Number(completionMileage);
    }

    if (technicianId !== undefined) {
      updateData.technicianId = technicianId;
    }

    if (providerId !== undefined) {
      updateData.providerId = providerId;
    }

    // Actualizar WorkOrder
    const workOrder = await tenantPrisma.workOrder.update({
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
    const serializedWorkOrder = JSON.parse(
      JSON.stringify(workOrder, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );

    return NextResponse.json(serializedWorkOrder);
  } catch (error: unknown) {
    console.error('[WORK_ORDER_PATCH]', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error interno',
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
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validar permisos (solo OWNER/MANAGER/COORDINATOR pueden cancelar OTs)
    const { canApproveWorkOrder } = await import('@/lib/permissions');
    if (!canApproveWorkOrder(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para cancelar órdenes de trabajo' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const workOrderId = id;
    if (!workOrderId) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Validar que existe
    const existingWO = await tenantPrisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        maintenanceAlerts: true,
      },
    });

    if (!existingWO) {
      return NextResponse.json(
        { error: 'Orden de trabajo no encontrada' },
        { status: 404 }
      );
    }

    // No permitir cancelar si ya está completada
    if (existingWO.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'No se puede cancelar una orden de trabajo completada' },
        { status: 400 }
      );
    }

    // Cancelar WorkOrder y revertir alertas a PENDING
    await tenantPrisma.$transaction(async tx => {
      // 1. Cambiar WO a CANCELLED
      await tx.workOrder.update({
        where: { id: workOrderId },
        data: { status: 'CANCELLED' },
      });

      // 2. Cambiar WorkOrderItems a CANCELLED
      await tx.workOrderItem.updateMany({
        where: { workOrderId },
        data: { status: 'CANCELLED' },
      });

      // 3. Revertir MaintenanceAlerts a PENDING (o ACKNOWLEDGED)
      const alertIds = existingWO.maintenanceAlerts.map(a => a.id);
      if (alertIds.length > 0) {
        await tx.maintenanceAlert.updateMany({
          where: { id: { in: alertIds } },
          data: {
            status: 'PENDING',
            workOrderId: null,
            workOrderCreatedAt: null,
            workOrderCreatedBy: null,
          },
        });

        // 4. Revertir VehicleProgramItems a PENDING
        const programItemIds = existingWO.maintenanceAlerts.map(
          a => a.programItemId
        );
        await tx.vehicleProgramItem.updateMany({
          where: { id: { in: programItemIds } },
          data: { status: 'PENDING' },
        });
      }
    });

    return NextResponse.json({
      message: 'Orden de trabajo cancelada exitosamente',
    });
  } catch (error: unknown) {
    console.error('[WORK_ORDER_DELETE]', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error interno',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Sincroniza la Work Order usando el Payload Unificado
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const workOrderId = id;

    const existingWO = await tenantPrisma.workOrder.findUnique({
      where: { id: workOrderId },
    });
    if (!existingWO)
      return NextResponse.json({ error: 'OT no encontrada' }, { status: 404 });

    if (!canOverrideWorkOrderFreeze(user)) {
      if (
        existingWO.status !== 'PENDING' &&
        existingWO.status !== 'IN_PROGRESS' &&
        existingWO.status !== 'PENDING_APPROVAL' &&
        existingWO.status !== 'APPROVED'
      ) {
        return NextResponse.json(
          { error: 'No editar ítems de OTs cerradas/en revisión financiera' },
          { status: 400 }
        );
      }
    }

    const json = await request.json();
    const result = workOrderPayloadSchema.safeParse(json);
    if (!result.success)
      return NextResponse.json(
        { error: 'Payload inválido', details: result.error.errors },
        { status: 400 }
      );

    const data = result.data;
    const newItemsIds = data.items.map(i => i.id).filter(Boolean) as string[];
    const estimatedCost = data.items.reduce(
      (acc, item) => acc + item.unitPrice * item.quantity,
      0
    );

    const updatedWorkOrder = await tenantPrisma.$transaction(async tx => {
      const wo = await tx.workOrder.update({
        where: { id: workOrderId },
        data: {
          title: data.title,
          description: data.description || null,
          mantType: data.mantType,
          priority: data.priority,
          workType: data.workType,
          technicianId: data.technicianId || null,
          estimatedCost,
          startDate: data.scheduledDate
            ? new Date(data.scheduledDate)
            : undefined,
          costCenterId: data.costCenterId || null,
        },
      });

      if (newItemsIds.length > 0) {
        await tx.workOrderItem.deleteMany({
          where: { workOrderId, id: { notIn: newItemsIds } },
        });
      } else {
        await tx.workOrderItem.deleteMany({ where: { workOrderId } });
      }

      for (const item of data.items) {
        // Simplificamos el update por motivos de seguridad en React
        const itemUpserted = item.id
          ? await tx.workOrderItem.update({
              where: { id: item.id },
              data: {
                mantItemId: item.mantItemId,
                description: item.description,
                closureType: item.closureType as any,
                itemSource: item.itemSource as any,
                providerId: item.providerId || null,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
                totalCost: item.unitPrice * item.quantity,
                masterPartId: item.masterPartId || null,
              },
            })
          : await tx.workOrderItem.create({
              data: {
                tenantId: user.tenantId,
                workOrderId,
                mantItemId: item.mantItemId,
                description: item.description,
                closureType: item.closureType as any,
                itemSource: item.itemSource as any,
                providerId: item.providerId || null,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
                totalCost: item.unitPrice * item.quantity,
                purchasedBy: user.id,
                status: 'PENDING',
                supplier: 'N/A',
                masterPartId: item.masterPartId || null,
              },
            });

        if (item.subTasks && item.subTasks.length > 0) {
          const newSubTaskIds = item.subTasks
            .map(s => s.id)
            .filter(Boolean) as string[];
          if (newSubTaskIds.length > 0) {
            await tx.workOrderSubTask.deleteMany({
              where: {
                workOrderItemId: itemUpserted.id,
                id: { notIn: newSubTaskIds },
                status: 'PENDING',
              },
            });
          } else {
            await tx.workOrderSubTask.deleteMany({
              where: { workOrderItemId: itemUpserted.id, status: 'PENDING' },
            });
          }

          for (const [idx, sub] of item.subTasks.entries()) {
            if (sub.id) {
              await tx.workOrderSubTask.update({
                where: { id: sub.id },
                data: {
                  procedureId: sub.procedureId || null,
                  temparioItemId: sub.temparioItemId || null,
                  description: sub.description || null,
                  standardHours: sub.standardHours || null,
                  directHours: sub.directHours || null,
                  status: sub.status as any,
                  notes: sub.notes || null,
                  sequence: idx,
                },
              });
            } else {
              await tx.workOrderSubTask.create({
                data: {
                  workOrderItemId: itemUpserted.id,
                  procedureId: sub.procedureId || null,
                  temparioItemId: sub.temparioItemId || null,
                  description: sub.description || null,
                  standardHours: sub.standardHours || null,
                  directHours: sub.directHours || null,
                  status: sub.status as any,
                  notes: sub.notes || null,
                  sequence: idx,
                },
              });
            }
          }
        } else {
          await tx.workOrderSubTask.deleteMany({
            where: { workOrderItemId: itemUpserted.id },
          });
        }
      }
      return wo;
    });

    const serializedWorkOrder = JSON.parse(
      JSON.stringify(updatedWorkOrder, (_key, value) =>
        typeof value === 'bigint' ? value.toString() : value
      )
    );
    return NextResponse.json(
      {
        ...serializedWorkOrder,
        estimatedCost: updatedWorkOrder.estimatedCost?.toNumber() || 0,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

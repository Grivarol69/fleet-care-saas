import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { ItemClosureType, WorkOrderStatus } from '@prisma/client';
import {
  canExecuteWorkOrders,
  canApproveWorkOrder,
  canCloseWorkOrder,
} from '@/lib/permissions';

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

interface TransitionRule {
  allowedRoles: RoleGuard[];
}

const ALLOWED_TRANSITIONS: Record<
  WorkOrderStatus,
  Partial<Record<WorkOrderStatus, TransitionRule>>
> = {
  PENDING: {
    IN_PROGRESS: { allowedRoles: ['canExecuteWorkOrders'] },
    PENDING_APPROVAL: { allowedRoles: ['canApproveWorkOrder'] },
    CANCELLED: { allowedRoles: ['canApproveWorkOrder'] },
  },
  PENDING_APPROVAL: {
    APPROVED: { allowedRoles: ['canApproveWorkOrder'] },
    REJECTED: { allowedRoles: ['canApproveWorkOrder'] },
    CANCELLED: { allowedRoles: ['canApproveWorkOrder'] },
  },
  APPROVED: {
    IN_PROGRESS: { allowedRoles: ['canExecuteWorkOrders'] },
    CANCELLED: { allowedRoles: ['canApproveWorkOrder'] },
  },
  IN_PROGRESS: {
    PENDING_INVOICE: { allowedRoles: ['canExecuteWorkOrders'] },
    PENDING_APPROVAL: { allowedRoles: ['canApproveWorkOrder'] },
    CANCELLED: { allowedRoles: ['canApproveWorkOrder'] },
  },
  PENDING_INVOICE: {
    COMPLETED: { allowedRoles: ['canCloseWorkOrder'] },
    CANCELLED: { allowedRoles: ['canApproveWorkOrder'] },
  },
  // Terminal states — no transitions out
  COMPLETED: {},
  REJECTED: {},
  CANCELLED: {},
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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
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
  user: Awaited<ReturnType<typeof getCurrentUser>>
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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const workOrderId = parseInt(id);
    const body = await request.json();

    // Validar que la WO existe y pertenece al tenant
    const existingWO = await prisma.workOrder.findUnique({
      where: { id: workOrderId, tenantId: user.tenantId },
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
    } = body;

    // Preparar datos para actualizar
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};

    if (status) {
      const fromStatus = existingWO.status as WorkOrderStatus;
      const toStatus = status as WorkOrderStatus;

      // ──────────────────────────────────────────────────────────────
      // TASK 2.2: Transition Guard
      // 1. Check the transition is defined in ALLOWED_TRANSITIONS
      // 2. Check the user's role satisfies at least one allowed guard
      // ──────────────────────────────────────────────────────────────
      const allowedTargets = ALLOWED_TRANSITIONS[fromStatus];
      const transitionRule = allowedTargets?.[toStatus];

      if (!transitionRule) {
        return NextResponse.json(
          {
            error: `Transición inválida: no se puede pasar de ${fromStatus} a ${toStatus}`,
          },
          { status: 400 }
        );
      }

      // Check at least one role guard passes for this user
      const hasRolePermission = transitionRule.allowedRoles.some(guard =>
        checkRoleGuard(guard, user)
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
      if (toStatus === 'COMPLETED') {
        // FASE 6.7: Validar que no haya items pendientes de cierre
        const pendingItems = await prisma.workOrderItem.count({
          where: {
            workOrderId,
            closureType: ItemClosureType.PENDING,
            status: { not: 'CANCELLED' },
          },
        });

        if (pendingItems > 0) {
          return NextResponse.json(
            {
              error: `No se puede completar la OT. Hay ${pendingItems} item(s) pendientes de cierre. Genere las OC/Tickets correspondientes primero.`,
            },
            { status: 400 }
          );
        }

        // TASK 2.4: Auto-compute actualCost inside a transaction
        const result = await prisma.$transaction(async tx => {
          // Sum WorkOrderItem costs
          const itemsAgg = await tx.workOrderItem.aggregate({
            where: { workOrderId, status: { not: 'CANCELLED' } },
            _sum: { totalCost: true },
          });

          // Sum approved WorkOrderExpense amounts
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

          // FASE 6.2: Close MaintenanceAlerts linked to this WO
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

          // Update WorkOrder status + computed actualCost
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
        await prisma.$transaction(async tx => {
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
        const updatedWO = await prisma.workOrder.findUnique({
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
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Validar permisos (solo OWNER/MANAGER pueden cancelar)
    const { canManageVehicles } = await import('@/lib/permissions');
    if (!canManageVehicles(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para cancelar órdenes de trabajo' },
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
    await prisma.$transaction(async tx => {
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

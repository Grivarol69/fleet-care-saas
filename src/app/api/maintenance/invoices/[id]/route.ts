import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

/**
 * GET - Obtener detalle de una Invoice específica
 */
export async function GET({ params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }
    const { id } = await params;
    const invoice = await prisma.invoice.findUnique({
      where: {
        id,
        tenantId: user.tenantId,
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            address: true,
          },
        },
        workOrder: {
          include: {
            vehicle: {
              select: {
                id: true,
                licensePlate: true,
                brand: { select: { name: true } },
                line: { select: { name: true } },
              },
            },
            maintenanceAlerts: {
              select: {
                id: true,
                itemName: true,
                status: true,
                programItemId: true,
              },
            },
            workOrderItems: {
              select: {
                id: true,
                description: true,
                totalCost: true,
              },
            },
          },
        },
        items: {
          include: {
            masterPart: {
              select: {
                id: true,
                code: true,
                description: true,
                category: true,
              },
            },
            workOrderItem: {
              select: {
                id: true,
                description: true,
              },
            },
          },
        },
        approver: {
          select: {
            id: true,
            email: true,
          },
        },
        registrar: {
          select: {
            id: true,
            email: true,
          },
        },
        payments: true,
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json(invoice);
  } catch (error: unknown) {
    console.error('[INVOICE_GET]', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error interno',
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Actualizar Invoice (principalmente para aprobar/rechazar)
 *
 * ESTE ES EL ENDPOINT CRÍTICO QUE CIERRA EL CICLO COMPLETO:
 * Invoice APPROVED → WorkOrder actualizada → MaintenanceAlerts COMPLETED →
 * VehicleProgramItems COMPLETED → PartPriceHistory creado
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

    // Validar permisos (solo OWNER/MANAGER pueden aprobar)
    const { requireManagementRole } = await import('@/lib/permissions');
    try {
      requireManagementRole(user);
    } catch (error) {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { status, notes } = await request.json();

    // Validar que existe
    const existingInvoice = await prisma.invoice.findUnique({
      where: { id, tenantId: user.tenantId },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      );
    }

    // Si se está APROBANDO la factura → CIERRE GRANULAR POR ITEM
    if (status === 'APPROVED') {
      console.log('[INVOICE_APPROVE] Iniciando cierre granular por item...');

      // TRANSACCIÓN ATÓMICA CRÍTICA
      await prisma.$transaction(async tx => {
        const now = new Date();

        // 1. Aprobar Invoice
        const invoice = await tx.invoice.update({
          where: { id },
          data: {
            status: 'APPROVED',
            approvedBy: user.id,
            approvedAt: now,
            notes: notes || null,
          },
          include: {
            workOrder: {
              include: {
                workOrderItems: true,
                maintenanceAlerts: true,
              },
            },
            items: {
              include: {
                masterPart: true,
                workOrderItem: true,
              },
            },
          },
        });

        console.log(
          `[INVOICE_APPROVE] ✅ Factura ${invoice.invoiceNumber} aprobada`
        );

        // 2. CIERRE GRANULAR: Por cada InvoiceItem que tiene workOrderItemId
        const invoiceItemsWithWO = invoice.items.filter(
          item => item.workOrderItemId
        );

        console.log(
          `[INVOICE_APPROVE] Procesando ${invoiceItemsWithWO.length} items facturados...`
        );

        for (const invoiceItem of invoiceItemsWithWO) {
          const workOrderItem = invoiceItem.workOrderItem;
          if (!workOrderItem) continue;

          // 2.1. Completar WorkOrderItem
          await tx.workOrderItem.update({
            where: { id: workOrderItem.id },
            data: {
              status: 'COMPLETED',
              invoiceNumber: invoice.invoiceNumber,
            },
          });

          console.log(
            `[INVOICE_APPROVE]   ✅ WorkOrderItem #${workOrderItem.id} completado`
          );

          // 2.2. Buscar y Completar MaintenanceAlert asociada
          // La relación es: MaintenanceAlert.workOrderId + mantItemId coincide con WorkOrderItem
          const maintenanceAlert = invoice.workOrder?.maintenanceAlerts.find(
            alert => alert.workOrderId === invoice.workOrderId
          );

          if (maintenanceAlert) {
            const alertCreatedAt = maintenanceAlert.createdAt;
            const completionTimeHours = Math.floor(
              (now.getTime() - alertCreatedAt.getTime()) / (1000 * 60 * 60)
            );

            const wasOnTime =
              invoice.workOrder!.creationMileage <=
              maintenanceAlert.scheduledKm + 500; // Tolerancia 500km

            const estimatedCost =
              maintenanceAlert.estimatedCost?.toNumber() || 0;
            const itemCost = invoiceItem.total.toNumber();
            const costVariance = itemCost - estimatedCost;

            await tx.maintenanceAlert.update({
              where: { id: maintenanceAlert.id },
              data: {
                status: 'COMPLETED',
                actualCost: invoiceItem.total,
                wasOnTime,
                closedAt: now,
                completionTimeHours,
                costVariance,
              },
            });

            console.log(
              `[INVOICE_APPROVE]   ✅ MaintenanceAlert #${maintenanceAlert.id} (${maintenanceAlert.itemName}) completada`
            );

            // 2.3. Completar VehicleProgramItem asociado
            await tx.vehicleProgramItem.update({
              where: { id: maintenanceAlert.programItemId },
              data: {
                status: 'COMPLETED',
                executedKm: invoice.workOrder!.creationMileage,
                executedDate: now,
              },
            });

            console.log(
              `[INVOICE_APPROVE]   ✅ VehicleProgramItem #${maintenanceAlert.programItemId} completado`
            );
          }

          // 2.4. Crear PartPriceHistory (GOLD MINE analytics)
          if (invoiceItem.masterPartId) {
            await tx.partPriceHistory.create({
              data: {
                tenantId: user.tenantId,
                masterPartId: invoiceItem.masterPartId,
                supplierId: invoice.supplierId,
                price: invoiceItem.unitPrice,
                quantity: invoiceItem.quantity,
                recordedAt: now,
                invoiceId: invoice.id,
                approvedBy: user.id,
                purchasedBy: invoice.registeredBy,
              },
            });

            console.log(
              `[INVOICE_APPROVE]   ✅ PartPriceHistory creado para MasterPart ${invoiceItem.masterPartId}`
            );
          }
        }

        // 3. Actualizar WorkOrder: calcular actualCost y verificar si está completada
        if (invoice.workOrderId) {
          // Calcular costo real acumulado de TODOS los items completados
          const allWorkOrderItems = invoice.workOrder!.workOrderItems;
          const completedItems = allWorkOrderItems.filter(
            item => item.status === 'COMPLETED'
          );
          const totalActualCost = completedItems.reduce(
            (sum, item) => sum + item.totalCost.toNumber(),
            0
          );

          // WorkOrder está completa si TODOS los items están COMPLETED
          const allItemsCompleted = allWorkOrderItems.every(
            item => item.status === 'COMPLETED'
          );

          await tx.workOrder.update({
            where: { id: invoice.workOrderId },
            data: {
              actualCost: totalActualCost,
              status: allItemsCompleted ? 'COMPLETED' : 'IN_PROGRESS',
            },
          });

          console.log(
            `[INVOICE_APPROVE] ✅ WorkOrder #${invoice.workOrderId} actualizada:`
          );
          console.log(`[INVOICE_APPROVE]    - actualCost: $${totalActualCost}`);
          console.log(
            `[INVOICE_APPROVE]    - status: ${allItemsCompleted ? 'COMPLETED' : 'IN_PROGRESS'}`
          );
          console.log(
            `[INVOICE_APPROVE]    - Items completados: ${completedItems.length}/${allWorkOrderItems.length}`
          );
        }

        console.log(
          '[INVOICE_APPROVE] ✅✅✅ Cierre granular completado exitosamente'
        );

        return invoice;
      });

      // Retornar con todas las relaciones actualizadas
      const updatedInvoice = await prisma.invoice.findUnique({
        where: { id },
        include: {
          supplier: true,
          workOrder: {
            include: {
              vehicle: {
                select: {
                  id: true,
                  licensePlate: true,
                },
              },
              maintenanceAlerts: true,
            },
          },
          items: {
            include: {
              masterPart: true,
            },
          },
          approver: {
            select: {
              id: true,
              email: true,
            },
          },
        },
      });

      return NextResponse.json(updatedInvoice);
    }

    // Para otros cambios de estado (CANCELLED, PAID, etc.)
    const invoice = await prisma.invoice.update({
      where: { id },
      data: {
        status,
        notes: notes || null,
      },
      include: {
        supplier: true,
        workOrder: {
          include: {
            vehicle: {
              select: {
                id: true,
                licensePlate: true,
              },
            },
          },
        },
        items: true,
      },
    });

    return NextResponse.json(invoice);
  } catch (error: unknown) {
    console.error('[INVOICE_PATCH]', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error interno',
      },
      { status: 500 }
    );
  }
}

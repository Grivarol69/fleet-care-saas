import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { InvoiceStatus, ItemSource, ItemClosureType } from '@prisma/client';
import { canApproveInvoices } from '@/lib/permissions';

interface InvoiceItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  taxRate?: number;
  taxAmount?: number;
  total: number;
  workOrderItemId?: number | null;
  masterPartId?: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const workOrderId = searchParams.get('workOrderId');
    const limit = searchParams.get('limit');

    const invoices = await prisma.invoice.findMany({
      where: {
        tenantId: user.tenantId,
        ...(status && { status: status as InvoiceStatus }),
        ...(workOrderId && { workOrderId: parseInt(workOrderId) }),
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
        workOrder: {
          select: {
            id: true,
            title: true,
            vehicle: {
              select: {
                licensePlate: true,
              },
            },
          },
        },
        items: true,
        payments: true,
      },
      orderBy: {
        invoiceDate: 'desc',
      },
      ...(limit && { take: parseInt(limit) }),
    });

    return NextResponse.json(invoices);
  } catch (error: unknown) {
    console.error('[INVOICES_GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Validar permisos
    if (!canApproveInvoices(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      invoiceNumber,
      invoiceDate,
      dueDate,
      supplierId,
      workOrderId,
      purchaseOrderId,
      subtotal,
      taxAmount,
      totalAmount,
      currency = 'COP',
      notes,
      attachmentUrl,
      items,
    } = body;

    // Validaciones
    if (!invoiceNumber || !invoiceDate || !supplierId) {
      return NextResponse.json(
        { error: 'Número de factura, fecha y proveedor son requeridos' },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Debe incluir al menos un item' },
        { status: 400 }
      );
    }

    // Validar que el número de factura no exista para este tenant
    const existingInvoice = await prisma.invoice.findUnique({
      where: {
        tenantId_invoiceNumber: {
          tenantId: user.tenantId,
          invoiceNumber,
        },
      },
    });

    if (existingInvoice) {
      return NextResponse.json(
        { error: 'Ya existe una factura con este número' },
        { status: 400 }
      );
    }

    // Si tiene workOrderId, validar que existe y pertenece al tenant
    if (workOrderId) {
      const workOrder = await prisma.workOrder.findUnique({
        where: {
          id: workOrderId,
          tenantId: user.tenantId,
        },
      });

      if (!workOrder) {
        return NextResponse.json(
          { error: 'Orden de trabajo no encontrada' },
          { status: 404 }
        );
      }
    }

    // Validar que el proveedor existe y pertenece al tenant
    const provider = await prisma.provider.findUnique({
      where: {
        id: supplierId,
        tenantId: user.tenantId,
      },
    });

    if (!provider) {
      return NextResponse.json(
        { error: 'Proveedor no encontrado' },
        { status: 404 }
      );
    }

    // Si tiene purchaseOrderId, validar que existe y está en estado SENT
    let purchaseOrder = null;
    if (purchaseOrderId) {
      purchaseOrder = await prisma.purchaseOrder.findUnique({
        where: {
          id: purchaseOrderId,
          tenantId: user.tenantId,
        },
        include: { items: true },
      });

      if (!purchaseOrder) {
        return NextResponse.json(
          { error: 'Orden de compra no encontrada' },
          { status: 404 }
        );
      }

      if (purchaseOrder.status !== 'SENT') {
        return NextResponse.json(
          { error: 'Solo se pueden facturar OC en estado SENT' },
          { status: 400 }
        );
      }
    }

    // Crear Invoice + InvoiceItems en transacción
    const invoice = await prisma.$transaction(async (tx) => {
      // 1. Crear Invoice
      const newInvoice = await tx.invoice.create({
        data: {
          tenantId: user.tenantId,
          invoiceNumber,
          invoiceDate: new Date(invoiceDate),
          dueDate: dueDate ? new Date(dueDate) : null,
          supplierId,
          workOrderId: workOrderId || null,
          purchaseOrderId: purchaseOrderId || null,
          subtotal,
          taxAmount,
          totalAmount,
          currency,
          status: 'PENDING',
          registeredBy: user.id,
          notes,
          attachmentUrl,
        },
      });

      // 2. Crear InvoiceItems
      const invoiceItems = await Promise.all(
        items.map((item: InvoiceItemInput) =>
          tx.invoiceItem.create({
            data: {
              invoiceId: newInvoice.id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
              taxRate: item.taxRate || 0,
              taxAmount: item.taxAmount || 0,
              total: item.total,
              workOrderItemId: item.workOrderItemId || null,
              masterPartId: item.masterPartId || null,
            },
          })
        )
      );

      // 3. FASE 6.4: Actualizar precios de referencia y registrar histórico
      const PRICE_DEVIATION_THRESHOLD = 0.20; // 20%

      for (const invoiceItem of invoiceItems) {
        // Si tiene masterPartId, actualizar precio de referencia
        if (invoiceItem.masterPartId) {
          // Registrar en PartPriceHistory
          await tx.partPriceHistory.create({
            data: {
              tenantId: user.tenantId,
              masterPartId: invoiceItem.masterPartId,
              supplierId,
              price: invoiceItem.unitPrice,
              quantity: invoiceItem.quantity,
              invoiceId: newInvoice.id,
              purchasedBy: user.id,
            },
          });

          // Actualizar MasterPart.referencePrice con el nuevo precio
          await tx.masterPart.update({
            where: { id: invoiceItem.masterPartId },
            data: {
              referencePrice: invoiceItem.unitPrice,
              lastPriceUpdate: new Date(),
            },
          });
        }

        // FASE 6.5: Detectar desviación de precio y generar FinancialAlert
        if (invoiceItem.workOrderItemId) {
          const woItem = await tx.workOrderItem.findUnique({
            where: { id: invoiceItem.workOrderItemId },
            select: { unitPrice: true, description: true },
          });

          if (woItem && Number(woItem.unitPrice) > 0) {
            const expected = Number(woItem.unitPrice);
            const actual = Number(invoiceItem.unitPrice);
            const deviation = Math.abs((actual - expected) / expected);

            if (deviation > PRICE_DEVIATION_THRESHOLD) {
              await tx.financialAlert.create({
                data: {
                  tenantId: user.tenantId,
                  workOrderId: workOrderId || undefined,
                  masterPartId: invoiceItem.masterPartId,
                  type: 'PRICE_DEVIATION',
                  severity: deviation > 0.5 ? 'CRITICAL' : 'HIGH',
                  status: 'PENDING',
                  message: `Precio de "${invoiceItem.description}" ($${actual.toLocaleString()}) difiere ${(deviation * 100).toFixed(0)}% del estimado ($${expected.toLocaleString()})`,
                  details: { expected, actual, deviationPercent: (deviation * 100).toFixed(1) },
                },
              });
            }
          }
        }
      }

      // 4. Si tiene workOrderId, actualizar estado de WorkOrder
      if (workOrderId) {
        // FASE 6.1: Solo marcar como EXTERNAL_INVOICE los items con itemSource = EXTERNAL
        // Los items INTERNAL_STOCK se cierran con ticket interno
        await tx.workOrderItem.updateMany({
          where: {
            workOrderId,
            itemSource: ItemSource.EXTERNAL,
          },
          data: {
            status: 'COMPLETED',
            closureType: ItemClosureType.EXTERNAL_INVOICE,
            closedAt: new Date(),
            closedBy: user.id,
          },
        });

        // Verificar si TODOS los items de la OT están cerrados para marcar OT como COMPLETED
        const pendingWOItems = await tx.workOrderItem.count({
          where: {
            workOrderId,
            closureType: ItemClosureType.PENDING,
            status: { not: 'CANCELLED' },
          },
        });

        // Solo cerrar OT si no quedan items pendientes
        if (pendingWOItems === 0) {
          await tx.workOrder.update({
            where: { id: workOrderId },
            data: {
              status: 'COMPLETED',
              actualCost: totalAmount,
              endDate: new Date(),
            },
          });

          // 5. Actualizar MaintenanceAlerts vinculadas a COMPLETED
          await tx.maintenanceAlert.updateMany({
            where: { workOrderId },
            data: {
              status: 'COMPLETED',
              closedAt: new Date(),
            },
          });

          // 6. Actualizar VehicleProgramItems vinculadas a COMPLETED
          const alerts = await tx.maintenanceAlert.findMany({
            where: { workOrderId },
            select: { programItemId: true },
          });

          if (alerts.length > 0) {
            const programItemIds = alerts.map((a) => a.programItemId);
            await tx.vehicleProgramItem.updateMany({
              where: { id: { in: programItemIds } },
              data: {
                status: 'COMPLETED',
                executedDate: new Date(),
              },
            });
          }
        } else {
          // Si aún hay items pendientes, actualizar solo el actualCost parcial
          // pero no cerrar la OT
          const currentWO = await tx.workOrder.findUnique({
            where: { id: workOrderId },
            select: { actualCost: true },
          });

          const currentCost = currentWO?.actualCost ? Number(currentWO.actualCost) : 0;
          await tx.workOrder.update({
            where: { id: workOrderId },
            data: {
              actualCost: currentCost + totalAmount,
            },
          });
        }
      }

      // 7. FASE 6.3: Actualizar PurchaseOrder con vinculación correcta de items
      if (purchaseOrderId && purchaseOrder) {
        // Hacer matching de PurchaseOrderItems con InvoiceItems
        for (const poItem of purchaseOrder.items) {
          // Buscar el InvoiceItem correspondiente por workOrderItemId o descripción
          const matchingInvoiceItem = invoiceItems.find(
            (ii) =>
              (poItem.workOrderItemId && ii.workOrderItemId === poItem.workOrderItemId) ||
              ii.description === poItem.description
          );

          if (matchingInvoiceItem) {
            // Actualizar PurchaseOrderItem con el ID correcto de InvoiceItem
            await tx.purchaseOrderItem.update({
              where: { id: poItem.id },
              data: {
                status: 'COMPLETED',
                invoiceItemId: matchingInvoiceItem.id, // ID correcto de InvoiceItem
                closedAt: new Date(),
              },
            });
          }
        }

        // Verificar si todos los items están completos
        const pendingPOItems = await tx.purchaseOrderItem.count({
          where: {
            purchaseOrderId,
            status: { not: 'COMPLETED' },
          },
        });

        // Actualizar estado de OC
        await tx.purchaseOrder.update({
          where: { id: purchaseOrderId },
          data: {
            status: pendingPOItems === 0 ? 'COMPLETED' : 'PARTIAL',
          },
        });
      }

      return { ...newInvoice, items: invoiceItems };
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error: unknown) {
    console.error('[INVOICES_POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

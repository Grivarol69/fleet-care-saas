import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
        ...(status && { status: status as any }),
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
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return NextResponse.json(
        { error: 'No tienes permisos para crear facturas' },
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
        items.map((item: any) =>
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

      // 3. Si tiene workOrderId, actualizar estado de WorkOrder a COMPLETED
      if (workOrderId) {
        await tx.workOrder.update({
          where: { id: workOrderId },
          data: {
            status: 'COMPLETED',
            actualCost: totalAmount,
          },
        });

        // 4. Actualizar WorkOrderItems a COMPLETED
        await tx.workOrderItem.updateMany({
          where: { workOrderId },
          data: { status: 'COMPLETED' },
        });

        // 5. Actualizar MaintenanceAlerts vinculadas a COMPLETED
        await tx.maintenanceAlert.updateMany({
          where: { workOrderId },
          data: { status: 'COMPLETED' },
        });

        // 6. Actualizar VehicleProgramItems vinculadas a COMPLETED
        // Primero obtenemos los alertIds para encontrar los programItemIds
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

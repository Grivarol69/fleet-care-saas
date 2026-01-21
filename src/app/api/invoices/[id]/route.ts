import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
          select: {
            id: true,
            title: true,
            status: true,
            vehicle: {
              select: {
                id: true,
                licensePlate: true,
                brand: { select: { name: true } },
                line: { select: { name: true } },
                mileage: true,
              },
            },
          },
        },
        items: {
          include: {
            workOrderItem: {
              select: {
                id: true,
                description: true,
                mantItem: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                  },
                },
              },
            },
            masterPart: {
              select: {
                id: true,
                code: true,
                description: true,
              },
            },
          },
        },
        payments: {
          orderBy: {
            paymentDate: 'desc',
          },
        },
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
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Validar permisos
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return NextResponse.json(
        { error: 'No tienes permisos para modificar facturas' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    // Verificar que la factura pertenezca al tenant
    const existingInvoice = await prisma.invoice.findUnique({
      where: {
        id,
        tenantId: user.tenantId,
      },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      );
    }

    // Actualizar factura
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(updatedInvoice);
  } catch (error: unknown) {
    console.error('[INVOICE_PATCH]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Validar permisos
    if (!['OWNER', 'MANAGER'].includes(user.role)) {
      return NextResponse.json(
        { error: 'No tienes permisos para eliminar facturas' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Verificar que la factura pertenezca al tenant
    const existingInvoice = await prisma.invoice.findUnique({
      where: {
        id,
        tenantId: user.tenantId,
      },
      include: {
        workOrder: true,
      },
    });

    if (!existingInvoice) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      );
    }

    // Validar que no tenga pagos
    const paymentsCount = await prisma.invoicePayment.count({
      where: { invoiceId: id },
    });

    if (paymentsCount > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar una factura con pagos registrados' },
        { status: 400 }
      );
    }

    // Eliminar en transacción
    await prisma.$transaction(async (tx) => {
      // 1. Eliminar items
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: id },
      });

      // 2. Eliminar factura
      await tx.invoice.delete({
        where: { id },
      });

      // 3. Si tenía workOrder, revertir a PENDING_INVOICE
      if (existingInvoice.workOrderId) {
        await tx.workOrder.update({
          where: { id: existingInvoice.workOrderId },
          data: {
            status: 'PENDING_INVOICE',
            actualCost: null,
            endDate: null,
          },
        });

        // Revertir items a IN_PROGRESS
        await tx.workOrderItem.updateMany({
          where: { workOrderId: existingInvoice.workOrderId },
          data: { status: 'IN_PROGRESS' },
        });

        // Revertir alertas a IN_PROGRESS
        await tx.maintenanceAlert.updateMany({
          where: { workOrderId: existingInvoice.workOrderId },
          data: { status: 'IN_PROGRESS' },
        });

        // Revertir program items a PENDING
        const alerts = await tx.maintenanceAlert.findMany({
          where: { workOrderId: existingInvoice.workOrderId },
          select: { programItemId: true },
        });

        if (alerts.length > 0) {
          const programItemIds = alerts.map((a) => a.programItemId);
          await tx.vehicleProgramItem.updateMany({
            where: { id: { in: programItemIds } },
            data: {
              status: 'PENDING',
              executedDate: null,
            },
          });
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('[INVOICE_DELETE]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno' },
      { status: 500 }
    );
  }
}

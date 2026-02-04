import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Schema for invoice update validation - only allow specific fields
const updateInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1).max(100).optional(),
  invoiceDate: z.string().datetime().optional(),
  dueDate: z.string().datetime().nullable().optional(),
  supplierId: z.number().int().positive().optional(),
  workOrderId: z.number().int().positive().nullable().optional(),
  subtotal: z.number().positive().optional(),
  taxAmount: z.number().min(0).optional(),
  totalAmount: z.number().positive().optional(),
  currency: z.string().max(10).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  approvedBy: z.string().nullable().optional(),
  approvedAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  attachmentUrl: z.string().url().nullable().optional(),
  pdfUrl: z.string().url().nullable().optional(),
  ocrStatus: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
  needsReview: z.boolean().optional(),
}).strict();

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;

    // Validate id format (cuid)
    if (!id || typeof id !== 'string' || id.length < 20) {
      return NextResponse.json(
        { error: 'ID de factura inválido' },
        { status: 400 }
      );
    }

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

    // Validate id format
    if (!id || typeof id !== 'string' || id.length < 20) {
      return NextResponse.json(
        { error: 'ID de factura inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Validate request body with Zod schema
    const validation = updateInvoiceSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten() },
        { status: 400 }
      );
    }

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

    // Build update data with only validated fields
    const updateData: Record<string, unknown> = {};
    const validatedData = validation.data;

    if (validatedData.invoiceNumber !== undefined) updateData.invoiceNumber = validatedData.invoiceNumber;
    if (validatedData.invoiceDate !== undefined) updateData.invoiceDate = new Date(validatedData.invoiceDate);
    if (validatedData.dueDate !== undefined) updateData.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null;
    if (validatedData.supplierId !== undefined) updateData.supplierId = validatedData.supplierId;
    if (validatedData.workOrderId !== undefined) updateData.workOrderId = validatedData.workOrderId;
    if (validatedData.subtotal !== undefined) updateData.subtotal = validatedData.subtotal;
    if (validatedData.taxAmount !== undefined) updateData.taxAmount = validatedData.taxAmount;
    if (validatedData.totalAmount !== undefined) updateData.totalAmount = validatedData.totalAmount;
    if (validatedData.currency !== undefined) updateData.currency = validatedData.currency;
    if (validatedData.status !== undefined) updateData.status = validatedData.status;
    if (validatedData.notes !== undefined) updateData.notes = validatedData.notes;
    if (validatedData.attachmentUrl !== undefined) updateData.attachmentUrl = validatedData.attachmentUrl;
    if (validatedData.pdfUrl !== undefined) updateData.pdfUrl = validatedData.pdfUrl;
    if (validatedData.ocrStatus !== undefined) updateData.ocrStatus = validatedData.ocrStatus;
    if (validatedData.needsReview !== undefined) updateData.needsReview = validatedData.needsReview;

    // Handle approval fields - only set if status is being changed to APPROVED
    if (validatedData.status === 'APPROVED' && existingInvoice.status !== 'APPROVED') {
      updateData.approvedBy = user.id;
      updateData.approvedAt = new Date();
    }

    // Actualizar factura
    const updatedInvoice = await prisma.invoice.update({
      where: { id },
      data: updateData,
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
  _request: NextRequest,
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

    // Validate id format
    if (!id || typeof id !== 'string' || id.length < 20) {
      return NextResponse.json(
        { error: 'ID de factura inválido' },
        { status: 400 }
      );
    }

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

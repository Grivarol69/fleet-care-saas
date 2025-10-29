import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { Prisma } from "@prisma/client";

type InvoiceItemInput = {
  masterPartId?: string | null;
  workOrderItemId?: number | null;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  taxAmount?: number;
  total?: number;
};

/**
 * GET - Listar Invoices con filtros
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workOrderId = searchParams.get("workOrderId");
    const status = searchParams.get("status");
    const supplierId = searchParams.get("supplierId");
    const limit = searchParams.get("limit");

    // Construir filtros
    const where: Prisma.InvoiceWhereInput = {
      tenantId: user.tenantId,
    };

    if (workOrderId) {
      where.workOrderId = parseInt(workOrderId);
    }

    if (status) {
      where.status = status;
    }

    if (supplierId) {
      where.supplierId = parseInt(supplierId);
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        workOrder: {
          select: {
            id: true,
            title: true,
            vehicle: {
              select: {
                id: true,
                licensePlate: true,
              },
            },
          },
        },
        items: {
          select: {
            id: true,
            description: true,
            quantity: true,
            unitPrice: true,
            total: true,
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
      },
      orderBy: {
        invoiceDate: "desc",
      },
      take: limit ? parseInt(limit) : undefined,
    });

    return NextResponse.json(invoices);
  } catch (error: unknown) {
    console.error("[INVOICES_GET]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error interno",
      },
      { status: 500 }
    );
  }
}

/**
 * POST - Crear Invoice vinculada a WorkOrder
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Validar permisos (OWNER, MANAGER pueden registrar facturas)
    const { canApproveInvoices } = await import("@/lib/permissions");
    if (!canApproveInvoices(user)) {
      return NextResponse.json(
        { error: "No tienes permisos para registrar facturas" },
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
      currency = "COP",
      notes,
      attachmentUrl,
      items,
    } = body;

    // Validaciones básicas
    if (!invoiceNumber || !invoiceDate || !supplierId || !totalAmount) {
      return NextResponse.json(
        {
          error:
            "invoiceNumber, invoiceDate, supplierId y totalAmount son requeridos",
        },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Se requiere al menos un item de factura" },
        { status: 400 }
      );
    }

    // Validar que el invoiceNumber no exista para este tenant
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
        { error: "Ya existe una factura con este número" },
        { status: 409 }
      );
    }

    // Si está vinculada a WorkOrder, validar que existe y está completada
    if (workOrderId) {
      const workOrder = await prisma.workOrder.findUnique({
        where: { id: workOrderId, tenantId: user.tenantId },
        include: { workOrderItems: true },
      });

      if (!workOrder) {
        return NextResponse.json(
          { error: "Orden de trabajo no encontrada" },
          { status: 404 }
        );
      }

      if (workOrder.status !== "COMPLETED") {
        return NextResponse.json(
          {
            error:
              "La orden de trabajo debe estar completada antes de registrar factura",
          },
          { status: 400 }
        );
      }
    }

    // Crear Invoice con Items en transacción
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
          subtotal: subtotal || totalAmount,
          taxAmount: taxAmount || 0,
          totalAmount,
          currency,
          status: "PENDING",
          registeredBy: user.id,
          notes: notes || null,
          attachmentUrl: attachmentUrl || null,
        },
      });

      // 2. Crear InvoiceItems
      await Promise.all(
        items.map((item: InvoiceItemInput) =>
          tx.invoiceItem.create({
            data: {
              invoiceId: newInvoice.id,
              masterPartId: item.masterPartId || null,
              workOrderItemId: item.workOrderItemId || null,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.quantity * item.unitPrice,
              taxRate: item.taxRate || 0,
              taxAmount: item.taxAmount || 0,
              total: item.total || item.quantity * item.unitPrice,
            },
          })
        )
      );

      return newInvoice;
    });

    // Retornar con relaciones
    const invoiceWithRelations = await prisma.invoice.findUnique({
      where: { id: invoice.id },
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

    return NextResponse.json(invoiceWithRelations, { status: 201 });
  } catch (error: unknown) {
    console.error("[INVOICES_POST]", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Error interno",
      },
      { status: 500 }
    );
  }
}

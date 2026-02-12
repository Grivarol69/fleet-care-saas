import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { Prisma, PurchaseOrderStatus, PurchaseOrderType } from "@prisma/client";
import { canManagePurchases } from "@/lib/permissions";

/**
 * GET - Listar Ordenes de Compra con filtros
 * Query params: workOrderId, status, type, providerId, limit
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
    const type = searchParams.get("type");
    const providerId = searchParams.get("providerId");
    const limit = searchParams.get("limit");

    const where: Prisma.PurchaseOrderWhereInput = {
      tenantId: user.tenantId,
    };

    if (workOrderId) where.workOrderId = parseInt(workOrderId);
    if (status) where.status = status as PurchaseOrderStatus;
    if (type) where.type = type as PurchaseOrderType;
    if (providerId) where.providerId = parseInt(providerId);

    const purchaseOrders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        workOrder: {
          select: {
            id: true,
            title: true,
            vehicle: {
              select: {
                licensePlate: true,
                brand: { select: { name: true } },
              },
            },
          },
        },
        provider: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            mantItem: { select: { name: true } },
            masterPart: { select: { code: true, description: true } },
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
      orderBy: { createdAt: "desc" },
      ...(limit ? { take: parseInt(limit) } : {}),
    });

    return NextResponse.json(purchaseOrders);
  } catch (error: unknown) {
    console.error("[PURCHASE_ORDERS_GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno" },
      { status: 500 }
    );
  }
}

/**
 * POST - Crear Orden de Compra
 * Body: { workOrderId, type, providerId, items: [...], notes? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Validar permisos (OWNER, MANAGER, PURCHASER)
    if (!canManagePurchases(user)) {
      return NextResponse.json(
        { error: "No tienes permisos para esta acción" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { workOrderId, type, providerId, items, notes } = body;

    // Validaciones basicas
    if (!workOrderId || !type || !providerId || !items?.length) {
      return NextResponse.json(
        { error: "workOrderId, type, providerId y items son requeridos" },
        { status: 400 }
      );
    }

    // Validar WorkOrder existe y pertenece al tenant
    const workOrder = await prisma.workOrder.findUnique({
      where: { id: workOrderId, tenantId: user.tenantId },
    });

    if (!workOrder) {
      return NextResponse.json(
        { error: "Orden de trabajo no encontrada" },
        { status: 404 }
      );
    }

    // Validar Provider existe y pertenece al tenant
    const provider = await prisma.provider.findUnique({
      where: { id: providerId, tenantId: user.tenantId },
    });

    if (!provider) {
      return NextResponse.json(
        { error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    // Generar numero de OC
    const year = new Date().getFullYear();
    const lastOC = await prisma.purchaseOrder.findFirst({
      where: {
        tenantId: user.tenantId,
        orderNumber: { startsWith: `OC-${year}-` },
      },
      orderBy: { orderNumber: "desc" },
    });

    let nextNumber = 1;
    if (lastOC) {
      const lastNum = parseInt(lastOC.orderNumber.split("-")[2] || "0");
      nextNumber = lastNum + 1;
    }
    const orderNumber = `OC-${year}-${nextNumber.toString().padStart(6, "0")}`;

    // Calcular totales
    const subtotal = items.reduce(
      (sum: number, item: { quantity: number | string; unitPrice: number | string }) =>
        sum + Number(item.quantity) * Number(item.unitPrice),
      0
    );
    const taxRate = 0; // Configurable por tenant
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    // Crear OC con items en transaccion
    const purchaseOrder = await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          tenantId: user.tenantId,
          workOrderId,
          orderNumber,
          type: type as PurchaseOrderType,
          providerId,
          status: "DRAFT",
          requestedBy: user.id,
          subtotal,
          taxRate,
          taxAmount,
          total,
          notes,
          items: {
            create: items.map(
              (item: {
                workOrderItemId?: number;
                mantItemId?: number;
                masterPartId?: string;
                description: string;
                quantity: number | string;
                unitPrice: number | string;
              }) => ({
                workOrderItemId: item.workOrderItemId || null,
                mantItemId: item.mantItemId || null,
                masterPartId: item.masterPartId || null,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                total: Number(item.quantity) * Number(item.unitPrice),
                status: "PENDING",
              })
            ),
          },
        },
        include: {
          items: true,
          provider: { select: { name: true } },
        },
      });

      return po;
    });

    return NextResponse.json(purchaseOrder, { status: 201 });
  } catch (error: unknown) {
    console.error("[PURCHASE_ORDERS_POST]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno" },
      { status: 500 }
    );
  }
}

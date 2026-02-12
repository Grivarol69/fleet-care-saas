import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { PurchaseOrderStatus } from "@prisma/client";
import { Resend } from "resend";
import { renderToBuffer } from "@react-pdf/renderer";
import { PurchaseOrderPDF } from "@/components/pdf/PurchaseOrderPDF";
import { PurchaseOrderEmail } from "@/emails/PurchaseOrderEmail";
import React from "react";
import { canManagePurchases } from "@/lib/permissions";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET - Detalle de Orden de Compra
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { id } = await params;

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id, tenantId: user.tenantId },
      include: {
        workOrder: {
          include: {
            vehicle: {
              include: {
                brand: true,
                line: true,
              },
            },
          },
        },
        provider: true,
        items: {
          include: {
            workOrderItem: true,
            mantItem: true,
            masterPart: true,
          },
        },
        invoices: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "Orden de compra no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(purchaseOrder);
  } catch (error: unknown) {
    console.error("[PURCHASE_ORDER_GET]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno" },
      { status: 500 }
    );
  }
}

/**
 * PATCH - Actualizar estado de Orden de Compra
 * Body: { action: 'submit' | 'approve' | 'reject' | 'send' | 'cancel', notes? }
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (!canManagePurchases(user)) {
      return NextResponse.json(
        { error: "No tienes permisos para esta acción" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { action, notes } = body;

    // Obtener OC actual
    const currentPO = await prisma.purchaseOrder.findUnique({
      where: { id, tenantId: user.tenantId },
    });

    if (!currentPO) {
      return NextResponse.json(
        { error: "Orden de compra no encontrada" },
        { status: 404 }
      );
    }

    // Definir transiciones validas
    const validTransitions: Record<
      string,
      { from: PurchaseOrderStatus[]; to: PurchaseOrderStatus; requiredRole?: string[] }
    > = {
      submit: {
        from: ["DRAFT"],
        to: "PENDING_APPROVAL",
        requiredRole: ["OWNER", "MANAGER", "PURCHASER"],
      },
      approve: {
        from: ["PENDING_APPROVAL"],
        to: "APPROVED",
        requiredRole: ["OWNER", "MANAGER"],
      },
      reject: {
        from: ["PENDING_APPROVAL"],
        to: "DRAFT",
        requiredRole: ["OWNER", "MANAGER"],
      },
      send: {
        from: ["APPROVED"],
        to: "SENT",
        requiredRole: ["OWNER", "MANAGER", "PURCHASER"],
      },
      cancel: {
        from: ["DRAFT", "PENDING_APPROVAL", "APPROVED"],
        to: "CANCELLED",
        requiredRole: ["OWNER", "MANAGER"],
      },
    };

    const transition = validTransitions[action];
    if (!transition) {
      return NextResponse.json(
        { error: `Accion '${action}' no valida` },
        { status: 400 }
      );
    }

    if (!transition.from.includes(currentPO.status)) {
      return NextResponse.json(
        { error: `No se puede ${action} una OC en estado ${currentPO.status}` },
        { status: 400 }
      );
    }

    if (transition.requiredRole && !transition.requiredRole.includes(user.role)) {
      return NextResponse.json(
        { error: "No tienes permisos para esta accion" },
        { status: 403 }
      );
    }

    // Preparar datos de actualizacion
    const updateData: {
      status: PurchaseOrderStatus;
      notes?: string;
      approvedBy?: string;
      approvedAt?: Date;
      sentAt?: Date;
    } = {
      status: transition.to,
      ...(notes && { notes }),
    };

    // Datos adicionales segun accion
    if (action === "approve") {
      updateData.approvedBy = user.id;
      updateData.approvedAt = new Date();
    } else if (action === "send") {
      // Enviar email al proveedor con PDF adjunto
      const fullPO = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: {
          provider: true,
          items: {
            include: {
              masterPart: { select: { code: true, description: true } },
            },
          },
          workOrder: {
            include: {
              vehicle: {
                include: { brand: true, line: true },
              },
            },
          },
        },
      });

      if (!fullPO) {
        return NextResponse.json({ error: "OC no encontrada" }, { status: 404 });
      }

      if (!fullPO.provider.email) {
        return NextResponse.json(
          { error: "El proveedor no tiene email configurado. Actualice los datos del proveedor antes de enviar." },
          { status: 400 }
        );
      }

      // Obtener nombre del tenant
      const tenant = await prisma.tenant.findUnique({
        where: { id: user.tenantId },
        select: { name: true },
      });

      const orderDate = fullPO.createdAt.toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Construir props del PDF
      const pdfVehicle = fullPO.workOrder?.vehicle
        ? {
            licensePlate: fullPO.workOrder.vehicle.licensePlate,
            ...(fullPO.workOrder.vehicle.brand?.name && { brand: fullPO.workOrder.vehicle.brand.name }),
            ...(fullPO.workOrder.vehicle.line?.name && { line: fullPO.workOrder.vehicle.line.name }),
            ...(fullPO.workOrder.vehicle.year && { year: fullPO.workOrder.vehicle.year }),
          }
        : undefined;

      const pdfWorkOrder = fullPO.workOrder
        ? {
            id: fullPO.workOrder.id,
            title: fullPO.workOrder.title,
            ...(pdfVehicle && { vehicle: pdfVehicle }),
          }
        : undefined;

      const pdfProps = {
        orderNumber: fullPO.orderNumber,
        orderDate,
        orderType: fullPO.type as "SERVICES" | "PARTS",
        status: fullPO.status,
        tenant: { name: tenant?.name || "FleetCare" },
        provider: {
          name: fullPO.provider.name,
          email: fullPO.provider.email,
          phone: fullPO.provider.phone,
          address: fullPO.provider.address,
        },
        ...(pdfWorkOrder && { workOrder: pdfWorkOrder }),
        items: fullPO.items.map((item) => ({
          description: item.description,
          masterPartCode: item.masterPart?.code ?? null,
          masterPartDescription: item.masterPart?.description ?? null,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          total: Number(item.total),
        })),
        subtotal: Number(fullPO.subtotal),
        taxRate: Number(fullPO.taxRate),
        taxAmount: Number(fullPO.taxAmount),
        total: Number(fullPO.total),
        notes: fullPO.notes,
        approvedBy: fullPO.approvedBy,
        approvedAt: fullPO.approvedAt
          ? fullPO.approvedAt.toLocaleDateString("es-CO")
          : null,
      };

      // Generar PDF
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const pdfElement = React.createElement(PurchaseOrderPDF, pdfProps) as any;
      const pdfBuffer = await renderToBuffer(pdfElement);

      // Preparar info del vehiculo para el email
      const vehicleInfo = fullPO.workOrder?.vehicle
        ? `${fullPO.workOrder.vehicle.licensePlate}${fullPO.workOrder.vehicle.brand ? ` - ${fullPO.workOrder.vehicle.brand.name}` : ""}${fullPO.workOrder.vehicle.line ? ` ${fullPO.workOrder.vehicle.line.name}` : ""}${fullPO.workOrder.vehicle.year ? ` (${fullPO.workOrder.vehicle.year})` : ""}`
        : undefined;

      // Enviar email con Resend
      const resend = new Resend(process.env.RESEND_API_KEY);
      const emailProps = {
        orderNumber: fullPO.orderNumber,
        orderType: fullPO.type as "SERVICES" | "PARTS",
        providerName: fullPO.provider.name,
        tenantName: tenant?.name || "FleetCare",
        ...(vehicleInfo && { vehicleInfo }),
        itemCount: fullPO.items.length,
        totalAmount: new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          minimumFractionDigits: 0,
        }).format(Number(fullPO.total)),
      };

      const { error: emailError } = await resend.emails.send({
        from: process.env.RESEND_FROM_EMAIL || "noreply@fleetcare.com",
        to: [fullPO.provider.email],
        subject: `Orden de Compra ${fullPO.orderNumber} - ${tenant?.name || "FleetCare"}`,
        react: React.createElement(PurchaseOrderEmail, emailProps),
        attachments: [
          {
            filename: `OC_${fullPO.orderNumber}.pdf`,
            content: pdfBuffer,
          },
        ],
      });

      if (emailError) {
        console.error("[PURCHASE_ORDER_SEND_EMAIL]", emailError);
        return NextResponse.json(
          { error: "Error al enviar el email al proveedor" },
          { status: 500 }
        );
      }

      updateData.sentAt = new Date();
    }

    const updatedPO = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
      include: {
        items: true,
        provider: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json(updatedPO);
  } catch (error: unknown) {
    console.error("[PURCHASE_ORDER_PATCH]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno" },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Eliminar OC (solo si DRAFT)
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (!canManagePurchases(user)) {
      return NextResponse.json(
        { error: "No tienes permisos para esta acción" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: { id, tenantId: user.tenantId },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "Orden de compra no encontrada" },
        { status: 404 }
      );
    }

    if (purchaseOrder.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Solo se pueden eliminar OC en estado DRAFT" },
        { status: 400 }
      );
    }

    await prisma.purchaseOrder.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("[PURCHASE_ORDER_DELETE]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { renderToBuffer } from '@react-pdf/renderer';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { PurchaseOrderFullPDF } from '@/app/dashboard/purchase-orders/components/PurchaseOrderFullPDF';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const poId = params.id;
    const body = await req.json();
    const { recipientEmail, recipientName } = body;

    if (!poId || !recipientEmail) {
      return NextResponse.json(
        { error: 'id y recipientEmail son requeridos' },
        { status: 400 }
      );
    }

    // Obtener datos de la Orden de Compra
    const po = await prisma.purchaseOrder.findUnique({
      where: {
        id: poId,
        tenantId: user.tenantId,
      },
      include: {
        provider: true,
        workOrder: {
          include: {
            vehicle: {
              include: { brand: true },
            },
          },
        },
        items: {
          include: {
            workOrderItem: {
              include: {
                mantItem: true,
              },
            },
          },
        },
      },
    });

    if (!po) {
      return NextResponse.json(
        { error: 'Orden de Compra no encontrada' },
        { status: 404 }
      );
    }

    // Obtener datos del tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        name: true,
        logo: true,
        address: true,
        phone: true,
        taxId: true,
        currency: true,
      },
    });

    // Formatear items
    const items = po.items.map(item => ({
      id: item.id,
      description: item.workOrderItem?.mantItem?.name 
        ? `${item.workOrderItem.mantItem.name}${item.workOrderItem.description ? `\n${item.workOrderItem.description}` : ''}`
        : item.description || 'Ítem',
      quantity: Number(item.quantity || 0),
      unitPrice: Number(item.unitPrice || 0),
      totalCost: Number(item.quantity || 0) * Number(item.unitPrice || 0),
    }));

    // Formatear PDF Props
    const tenantData = {
      name: tenant?.name || 'Fleet Care',
      logo: tenant?.logo || null,
      address: tenant?.address || null,
      phone: tenant?.phone || null,
      taxId: tenant?.taxId || null,
      currency: tenant?.currency || 'COP',
    };

    const purchaseOrderData = {
      orderNumber: po.orderNumber,
      type: po.type,
      status: po.status,
      notes: po.notes,
      total: Number(po.total || 0),
      createdAt: po.createdAt.toISOString(),
      provider: po.provider,
      workOrder: po.workOrder ? {
        title: po.workOrder.title,
        vehicle: po.workOrder.vehicle,
      } : null,
    };

    // Generar PDF
    const pdfBuffer = await renderToBuffer(
      <PurchaseOrderFullPDF
        tenant={tenantData}
        purchaseOrder={purchaseOrderData}
        items={items}
      />
    );

    const attachments = [
      {
        filename: `Orden_Compra_${po.orderNumber}.pdf`,
        content: pdfBuffer,
      },
    ];

    // Contenido del email
    const subject = `Orden de Compra Adjunta: ${po.orderNumber} - ${tenantData.name}`;
    const nameStr = recipientName ? ` ${recipientName}` : '';
    const htmlBody = `
      <div style="font-family: sans-serif; font-size: 14px; color: #333;">
        <p>Hola${nameStr},</p>
        <p>Adjunto a este correo encontrarás la Orden de Compra <strong>${po.orderNumber}</strong> generada desde <strong>${tenantData.name}</strong>.</p>
        <p>Por favor revisa el documento adjunto para conocer el detalle de los repuestos/servicios requeridos.</p>
        <br/>
        <p>Saludos cordiales,</p>
        <p><strong>${tenantData.name}</strong></p>
      </div>
    `;

    // Enviar email
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || 'noreply@fleetcare.com',
      to: [recipientEmail],
      subject,
      html: htmlBody,
      attachments,
    });

    if (error) {
      console.error('Error sending PO email:', error);
      return NextResponse.json(
        { error: 'Error al enviar el email' },
        { status: 500 }
      );
    }

    // Actualizar estado de la OC a "SENT" si era DRAFT o APPROVED
    if (po.status === 'APPROVED' || po.status === 'DRAFT') {
      await prisma.purchaseOrder.update({
        where: { id: po.id },
        data: { status: 'SENT' },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Email enviado exitosamente',
      emailId: data?.id,
    });
  } catch (error) {
    console.error('Error in send-email PO endpoint:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

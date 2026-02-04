import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { VehicleCVEmail } from "@/emails/VehicleCVEmail";
import { renderToBuffer } from "@react-pdf/renderer";
import { VehicleCV } from "@/app/dashboard/vehicles/fleet/components/VehicleCV/VehicleCV";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from '@/lib/auth';
import React from "react";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "No autorizado" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { vehicleId, recipientEmail, recipientName } = body;

    if (!vehicleId || !recipientEmail) {
      return NextResponse.json(
        { error: "vehicleId y recipientEmail son requeridos" },
        { status: 400 }
      );
    }

    // Obtener datos del vehículo con documentos
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        tenantId: user.tenantId,
      },
      include: {
        brand: true,
        line: true,
        type: true,
        documents: {
          where: {
            status: "ACTIVE",
          },
          select: {
            id: true,
            documentTypeId: true,
            documentType: true,
            documentNumber: true,
            expiryDate: true,
            entity: true,
            fileUrl: true,
          },
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: "Vehículo no encontrado" },
        { status: 404 }
      );
    }

    // Obtener datos del tenant
    const tenant = await prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: {
        name: true,
        logo: true,
      },
    });

    // Generar PDF del CV
    const vehicleData = {
      licensePlate: vehicle.licensePlate,
      ...(vehicle.brand && { brand: { name: vehicle.brand.name } }),
      ...(vehicle.line && { line: { name: vehicle.line.name } }),
      ...(vehicle.type && { type: { name: vehicle.type.name } }),
      year: vehicle.year,
      color: vehicle.color,
      ...(vehicle.cylinder && { cylinder: vehicle.cylinder }),
      ...(vehicle.bodyWork && { bodyWork: vehicle.bodyWork }),
      ...(vehicle.engineNumber && { engineNumber: vehicle.engineNumber }),
      ...(vehicle.chasisNumber && { chasisNumber: vehicle.chasisNumber }),
      ...(vehicle.ownerCard && { ownerCard: vehicle.ownerCard }),
      ...(vehicle.fuelType && { fuelType: vehicle.fuelType }),
      ...(vehicle.serviceType && { serviceType: vehicle.serviceType }),
      ...(vehicle.photo && { photo: vehicle.photo }),
      mileage: vehicle.mileage,
      ...(vehicle.emergencyContactName && { emergencyContactName: vehicle.emergencyContactName }),
      ...(vehicle.emergencyContactPhone && { emergencyContactPhone: vehicle.emergencyContactPhone }),
    };

    const tenantData: { name: string; logo?: string } | undefined = tenant ? {
      name: tenant.name,
      ...(tenant.logo && { logo: tenant.logo }),
    } : undefined;

    const documentsData: Array<{
      type: string;
      documentNumber?: string;
      expiryDate?: string;
      entity?: string;
    }> = vehicle.documents.map((doc) => ({
      type: doc.documentType.code,
      ...(doc.documentNumber && { documentNumber: doc.documentNumber }),
      ...(doc.expiryDate && { expiryDate: doc.expiryDate.toISOString() }),
      ...(doc.entity && { entity: doc.entity }),
    }));

    const pdfBuffer = await renderToBuffer(
      <VehicleCV
        vehicle={vehicleData}
        {...(tenantData && { tenant: tenantData })}
        documents={documentsData}
      />
    );

    // Preparar attachments: CV + documentos del vehículo
    const attachments: Array<{ filename: string; content: Buffer }> = [
      {
        filename: `CV_${vehicle.licensePlate}_${new Date().toISOString().split("T")[0]}.pdf`,
        content: pdfBuffer,
      },
    ];

    // Descargar y adjuntar documentos activos del vehículo
    for (const doc of vehicle.documents) {
      try {
        if (!doc.fileUrl) continue;

        const response = await fetch(doc.fileUrl);
        if (!response.ok) continue;

        const buffer = Buffer.from(await response.arrayBuffer());

        // Generar nombre descriptivo para el archivo
        const docTypeName = doc.documentType.name.replace(/\s+/g, '_') || "Documento";
        const extension = doc.fileUrl.split(".").pop()?.toLowerCase() || "pdf";

        attachments.push({
          filename: `${docTypeName}_${vehicle.licensePlate}.${extension}`,
          content: buffer,
        });
      } catch (error) {
        console.error(`Error downloading document ${doc.id}:`, error);
        // Continuar con los demás documentos aunque uno falle
      }
    }

    // Enviar email con Resend
    const { data, error } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "noreply@fleetcare.com",
      to: [recipientEmail],
      subject: `Hoja de Vida del Vehículo ${vehicle.licensePlate}`,
      react: VehicleCVEmail({
        vehiclePlate: vehicle.licensePlate,
        recipientName: recipientName || "Estimado usuario",
        tenantName: tenant?.name || "FleetCare",
      }),
      attachments,
    });

    if (error) {
      console.error("Error sending email:", error);
      return NextResponse.json(
        { error: "Error al enviar el email" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Email enviado exitosamente",
      emailId: data?.id,
    });
  } catch (error) {
    console.error("Error in send-cv endpoint:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

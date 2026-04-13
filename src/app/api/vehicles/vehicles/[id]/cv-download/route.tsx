import { NextResponse } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { VehicleCV } from '@/app/dashboard/vehicles/fleet/components/VehicleCV/VehicleCV';
import { requireCurrentUser } from '@/lib/auth';
import { mergePdfWithAttachments } from '@/lib/pdf-merge';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, tenantPrisma } = await requireCurrentUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const vehicle = await tenantPrisma.vehicle.findUnique({
      where: { id },
      include: {
        brand: true,
        line: true,
        type: true,
        documents: {
          where: { status: 'ACTIVE' },
          include: { documentType: true },
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 404 }
      );
    }

    const tenant = await tenantPrisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true, logo: true },
    });

    const vehicleData = {
      licensePlate: vehicle.licensePlate,
      ...(vehicle.brand && { brand: { name: vehicle.brand.name } }),
      ...(vehicle.line && { line: { name: vehicle.line.name } }),
      ...(vehicle.type && { type: { name: vehicle.type.name } }),
      year: vehicle.year,
      color: vehicle.color,
      mileage: vehicle.mileage,
      ...(vehicle.cylinder && { cylinder: vehicle.cylinder }),
      ...(vehicle.bodyWork && { bodyWork: vehicle.bodyWork }),
      ...(vehicle.engineNumber && { engineNumber: vehicle.engineNumber }),
      ...(vehicle.chasisNumber && { chasisNumber: vehicle.chasisNumber }),
      ...(vehicle.ownerCard && { ownerCard: vehicle.ownerCard }),
      ...(vehicle.fuelType && { fuelType: vehicle.fuelType }),
      ...(vehicle.serviceType && { serviceType: vehicle.serviceType }),
      ...(vehicle.photo && { photo: vehicle.photo }),
      ...(vehicle.emergencyContactName && {
        emergencyContactName: vehicle.emergencyContactName,
      }),
      ...(vehicle.emergencyContactPhone && {
        emergencyContactPhone: vehicle.emergencyContactPhone,
      }),
    };

    const tenantData = tenant
      ? { name: tenant.name, ...(tenant.logo && { logo: tenant.logo }) }
      : undefined;

    const documentsData = vehicle.documents.map(doc => ({
      type: doc.documentType.code,
      ...(doc.documentNumber && { documentNumber: doc.documentNumber }),
      ...(doc.expiryDate && { expiryDate: doc.expiryDate.toISOString() }),
      ...(doc.entity && { entity: doc.entity }),
      typeName: doc.documentType.name,
    }));

    const cvBuffer = await renderToBuffer(
      <VehicleCV
        vehicle={vehicleData}
        {...(tenantData && { tenant: tenantData })}
        documents={documentsData}
      />
    );

    // Download and merge attached files
    const docAttachments: Array<{ buffer: Buffer; name: string }> = [];

    for (const doc of vehicle.documents) {
      try {
        if (!doc.fileUrl) continue;

        const response = await fetch(doc.fileUrl);
        if (!response.ok) continue;

        const buffer = Buffer.from(await response.arrayBuffer());
        const docTypeName = doc.documentType.name.replace(/\s+/g, '_');

        docAttachments.push({
          buffer,
          name: `${docTypeName}_${vehicle.licensePlate}`,
        });
      } catch (err) {
        console.error(`[cv-download] Failed to fetch doc ${doc.id}:`, err);
      }
    }

    const finalBuffer =
      docAttachments.length > 0
        ? await mergePdfWithAttachments(cvBuffer, docAttachments)
        : cvBuffer;

    const fileName = `CV_${vehicle.licensePlate}_${new Date().toISOString().split('T')[0]}.pdf`;

    return new Response(finalBuffer.buffer as ArrayBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('[CV_DOWNLOAD]', error);
    return NextResponse.json(
      { error: 'Error generando el PDF' },
      { status: 500 }
    );
  }
}

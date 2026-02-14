import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { canManageVehicles } from '@/lib/permissions';

// GET all documents for a specific vehicle
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const vehiclePlate = searchParams.get('vehiclePlate');

    if (!vehiclePlate) {
      return new NextResponse('Vehicle plate is required', { status: 400 });
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: {
        tenantId_licensePlate: {
          tenantId: user.tenantId,
          licensePlate: vehiclePlate,
        },
      },
    });

    if (!vehicle) {
      return new NextResponse('Vehicle not found', { status: 404 });
    }

    const documents = await prisma.document.findMany({
      where: {
        tenantId: user.tenantId,
        vehicleId: vehicle.id,
      },
      include: {
        documentType: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error('[DOCUMENTS_GET]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

// POST a new document for a vehicle
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!canManageVehicles(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const {
      vehiclePlate,
      documentTypeId,
      documentNumber,
      entity,
      fileUrl,
      expiryDate,
      status,
    } = body;

    if (!vehiclePlate || !documentTypeId || !documentNumber || !fileUrl) {
      return new NextResponse('Missing required fields', { status: 400 });
    }

    // Extraer fileName del fileUrl automáticamente
    const fileName = fileUrl.split('/').pop() || 'document.pdf';

    const vehicle = await prisma.vehicle.findUnique({
      where: {
        tenantId_licensePlate: {
          tenantId: user.tenantId,
          licensePlate: vehiclePlate,
        },
      },
    });

    if (!vehicle) {
      return new NextResponse('Vehicle not found for this tenant', {
        status: 404,
      });
    }

    // Verify document type exists and is accessible
    const docType = await prisma.documentTypeConfig.findUnique({
      where: { id: documentTypeId },
    });

    if (!docType || docType.status !== 'ACTIVE') {
      return new NextResponse('Invalid document type', { status: 400 });
    }

    // Verify access: global or belongs to tenant
    if (!docType.isGlobal && docType.tenantId !== user.tenantId) {
      return new NextResponse('Document type not accessible', { status: 403 });
    }

    const newDocument = await prisma.document.create({
      data: {
        tenantId: user.tenantId,
        vehicleId: vehicle.id,
        documentTypeId,
        fileName,
        documentNumber,
        entity: entity || null,
        fileUrl,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        status: status || 'ACTIVE',
      },
      include: {
        documentType: true,
      },
    });

    return NextResponse.json(newDocument);
  } catch (error) {
    console.error('[DOCUMENTS_POST]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

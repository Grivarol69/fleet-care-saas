import { prisma } from '@/lib/prisma';
import { requireCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireDocumentRequirementWritePermission } from '@/lib/permissions';

// GET /api/vehicles/document-requirements?vehicleTypeId=<id>
// Returns all DocumentRequirement rows for the given VehicleType, including documentType
export async function GET(req: Request) {
  try {
    const { user } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const vehicleTypeId = searchParams.get('vehicleTypeId');

    if (!vehicleTypeId) {
      return NextResponse.json(
        { error: 'vehicleTypeId es requerido' },
        { status: 400 }
      );
    }

    // Verify VehicleType is accessible to the caller
    const vehicleType = await prisma.vehicleType.findUnique({
      where: { id: vehicleTypeId },
      select: { id: true, isGlobal: true, tenantId: true },
    });

    if (!vehicleType) {
      return NextResponse.json(
        { error: 'Tipo de vehículo no encontrado' },
        { status: 404 }
      );
    }

    if (!vehicleType.isGlobal && vehicleType.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: 'No tienes acceso a este tipo de vehículo' },
        { status: 403 }
      );
    }

    const requirements = await prisma.documentRequirement.findMany({
      where: { vehicleTypeId },
      include: {
        documentType: {
          select: {
            id: true,
            name: true,
            code: true,
            requiresExpiry: true,
          },
        },
      },
    });

    return NextResponse.json(requirements);
  } catch (error) {
    console.error('[DOCUMENT_REQUIREMENTS_GET]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

const createRequirementSchema = z.object({
  vehicleTypeId: z.string().min(1),
  documentTypeId: z.string().min(1),
});

// POST /api/vehicles/document-requirements
// Creates a DocumentRequirement linking a vehicleTypeId and documentTypeId
export async function POST(req: Request) {
  try {
    const { user } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validation = createRequirementSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const { vehicleTypeId, documentTypeId } = validation.data;

    // Fetch both parents, verify they exist and are ACTIVE
    const [vehicleType, documentType] = await Promise.all([
      prisma.vehicleType.findUnique({
        where: { id: vehicleTypeId },
        select: { id: true, isGlobal: true, tenantId: true, status: true },
      }),
      prisma.documentTypeConfig.findUnique({
        where: { id: documentTypeId },
        select: { id: true, isGlobal: true, tenantId: true, status: true },
      }),
    ]);

    if (!vehicleType || vehicleType.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Tipo de vehículo no encontrado o inactivo' },
        { status: 404 }
      );
    }

    if (!documentType || documentType.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Tipo de documento no encontrado o inactivo' },
        { status: 404 }
      );
    }

    try {
      requireDocumentRequirementWritePermission(
        user,
        vehicleType,
        documentType
      );
    } catch (permError) {
      return NextResponse.json(
        { error: (permError as Error).message },
        { status: 403 }
      );
    }

    const requirement = await prisma.documentRequirement.create({
      data: { vehicleTypeId, documentTypeId },
      include: {
        documentType: {
          select: { id: true, name: true, code: true, requiresExpiry: true },
        },
      },
    });

    return NextResponse.json(requirement, { status: 201 });
  } catch (error) {
    console.error('[DOCUMENT_REQUIREMENTS_POST]', error);
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === 'P2002'
    ) {
      return NextResponse.json(
        { error: 'Ya existe un requisito para esta combinación' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

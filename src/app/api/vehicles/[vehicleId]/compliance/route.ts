import { prisma } from '@/lib/prisma';
import { requireCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';

type ComplianceStatus = 'MISSING' | 'VALID' | 'EXPIRING' | 'EXPIRED';

// GET /api/vehicles/[vehicleId]/compliance
// Returns a per-vehicle compliance report against configured DocumentRequirements
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { vehicleId } = await params;

    // tenantPrisma implicitly scopes by tenantId — 404 if not owned by tenant
    const vehicle = await tenantPrisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true, typeId: true, licensePlate: true },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Vehículo no encontrado' },
        { status: 404 }
      );
    }

    // Fetch requirements and documents in parallel
    const [requirements, documents] = await Promise.all([
      // Raw prisma with explicit tenantId filter — DocumentRequirement is mixed-scope
      prisma.documentRequirement.findMany({
        where: { vehicleTypeId: vehicle.typeId, tenantId: user.tenantId },
        include: {
          documentType: {
            select: {
              id: true,
              name: true,
              code: true,
              requiresExpiry: true,
              expiryWarningDays: true,
            },
          },
        },
      }),
      // tenantPrisma: Document has tenantId
      tenantPrisma.document.findMany({
        where: {
          vehicleId,
        },
        select: {
          id: true,
          documentTypeId: true,
          fileUrl: true,
          expiryDate: true,
          documentNumber: true,
          status: true,
        },
        orderBy: { uploadedAt: 'desc' },
      }),
    ]);

    // Build a map of documentTypeId → latest document
    const docByTypeId = new Map<string, (typeof documents)[0]>();
    for (const doc of documents) {
      if (!docByTypeId.has(doc.documentTypeId)) {
        docByTypeId.set(doc.documentTypeId, doc);
      }
    }

    const today = new Date();

    const items = requirements.map(req => {
      const doc = docByTypeId.get(req.documentTypeId);

      let status: ComplianceStatus = 'MISSING';

      if (doc) {
        if (doc.status === 'EXPIRED') {
          status = 'EXPIRED';
        } else if (doc.expiryDate) {
          const daysLeft = Math.ceil(
            (new Date(doc.expiryDate).getTime() - today.getTime()) /
              (1000 * 60 * 60 * 24)
          );
          if (daysLeft < 0) {
            status = 'EXPIRED';
          } else if (daysLeft <= req.documentType.expiryWarningDays) {
            status = 'EXPIRING';
          } else {
            status = 'VALID';
          }
        } else {
          status = 'VALID';
        }
      }

      return {
        requirementId: req.id,
        documentTypeId: req.documentTypeId,
        name: req.documentType.name,
        code: req.documentType.code,
        isMandatory: true as const,
        status,
        document: doc
          ? {
              id: doc.id,
              fileUrl: doc.fileUrl,
              expiryDate: doc.expiryDate ? doc.expiryDate.toISOString() : null,
              documentNumber: doc.documentNumber,
            }
          : undefined,
      };
    });

    return NextResponse.json({
      vehicleId: vehicle.id,
      vehicleTypeId: vehicle.typeId,
      items,
    });
  } catch (error) {
    console.error('[VEHICLE_COMPLIANCE_GET]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

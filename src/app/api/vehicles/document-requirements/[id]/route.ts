import { prisma } from '@/lib/prisma';
import { requireCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { requireDocumentRequirementWritePermission } from '@/lib/permissions';

// DELETE /api/vehicles/document-requirements/[id]
// Removes a DocumentRequirement. Existing Document rows are NOT deleted.
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user } = await requireCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const requirement = await prisma.documentRequirement.findUnique({
      where: { id },
      include: {
        vehicleType: {
          select: { id: true, isGlobal: true, tenantId: true },
        },
        documentType: {
          select: { id: true, isGlobal: true, tenantId: true },
        },
      },
    });

    if (!requirement) {
      return NextResponse.json(
        { error: 'Requisito no encontrado' },
        { status: 404 }
      );
    }

    try {
      requireDocumentRequirementWritePermission(
        user,
        requirement.vehicleType,
        requirement.documentType
      );
    } catch (permError) {
      return NextResponse.json(
        { error: (permError as Error).message },
        { status: 403 }
      );
    }

    await prisma.documentRequirement.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[DOCUMENT_REQUIREMENTS_DELETE]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

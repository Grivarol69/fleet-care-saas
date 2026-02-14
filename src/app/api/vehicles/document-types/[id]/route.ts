import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { canManageMasterData } from '@/lib/permissions';

// GET - Get a single document type by ID
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const docTypeId = parseInt(id, 10);
    if (isNaN(docTypeId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const docType = await prisma.documentTypeConfig.findUnique({
      where: { id: docTypeId },
    });

    if (!docType) {
      return NextResponse.json(
        { error: 'Tipo de documento no encontrado' },
        { status: 404 }
      );
    }

    // Verify access: global types are visible to all, tenant types only to their tenant
    if (!docType.isGlobal && docType.tenantId !== user.tenantId) {
      return NextResponse.json(
        { error: 'No tienes acceso a este tipo de documento' },
        { status: 403 }
      );
    }

    return NextResponse.json(docType);
  } catch (error) {
    console.error('[DOCUMENT_TYPE_GET]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

const updateDocTypeSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  requiresExpiry: z.boolean().optional(),
  isMandatory: z.boolean().optional(),
  expiryWarningDays: z.number().int().min(0).optional(),
  expiryCriticalDays: z.number().int().min(0).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

// PUT - Update a document type
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (!canManageMasterData(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const docTypeId = parseInt(id, 10);
    if (isNaN(docTypeId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const existing = await prisma.documentTypeConfig.findUnique({
      where: { id: docTypeId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Tipo de documento no encontrado' },
        { status: 404 }
      );
    }

    // Global types: only SUPER_ADMIN can edit
    if (existing.isGlobal && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Solo SUPER_ADMIN puede editar tipos globales' },
        { status: 403 }
      );
    }

    // Tenant types: only their tenant's OWNER/MANAGER
    if (!existing.isGlobal) {
      if (existing.tenantId !== user.tenantId) {
        return NextResponse.json(
          { error: 'No tienes acceso' },
          { status: 403 }
        );
      }
      if (!['SUPER_ADMIN', 'OWNER', 'MANAGER'].includes(user.role)) {
        return NextResponse.json(
          { error: 'No tienes permisos' },
          { status: 403 }
        );
      }
    }

    const body = await req.json();
    const validation = updateDocTypeSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.flatten() },
        { status: 400 }
      );
    }

    const validData = validation.data;
    const updateData: Record<string, unknown> = {};
    if (validData.name !== undefined) updateData.name = validData.name;
    if (validData.description !== undefined)
      updateData.description = validData.description;
    if (validData.requiresExpiry !== undefined)
      updateData.requiresExpiry = validData.requiresExpiry;
    if (validData.isMandatory !== undefined)
      updateData.isMandatory = validData.isMandatory;
    if (validData.expiryWarningDays !== undefined)
      updateData.expiryWarningDays = validData.expiryWarningDays;
    if (validData.expiryCriticalDays !== undefined)
      updateData.expiryCriticalDays = validData.expiryCriticalDays;
    if (validData.sortOrder !== undefined)
      updateData.sortOrder = validData.sortOrder;

    const updated = await prisma.documentTypeConfig.update({
      where: { id: docTypeId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[DOCUMENT_TYPE_PUT]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete (set status to INACTIVE)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (!canManageMasterData(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const docTypeId = parseInt(id, 10);
    if (isNaN(docTypeId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const existing = await prisma.documentTypeConfig.findUnique({
      where: { id: docTypeId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: 'Tipo de documento no encontrado' },
        { status: 404 }
      );
    }

    // Global types: only SUPER_ADMIN
    if (existing.isGlobal && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Solo SUPER_ADMIN puede eliminar tipos globales' },
        { status: 403 }
      );
    }

    // Tenant types: only their tenant
    if (!existing.isGlobal && existing.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'No tienes acceso' }, { status: 403 });
    }

    // Soft delete
    const updated = await prisma.documentTypeConfig.update({
      where: { id: docTypeId },
      data: { status: 'INACTIVE' },
    });

    return NextResponse.json({
      success: true,
      message: 'Tipo de documento desactivado',
      data: updated,
    });
  } catch (error) {
    console.error('[DOCUMENT_TYPE_DELETE]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

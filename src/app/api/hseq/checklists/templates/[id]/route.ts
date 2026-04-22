import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const patchSchema = z.object({
  name: z.string().min(1).optional(),
  countryCode: z.string().optional(),
  isActive: z.boolean().optional(),
  items: z
    .array(
      z.object({
        id: z.string().optional(),
        category: z.string().min(1),
        label: z.string().min(1),
        isRequired: z.boolean().optional().default(true),
        order: z.number().int().optional().default(0),
      })
    )
    .optional(),
});

// GET /api/hseq/checklists/templates/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const template = await tenantPrisma.checklistTemplate.findFirst({
      where: { id },
      include: {
        vehicleType: { select: { id: true, name: true } },
        items: { orderBy: { order: 'asc' } },
        clonedFrom: { select: { id: true, name: true } },
        _count: { select: { checklists: true, clones: true } },
      },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('[CHECKLIST_TEMPLATE_GET_ID]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// PATCH /api/hseq/checklists/templates/[id]
// Replaces items list if provided (full replace strategy).
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const existing = await tenantPrisma.checklistTemplate.findFirst({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Template no encontrado' },
        { status: 404 }
      );
    }

    // Global templates: only SUPER_ADMIN can edit
    if (existing.isGlobal && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Solo SUPER_ADMIN puede editar templates globales' },
        { status: 403 }
      );
    }

    // Tenant templates: OWNER/MANAGER/SUPER_ADMIN
    if (
      !existing.isGlobal &&
      !['SUPER_ADMIN', 'OWNER', 'MANAGER'].includes(user.role)
    ) {
      return NextResponse.json(
        { error: 'Permisos insuficientes' },
        { status: 403 }
      );
    }

    const json = await req.json();
    const body = patchSchema.parse(json);

    const updateData: Record<string, unknown> = {};
    if (body.name !== undefined) updateData.name = body.name.trim();
    if (body.countryCode !== undefined)
      updateData.countryCode = body.countryCode;
    if (body.isActive !== undefined) updateData.isActive = body.isActive;

    // Full replace of items when provided
    if (body.items !== undefined) {
      await tenantPrisma.checklistTemplateItem.deleteMany({
        where: { templateId: id },
      });
      updateData.items = {
        create: body.items.map((item, idx) => ({
          category: item.category,
          label: item.label,
          isRequired: item.isRequired ?? true,
          order: item.order ?? idx,
        })),
      };
    }

    const updated = await tenantPrisma.checklistTemplate.update({
      where: { id },
      data: updateData,
      include: {
        vehicleType: { select: { id: true, name: true } },
        items: { orderBy: { order: 'asc' } },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 422 });
    }
    console.error('[CHECKLIST_TEMPLATE_PATCH]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE /api/hseq/checklists/templates/[id] — soft delete (isActive=false)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const existing = await tenantPrisma.checklistTemplate.findFirst({
      where: { id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: 'Template no encontrado' },
        { status: 404 }
      );
    }

    if (existing.isGlobal && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Solo SUPER_ADMIN puede eliminar templates globales' },
        { status: 403 }
      );
    }

    if (
      !existing.isGlobal &&
      !['SUPER_ADMIN', 'OWNER', 'MANAGER'].includes(user.role)
    ) {
      return NextResponse.json(
        { error: 'Permisos insuficientes' },
        { status: 403 }
      );
    }

    const activeChecklistsCount = await tenantPrisma.dailyChecklist.count({
      where: { templateId: id },
    });

    if (activeChecklistsCount > 0) {
      // Soft delete: keep for historical integrity
      await tenantPrisma.checklistTemplate.update({
        where: { id },
        data: { isActive: false },
      });
      return NextResponse.json({
        success: true,
        message: 'Template desactivado (tiene checklists asociados)',
      });
    }

    // Hard delete if no checklists reference it
    await tenantPrisma.checklistTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Template eliminado' });
  } catch (error) {
    console.error('[CHECKLIST_TEMPLATE_DELETE]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const cloneSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
});

// POST /api/hseq/checklists/templates/[id]/clone
// Clones a global template into the current tenant as an independent copy.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    if (!['SUPER_ADMIN', 'OWNER', 'MANAGER'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Permisos insuficientes' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const source = await tenantPrisma.checklistTemplate.findFirst({
      where: { id },
      include: { items: { orderBy: { order: 'asc' } } },
    });

    if (!source) {
      return NextResponse.json(
        { error: 'Template origen no encontrado' },
        { status: 404 }
      );
    }

    // Prevent cloning another tenant's private template
    if (!source.isGlobal && source.tenantId !== user.tenantId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const json = await req.json().catch(() => ({}));
    const body = cloneSchema.parse(json);

    const cloneName = body.name?.trim() ?? `${source.name} (copia)`;

    // Check name collision in tenant scope
    const collision = await tenantPrisma.checklistTemplate.findFirst({
      where: {
        tenantId: user.tenantId,
        vehicleTypeId: source.vehicleTypeId,
        name: cloneName,
        isActive: true,
      },
    });
    if (collision) {
      return NextResponse.json(
        {
          error: `Ya existe un template activo con el nombre "${cloneName}" para este tipo de vehículo`,
        },
        { status: 409 }
      );
    }

    const clone = await tenantPrisma.checklistTemplate.create({
      data: {
        name: cloneName,
        vehicleTypeId: source.vehicleTypeId,
        tenantId: user.tenantId,
        isGlobal: false,
        countryCode: source.countryCode,
        isActive: true,
        clonedFromId: source.id,
        items: {
          create: source.items.map(item => ({
            category: item.category,
            label: item.label,
            isRequired: item.isRequired,
            order: item.order,
          })),
        },
      },
      include: {
        vehicleType: { select: { id: true, name: true } },
        items: { orderBy: { order: 'asc' } },
        clonedFrom: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(clone, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 422 });
    }
    console.error('[CHECKLIST_TEMPLATE_CLONE]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

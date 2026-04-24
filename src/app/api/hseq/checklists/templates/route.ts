import { NextRequest, NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { z } from 'zod';

const createSchema = z.object({
  name: z.string().min(1),
  vehicleTypeId: z.string().min(1),
  vehicleBrandId: z.string().optional(),
  vehicleLineId: z.string().optional(),
  countryCode: z.string().optional(),
  isGlobal: z.boolean().optional().default(false),
  items: z
    .array(
      z.object({
        category: z.string().min(1),
        label: z.string().min(1),
        isRequired: z.boolean().optional().default(true),
        order: z.number().int().optional().default(0),
      })
    )
    .optional()
    .default([]),
});

// GET /api/hseq/checklists/templates?source=global|custom&vehicleTypeId=xxx
export async function GET(request: NextRequest) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const source = request.nextUrl.searchParams.get('source');
    const vehicleTypeId = request.nextUrl.searchParams.get('vehicleTypeId');

    let sourceFilter: Record<string, unknown> = {};
    if (source === 'custom') {
      sourceFilter = { tenantId: user.tenantId, isGlobal: false };
    } else if (source === 'global') {
      sourceFilter = { isGlobal: true, tenantId: null };
    }

    const templates = await tenantPrisma.checklistTemplate.findMany({
      where: {
        isActive: true,
        ...(vehicleTypeId ? { vehicleTypeId } : {}),
        ...sourceFilter,
      },
      include: {
        vehicleType: { select: { id: true, name: true } },
        items: { orderBy: { order: 'asc' } },
        _count: { select: { checklists: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('[CHECKLIST_TEMPLATES_GET]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST /api/hseq/checklists/templates
export async function POST(request: NextRequest) {
  try {
    const { user, tenantPrisma } = await requireCurrentUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const json = await request.json();
    const body = createSchema.parse(json);

    const isGlobal = body.isGlobal ?? false;

    if (isGlobal && user.role !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Solo SUPER_ADMIN puede crear templates globales' },
        { status: 403 }
      );
    }

    if (!isGlobal && !['SUPER_ADMIN', 'OWNER', 'MANAGER'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Permisos insuficientes' },
        { status: 403 }
      );
    }

    const targetTenantId: string | null = isGlobal ? null : user.tenantId;

    const vehicleType = await tenantPrisma.vehicleType.findFirst({
      where: { id: body.vehicleTypeId },
    });
    if (!vehicleType) {
      return NextResponse.json(
        { error: 'Tipo de vehículo no encontrado' },
        { status: 404 }
      );
    }

    const existing = await tenantPrisma.checklistTemplate.findFirst({
      where: {
        tenantId: targetTenantId,
        vehicleTypeId: body.vehicleTypeId,
        name: body.name.trim(),
        isActive: true,
      },
    });
    if (existing) {
      return NextResponse.json(
        {
          error:
            'Ya existe un template activo con ese nombre para este tipo de vehículo',
        },
        { status: 409 }
      );
    }

    const template = await tenantPrisma.checklistTemplate.create({
      data: {
        name: body.name.trim(),
        vehicleTypeId: body.vehicleTypeId,
        vehicleBrandId: body.vehicleBrandId ?? null,
        vehicleLineId: body.vehicleLineId ?? null,
        tenantId: targetTenantId,
        isGlobal,
        countryCode: body.countryCode ?? null,
        isActive: true,
        items: {
          create: body.items.map((item, idx) => ({
            category: item.category,
            label: item.label,
            isRequired: item.isRequired ?? true,
            order: item.order ?? idx,
          })),
        },
      },
      include: {
        vehicleType: { select: { id: true, name: true } },
        items: { orderBy: { order: 'asc' } },
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 422 });
    }
    console.error('[CHECKLIST_TEMPLATES_POST]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

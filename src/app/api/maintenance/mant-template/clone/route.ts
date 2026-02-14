import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { z } from 'zod';
import { canManageMaintenancePrograms } from '@/lib/permissions';

const cloneSchema = z.object({
  templateId: z.number(),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

    if (!canManageMaintenancePrograms(user)) {
      return NextResponse.json(
        { error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const json = await req.json();
    const body = cloneSchema.parse(json);

    // 1. Fetch the Global Template
    const sourceTemplate = await prisma.maintenanceTemplate.findUnique({
      where: { id: body.templateId },
      include: {
        packages: {
          include: {
            packageItems: true,
          },
        },
      },
    });

    if (!sourceTemplate) {
      return new NextResponse('Template not found', { status: 404 });
    }

    if (
      sourceTemplate.tenantId !== null &&
      sourceTemplate.tenantId !== user.tenantId
    ) {
      // Can't clone private templates of other tenants
      return new NextResponse('Forbidden', { status: 403 });
    }

    // 2. Clone it (Deep Copy)
    // We create a new Template for this Tenant based on the Global one
    const newTemplate = await prisma.maintenanceTemplate.create({
      data: {
        tenantId: user.tenantId,
        name: `${sourceTemplate.name} (Copia)`,
        description: sourceTemplate.description,
        vehicleBrandId: sourceTemplate.vehicleBrandId,
        vehicleLineId: sourceTemplate.vehicleLineId,
        version: sourceTemplate.version,
        isDefault: false,
        // Deep copy packages
        packages: {
          create: sourceTemplate.packages.map(pkg => ({
            name: pkg.name,
            description: pkg.description,
            triggerKm: pkg.triggerKm,
            estimatedCost: pkg.estimatedCost,
            estimatedTime: pkg.estimatedTime,
            isPattern: pkg.isPattern,
            // Deep copy items
            packageItems: {
              create: pkg.packageItems.map(item => ({
                mantItemId: item.mantItemId, // Reference the same item (Items are usually global or compatible)
                triggerKm: item.triggerKm,
                priority: item.priority,
                estimatedTime: item.estimatedTime,
                technicalNotes: item.technicalNotes,
                isOptional: item.isOptional,
              })),
            },
          })),
        },
      },
    });

    return NextResponse.json(newTemplate);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new NextResponse(JSON.stringify(error.issues), { status: 422 });
    }
    console.error('[TEMPLATE_CLONE]', error);
    return new NextResponse('Internal Error', { status: 500 });
  }
}

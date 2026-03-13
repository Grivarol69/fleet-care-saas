import { NextResponse } from 'next/server';
import { requireCurrentUser } from '@/lib/auth';
import { z } from 'zod';
import { canManageMaintenancePrograms } from '@/lib/permissions';

const clonePackageSchema = z.object({
    sourcePackageId: z.string().min(1, "Source Package ID is required"),
    newTriggerKm: z.number().int().min(0, "El kilometraje debe ser mayor o igual a 0"),
    newName: z.string().min(1, "El nombre del paquete es requerido"),
});

export async function POST(req: Request) {
    try {
        const { user, tenantPrisma } = await requireCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (!canManageMaintenancePrograms(user)) {
            return NextResponse.json(
                { error: 'No tienes permisos para esta acción' },
                { status: 403 }
            );
        }

        const json = await req.json();
        const body = clonePackageSchema.parse(json);

        // 1. Fetch the source package and its items
        const sourcePackage = await tenantPrisma.maintenancePackage.findUnique({
            where: { id: body.sourcePackageId },
            include: {
                template: true,
                packageItems: true,
            },
        });

        if (!sourcePackage) {
            return NextResponse.json({ error: 'Paquete origen no encontrado' }, { status: 404 });
        }

        // Auth check: ensuring the user has access to the template's tenant
        if (sourcePackage.template.tenantId !== null && sourcePackage.template.tenantId !== user.tenantId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // 2. Check for name collision in the same template
        const existingPackage = await tenantPrisma.maintenancePackage.findUnique({
            where: {
                templateId_name: {
                    templateId: sourcePackage.templateId,
                    name: body.newName,
                }
            }
        });

        if (existingPackage) {
            return NextResponse.json(
                { error: 'Ya existe un paquete con ese nombre en este plan. Elija un nombre diferente.' },
                { status: 409 }
            );
        }

        // 3. Clone the package and its items inside a Prisma Transaction
        const newPackage = await tenantPrisma.$transaction(async (tx) => {
            // Create is nested
            return await tx.maintenancePackage.create({
                data: {
                    templateId: sourcePackage.templateId,
                    name: body.newName,
                    triggerKm: body.newTriggerKm,
                    description: sourcePackage.description,
                    estimatedCost: sourcePackage.estimatedCost,
                    estimatedTime: sourcePackage.estimatedTime,
                    priority: sourcePackage.priority,
                    packageType: sourcePackage.packageType,
                    isPattern: sourcePackage.isPattern,
                    status: sourcePackage.status,
                    // Duplicate package items, assigning the new triggerKm
                    packageItems: {
                        create: sourcePackage.packageItems.map(item => ({
                            mantItemId: item.mantItemId,
                            triggerKm: body.newTriggerKm,
                            priority: item.priority,
                            estimatedTime: item.estimatedTime,
                            technicalNotes: item.technicalNotes,
                            isOptional: item.isOptional,
                            order: item.order,
                            status: item.status,
                        })),
                    },
                },
                include: {
                    packageItems: true,
                },
            });
        });

        return NextResponse.json(newPackage, { status: 201 });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(error.issues, { status: 422 });
        }
        console.error('[MAINTENANCE_PACKAGE_CLONE]', error);
        return NextResponse.json({ error: 'Internal Error' }, { status: 500 });
    }
}

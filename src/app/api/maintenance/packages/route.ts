import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";
import { getCurrentUser } from '@/lib/auth';
import { canManageMaintenancePrograms } from "@/lib/permissions";

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const templateId = searchParams.get('templateId');

        if (!templateId) {
            return NextResponse.json(
                { error: "templateId is required" },
                { status: 400 }
            );
        }

        const packages = await prisma.maintenancePackage.findMany({
            where: {
                templateId: parseInt(templateId),
                // Asegurar que el template pertenece al tenant o es global
                template: {
                    OR: [
                        { tenantId: user.tenantId },
                        { isGlobal: true }
                    ]
                }
            },
            include: {
                _count: {
                    select: {
                        packageItems: true
                    }
                }
            },
            orderBy: {
                triggerKm: 'asc'
            }
        });

        return NextResponse.json(packages);
    } catch (error) {
        console.error("[PACKAGES_GET]", error);
        return NextResponse.json(
            { error: "Internal error" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!canManageMaintenancePrograms(user)) {
            return NextResponse.json({ error: "No tienes permisos para esta acción" }, { status: 403 });
        }

        const body = await request.json();
        const { templateId, name, triggerKm, description, estimatedCost, estimatedTime, priority, packageType } = body;

        // Validaciones básicas
        if (!templateId || !name || !triggerKm) {
            return NextResponse.json(
                { error: "templateId, name, and triggerKm are required" },
                { status: 400 }
            );
        }

        // Verificar que el template existe
        const template = await prisma.maintenanceTemplate.findFirst({
            where: {
                id: templateId,
                tenantId: user.tenantId // Solo permitir editar templates propios
            }
        });

        if (!template) {
            return NextResponse.json(
                { error: "Template not found" },
                { status: 404 }
            );
        }

        // Verificar que no existe otro paquete con el mismo triggerKm en este template
        const existingPackage = await prisma.maintenancePackage.findFirst({
            where: {
                templateId: templateId,
                triggerKm: triggerKm
            }
        });

        if (existingPackage) {
            return NextResponse.json(
                { error: "Ya existe un paquete para este kilometraje en este template" },
                { status: 409 }
            );
        }

        const newPackage = await prisma.maintenancePackage.create({
            data: {
                templateId,
                name,
                triggerKm,
                description,
                estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
                estimatedTime: estimatedTime ? parseFloat(estimatedTime) : null,
                priority: priority || 'MEDIUM',
                packageType: packageType || 'PREVENTIVE'
            },
            include: {
                _count: {
                    select: {
                        packageItems: true
                    }
                }
            }
        });

        return NextResponse.json(newPackage, { status: 201 });
    } catch (error) {
        console.error("[PACKAGES_POST]", error);
        return NextResponse.json(
            { error: "Internal error" },
            { status: 500 }
        );
    }
}
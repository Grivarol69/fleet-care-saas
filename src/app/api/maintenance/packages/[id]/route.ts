import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { NextRequest } from "next/server";

const TENANT_ID = 'mvp-default-tenant'; // Tenant hardcodeado para MVP

export async function GET(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);

        const package_ = await prisma.maintenancePackage.findFirst({
            where: {
                id,
                template: {
                    tenantId: TENANT_ID
                }
            },
            include: {
                packageItems: {
                    include: {
                        mantItem: {
                            select: {
                                id: true,
                                name: true,
                                mantType: true,
                                estimatedTime: true,
                                estimatedCost: true,
                                category: {
                                    select: {
                                        name: true
                                    }
                                }
                            }
                        }
                    },
                    orderBy: {
                        order: 'asc'
                    }
                },
                _count: {
                    select: {
                        packageItems: true
                    }
                }
            }
        });

        if (!package_) {
            return NextResponse.json(
                { error: "Package not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(package_);
    } catch (error) {
        console.error("[PACKAGE_GET]", error);
        return NextResponse.json(
            { error: "Internal error" },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);
        const body = await request.json();
        const { name, triggerKm, description, estimatedCost, estimatedTime, priority, packageType } = body;

        // Verificar que el paquete existe y pertenece al tenant
        const existingPackage = await prisma.maintenancePackage.findFirst({
            where: {
                id,
                template: {
                    tenantId: TENANT_ID
                }
            }
        });

        if (!existingPackage) {
            return NextResponse.json(
                { error: "Package not found" },
                { status: 404 }
            );
        }

        // Si se está cambiando el triggerKm, verificar que no exista otro con el mismo km
        if (triggerKm && triggerKm !== existingPackage.triggerKm) {
            const duplicatePackage = await prisma.maintenancePackage.findFirst({
                where: {
                    templateId: existingPackage.templateId,
                    triggerKm: triggerKm,
                    id: { not: id }
                }
            });

            if (duplicatePackage) {
                return NextResponse.json(
                    { error: "Ya existe un paquete para este kilometraje en este template" },
                    { status: 409 }
                );
            }
        }

        const updatedPackage = await prisma.maintenancePackage.update({
            where: { id },
            data: {
                name: name || existingPackage.name,
                triggerKm: triggerKm || existingPackage.triggerKm,
                description: description !== undefined ? description : existingPackage.description,
                estimatedCost: estimatedCost !== undefined ? (estimatedCost ? parseFloat(estimatedCost) : null) : existingPackage.estimatedCost,
                estimatedTime: estimatedTime !== undefined ? (estimatedTime ? parseFloat(estimatedTime) : null) : existingPackage.estimatedTime,
                priority: priority || existingPackage.priority,
                packageType: packageType || existingPackage.packageType
            },
            include: {
                _count: {
                    select: {
                        packageItems: true
                    }
                }
            }
        });

        return NextResponse.json(updatedPackage);
    } catch (error) {
        console.error("[PACKAGE_PUT]", error);
        return NextResponse.json(
            { error: "Internal error" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const id = parseInt(params.id);

        // Verificar que el paquete existe y pertenece al tenant
        const existingPackage = await prisma.maintenancePackage.findFirst({
            where: {
                id,
                template: {
                    tenantId: TENANT_ID
                }
            }
        });

        if (!existingPackage) {
            return NextResponse.json(
                { error: "Package not found" },
                { status: 404 }
            );
        }

        // Verificar si hay ScheduledPackages que referencian este package
        const scheduledPackages = await prisma.scheduledPackage.findFirst({
            where: {
                // Nota: Como ScheduledPackage no tiene FK directo, verificamos por nombre/km
                packageName: existingPackage.name,
                idealExecutionKm: existingPackage.triggerKm
            }
        });

        if (scheduledPackages) {
            return NextResponse.json(
                { error: "No se puede eliminar este paquete porque ya está siendo usado en programas de vehículos" },
                { status: 400 }
            );
        }

        await prisma.maintenancePackage.delete({
            where: { id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[PACKAGE_DELETE]", error);
        return NextResponse.json(
            { error: "Internal error" },
            { status: 500 }
        );
    }
}
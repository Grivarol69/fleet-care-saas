import { prisma } from "@/lib/prisma";
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from "next/server";
import { safeParseInt } from '@/lib/validation';

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const { id } = await params;
        const mantTemplateId = safeParseInt(id);

        if (mantTemplateId === null) {
            return NextResponse.json({ error: "ID inválido" }, { status: 400 });
        }

        const mantTemplate = await prisma.maintenanceTemplate.findFirst({
            where: {
                id: mantTemplateId,
                tenantId: user.tenantId
            },
            include: {
                brand: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                line: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                packages: {
                    include: {
                        packageItems: {
                            include: {
                                mantItem: {
                                    select: {
                                        id: true,
                                        name: true,
                                        description: true,
                                        mantType: true,
                                        type: true,
                                        category: {
                                            select: {
                                                id: true,
                                                name: true
                                            }
                                        }
                                    }
                                }
                            },
                            orderBy: {
                                order: 'asc'
                            }
                        }
                    },
                    orderBy: {
                        triggerKm: 'asc'
                    }
                }
            }
        });

        if (!mantTemplate) {
            return NextResponse.json({ error: "Template no encontrado" }, { status: 404 });
        }

        return NextResponse.json(mantTemplate);
    } catch (error) {
        console.error("[MANT_TEMPLATE_GET_BY_ID]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const { id } = await params;
        const mantTemplateId = safeParseInt(id);

        if (mantTemplateId === null) {
            return NextResponse.json({ error: "ID inválido" }, { status: 400 });
        }

        const { name, description, vehicleBrandId, vehicleLineId } = await req.json();

        // Validación de campos requeridos
        if (!name || name.trim() === '') {
            return NextResponse.json({ error: "El nombre del template es requerido" }, { status: 400 });
        }

        if (!vehicleBrandId || vehicleBrandId <= 0) {
            return NextResponse.json({ error: "La marca del vehículo es requerida" }, { status: 400 });
        }

        if (!vehicleLineId || vehicleLineId <= 0) {
            return NextResponse.json({ error: "La línea del vehículo es requerida" }, { status: 400 });
        }

        // Verificar que el template existe y pertenece al tenant
        const existingTemplate = await prisma.maintenanceTemplate.findFirst({
            where: {
                id: mantTemplateId,
                tenantId: user.tenantId
            }
        });

        if (!existingTemplate) {
            return NextResponse.json({ error: "Template no encontrado" }, { status: 404 });
        }

        // Verificar que la marca existe y pertenece al tenant
        const brand = await prisma.vehicleBrand.findFirst({
            where: {
                id: vehicleBrandId,
                tenantId: user.tenantId
            }
        });

        if (!brand) {
            return NextResponse.json({ error: "Marca de vehículo no encontrada" }, { status: 404 });
        }

        // Verificar que la línea existe, pertenece al tenant y a la marca
        const line = await prisma.vehicleLine.findFirst({
            where: {
                id: vehicleLineId,
                tenantId: user.tenantId,
                brandId: vehicleBrandId
            }
        });

        if (!line) {
            return NextResponse.json({ error: "Línea de vehículo no encontrada o no pertenece a la marca especificada" }, { status: 404 });
        }

        // Verificar que no exista otro template con el mismo nombre para la misma marca/línea (excluyendo el actual)
        const duplicateTemplate = await prisma.maintenanceTemplate.findFirst({
            where: {
                tenantId: user.tenantId,
                vehicleBrandId,
                vehicleLineId,
                name: name.trim(),
                id: {
                    not: mantTemplateId
                }
            }
        });

        if (duplicateTemplate) {
            return NextResponse.json({ error: "Ya existe un template con este nombre para esta combinación de marca/línea" }, { status: 409 });
        }

        const updatedTemplate = await prisma.maintenanceTemplate.update({
            where: {
                id: mantTemplateId
            },
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                vehicleBrandId,
                vehicleLineId,
            },
            include: {
                brand: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                line: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                packages: {
                    include: {
                        packageItems: {
                            include: {
                                mantItem: {
                                    select: {
                                        id: true,
                                        name: true,
                                        mantType: true,
                                        type: true
                                    }
                                }
                            },
                            orderBy: {
                                order: 'asc'
                            }
                        }
                    },
                    orderBy: {
                        triggerKm: 'asc'
                    }
                }
            }
        });

        return NextResponse.json(updatedTemplate);
    } catch (error) {
        console.error("[MANT_TEMPLATE_PATCH]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const { id } = await params;
        const mantTemplateId = safeParseInt(id);

        if (mantTemplateId === null) {
            return NextResponse.json({ error: "ID inválido" }, { status: 400 });
        }

        // Verificar que el template existe y pertenece al tenant
        const existingTemplate = await prisma.maintenanceTemplate.findUnique({
            where: {
                id: mantTemplateId,
                tenantId: user.tenantId
            }
        });

        if (!existingTemplate) {
            return NextResponse.json({ error: "Template no encontrado" }, { status: 404 });
        }

        // Verificar si hay vehículos asignados a este template antes de eliminar
        const vehiclePlansCount = await prisma.vehicleMantProgram.count({
            where: {
                tenantId: user.tenantId,
                generatedFrom: {
                    contains: existingTemplate.name
                },
                status: 'ACTIVE'
            }
        });

        if (vehiclePlansCount > 0) {
            return NextResponse.json({ error: "No se puede eliminar el template porque tiene asignaciones de vehículos activas. Por favor elimine las asignaciones primero." }, { status: 409 });
        }

        // Usar soft delete cambiando el status a INACTIVE
        await prisma.maintenanceTemplate.update({
            where: {
                id: mantTemplateId
            },
            data: {
                status: 'INACTIVE'
            }
        });

        return NextResponse.json({ success: true, message: "Template eliminado" });
    } catch (error) {
        console.error("[MANT_TEMPLATE_DELETE]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

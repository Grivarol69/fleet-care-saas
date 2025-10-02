import { prisma } from "@/lib/prisma";
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from "next/server";

const TENANT_ID = 'mvp-default-tenant';

export async function GET(
    _req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const mantTemplateId = parseInt(params.id);

        if (isNaN(mantTemplateId)) {
            return new NextResponse("Invalid ID", { status: 400 });
        }

        const mantTemplate = await prisma.maintenanceTemplate.findFirst({
            where: {
                id: mantTemplateId,
                tenantId: TENANT_ID
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
                                        estimatedTime: true,
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
            return new NextResponse("Template not found", { status: 404 });
        }

        return NextResponse.json(mantTemplate);
    } catch (error) {
        console.error("[MANT_TEMPLATE_GET_BY_ID]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const mantTemplateId = parseInt(params.id);

        if (isNaN(mantTemplateId)) {
            return new NextResponse("Invalid ID", { status: 400 });
        }

        const { name, description, vehicleBrandId, vehicleLineId } = await req.json();

        // Validación de campos requeridos
        if (!name || name.trim() === '') {
            return new NextResponse("Template name is required", { status: 400 });
        }

        if (!vehicleBrandId || vehicleBrandId <= 0) {
            return new NextResponse("Valid vehicle brand is required", { status: 400 });
        }

        if (!vehicleLineId || vehicleLineId <= 0) {
            return new NextResponse("Valid vehicle line is required", { status: 400 });
        }

        // Verificar que el template existe y pertenece al tenant
        const existingTemplate = await prisma.maintenanceTemplate.findFirst({
            where: {
                id: mantTemplateId,
                tenantId: TENANT_ID
            }
        });

        if (!existingTemplate) {
            return new NextResponse("Template not found", { status: 404 });
        }

        // Verificar que la marca existe y pertenece al tenant
        const brand = await prisma.vehicleBrand.findFirst({
            where: {
                id: vehicleBrandId,
                tenantId: TENANT_ID
            }
        });

        if (!brand) {
            return new NextResponse("Vehicle brand not found", { status: 404 });
        }

        // Verificar que la línea existe, pertenece al tenant y a la marca
        const line = await prisma.vehicleLine.findFirst({
            where: {
                id: vehicleLineId,
                tenantId: TENANT_ID,
                brandId: vehicleBrandId
            }
        });

        if (!line) {
            return new NextResponse("Vehicle line not found or doesn't belong to the specified brand", { status: 404 });
        }

        // Verificar que no exista otro template con el mismo nombre para la misma marca/línea (excluyendo el actual)
        const duplicateTemplate = await prisma.maintenanceTemplate.findFirst({
            where: {
                tenantId: TENANT_ID,
                vehicleBrandId,
                vehicleLineId,
                name: name.trim(),
                id: {
                    not: mantTemplateId
                }
            }
        });

        if (duplicateTemplate) {
            return new NextResponse("Template with this name already exists for this brand/line combination", { status: 409 });
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
                                        estimatedTime: true
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
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
    _req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const mantTemplateId = parseInt(params.id);

        if (isNaN(mantTemplateId)) {
            return new NextResponse("Invalid ID", { status: 400 });
        }

        // Verificar que el template existe y pertenece al tenant
        const existingTemplate = await prisma.maintenanceTemplate.findUnique({
            where: {
                id: mantTemplateId,
                tenantId: TENANT_ID
            }
        });

        if (!existingTemplate) {
            return new NextResponse("Template not found", { status: 404 });
        }

        // Verificar si hay vehículos asignados a este template antes de eliminar
        const vehiclePlansCount = await prisma.vehicleMantProgram.count({
            where: {
                tenantId: TENANT_ID,
                generatedFrom: {
                    contains: existingTemplate.name
                },
                status: 'ACTIVE'
            }
        });

        if (vehiclePlansCount > 0) {
            return new NextResponse("Cannot delete template with active vehicle assignments. Please remove vehicle assignments first.", { status: 409 });
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

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[MANT_TEMPLATE_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
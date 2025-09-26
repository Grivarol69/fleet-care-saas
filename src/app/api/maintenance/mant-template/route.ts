import { prisma } from "@/lib/prisma";
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from "next/server";

const TENANT_ID = 'mvp-default-tenant'; // Tenant hardcodeado para MVP

export async function GET() {
    try {
        const mantTemplates = await prisma.maintenanceTemplate.findMany({
            where: {
                tenantId: TENANT_ID,
                status: 'ACTIVE'
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
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(mantTemplates);
    } catch (error) {
        console.error("[MANT_TEMPLATE_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
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

        // Verificar que no exista un template con el mismo nombre para la misma marca/línea
        const existingTemplate = await prisma.maintenanceTemplate.findFirst({
            where: {
                tenantId: TENANT_ID,
                vehicleBrandId,
                vehicleLineId,
                name: name.trim(),
                status: 'ACTIVE'
            }
        });

        if (existingTemplate) {
            return new NextResponse("Template with this name already exists for this brand/line combination", { status: 409 });
        }

        const mantTemplate = await prisma.maintenanceTemplate.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                vehicleBrandId,
                vehicleLineId,
                tenantId: TENANT_ID,
                status: 'ACTIVE',
                version: '1.0',
                isDefault: false
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
                            }
                        }
                    }
                }
            }
        });

        return NextResponse.json(mantTemplate);
    } catch (error) {
        console.error("[MANT_TEMPLATE_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
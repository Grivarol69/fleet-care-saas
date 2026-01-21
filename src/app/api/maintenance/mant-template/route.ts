import { prisma } from "@/lib/prisma";
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from "next/server";

const TENANT_ID = 'cf68b103-12fd-4208-a352-42379ef3b6e1'; // Tenant hardcodeado para MVP

export async function GET() {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Devolver templates GLOBALES + del tenant
        const mantTemplates = await prisma.maintenanceTemplate.findMany({
            where: {
                OR: [
                    { isGlobal: true },                 // Templates globales (Knowledge Base)
                    { tenantId: user.tenantId }       // Templates custom del tenant
                ],
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
        const user = await getCurrentUser();
        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { name, description, vehicleBrandId, vehicleLineId, isGlobal } = await req.json();

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

        // Validar permisos según destino
        let targetTenant: string | null;

        if (isGlobal) {
            // Solo SUPER_ADMIN puede crear templates globales
            if (user.role !== 'SUPER_ADMIN') {
                return new NextResponse("Only SUPER_ADMIN can create global templates", { status: 403 });
            }
            targetTenant = null;
        } else {
            // OWNER/MANAGER pueden crear custom
            if (!['SUPER_ADMIN', 'OWNER', 'MANAGER'].includes(user.role)) {
                return new NextResponse("Insufficient permissions", { status: 403 });
            }
            targetTenant = user.tenantId;
        }

        // Verificar que la marca existe (global o del tenant)
        const brand = await prisma.vehicleBrand.findFirst({
            where: {
                id: vehicleBrandId,
                OR: [
                    { isGlobal: true },
                    { tenantId: targetTenant }
                ]
            }
        });

        if (!brand) {
            return new NextResponse("Vehicle brand not found", { status: 404 });
        }

        // Verificar que la línea existe (global o del tenant) y pertenece a la marca
        const line = await prisma.vehicleLine.findFirst({
            where: {
                id: vehicleLineId,
                brandId: vehicleBrandId,
                OR: [
                    { isGlobal: true },
                    { tenantId: targetTenant }
                ]
            }
        });

        if (!line) {
            return new NextResponse("Vehicle line not found or doesn't belong to the specified brand", { status: 404 });
        }

        // Verificar que no exista un template con el mismo nombre para la misma marca/línea en el scope
        const existingTemplate = await prisma.maintenanceTemplate.findFirst({
            where: {
                tenantId: targetTenant,
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
                tenantId: targetTenant,
                isGlobal: isGlobal || false,
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
                                        type: true
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
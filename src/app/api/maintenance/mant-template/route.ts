import { prisma } from "@/lib/prisma";
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
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
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const { name, description, vehicleBrandId, vehicleLineId, isGlobal } = await req.json();

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

        // Validar permisos según destino
        let targetTenant: string | null;

        if (isGlobal) {
            // Solo SUPER_ADMIN puede crear templates globales
            if (user.role !== 'SUPER_ADMIN') {
                return NextResponse.json({ error: "Solo SUPER_ADMIN puede crear templates globales" }, { status: 403 });
            }
            targetTenant = null;
        } else {
            // OWNER/MANAGER pueden crear custom
            if (!['SUPER_ADMIN', 'OWNER', 'MANAGER'].includes(user.role)) {
                return NextResponse.json({ error: "Permisos insuficientes" }, { status: 403 });
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
            return NextResponse.json({ error: "Marca de vehículo no encontrada" }, { status: 404 });
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
            return NextResponse.json({ error: "Línea de vehículo no encontrada o no pertenece a la marca especificada" }, { status: 404 });
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
            return NextResponse.json({ error: "Ya existe un template con este nombre para esta combinación de marca/línea" }, { status: 409 });
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

        return NextResponse.json(mantTemplate, { status: 201 });
    } catch (error) {
        console.error("[MANT_TEMPLATE_POST]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

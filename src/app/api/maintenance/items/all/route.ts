import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const TENANT_ID = 'mvp-default-tenant'; // Tenant hardcodeado para MVP

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const vehicleId = searchParams.get('vehicleId');
        const mantPlanId = searchParams.get('mantPlanId');

        // Construir filtros dinámicamente
        const whereConditions: {
            vehicleMantPlan: {
                tenantId: string;
                vehicleId?: number;
                mantPlanId?: number;
            }
        } = {
            vehicleMantPlan: {
                tenantId: TENANT_ID,
            }
        };

        // Filtrar por vehículo específico si se proporciona
        if (vehicleId) {
            whereConditions.vehicleMantPlan.vehicleId = parseInt(vehicleId);
        }

        // Filtrar por plan específico si se proporciona
        if (mantPlanId) {
            whereConditions.vehicleMantPlan.mantPlanId = parseInt(mantPlanId);
        }

        const maintenanceItems = await prisma.vehicleMantPlanItem.findMany({
            where: whereConditions,
            include: {
                mantItem: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        mantType: true,
                        estimatedTime: true,
                    }
                },
                vehicleMantPlan: {
                    include: {
                        vehicle: {
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
                                }
                            }
                        },
                        mantPlan: {
                            select: {
                                id: true,
                                name: true,
                                description: true
                            }
                        }
                    }
                },
                technician: {
                    select: {
                        id: true,
                        name: true
                    }
                },
                provider: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: [
                {
                    status: 'asc' // PENDING primero, luego IN_PROGRESS, etc.
                },
                {
                    executionMileage: 'asc' // Por kilometraje ascendente
                }
            ]
        });

        return NextResponse.json(maintenanceItems);
    } catch (error) {
        console.error("[MAINTENANCE_ITEMS_GET_ALL]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
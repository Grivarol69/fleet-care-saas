import { prisma } from "@/lib/prisma";
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from "next/server";

const TENANT_ID = 'mvp-default-tenant'; // Tenant hardcodeado para MVP

export async function PATCH(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { id: idParam } = await params;
        const id = parseInt(idParam);

        if (!id || isNaN(id)) {
            return new NextResponse("Invalid ID", { status: 400 });
        }

        // Verificar que el item existe y obtener información del vehículo
        const existingItem = await prisma.vehicleMantPlanItem.findFirst({
            where: {
                id,
                vehicleMantPlan: {
                    tenantId: TENANT_ID
                }
            },
            include: {
                vehicleMantPlan: {
                    include: {
                        vehicle: {
                            select: {
                                id: true,
                                mileage: true,
                                licensePlate: true
                            }
                        }
                    }
                }
            }
        });

        if (!existingItem || !existingItem.vehicleMantPlan) {
            return new NextResponse("Maintenance item not found", { status: 404 });
        }

        // Actualizar el item como completado
        const updatedItem = await prisma.vehicleMantPlanItem.update({
            where: {
                id
            },
            data: {
                status: 'COMPLETED',
                endDate: new Date(),
                // Si no tenía fecha de inicio, la ponemos ahora
                startDate: existingItem.startDate || new Date(),
                updatedAt: new Date()
            },
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
            }
        });

        return NextResponse.json(updatedItem);
    } catch (error) {
        console.error("[MAINTENANCE_ITEM_COMPLETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
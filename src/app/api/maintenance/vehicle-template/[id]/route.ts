import { prisma } from "@/lib/prisma";
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from "next/server";

const TENANT_ID = 'mvp-default-tenant'; // Tenant hardcodeado para MVP

export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id: idParam } = await params;
        const id = parseInt(idParam);

        if (!id || isNaN(id)) {
            return new NextResponse("Invalid ID", { status: 400 });
        }

        const vehicleTemplate = await prisma.vehicleMantPlan.findUnique({
            where: {
                id,
                tenantId: TENANT_ID
            },
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
                        },
                        type: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                },
                mantPlan: {
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
                }
            }
        });

        if (!vehicleTemplate) {
            return new NextResponse("Vehicle template not found", { status: 404 });
        }

        return NextResponse.json(vehicleTemplate);
    } catch (error) {
        console.error("[VEHICLE_TEMPLATE_GET_BY_ID]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function PUT(
    req: Request,
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

        const body = await req.json();
        const { vehicleId, mantPlanId, assignedAt, lastKmCheck, status } = body;

        // Verificar que el registro existe y pertenece al tenant
        const existingTemplate = await prisma.vehicleMantPlan.findUnique({
            where: {
                id,
                tenantId: TENANT_ID
            }
        });

        if (!existingTemplate) {
            return new NextResponse("Vehicle template not found", { status: 404 });
        }

        // Validación de campos requeridos
        if (vehicleId && vehicleId <= 0) {
            return new NextResponse("Valid vehicle is required", { status: 400 });
        }

        if (mantPlanId && mantPlanId <= 0) {
            return new NextResponse("Valid maintenance plan is required", { status: 400 });
        }

        // Si se está cambiando el vehículo, verificar que existe
        if (vehicleId && vehicleId !== existingTemplate.vehicleId) {
            const vehicle = await prisma.vehicle.findUnique({
                where: {
                    id: vehicleId,
                    tenantId: TENANT_ID
                }
            });

            if (!vehicle) {
                return new NextResponse("Vehicle not found", { status: 404 });
            }
        }

        // Si se está cambiando el plan, verificar que existe
        if (mantPlanId && mantPlanId !== existingTemplate.mantPlanId) {
            const mantPlan = await prisma.mantPlan.findUnique({
                where: {
                    id: mantPlanId,
                    tenantId: TENANT_ID
                }
            });

            if (!mantPlan) {
                return new NextResponse("Maintenance plan not found", { status: 404 });
            }

            // Verificar que no exista duplicado si se cambia vehículo o plan
            const finalVehicleId = vehicleId || existingTemplate.vehicleId;
            const finalMantPlanId = mantPlanId || existingTemplate.mantPlanId;

            if (finalVehicleId !== existingTemplate.vehicleId || finalMantPlanId !== existingTemplate.mantPlanId) {
                const duplicateCheck = await prisma.vehicleMantPlan.findUnique({
                    where: {
                        vehicleId_mantPlanId: {
                            vehicleId: finalVehicleId,
                            mantPlanId: finalMantPlanId
                        }
                    }
                });

                if (duplicateCheck && duplicateCheck.id !== id) {
                    return new NextResponse("This maintenance plan is already assigned to this vehicle", { status: 409 });
                }
            }
        }

        // Actualizar el registro
        const updatedTemplate = await prisma.vehicleMantPlan.update({
            where: {
                id
            },
            data: {
                vehicleId: vehicleId || existingTemplate.vehicleId,
                mantPlanId: mantPlanId || existingTemplate.mantPlanId,
                assignedAt: assignedAt ? new Date(assignedAt) : existingTemplate.assignedAt,
                lastKmCheck: lastKmCheck !== undefined ? lastKmCheck : existingTemplate.lastKmCheck,
                status: status || existingTemplate.status
            },
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
                        },
                        type: {
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                },
                mantPlan: {
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
                }
            }
        });

        return NextResponse.json(updatedTemplate);
    } catch (error) {
        console.error("[VEHICLE_TEMPLATE_PUT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function DELETE(
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

        // Verificar que el registro existe y pertenece al tenant
        const existingTemplate = await prisma.vehicleMantPlan.findUnique({
            where: {
                id,
                tenantId: TENANT_ID
            }
        });

        if (!existingTemplate) {
            return new NextResponse("Vehicle template not found", { status: 404 });
        }

        // Verificar si existen elementos de plan asociados
        const associatedItems = await prisma.vehicleMantPlanItem.findMany({
            where: {
                vehicleMantPlanId: id
            }
        });

        if (associatedItems.length > 0) {
            // Si existen elementos asociados, los eliminamos en cascada
            await prisma.vehicleMantPlanItem.deleteMany({
                where: {
                    vehicleMantPlanId: id
                }
            });
        }

        // Eliminar la asignación
        await prisma.vehicleMantPlan.delete({
            where: {
                id
            }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[VEHICLE_TEMPLATE_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
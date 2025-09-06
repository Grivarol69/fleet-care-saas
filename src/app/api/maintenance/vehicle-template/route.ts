import { prisma } from "@/lib/prisma";
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from "next/server";

const TENANT_ID = 'mvp-default-tenant'; // Tenant hardcodeado para MVP

export async function GET() {
    try {
        const vehicleTemplates = await prisma.vehicleMantPlan.findMany({
            where: {
                tenantId: TENANT_ID,
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
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        return NextResponse.json(vehicleTemplates);
    } catch (error) {
        console.error("[VEHICLE_TEMPLATE_GET]", error);
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

        const body = await req.json();
        const { vehicleId, mantPlanId, assignedAt, lastKmCheck, status } = body;

        // Validación de campos requeridos
        if (!vehicleId || vehicleId <= 0) {
            return new NextResponse("Valid vehicle is required", { status: 400 });
        }

        if (!mantPlanId || mantPlanId <= 0) {
            return new NextResponse("Valid maintenance plan is required", { status: 400 });
        }

        if (!assignedAt) {
            return new NextResponse("Assigned date is required", { status: 400 });
        }

        // Verificar que el vehículo existe y pertenece al tenant
        const vehicle = await prisma.vehicle.findUnique({
            where: {
                id: vehicleId,
                tenantId: TENANT_ID
            }
        });

        if (!vehicle) {
            return new NextResponse("Vehicle not found", { status: 404 });
        }

        // Verificar que el plan de mantenimiento existe y pertenece al tenant
        const mantPlan = await prisma.mantPlan.findUnique({
            where: {
                id: mantPlanId,
                tenantId: TENANT_ID
            }
        });

        if (!mantPlan) {
            return new NextResponse("Maintenance plan not found", { status: 404 });
        }

        // Verificar que no exista ya una asignación activa para este vehículo y plan
        const existingAssignment = await prisma.vehicleMantPlan.findUnique({
            where: {
                vehicleId_mantPlanId: {
                    vehicleId,
                    mantPlanId
                }
            }
        });

        if (existingAssignment) {
            return new NextResponse("This maintenance plan is already assigned to this vehicle", { status: 409 });
        }

        // Crear la asignación
        const vehicleTemplate = await prisma.vehicleMantPlan.create({
            data: {
                tenantId: TENANT_ID,
                vehicleId,
                mantPlanId,
                assignedAt: new Date(assignedAt),
                lastKmCheck: lastKmCheck || null,
                status: status || 'ACTIVE'
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

        return NextResponse.json(vehicleTemplate);
    } catch (error) {
        console.error("[VEHICLE_TEMPLATE_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
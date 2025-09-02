import { prisma } from "@/lib/prisma";
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from "next/server";

const TENANT_ID = 'mvp-default-tenant';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const planId = searchParams.get('planId');

        if (!planId || isNaN(parseInt(planId))) {
            return new NextResponse("Valid planId is required", { status: 400 });
        }

        const planIdInt = parseInt(planId);

        // Verificar que el plan existe y pertenece al tenant
        const mantPlan = await prisma.mantPlan.findUnique({
            where: {
                id: planIdInt,
                tenantId: TENANT_ID
            }
        });

        if (!mantPlan) {
            return new NextResponse("Template not found", { status: 404 });
        }

        const templateItems = await prisma.planTask.findMany({
            where: {
                planId: planIdInt
            },
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
                triggerKm: 'asc'
            }
        });

        return NextResponse.json(templateItems);
    } catch (error) {
        console.error("[TEMPLATE_ITEMS_GET]", error);
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

        const { planId, mantItemId, triggerKm } = await req.json();

        // Validación de campos requeridos
        if (!planId || planId <= 0) {
            return new NextResponse("Valid planId is required", { status: 400 });
        }

        if (!mantItemId || mantItemId <= 0) {
            return new NextResponse("Valid mantItemId is required", { status: 400 });
        }

        if (!triggerKm || triggerKm <= 0) {
            return new NextResponse("Valid triggerKm is required", { status: 400 });
        }

        // Verificar que el plan existe y pertenece al tenant
        const mantPlan = await prisma.mantPlan.findUnique({
            where: {
                id: planId,
                tenantId: TENANT_ID
            }
        });

        if (!mantPlan) {
            return new NextResponse("Template not found", { status: 404 });
        }

        // Verificar que el item de mantenimiento existe y pertenece al tenant
        const mantItem = await prisma.mantItem.findUnique({
            where: {
                id: mantItemId,
                tenantId: TENANT_ID,
                status: 'ACTIVE'
            }
        });

        if (!mantItem) {
            return new NextResponse("Maintenance item not found", { status: 404 });
        }

        // Verificar que no exista ya esta combinación plan-item
        const existingPlanTask = await prisma.planTask.findUnique({
            where: {
                planId_mantItemId: {
                    planId,
                    mantItemId
                }
            }
        });

        if (existingPlanTask) {
            return new NextResponse("This maintenance item is already assigned to this template", { status: 409 });
        }

        const templateItem = await prisma.planTask.create({
            data: {
                planId,
                mantItemId,
                triggerKm
            },
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
            }
        });

        return NextResponse.json(templateItem);
    } catch (error) {
        console.error("[TEMPLATE_ITEM_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
import { prisma } from "@/lib/prisma";
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from "next/server";

const TENANT_ID = 'mvp-default-tenant';

export async function GET(
    _req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const templateItemId = parseInt(params.id);

        if (isNaN(templateItemId)) {
            return new NextResponse("Invalid ID", { status: 400 });
        }

        const templateItem = await prisma.planTask.findUnique({
            where: {
                id: templateItemId
            },
            include: {
                mantPlan: {
                    select: {
                        id: true,
                        name: true,
                        tenantId: true
                    }
                },
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

        if (!templateItem || templateItem.mantPlan.tenantId !== TENANT_ID) {
            return new NextResponse("Template item not found", { status: 404 });
        }

        return NextResponse.json(templateItem);
    } catch (error) {
        console.error("[TEMPLATE_ITEM_GET_BY_ID]", error);
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

        const templateItemId = parseInt(params.id);

        if (isNaN(templateItemId)) {
            return new NextResponse("Invalid ID", { status: 400 });
        }

        const { mantItemId, triggerKm } = await req.json();

        // Validación de campos requeridos
        if (!mantItemId || mantItemId <= 0) {
            return new NextResponse("Valid mantItemId is required", { status: 400 });
        }

        if (!triggerKm || triggerKm <= 0) {
            return new NextResponse("Valid triggerKm is required", { status: 400 });
        }

        // Verificar que el template item existe y el plan pertenece al tenant
        const existingTemplateItem = await prisma.planTask.findUnique({
            where: {
                id: templateItemId
            },
            include: {
                mantPlan: {
                    select: {
                        id: true,
                        tenantId: true
                    }
                }
            }
        });

        if (!existingTemplateItem || existingTemplateItem.mantPlan.tenantId !== TENANT_ID) {
            return new NextResponse("Template item not found", { status: 404 });
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

        // Verificar que no exista ya esta combinación plan-item (excluyendo el actual)
        const duplicatePlanTask = await prisma.planTask.findFirst({
            where: {
                planId: existingTemplateItem.mantPlan.id,
                mantItemId,
                id: {
                    not: templateItemId
                }
            }
        });

        if (duplicatePlanTask) {
            return new NextResponse("This maintenance item is already assigned to this template", { status: 409 });
        }

        const updatedTemplateItem = await prisma.planTask.update({
            where: {
                id: templateItemId
            },
            data: {
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

        return NextResponse.json(updatedTemplateItem);
    } catch (error) {
        console.error("[TEMPLATE_ITEM_PATCH]", error);
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

        const templateItemId = parseInt(params.id);

        if (isNaN(templateItemId)) {
            return new NextResponse("Invalid ID", { status: 400 });
        }

        // Verificar que el template item existe y el plan pertenece al tenant
        const existingTemplateItem = await prisma.planTask.findUnique({
            where: {
                id: templateItemId
            },
            include: {
                mantPlan: {
                    select: {
                        id: true,
                        tenantId: true
                    }
                }
            }
        });

        if (!existingTemplateItem || existingTemplateItem.mantPlan.tenantId !== TENANT_ID) {
            return new NextResponse("Template item not found", { status: 404 });
        }

        // TODO: Verificar si hay vehículos con planes activos que usen este item
        // const activeVehiclePlansCount = await prisma.vehicleMantPlanItem.count({
        //     where: {
        //         mantItemId: existingTemplateItem.mantItemId,
        //         vehicleMantPlan: {
        //             mantPlanId: existingTemplateItem.planId,
        //             status: 'ACTIVE'
        //         },
        //         status: {
        //             in: ['PENDING', 'IN_PROGRESS']
        //         }
        //     }
        // });

        // if (activeVehiclePlansCount > 0) {
        //     return new NextResponse("Cannot delete template item with active vehicle maintenance plans", { status: 409 });
        // }

        await prisma.planTask.delete({
            where: {
                id: templateItemId
            }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[TEMPLATE_ITEM_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
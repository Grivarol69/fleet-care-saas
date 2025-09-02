import { prisma } from "@/lib/prisma";
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from "next/server";

const TENANT_ID = 'mvp-default-tenant';

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

        const mantItemId = parseInt(params.id);

        if (isNaN(mantItemId)) {
            return new NextResponse("Invalid ID", { status: 400 });
        }

        // Verificar que el item existe y pertenece al tenant
        const existingItem = await prisma.mantItem.findUnique({
            where: {
                id: mantItemId,
                tenantId: TENANT_ID
            }
        });

        if (!existingItem) {
            return new NextResponse("Item not found", { status: 404 });
        }

        // TODO: Verificar si hay work orders asociadas antes de eliminar
        // const workOrdersCount = await prisma.workOrder.count({
        //     where: {
        //         mantItemId: mantItemId
        //     }
        // });

        // if (workOrdersCount > 0) {
        //     return new NextResponse("Cannot delete item with associated work orders", { status: 409 });
        // }

        await prisma.mantItem.delete({
            where: {
                id: mantItemId
            }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[MANT_ITEM_DELETE]", error);
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

        const mantItemId = parseInt(params.id);

        if (isNaN(mantItemId)) {
            return new NextResponse("Invalid ID", { status: 400 });
        }

        const { name, description, mantType, estimatedTime, categoryId } = await req.json();

        // Validaci�n de campos requeridos
        if (!name || name.trim() === '') {
            return new NextResponse("Name is required", { status: 400 });
        }

        if (!mantType || !['PREVENTIVE', 'PREDICTIVE', 'CORRECTIVE', 'EMERGENCY'].includes(mantType)) {
            return new NextResponse("Valid mantType is required", { status: 400 });
        }

        if (!estimatedTime || estimatedTime <= 0) {
            return new NextResponse("Valid estimatedTime is required", { status: 400 });
        }

        if (!categoryId || categoryId <= 0) {
            return new NextResponse("Valid categoryId is required", { status: 400 });
        }

        // Verificar que el item existe y pertenece al tenant
        const existingItem = await prisma.mantItem.findUnique({
            where: {
                id: mantItemId,
                tenantId: TENANT_ID
            }
        });

        if (!existingItem) {
            return new NextResponse("Item not found", { status: 404 });
        }

        // Verificar que la categor�a existe
        const category = await prisma.mantCategory.findUnique({
            where: {
                id: categoryId,
                tenantId: TENANT_ID
            }
        });

        if (!category) {
            return new NextResponse("Category not found", { status: 404 });
        }

        // Verificar que no exista otro item con el mismo nombre (excluyendo el actual)
        const duplicateItem = await prisma.mantItem.findFirst({
            where: {
                tenantId: TENANT_ID,
                name: name.trim(),
                id: {
                    not: mantItemId
                }
            }
        });

        if (duplicateItem) {
            return new NextResponse("Item with this name already exists", { status: 409 });
        }

        const updatedMantItem = await prisma.mantItem.update({
            where: {
                id: mantItemId
            },
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                mantType,
                estimatedTime: parseFloat(estimatedTime),
                categoryId,
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            }
        });

        return NextResponse.json(updatedMantItem);
    } catch (error) {
        console.error("[MANT_ITEM_PATCH]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
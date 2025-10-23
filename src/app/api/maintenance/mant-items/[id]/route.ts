import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function DELETE(
    _req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        // Validar permisos - Solo SUPER_ADMIN puede modificar tablas maestras
        const { requireSuperAdmin } = await import("@/lib/permissions");
        try {
            requireSuperAdmin(user);
        } catch (error) {
            return NextResponse.json(
                { error: (error as Error).message },
                { status: 403 }
            );
        }

        const mantItemId = parseInt(params.id);

        if (isNaN(mantItemId)) {
            return NextResponse.json({ error: "ID inválido" }, { status: 400 });
        }

        // Verificar que el item existe y pertenece al tenant
        const existingItem = await prisma.mantItem.findUnique({
            where: {
                id: mantItemId,
                tenantId: user.tenantId
            }
        });

        if (!existingItem) {
            return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });
        }

        await prisma.mantItem.delete({
            where: {
                id: mantItemId
            }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error("[MANT_ITEM_DELETE]", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        // Validar permisos - Solo SUPER_ADMIN puede modificar tablas maestras
        const { requireSuperAdmin } = await import("@/lib/permissions");
        try {
            requireSuperAdmin(user);
        } catch (error) {
            return NextResponse.json(
                { error: (error as Error).message },
                { status: 403 }
            );
        }

        const mantItemId = parseInt(params.id);

        if (isNaN(mantItemId)) {
            return NextResponse.json({ error: "ID inválido" }, { status: 400 });
        }

        const { name, description, mantType, estimatedTime, categoryId } = await req.json();

        // Validación de campos requeridos
        if (!name || name.trim() === '') {
            return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
        }

        if (!mantType || !['PREVENTIVE', 'PREDICTIVE', 'CORRECTIVE', 'EMERGENCY'].includes(mantType)) {
            return NextResponse.json({ error: "Tipo de mantenimiento inválido" }, { status: 400 });
        }

        if (!estimatedTime || estimatedTime <= 0) {
            return NextResponse.json({ error: "Tiempo estimado inválido" }, { status: 400 });
        }

        if (!categoryId || categoryId <= 0) {
            return NextResponse.json({ error: "Categoría inválida" }, { status: 400 });
        }

        // Verificar que el item existe y pertenece al tenant
        const existingItem = await prisma.mantItem.findUnique({
            where: {
                id: mantItemId,
                tenantId: user.tenantId
            }
        });

        if (!existingItem) {
            return NextResponse.json({ error: "Ítem no encontrado" }, { status: 404 });
        }

        // Verificar que la categoría existe
        const category = await prisma.mantCategory.findUnique({
            where: {
                id: categoryId,
                tenantId: user.tenantId
            }
        });

        if (!category) {
            return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
        }

        // Verificar que no exista otro item con el mismo nombre (excluyendo el actual)
        const duplicateItem = await prisma.mantItem.findFirst({
            where: {
                tenantId: user.tenantId,
                name: name.trim(),
                id: {
                    not: mantItemId
                }
            }
        });

        if (duplicateItem) {
            return NextResponse.json({ error: "Ya existe un ítem con este nombre" }, { status: 409 });
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
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
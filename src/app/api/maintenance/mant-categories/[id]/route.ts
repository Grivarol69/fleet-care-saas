import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

// GET - Obtener categoría específica por ID
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const { id } = await params;

        const category = await prisma.mantCategory.findUnique({
            where: {
                id: parseInt(id),
                tenantId: user.tenantId
            }
        });

        if (!category) {
            return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
        }

        return NextResponse.json(category);
    } catch (error) {
        console.error("[CATEGORY_GET]", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

// PUT - Actualizar categoría específica (solo SUPER_ADMIN)
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        // Validar permisos
        const { requireSuperAdmin } = await import("@/lib/permissions");
        try {
            requireSuperAdmin(user);
        } catch (error) {
            return NextResponse.json(
                { error: (error as Error).message },
                { status: 403 }
            );
        }

        const { id } = await params;

        const { name } = await req.json();

        if (!name || name.trim() === '') {
            return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
        }

        // Verificar que la categoría existe
        const existingCategory = await prisma.mantCategory.findUnique({
            where: {
                id: parseInt(id),
                tenantId: user.tenantId
            }
        });

        if (!existingCategory) {
            return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
        }

        // Verificar duplicados
        const duplicateCategory = await prisma.mantCategory.findFirst({
            where: {
                tenantId: user.tenantId,
                name: name.trim(),
                id: {
                    not: parseInt(id)
                }
            }
        });

        if (duplicateCategory) {
            return NextResponse.json({ error: "La categoría ya existe" }, { status: 409 });
        }

        const updatedCategory = await prisma.mantCategory.update({
            where: {
                id: parseInt(id),
                tenantId: user.tenantId
            },
            data: {
                name: name.trim(),
            }
        });

        return NextResponse.json(updatedCategory);
    } catch (error) {
        console.log("[CATEGORY_PUT]", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

// DELETE - Eliminar categoría específica (solo SUPER_ADMIN)
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        // Validar permisos
        const { requireSuperAdmin } = await import("@/lib/permissions");
        try {
            requireSuperAdmin(user);
        } catch (error) {
            return NextResponse.json(
                { error: (error as Error).message },
                { status: 403 }
            );
        }

        const { id } = await params;

        const existingCategory = await prisma.mantCategory.findUnique({
            where: {
                id: parseInt(id),
                tenantId: user.tenantId
            }
        });

        if (!existingCategory) {
            return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
        }

        await prisma.mantCategory.delete({
            where: {
                id: parseInt(id),
                tenantId: user.tenantId
            }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.log("[CATEGORY_DELETE]", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const categories = await prisma.mantCategory.findMany({
            where: {
                tenantId: user.tenantId
            },
            orderBy: {
                name: 'asc'
            }
        });
        return NextResponse.json(categories);
    } catch (error) {
        console.error("[CATEGORIES_GET]", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

export async function POST(req: Request) {
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

        const { name } = await req.json();

        if (!name || name.trim() === '') {
            return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
        }

        // Verificar que no exista una categoria con el mismo nombre
        const existingCategory = await prisma.mantCategory.findUnique({
            where: {
                tenantId_name: {
                    tenantId: user.tenantId,
                    name: name.trim()
                }
            }
        });

        if (existingCategory) {
            return NextResponse.json({ error: "La categoría ya existe" }, { status: 409 });
        }

        const category = await prisma.mantCategory.create({
            data: {
                name: name.trim(),
                tenantId: user.tenantId,
            },
        });

        return NextResponse.json(category);
    } catch (error) {
        console.log("[CATEGORY_POST]", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

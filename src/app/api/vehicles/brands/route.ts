import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // Obtener usuario actual
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json(
                { error: "No autenticado" },
                { status: 401 }
            );
        }

        // Todos pueden VER las marcas (solo lectura)
        const brands = await prisma.vehicleBrand.findMany({
            where: {
                tenantId: user.tenantId // Usar tenant del usuario en lugar de hardcoded
            },
            orderBy: {
                name: 'asc'
            }
        });
        return NextResponse.json(brands);
    } catch (error) {
        console.error("[BRANDS_GET]", error);
        return NextResponse.json(
            { error: "Error interno" },
            { status: 500 }
        );
    }
}

export async function POST(req: Request) {
    try {
        // Obtener usuario actual
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json(
                { error: "No autenticado" },
                { status: 401 }
            );
        }

        // Solo SUPER_ADMIN puede crear marcas
        const { requireSuperAdmin } = await import("@/lib/permissions");
        try {
            requireSuperAdmin(user);
        } catch (error: unknown) {
            const err = error as Error;
            return NextResponse.json(
                { error: err.message },
                { status: 403 }
            );
        }

        const { name } = await req.json();

        if (!name || name.trim() === '') {
            return NextResponse.json(
                { error: "El nombre es requerido" },
                { status: 400 }
            );
        }

        // Verificar que no exista una marca con el mismo nombre
        const existingBrand = await prisma.vehicleBrand.findUnique({
            where: {
                tenantId_name: {
                    tenantId: user.tenantId,
                    name: name.trim()
                }
            }
        });

        if (existingBrand) {
            return NextResponse.json(
                { error: "La marca ya existe" },
                { status: 409 }
            );
        }

        const brand = await prisma.vehicleBrand.create({
            data: {
                name: name.trim(),
                tenantId: user.tenantId,
            },
        });

        return NextResponse.json(brand);
    } catch (error) {
        console.log("[BRAND_POST]", error);
        return NextResponse.json(
            { error: "Error interno" },
            { status: 500 }
        );
    }
}

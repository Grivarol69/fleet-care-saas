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

        // Devolver marcas GLOBALES + del tenant (solo activas)
        const brands = await prisma.vehicleBrand.findMany({
            where: {
                OR: [
                    { isGlobal: true },           // Marcas globales (Knowledge Base)
                    { tenantId: user.tenantId }   // Marcas custom del tenant
                ],
                status: 'ACTIVE'
            },
            orderBy: {
                name: 'asc'
            }
        });
        return NextResponse.json(brands);
    } catch (error) {
        console.error("[BRANDS_GET]", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
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

        const { name, isGlobal } = await req.json();

        if (!name || name.trim() === '') {
            return NextResponse.json(
                { error: "El nombre es requerido" },
                { status: 400 }
            );
        }

        // Validar permisos según destino
        let targetTenant: string | null;

        if (isGlobal) {
            // Solo SUPER_ADMIN puede crear marcas globales
            const { requireSuperAdmin } = await import("@/lib/permissions");
            try {
                requireSuperAdmin(user);
                targetTenant = null; // NULL para datos globales
            } catch (error: unknown) {
                const err = error as Error;
                return NextResponse.json(
                    { error: err.message },
                    { status: 403 }
                );
            }
        } else {
            // OWNER/MANAGER pueden crear custom en su tenant
            const { requireManagementRole } = await import("@/lib/permissions");
            try {
                requireManagementRole(user);
                targetTenant = user.tenantId;
            } catch (error: unknown) {
                const err = error as Error;
                return NextResponse.json(
                    { error: err.message },
                    { status: 403 }
                );
            }
        }

        // Verificar que no exista una marca con el mismo nombre en el scope
        const existingBrand = await prisma.vehicleBrand.findFirst({
            where: {
                tenantId: targetTenant,
                name: name.trim()
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
                tenantId: targetTenant,
                isGlobal: isGlobal || false
            },
        });

        return NextResponse.json(brand, { status: 201 });
    } catch (error) {
        console.log("[BRAND_POST]", error);
        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}

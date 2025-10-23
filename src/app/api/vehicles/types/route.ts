import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const types = await prisma.vehicleType.findMany({
            where: {
                tenantId: user.tenantId
            },
            orderBy: {
                name: 'asc'
            }
        });
        return NextResponse.json(types);
    } catch (error) {
        console.error("[TYPES_GET]", error);
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

        // Verificar que no exista un tipo con el mismo nombre
        const existingType = await prisma.vehicleType.findUnique({
            where: {
                tenantId_name: {
                    tenantId: user.tenantId,
                    name: name.trim()
                }
            }
        });

        if (existingType) {
            return NextResponse.json({ error: "El tipo ya existe" }, { status: 409 });
        }

        const type = await prisma.vehicleType.create({
            data: {
                name: name.trim(),
                tenantId: user.tenantId,
            },
        });

        return NextResponse.json(type);
    } catch (error) {
        console.log("[TYPE_POST]", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}

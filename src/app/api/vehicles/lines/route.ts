import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const lines = await prisma.vehicleLine.findMany({
            where: {
                tenantId: user.tenantId
            },
            orderBy: {
                name: 'asc'
            },
            include: {
                brand: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        // Mapear los datos para incluir brandName directamente
        const mappedLines = lines.map(line => ({
            id: line.id,
            name: line.name,
            brandId: line.brandId,
            brandName: line.brand?.name || 'Sin marca'
        }));

        return NextResponse.json(mappedLines);
    } catch (error) {
        console.error("[LINE_GET]", error);
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

        const { name, brandId } = await req.json();

        if (!name || name.trim() === '') {
            return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
        }

        if (!brandId) {
            return NextResponse.json({ error: "La marca es requerida" }, { status: 400 });
        }

        // Verificar que no existe
        const existingLine = await prisma.vehicleLine.findUnique({
            where: {
                tenantId_brandId_name: {
                    tenantId: user.tenantId,
                    brandId: parseInt(brandId),
                    name: name.trim()
                }
            }
        });

        if (existingLine) {
            return NextResponse.json({ error: "La línea ya existe para esta marca" }, { status: 409 });
        }

        // Verificar que la marca existe y pertenece al tenant
        const brand = await prisma.vehicleBrand.findUnique({
            where: {
                id: parseInt(brandId),
                tenantId: user.tenantId
            }
        });

        if (!brand) {
            return NextResponse.json({ error: "Marca no encontrada" }, { status: 404 });
        }

        const line = await prisma.vehicleLine.create({
            data: {
                name: name.trim(),
                brandId: parseInt(brandId),
                tenantId: user.tenantId,
            },
            include: {
                brand: {
                    select: {
                        name: true,
                    },
                },
            }
        });

        // Mapear para incluir brandName
        const mappedLine = {
            id: line.id,
            name: line.name,
            brandId: line.brandId,
            brandName: line.brand?.name || 'Sin marca'
        };

        return NextResponse.json(mappedLine);
    } catch (error) {
        console.log("[LINE_POST]", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
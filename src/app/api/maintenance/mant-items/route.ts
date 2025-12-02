import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        // Búsqueda para autocompletado
        const searchParams = request.nextUrl.searchParams;
        const search = searchParams.get('search');

        const mantItems = await prisma.mantItem.findMany({
            where: {
                tenantId: user.tenantId,
                ...(search && {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { description: { contains: search, mode: 'insensitive' } }
                    ]
                })
            },
            include: {
                category: {
                    select: {
                        id: true,
                        name: true
                    }
                }
            },
            orderBy: {
                name: 'asc'
            },
            ...(search && { take: 15 }) // Limitar solo en búsquedas
        });
        return NextResponse.json(mantItems);
    } catch (error) {
        console.error("[MANT_ITEMS_GET]", error);
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

        const { name, description, mantType, categoryId, type } = await req.json();

        // Validación de campos requeridos
        if (!name || name.trim() === '') {
            return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
        }

        if (!mantType || !['PREVENTIVE', 'PREDICTIVE', 'CORRECTIVE', 'EMERGENCY'].includes(mantType)) {
            return NextResponse.json({ error: "Tipo de mantenimiento inválido" }, { status: 400 });
        }

        if (!categoryId || categoryId <= 0) {
            return NextResponse.json({ error: "Categoría inválida" }, { status: 400 });
        }

        if (type && !['ACTION', 'PART', 'SERVICE'].includes(type)) {
            return NextResponse.json({ error: "Tipo de item inválido" }, { status: 400 });
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

        // Verificar que no exista un item con el mismo nombre
        const existingItem = await prisma.mantItem.findUnique({
            where: {
                tenantId_name: {
                    tenantId: user.tenantId,
                    name: name.trim()
                }
            }
        });

        if (existingItem) {
            return NextResponse.json({ error: "El ítem ya existe" }, { status: 409 });
        }

        const mantItem = await prisma.mantItem.create({
            data: {
                name: name.trim(),
                description: description?.trim() || null,
                mantType,
                categoryId,
                type: type || 'ACTION',
                tenantId: user.tenantId,
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

        return NextResponse.json(mantItem);
    } catch (error) {
        console.log("[MANT_ITEM_POST]", error);
        return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
}
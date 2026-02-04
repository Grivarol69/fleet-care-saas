// src/app/api/vehicles/brands/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { safeParseInt } from '@/lib/validation';

// GET - Obtener marca específica por ID
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
        const brandId = safeParseInt(id);

        if (brandId === null) {
            return NextResponse.json({ error: "ID inválido" }, { status: 400 });
        }

        const brand = await prisma.vehicleBrand.findUnique({
            where: {
                id: brandId,
                tenantId: user.tenantId
            }
        });

        if (!brand) {
            return NextResponse.json({ error: "Marca no encontrada" }, { status: 404 });
        }

        return NextResponse.json(brand);
    } catch (error) {
        console.error("[BRAND_GET]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

// PUT - Actualizar marca específica (solo SUPER_ADMIN)
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
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

        const { id } = await params;
        const brandId = safeParseInt(id);

        if (brandId === null) {
            return NextResponse.json({ error: "ID inválido" }, { status: 400 });
        }

        const { name } = await req.json();

        if (!name || name.trim() === '') {
            return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
        }

        // Verificar que la marca existe
        const existingBrand = await prisma.vehicleBrand.findUnique({
            where: {
                id: brandId,
                tenantId: user.tenantId
            }
        });

        if (!existingBrand) {
            return NextResponse.json({ error: "Marca no encontrada" }, { status: 404 });
        }

        // Verificar duplicados
        const duplicateBrand = await prisma.vehicleBrand.findFirst({
            where: {
                tenantId: user.tenantId,
                name: name.trim(),
                id: {
                    not: brandId
                }
            }
        });

        if (duplicateBrand) {
            return NextResponse.json({ error: "La marca ya existe" }, { status: 409 });
        }

        const updatedBrand = await prisma.vehicleBrand.update({
            where: {
                id: brandId,
                tenantId: user.tenantId
            },
            data: {
                name: name.trim(),
            }
        });

        return NextResponse.json(updatedBrand);
    } catch (error) {
        console.log("[BRAND_PUT]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

// DELETE - Eliminar marca específica (solo SUPER_ADMIN)
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
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

        const { id } = await params;
        const brandId = safeParseInt(id);

        if (brandId === null) {
            return NextResponse.json({ error: "ID inválido" }, { status: 400 });
        }

        const existingBrand = await prisma.vehicleBrand.findUnique({
            where: {
                id: brandId,
                tenantId: user.tenantId
            }
        });

        if (!existingBrand) {
            return NextResponse.json({ error: "Marca no encontrada" }, { status: 404 });
        }

        // Soft delete - cambiar status a INACTIVE
        await prisma.vehicleBrand.update({
            where: {
                id: brandId,
                tenantId: user.tenantId
            },
            data: {
                status: 'INACTIVE'
            }
        });

        return NextResponse.json({ success: true, message: "Marca desactivada" });
    } catch (error) {
        console.log("[BRAND_DELETE]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}
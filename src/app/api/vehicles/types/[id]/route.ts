import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { safeParseInt } from '@/lib/validation';

// GET - Obtener tipo específico por ID
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
        const typeId = safeParseInt(id);

        if (typeId === null) {
            return NextResponse.json({ error: "ID inválido" }, { status: 400 });
        }

        const type = await prisma.vehicleType.findUnique({
            where: {
                id: typeId,
                tenantId: user.tenantId
            }
        });

        if (!type) {
            return NextResponse.json({ error: "Tipo no encontrado" }, { status: 404 });
        }

        return NextResponse.json(type);
    } catch (error) {
        console.error("[TYPE_GET]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

// PUT - Actualizar tipo específico (solo SUPER_ADMIN)
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
        const typeId = safeParseInt(id);

        if (typeId === null) {
            return NextResponse.json({ error: "ID inválido" }, { status: 400 });
        }

        const { name } = await req.json();

        if (!name || name.trim() === '') {
            return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
        }

        // Verificar que el tipo existe y pertenece al tenant
        const existingType = await prisma.vehicleType.findUnique({
            where: {
                id: typeId,
                tenantId: user.tenantId
            }
        });

        if (!existingType) {
            return NextResponse.json({ error: "Tipo no encontrado" }, { status: 404 });
        }

        // Verificar que no exista otro tipo con el mismo nombre
        const duplicateType = await prisma.vehicleType.findFirst({
            where: {
                tenantId: user.tenantId,
                name: name.trim(),
                id: {
                    not: typeId
                }
            }
        });

        if (duplicateType) {
            return NextResponse.json({ error: "El tipo ya existe" }, { status: 409 });
        }

        const updatedType = await prisma.vehicleType.update({
            where: {
                id: typeId
            },
            data: {
                name: name.trim(),
            }
        });

        return NextResponse.json(updatedType);
    } catch (error) {
        console.error("[TYPE_PUT]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

// DELETE - Eliminar tipo específico (solo SUPER_ADMIN)
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
        const typeId = safeParseInt(id);

        if (typeId === null) {
            return NextResponse.json({ error: "ID inválido" }, { status: 400 });
        }

        // Verificar que el tipo existe y pertenece al tenant
        const existingType = await prisma.vehicleType.findUnique({
            where: {
                id: typeId,
                tenantId: user.tenantId
            }
        });

        if (!existingType) {
            return NextResponse.json({ error: "Tipo no encontrado" }, { status: 404 });
        }

        // Verificar que no tenga vehículos dependientes
        const hasVehicles = await prisma.vehicle.findFirst({
            where: {
                typeId: typeId,
                tenantId: user.tenantId
            }
        });

        if (hasVehicles) {
            return NextResponse.json({ error: "No se puede eliminar el tipo porque tiene vehículos asociados" }, { status: 409 });
        }

        // Soft delete - cambiar status a INACTIVE
        await prisma.vehicleType.update({
            where: {
                id: typeId
            },
            data: {
                status: 'INACTIVE'
            }
        });

        return NextResponse.json({ success: true, message: "Tipo desactivado" });
    } catch (error) {
        console.error("[TYPE_DELETE]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

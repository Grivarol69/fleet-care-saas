import { prisma } from "@/lib/prisma";
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from "next/server";
import { safeParseInt } from '@/lib/validation';

// GET - Obtener proveedor específico por ID
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const providerId = safeParseInt(id);
        if (providerId === null) {
            return NextResponse.json({ error: "ID de proveedor inválido" }, { status: 400 });
        }

        const provider = await prisma.provider.findUnique({
            where: {
                id: providerId,
                tenantId: user.tenantId
            }
        });

        if (!provider) {
            return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
        }

        return NextResponse.json(provider);
    } catch (error) {
        console.error("[PROVIDER_GET]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

// PUT - Actualizar proveedor específico
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const providerId = safeParseInt(id);
        if (providerId === null) {
            return NextResponse.json({ error: "ID de proveedor inválido" }, { status: 400 });
        }

        const { name, email, phone, address, specialty } = await req.json();

        if (!name || name.trim() === '') {
            return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
        }

        // Verificar que el proveedor existe
        const existingProvider = await prisma.provider.findUnique({
            where: {
                id: providerId,
                tenantId: user.tenantId
            }
        });

        if (!existingProvider) {
            return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
        }

        // Verificar duplicados
        const duplicateProvider = await prisma.provider.findFirst({
            where: {
                tenantId: user.tenantId,
                name: name.trim(),
                id: {
                    not: providerId
                }
            }
        });

        if (duplicateProvider) {
            return NextResponse.json({ error: "Ya existe un proveedor con este nombre" }, { status: 409 });
        }

        const updatedProvider = await prisma.provider.update({
            where: {
                id: providerId,
                tenantId: user.tenantId
            },
            data: {
                name: name.trim(),
                email: email?.trim() || null,
                phone: phone?.trim() || null,
                address: address?.trim() || null,
                specialty: specialty?.trim() || null,
            }
        });

        return NextResponse.json(updatedProvider);
    } catch (error) {
        console.error("[PROVIDER_PUT]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

// DELETE - Eliminar proveedor específico
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autenticado" }, { status: 401 });
        }

        const providerId = safeParseInt(id);
        if (providerId === null) {
            return NextResponse.json({ error: "ID de proveedor inválido" }, { status: 400 });
        }

        const existingProvider = await prisma.provider.findUnique({
            where: {
                id: providerId,
                tenantId: user.tenantId
            }
        });

        if (!existingProvider) {
            return NextResponse.json({ error: "Proveedor no encontrado" }, { status: 404 });
        }

        // Soft delete - cambiar status a INACTIVE
        await prisma.provider.update({
            where: {
                id: providerId,
                tenantId: user.tenantId
            },
            data: {
                status: 'INACTIVE'
            }
        });

        return NextResponse.json({ success: true, message: "Proveedor desactivado" });
    } catch (error) {
        console.error("[PROVIDER_DELETE]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

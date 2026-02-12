import { prisma } from "@/lib/prisma";
import { getCurrentUser } from '@/lib/auth';
import { NextResponse } from "next/server";
import { safeParseInt } from '@/lib/validation';
import { canManageMasterData } from "@/lib/permissions";

// GET - Obtener técnico específico por ID
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

        const technicianId = safeParseInt(id);
        if (technicianId === null) {
            return NextResponse.json({ error: "ID de técnico inválido" }, { status: 400 });
        }

        const technician = await prisma.technician.findUnique({
            where: {
                id: technicianId,
                tenantId: user.tenantId
            }
        });

        if (!technician) {
            return NextResponse.json({ error: "Técnico no encontrado" }, { status: 404 });
        }

        return NextResponse.json(technician);
    } catch (error) {
        console.error("[TECHNICIAN_GET]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

// PUT - Actualizar técnico específico
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

        if (!canManageMasterData(user)) {
            return NextResponse.json({ error: "No tienes permisos para esta acción" }, { status: 403 });
        }

        const technicianId = safeParseInt(id);
        if (technicianId === null) {
            return NextResponse.json({ error: "ID de técnico inválido" }, { status: 400 });
        }

        const { name, email, phone, specialty } = await req.json();

        if (!name || name.trim() === '') {
            return NextResponse.json({ error: "El nombre es requerido" }, { status: 400 });
        }

        // Verificar que el técnico existe
        const existingTechnician = await prisma.technician.findUnique({
            where: {
                id: technicianId,
                tenantId: user.tenantId
            }
        });

        if (!existingTechnician) {
            return NextResponse.json({ error: "Técnico no encontrado" }, { status: 404 });
        }

        // Verificar duplicados
        const duplicateTechnician = await prisma.technician.findFirst({
            where: {
                tenantId: user.tenantId,
                name: name.trim(),
                id: {
                    not: technicianId
                }
            }
        });

        if (duplicateTechnician) {
            return NextResponse.json({ error: "Ya existe un técnico con este nombre" }, { status: 409 });
        }

        const updatedTechnician = await prisma.technician.update({
            where: {
                id: technicianId,
                tenantId: user.tenantId
            },
            data: {
                name: name.trim(),
                email: email?.trim() || null,
                phone: phone?.trim() || null,
                specialty: specialty?.trim() || null,
            }
        });

        return NextResponse.json(updatedTechnician);
    } catch (error) {
        console.error("[TECHNICIAN_PUT]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

// DELETE - Eliminar técnico específico
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

        if (!canManageMasterData(user)) {
            return NextResponse.json({ error: "No tienes permisos para esta acción" }, { status: 403 });
        }

        const technicianId = safeParseInt(id);
        if (technicianId === null) {
            return NextResponse.json({ error: "ID de técnico inválido" }, { status: 400 });
        }

        const existingTechnician = await prisma.technician.findUnique({
            where: {
                id: technicianId,
                tenantId: user.tenantId
            }
        });

        if (!existingTechnician) {
            return NextResponse.json({ error: "Técnico no encontrado" }, { status: 404 });
        }

        // Soft delete - cambiar status a INACTIVE
        await prisma.technician.update({
            where: {
                id: technicianId,
                tenantId: user.tenantId
            },
            data: {
                status: 'INACTIVE'
            }
        });

        return NextResponse.json({ success: true, message: "Técnico desactivado" });
    } catch (error) {
        console.error("[TECHNICIAN_DELETE]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

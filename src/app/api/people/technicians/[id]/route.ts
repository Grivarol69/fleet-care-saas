import { prisma } from "@/lib/prisma";
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from "next/server";

const TENANT_ID = 'mvp-default-tenant';

// GET - Obtener técnico específico por ID
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const technician = await prisma.technician.findUnique({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            }
        });

        if (!technician) {
            return new NextResponse("Technician not found", { status: 404 });
        }

        return NextResponse.json(technician);
    } catch (error) {
        console.error("[TECHNICIAN_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// PUT - Actualizar técnico específico
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { name, email, phone, specialty } = await req.json();

        if (!name || name.trim() === '') {
            return new NextResponse("Name is required", { status: 400 });
        }

        // Verificar que el técnico existe
        const existingTechnician = await prisma.technician.findUnique({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            }
        });

        if (!existingTechnician) {
            return new NextResponse("Technician not found", { status: 404 });
        }

        // Verificar duplicados
        const duplicateTechnician = await prisma.technician.findFirst({
            where: {
                tenantId: TENANT_ID,
                name: name.trim(),
                id: {
                    not: parseInt(id)
                }
            }
        });

        if (duplicateTechnician) {
            return new NextResponse("Technician name already exists", { status: 409 });
        }

        const updatedTechnician = await prisma.technician.update({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
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
        console.log("[TECHNICIAN_PUT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// DELETE - Eliminar técnico específico
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const existingTechnician = await prisma.technician.findUnique({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            }
        });

        if (!existingTechnician) {
            return new NextResponse("Technician not found", { status: 404 });
        }

        await prisma.technician.delete({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.log("[TECHNICIAN_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
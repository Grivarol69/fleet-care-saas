// src/app/api/vehicles/Types/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from "next/server";

const TENANT_ID = 'mvp-default-tenant'; // Tenant hardcodeado para MVP


// GET - Obtener marca específica por ID
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const type = await prisma.vehicleType.findUnique({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            }
        });

        if (!type) {
            return new NextResponse("Type not found", { status: 404 });
        }

        return NextResponse.json(type);
    } catch (error) {
        console.error("[TYPE_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// PUT - Actualizar marca específica
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        // Verificar autenticación con Supabase SSR (método actualizado)
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { name } = await req.json();

        if (!name || name.trim() === '') {
            return new NextResponse("Name is required", { status: 400 });
        }

        // Verificar que el tipo existe y pertenece al tenant
        const existingType = await prisma.vehicleType.findUnique({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            }
        });

        if (!existingType) {
            return new NextResponse("Type not found", { status: 404 });
        }

        // Verificar que no exista otro tipo con el mismo nombre
        const duplicateType = await prisma.vehicleType.findFirst({
            where: {
                tenantId: TENANT_ID,
                name: name.trim(),
                id: {
                    not: parseInt(id)
                }
            }
        });

        if (duplicateType) {
            return new NextResponse("Type name already exists", { status: 409 });
        }

        const updatedType = await prisma.vehicleType.update({
            where: {
                id: parseInt(id)
            },
            data: {
                name: name.trim(),
            }
        });

        return NextResponse.json(updatedType);
    } catch (error) {
        console.log("[TYPE_PUT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// DELETE - Eliminar Tipo específico
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        // Verificar autenticación con Supabase SSR (método actualizado)
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Verificar que la marca existe y pertenece al tenant
        const existingType = await prisma.vehicleType.findUnique({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            }
        });

        if (!existingType) {
            return new NextResponse("Type not found", { status: 404 });
        }

        await prisma.vehicleType.delete({
            where: {
                id: parseInt(id)
            }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.log("[TYPE_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
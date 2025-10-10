import { prisma } from "@/lib/prisma";
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from "next/server";

const TENANT_ID = 'cf68b103-12fd-4208-a352-42379ef3b6e1';

// GET - Obtener proveedor específico por ID
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const provider = await prisma.provider.findUnique({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            }
        });

        if (!provider) {
            return new NextResponse("Provider not found", { status: 404 });
        }

        return NextResponse.json(provider);
    } catch (error) {
        console.error("[PROVIDER_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// PUT - Actualizar proveedor específico
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

        const { name, email, phone, address, specialty } = await req.json();

        if (!name || name.trim() === '') {
            return new NextResponse("Name is required", { status: 400 });
        }

        // Verificar que el proveedor existe
        const existingProvider = await prisma.provider.findUnique({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            }
        });

        if (!existingProvider) {
            return new NextResponse("Provider not found", { status: 404 });
        }

        // Verificar duplicados
        const duplicateProvider = await prisma.provider.findFirst({
            where: {
                tenantId: TENANT_ID,
                name: name.trim(),
                id: {
                    not: parseInt(id)
                }
            }
        });

        if (duplicateProvider) {
            return new NextResponse("Provider name already exists", { status: 409 });
        }

        const updatedProvider = await prisma.provider.update({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
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
        console.log("[PROVIDER_PUT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// DELETE - Eliminar proveedor específico
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

        const existingProvider = await prisma.provider.findUnique({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            }
        });

        if (!existingProvider) {
            return new NextResponse("Provider not found", { status: 404 });
        }

        await prisma.provider.delete({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.log("[PROVIDER_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
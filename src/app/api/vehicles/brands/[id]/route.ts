// src/app/api/vehicles/brands/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from "next/server";

const TENANT_ID = 'mvp-default-tenant';

// GET - Obtener marca específica por ID
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const brand = await prisma.vehicleBrand.findUnique({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            }
        });

        if (!brand) {
            return new NextResponse("Brand not found", { status: 404 });
        }

        return NextResponse.json(brand);
    } catch (error) {
        console.error("[BRAND_GET]", error);
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
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { name } = await req.json();

        if (!name || name.trim() === '') {
            return new NextResponse("Name is required", { status: 400 });
        }

        // Verificar que la marca existe
        const existingBrand = await prisma.vehicleBrand.findUnique({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            }
        });

        if (!existingBrand) {
            return new NextResponse("Brand not found", { status: 404 });
        }

        // Verificar duplicados
        const duplicateBrand = await prisma.vehicleBrand.findFirst({
            where: {
                tenantId: TENANT_ID,
                name: name.trim(),
                id: {
                    not: parseInt(id)
                }
            }
        });

        if (duplicateBrand) {
            return new NextResponse("Brand name already exists", { status: 409 });
        }

        const updatedBrand = await prisma.vehicleBrand.update({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            },
            data: {
                name: name.trim(),
            }
        });

        return NextResponse.json(updatedBrand);
    } catch (error) {
        console.log("[BRAND_PUT]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// DELETE - Eliminar marca específica
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

        const existingBrand = await prisma.vehicleBrand.findUnique({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            }
        });

        if (!existingBrand) {
            return new NextResponse("Brand not found", { status: 404 });
        }

        // ✅ CORREGIDO: Usar vehicleBrand.delete en lugar de vehicleType.delete
        await prisma.vehicleBrand.delete({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.log("[BRAND_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
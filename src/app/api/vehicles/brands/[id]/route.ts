// src/app/api/vehicles/brands/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from "next/server";

const TENANT_ID = 'mvp-default-tenant'; // Tenant hardcodeado para MVP


// GET - Obtener marca específica por ID
export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const brand = await prisma.vehicleBrand.findUnique({
            where: {
                id: parseInt(params.id),
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
    { params }: { params: { id: string } }
) {
    try {
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

        // Verificar que la marca existe y pertenece al tenant
        const existingBrand = await prisma.vehicleBrand.findUnique({
            where: {
                id: parseInt(params.id),
                tenantId: TENANT_ID
            }
        });

        if (!existingBrand) {
            return new NextResponse("Brand not found", { status: 404 });
        }

        // Verificar que no exista otra marca con el mismo nombre
        const duplicateBrand = await prisma.vehicleBrand.findFirst({
            where: {
                tenantId: TENANT_ID,
                name: name.trim(),
                id: {
                    not: parseInt(params.id)
                }
            }
        });

        if (duplicateBrand) {
            return new NextResponse("Brand name already exists", { status: 409 });
        }

        const updatedBrand = await prisma.vehicleBrand.update({
            where: {
                id: parseInt(params.id)
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
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        // Verificar autenticación con Supabase SSR (método actualizado)
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        // Verificar que la marca existe y pertenece al tenant
        const existingBrand = await prisma.vehicleBrand.findUnique({
            where: {
                id: parseInt(params.id),
                tenantId: TENANT_ID
            }
        });

        if (!existingBrand) {
            return new NextResponse("Brand not found", { status: 404 });
        }

        // Verificar que no tenga relaciones dependientes
        const hasLines = await prisma.vehicleLine.findFirst({
            where: { brandId: parseInt(params.id) }
        });

        const hasVehicles = await prisma.vehicle.findFirst({
            where: { brandId: parseInt(params.id) }
        });

        if (hasLines || hasVehicles) {
            return new NextResponse("Cannot delete brand with existing lines or vehicles", { status: 409 });
        }

        await prisma.vehicleBrand.delete({
            where: {
                id: parseInt(params.id)
            }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.log("[BRAND_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
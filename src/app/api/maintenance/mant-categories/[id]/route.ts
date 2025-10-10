// src/app/api/vehicles/categorys/[id]/route.ts
import { prisma } from "@/lib/prisma";
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from "next/server";

const TENANT_ID = 'cf68b103-12fd-4208-a352-42379ef3b6e1';

// GET - Obtener marca específica por ID
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const category = await prisma.mantCategory.findUnique({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            }
        });

        if (!category) {
            return new NextResponse("category not found", { status: 404 });
        }

        return NextResponse.json(category);
    } catch (error) {
        console.error("[CATEGORY_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

// PUT - Actualizar categoria específica
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
        const existingcategory = await prisma.mantCategory.findUnique({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            }
        });

        if (!existingcategory) {
            return new NextResponse("category not found", { status: 404 });
        }

        // Verificar duplicados
        const duplicatecategory = await prisma.mantCategory.findFirst({
            where: {
                tenantId: TENANT_ID,
                name: name.trim(),
                id: {
                    not: parseInt(id)
                }
            }
        });

        if (duplicatecategory) {
            return new NextResponse("category name already exists", { status: 409 });
        }

        const updatedcategory = await prisma.mantCategory.update({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            },
            data: {
                name: name.trim(),
            }
        });

        return NextResponse.json(updatedcategory);
    } catch (error) {
        console.log("[CATEGORY_PUT]", error);
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

        const existingcategory = await prisma.mantCategory.findUnique({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            }
        });

        if (!existingcategory) {
            return new NextResponse("category not found", { status: 404 });
        }


        await prisma.mantCategory.delete({
            where: {
                id: parseInt(id),
                tenantId: TENANT_ID
            }
        });

        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.log("[CATEGORY_DELETE]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
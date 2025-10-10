import { prisma } from "@/lib/prisma";
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from "next/server";

const TENANT_ID = 'cf68b103-12fd-4208-a352-42379ef3b6e1'; // Tenant hardcodeado para MVP

export async function GET() {
    try {
        const categories = await prisma.mantCategory.findMany({
            where: {
                tenantId: TENANT_ID
            },
            orderBy: {
                name: 'asc'
            }
        });
        return NextResponse.json(categories);
    } catch (error) {
        console.error("[CATEGORIES_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const supabase = await createClient();

        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return new NextResponse("Unauthorized", { status: 401 });
        }

        const { name } = await req.json();

        if (!name || name.trim() === '') {
            return new NextResponse("Name is required", { status: 400 });
        }

        // Verificar que no exista una categoria con el mismo nombre
        const existingCategory = await prisma.mantCategory.findUnique({
            where: {
                tenantId_name: {
                    tenantId: TENANT_ID,
                    name: name.trim()
                }
            }
        });

        if (existingCategory) {
            return new NextResponse("Category already exists", { status: 409 });
        }

        const Category = await prisma.mantCategory.create({
            data: {
                name: name.trim(),
                tenantId: TENANT_ID,
            },
        });

        return NextResponse.json(Category);
    } catch (error) {
        console.log("[CATEGORY_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

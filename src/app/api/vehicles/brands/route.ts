import { prisma } from "@/lib/prisma";
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from "next/server";

const TENANT_ID = 'mvp-default-tenant'; // Tenant hardcodeado para MVP

export async function GET() {
    try {
        const brands = await prisma.vehicleBrand.findMany({
            where: {
                tenantId: TENANT_ID
            },
            orderBy: {
                name: 'asc'
            }
        });
        return NextResponse.json(brands);
    } catch (error) {
        console.error("[BRANDS_GET]", error);
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

        // Verificar que no exista una marca con el mismo nombre
        const existingBrand = await prisma.vehicleBrand.findUnique({
            where: {
                tenantId_name: {
                    tenantId: TENANT_ID,
                    name: name.trim()
                }
            }
        });

        if (existingBrand) {
            return new NextResponse("Brand already exists", { status: 409 });
        }

        const brand = await prisma.vehicleBrand.create({
            data: {
                name: name.trim(),
                tenantId: TENANT_ID,
            },
        });

        return NextResponse.json(brand);
    } catch (error) {
        console.log("[BRAND_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

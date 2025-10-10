import { prisma } from "@/lib/prisma";
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from "next/server";

const TENANT_ID = 'cf68b103-12fd-4208-a352-42379ef3b6e1'; // Tenant hardcodeado para MVP


export async function GET() {
    try {
        const types = await prisma.vehicleType.findMany({
            where: {
                tenantId: TENANT_ID
            },
            orderBy: {
                name: 'asc'
            }
        });
        return NextResponse.json(types);
    } catch (error) {
        console.error("[TYPES_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(req: Request) {
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

        // Verificar que no exista un tipo con el mismo nombre
        const existingType = await prisma.vehicleType.findUnique({
            where: {
                tenantId_name: {
                    tenantId: TENANT_ID,
                    name: name.trim()
                }
            }
        });

        if (existingType) {
            return new NextResponse("Type already exists", { status: 409 });
        }

        const type = await prisma.vehicleType.create({
            data: {
                name: name.trim(),
                tenantId: TENANT_ID,
            },
        });

        return NextResponse.json(type);
    } catch (error) {
        console.log("[TYPE_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

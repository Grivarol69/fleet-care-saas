import { prisma } from "@/lib/prisma";
import { createClient } from '@/utils/supabase/server';
import { NextResponse } from "next/server";

const TENANT_ID = 'mvp-default-tenant'; // Tenant hardcodeado para MVP

export async function GET() {
    try {
        const providers = await prisma.provider.findMany({
            where: {
                tenantId: TENANT_ID
            },
            orderBy: {
                name: 'asc'
            }
        });
        return NextResponse.json(providers);
    } catch (error) {
        console.error("[PROVIDERS_GET]", error);
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

        const { name, email, phone, address, specialty } = await req.json();

        if (!name || name.trim() === '') {
            return new NextResponse("Name is required", { status: 400 });
        }

        // Verificar que no exista un proveedor con el mismo nombre
        const existingProvider = await prisma.provider.findUnique({
            where: {
                tenantId_name: {
                    tenantId: TENANT_ID,
                    name: name.trim()
                }
            }
        });

        if (existingProvider) {
            return new NextResponse("Provider already exists", { status: 409 });
        }

        const provider = await prisma.provider.create({
            data: {
                name: name.trim(),
                email: email?.trim() || null,
                phone: phone?.trim() || null,
                address: address?.trim() || null,
                specialty: specialty?.trim() || null,
                tenantId: TENANT_ID,
            },
        });

        return NextResponse.json(provider);
    } catch (error) {
        console.log("[PROVIDER_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}